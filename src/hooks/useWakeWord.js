// src/hooks/useWakeWord.js
// ─────────────────────────────────────────────────────────────────────────────
//  Background wake word detector for "Hey MARS".
//
//  Improvements (v3):
//  1. Custom wake phrase — reads from localStorage 'mars-wake-phrase',
//     reacts to 'mars:wake-phrase-changed' event (set via Settings)
//  2. Audio confirmation tone — plays a short Web Audio API chime on detection
//     (respects 'mars-wake-confirm-tone' pref, skipped when false)
//  3. Mic permission gate — checks micPermission before starting; surfaces
//     a 'dead' state with reason 'mic-denied' when permission is blocked
//  4. Command window countdown — exposes `commandWindowMs` remaining ms
//     so the UI can show a live countdown bar
//  5. Debounce guard — 1.5s cooldown between detections (prevents double-fire)
//  6. Paused flag is set BEFORE onWakeWord fires (prevents race condition)
//  7. Android keepalive — restarts recognition every 55s to beat Chrome's
//     ~60s continuous-recognition kill timer
//  8. Visibility API — pauses when tab is hidden, resumes on focus
//  9. Dead listener detection — exposes `dead` state + manual restart
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from 'react';

const STORAGE_KEY_ENABLED = 'mars-hey-mars';
const STORAGE_KEY_PHRASE  = 'mars-wake-phrase';
const STORAGE_KEY_TONE    = 'mars-wake-confirm-tone';
const DEBOUNCE_MS         = 1500;   // min ms between two wake detections
const KEEPALIVE_MS        = 55000;  // restart before Chrome's ~60s kill timer
const PAUSE_MS_DEF        = 8000;   // default command window after wake word

// ── Build accepted wake phrases from a canonical phrase ──────────────────────
// e.g. 'hey mars' → ['hey mars', 'hey mars please', 'hey mars listen', ...]
function buildWakePhrases(canonical) {
  const base = canonical.toLowerCase().trim();
  return [
    base,
    `${base} please`,
    `${base} listen`,
    `ok ${base.replace(/^hey\s+/, '')}`,
    `okay ${base.replace(/^hey\s+/, '')}`,
  ].filter((v, i, a) => a.indexOf(v) === i); // deduplicate
}

// Tighter match: transcript must START with one of the wake phrases
// as a whole-word prefix (not mid-word like "they mars")
function matchesWakeWord(rawText, phrases) {
  const t = rawText.toLowerCase().replace(/[.,!?]/g, '').trim();
  return phrases.some(p => {
    if (!t.startsWith(p)) return false;
    const after = t[p.length];
    return after === undefined || after === ' ';
  });
}

// ── Soft confirmation chime via Web Audio API ─────────────────────────────────
// Two-tone ascending beep: 880 Hz → 1320 Hz, ~200ms total
function playConfirmTone() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    [[880, 0, 0.12], [1320, 0.1, 0.12]].forEach(([freq, start, dur]) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + start + 0.02);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.01);
    });

    // Close context after tones finish to free resources
    setTimeout(() => { try { ctx.close(); } catch (_) {} }, 400);
  } catch (_) {
    // Web Audio not available — silent fallback
  }
}

