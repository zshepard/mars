// src/components/Sidebar.jsx
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const NAV = [
  { to: '/',          icon: 'ti-dashboard',     label: 'Dashboard'   },
  { to: '/alarms',    icon: 'ti-alarm',          label: 'Alarms & Links' },
  { to: '/home',      icon: 'ti-home',           label: 'Home'        },
  { to: '/health',    icon: 'ti-heart-rate',     label: 'Health'      },
  { to: '/voice',     icon: 'ti-microphone-2',   label: 'Voice'       },
  { to: '/ai',        icon: 'ti-sparkles',       label: 'AI'          },
  { to: '/platforms', icon: 'ti-devices',        label: 'Platforms'   },
  { to: '/settings',  icon: 'ti-settings',       label: 'Settings'    },
];

export default function Sidebar({ open }) {
  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <nav className="sidebar-nav">
        {NAV.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <i className={`ti ${icon}`} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
