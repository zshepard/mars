// src/pages/Alarms.jsx
import { useState } from 'react';
import { useAuth }       from '../hooks/useAuth';
import { useAlarms }     from '../hooks/useAlarms';
import { useAlarmTimer } from '../hooks/useAlarmTimer';
import './Alarms.css';

const DAYS   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const SOUNDS = [
  { id: 'alarm-default',      label: 'Default',       emoji: '🔔' },
  { id: 'alarm-gentle',       label: 'Gentle',        emoji: '🌅' },
  { id: 'alarm-military',     label: 'Military',      emoji: '🎖️' },
  { id: 'chime',              label: 'Chime',         emoji: '🎵' },
  { id: 'alarm-classic',      label: 'Classic Bell',  emoji: '⏰' },
  { id: 'alarm-digital',      label: 'Digital Beep',  emoji: '📟' },
  { id: 'alarm-nature',       label: 'Nature',        emoji: '🌿' },
  { id: 'alarm-motivational', label: 'Motivational',  emoji: '💪' },
  { id: 'alarm-piano',        label: 'Piano',         emoji: '🎹' },
  { id: 'alarm-cosmic',       label: 'Cosmic',        emoji: '🚀' },
  { id: 'alarm-marimba',      label: 'Marimba',       emoji: '🪘' },
  { id: 'alarm-pulse',        label: 'Pulse',         emoji: '⚡' },
];
const DEVICES = ['phone','computer','all'];

const EMPTY = {
  time: '05:30', label: '', enabled: true,
  autoDismiss: false, dismissAfter: 60,
  openUrl: '', openDevice: 'phone',
  days: ['Mon','Tue','Wed','Thu','Fri'],
  sound: 'alarm-default', routineStep: '',
};

export default function Alarms() {
  const { user }   = useAuth();
  const { alarms, loading, addAlarm, updateAlarm, deleteAlarm } = useAlarms(user?.uid);

  // ── Client-side timer (fires even when notifications are blocked) ──
  const { firingAlarm, dismissAlarm, snoozeAlarm, countdowns } = useAlarmTimer(alarms);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(EMPTY);
  const [saving, setSaving]     = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const previewSound = (soundId) => {
    const ext = ['alarm-default','alarm-gentle','alarm-military','chime'].includes(soundId) ? 'wav' : 'mp3';
    const audio = new Audio(`/sounds/${soundId}.${ext}`);
    audio.volume = 0.7;
    audio.play().catch(() => {});
    setTimeout(() => { audio.pause(); audio.currentTime = 0; }, 4000);
  };

  const toggleDay = (d) =>
    set('days', form.days.includes(d) ? form.days.filter((x) => x !== d) : [...form.days, d]);

  const handleSave = async () => {
    if (!form.time) return;
    setSaving(true);
    await addAlarm(form);
    setForm(EMPTY);
    setShowForm(false);
    setSaving(false);
  };

  return (
    <div className="page-wrap">

      {/* ── Alarm Firing Overlay ─────────────────────────────────── */}
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

      <div className="page-header">
        <h1 className="page-title">Alarms</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <i className="ti ti-plus" /> New alarm
        </button>
      </div>

      {/* ── Add alarm form ───────────────────────────────────────── */}
      {showForm && (
        <div className="alarm-form card">
          <h3 className="form-title">New alarm</h3>

          <div className="form-grid">
            <div className="form-field">
              <label>Time</label>
              <input type="time" value={form.time} onChange={(e) => set('time', e.target.value)} />
            </div>
            <div className="form-field">
              <label>Label</label>
              <input type="text" value={form.label} placeholder="Morning protocol..."
                onChange={(e) => set('label', e.target.value)} />
            </div>
          </div>

          <div className="form-field">
            <label>Days</label>
            <div className="day-pills">
              {DAYS.map((d) => (
                <button key={d}
                  className={`day-pill ${form.days.includes(d) ? 'active' : ''}`}
                  onClick={() => toggleDay(d)}>{d}</button>
              ))}
            </div>
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label>Dismiss mode</label>
              <div className="radio-group">
                <label className="radio-opt">
                  <input type="radio" checked={!form.autoDismiss}
                    onChange={() => set('autoDismiss', false)} />
                  Button dismiss
                </label>
                <label className="radio-opt">
                  <input type="radio" checked={form.autoDismiss}
                    onChange={() => set('autoDismiss', true)} />
                  Auto-dismiss
                </label>
              </div>
            </div>
            {form.autoDismiss && (
              <div className="form-field">
                <label>Auto-dismiss after (seconds)</label>
                <input type="number" value={form.dismissAfter} min={10} max={300}
                  onChange={(e) => set('dismissAfter', parseInt(e.target.value))} />
              </div>
            )}
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label>Open URL on dismiss</label>
              <input type="url" value={form.openUrl} placeholder="https://..."
                onChange={(e) => set('openUrl', e.target.value)} />
            </div>
            <div className="form-field">
              <label>Open on device</label>
              <select value={form.openDevice} onChange={(e) => set('openDevice', e.target.value)}>
                {DEVICES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label>Sound</label>
              <div className="sound-selector">
                <select value={form.sound} onChange={(e) => set('sound', e.target.value)}>
                  {SOUNDS.map((s) => <option key={s.id} value={s.id}>{s.emoji} {s.label}</option>)}
                </select>
                <button type="button" className="btn btn-preview" onClick={() => previewSound(form.sound)} title="Preview sound">
                  <i className="ti ti-player-play" /> Preview
                </button>
              </div>
            </div>
            <div className="form-field">
              <label>Routine step label (optional)</label>
              <input type="text" value={form.routineStep} placeholder="e.g. Wake up"
                onChange={(e) => set('routineStep', e.target.value)} />
            </div>
          </div>

          <div className="form-actions">
            <button className="btn" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save alarm'}
            </button>
          </div>
        </div>
      )}

      {/* ── Alarm list ───────────────────────────────────────────── */}
      {loading ? (
        <div className="empty-state">Loading alarms...</div>
      ) : alarms.length === 0 ? (
        <div className="empty-state">
          <i className="ti ti-alarm" style={{ fontSize: 40, color: 'var(--text3)' }} />
          <p>No alarms yet. Create your first one.</p>
        </div>
      ) : (
        <div className="alarm-list">
          {alarms.map((alarm) => (
            <div key={alarm.id} className={`alarm-row card ${alarm.enabled ? '' : 'disabled'}`}>
              <div className="alarm-time-block">
                <div className="alarm-time">{alarm.time}</div>
                <div className="alarm-label">{alarm.label || 'Untitled alarm'}</div>
                <div className="alarm-days">
                  {(alarm.days || []).map((d) => <span key={d} className="day-tag">{d}</span>)}
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
                    {SOUNDS.find(s => s.id === alarm.sound)?.emoji || '🔔'} {SOUNDS.find(s => s.id === alarm.sound)?.label || alarm.sound}
                  </span>
                </div>
              </div>

              <div className="alarm-controls">
                <button
                  className={`toggle ${alarm.enabled ? 'on' : ''}`}
                  onClick={() => updateAlarm(alarm.id, { enabled: !alarm.enabled })}
                  aria-label="Toggle alarm"
                />
                <button className="icon-btn" onClick={() => deleteAlarm(alarm.id)}
                  title="Delete alarm">
                  <i className="ti ti-trash" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
