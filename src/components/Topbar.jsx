// src/components/Topbar.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './Topbar.css';

// ── Live digital clock ────────────────────────────────────────────
function useClock() {
  const [time, setTime] = useState(new Date());
  const [use24hr, setUse24hr] = useState(
    () => localStorage.getItem('mars-clock-24hr') === 'true'
  );

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Listen for the custom event fired by Settings when the user toggles format
  useEffect(() => {
    const handler = () => {
      setUse24hr(localStorage.getItem('mars-clock-24hr') === 'true');
    };
    window.addEventListener('mars:clock-format-changed', handler);
    return () => window.removeEventListener('mars:clock-format-changed', handler);
  }, []);

  const h    = time.getHours();
  const m    = time.getMinutes().toString().padStart(2, '0');
  const s    = time.getSeconds().toString().padStart(2, '0');

  const days   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dateStr = `${days[time.getDay()]} ${months[time.getMonth()]} ${time.getDate()}`;

  if (use24hr) {
    return {
      h12: h.toString().padStart(2, '0'),
      m, s,
      ampm: null,
      dateStr,
    };
  }

  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12  = (h % 12 || 12).toString().padStart(2, '0');
  return { h12, m, s, ampm, dateStr };
}

export default function Topbar({ onMenuToggle, hideBurger = false }) {
  const { user, logout }             = useAuth();
  const navigate                     = useNavigate();
  const [showUser, setShowUser]      = useState(false);
  const { h12, m, s, ampm, dateStr } = useClock();
  const dropdownRef                  = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowUser(false);
      }
    }
    if (showUser) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showUser]);

  return (
    <header className="topbar">
      {/* Hamburger — hidden on mobile where BottomNav handles navigation */}
      {!hideBurger && (
        <button className="menu-btn" onClick={onMenuToggle} aria-label="Toggle menu">
          <span /><span /><span />
        </button>
      )}

      {/* Brand — home button (YouTube-style) */}
      <button
        className="topbar-brand topbar-brand--btn"
        onClick={() => navigate('/')}
        aria-label="Go to Dashboard"
        title="Dashboard"
      >
        <img
          src="/mars-logo.webp"
          alt="MARS"
          className="topbar-logo-img"
        />
        <span>MARS</span>
      </button>

      {/* Clock — centered */}
      <div className="topbar-center">
        <div className="topbar-clock">
          <span className="clock-time">
            {h12}:{m}<span className="clock-seconds">:{s}</span>
            {ampm && <span className="clock-ampm">{ampm}</span>}
          </span>
          <span className="clock-date">{dateStr}</span>
        </div>
      </div>

      {/* Avatar / user menu */}
      <div className="topbar-right" ref={dropdownRef}>
        <button
          className="avatar-btn"
          onClick={() => setShowUser(v => !v)}
          aria-label="Account menu"
        >
          {user?.photoURL
            ? <img src={user.photoURL} alt={user.displayName || 'User'} className="avatar-img" />
            : <div className="avatar-placeholder"><i className="ti ti-user" /></div>
          }
        </button>

        {showUser && (
          <div className="user-dropdown">
            {user?.displayName && <div className="user-name">{user.displayName}</div>}
            {user?.email       && <div className="user-email">{user.email}</div>}
            <hr />
            <button onClick={() => { setShowUser(false); logout(); }}>
              <i className="ti ti-logout" /> Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
