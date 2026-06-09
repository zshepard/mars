// src/pages/Settings.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth }  from '../hooks/useAuth';
import { useMars }  from '../hooks/useMars';
import { getPackById } from '../data/backgroundPacks';
import './Settings.css';

export default function Settings() {
  const { user, logout }                                    = useAuth();
  const {
    notifPermission, requestNotifications,
    micPermission,   requestMicrophone,
    wakeLockSupported, wakeLockActive, requestWakeLock,
    storagePermission, requestPersistentStorage,
    isOnline,
  } = useMars();
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

  // Snooze duration — persisted to localStorage
  const [snoozeDuration, setSnoozeDuration] = useState(
    () => parseInt(localStorage.getItem('mars-snooze-duration') || '5', 10)
  );
  const handleSnoozeDuration = (val) => {
    const n = Math.max(1, Math.min(60, parseInt(val, 10) || 5));
    setSnoozeDuration(n);
    localStorage.setItem('mars-snooze-duration', String(n));
  };

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

      {/* Permissions */}
      <div className="settings-section">
        <div className="settings-section-title">App Permissions</div>

        {/* Notifications */}
        <div className="settings-row">
          <div>
            <div className="settings-val"><i className="ti ti-bell" style={{marginRight:6}} />Push Notifications</div>
            <div className="settings-sub">Required for alarm delivery when the app is closed</div>
          </div>
          {notifPermission === 'granted'
            ? <span className="badge badge-green"><i className="ti ti-check" /> Granted</span>
            : notifPermission === 'denied'
            ? <span className="badge badge-red"><i className="ti ti-ban" /> Blocked</span>
            : <button className="btn btn-primary btn-sm" onClick={requestNotifications}>Allow</button>
          }
        </div>

        {/* Microphone */}
        <div className="settings-row">
          <div>
            <div className="settings-val"><i className="ti ti-microphone" style={{marginRight:6}} />Microphone</div>
            <div className="settings-sub">Required for voice commands and "Hey Mars" wake word</div>
          </div>
          {micPermission === 'granted'
            ? <span className="badge badge-green"><i className="ti ti-check" /> Granted</span>
            : micPermission === 'denied'
            ? <span className="badge badge-red"><i className="ti ti-ban" /> Blocked</span>
            : micPermission === 'unsupported'
            ? <span className="badge">N/A</span>
            : <button className="btn btn-primary btn-sm" onClick={requestMicrophone}>Allow</button>
          }
        </div>

        {/* Wake Lock */}
        {wakeLockSupported && (
          <div className="settings-row">
            <div>
              <div className="settings-val"><i className="ti ti-sun" style={{marginRight:6}} />Keep Screen On</div>
              <div className="settings-sub">Prevents screen sleep while an alarm is firing</div>
            </div>
            {wakeLockActive
              ? <span className="badge badge-green"><i className="ti ti-check" /> Active</span>
              : <button className="btn btn-sm" onClick={requestWakeLock}>Enable</button>
            }
          </div>
        )}

        {/* Persistent Storage */}
        <div className="settings-row">
          <div>
            <div className="settings-val"><i className="ti ti-database" style={{marginRight:6}} />Persistent Storage</div>
            <div className="settings-sub">Prevents the browser from clearing alarm data when storage is low</div>
          </div>
          {storagePermission === 'granted'
            ? <span className="badge badge-green"><i className="ti ti-check" /> Granted</span>
            : storagePermission === 'denied'
            ? <span className="badge badge-red"><i className="ti ti-ban" /> Denied</span>
            : storagePermission === 'unsupported'
            ? <span className="badge">N/A</span>
            : <button className="btn btn-primary btn-sm" onClick={requestPersistentStorage}>Allow</button>
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

      {/* Alarm Behavior */}
      <div className="settings-section">
        <div className="settings-section-title">Alarm Behavior</div>
        <div className="settings-row">
          <div>
            <div className="settings-val">Snooze duration</div>
            <div className="settings-sub">How long to wait before re-firing a snoozed alarm</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="number"
              className="settings-input"
              style={{ width: 60, textAlign: 'center' }}
              value={snoozeDuration}
              min={1}
              max={60}
              onChange={(e) => handleSnoozeDuration(e.target.value)}
            />
            <span style={{ fontSize: 12, color: 'var(--text2)', whiteSpace: 'nowrap' }}>min</span>
          </div>
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

      {/* Features Coming Soon */}
      <div className="settings-section">
        <div className="settings-section-title">Features Coming Soon</div>
        <div className="settings-row settings-coming-soon-row">
          <div className="settings-row-left">
            <div className="coming-soon-icon"><i className="ti ti-home" /></div>
            <div>
              <div className="settings-val">Home Control</div>
              <div className="settings-sub">Smart home device integration & room management</div>
            </div>
          </div>
          <span className="badge badge-amber">Soon</span>
        </div>
        <div className="settings-row settings-coming-soon-row">
          <div className="settings-row-left">
            <div className="coming-soon-icon"><i className="ti ti-heart-rate" /></div>
            <div>
              <div className="settings-val">Health Tracking</div>
              <div className="settings-sub">Sleep, activity, and wellness monitoring</div>
            </div>
          </div>
          <span className="badge badge-amber">Soon</span>
        </div>
        <div className="settings-row settings-coming-soon-row">
          <div className="settings-row-left">
            <div className="coming-soon-icon"><i className="ti ti-sparkles" /></div>
            <div>
              <div className="settings-val">AI Assistant</div>
              <div className="settings-sub">On-device AI for routines, suggestions & automation</div>
            </div>
          </div>
          <span className="badge badge-amber">Soon</span>
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
