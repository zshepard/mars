// src/pages/ScheduledLinks.jsx
import { useState } from 'react';
import { useAuth }  from '../hooks/useAuth';
import { useScheduledLinks } from '../hooks/useScheduledLinks';
import './ScheduledLinks.css';

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DEVICES = ['phone','computer','all'];

const EMPTY = {
  label: '',
  url: '',
  time: '09:00',
  days: ['Mon','Tue','Wed','Thu','Fri'],
  device: 'phone',
  enabled: true,
};

export default function ScheduledLinks() {
  const { user } = useAuth();
  const { links, loading, addLink, updateLink, deleteLink } = useScheduledLinks(user?.uid);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(EMPTY);
  const [saving, setSaving]     = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const toggleDay = (d) =>
    set('days', form.days.includes(d) ? form.days.filter((x) => x !== d) : [...form.days, d]);

  const handleSave = async () => {
    if (!form.url || !form.time) return;
    setSaving(true);
    await addLink(form);
    setForm(EMPTY);
    setShowForm(false);
    setSaving(false);
  };

  return (
    <div className="page-wrap">
      <div className="page-header">
        <h1 className="page-title">Scheduled Links</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <i className="ti ti-plus" /> New link
        </button>
      </div>

      <p className="page-desc">
        Set URLs to automatically open on your chosen device at specific times throughout the day.
        Links fire even when the app is in the background.
      </p>

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 className="form-title">New scheduled link</h3>
          <div className="form-grid">
            <div className="form-field">
              <label>Label</label>
              <input type="text" value={form.label} placeholder="e.g. Morning news, Workout video..."
                onChange={(e) => set('label', e.target.value)} />
            </div>
            <div className="form-field">
              <label>URL</label>
              <input type="url" value={form.url} placeholder="https://..."
                onChange={(e) => set('url', e.target.value)} />
            </div>
          </div>
          <div className="form-grid">
            <div className="form-field">
              <label>Time</label>
              <input type="time" value={form.time}
                onChange={(e) => set('time', e.target.value)} />
            </div>
            <div className="form-field">
              <label>Open on device</label>
              <select value={form.device} onChange={(e) => set('device', e.target.value)}>
                {DEVICES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
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
          <div className="form-actions">
            <button className="btn" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save link'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="empty-state">Loading scheduled links...</div>
      ) : links.length === 0 ? (
        <div className="empty-state">
          <i className="ti ti-external-link" style={{ fontSize: 40, color: 'var(--text3)' }} />
          <p>No scheduled links yet. Add URLs that open automatically at set times.</p>
        </div>
      ) : (
        <div className="link-list">
          {links.map((link) => (
            <div key={link.id} className={`link-row card ${link.enabled ? '' : 'disabled'}`}>
              <div className="link-info">
                <div className="link-time">{link.time}</div>
                <div className="link-label">{link.label || 'Untitled link'}</div>
                <div className="link-url">
                  <i className="ti ti-external-link" />
                  <span>{link.url}</span>
                </div>
                <div className="link-meta">
                  <span className="badge badge-gray">
                    <i className="ti ti-device-mobile" /> {link.device}
                  </span>
                  <div className="link-days">
                    {(link.days || []).map((d) => <span key={d} className="day-tag">{d}</span>)}
                  </div>
                </div>
              </div>
              <div className="link-controls">
                <button
                  className={`toggle ${link.enabled ? 'on' : ''}`}
                  onClick={() => updateLink(link.id, { enabled: !link.enabled })}
                  aria-label="Toggle link"
                />
                <button className="icon-btn" onClick={() => deleteLink(link.id)} title="Delete">
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
