// src/pages/Alarms.jsx  — unified Alarms + Scheduled Links + Routines
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth }           from '../hooks/useAuth';
import { useAlarms }         from '../hooks/useAlarms';
import { useAlarmTimer }     from '../hooks/useAlarmTimer';
import { useScheduledLinks } from '../hooks/useScheduledLinks';
import { useRoutines, DEFAULT_STEPS } from '../hooks/useRoutines';
import { useSwipe }          from '../hooks/useSwipe';
import SwipeItem             from '../components/SwipeItem';
import './Alarms.css';

/* ─── Native bridge helpers ─────────────────────────────────────── */
// Returns true when running inside the MARS Android WebView
const isNativeApp = () => !!(window.ReactNativeWebView || window.__marsNativeBridgeReady);

// Opens a URL safely in both browser and Android WebView contexts.
// window.open() is silently blocked inside WebViews — use the native bridge instead.
function openExternalUrl(url) {
  if (!url) return;
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'OPEN_URL', url }));
  } else {
    window.open(url, '_blank', 'noopener');
  }
}

// Request the native ringtone list; resolves with an array of {id, label, uri}
function getNativeRingtones() {
  return new Promise((resolve) => {
    if (!isNativeApp()) { resolve([]); return; }
    const handler = (e) => {
      document.removeEventListener('marsRingtones', handler);
      resolve(e.detail?.ringtones || []);
    };
    document.addEventListener('marsRingtones', handler);
    window.__nativeGetRingtones?.();
    // Fallback timeout in case native layer doesn't respond
    setTimeout(() => { document.removeEventListener('marsRingtones', handler); resolve([]); }, 3000);
  });
}

/* ─── Constants ─────────────────────────────────────────────────── */
const DAYS    = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
// WAV sounds served directly by filename (no prefix needed)
const WAV_SOUNDS = ['alarm-default','alarm-gentle','alarm-military','chime',
  'Argon','Carbon','Helium','Krypton','Neon','Osmium','Oxygen','Platinum'];

const SOUNDS  = [
  { id: 'alarm-default',      label: 'Default',      emoji: '🔔' },
  { id: 'alarm-gentle',       label: 'Gentle',       emoji: '🌅' },
  { id: 'alarm-military',     label: 'Military',     emoji: '🎖️' },
  { id: 'chime',              label: 'Chime',        emoji: '🎵' },
  { id: 'alarm-classic',      label: 'Classic Bell', emoji: '⏰' },
  { id: 'alarm-digital',      label: 'Digital Beep', emoji: '📟' },
  { id: 'alarm-nature',       label: 'Nature',       emoji: '🌿' },
  { id: 'alarm-motivational', label: 'Motivational', emoji: '💪' },
  { id: 'alarm-piano',        label: 'Piano',        emoji: '🎹' },
  { id: 'alarm-cosmic',       label: 'Cosmic',       emoji: '🚀' },
  { id: 'alarm-marimba',      label: 'Marimba',      emoji: '🪘' },
  { id: 'alarm-pulse',        label: 'Pulse',        emoji: '⚡' },
  // Android element alarm tones
  { id: 'Argon',   label: 'Argon',    emoji: '⚗️' },
  { id: 'Carbon',  label: 'Carbon',   emoji: '💎' },
  { id: 'Helium',  label: 'Helium',   emoji: '🎈' },
  { id: 'Krypton', label: 'Krypton',  emoji: '🌌' },
  { id: 'Neon',    label: 'Neon',     emoji: '🔴' },
  { id: 'Osmium',  label: 'Osmium',   emoji: '🔩' },
  { id: 'Oxygen',  label: 'Oxygen',   emoji: '💨' },
  { id: 'Platinum',label: 'Platinum', emoji: '🪙' },
];
const DEVICES = ['phone','computer','all'];

const EMPTY_ALARM = {
  time: '05:30', label: '', enabled: true,
  autoDismiss: false, dismissAfter: 60,
  openUrl: '', openDevice: 'phone',
  days: ['Mon','Tue','Wed','Thu','Fri'],
  sound: 'alarm-default', routineStep: '',
};

const EMPTY_LINK = {
  label: '', url: '', time: '09:00',
  days: ['Mon','Tue','Wed','Thu','Fri'],
  device: 'phone', enabled: true,
};

