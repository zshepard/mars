// src/components/Onboarding.jsx
// Multi-step onboarding flow shown once to new users and guests.
// Steps: 1) Greeting name  2) Theme pack  3) First alarm  4) Scheduled link  5) First routine → My Day
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { BACKGROUND_PACKS, getPackById } from '../data/backgroundPacks';
import './Onboarding.css';

const STORAGE_KEY = 'mars-onboarding-complete';
const GUEST_ID    = 'guest';

function isOnboardingDone(uid) {
  if (!uid) return true;
  return localStorage.getItem(`${STORAGE_KEY}-${uid}`) === '1';
}

function markOnboardingDone(uid) {
  if (!uid) return;
  localStorage.setItem(`${STORAGE_KEY}-${uid}`, '1');
}

// Flatten all packs for the theme picker
const ALL_PACKS = BACKGROUND_PACKS.flatMap((s) => s.packs);

export default function Onboarding() {
  const { user, updateUsername } = useAuth();
  const navigate = useNavigate();

  const [visible, setVisible]   = useState(false);
  const [step, setStep]         = useState(1); // 1–5
  const [name, setName]         = useState('');
  const [nameError, setNameError] = useState('');
  const [selectedPack, setSelectedPack] = useState('default-dark');
  const [saving, setSaving]     = useState(false);

  // Decide whether to show onboarding
  useEffect(() => {
    if (!user) return;
    if (isOnboardingDone(user.uid)) return;
    // Small delay so the main app renders first
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, [user]);

  // Apply selected theme pack preview in real-time
  useEffect(() => {
    const pack = getPackById(selectedPack);
    if (!pack) return;
    const root = document.documentElement;
    if (pack.background) {
      root.style.setProperty('--app-bg-override', pack.background);
    } else {
      root.style.removeProperty('--app-bg-override');
    }
    if (pack.cssVars) {
      Object.entries(pack.cssVars).forEach(([k, v]) => root.style.setProperty(k, v));
    }
    localStorage.setItem('mars-background-pack', selectedPack);
    window.dispatchEvent(new CustomEvent('mars:background-pack-changed', { detail: selectedPack }));
  }, [selectedPack]);

  if (!visible) return null;

  // ── Step handlers ────────────────────────────────────────────────────────────

  async function handleNameNext() {
    const trimmed = name.trim();
    if (!trimmed) { setNameError('Please enter a name.'); return; }
    setNameError('');
    setSaving(true);
    try {
      if (user && !user.isGuest) {
        await updateUsername(trimmed);
      } else {
        // Guest — store in localStorage so Dashboard greeting picks it up
        localStorage.setItem('mars-guest-display-name', trimmed);
      }
    } catch (e) {
      console.error('[Onboarding] updateUsername error:', e);
    } finally {
      setSaving(false);
    }
    setStep(2);
  }

  function handleThemeNext() {
    setStep(3);
  }

  function handleCreateAlarm() {
    markOnboardingDone(user.uid);
    setVisible(false);
    navigate('/alarms?new=alarm');
  }

  function handleSkipAlarm() {
    setStep(4);
  }

  function handleCreateLink() {
    markOnboardingDone(user.uid);
    setVisible(false);
    navigate('/alarms?new=link');
  }

  function handleSkipLink() {
    setStep(5);
  }

  function handleCreateRoutine() {
    markOnboardingDone(user.uid);
    setVisible(false);
    navigate('/alarms?new=routine');
  }

  function handleSkipRoutine() {
    markOnboardingDone(user.uid);
    setVisible(false);
    navigate('/');
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="ob-backdrop">
      <div className="ob-card">

        {/* Progress dots */}
        <div className="ob-dots">
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className={`ob-dot ${step >= n ? 'ob-dot--active' : ''}`} />
          ))}
        </div>

        {/* ── Step 1: Name ── */}
        {step === 1 && (
          <div className="ob-step">
            <div className="ob-icon">👋</div>
            <h2 className="ob-title">Welcome to MARS</h2>
            <p className="ob-body">
              What name should MARS greet you by?
              <br />
              <span className="ob-hint">This will also appear on your My Day page.</span>
            </p>
            <input
              className={`ob-input ${nameError ? 'ob-input--error' : ''}`}
              type="text"
              placeholder="e.g. Mr. Shepard"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleNameNext()}
              autoFocus
              maxLength={40}
            />
            {nameError && <p className="ob-error">{nameError}</p>}
            <button className="ob-btn ob-btn--primary" onClick={handleNameNext} disabled={saving}>
              {saving ? 'Saving…' : 'Continue'}
            </button>
          </div>
        )}

        {/* ── Step 2: Theme Pack ── */}
        {step === 2 && (
          <div className="ob-step">
            <div className="ob-icon">🎨</div>
            <h2 className="ob-title">Choose Your Theme</h2>
            <p className="ob-body">Pick a theme pack for your My Day page.</p>
            <div className="ob-theme-grid">
              {ALL_PACKS.map((pack) => (
                <button
                  key={pack.id}
                  className={`ob-theme-swatch ${selectedPack === pack.id ? 'ob-theme-swatch--selected' : ''}`}
                  style={{ background: pack.preview }}
                  onClick={() => setSelectedPack(pack.id)}
                  title={pack.label}
                >
                  <span className="ob-theme-label">{pack.label}</span>
                </button>
              ))}
            </div>
            <button className="ob-btn ob-btn--primary" onClick={handleThemeNext}>
              Continue
            </button>
          </div>
        )}

        {/* ── Step 3: First Alarm ── */}
        {step === 3 && (
          <div className="ob-step">
            <div className="ob-icon">⏰</div>
            <h2 className="ob-title">Create Your First Alarm</h2>
            <p className="ob-body">
              Set an alarm to get started — you can always add more later.
            </p>
            <button className="ob-btn ob-btn--primary" onClick={handleCreateAlarm}>
              Create Alarm
            </button>
            <button className="ob-btn ob-btn--ghost" onClick={handleSkipAlarm}>
              Skip
            </button>
          </div>
        )}

        {/* ── Step 4: Scheduled Link ── */}
        {step === 4 && (
          <div className="ob-step">
            <div className="ob-icon">🔗</div>
            <h2 className="ob-title">Add a Scheduled Link</h2>
            <p className="ob-body">
              Schedule a URL to open automatically at a set time — great for daily briefings, workouts, or meetings.
            </p>
            <button className="ob-btn ob-btn--primary" onClick={handleCreateLink}>
              Add Scheduled Link
            </button>
            <button className="ob-btn ob-btn--ghost" onClick={handleSkipLink}>
              Skip
            </button>
          </div>
        )}

        {/* ── Step 5: First Routine ── */}
        {step === 5 && (
          <div className="ob-step">
            <div className="ob-icon">📋</div>
            <h2 className="ob-title">Set Up Your First Routine</h2>
            <p className="ob-body">
              Routines walk you through a sequence of steps at a scheduled time — perfect for morning or evening rituals.
            </p>
            <button className="ob-btn ob-btn--primary" onClick={handleCreateRoutine}>
              Create Routine
            </button>
            <button className="ob-btn ob-btn--ghost" onClick={handleSkipRoutine}>
              Go to My Day
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
