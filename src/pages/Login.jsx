// src/pages/Login.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, initGSI } from '../hooks/useAuth';
import './Login.css';

export default function Login() {
  const { user, loginWithGoogle, loginWithGSI, loginWithEmail, signUpWithEmail, continueAsGuest, sendMagicLink, completeMagicLinkSignIn } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();

  // 'main' | 'signup' | 'magic'
  const [screen, setScreen]           = useState('main');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [name, setName]               = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [magicEmail, setMagicEmail]   = useState('');
  const [magicSent, setMagicSent]     = useState(false);
  const [error, setError]             = useState('');
  const [signupError, setSignupError] = useState('');
  const [magicError, setMagicError]   = useState('');
  const [loading, setLoading]         = useState(false);

  // Refs for GSI rendered button containers
  const gsiMainRef   = useRef(null);
  const gsiSignupRef = useRef(null);

  // Redirect to dashboard (or the page they were trying to reach) if already signed in.
  // Guests ARE redirected — guest mode is allowed for testing.
  const from = location.state?.from?.pathname || '/';
  useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize GSI and render native Google buttons
  useEffect(() => {
    const handleGSICredential = async (response) => {
      setError('');
      setLoading(true);
      try {
        await loginWithGSI(response.credential);
        navigate(from, { replace: true });
      } catch (e) {
        console.error('[Login] GSI sign-in error:', e);
        setError('Google sign-in failed. Please try email/password.');
      } finally {
        setLoading(false);
      }
    };

    const renderGSIButtons = () => {
      if (!window.google?.accounts?.id) return;
      initGSI(handleGSICredential);
      const opts = {
        type: 'standard',
        theme: 'filled_black',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        logo_alignment: 'left',
        width: 320,
      };
      if (gsiMainRef.current) {
        window.google.accounts.id.renderButton(gsiMainRef.current, opts);
      }
      if (gsiSignupRef.current) {
        window.google.accounts.id.renderButton(gsiSignupRef.current, { ...opts, text: 'signup_with' });
      }
    };

    // GSI script loads asynchronously — try immediately, retry after delay
    renderGSIButtons();
    const t1 = setTimeout(renderGSIButtons, 800);
    const t2 = setTimeout(renderGSIButtons, 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle returning from a magic link email
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('emailLink') !== '1') return;
    const savedEmail = localStorage.getItem('mars-email-link-pending');
    if (!savedEmail) {
      setScreen('magic');
      setMagicError('Enter the email address you used to request the sign-in link.');
      return;
    }
    completeMagicLinkSignIn(savedEmail, window.location.href)
      .then(() => navigate(from, { replace: true }))
      .catch(() => {
        setScreen('magic');
        setMagicError('The sign-in link expired or is invalid. Request a new one.');
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Guest mode — allows testing the app without a Google/email account.
  // Guest data is stored locally only (localStorage) and not synced to Firestore.
  const handleGuest = () => {
    continueAsGuest();
    navigate(from, { replace: true });
  };

  // Google sign-in handler
  // • In Android WebView: routes to native bridge (expo-auth-session → Chrome Custom Tab)
  // • In desktop browser: uses signInWithPopup()
  const handleGoogleFallback = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate(from, { replace: true });
    } catch (e) {
      if (e.message !== 'Google sign-in cancelled') {
        setError('Google sign-in failed. Please try email/password.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      navigate(from, { replace: true });
    } catch (e) {
      if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
        setError('No account found. Tap "Create an Account" below.');
      } else if (e.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.');
      } else if (e.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setSignupError('');
    setLoading(true);
    try {
      await signUpWithEmail(signupEmail, signupPassword, name);
      navigate(from, { replace: true });
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        setSignupError('An account already exists for this email. Sign in instead.');
      } else if (e.code === 'auth/weak-password') {
        setSignupError('Password must be at least 6 characters.');
      } else if (e.code === 'auth/invalid-email') {
        setSignupError('Please enter a valid email address.');
      } else {
        setSignupError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e) => {
    e.preventDefault();
    setMagicError('');
    setLoading(true);
    try {
      await sendMagicLink(magicEmail);
      setMagicSent(true);
    } catch (e) {
      if (e.code === 'auth/invalid-email') {
        setMagicError('Please enter a valid email address.');
      } else {
        setMagicError('Could not send the link. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">
      <div className="login-bg">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      {/* ── MAIN SIGN-IN SCREEN ─────────────────────────────────── */}
      <div className={`login-card${screen !== 'main' ? ' login-card--hidden' : ''}`}>
        <div className="login-logo">
          <svg width="52" height="52" viewBox="0 0 64 64" fill="none">
            <rect width="64" height="64" rx="16" fill="#111"/>
            <path d="M16 32 L32 16 L48 32 L32 48 Z" fill="none" stroke="#1D9E75" strokeWidth="2.5"/>
            <circle cx="32" cy="32" r="6" fill="#1D9E75"/>
          </svg>
        </div>

        <h1 className="login-title"><span>M</span>ARS</h1>
        <p className="login-subtitle">My Automated Routine System</p>

        {/* Email + Password sign-in */}
        <form className="email-form" onSubmit={handleSignIn}>
          <input
            className="email-input"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(''); }}
            required
            autoComplete="email"
          />
          <input
            className="email-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            required
            autoComplete="current-password"
          />
          {error && <p className="email-error">{error}</p>}
          <button className="email-submit-btn" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="login-divider"><span>or</span></div>

        {/* GSI rendered Google button — used on desktop when GSI script loads */}
        <div className="gsi-btn-container" ref={gsiMainRef} />

        {/* Primary Google sign-in button — shown when GSI container is empty.
            On Android WebView: routes to native bridge (expo-auth-session).
            On desktop: uses signInWithPopup() via Firebase. */}
        <button
          className="google-btn google-btn--fallback"
          onClick={handleGoogleFallback}
          disabled={loading}
        >
          {loading ? (
            <span className="google-btn__spinner" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
          )}
          {loading ? 'Signing in…' : 'Sign in with Google'}
        </button>

        {/* Sign Up CTA */}
        <div className="login-divider"><span>new here?</span></div>

        <button
          className="signup-cta-btn"
          onClick={() => { setScreen('signup'); setError(''); }}
        >
          Create an Account
        </button>

        {/* Guest mode — for testing without an account */}
        <button className="guest-btn" onClick={handleGuest} disabled={loading}>
          Continue as Guest
        </button>
      </div>

      {/* ── MAGIC LINK SCREEN ── */}
      <div className={`login-card login-card--signup${screen === 'magic' ? ' login-card--visible' : ''}`}>
        <button className="back-btn" onClick={() => { setScreen('main'); setMagicError(''); setMagicSent(false); }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Back
        </button>

        <div className="login-logo">
          <svg width="44" height="44" viewBox="0 0 64 64" fill="none">
            <rect width="64" height="64" rx="16" fill="#111"/>
            <path d="M16 32 L32 16 L48 32 L32 48 Z" fill="none" stroke="#1D9E75" strokeWidth="2.5"/>
            <circle cx="32" cy="32" r="6" fill="#1D9E75"/>
          </svg>
        </div>

        {!magicSent ? (
          <>
            <h1 className="login-title" style={{fontSize:'1.5rem'}}>Sign in with Google</h1>
            <p className="login-subtitle" style={{marginBottom:'4px'}}>Enter your Google email address.</p>
            <p className="login-subtitle" style={{fontSize:'0.78rem', opacity:0.6}}>We'll send a one-tap sign-in link to your Gmail.</p>

            <form className="email-form" onSubmit={handleMagicLink} style={{marginTop:'20px'}}>
              <input
                className="email-input"
                type="email"
                placeholder="Your Google email address"
                value={magicEmail}
                onChange={e => { setMagicEmail(e.target.value); setMagicError(''); }}
                required
                autoComplete="email"
              />
              {magicError && <p className="email-error">{magicError}</p>}
              <button className="email-submit-btn" type="submit" disabled={loading}>
                {loading ? 'Sending…' : 'Send Sign-In Link'}
              </button>
            </form>
          </>
        ) : (
          <div className="magic-sent-screen">
            <div className="magic-sent-icon">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <h2 className="login-title" style={{fontSize:'1.4rem', marginBottom:'8px'}}>Check your Gmail</h2>
            <p className="login-subtitle">A sign-in link was sent to</p>
            <p className="magic-email-display">{magicEmail}</p>
            <p className="login-subtitle" style={{fontSize:'0.8rem', opacity:0.6, marginTop:'12px'}}>
              Tap the link in the email — it will open the MARS app and sign you in automatically.
            </p>
            <button className="guest-btn" style={{marginTop:'24px'}} onClick={() => setMagicSent(false)}>
              Resend link
            </button>
          </div>
        )}
      </div>

      {/* ── CREATE ACCOUNT SCREEN ───────────────────────────────── */}
      <div className={`login-card login-card--signup${screen === 'signup' ? ' login-card--visible' : ''}`}>
        <button className="back-btn" onClick={() => { setScreen('main'); setSignupError(''); }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Back
        </button>

        <div className="login-logo">
          <svg width="44" height="44" viewBox="0 0 64 64" fill="none">
            <rect width="64" height="64" rx="16" fill="#111"/>
            <path d="M16 32 L32 16 L48 32 L32 48 Z" fill="none" stroke="#1D9E75" strokeWidth="2.5"/>
            <circle cx="32" cy="32" r="6" fill="#1D9E75"/>
          </svg>
        </div>

        <h1 className="login-title" style={{fontSize:'1.6rem'}}>Create Account</h1>
        <p className="login-subtitle">Join MARS — it's free</p>

        <form className="email-form" onSubmit={handleSignUp}>
          <input
            className="email-input"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            autoComplete="name"
          />
          <input
            className="email-input"
            type="email"
            placeholder="Email address"
            value={signupEmail}
            onChange={e => { setSignupEmail(e.target.value); setSignupError(''); }}
            required
            autoComplete="email"
          />
          <input
            className="email-input"
            type="password"
            placeholder="Password (min 6 characters)"
            value={signupPassword}
            onChange={e => { setSignupPassword(e.target.value); setSignupError(''); }}
            required
            autoComplete="new-password"
          />
          {signupError && <p className="email-error">{signupError}</p>}
          <button className="email-submit-btn" type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        {/* GSI rendered Google button for sign-up */}
        <div className="login-divider"><span>or sign up with</span></div>
        <div className="gsi-btn-container" ref={gsiSignupRef} />
        <button className="google-btn google-btn--fallback" onClick={handleGoogleFallback}>
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </button>

        <p className="login-footer" style={{marginTop:'16px'}}>
          Already have an account?{' '}
          <button className="login-switch-btn" onClick={() => { setScreen('main'); setSignupError(''); }}>
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
