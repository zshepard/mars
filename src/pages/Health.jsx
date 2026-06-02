// src/pages/Health.jsx
import { useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useHome } from '../hooks/useHome';
import './Health.css';

const METRICS = [
  { id: 'hr',     icon: 'ti-heart-rate',   label: 'Heart rate',     value: '62 bpm',   status: 'Normal',   action: 'Calm mode: on',          color: 'green' },
  { id: 'sleep',  icon: 'ti-moon',          label: 'Sleep quality',  value: '87%',      status: 'Great',    action: 'Full routine active',     color: 'green' },
  { id: 'steps',  icon: 'ti-walk',          label: 'Steps today',    value: '3,240',    status: 'Behind',   action: 'Walk reminder: 3pm',      color: 'amber' },
  { id: 'water',  icon: 'ti-droplet',       label: 'Hydration',      value: '4/8',      status: 'On track', action: 'Reminder in 1hr',         color: 'green' },
  { id: 'weight', icon: 'ti-barbell',       label: 'Workout today',  value: '—',        status: 'Scheduled', action: 'Alarm at 05:30',         color: 'gray'  },
  { id: 'stress', icon: 'ti-brain',         label: 'Stress level',   value: 'Low',      status: 'Good',     action: 'No adjustments needed',  color: 'green' },
];

const HEALTH_MOODS = [
  { label: '😴 Tired',      key: 'tired' },
  { label: '⚡ Energized',  key: 'energized' },
  { label: '🎯 Focused',    key: 'focused' },
  { label: '😌 Calm',       key: 'calm' },
  { label: '😰 Stressed',   key: 'anxious' },
];

const AUTOMATION_RULES = [
  { trigger: 'Poor sleep detected',       effect: 'Lights 30% dimmer at wake-up, temp +2°', moodKey: 'tired' },
  { trigger: 'High stress (HR elevated)', effect: 'Temperature drops 2°, aroma on, dim lights', moodKey: 'anxious' },
  { trigger: 'Steps behind pace by 3pm',  effect: 'Walk reminder + upbeat playlist, lights bright', moodKey: 'energized' },
  { trigger: 'Workout complete',          effect: 'Recovery mode: dim lights, cool temp, low volume', moodKey: 'calm' },
  { trigger: 'Feeling focused',           effect: 'Optimal work lighting, low volume, cool temp', moodKey: 'focused' },
];

export default function Health() {
  const { user }    = useAuth();
  const { applyMood } = useHome(user?.uid);
  const [mood, setMood]           = useState('');
  const [applied, setApplied]     = useState(false);
  const [autoEnabled, setAutoEnabled] = useState(true);

  const handleMoodSelect = useCallback((moodItem) => {
    setMood(moodItem.label);
    setApplied(false);
    if (autoEnabled) {
      // Automatically adjust home based on how you're feeling
      applyMood(moodItem.key);
      setApplied(true);
    }
  }, [applyMood, autoEnabled]);

  const handleManualApply = (moodKey) => {
    applyMood(moodKey);
    setApplied(true);
  };

  return (
    <div className="page-wrap">
      <div className="page-header">
        <h1 className="page-title">Health</h1>
        <span className="badge badge-green"><i className="ti ti-activity" /> Wearable synced</span>
      </div>

      {/* Daily mood check — drives home automation */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-label">How are you feeling right now?</div>
        <p className="section-desc">Your mood automatically adjusts your home environment — lighting, temperature, volume, and aroma.</p>
        <div className="mood-pills">
          {HEALTH_MOODS.map((m) => (
            <button key={m.key} className={`mood-pill ${mood === m.label ? 'active' : ''}`}
              onClick={() => handleMoodSelect(m)}>{m.label}</button>
          ))}
        </div>
        {mood && (
          <div className="mood-result">
            <i className="ti ti-home" /> {applied
              ? <>Home adjusted for: <strong>{mood}</strong> — all rooms updated</>
              : <>Selected: <strong>{mood}</strong> — <button className="link-btn" onClick={() => handleManualApply(HEALTH_MOODS.find(m => m.label === mood)?.key)}>Apply to home</button></>
            }
          </div>
        )}
        <div className="auto-toggle-row">
          <span>Auto-adjust home on mood change</span>
          <button className={`toggle ${autoEnabled ? 'on' : ''}`}
            onClick={() => setAutoEnabled(!autoEnabled)} />
        </div>
      </div>

      {/* Health metrics */}
      <div className="health-grid">
        {METRICS.map((m) => (
          <div key={m.id} className="health-card card">
            <div className="health-icon"><i className={`ti ${m.icon}`} /></div>
            <div className="health-info">
              <div className="health-label">{m.label}</div>
              <div className="health-value">{m.value}</div>
              <div className="health-action">{m.action}</div>
            </div>
            <span className={`badge badge-${m.color === 'green' ? 'green' : m.color === 'amber' ? 'amber' : 'gray'}`}>
              {m.status}
            </span>
          </div>
        ))}
      </div>

      {/* Health → Home automation rules */}
      <div className="card health-logic">
        <div className="section-label">Health → Home automation rules</div>
        <p className="section-desc">When health data changes, MARS automatically adjusts your home to benefit you.</p>
        <div className="logic-list">
          {AUTOMATION_RULES.map((rule) => (
            <div key={rule.trigger} className="logic-row">
              <span className="logic-trigger">{rule.trigger}</span>
              <span className="logic-arrow">→</span>
              <span className="logic-result">{rule.effect}</span>
              <button className="logic-test-btn" onClick={() => handleManualApply(rule.moodKey)}
                title="Test this automation">
                <i className="ti ti-player-play" />
              </button>
            </div>
          ))}
        </div>
        <p className="logic-note">
          <i className="ti ti-wifi-off" /> All health automations run locally — no internet required.
          Your health data determines your house programming for optimal well-being.
        </p>
      </div>
    </div>
  );
}
