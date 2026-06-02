// src/pages/Routines.jsx
import { useState } from 'react';
import { useAuth }  from '../hooks/useAuth';
import { useRoutines } from '../hooks/useRoutines';
import './Routines.css';

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

export default function Routines() {
  const { user }     = useAuth();
  const { routines, loading, addRoutine, updateRoutine, deleteRoutine, DEFAULT_STEPS } = useRoutines(user?.uid);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'morning', days: ['Mon','Tue','Wed','Thu','Fri'] });

  const toggleDay = (d) =>
    setForm((p) => ({
      ...p,
      days: p.days.includes(d) ? p.days.filter((x) => x !== d) : [...p.days, d],
    }));

  const handleAdd = async () => {
    if (!form.name) return;
    await addRoutine(form);
    setForm({ name: '', type: 'morning', days: ['Mon','Tue','Wed','Thu','Fri'] });
    setShowForm(false);
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
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="form-field">
              <label>Type</label>
              <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
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
          <div className="form-actions">
            <button className="btn" onClick={() => setShowForm(false)}>Cancel</button>
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
                  <div className="routine-days">
                    {(r.days || []).map((d) => <span key={d} className="day-tag">{d}</span>)}
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
