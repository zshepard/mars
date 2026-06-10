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

// ── Keyword overlap score (fix #6: balanced normalisation) ───────────────────
function keywordScore(transcript, keywords) {
  const words = transcript.toLowerCase().split(/\s+/);
  const hits = keywords.filter(k => words.some(w => w.includes(k) || k.includes(w)));
  // Normalise by max of keyword count and word count to avoid single-keyword dominance
  return hits.length / Math.max(keywords.length, words.length, 1);
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
    phrases: ['go to alarms', 'open alarms', 'show alarms', 'open alarm page', 'alarms page'],
    execute: (_, { navigate }) => { navigate('/alarms'); return { success: true, message: 'Opening Alarms & Links' }; },
  },
  {
    id: 'nav-settings',
    label: 'Go to Settings',
    category: 'Navigation',
    keywords: ['settings', 'preferences', 'config'],
    phrases: ['go to settings', 'open settings', 'show settings', 'settings page'],
    execute: (_, { navigate }) => { navigate('/settings'); return { success: true, message: 'Opening Settings' }; },
  },
  {
    id: 'nav-platforms',
    label: 'Go to Platforms',
    category: 'Navigation',
    keywords: ['platforms', 'integrations', 'connections'],
    phrases: ['go to platforms', 'open platforms', 'show platforms', 'platforms page'],
    execute: (_, { navigate }) => { navigate('/platforms'); return { success: true, message: 'Opening Platforms' }; },
  },
  {
    id: 'nav-voice',
    label: 'Go to Voice',
    category: 'Navigation',
    keywords: ['voice', 'commands', 'speech'],
    phrases: ['go to voice', 'open voice commands', 'show voice', 'voice page'],
    execute: (_, { navigate }) => { navigate('/voice'); return { success: true, message: 'Opening Voice Commands' }; },
  },

  // ── Alarms ──────────────────────────────────────────────────────────────────
  {
    id: 'alarm-snooze',
    label: 'Snooze alarm',
    category: 'Alarms',
    keywords: ['snooze'],
    phrases: ['snooze', 'snooze alarm', 'snooze 10 minutes', 'snooze 5 minutes', 'snooze for 5 minutes'],
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
    keywords: ['dismiss', 'stop', 'turn off'],
    phrases: ['dismiss alarm', 'stop alarm', 'turn off alarm', 'dismiss', 'stop it', 'cancel alarm'],
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
    keywords: ['set', 'create', 'new', 'wake', 'alarm'],
    phrases: ['set alarm for 6 30 am', 'wake me at 7', 'create alarm 8 am', 'set alarm 5 30', 'new alarm at 6'],
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
    keywords: ['disable', 'turn off', 'mute', 'all', 'alarms'],
    phrases: ['disable all alarms', 'turn off all alarms', 'mute all alarms', 'silence all alarms'],
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
    keywords: ['enable', 'turn on', 'activate', 'all', 'alarms'],
    phrases: ['enable all alarms', 'turn on all alarms', 'activate all alarms', 'unmute all alarms'],
    execute: (_, { alarms, updateAlarm }) => {
      if (!alarms?.length) return { success: false, message: 'No alarms to enable' };
      alarms.forEach(a => updateAlarm(a.id, { enabled: true }));
      return { success: true, message: `Enabled ${alarms.length} alarm${alarms.length > 1 ? 's' : ''}` };
    },
  },

  // NEW #8 — next alarm query
  {
    id: 'alarm-next',
    label: 'Next alarm time',
    category: 'Alarms',
    keywords: ['next', 'alarm', 'time', 'when'],
    phrases: ['next alarm', 'what time is my alarm', 'when is my alarm', 'what is my next alarm', 'next alarm time'],
    execute: (_, { alarms }) => {
      if (!alarms?.length) return { success: false, message: 'No alarms set' };
      const enabled = alarms.filter(a => a.enabled);
      if (!enabled.length) return { success: false, message: 'No active alarms' };
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      const sorted = [...enabled].sort((a, b) => {
        const [ah, am] = (a.time || '00:00').split(':').map(Number);
        const [bh, bm] = (b.time || '00:00').split(':').map(Number);
        const aM = ah * 60 + am;
        const bM = bh * 60 + bm;
        const aDiff = aM >= nowMins ? aM - nowMins : aM + 1440 - nowMins;
        const bDiff = bM >= nowMins ? bM - nowMins : bM + 1440 - nowMins;
        return aDiff - bDiff;
      });
      const next = sorted[0];
      const [h, m] = (next.time || '00:00').split(':').map(Number);
      const period = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      const label = next.label ? ` — ${next.label}` : '';
      return { success: true, message: `Next alarm: ${h12}:${String(m).padStart(2,'0')} ${period}${label}` };
    },
  },
  // NEW #9 — cancel alarm by name
  {
    id: 'alarm-cancel-named',
    label: 'Cancel alarm by name',
    category: 'Alarms',
    keywords: ['cancel', 'delete', 'remove', 'alarm'],
    phrases: ['cancel alarm morning', 'delete alarm work', 'remove alarm wake up', 'cancel my morning alarm'],
    execute: (text, { alarms, updateAlarm }) => {
      if (!alarms?.length) return { success: false, message: 'No alarms to cancel' };
      const nameMatch = text.replace(/cancel|delete|remove|alarm/gi, '').trim();
      if (!nameMatch) return { success: false, message: 'Say the alarm name, e.g. "cancel alarm morning"' };
      const sim = (a, b) => {
        a = a.toLowerCase(); b = b.toLowerCase();
        if (a === b) return 1;
        const la = a.length, lb = b.length;
        const dp = Array.from({length:la+1},(_,i)=>Array.from({length:lb+1},(_,j)=>i===0?j:j===0?i:0));
        for(let i=1;i<=la;i++) for(let j=1;j<=lb;j++) dp[i][j]=a[i-1]===b[j-1]?dp[i-1][j-1]:1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
        return 1-dp[la][lb]/Math.max(la,lb);
      };
      const found = alarms.find(a => a.label && sim(a.label, nameMatch) > 0.55);
      if (!found) return { success: false, message: `No alarm named "${nameMatch}" found` };
      updateAlarm(found.id, { enabled: false });
      return { success: true, message: `Disabled alarm: ${found.label}` };
    },
  },
  // NEW #10 — list alarms
  {
    id: 'alarm-list',
    label: 'List all alarms',
    category: 'Alarms',
    keywords: ['list', 'read', 'show', 'alarms', 'all'],
    phrases: ['list my alarms', 'read my alarms', 'show all alarms', 'what alarms do I have', 'list alarms'],
    execute: (_, { alarms, navigate }) => {
      if (!alarms?.length) return { success: false, message: 'You have no alarms set' };
      const enabled = alarms.filter(a => a.enabled);
      navigate('/alarms');
      return { success: true, message: `${alarms.length} alarm${alarms.length !== 1 ? 's' : ''} total, ${enabled.length} active` };
    },
  },

  // ── Links ───────────────────────────────────────────────────────────────────
  {
    id: 'link-open',
    label: 'Open a scheduled link',
    category: 'Links',
    keywords: ['links', 'scheduled', 'urls'],
    phrases: ['open scheduled links', 'show links', 'go to links', 'scheduled links'],
    execute: (_, { navigate }) => {
      navigate('/alarms', { state: { tab: 'links' } });
      return { success: true, message: 'Opening Scheduled Links' };
    },
  },

  // ── Routines ────────────────────────────────────────────────────────────────
  {
    id: 'routine-start',
    label: 'Start [name] routine',
    category: 'Routines',
    keywords: ['start', 'begin', 'run', 'routine', 'launch'],
    phrases: [
      'start my routine', 'begin routine', 'run routine', 'launch routine',
      'start morning routine', 'start evening routine', 'start workout routine',
      'start my morning routine', 'start my evening routine', 'start my workout routine',
      'begin morning routine', 'morning routine', 'open routines', 'show routines',
    ],
    execute: (text, { routines, navigate }) => {
      // Try to fuzzy-match a routine name from the transcript
      if (routines && routines.length > 0) {
        const cleaned = text.toLowerCase()
          .replace(/^(start|begin|run|launch|open|show)\s+(my\s+)?/i, '')
          .replace(/\s*routine\s*$/i, '')
          .trim();
        let best = null;
        let bestScore = 0;
        routines.forEach(r => {
          const rName = (r.name || '').toLowerCase();
          // Exact substring match
          if (cleaned && rName.includes(cleaned)) {
            const sc = cleaned.length / rName.length;
            if (sc > bestScore) { bestScore = sc; best = r; }
          }
          // Word overlap
          const rWords = rName.split(/\s+/);
          const tWords = cleaned.split(/\s+/);
          const overlap = tWords.filter(w => rWords.some(rw => rw.includes(w) || w.includes(rw))).length;
          const sc2 = overlap / Math.max(rWords.length, tWords.length, 1);
          if (sc2 > bestScore) { bestScore = sc2; best = r; }
        });
        if (best && bestScore > 0.3) {
          window.dispatchEvent(new CustomEvent('mars:start-routine', { detail: best }));
          return { success: true, message: `Starting routine: ${best.name}` };
        }
        // No name match — just start the first active routine
        const active = routines.find(r => r.active !== false);
        if (active) {
          window.dispatchEvent(new CustomEvent('mars:start-routine', { detail: active }));
          return { success: true, message: `Starting routine: ${active.name}` };
        }
      }
      // Fallback: navigate to routines tab
      navigate('/alarms', { state: { tab: 'routines' } });
      return { success: true, message: 'Opening Routines' };
    },
  },
  {
    id: 'routine-list',
    label: 'List routines',
    category: 'Routines',
    keywords: ['list', 'routines', 'show', 'all'],
    phrases: ['list routines', 'show all routines', 'what routines do i have', 'my routines'],
    execute: (_, { routines, navigate }) => {
      navigate('/alarms', { state: { tab: 'routines' } });
      if (!routines || routines.length === 0) {
        return { success: true, message: 'No routines set up yet' };
      }
      const names = routines.map(r => r.name).join(', ');
      return { success: true, message: `Your routines: ${names}` };
    },
  },
  {
    id: 'routine-goodnight',
    label: 'Goodnight / wind-down',
    category: 'Routines',
    keywords: ['night', 'goodnight', 'wind', 'down', 'sleep', 'bedtime'],
    phrases: ['goodnight', 'wind down', 'start night routine', 'bedtime routine', 'good night'],
    execute: (text, { routines, navigate }) => {
      // Try to find a night/evening routine
      if (routines && routines.length > 0) {
        const night = routines.find(r =>
          /night|evening|sleep|wind|bed/i.test(r.name) && r.active !== false
        );
        if (night) {
          window.dispatchEvent(new CustomEvent('mars:start-routine', { detail: night }));
          return { success: true, message: `Starting routine: ${night.name}` };
        }
      }
      navigate('/alarms', { state: { tab: 'routines', filter: 'night' } });
      return { success: true, message: 'Activating wind-down protocol' };
    },
  },

  // ── System ──────────────────────────────────────────────────────────────────
  {
    id: 'system-status',
    label: 'Check system status',
    category: 'System',
    keywords: ['status', 'system', 'online', 'check'],
    phrases: ['system status', 'check status', 'how are you', 'are you online', 'mars status', 'is mars online'],
    execute: (_, { isOnline }) => ({
      success: true,
      message: `MARS is ${isOnline ? 'fully online' : 'running in offline mode'}`,
    }),
  },
  {
    id: 'system-clock-24',
    label: 'Switch to 24-hour clock',
    category: 'System',
    keywords: ['24', 'hour', 'clock', 'military', 'time'],
    phrases: ['switch to 24 hour', 'use military time', 'enable 24 hour clock', '24 hour time'],
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
    keywords: ['12', 'hour', 'clock', 'am', 'pm'],
    phrases: ['switch to 12 hour', 'use 12 hour clock', 'enable am pm', '12 hour time'],
    execute: () => {
      localStorage.setItem('mars-clock-24hr', 'false');
      window.dispatchEvent(new CustomEvent('mars:clock-format-changed'));
      return { success: true, message: 'Switched to 12-hour clock' };
    },
  },
];

