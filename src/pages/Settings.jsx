// src/pages/Settings.jsx
import { useState } from 'react';
import { useAuth }  from '../hooks/useAuth';
import { useMars }  from '../hooks/useMars';
import './Settings.css';

export default function Settings() {
  const { user, logout }                                    = useAuth();
  const { notifPermission, requestNotifications, isOnline } = useMars();
  const [voiceEnabled, setVoiceEnabled]                    = useState(true);
  const [voiceWakeWord, setVoiceWakeWord]                  = useState('Hey Mars');
  const [defaultDevice, setDefaultDevice]                  = useState('phone');
  // eslint-disable-next-line no-unused-vars
  const [theme, setTheme]                                  = useState('dark');

  return (
    <div className="page-wrap">
      <h1 className="page-title">Settings</h1>

      {/* Account */}
      <div className="settings-section card">
        <div className="settings-label">Account</div>
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
      <div className="settings-section card">
        <div className="settings-label">Notifications & Alarms</div>
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
      <div className="settings-section card">
        <div className="settings-label">Voice Commands</div>
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
      <div className="settings-section card">
        <div className="settings-label">URL & Device</div>
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

      {/* System status */}
      <div className="settings-section card">
        <div className="settings-label">System</div>
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
          <span className="settings-sub">v1.0.0</span>
        </div>
      </div>
    </div>
  );
}
