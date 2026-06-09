// src/hooks/useWakeWord.js
// ─────────────────────────────────────────────────────────────────────────────
//  Background wake word detector for "Hey MARS".
//
//  DMAIC improvements (v2):
//  1. Debounce guard — 1.5s cooldown between detections (prevents double-fire)
//  2. Paused flag is set BEFORE onWakeWord fires (prevents race condition)
//  3. Android keepalive — restarts recognition every 55s to beat Chrome's
//     ~60s continuous-recognition kill timer
//  4. Tighter phrase matching — requires word-boundary check, not just startsWith
//  5. Visibility API — pauses when tab is hidden, resumes on focus
//  6. Dead listener detection — exposes `dead` state + manual restart
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from 'react';

const STORAGE_KEY   = 'mars-hey-mars';
const DEBOUNCE_MS   = 1500;   // min ms between two wake detections
const KEEPALIVE_MS  = 55000;  // restart before Chrome's ~60s kill timer
const PAUSE_MS_DEF  = 8000;   // default command window after wake word

// Accepted wake phrases (all lowercase, stripped of punctuation)
const WAKE_PHRASES = [
  'hey mars',
  'ok mars',
  'okay mars',
  'hey mars please',
  'hey mars listen',
];

// Tighter match: the transcript must START with one of the wake phrases
// as a whole-word prefix (not mid-word like "they mars")
function matchesWakeWord(rawText) {
  const t = rawText.toLowerCase().replace(/[.,!?]/g, '').trim();
  return WAKE_PHRASES.some(p => {
    if (!t.startsWith(p)) return false;
    // Ensure the character after the phrase is a space or end-of-string
    const after = t[p.length];
    return after === undefined || after === ' ';
  });
}

export function useWakeWord({ onWakeWord, pauseMs = PAUSE_MS_DEF } = {}) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const supported = !!SR;

  const [enabled, setEnabledState] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) !== 'false'; } catch { return true; }
  });
  const [active,   setActive]   = useState(false);
  const [detected, setDetected] = useState(false);
  const [dead,     setDead]     = useState(false); // true if listener died unexpectedly

  const wakeRef       = useRef(null);
  const pausedRef     = useRef(false);
  const enabledRef    = useRef(enabled);
  const lastFiredRef  = useRef(0);      // timestamp of last wake detection
  const keepaliveRef  = useRef(null);   // setInterval handle
  const hiddenRef     = useRef(false);  // true when tab is hidden

  enabledRef.current = enabled;

  // ── Stop wake listener ──────────────────────────────────────────────────────
  const stopWake = useCallback(() => {
    if (keepaliveRef.current) { clearInterval(keepaliveRef.current); keepaliveRef.current = null; }
    if (wakeRef.current) {
      try { wakeRef.current.abort(); } catch (_) {}
      wakeRef.current = null;
    }
    setActive(false);
  }, []);

  // ── Start wake listener ─────────────────────────────────────────────────────
  const startWake = useCallback(() => {
    if (!SR || !enabledRef.current || pausedRef.current || hiddenRef.current) return;
    if (wakeRef.current) return; // already running

    setDead(false);

    const rec = new SR();
    rec.continuous      = true;
    rec.interimResults  = true;
    rec.lang            = 'en-US';
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setActive(true);
      // ── Keepalive: restart before Chrome kills continuous recognition ──────
      if (keepaliveRef.current) clearInterval(keepaliveRef.current);
      keepaliveRef.current = setInterval(() => {
        if (!enabledRef.current || pausedRef.current) return;
        // Gracefully restart: stop → onend will restart
        if (wakeRef.current) {
          try { wakeRef.current.stop(); } catch (_) {}
        }
      }, KEEPALIVE_MS);
    };

    rec.onend = () => {
      if (keepaliveRef.current) { clearInterval(keepaliveRef.current); keepaliveRef.current = null; }
      wakeRef.current = null;
      setActive(false);
      // Auto-restart unless paused, disabled, or tab hidden
      if (enabledRef.current && !pausedRef.current && !hiddenRef.current) {
        setTimeout(startWake, 400);
      }
    };

    rec.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return; // normal, just restart
      if (e.error === 'not-allowed') {
        // Mic permission denied — disable and surface to user
        setEnabledState(false);
        setDead(true);
        return;
      }
      // Other errors — mark dead, back off 5s then retry
      wakeRef.current = null;
      setActive(false);
      setDead(true);
      if (enabledRef.current && !pausedRef.current) {
        setTimeout(() => {
          setDead(false);
          startWake();
        }, 5000);
      }
    };

    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript;
        if (!matchesWakeWord(text)) continue;

        // ── Debounce: ignore if fired too recently ──────────────────────────
        const now = Date.now();
        if (now - lastFiredRef.current < DEBOUNCE_MS) break;
        lastFiredRef.current = now;

        // ── Set paused BEFORE firing callback (prevents race condition) ──────
        pausedRef.current = true;
        setDetected(true);
        stopWake();

        // Brief detected flash
        setTimeout(() => setDetected(false), 1200);

        // Fire callback
        if (onWakeWord) onWakeWord();

        // Resume after command window
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [SR, stopWake, onWakeWord, pauseMs]);

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
    try { localStorage.setItem(STORAGE_KEY, val ? 'true' : 'false'); } catch (_) {}
    setEnabledState(val);
  }, []);

  const toggle = useCallback(() => setEnabled(!enabled), [enabled, setEnabled]);

  // Manual restart (for when listener goes dead)
  const restart = useCallback(() => {
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
    setEnabled,
    toggle,
    restart,
    startWake,
    stopWake,
  };
}
