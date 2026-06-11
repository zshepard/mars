// src/components/BottomNav.jsx
// Mobile-only bottom navigation bar
import { NavLink } from 'react-router-dom';
import './BottomNav.css';

function getMyDayIcon(alarms = [], routines = []) {
  const now = new Date();
  const h   = now.getHours();
  const m   = now.getMinutes();
  const hm  = h * 60 + m;

  const soonAlarm = alarms.some((a) => {
    if (!a.enabled || !a.fire_at) return false;
    const diff = (new Date(a.fire_at) - now) / 60000;
    return diff >= 0 && diff <= 15;
  });
  if (soonAlarm) return 'ti-alarm';

  const activeRoutine = routines.some((r) => {
    if (!r.enabled || !r.startTime) return false;
    const [rh, rm] = r.startTime.split(':').map(Number);
    return Math.abs(hm - (rh * 60 + rm)) <= 15;
  });
  if (activeRoutine) return 'ti-list-check';

  if (hm >= 5 * 60 && hm < 12 * 60) return 'ti-sun';
  if (hm >= 12 * 60 && hm < 17 * 60) return 'ti-sun-high';
  if (hm >= 17 * 60 && hm < 20 * 60) return 'ti-sunset';
  return 'ti-moon';
}

export default function BottomNav({ alarms = [], routines = [] }) {
  const myDayIcon = getMyDayIcon(alarms, routines);

  const PRIMARY_TABS = [
    { to: '/',         icon: myDayIcon,          label: 'My Day'   },
    { to: '/alarms',   icon: 'ti-alarm',          label: 'Alarms'   },
    { to: '/voice',    icon: 'ti-speakerphone',   label: 'Voice'    },
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
