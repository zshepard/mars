// src/pages/Settings.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth }         from '../hooks/useAuth';
import { useMars }         from '../hooks/useMars';
import { usePreferences }  from '../hooks/usePreferences';
import { getPackById }     from '../data/backgroundPacks';
import './Settings.css';

export default function Settings() {
  const { user, logout, updateUsername, setOrUpdatePassword, sendPasswordReset } = useAuth();
  const {
    notifPermission, requestNotifications,
    micPermission,   requestMicrophone,
    wakeLockSupported, wakeLockActive, requestWakeLock,
    storagePermission, requestPersistentStorage,
    isOnline,
  } = useMars();
  const navigate                                            = useNavigate();

  // ── Synced preferences (Firestore + localStorage mirror) ────────────────────
  const { prefs, updatePref } = usePreferences(user);

  // Derived convenience values
  const voiceEnabled   = prefs.heyMars;
  const use24hr        = prefs.clockFormat === '24';
  const snoozeDuration = prefs.snoozeDuration;
  const currentPack    = getPackById(prefs.backgroundPack || 'default-dark');

  const handleVoiceEnabled = (val) => updatePref('heyMars', val);
  const handleSnoozeDuration = (val) => {
    const n = Math.max(1, Math.min(60, parseInt(val, 10) || 5));
    updatePref('snoozeDuration', n);
  };
  const toggleClockFormat = () => updatePref('clockFormat', use24hr ? '12' : '24');

  const [voiceWakeWord, setVoiceWakeWord] = useState('Hey MARS');
  const [defaultDevice, setDefaultDevice] = useState('phone');
  // eslint-disable-next-line no-unused-vars
  const [theme, setTheme] = useState('dark');

  // ── Account editing state ──────────────────────────────────────────────────
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput]     = useState('');
  const [usernameStatus, setUsernameStatus]   = useState(null); // null | 'saving' | 'saved' | 'error'

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPw, setCurrentPw]               = useState('');
  const [newPw, setNewPw]                       = useState('');
  const [confirmPw, setConfirmPw]               = useState('');
  const [pwStatus, setPwStatus]                 = useState(null); // null | 'saving' | 'saved' | 'error' | string
  const [resetStatus, setResetStatus]           = useState(null);

  // Does the current user have a password linked?
  const hasPassword = user?.providerData?.some?.((p) => p.providerId === 'password') ?? false;

  const handleSaveUsername = async () => {
    const trimmed = usernameInput.trim();
    if (!trimmed) return;
    setUsernameStatus('saving');
    try {
      await updateUsername(trimmed);
      setUsernameStatus('saved');
      setEditingUsername(false);
      setTimeout(() => setUsernameStatus(null), 2500);
    } catch (e) {
      setUsernameStatus('error');
      console.error(e);
    }
  };

  const handleSavePassword = async () => {
    if (newPw.length < 6) { setPwStatus('Password must be at least 6 characters'); return; }
    if (newPw !== confirmPw) { setPwStatus('Passwords do not match'); return; }
    setPwStatus('saving');
    try {
      await setOrUpdatePassword(newPw, hasPassword ? currentPw : null);
      setPwStatus('saved');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setShowPasswordForm(false);
      setTimeout(() => setPwStatus(null), 2500);
    } catch (e) {
      if (e.message === 'current_password_required') {
        setPwStatus('Please enter your current password');
      } else if (e.code === 'auth/wrong-password') {
        setPwStatus('Current password is incorrect');
      } else if (e.code === 'auth/requires-recent-login') {
        setPwStatus('Session expired — please sign out and sign in again');
      } else {
        setPwStatus(e.message || 'An error occurred');
      }
    }
  };

  const handlePasswordReset = async () => {
    setResetStatus('sending');
    try {
      await sendPasswordReset();
      setResetStatus('sent');
      setTimeout(() => setResetStatus(null), 4000);
    } catch (e) {
      setResetStatus('error');
    }
  };

  return (
    <div className="settings-page page-enter">
      <h1 className="page-title">Settings</h1>

      {/* Account */}
      <div className="settings-section">
        <div className="settings-section-title">Account</div>

        {/* Profile row */}
        <div className="settings-row">
          <div className="settings-row-left">
            {user?.photoURL && <img src={user.photoURL} alt="" className="settings-avatar" />}
            <div>
              <div className="settings-val">{user?.displayName || 'No name set'}</div>
              <div className="settings-sub">{user?.email}</div>
            </div>
          </div>
          <button className="btn" onClick={logout}>Sign out</button>
        </div>

        {/* Edit username */}
        <div className="settings-row" style={{flexDirection:'column',alignItems:'stretch',gap:8}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div className="settings-val"><i className="ti ti-user" style={{marginRight:6}} />Username</div>
              <div className="settings-sub">Change your display name</div>
            </div>
            {!editingUsername && (
              <button className="btn btn-sm" onClick={() => { setUsernameInput(user?.displayName || ''); setEditingUsername(true); setUsernameStatus(null); }}>
                Edit
              </button>
            )}
          </div>
          {editingUsername && (
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <input
                className="settings-input"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveUsername(); if (e.key === 'Escape') setEditingUsername(false); }}
                placeholder="Display name"
                maxLength={40}
                autoFocus
              />
              <button className="btn btn-primary btn-sm" onClick={handleSaveUsername} disabled={usernameStatus === 'saving'}>
                {usernameStatus === 'saving' ? 'Saving…' : 'Save'}
              </button>
              <button className="btn btn-sm" onClick={() => setEditingUsername(false)}>Cancel</button>
            </div>
          )}
          {usernameStatus === 'saved' && <span className="badge badge-green"><i className="ti ti-check" /> Saved</span>}
          {usernameStatus === 'error'  && <span className="badge badge-red">Failed to save — try again</span>}
        </div>

        {/* Set / change password */}
        <div className="settings-row" style={{flexDirection:'column',alignItems:'stretch',gap:8}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div className="settings-val"><i className="ti ti-lock" style={{marginRight:6}} />{hasPassword ? 'Change Password' : 'Set Password'}</div>
              <div className="settings-sub">
                {hasPassword
                  ? 'Update your account password'
                  : 'Add a password to your Google account so you can also sign in with email'}
              </div>
            </div>
            {!showPasswordForm && (
              <button className="btn btn-sm" onClick={() => { setShowPasswordForm(true); setPwStatus(null); }}>
                {hasPassword ? 'Change' : 'Set'}
              </button>
            )}
          </div>
          {showPasswordForm && (
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {hasPassword && (
                <input
                  className="settings-input"
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  placeholder="Current password"
                />
              )}
              <input
                className="settings-input"
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="New password (min 6 characters)"
              />
              <input
                className="settings-input"
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Confirm new password"
              />
              {pwStatus && pwStatus !== 'saving' && pwStatus !== 'saved' && (
                <span className="badge badge-red">{pwStatus}</span>
              )}
              {pwStatus === 'saved' && <span className="badge badge-green"><i className="ti ti-check" /> Password updated</span>}
              <div style={{display:'flex',gap:8}}>
                <button className="btn btn-primary btn-sm" onClick={handleSavePassword} disabled={pwStatus === 'saving'}>
                  {pwStatus === 'saving' ? 'Saving…' : 'Save Password'}
                </button>
                <button className="btn btn-sm" onClick={() => { setShowPasswordForm(false); setCurrentPw(''); setNewPw(''); setConfirmPw(''); setPwStatus(null); }}>Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* Forgot / reset password */}
        <div className="settings-row">
          <div>
            <div className="settings-val"><i className="ti ti-mail" style={{marginRight:6}} />Reset Password by Email</div>
            <div className="settings-sub">Send a password reset link to {user?.email}</div>
          </div>
          <button
            className="btn btn-sm"
            onClick={handlePasswordReset}
            disabled={resetStatus === 'sending'}
          >
            {resetStatus === 'sending' ? 'Sending…' : 'Send Link'}
          </button>
        </div>
        {resetStatus === 'sent'  && <div className="settings-banner banner-green"><i className="ti ti-check" /> Reset link sent to {user?.email}</div>}
        {resetStatus === 'error' && <div className="settings-banner banner-red">Failed to send — try again</div>}

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
            onClick={() => handleVoiceEnabled(!voiceEnabled)} />
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

      {/* Platforms */}
      <div className="settings-section">
        <div className="settings-section-title">Platforms</div>
        <div className="settings-row">
          <div className="settings-row-left">
            <div className="coming-soon-icon"><i className="ti ti-world" /></div>
            <div>
              <div className="settings-val">Web</div>
              <div className="settings-sub">mars-lyart-alpha.vercel.app</div>
            </div>
          </div>
          <span className="badge badge-green">Live</span>
        </div>
        <div className="settings-row">
          <div className="settings-row-left">
            <div className="coming-soon-icon"><i className="ti ti-device-mobile" /></div>
            <div>
              <div className="settings-val">Mobile PWA</div>
              <div className="settings-sub">Install from browser — works offline</div>
            </div>
          </div>
          <span className="badge badge-green">Ready</span>
        </div>
        <div className="settings-row">
          <div className="settings-row-left">
            <div className="coming-soon-icon"><i className="ti ti-brand-google-play" /></div>
            <div>
              <div className="settings-val">Play Store</div>
              <div className="settings-sub">Android app — pending review</div>
            </div>
          </div>
          <span className="badge badge-amber">Pending</span>
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
