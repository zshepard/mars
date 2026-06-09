// src/hooks/useVoiceCommand.js
// ─────────────────────────────────────────────────────────────────────────────
//  Full voice command engine for MARS.
//  - Continuous / single-shot listening via Web Speech API
//  - Interim results shown in real time
//  - Fuzzy command matching (Levenshtein distance + keyword overlap)
//  - Real command execution: navigate, toggle alarms, snooze, open URLs
//  - Confidence score per recognised utterance
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Levenshtein distance (normalised 0-1, 1 = identical) ─────────────────────
function similarity(a, b) {
  a = a.toLowerCase().trim();
  b = b.toLowerCase().trim();
  if (a === b) return 1;
  const la = a.length, lb = b.length;
  if (la === 0 || lb === 0) return 0;
  const dp = Array.from({ length: la + 1 }, (_, i) =>
    Array.from({ length: lb + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= la; i++)
    for (let j = 1; j <= lb; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return 1 - dp[la][lb] / Math.max(la, lb);
}

// ── Keyword overlap score ─────────────────────────────────────────────────────
function keywordScore(transcript, keywords) {
  const words = transcript.toLowerCase().split(/\s+/);
  const hits = keywords.filter(k => words.some(w => w.includes(k) || k.includes(w)));
  return hits.length / keywords.length;
}

// ── Strip wake word prefix ────────────────────────────────────────────────────
function stripWakeWord(text) {
  return text
    .toLowerCase()
    .replace(/^(hey\s+mars|mars|ok\s+mars|okay\s+mars)[,\s]*/i, '')
    .trim();
}

// ── Extract time from phrase e.g. "snooze 15 minutes" → 15 ──────────────────
function extractMinutes(text) {
  const m = text.match(/(\d+)\s*(min|minute|minutes)?/i);
  return m ? parseInt(m[1], 10) : 10;
}

// ── Extract alarm label from "set alarm for 6 30 am" ────────────────────────
function extractTime(text) {
  // "6 30 am" / "6:30 am" / "six thirty" etc.
  const m = text.match(/(\d{1,2})[\s:h](\d{2})\s*(am|pm)?/i);
  if (m) {
    let h = parseInt(m[1], 10);
    const min = m[2];
    const period = (m[3] || '').toLowerCase();
    if (period === 'pm' && h < 12) h += 12;
    if (period === 'am' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${min}`;
  }
  return null;
}

// ── Command definitions ───────────────────────────────────────────────────────
// Each command has:
//   keywords  – array of key words that must appear for a match
//   phrases   – example phrases for fuzzy matching
//   execute   – function(transcript, context) → { success, message }
// ─────────────────────────────────────────────────────────────────────────────
export const COMMAND_DEFS = [
  // ── Navigation ──────────────────────────────────────────────────────────────
  {
    id: 'nav-dashboard',
    label: 'Go to Dashboard',
    category: 'Navigation',
    keywords: ['dashboard', 'home screen', 'main'],
    phrases: ['go to dashboard', 'open dashboard', 'show dashboard', 'go home'],
    execute: (_, { navigate }) => { navigate('/'); return { success: true, message: 'Opening Dashboard' }; },
  },
  {
    id: 'nav-alarms',
    label: 'Go to Alarms',
    category: 'Navigation',
    keywords: ['alarms', 'alarm', 'links', 'routines'],
    phrases: ['go to alarms', 'open alarms', 'show alarms', 'open alarm page'],
    execute: (_, { navigate }) => { navigate('/alarms'); return { success: true, message: 'Opening Alarms & Links' }; },
  },
  {
    id: 'nav-settings',
    label: 'Go to Settings',
    category: 'Navigation',
    keywords: ['settings', 'preferences', 'options'],
    phrases: ['go to settings', 'open settings', 'show settings'],
    execute: (_, { navigate }) => { navigate('/settings'); return { success: true, message: 'Opening Settings' }; },
  },
  {
    id: 'nav-platforms',
    label: 'Go to Platforms',
    category: 'Navigation',
    keywords: ['platforms', 'devices', 'connected'],
    phrases: ['go to platforms', 'open platforms', 'show platforms'],
    execute: (_, { navigate }) => { navigate('/platforms'); return { success: true, message: 'Opening Platforms' }; },
  },
  {
    id: 'nav-voice',
    label: 'Go to Voice',
    category: 'Navigation',
    keywords: ['voice', 'commands', 'voice control'],
    phrases: ['go to voice', 'open voice commands', 'show voice'],
    execute: (_, { navigate }) => { navigate('/voice'); return { success: true, message: 'Opening Voice Commands' }; },
  },

  // ── Alarms ──────────────────────────────────────────────────────────────────
  {
    id: 'alarm-snooze',
    label: 'Snooze alarm',
    category: 'Alarms',
    keywords: ['snooze'],
    phrases: ['snooze', 'snooze alarm', 'snooze 10 minutes', 'snooze 5 minutes'],
    execute: (text, { snoozeAlarm, firingAlarm }) => {
      if (!firingAlarm) return { success: false, message: 'No alarm is currently firing' };
      const mins = extractMinutes(text);
      snoozeAlarm(firingAlarm, mins);
      return { success: true, message: `Snoozed for ${mins} minutes` };
    },
  },
  {
    id: 'alarm-dismiss',
    label: 'Dismiss alarm',
    category: 'Alarms',
    keywords: ['dismiss', 'stop alarm', 'turn off alarm'],
    phrases: ['dismiss alarm', 'stop alarm', 'turn off alarm', 'dismiss'],
    execute: (_, { dismissAlarm, firingAlarm }) => {
      if (!firingAlarm) return { success: false, message: 'No alarm is currently firing' };
      dismissAlarm(firingAlarm);
      return { success: true, message: 'Alarm dismissed' };
    },
  },
  {
    id: 'alarm-set',
    label: 'Set an alarm',
    category: 'Alarms',
    keywords: ['set alarm', 'create alarm', 'new alarm', 'wake me'],
    phrases: ['set alarm for 6 30 am', 'wake me at 7', 'create alarm 8 am', 'set alarm 5 30'],
    execute: (text, { navigate }) => {
      const time = extractTime(text);
      if (time) {
        navigate('/alarms', { state: { prefillTime: time } });
        return { success: true, message: `Opening alarm creator for ${time}` };
      }
      navigate('/alarms');
      return { success: true, message: 'Opening alarm creator' };
    },
  },
  {
    id: 'alarm-disable-all',
    label: 'Disable all alarms',
    category: 'Alarms',
    keywords: ['disable all', 'turn off all alarms', 'mute all alarms'],
    phrases: ['disable all alarms', 'turn off all alarms', 'mute all alarms'],
    execute: (_, { alarms, updateAlarm }) => {
      if (!alarms?.length) return { success: false, message: 'No alarms to disable' };
      alarms.forEach(a => updateAlarm(a.id, { enabled: false }));
      return { success: true, message: `Disabled ${alarms.length} alarm${alarms.length > 1 ? 's' : ''}` };
    },
  },
  {
    id: 'alarm-enable-all',
    label: 'Enable all alarms',
    category: 'Alarms',
    keywords: ['enable all', 'turn on all alarms'],
    phrases: ['enable all alarms', 'turn on all alarms', 'activate all alarms'],
    execute: (_, { alarms, updateAlarm }) => {
      if (!alarms?.length) return { success: false, message: 'No alarms to enable' };
      alarms.forEach(a => updateAlarm(a.id, { enabled: true }));
      return { success: true, message: `Enabled ${alarms.length} alarm${alarms.length > 1 ? 's' : ''}` };
    },
  },

  // ── Links ───────────────────────────────────────────────────────────────────
  {
    id: 'link-open',
    label: 'Open a scheduled link',
    category: 'Links',
    keywords: ['open link', 'launch link', 'open url'],
    phrases: ['open link on phone', 'open link on computer', 'launch link', 'open my link'],
    execute: (_, { navigate }) => {
      navigate('/alarms', { state: { tab: 'links' } });
      return { success: true, message: 'Opening Scheduled Links' };
    },
  },

  // ── Routines ────────────────────────────────────────────────────────────────
  {
    id: 'routine-start',
    label: 'Start morning routine',
    category: 'Routines',
    keywords: ['start routine', 'morning routine', 'start my morning', 'begin routine'],
    phrases: ['start my morning', 'start routine', 'begin morning routine', 'start morning'],
    execute: (_, { navigate }) => {
      navigate('/alarms', { state: { tab: 'routines' } });
      return { success: true, message: 'Opening Routines' };
    },
  },
  {
    id: 'routine-goodnight',
    label: 'Goodnight / wind-down',
    category: 'Routines',
    keywords: ['goodnight', 'wind down', 'sleep mode', 'night mode'],
    phrases: ['goodnight', 'wind down', 'activate sleep mode', 'night mode'],
    execute: (_, { navigate }) => {
      navigate('/alarms', { state: { tab: 'routines', filter: 'night' } });
      return { success: true, message: 'Activating wind-down protocol' };
    },
  },

  // ── System ──────────────────────────────────────────────────────────────────
  {
    id: 'system-status',
    label: 'Check system status',
    category: 'System',
    keywords: ['status', 'system status', 'how is mars', 'are you online'],
    phrases: ['system status', 'check status', 'how are you', 'are you online', 'mars status'],
    execute: (_, { isOnline }) => ({
      success: true,
      message: `MARS is ${isOnline ? 'fully online' : 'running in offline mode'}`,
    }),
  },
  {
    id: 'system-clock-24',
    label: 'Switch to 24-hour clock',
    category: 'System',
    keywords: ['24 hour', '24h clock', 'military time'],
    phrases: ['switch to 24 hour', 'use military time', 'enable 24 hour clock'],
    execute: () => {
      localStorage.setItem('mars-clock-24hr', 'true');
      window.dispatchEvent(new CustomEvent('mars:clock-format-changed'));
      return { success: true, message: 'Switched to 24-hour clock' };
    },
  },
  {
    id: 'system-clock-12',
    label: 'Switch to 12-hour clock',
    category: 'System',
    keywords: ['12 hour', '12h clock', 'am pm'],
    phrases: ['switch to 12 hour', 'use 12 hour clock', 'enable am pm'],
    execute: () => {
      localStorage.setItem('mars-clock-24hr', 'false');
      window.dispatchEvent(new CustomEvent('mars:clock-format-changed'));
      return { success: true, message: 'Switched to 12-hour clock' };
    },
  },
];

// ── Fuzzy command matcher ─────────────────────────────────────────────────────
// Returns { command, score } for the best matching command, or null if below threshold
export function matchCommand(transcript) {
  const cleaned = stripWakeWord(transcript);
  if (!cleaned) return null;

  let best = null;
  let bestScore = 0;

  for (const cmd of COMMAND_DEFS) {
    // Phrase similarity (best of all example phrases)
    const phraseSim = Math.max(...cmd.phrases.map(p => similarity(cleaned, p)));
    // Keyword overlap
    const kwScore = keywordScore(cleaned, cmd.keywords);
    // Combined score — keyword overlap weighted higher for short commands
    const score = phraseSim * 0.5 + kwScore * 0.5;

    if (score > bestScore) {
      bestScore = score;
      best = { command: cmd, score };
    }
  }

  // Minimum threshold to avoid false positives
  return bestScore >= 0.25 ? best : null;
}

// ── Main hook ─────────────────────────────────────────────────────────────────
export function useVoiceCommand({
  alarms = [],
  updateAlarm,
  firingAlarm,
  dismissAlarm,
  snoozeAlarm,
  isOnline = true,
} = {}) {
  const navigate = useNavigate();

  const [listening, setListening]       = useState(false);
  const [continuous, setContinuous]     = useState(false);
  const [interim, setInterim]           = useState('');
  const [transcript, setTranscript]     = useState('');
  const [confidence, setConfidence]     = useState(null);
  const [result, setResult]             = useState(null); // { success, message, command }
  const [history, setHistory]           = useState([]);   // last N executions
  const [error, setError]               = useState(null);
  const [supported, setSupported]       = useState(true);

  const recognitionRef = useRef(null);
  const continuousRef  = useRef(false);

  // Check browser support on mount
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) setSupported(false);
  }, []);

  const context = {
    navigate,
    alarms,
    updateAlarm,
    firingAlarm,
    dismissAlarm,
    snoozeAlarm,
    isOnline,
  };

  const executeTranscript = useCallback((text, conf) => {
    const cleaned = stripWakeWord(text);
    setTranscript(text);
    setConfidence(conf ?? null);

    const match = matchCommand(text);
    if (!match) {
      const res = { success: false, message: `Command not recognised: "${cleaned}"`, command: null };
      setResult(res);
      setHistory(h => [{ text, ...res, ts: Date.now() }, ...h].slice(0, 20));
      return;
    }

    const execResult = match.command.execute(cleaned, context);
    const res = { ...execResult, command: match.command, score: match.score };
    setResult(res);
    setHistory(h => [{ text, ...res, ts: Date.now() }, ...h].slice(0, 20));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alarms, updateAlarm, firingAlarm, dismissAlarm, snoozeAlarm, isOnline]);

  const stop = useCallback(() => {
    continuousRef.current = false;
    setContinuous(false);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
      recognitionRef.current = null;
    }
    setListening(false);
    setInterim('');
  }, []);

  const start = useCallback((opts = {}) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setError('Speech recognition not supported in this browser'); return; }

    // Stop any existing session first
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
    }

    const isContinuous = opts.continuous ?? false;
    continuousRef.current = isContinuous;
    setContinuous(isContinuous);
    setError(null);
    setResult(null);
    setInterim('');

    const rec = new SR();
    rec.continuous     = isContinuous;
    rec.interimResults = true;
    rec.lang           = 'en-US';
    rec.maxAlternatives = 3;

    rec.onstart = () => { setListening(true); };

    rec.onend = () => {
      setListening(false);
      setInterim('');
      // Auto-restart if continuous mode is still active
      if (continuousRef.current) {
        setTimeout(() => {
          if (continuousRef.current) start({ continuous: true });
        }, 300);
      }
    };

    rec.onerror = (e) => {
      if (e.error === 'no-speech') return; // silent — just restart
      if (e.error === 'aborted') return;
      setError(`Microphone error: ${e.error}`);
      setListening(false);
    };

    rec.onresult = (e) => {
      let interimText = '';
      let finalText   = '';
      let finalConf   = null;

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          // Pick the alternative with the highest confidence
          let best = r[0];
          for (let j = 1; j < r.length; j++) {
            if (r[j].confidence > best.confidence) best = r[j];
          }
          finalText = best.transcript;
          finalConf = best.confidence;
        } else {
          interimText += r[0].transcript;
        }
      }

      if (interimText) setInterim(interimText);
      if (finalText)   executeTranscript(finalText, finalConf);
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch (err) {
      setError('Could not start microphone: ' + err.message);
    }
  }, [executeTranscript]);

  // Cleanup on unmount
  useEffect(() => () => stop(), [stop]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start({ continuous: false });
  }, [listening, start, stop]);

  const toggleContinuous = useCallback(() => {
    if (continuous) stop();
    else start({ continuous: true });
  }, [continuous, start, stop]);

  return {
    supported,
    listening,
    continuous,
    interim,
    transcript,
    confidence,
    result,
    history,
    error,
    start,
    stop,
    toggle,
    toggleContinuous,
    COMMAND_DEFS,
  };
}
