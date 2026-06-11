// src/pages/Settings.jsx
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth }         from '../hooks/useAuth';
import { useMars }         from '../hooks/useMars';
import { usePreferences }  from '../hooks/usePreferences';
import { getPackById }     from '../data/backgroundPacks';
import './Settings.css';

// ── Collapsible section wrapper ───────────────────────────────────────────────
function SettingsSection({ icon, title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`settings-section settings-section--collapsible ${open ? 'is-open' : ''}`}>
      <button className="settings-section-btn" onClick={() => setOpen(o => !o)}>
        <span className="ssb-icon"><i className={`ti ${icon}`} /></span>
        <span className="ssb-title">{title}</span>
        <i className={`ti ti-chevron-${open ? 'up' : 'down'} ssb-chevron`} />
      </button>
      {open && <div className="settings-section-body">{children}</div>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Settings() {
  const { user, logout, updateUsername, setOrUpdatePassword, sendPasswordReset } = useAuth();
  const {
    notifPermission, requestNotifications,
    micPermission,   requestMicrophone,
    wakeLockSupported, wakeLockActive, requestWakeLock,
    storagePermission, requestPersistentStorage,
    isOnline,
  } = useMars();
  const navigate = useNavigate();

  const { prefs, updatePref } = usePreferences(user);
  const voiceEnabled    = prefs.heyMars;
  const use24hr         = prefs.clockFormat === '24';
  const snoozeDuration  = prefs.snoozeDuration;
  const wakePhrase      = prefs.wakePhrase      ?? 'hey mars';
  const wakeConfirmTone = prefs.wakeConfirmTone ?? true;
  const currentPack     = getPackById(prefs.backgroundPack || 'default-dark');

  const handleVoiceEnabled    = (val) => updatePref('heyMars', val);
  const handleWakeConfirmTone = (val) => updatePref('wakeConfirmTone', val);
  const handleSnoozeDuration  = (val) => {
    const n = Math.max(1, Math.min(60, parseInt(val, 10) || 5));
    updatePref('snoozeDuration', n);
  };
  const toggleClockFormat = () => updatePref('clockFormat', use24hr ? '12' : '24');

  // Wake phrase editing — debounced so we don't spam Firestore on every keystroke
  const [wakePhraseInput, setWakePhraseInput] = useState('');
  const [wakePhraseEditing, setWakePhraseEditing] = useState(false);
  const wakePhraseDebounce = useRef(null);
  const handleWakePhraseChange = (val) => {
    setWakePhraseInput(val);
    if (wakePhraseDebounce.current) clearTimeout(wakePhraseDebounce.current);
    wakePhraseDebounce.current = setTimeout(() => {
      const canonical = val.toLowerCase().trim();
      if (canonical) updatePref('wakePhrase', canonical);
    }, 800);
  };
  const handleWakePhraseBlur = () => {
    setWakePhraseEditing(false);
    const canonical = wakePhraseInput.toLowerCase().trim();
    if (canonical && canonical !== wakePhrase) updatePref('wakePhrase', canonical);
  };

  const [defaultDevice, setDefaultDevice] = useState('phone');

  // Account editing
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput,   setUsernameInput]   = useState('');
  const [usernameStatus,  setUsernameStatus]  = useState(null);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw,     setNewPw]     = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwStatus,  setPwStatus]  = useState(null);
  const [resetStatus, setResetStatus] = useState(null);

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
        setPwStatus('Incorrect current password');
      } else {
        setPwStatus(`Error: ${e.message}`);
      }
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setResetStatus('sending');
    try {
      await sendPasswordReset(user.email);
      setResetStatus('sent');
      setTimeout(() => setResetStatus(null), 5000);
    } catch (e) {
      setResetStatus('error');
      console.error(e);
    }
  };

  return (
    <div className="settings-page page-enter">
      <h1 className="page-title">Settings</h1>

      {/* ── Account Details ─────────────────────────────────────── */}
      <SettingsSection icon="ti-user-circle" title="Account Details" defaultOpen={true}>

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

        {/* Display name */}
        <div className="settings-row" style={{flexDirection:'column',alignItems:'stretch',gap:8}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div className="settings-val"><i className="ti ti-user" style={{marginRight:6}} />Display Name</div>
              <div className="settings-sub">How MARS greets you on My Day</div>
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

        {/* Password */}
        <div className="settings-row" style={{flexDirection:'column',alignItems:'stretch',gap:8}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div className="settings-val"><i className="ti ti-lock" style={{marginRight:6}} />{hasPassword ? 'Change Password' : 'Set Password'}</div>
              <div className="settings-sub">
                {hasPassword ? 'Update your account password' : 'Add a password so you can also sign in with email'}
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
                <input className="settings-input" type="password" value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)} placeholder="Current password" />
              )}
              <input className="settings-input" type="password" value={newPw}
                onChange={(e) => setNewPw(e.target.value)} placeholder="New password (min 6 characters)" />
              <input className="settings-input" type="password" value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)} placeholder="Confirm new password" />
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

        {/* Reset password */}
        <div className="settings-row">
          <div>
            <div className="settings-val"><i className="ti ti-mail" style={{marginRight:6}} />Reset Password by Email</div>
            <div className="settings-sub">Send a reset link to {user?.email}</div>
          </div>
          <button className="btn btn-sm" onClick={handlePasswordReset} disabled={resetStatus === 'sending'}>
            {resetStatus === 'sending' ? 'Sending…' : 'Send Link'}
          </button>
        </div>
        {resetStatus === 'sent'  && <div className="settings-banner banner-green"><i className="ti ti-check" /> Reset link sent to {user?.email}</div>}
        {resetStatus === 'error' && <div className="settings-banner banner-red">Failed to send — try again</div>}
      </SettingsSection>

      {/* ── Customization ───────────────────────────────────────── */}
      <SettingsSection icon="ti-palette" title="Customization">

        <div className="settings-row">
          <div>
            <div className="settings-val"><i className="ti ti-clock" style={{marginRight:6}} />Clock Format</div>
            <div className="settings-sub">{use24hr ? '24-hour (18:45)' : '12-hour (06:45 PM)'}</div>
          </div>
          <div className="clock-format-toggle">
            <button className={`clock-fmt-btn ${!use24hr ? 'active' : ''}`}
              onClick={() => { if (use24hr) toggleClockFormat(); }}>12h</button>
            <button className={`clock-fmt-btn ${use24hr ? 'active' : ''}`}
              onClick={() => { if (!use24hr) toggleClockFormat(); }}>24h</button>
          </div>
        </div>

        <div className="settings-row settings-row--clickable" onClick={() => navigate('/backgrounds')}>
          <div>
            <div className="settings-val"><i className="ti ti-palette" style={{marginRight:6}} />Background Pack</div>
            <div className="settings-sub">{currentPack?.label || 'Default Dark'}</div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:40,height:20,borderRadius:4,background:currentPack?.preview||'var(--bg2)',border:'1px solid var(--border)',flexShrink:0}} />
            <i className="ti ti-chevron-right" style={{color:'var(--text3)'}} />
          </div>
        </div>

        <div className="settings-row">
          <div>
            <div className="settings-val"><i className="ti ti-alarm" style={{marginRight:6}} />Snooze Duration</div>
            <div className="settings-sub">How long to wait before re-firing a snoozed alarm</div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <input type="number" className="settings-input" style={{width:60,textAlign:'center'}}
              value={snoozeDuration} min={1} max={60}
              onChange={(e) => handleSnoozeDuration(e.target.value)} />
            <span style={{fontSize:12,color:'var(--text2)',whiteSpace:'nowrap'}}>min</span>
          </div>
        </div>

        <div className="settings-row">
          <div>
            <div className="settings-val"><i className="ti ti-link" style={{marginRight:6}} />Default Link Device</div>
            <div className="settings-sub">Where alarm URLs open by default</div>
          </div>
          <select className="settings-select" value={defaultDevice}
            onChange={(e) => setDefaultDevice(e.target.value)}>
            <option value="phone">Phone</option>
            <option value="computer">Computer</option>
            <option value="all">All devices</option>
          </select>
        </div>
      </SettingsSection>

      {/* ── Voice Commands ─────────────────────────────────────────────── */}
      <SettingsSection icon="ti-microphone" title="Voice Commands">

        {/* Hey MARS on/off — gated on mic permission */}
        <div className="settings-row">
          <div>
            <div className="settings-val"><i className="ti ti-ear" style={{marginRight:6}} />Hey MARS Wake Word</div>
            <div className="settings-sub">
              {micPermission === 'denied'
                ? <span style={{color:'var(--red)'}}>Microphone blocked — grant access in App Permissions below</span>
                : 'Say your wake phrase hands-free to activate MARS'}
            </div>
          </div>
          <button
            className={`toggle ${voiceEnabled ? 'on' : ''}`}
            onClick={() => {
              if (micPermission === 'denied') return;
              handleVoiceEnabled(!voiceEnabled);
            }}
            disabled={micPermission === 'denied'}
            title={micPermission === 'denied' ? 'Microphone access required' : undefined}
          />
        </div>

        {/* Wake phrase — now persisted via usePreferences */}
        <div className="settings-row">
          <div>
            <div className="settings-val">Wake Phrase</div>
            <div className="settings-sub">Phrase that activates MARS (e.g. “Hey MARS”)</div>
          </div>
          <input
            className="settings-input"
            value={wakePhraseEditing ? wakePhraseInput : wakePhrase}
            onFocus={() => { setWakePhraseEditing(true); setWakePhraseInput(wakePhrase); }}
            onChange={(e) => handleWakePhraseChange(e.target.value)}
            onBlur={handleWakePhraseBlur}
            placeholder="hey mars"
            style={{ textTransform: 'lowercase' }}
          />
        </div>

        {/* Confirmation tone */}
        <div className="settings-row">
          <div>
            <div className="settings-val"><i className="ti ti-bell-ringing" style={{marginRight:6}} />Confirmation Tone</div>
            <div className="settings-sub">Play a chime when wake phrase is detected</div>
          </div>
          <button className={`toggle ${wakeConfirmTone ? 'on' : ''}`}
            onClick={() => handleWakeConfirmTone(!wakeConfirmTone)} />
        </div>

        {/* Voice page shortcut */}
        <div className="settings-row" style={{cursor:'pointer'}} onClick={() => navigate('/voice')}>
          <div>
            <div className="settings-val"><i className="ti ti-terminal" style={{marginRight:6}} />Voice Commands</div>
            <div className="settings-sub">View all commands and command history</div>
          </div>
          <i className="ti ti-chevron-right" style={{color:'var(--text3)'}} />
        </div>

      </SettingsSection>

      {/* ── App Permissions ─────────────────────────────────────── */}
      <SettingsSection icon="ti-shield-check" title="App Permissions">

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
      </SettingsSection>

      {/* ── Features Coming Soon ─────────────────────────────────── */}
      <SettingsSection icon="ti-sparkles" title="Features Coming Soon">

        {[
          { icon: 'ti-home',       label: 'Home Control',      desc: 'Smart home device integration & room management' },
          { icon: 'ti-heart-rate', label: 'Health Tracking',   desc: 'Sleep, activity, and wellness monitoring' },
          { icon: 'ti-robot',      label: 'AI Assistant',      desc: 'On-device AI for routines, suggestions & automation' },
          { icon: 'ti-devices',    label: 'Multi-Device Sync', desc: 'Alarms and routines synced across all your devices' },
        ].map((f) => (
          <div key={f.label} className="settings-row settings-coming-soon-row">
            <div className="settings-row-left">
              <div className="coming-soon-icon"><i className={`ti ${f.icon}`} /></div>
              <div>
                <div className="settings-val">{f.label}</div>
                <div className="settings-sub">{f.desc}</div>
              </div>
            </div>
            <span className="badge badge-amber">Soon</span>
          </div>
        ))}
      </SettingsSection>

      {/* ── Platforms ───────────────────────────────────────────── */}
      <SettingsSection icon="ti-world" title="Platforms">

        {[
          { icon: 'ti-world',             label: 'Web',         desc: 'mars-lyart-alpha.vercel.app',    badge: 'badge-green',  text: 'Live'    },
          { icon: 'ti-device-mobile',     label: 'Mobile PWA',  desc: 'Install from browser — works offline', badge: 'badge-green', text: 'Ready' },
          { icon: 'ti-brand-google-play', label: 'Play Store',  desc: 'Android app — pending review',   badge: 'badge-amber',  text: 'Pending' },
        ].map((p) => (
          <div key={p.label} className="settings-row">
            <div className="settings-row-left">
              <div className="coming-soon-icon"><i className={`ti ${p.icon}`} /></div>
              <div>
                <div className="settings-val">{p.label}</div>
                <div className="settings-sub">{p.desc}</div>
              </div>
            </div>
            <span className={`badge ${p.badge}`}>{p.text}</span>
          </div>
        ))}
      </SettingsSection>

      {/* ── System ──────────────────────────────────────────────── */}
      <SettingsSection icon="ti-settings" title="System">
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
          <span className="settings-sub">v1.5.0</span>
        </div>
      </SettingsSection>
    </div>
  );
}
