// src/components/BottomNav.jsx
// Mobile-only bottom navigation bar — replaces the sidebar on small screens
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import './BottomNav.css';

const PRIMARY_TABS = [
  { to: '/',          icon: 'ti-dashboard',   label: 'Dashboard' },
  { to: '/alarms',    icon: 'ti-alarm',        label: 'Alarms'    },
  { to: '/voice',     icon: 'ti-microphone-2', label: 'Voice'     },
  { to: '/platforms', icon: 'ti-devices',      label: 'Platforms' },
];

const MORE_ITEMS = [
  { to: '/settings',  icon: 'ti-settings',      label: 'Settings'  },
];

export default function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const navigate = useNavigate();

  function handleMoreItem(to) {
    setMoreOpen(false);
    navigate(to);
  }

  return (
    <>
      {/* More drawer — slides up from bottom */}
      {moreOpen && (
        <>
          <div className="bottom-more-overlay" onClick={() => setMoreOpen(false)} />
          <div className="bottom-more-drawer">
            <div className="bottom-more-handle" />
            <div className="bottom-more-grid">
              {MORE_ITEMS.map(({ to, icon, label }) => (
                <button
                  key={to}
                  className="bottom-more-item"
                  onClick={() => handleMoreItem(to)}
                >
                  <i className={`ti ${icon}`} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Bottom bar */}
      <nav className="bottom-nav">
        {PRIMARY_TABS.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `bottom-tab ${isActive ? 'active' : ''}`}
          >
            <i className={`ti ${icon}`} />
            <span>{label}</span>
          </NavLink>
        ))}

        {/* More button */}
        <button
          className={`bottom-tab ${moreOpen ? 'active' : ''}`}
          onClick={() => setMoreOpen(v => !v)}
        >
          <i className="ti ti-dots" />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}
