// src/pages/Routines.jsx
import { useState } from 'react';
import { useAuth }  from '../hooks/useAuth';
import { useRoutines } from '../hooks/useRoutines';
import './Routines.css';

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

const SOUNDS = [
  { id: 'alarm-default',      label: '🔔 Default' },
  { id: 'alarm-gentle',       label: '🌅 Gentle' },
  { id: 'alarm-military',     label: '🎖️ Military' },
  { id: 'chime',              label: '🎵 Chime' },
  { id: 'alarm-classic',      label: '⏰ Classic Bell' },
  { id: 'alarm-digital',      label: '📟 Digital Beep' },
  { id: 'alarm-nature',       label: '🌿 Nature' },
  { id: 'alarm-motivational', label: '💪 Motivational' },
  { id: 'alarm-piano',        label: '🎹 Piano' },
  { id: 'alarm-cosmic',       label: '🚀 Cosmic' },
  { id: 'alarm-marimba',      label: '🪘 Marimba' },
  { id: 'alarm-pulse',        label: '⚡ Pulse' },
];

const EMPTY_FORM = {
  name:        '',
  type:        'morning',
  days:        ['Mon','Tue','Wed','Thu','Fri'],
  triggerTime: '',
  sound:       'alarm-default',
  openUrl:     '',
  openDevice:  'phone',
};

export default function Routines() {
  const { user }     = useAuth();
  const { routines, loading, addRoutine, updateRoutine, deleteRoutine, DEFAULT_STEPS } = useRoutines(user?.uid);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const toggleDay = (d) =>
    setForm((p) => ({
      ...p,
      days: p.days.includes(d) ? p.days.filter((x) => x !== d) : [...p.days, d],
    }));

  const handleAdd = async () => {
    if (!form.name) return;
    await addRoutine(form);
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  const previewSound = (soundId) => {
    const ext = soundId === 'chime' || soundId.startsWith('alarm-default') || soundId.startsWith('alarm-gentle') || soundId.startsWith('alarm-military')
      ? 'wav' : 'mp3';
    const audio = new Audio(`/sounds/${soundId}.${ext}`);
    audio.play().catch(() => {});
  };

  return (
    <div className="page-wrap">
      <div className="page-header">
        <h1 className="page-title">Routines</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <i className="ti ti-plus" /> New routine
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 className="form-title">New routine</h3>

          {/* Name + Type */}
          <div className="form-grid">
            <div className="form-field">
              <label>Name</label>
              <input type="text" value={form.name} placeholder="Morning protocol..."
                onChange={(e) => set('name', e.target.value)} />
            </div>
            <div className="form-field">
              <label>Type</label>
              <select value={form.type} onChange={(e) => set('type', e.target.value)}>
                <option value="morning">Morning</option>
                <option value="evening">Evening</option>
                <option value="workout">Workout</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>

          {/* Days */}
          <div className="form-field">
            <label>Days</label>
            <div className="day-pills">
              {DAYS.map((d) => (
                <button key={d} className={`day-pill ${form.days.includes(d) ? 'active' : ''}`}
                  onClick={() => toggleDay(d)}>{d}</button>
              ))}
            </div>
          </div>

          {/* Trigger time */}
          <div className="form-grid">
            <div className="form-field">
              <label>Trigger time <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional — leave blank for manual only)</span></label>
              <input type="time" value={form.triggerTime}
                onChange={(e) => set('triggerTime', e.target.value)} />
            </div>
            <div className="form-field">
              <label>Sound</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select value={form.sound} onChange={(e) => set('sound', e.target.value)} style={{ flex: 1 }}>
                  {SOUNDS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                <button className="btn" style={{ padding: '6px 12px', whiteSpace: 'nowrap' }}
                  onClick={() => previewSound(form.sound)}>
                  <i className="ti ti-player-play" /> Preview
                </button>
              </div>
            </div>
          </div>

          {/* Open URL on trigger */}
          <div className="form-grid">
            <div className="form-field">
              <label>Open URL on trigger <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
              <input type="url" value={form.openUrl} placeholder="https://..."
                onChange={(e) => set('openUrl', e.target.value)} />
            </div>
            <div className="form-field">
              <label>Open on device</label>
              <select value={form.openDevice} onChange={(e) => set('openDevice', e.target.value)}>
                <option value="phone">phone</option>
                <option value="computer">computer</option>
                <option value="all">all</option>
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAdd}>Save routine</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="empty-state">Loading routines...</div>
      ) : routines.length === 0 ? (
        <div className="empty-state">
          <i className="ti ti-route" style={{ fontSize: 40, color: 'var(--text3)' }} />
          <p>No routines yet. Build your first flow.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {routines.map((r) => (
            <div key={r.id} className="card routine-card">
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
                      {(r.days || []).map((d) => <span key={d} className="day-tag">{d}</span>)}
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

              {/* Flow steps */}
              <div className="flow-steps">
                {(r.steps || DEFAULT_STEPS).map((step, i) => (
                  <div key={step.id} className="flow-step">
                    <div className="step-num">{i + 1}</div>
                    <i className={`ti ${step.icon}`} />
                    <span>{step.label}</span>
                    {i < (r.steps || DEFAULT_STEPS).length - 1 && (
                      <i className="ti ti-arrow-right step-arrow" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
