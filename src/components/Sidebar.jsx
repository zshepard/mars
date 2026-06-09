// src/components/Sidebar.jsx
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const NAV = [
  { to: '/',          icon: 'ti-dashboard',     label: 'Dashboard'      },
  { to: '/alarms',    icon: 'ti-alarm',          label: 'Alarms & Links' },
  { to: '/voice',     icon: 'ti-microphone-2',   label: 'Voice'          },
  { to: '/platforms', icon: 'ti-devices',        label: 'Platforms'      },
  { to: '/settings',  icon: 'ti-settings',       label: 'Settings'       },
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {/* Dim overlay — tap to close sidebar on mobile */}
      {open && (
        <div
          className="sidebar-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <nav className="sidebar-nav">
          {NAV.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={onClose}   /* close sidebar when a page is selected */
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
