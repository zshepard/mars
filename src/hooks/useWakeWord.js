// src/hooks/useWakeWord.js
// Runs a silent background SpeechRecognition session that listens for
// "Hey MARS" and fires a callback when detected.
//
// Architecture:
//   - One persistent SpeechRecognition instance (wakeRef) runs continuously
//     in the background at very low cost — it only checks for the wake phrase
//   - On detection it calls onWakeWord() and pauses itself for `pauseMs`
//     so the command listener can take over the microphone
//   - After pauseMs it restarts automatically
//   - Enabled state is persisted to localStorage key 'mars-hey-mars'

import { useState, useEffect, useRef, useCallback } from 'react';

const STORAGE_KEY  = 'mars-hey-mars';
const WAKE_PHRASES = [
  'hey mars', 'hey mars,', 'hey mars.', 'hey mars!',
  'hey mars please', 'ok mars', 'okay mars',
];

function matchesWakeWord(text) {
  const t = text.toLowerCase().trim();
  return WAKE_PHRASES.some(p => t === p || t.startsWith(p + ' '));
}

export function useWakeWord({ onWakeWord, pauseMs = 2500 } = {}) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const supported = !!SR;

  const [enabled, setEnabledState] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) !== 'false'; } catch { return true; }
  });
  const [active, setActive]   = useState(false);   // true while wake listener is running
  const [detected, setDetected] = useState(false); // brief flash when wake word fires

  const wakeRef   = useRef(null);
  const pausedRef = useRef(false);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const stopWake = useCallback(() => {
    if (wakeRef.current) {
      try { wakeRef.current.abort(); } catch (_) {}
      wakeRef.current = null;
    }
    setActive(false);
  }, []);

  const startWake = useCallback(() => {
    if (!SR || !enabledRef.current || pausedRef.current) return;
    if (wakeRef.current) return; // already running

    const rec = new SR();
    rec.continuous      = true;
    rec.interimResults  = true;
    rec.lang            = 'en-US';
    rec.maxAlternatives = 1;

    rec.onstart = () => setActive(true);

    rec.onend = () => {
      wakeRef.current = null;
      setActive(false);
      // Auto-restart unless paused or disabled
      if (enabledRef.current && !pausedRef.current) {
        setTimeout(startWake, 400);
      }
    };

    rec.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      // On real errors back off for 3 seconds then retry
      wakeRef.current = null;
      setActive(false);
      if (enabledRef.current && !pausedRef.current) {
        setTimeout(startWake, 3000);
      }
    };

    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript;
        if (matchesWakeWord(text)) {
          // Wake word detected — pause, fire callback, resume after delay
          pausedRef.current = true;
          setDetected(true);
          stopWake();

          setTimeout(() => { setDetected(false); }, 1200);

          if (onWakeWord) onWakeWord();

          // Resume wake listener after command window
          setTimeout(() => {
            pausedRef.current = false;
            if (enabledRef.current) startWake();
          }, pauseMs);

          break;
        }
      }
    };

    wakeRef.current = rec;
    try { rec.start(); } catch (_) {
      wakeRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [SR, stopWake, onWakeWord, pauseMs]);

  // Start/stop based on enabled state
  useEffect(() => {
    if (enabled) {
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

  return {
    supported,
    enabled,
    active,
    detected,
    setEnabled,
    toggle,
    startWake,
    stopWake,
  };
}
