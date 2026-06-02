// src/components/Topbar.jsx
import { useState } from 'react';
import { useAuth }  from '../hooks/useAuth';
import { useMars }  from '../hooks/useMars';
import './Topbar.css';

export default function Topbar({ onMenuToggle }) {
  const { user, logout }               = useAuth();
  const { isOnline, notifPermission, requestNotifications } = useMars();
  const [showUser, setShowUser]        = useState(false);

  return (
    <header className="topbar">
      <button className="menu-btn" onClick={onMenuToggle} aria-label="Toggle menu">
        <span /><span /><span />
      </button>

      <div className="topbar-brand">
        <svg width="26" height="26" viewBox="0 0 48 48" fill="none">
          <path d="M12 24 L24 12 L36 24 L24 36 Z" fill="none" stroke="#1D9E75" strokeWidth="2.5"/>
          <circle cx="24" cy="24" r="5" fill="#1D9E75"/>
        </svg>
        <span>MARS</span>
      </div>

      <div className="topbar-center">
        <div className={`sync-pill ${isOnline ? 'online' : 'offline'}`}>
          <span className="sync-dot" />
          {isOnline ? 'Online' : 'Offline mode'}
        </div>
      </div>

      <div className="topbar-right">
        {notifPermission !== 'granted' && (
          <button className="notif-btn" onClick={requestNotifications} title="Enable alarm notifications">
            <i className="ti ti-bell-off" />
          </button>
        )}

        <button className="avatar-btn" onClick={() => setShowUser(!showUser)}>
          {user?.photoURL
            ? <img src={user.photoURL} alt={user.displayName} className="avatar-img" />
            : <div className="avatar-placeholder"><i className="ti ti-user" /></div>
          }
        </button>

        {showUser && (
          <div className="user-dropdown">
            <div className="user-name">{user?.displayName}</div>
            <div className="user-email">{user?.email}</div>
            <hr />
            <button onClick={logout}>Sign out</button>
          </div>
        )}
      </div>
    </header>
  );
}