// ── Fuzzy command matcher (DMAIC v2) ─────────────────────────────────────────
// Fix #7: exact-match fast path  Fix #5: threshold raised to 0.38
export function matchCommand(transcript) {
  const cleaned = stripWakeWord(transcript);
  if (!cleaned) return null;

  // ── Fast path: all keywords present + phrase similarity confirms ──────────
  const words = cleaned.toLowerCase().split(/\s+/);
  for (const cmd of COMMAND_DEFS) {
    const allKw = cmd.keywords.every(k => words.some(w => w === k || w.includes(k) || k.includes(w)));
    if (allKw) {
      const phraseSim = Math.max(...cmd.phrases.map(p => similarity(cleaned, p)));
      if (phraseSim > 0.42) return { command: cmd, score: 0.9 };
    }
  }

  // ── Fuzzy path ────────────────────────────────────────────────────────────
  let best = null;
  let bestScore = 0;
  for (const cmd of COMMAND_DEFS) {
    const phraseSim = Math.max(...cmd.phrases.map(p => similarity(cleaned, p)));
    const kwScore   = keywordScore(cleaned, cmd.keywords);
    // Weight phrase similarity higher for longer transcripts
    const w = words.length <= 2 ? 0.35 : 0.55;
    const score = phraseSim * w + kwScore * (1 - w);
    if (score > bestScore) { bestScore = score; best = { command: cmd, score }; }
  }

  return bestScore >= 0.38 ? best : null;
}

// ── Main hook ─────────────────────────────────────────────────────────────────
export function useVoiceCommand({
  alarms = [],
  routines = [],
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
    routines,
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
  }, [alarms, routines, updateAlarm, firingAlarm, dismissAlarm, snoozeAlarm, isOnline]);

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
      if (e.error === 'no-speech') return;
      if (e.error === 'aborted')   return;
      // Fix #11: friendly error messages
      if (e.error === 'not-allowed') {
        setError('Microphone access denied. Go to Settings → App Permissions to enable it.');
      } else if (e.error === 'network') {
        setError('Network error — voice recognition requires an internet connection.');
      } else if (e.error === 'service-not-allowed') {
        setError('Voice recognition is not available in this browser context.');
      } else {
        setError(`Microphone error: ${e.error}`);
      }
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
