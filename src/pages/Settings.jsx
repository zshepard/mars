// src/pages/Settings.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth }  from '../hooks/useAuth';
import { useMars }  from '../hooks/useMars';
import { getPackById } from '../data/backgroundPacks';
import './Settings.css';

export default function Settings() {
  const { user, logout }                                    = useAuth();
  const { notifPermission, requestNotifications, isOnline } = useMars();
  const navigate                                            = useNavigate();
  const [voiceEnabled, setVoiceEnabled]                    = useState(true);
  const [voiceWakeWord, setVoiceWakeWord]                  = useState('Hey Mars');
  const [defaultDevice, setDefaultDevice]                  = useState('phone');
  // eslint-disable-next-line no-unused-vars
  const [theme, setTheme]                                  = useState('dark');

  // 12/24hr clock format — persisted to localStorage
  const [use24hr, setUse24hr] = useState(
    () => localStorage.getItem('mars-clock-24hr') === 'true'
  );

  const toggleClockFormat = () => {
    const next = !use24hr;
    setUse24hr(next);
    localStorage.setItem('mars-clock-24hr', String(next));
    // Notify Topbar clock to re-read the setting immediately
    window.dispatchEvent(new CustomEvent('mars:clock-format-changed'));
  };

  const currentPack = getPackById(localStorage.getItem('mars-background-pack') || 'default-dark');

  return (
    <div className="settings-page page-enter">
      <h1 className="page-title">Settings</h1>

      {/* Account */}
      <div className="settings-section">
        <div className="settings-section-title">Account</div>
        <div className="settings-row">
          <div className="settings-row-left">
            {user?.photoURL && <img src={user.photoURL} alt="" className="settings-avatar" />}
            <div>
              <div className="settings-val">{user?.displayName}</div>
              <div className="settings-sub">{user?.email}</div>
            </div>
          </div>
          <button className="btn" onClick={logout}>Sign out</button>
        </div>
      </div>

      {/* Notifications */}
      <div className="settings-section">
        <div className="settings-section-title">Notifications & Alarms</div>
        <div className="settings-row">
          <div>
            <div className="settings-val">Push notifications</div>
            <div className="settings-sub">Required for alarm delivery when app is closed</div>
          </div>
          {notifPermission === 'granted'
            ? <span className="badge badge-green">Enabled</span>
            : <button className="btn btn-primary" onClick={requestNotifications}>Enable</button>
          }
        </div>
      </div>

      {/* Voice */}
      <div className="settings-section">
        <div className="settings-section-title">Voice Commands</div>
        <div className="settings-row">
          <div>
            <div className="settings-val">Voice recognition</div>
            <div className="settings-sub">Works offline using on-device speech API</div>
          </div>
          <button className={`toggle ${voiceEnabled ? 'on' : ''}`}
            onClick={() => setVoiceEnabled(!voiceEnabled)} />
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-val">Wake word</div>
            <div className="settings-sub">Phrase that activates MARS</div>
          </div>
          <input className="settings-input" value={voiceWakeWord}
            onChange={(e) => setVoiceWakeWord(e.target.value)} />
        </div>
      </div>

      {/* URL / Device */}
      <div className="settings-section">
        <div className="settings-section-title">URL & Device</div>
        <div className="settings-row">
          <div>
            <div className="settings-val">Default link open device</div>
            <div className="settings-sub">Where alarm URLs open by default</div>
          </div>
          <select className="settings-select" value={defaultDevice}
            onChange={(e) => setDefaultDevice(e.target.value)}>
            <option value="phone">Phone</option>
            <option value="computer">Computer</option>
            <option value="all">All devices</option>
          </select>
        </div>
      </div>

      {/* Appearance */}
      <div className="settings-section">
        <div className="settings-section-title">Appearance</div>

        {/* Clock format toggle */}
        <div className="settings-row">
          <div>
            <div className="settings-val">Clock format</div>
            <div className="settings-sub">{use24hr ? '24-hour (18:45)' : '12-hour (06:45 PM)'}</div>
          </div>
          <div className="clock-format-toggle">
            <button
              className={`clock-fmt-btn ${!use24hr ? 'active' : ''}`}
              onClick={() => { if (use24hr) toggleClockFormat(); }}
            >12h</button>
            <button
              className={`clock-fmt-btn ${use24hr ? 'active' : ''}`}
              onClick={() => { if (!use24hr) toggleClockFormat(); }}
            >24h</button>
          </div>
        </div>

        {/* Background pack */}
        <div className="settings-row settings-row--clickable" onClick={() => navigate('/backgrounds')}>
          <div>
            <div className="settings-val">Background Pack</div>
            <div className="settings-sub">{currentPack?.label || 'Default Dark'}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 40,
                height: 20,
                borderRadius: 4,
                background: currentPack?.preview || 'var(--bg2)',
                border: '1px solid var(--border)',
                flexShrink: 0,
              }}
            />
            <i className="ti ti-chevron-right" style={{ color: 'var(--text3)' }} />
          </div>
        </div>
      </div>

      {/* System status */}
      <div className="settings-section">
        <div className="settings-section-title">System</div>
        <div className="settings-row">
          <div className="settings-val">Connection</div>
          <span className={`badge ${isOnline ? 'badge-green' : 'badge-amber'}`}>
            {isOnline ? 'Online' : 'Offline mode'}
          </span>
        </div>
        <div className="settings-row">
          <div className="settings-val">Firebase project</div>
          <span className="settings-sub">mars-d3745</span>
        </div>
        <div className="settings-row">
          <div className="settings-val">App version</div>
          <span className="settings-sub">v1.3.3</span>
        </div>
      </div>
    </div>
  );
}
