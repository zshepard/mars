// src/pages/Login.jsx
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './Login.css';

export default function Login() {
  const { loginWithGoogle, continueAsGuest } = useAuth();
  const navigate = useNavigate();

  const handleGuest = () => {
    continueAsGuest();
    navigate('/');
  };

  const handleGoogle = async () => {
    await loginWithGoogle();
    navigate('/');
  };

  return (
    <div className="login-root">
      <div className="login-bg">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <div className="login-card">
        <div className="login-logo">
          <svg width="52" height="52" viewBox="0 0 64 64" fill="none">
            <rect width="64" height="64" rx="16" fill="#111"/>
            <path d="M16 32 L32 16 L48 32 L32 48 Z" fill="none" stroke="#1D9E75" strokeWidth="2.5"/>
            <circle cx="32" cy="32" r="6" fill="#1D9E75"/>
          </svg>
        </div>

        <h1 className="login-title"><span>M</span>ARS</h1>
        <p className="login-subtitle">My Automated Routine System</p>
        <p className="login-desc">
          Alarms. Routines. Home control.<br/>
          Health. Voice. AI. All in one.
        </p>

        <button className="guest-btn" onClick={handleGuest}>
          <i className="ti ti-rocket" />
          Continue without login
        </button>

        <div className="login-divider">
          <span>or sync across devices</span>
        </div>

        <button className="google-btn" onClick={handleGoogle}>
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Sign in with Google
        </button>

        <p className="login-footer">
          Works offline · No account required · Sign in later to sync
        </p>
      </div>
    </div>
  );
}
