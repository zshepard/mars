// src/components/Sidebar.jsx
import { NavLink } from 'react-router-dom';
import './Sidebar.css';
import { getMyDayIcon } from '../utils/timeUtils';

// getMyDayIcon imported from ../utils/timeUtils

export default function Sidebar({ open, onClose, alarms = [], routines = [] }) {
  const myDayIcon = getMyDayIcon(alarms, routines);

  const NAV = [
    { to: '/',         icon: myDayIcon,          label: 'My Day'         },
    { to: '/alarms',   icon: 'ti-alarm',          label: 'Alarms & Links' },
    { to: '/voice',    icon: 'ti-microphone',     label: 'Voice'          },
    { to: '/settings', icon: 'ti-settings',       label: 'Settings'       },
  ];

  return (
    <>
      {open && (
        <div className="sidebar-overlay" onClick={onClose} aria-hidden="true" />
      )}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <nav className="sidebar-nav">
          {NAV.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <i className={`ti ${icon}`} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
