// src/components/Topbar.jsx
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import './Topbar.css';

// ── Live digital clock ────────────────────────────────────────────
function useClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const h    = time.getHours();
  const m    = time.getMinutes().toString().padStart(2, '0');
  const s    = time.getSeconds().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12  = (h % 12 || 12).toString().padStart(2, '0');

  const days   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dateStr = `${days[time.getDay()]} ${months[time.getMonth()]} ${time.getDate()}`;

  return { h12, m, s, ampm, dateStr };
}

export default function Topbar({ onMenuToggle, hideBurger = false }) {
  const { user, logout }             = useAuth();
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

      {/* Brand */}
      <div className="topbar-brand">
        <svg width="22" height="22" viewBox="0 0 48 48" fill="none">
          <path d="M12 24 L24 12 L36 24 L24 36 Z" fill="none" stroke="#1D9E75" strokeWidth="2.5"/>
          <circle cx="24" cy="24" r="5" fill="#1D9E75"/>
        </svg>
        <span>MARS</span>
      </div>

      {/* Clock — centered */}
      <div className="topbar-center">
        <div className="topbar-clock">
          <span className="clock-time">
            {h12}:{m}<span className="clock-seconds">:{s}</span>
            <span className="clock-ampm">{ampm}</span>
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
