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

const STEP_ICONS = [
  'ti-alarm','ti-sun','ti-droplet','ti-coffee','ti-run','ti-barbell',
  'ti-book','ti-brain','ti-heart-rate','ti-moon','ti-bed','ti-pill',
  'ti-music','ti-microphone','ti-link','ti-device-mobile','ti-laptop',
  'ti-checklist','ti-clock','ti-star',
];

const EMPTY_FORM = {
  name: '', type: 'morning',
  days: ['Mon','Tue','Wed','Thu','Fri'],
  triggerTime: '', sound: 'alarm-default',
  openUrl: '', openDevice: 'phone',
};

const EMPTY_STEP = { label: '', icon: 'ti-alarm' };

function StepEditor({ steps, onChange }) {
  const [newStep, setNewStep] = useState(EMPTY_STEP);
  const [editIdx, setEditIdx] = useState(null);
  const [editStep, setEditStep] = useState(EMPTY_STEP);

  const addStep = () => {
    if (!newStep.label.trim()) return;
    const id = `step-${Date.now()}`;
    onChange([...steps, { ...newStep, id }]);
    setNewStep(EMPTY_STEP);
  };

  const deleteStep = (idx) => onChange(steps.filter((_, i) => i !== idx));

  const startEdit = (idx) => {
    setEditIdx(idx);
    setEditStep({ ...steps[idx] });
  };

  const saveEdit = () => {
    if (!editStep.label.trim()) return;
    const updated = steps.map((s, i) => i === editIdx ? { ...s, ...editStep } : s);
    onChange(updated);
    setEditIdx(null);
  };

  const moveStep = (idx, dir) => {
    const arr = [...steps];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    onChange(arr);
  };

  return (
    <div className="step-editor">
      <div className="step-editor-title">Flow Steps</div>

      {steps.map((step, i) => (
        <div key={step.id || i} className="step-edit-row">
          {editIdx === i ? (
            <div className="step-edit-form">
              <select value={editStep.icon} onChange={e => setEditStep(p => ({ ...p, icon: e.target.value }))}>
                {STEP_ICONS.map(ic => <option key={ic} value={ic}>{ic.replace('ti-', '')}</option>)}
              </select>
              <input
                value={editStep.label}
                onChange={e => setEditStep(p => ({ ...p, label: e.target.value }))}
                placeholder="Step label..."
              />
              <button className="btn btn-primary btn-sm" onClick={saveEdit}>Save</button>
              <button className="btn btn-sm" onClick={() => setEditIdx(null)}>Cancel</button>
            </div>
          ) : (
            <>
              <div className="step-num-sm">{i + 1}</div>
              <i className={`ti ${step.icon}`} />
              <span className="step-label-text">{step.label}</span>
              <div className="step-actions">
                <button className="icon-btn-sm" onClick={() => moveStep(i, -1)} disabled={i === 0}
                  title="Move up"><i className="ti ti-arrow-up" /></button>
                <button className="icon-btn-sm" onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1}
                  title="Move down"><i className="ti ti-arrow-down" /></button>
                <button className="icon-btn-sm" onClick={() => startEdit(i)} title="Edit">
                  <i className="ti ti-pencil" /></button>
                <button className="icon-btn-sm danger" onClick={() => deleteStep(i)} title="Delete">
                  <i className="ti ti-trash" /></button>
              </div>
            </>
          )}
        </div>
      ))}

      {/* Add new step */}
      <div className="step-add-row">
        <select value={newStep.icon} onChange={e => setNewStep(p => ({ ...p, icon: e.target.value }))}>
          {STEP_ICONS.map(ic => <option key={ic} value={ic}>{ic.replace('ti-', '')}</option>)}
        </select>
        <input
          value={newStep.label}
          onChange={e => setNewStep(p => ({ ...p, label: e.target.value }))}
          placeholder="New step label..."
          onKeyDown={e => e.key === 'Enter' && addStep()}
        />
        <button className="btn btn-sm" onClick={addStep}>
          <i className="ti ti-plus" /> Add
        </button>
      </div>
    </div>
  );
}

export default function Routines() {
  const { user }     = useAuth();
  const { routines, loading, addRoutine, updateRoutine, deleteRoutine, DEFAULT_STEPS } = useRoutines(user?.uid);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formSteps, setFormSteps] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [editingStepsId, setEditingStepsId] = useState(null);
  const [editingSteps, setEditingSteps] = useState([]);

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const toggleDay = (d) =>
    setForm((p) => ({
      ...p,
      days: p.days.includes(d) ? p.days.filter((x) => x !== d) : [...p.days, d],
    }));

  const handleAdd = async () => {
    if (!form.name) return;
    await addRoutine({ ...form, steps: formSteps.length > 0 ? formSteps : DEFAULT_STEPS });
    setForm(EMPTY_FORM);
    setFormSteps([]);
    setShowForm(false);
  };

  const previewSound = (soundId) => {
    const ext = ['alarm-default','alarm-gentle','alarm-military','chime'].includes(soundId) ? 'wav' : 'mp3';
    const audio = new Audio(`/sounds/${soundId}.${ext}`);
    audio.play().catch(() => {});
  };

  const startEditSteps = (r) => {
    setEditingStepsId(r.id);
    setEditingSteps([...(r.steps || DEFAULT_STEPS)]);
  };

  const saveSteps = async (id) => {
    await updateRoutine(id, { steps: editingSteps });
    setEditingStepsId(null);
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

          <div className="form-field">
            <label>Days</label>
            <div className="day-pills">
              {DAYS.map((d) => (
                <button key={d} className={`day-pill ${form.days.includes(d) ? 'active' : ''}`}
                  onClick={() => toggleDay(d)}>{d}</button>
              ))}
            </div>
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label>Trigger time <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
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

          <div className="form-grid">
            <div className="form-field">
              <label>Open URL on trigger <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
              <input type="url" value={form.openUrl} placeholder="https://..."
                onChange={(e) => set('openUrl', e.target.value)} />
            </div>
            <div className="form-field">
              <label>Open on device</label>
              <select value={form.openDevice} onChange={(e) => set('openDevice', e.target.value)}>
                <option value="phone">Phone</option>
                <option value="computer">Computer</option>
                <option value="all">All</option>
              </select>
            </div>
          </div>

          {/* Step editor in create form */}
          <StepEditor steps={formSteps} onChange={setFormSteps} />

          <div className="form-actions">
            <button className="btn" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setFormSteps([]); }}>Cancel</button>
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
                <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
                  <div className="routine-name">
                    <i className={`ti ti-chevron-${expandedId === r.id ? 'down' : 'right'} routine-chevron`} />
                    {r.name}
                  </div>
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
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
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

              {expandedId === r.id && (
                <div className="routine-expanded">
                  {/* Flow steps display */}
                  {editingStepsId === r.id ? (
                    <div>
                      <StepEditor steps={editingSteps} onChange={setEditingSteps} />
                      <div className="form-actions" style={{ marginTop: 12 }}>
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
                      <button className="btn btn-sm" style={{ marginTop: 12 }} onClick={() => startEditSteps(r)}>
                        <i className="ti ti-pencil" /> Edit steps
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