export function useWakeWord({ onWakeWord, pauseMs = PAUSE_MS_DEF } = {}) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const supported = !!SR;

  const [enabled, setEnabledState] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY_ENABLED) !== 'false'; } catch { return true; }
  });
  const [active,            setActive]           = useState(false);
  const [detected,          setDetected]         = useState(false);
  const [dead,              setDead]             = useState(false);
  const [deadReason,        setDeadReason]       = useState(null); // 'mic-denied' | 'error'
  const [commandWindowMs,   setCommandWindowMs]  = useState(0);   // countdown ms remaining

  const wakeRef          = useRef(null);
  const pausedRef        = useRef(false);
  const enabledRef       = useRef(enabled);
  const lastFiredRef     = useRef(0);
  const keepaliveRef     = useRef(null);
  const hiddenRef        = useRef(false);
  const countdownRef     = useRef(null);

  enabledRef.current = enabled;

  // ── Read current wake phrase from localStorage ────────────────────────────
  const getWakePhrases = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PHRASE) || 'hey mars';
      return buildWakePhrases(stored);
    } catch {
      return buildWakePhrases('hey mars');
    }
  }, []);

  // ── Stop wake listener ──────────────────────────────────────────────────────
  const stopWake = useCallback(() => {
    if (keepaliveRef.current) { clearInterval(keepaliveRef.current); keepaliveRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    if (wakeRef.current) {
      try { wakeRef.current.abort(); } catch (_) {}
      wakeRef.current = null;
    }
    setActive(false);
    setCommandWindowMs(0);
  }, []);

  // ── Start wake listener ─────────────────────────────────────────────────────
  const startWake = useCallback(() => {
    if (!SR || !enabledRef.current || pausedRef.current || hiddenRef.current) return;
    if (wakeRef.current) return; // already running

    // ── Mic permission gate ───────────────────────────────────────────────────
    // If the browser exposes the permission query API, check before starting.
    // We do a best-effort check — if the API isn't available we proceed anyway.
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'microphone' }).then((status) => {
        if (status.state === 'denied') {
          setDead(true);
          setDeadReason('mic-denied');
          setEnabledState(false);
          try { localStorage.setItem(STORAGE_KEY_ENABLED, 'false'); } catch (_) {}
          return;
        }
        _doStart();
      }).catch(() => _doStart()); // permissions API not supported — proceed
    } else {
      _doStart();
    }

    function _doStart() {
      if (!enabledRef.current || pausedRef.current || hiddenRef.current) return;
      if (wakeRef.current) return;

      setDead(false);
      setDeadReason(null);

      const rec = new SR();
      rec.continuous      = true;
      rec.interimResults  = true;
      rec.lang            = 'en-US';
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        setActive(true);
        if (keepaliveRef.current) clearInterval(keepaliveRef.current);
        keepaliveRef.current = setInterval(() => {
          if (!enabledRef.current || pausedRef.current) return;
          if (wakeRef.current) {
            try { wakeRef.current.stop(); } catch (_) {}
          }
        }, KEEPALIVE_MS);
      };

      rec.onend = () => {
        if (keepaliveRef.current) { clearInterval(keepaliveRef.current); keepaliveRef.current = null; }
        wakeRef.current = null;
        setActive(false);
        if (enabledRef.current && !pausedRef.current && !hiddenRef.current) {
          setTimeout(startWake, 400);
        }
      };

      rec.onerror = (e) => {
        if (e.error === 'no-speech' || e.error === 'aborted') return;
        if (e.error === 'not-allowed') {
          setEnabledState(false);
          setDead(true);
          setDeadReason('mic-denied');
          return;
        }
        wakeRef.current = null;
        setActive(false);
        setDead(true);
        setDeadReason('error');
        if (enabledRef.current && !pausedRef.current) {
          setTimeout(() => {
            setDead(false);
            setDeadReason(null);
            startWake();
          }, 5000);
        }
      };

      rec.onresult = (e) => {
        const phrases = getWakePhrases();
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const text = e.results[i][0].transcript;
          if (!matchesWakeWord(text, phrases)) continue;

          const now = Date.now();
          if (now - lastFiredRef.current < DEBOUNCE_MS) break;
          lastFiredRef.current = now;

          // Set paused BEFORE firing callback (prevents race condition)
          pausedRef.current = true;
          setDetected(true);
          stopWake();

          // ── Confirmation tone ───────────────────────────────────────────────
          try {
            const toneEnabled = localStorage.getItem(STORAGE_KEY_TONE) !== 'false';
            if (toneEnabled) playConfirmTone();
          } catch (_) {}

          // ── Command window countdown ────────────────────────────────────────
          const windowEnd = Date.now() + pauseMs;
          setCommandWindowMs(pauseMs);
          if (countdownRef.current) clearInterval(countdownRef.current);
          countdownRef.current = setInterval(() => {
            const remaining = windowEnd - Date.now();
            if (remaining <= 0) {
              clearInterval(countdownRef.current);
              countdownRef.current = null;
              setCommandWindowMs(0);
            } else {
              setCommandWindowMs(remaining);
            }
          }, 100);

          // Brief detected flash
          setTimeout(() => setDetected(false), 1200);

          if (onWakeWord) onWakeWord();

          setTimeout(() => {
            pausedRef.current = false;
            if (enabledRef.current && !hiddenRef.current) startWake();
          }, pauseMs);

          break;
        }
      };

      wakeRef.current = rec;
      try { rec.start(); } catch (_) {
        wakeRef.current = null;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [SR, stopWake, onWakeWord, pauseMs, getWakePhrases]);

  // ── Listen for Settings toggle event (mars:hey-mars-toggle) ─────────────────
  useEffect(() => {
    const onToggle = (e) => {
      const val = !!e.detail;
      setEnabledState(val);
      if (!val) stopWake();
    };
    window.addEventListener('mars:hey-mars-toggle', onToggle);
    return () => window.removeEventListener('mars:hey-mars-toggle', onToggle);
  }, [stopWake]);

  // ── Listen for wake phrase change (mars:wake-phrase-changed) ─────────────────
  // Restart the listener so it picks up the new phrase immediately
  useEffect(() => {
    const onPhraseChange = () => {
      if (enabledRef.current && !pausedRef.current) {
        stopWake();
        setTimeout(startWake, 300);
      }
    };
    window.addEventListener('mars:wake-phrase-changed', onPhraseChange);
    return () => window.removeEventListener('mars:wake-phrase-changed', onPhraseChange);
  }, [startWake, stopWake]);

  // ── Visibility API — pause when tab is hidden ───────────────────────────────
  useEffect(() => {
    const onVisChange = () => {
      if (document.hidden) {
        hiddenRef.current = true;
        stopWake();
      } else {
        hiddenRef.current = false;
        if (enabledRef.current && !pausedRef.current) {
          setTimeout(startWake, 500);
        }
      }
    };
    document.addEventListener('visibilitychange', onVisChange);
    return () => document.removeEventListener('visibilitychange', onVisChange);
  }, [startWake, stopWake]);

  // ── Start/stop based on enabled state ──────────────────────────────────────
  useEffect(() => {
    if (enabled) {
      pausedRef.current = false;
      startWake();
    } else {
      pausedRef.current = false;
      stopWake();
    }
    return stopWake;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const setEnabled = useCallback((val) => {
    try { localStorage.setItem(STORAGE_KEY_ENABLED, val ? 'true' : 'false'); } catch (_) {}
    setEnabledState(val);
  }, []);

  const toggle = useCallback(() => setEnabled(!enabled), [enabled, setEnabled]);

  const restart = useCallback(() => {
    setDead(false);
    setDeadReason(null);
    pausedRef.current = false;
    stopWake();
    setTimeout(startWake, 300);
  }, [stopWake, startWake]);

  return {
    supported,
    enabled,
    active,
    detected,
    dead,
    deadReason,       // 'mic-denied' | 'error' | null
    commandWindowMs,  // ms remaining in command window (0 when not active)
    setEnabled,
    toggle,
    restart,
    startWake,
    stopWake,
  };
}
