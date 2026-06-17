// src/components/BottomNav.jsx
// Mobile-only bottom navigation bar
import { NavLink } from 'react-router-dom';
import './BottomNav.css';
import { getMyDayIcon } from '../utils/timeUtils';

// getMyDayIcon imported from ../utils/timeUtils

export default function BottomNav({ alarms = [], routines = [] }) {
  const myDayIcon = getMyDayIcon(alarms, routines);

  const PRIMARY_TABS = [
    { to: '/',         icon: myDayIcon,          label: 'My Day'   },
    { to: '/alarms',   icon: 'ti-alarm',          label: 'Alarms'   },
    { to: '/health',   icon: 'ti-brain',           label: 'AI'       },
    { to: '/voice',    icon: 'ti-microphone',     label: 'Voice'    },
    { to: '/settings', icon: 'ti-settings',       label: 'Settings' },
  ];

  return (
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
    </nav>
  );
}