/* ─── Helpers ────────────────────────────────────────────────────── */
function previewSound(soundId) {
  const ext = WAV_SOUNDS.includes(soundId) ? 'wav' : 'mp3';
  const audio = new Audio(`/sounds/${soundId}.${ext}`);
  audio.volume = 0.7;
  audio.play().catch(() => {});
  setTimeout(() => { audio.pause(); audio.currentTime = 0; }, 4000);
}

function msUntilNextFire(timeStr, days) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  const now = new Date();
  const candidate = new Date(now);
  candidate.setHours(h, m, 0, 0);
  if (candidate <= now) candidate.setDate(candidate.getDate() + 1);
  if (days && days.length > 0) {
    const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    for (let i = 0; i < 8; i++) {
      const d = new Date(candidate);
      d.setDate(d.getDate() + i);
      if (days.includes(DAY_NAMES[d.getDay()])) return d - now;
    }
    return null;
  }
  return candidate - now;
}

function formatCountdown(ms) {
  if (ms == null || ms < 0) return null;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/* ─── Alarm Form ─────────────────────────────────────────────────── */
function AlarmForm({ title, form, setForm, onSave, onCancel, saving }) {
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleDay = d =>
    set('days', form.days.includes(d) ? form.days.filter(x => x !== d) : [...form.days, d]);

  // Native ringtone picker — only shown when running in the Android app
  const [nativeRingtones, setNativeRingtones] = useState([]);
  const [loadingRingtones, setLoadingRingtones] = useState(false);
  useEffect(() => {
    if (!isNativeApp()) return;
    setLoadingRingtones(true);
    getNativeRingtones().then(list => {
      setNativeRingtones(list);
      setLoadingRingtones(false);
    });
  }, []);

  return (
    <div className="alarm-form card">
      <h3 className="form-title">{title}</h3>
      <div className="form-grid">
        <div className="form-field">
          <label>Time</label>
          <input type="time" value={form.time} onChange={e => set('time', e.target.value)} />
        </div>
        <div className="form-field">
          <label>Label</label>
          <input type="text" value={form.label} placeholder="Morning protocol..."
            onChange={e => set('label', e.target.value)} />
        </div>
      </div>
      <div className="form-field">
        <label>Days</label>
        <div className="day-pills">
          {DAYS.map(d => (
            <button key={d} className={`day-pill ${form.days.includes(d) ? 'active' : ''}`}
              onClick={() => toggleDay(d)}>{d}</button>
          ))}
        </div>
      </div>
      <div className="form-grid">
        <div className="form-field">
          <label>Dismiss mode</label>
          <div className="radio-group">
            <label className="radio-opt">
              <input type="radio" checked={!form.autoDismiss} onChange={() => set('autoDismiss', false)} />
              Button dismiss
            </label>
            <label className="radio-opt">
              <input type="radio" checked={form.autoDismiss} onChange={() => set('autoDismiss', true)} />
              Auto-dismiss
            </label>
          </div>
        </div>
        {form.autoDismiss && (
          <div className="form-field">
            <label>Auto-dismiss after (seconds)</label>
            <input type="number" value={form.dismissAfter} min={10} max={300}
              onChange={e => set('dismissAfter', parseInt(e.target.value))} />
          </div>
        )}
      </div>
      <div className="form-grid">
        <div className="form-field">
          <label>Open URL on dismiss</label>
          <input type="url" value={form.openUrl} placeholder="https://..."
            onChange={e => set('openUrl', e.target.value)} />
        </div>
        <div className="form-field">
          <label>Open on device</label>
          <select value={form.openDevice} onChange={e => set('openDevice', e.target.value)}>
            {DEVICES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
      <div className="form-grid">
        <div className="form-field">
          <label>Sound</label>
          <div className="sound-selector">
            {isNativeApp() && nativeRingtones.length > 0 ? (
              /* Native ringtone picker — shows system alarm sounds from Android */
              <select value={form.sound} onChange={e => set('sound', e.target.value)}>
                {nativeRingtones.map(r => (
                  <option key={r.id} value={r.uri}>{r.label}</option>
                ))}
              </select>
            ) : (
              /* Web fallback — shows built-in web sounds */
              <>
                <select value={form.sound} onChange={e => set('sound', e.target.value)}>
                  {loadingRingtones
                    ? <option>Loading system sounds...</option>
                    : SOUNDS.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.label}</option>)
                  }
                </select>
                {!isNativeApp() && (
                  <button type="button" className="btn btn-preview" onClick={() => previewSound(form.sound)}>
                    <i className="ti ti-player-play" /> Preview
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        <div className="form-field">
          <label>Routine step label (optional)</label>
          <input type="text" value={form.routineStep} placeholder="e.g. Wake up"
            onChange={e => set('routineStep', e.target.value)} />
        </div>
      </div>
      <div className="form-actions">
        <button className="btn" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" onClick={onSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save alarm'}
        </button>
      </div>
    </div>
  );
}

/* ─── Link Form ──────────────────────────────────────────────────── */
function LinkForm({ title, form, setForm, onSave, onCancel, saving }) {
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleDay = d =>
    set('days', form.days.includes(d) ? form.days.filter(x => x !== d) : [...form.days, d]);

  return (
    <div className="alarm-form card">
      <h3 className="form-title">{title}</h3>
      <div className="form-grid">
        <div className="form-field">
          <label>Label</label>
          <input type="text" value={form.label} placeholder="e.g. Morning news, Workout video..."
            onChange={e => set('label', e.target.value)} />
        </div>
        <div className="form-field">
          <label>URL</label>
          <input type="url" value={form.url} placeholder="https://..."
            onChange={e => set('url', e.target.value)} />
        </div>
      </div>
      <div className="form-grid">
        <div className="form-field">
          <label>Time</label>
          <input type="time" value={form.time} onChange={e => set('time', e.target.value)} />
        </div>
        <div className="form-field">
          <label>Open on device</label>
          <select value={form.device} onChange={e => set('device', e.target.value)}>
            {DEVICES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
      <div className="form-field">
        <label>Days</label>
        <div className="day-pills">
          {DAYS.map(d => (
            <button key={d} className={`day-pill ${form.days.includes(d) ? 'active' : ''}`}
              onClick={() => toggleDay(d)}>{d}</button>
          ))}
        </div>
      </div>
      <div className="form-actions">
        <button className="btn" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" onClick={onSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save link'}
        </button>
      </div>
    </div>
  );
}

/* ─── Client-side link timer ─────────────────────────────────────── */
function useLinkTimer(links) {
  const firedRef = useRef(new Set());
  const [linkCountdowns, setLinkCountdowns] = useState({});

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      const todayName = DAY_NAMES[now.getDay()];
      const nowH = now.getHours();
      const nowM = now.getMinutes();
      const key = `${nowH}:${nowM.toString().padStart(2,'0')}`;

      // Reset fired set each minute
      if (now.getSeconds() === 0) firedRef.current.clear();

      links.forEach(link => {
        if (!link.enabled || !link.url || !link.time) return;
        const fireKey = `${link.id}-${key}`;
        if (firedRef.current.has(fireKey)) return;

        const [lh, lm] = link.time.split(':').map(Number);
        if (nowH !== lh || nowM !== lm) return;

        const days = link.days || [];
        if (days.length > 0 && !days.includes(todayName)) return;

        firedRef.current.add(fireKey);
        // Open the URL
        openExternalUrl(link.url);
      });

      // Update countdowns
      const cd = {};
      links.forEach(link => {
        if (!link.enabled) return;
        const ms = msUntilNextFire(link.time, link.days);
        if (ms != null) cd[link.id] = formatCountdown(ms);
      });
      setLinkCountdowns(cd);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [links]);

  return { linkCountdowns };
}


/* ─── Inline Step Editor (used in Routines tab) ─────────────────── */
const STEP_ICONS = [
  'ti-alarm','ti-sun','ti-droplet','ti-coffee','ti-run','ti-barbell',
  'ti-book','ti-brain','ti-heart-rate','ti-moon','ti-bed','ti-pill',
  'ti-music','ti-microphone','ti-link','ti-device-mobile','ti-laptop',
  'ti-checklist','ti-clock','ti-star',
];

function SimpleStepEditor({ steps, onChange }) {
  const [newLabel, setNewLabel] = useState('');
  const [newIcon, setNewIcon]   = useState('ti-alarm');

  const addStep = () => {
    if (!newLabel.trim()) return;
    onChange([...steps, { id: `step-${Date.now()}`, label: newLabel.trim(), icon: newIcon }]);
    setNewLabel('');
  };

  const deleteStep = (idx) => onChange(steps.filter((_, i) => i !== idx));

  const moveStep = (idx, dir) => {
    const arr = [...steps];
    const t = idx + dir;
    if (t < 0 || t >= arr.length) return;
    [arr[idx], arr[t]] = [arr[t], arr[idx]];
    onChange(arr);
  };

  return (
    <div className="step-editor">
      <div className="step-editor-title">Flow Steps</div>
      {steps.map((step, i) => (
        <div key={step.id || i} className="step-edit-row">
          <div className="step-num-sm">{i + 1}</div>
          <i className={`ti ${step.icon}`} />
          <span className="step-label-text">{step.label}</span>
          <div className="step-actions">
            <button className="icon-btn-sm" onClick={() => moveStep(i, -1)} disabled={i === 0}>
              <i className="ti ti-arrow-up" /></button>
            <button className="icon-btn-sm" onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1}>
              <i className="ti ti-arrow-down" /></button>
            <button className="icon-btn-sm danger" onClick={() => deleteStep(i)}>
              <i className="ti ti-trash" /></button>
          </div>
        </div>
      ))}
      <div className="step-add-row">
        <select value={newIcon} onChange={e => setNewIcon(e.target.value)}>
          {STEP_ICONS.map(ic => <option key={ic} value={ic}>{ic.replace('ti-','')}</option>)}
        </select>
        <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
          placeholder="New step..." onKeyDown={e => e.key === 'Enter' && addStep()} />
        <button className="btn btn-sm" onClick={addStep}><i className="ti ti-plus" /> Add</button>
      </div>
    </div>
  );
}

/* ─── Main unified page ──────────────────────────────────────────── */
export default function Alarms() {
  const { user } = useAuth();
  const { alarms, loading: alarmsLoading, addAlarm, updateAlarm, deleteAlarm } = useAlarms(user?.uid);
  const { links,  loading: linksLoading,  addLink,  updateLink,  deleteLink  } = useScheduledLinks(user?.uid);
  const { routines, loading: routinesLoading, addRoutine, updateRoutine, deleteRoutine } = useRoutines(user?.uid);
  const { firingAlarm, dismissAlarm, snoozeAlarm, countdowns } = useAlarmTimer(alarms);
  const { linkCountdowns } = useLinkTimer(links);

  const TABS = ['alarms', 'links', 'routines'];
  const [tab, setTab] = useState('alarms'); // 'alarms' | 'links' | 'routines'

  // FAB listener — opens the add form for the current tab
  useEffect(() => {
    function onFab() {
      if (tab === 'alarms')     { setShowAlarmForm(true);   setEditAlarmId(null); }
      else if (tab === 'links') { setShowLinkForm(true);    setEditLinkId(null);  }
      else                     { setShowRoutineForm(true); }
    }
    window.addEventListener('mars:fab', onFab);
    return () => window.removeEventListener('mars:fab', onFab);
  }, [tab]);

  // Swipe left/right to switch tabs
  const swipeTabHandlers = useSwipe({
    onSwipeLeft:  () => setTab(t => { const i = TABS.indexOf(t); return TABS[Math.min(i + 1, TABS.length - 1)]; }),
    onSwipeRight: () => setTab(t => { const i = TABS.indexOf(t); return TABS[Math.max(i - 1, 0)]; }),
  });

  // ── Alarm add/edit state ──────────────────────────────────────────
  const [showAlarmForm, setShowAlarmForm] = useState(false);
  const [alarmForm, setAlarmForm]         = useState(EMPTY_ALARM);
  const [alarmSaving, setAlarmSaving]     = useState(false);
  const [editAlarmId, setEditAlarmId]     = useState(null);
  const [editAlarmForm, setEditAlarmForm] = useState(null);
  const [editAlarmSaving, setEditAlarmSaving] = useState(false);

  // ── Link add/edit state ───────────────────────────────────────────
  const [showLinkForm, setShowLinkForm]   = useState(false);
  const [linkForm, setLinkForm]           = useState(EMPTY_LINK);
  const [linkSaving, setLinkSaving]       = useState(false);
  const [editLinkId, setEditLinkId]       = useState(null);
  const [editLinkForm, setEditLinkForm]   = useState(null);
  const [editLinkSaving, setEditLinkSaving] = useState(false);

  // ── Routine step editing state ──────────────────────────────────
  const [editingStepsId, setEditingStepsId] = useState(null);
  const [editingSteps, setEditingSteps]     = useState([]);
  const startEditSteps = (r) => {
    setEditingStepsId(r.id);
    setEditingSteps([...(r.steps || DEFAULT_STEPS)]);
  };
  const saveSteps = async (id) => {
    await updateRoutine(id, { steps: editingSteps });
    setEditingStepsId(null);
  };

  // ── Routine add state ─────────────────────────────────────────────
  const EMPTY_ROUTINE = {
    name: '', type: 'morning',
    days: ['Mon','Tue','Wed','Thu','Fri'],
    triggerTime: '', sound: 'alarm-default',
    openUrl: '', openDevice: 'phone',
  };
  const [showRoutineForm, setShowRoutineForm] = useState(false);
  const [routineForm, setRoutineForm]         = useState(EMPTY_ROUTINE);
  const [routineSaving, setRoutineSaving]     = useState(false);
  const setR = (k, v) => setRoutineForm(p => ({ ...p, [k]: v }));
  const toggleRoutineDay = (d) =>
    setRoutineForm(p => ({
      ...p,
      days: p.days.includes(d) ? p.days.filter(x => x !== d) : [...p.days, d],
    }));
  const handleAddRoutine = async () => {
    if (!routineForm.name) return;
    setRoutineSaving(true);
    await addRoutine(routineForm);
    setRoutineForm(EMPTY_ROUTINE);
    setShowRoutineForm(false);
    setRoutineSaving(false);
  };

  // ── Alarm handlers ────────────────────────────────────────────────
  const handleAddAlarm = async () => {
    if (!alarmForm.time) return;
    setAlarmSaving(true);
    await addAlarm(alarmForm);
    setAlarmForm(EMPTY_ALARM);
    setShowAlarmForm(false);
    setAlarmSaving(false);
  };

  const startEditAlarm = alarm => {
    setEditAlarmId(alarm.id);
    setEditAlarmForm({
      time: alarm.time || '05:30', label: alarm.label || '',
      enabled: alarm.enabled ?? true, autoDismiss: alarm.autoDismiss ?? false,
      dismissAfter: alarm.dismissAfter ?? 60, openUrl: alarm.openUrl || '',
      openDevice: alarm.openDevice || 'phone', days: alarm.days || [],
      sound: alarm.sound || 'alarm-default', routineStep: alarm.routineStep || '',
    });
  };

  const handleSaveAlarmEdit = async () => {
    if (!editAlarmForm.time) return;
    setEditAlarmSaving(true);
    await updateAlarm(editAlarmId, editAlarmForm);
    setEditAlarmId(null); setEditAlarmForm(null); setEditAlarmSaving(false);
  };

  // ── Link handlers ─────────────────────────────────────────────────
  const handleAddLink = async () => {
    if (!linkForm.url || !linkForm.time) return;
    setLinkSaving(true);
    await addLink(linkForm);
    setLinkForm(EMPTY_LINK);
    setShowLinkForm(false);
    setLinkSaving(false);
  };

  const startEditLink = link => {
    setEditLinkId(link.id);
    setEditLinkForm({
      label: link.label || '', url: link.url || '',
      time: link.time || '09:00', days: link.days || [],
      device: link.device || 'phone', enabled: link.enabled ?? true,
    });
  };

  const handleSaveLinkEdit = async () => {
    if (!editLinkForm.url || !editLinkForm.time) return;
    setEditLinkSaving(true);
    await updateLink(editLinkId, editLinkForm);
    setEditLinkId(null); setEditLinkForm(null); setEditLinkSaving(false);
  };

  return (
    <div className="page-wrap" {...swipeTabHandlers}>

      {/* ── Alarm Firing Overlay ────────────────────────────────── */}
      {firingAlarm && (
        <div className="alarm-overlay">
          <div className="alarm-firing-card">
            <div className="alarm-firing-icon">⏰</div>
            <div className="alarm-firing-time">{firingAlarm.time}</div>
            <div className="alarm-firing-label">{firingAlarm.label || 'Alarm'}</div>
            {firingAlarm.openUrl && (
              <div className="alarm-firing-url">
                <i className="ti ti-external-link" /> {firingAlarm.openUrl}
              </div>
            )}
            <div className="alarm-firing-actions">
              <button className="btn btn-snooze" onClick={() => snoozeAlarm(firingAlarm)}>
                <i className="ti ti-clock-pause" /> Snooze 5m
              </button>
              <button className="btn btn-dismiss" onClick={() => dismissAlarm(firingAlarm)}>
                <i className="ti ti-check" /> Dismiss{firingAlarm.openUrl ? ' & Open' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="page-header">
        <h1 className="page-title">Alarms &amp; Links</h1>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────── */}
      <div className="unified-tabs">
        <button
          className={`unified-tab ${tab === 'alarms' ? 'active' : ''}`}
          onClick={() => setTab('alarms')}
        >
          <i className="ti ti-alarm" />
          Alarms
          {alarms.length > 0 && <span className="tab-badge">{alarms.length}</span>}
        </button>
        <button
          className={`unified-tab ${tab === 'links' ? 'active' : ''}`}
          onClick={() => setTab('links')}
        >
          <i className="ti ti-external-link" />
          Scheduled Links
          {links.length > 0 && <span className="tab-badge">{links.length}</span>}
        </button>
        <button
          className={`unified-tab ${tab === 'routines' ? 'active' : ''}`}
          onClick={() => setTab('routines')}
        >
          <i className="ti ti-route" />
          Routines
          {routines.length > 0 && <span className="tab-badge">{routines.length}</span>}
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════
          ALARMS TAB
      ══════════════════════════════════════════════════════════ */}
      {tab === 'alarms' && (
        <>
          {showAlarmForm && (
            <AlarmForm
              title="New alarm"
              form={alarmForm}
              setForm={setAlarmForm}
              onSave={handleAddAlarm}
              onCancel={() => setShowAlarmForm(false)}
              saving={alarmSaving}
            />
          )}

          {alarmsLoading ? (
            <div className="empty-state">Loading alarms...</div>
          ) : alarms.length === 0 ? (
            <div className="empty-state">
              <i className="ti ti-alarm" style={{ fontSize: 40, color: 'var(--text3)' }} />
              <p>No alarms yet. Create your first one.</p>
            </div>
          ) : (
            <div className="alarm-list">
              {alarms.map(alarm => (
                <div key={alarm.id}>
                  {editAlarmId === alarm.id ? (
                    <AlarmForm
                      title={`Edit — ${alarm.label || alarm.time}`}
                      form={editAlarmForm}
                      setForm={setEditAlarmForm}
                      onSave={handleSaveAlarmEdit}
                      onCancel={() => { setEditAlarmId(null); setEditAlarmForm(null); }}
                      saving={editAlarmSaving}
                    />
                  ) : (
                    <SwipeItem onDelete={() => deleteAlarm(alarm.id)} label="Delete">
                    <div className={`alarm-row card ${alarm.enabled ? '' : 'disabled'}`}>
                      <div className="alarm-time-block">
                        <div className="alarm-time">{alarm.time}</div>
                        <div className="alarm-label">{alarm.label || 'Untitled alarm'}</div>
                        <div className="alarm-days">
                          {(alarm.days || []).map(d => <span key={d} className="day-tag">{d}</span>)}
                        </div>
                        {alarm.enabled && countdowns[alarm.id] && (
                          <div className="alarm-countdown">
                            <i className="ti ti-clock" /> {countdowns[alarm.id]}
                          </div>
                        )}
                      </div>
                      <div className="alarm-meta">
                        {alarm.openUrl && (
                          <div className="alarm-url">
                            <i className="ti ti-external-link" />
                            <span>{alarm.openUrl} · {alarm.openDevice}</span>
                          </div>
                        )}
                        <div className="alarm-tags">
                          <span className="badge badge-gray">
                            {alarm.autoDismiss ? `Auto-dismiss ${alarm.dismissAfter}s` : 'Button dismiss'}
                          </span>
                          <span className="badge badge-gray">
                            {SOUNDS.find(s => s.id === alarm.sound)?.emoji || '🔔'}{' '}
                            {SOUNDS.find(s => s.id === alarm.sound)?.label || alarm.sound}
                          </span>
                        </div>
                      </div>
                      <div className="alarm-controls">
                        <button className={`toggle ${alarm.enabled ? 'on' : ''}`}
                          onClick={() => updateAlarm(alarm.id, { enabled: !alarm.enabled })}
                          aria-label="Toggle alarm" />
                        <button className="icon-btn" onClick={() => startEditAlarm(alarm)} title="Edit alarm">
                          <i className="ti ti-pencil" />
                        </button>
                        <button className="icon-btn" onClick={() => deleteAlarm(alarm.id)} title="Delete alarm">
                          <i className="ti ti-trash" />
                        </button>
                      </div>
                    </div>
                    </SwipeItem>
                  )}
                </div>
              ))}
            </div>
          )}
          {/* ── Centered Add button below last alarm ── */}
          {!showAlarmForm && (
            <div className="add-item-centered">
              <button className="add-custom-btn" onClick={() => { setShowAlarmForm(true); setEditAlarmId(null); }}>
                <i className="ti ti-plus" /> New alarm
              </button>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════
          SCHEDULED LINKS TAB
      ══════════════════════════════════════════════════════════ */}
      {tab === 'links' && (
        <>
          <p className="page-desc">
            URLs open automatically on your chosen device at the scheduled time. The tab must be open for links to fire.
          </p>

          {showLinkForm && (
            <LinkForm
              title="New scheduled link"
              form={linkForm}
              setForm={setLinkForm}
              onSave={handleAddLink}
              onCancel={() => setShowLinkForm(false)}
              saving={linkSaving}
            />
          )}

          {linksLoading ? (
            <div className="empty-state">Loading scheduled links...</div>
          ) : links.length === 0 ? (
            <div className="empty-state">
              <i className="ti ti-external-link" style={{ fontSize: 40, color: 'var(--text3)' }} />
              <p>No scheduled links yet. Add URLs that open automatically at set times.</p>
            </div>
          ) : (
            <div className="alarm-list">
              {links.map(link => (
                <div key={link.id}>
                  {editLinkId === link.id ? (
                    <LinkForm
                      title={`Edit — ${link.label || link.url}`}
                      form={editLinkForm}
                      setForm={setEditLinkForm}
                      onSave={handleSaveLinkEdit}
                      onCancel={() => { setEditLinkId(null); setEditLinkForm(null); }}
                      saving={editLinkSaving}
                    />
                  ) : (
                    <SwipeItem onDelete={() => deleteLink(link.id)} label="Delete">
                    <div className={`alarm-row card ${link.enabled ? '' : 'disabled'}`}>
                      <div className="alarm-time-block">
                        <div className="alarm-time">{link.time}</div>
                        <div className="alarm-label">{link.label || 'Untitled link'}</div>
                        <div className="alarm-days">
                          {(link.days || []).map(d => <span key={d} className="day-tag">{d}</span>)}
                        </div>
                        {link.enabled && linkCountdowns[link.id] && (
                          <div className="alarm-countdown">
                            <i className="ti ti-clock" /> {linkCountdowns[link.id]}
                          </div>
                        )}
                      </div>
                      <div className="alarm-meta">
                        <div className="alarm-url">
                          <i className="ti ti-external-link" />
                          <span>{link.url}</span>
                        </div>
                        <div className="alarm-tags">
                          <span className="badge badge-gray">
                            <i className="ti ti-device-mobile" /> {link.device}
                          </span>
                        </div>
                      </div>
                      <div className="alarm-controls">
                        <button className={`toggle ${link.enabled ? 'on' : ''}`}
                          onClick={() => updateLink(link.id, { enabled: !link.enabled })}
                          aria-label="Toggle link" />
                        <button className="icon-btn" onClick={() => startEditLink(link)} title="Edit link">
                          <i className="ti ti-pencil" />
                        </button>
                        <button className="icon-btn" onClick={() => deleteLink(link.id)} title="Delete link">
                          <i className="ti ti-trash" />
                        </button>
                      </div>
                    </div>
                    </SwipeItem>
                  )}
                </div>
              ))}
            </div>
              )}
          {/* ── Centered Add button below last link ── */}
          {!showLinkForm && (
            <div className="add-item-centered">
              <button className="add-custom-btn" onClick={() => { setShowLinkForm(true); setEditLinkId(null); }}>
                <i className="ti ti-plus" /> New link
              </button>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════
          ROUTINES TAB
      ══════════════════════════════════════════════════════════ */}
      {tab === 'routines' && (
        <>
          <p className="page-desc">
            Routines chain alarms, lights, sounds and URLs into automated morning or evening flows.
          </p>

          {showRoutineForm && (
            <div className="alarm-form card" style={{ marginBottom: 20 }}>
              <h3 className="form-title">New routine</h3>
              <div className="form-grid">
                <div className="form-field">
                  <label>Name</label>
                  <input type="text" value={routineForm.name} placeholder="Morning protocol..."
                    onChange={e => setR('name', e.target.value)} />
                </div>
                <div className="form-field">
                  <label>Type</label>
                  <select value={routineForm.type} onChange={e => setR('type', e.target.value)}>
                    <option value="morning">Morning</option>
                    <option value="evening">Evening</option>
                    <option value="workout">Workout</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>
              <div className="form-field">
                <label>Days</label>
                <div className="day-pills">
                  {DAYS.map(d => (
                    <button key={d} className={`day-pill ${routineForm.days.includes(d) ? 'active' : ''}`}
                      onClick={() => toggleRoutineDay(d)}>{d}</button>
                  ))}
                </div>
              </div>
              <div className="form-grid">
                <div className="form-field">
                  <label>Trigger time <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
                  <input type="time" value={routineForm.triggerTime}
                    onChange={e => setR('triggerTime', e.target.value)} />
                </div>
                <div className="form-field">
                  <label>Sound</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select value={routineForm.sound} onChange={e => setR('sound', e.target.value)} style={{ flex: 1 }}>
                      {SOUNDS.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.label}</option>)}
                    </select>
                    <button className="btn" style={{ padding: '6px 12px', whiteSpace: 'nowrap' }}
                      onClick={() => previewSound(routineForm.sound)}>
                      <i className="ti ti-player-play" /> Preview
                    </button>
                  </div>
                </div>
              </div>
              <div className="form-grid">
                <div className="form-field">
                  <label>Open URL on trigger <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
                  <input type="url" value={routineForm.openUrl} placeholder="https://..."
                    onChange={e => setR('openUrl', e.target.value)} />
                </div>
                <div className="form-field">
                  <label>Open on device</label>
                  <select value={routineForm.openDevice} onChange={e => setR('openDevice', e.target.value)}>
                    {DEVICES.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-actions">
                <button className="btn" onClick={() => { setShowRoutineForm(false); setRoutineForm(EMPTY_ROUTINE); }}>Cancel</button>
                <button className="btn btn-primary" onClick={handleAddRoutine} disabled={routineSaving}>
                  {routineSaving ? 'Saving...' : 'Save routine'}
                </button>
              </div>
            </div>
          )}

          {routinesLoading ? (
            <div className="empty-state">Loading routines...</div>
          ) : routines.length === 0 ? (
            <div className="empty-state">
              <i className="ti ti-route" style={{ fontSize: 40, color: 'var(--text3)' }} />
              <p>No routines yet. Build your first automated flow.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {routines.map(r => (
                <SwipeItem key={r.id} onDelete={() => deleteRoutine(r.id)} label="Delete">
                <div className="card routine-card">
                  <div className="routine-header">
                    <div>
                      <div className="routine-name">{r.name}</div>
                      <div className="routine-meta">
                        {r.triggerTime && (
                          <span className="routine-time">
                            <i className="ti ti-clock" /> {r.triggerTime}
                          </span>
                        )}
                        <div className="routine-days">
                          {(r.days || []).map(d => <span key={d} className="day-tag">{d}</span>)}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className={`badge ${r.active ? 'badge-green' : 'badge-gray'}`}>
                        {r.active ? 'Active' : 'Paused'}
                      </span>
                      <button className={`toggle ${r.active ? 'on' : ''}`}
                        onClick={() => updateRoutine(r.id, { active: !r.active })} />
                      <button className="icon-btn" onClick={() => deleteRoutine(r.id)}>
                        <i className="ti ti-trash" />
                      </button>
                    </div>
                  </div>
                  {editingStepsId === r.id ? (
                    <div style={{ marginTop: 8 }}>
                      <SimpleStepEditor steps={editingSteps} onChange={setEditingSteps} />
                      <div className="form-actions" style={{ marginTop: 10 }}>
                        <button className="btn" onClick={() => setEditingStepsId(null)}>Cancel</button>
                        <button className="btn btn-primary" onClick={() => saveSteps(r.id)}>Save steps</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flow-steps">
                        {(r.steps || DEFAULT_STEPS).map((step, i) => (
                          <div key={step.id || i} className="flow-step">
                            <div className="step-num">{i + 1}</div>
                            <i className={`ti ${step.icon}`} />
                            <span>{step.label}</span>
                            {i < (r.steps || DEFAULT_STEPS).length - 1 && (
                              <i className="ti ti-arrow-right step-arrow" />
                            )}
                          </div>
                        ))}
                      </div>
                      <button className="btn btn-sm" style={{ marginTop: 10 }} onClick={() => startEditSteps(r)}>
                        <i className="ti ti-pencil" /> Edit steps
                      </button>
                    </>
                  )}
                </div>
                </SwipeItem>
              ))}
            </div>
          )}
          {/* ── Centered Add button below last routine ── */}
          {!showRoutineForm && (
            <div className="add-item-centered">
              <button className="add-custom-btn" onClick={() => setShowRoutineForm(true)}>
                <i className="ti ti-plus" /> New routine
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
