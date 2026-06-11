// src/components/Sidebar.jsx
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

/**
 * Returns the My Day icon based on the current time and whether an alarm/routine
 * is active at this time of day.
 *   05:00–11:59  → ti-sun          (morning)
 *   12:00–16:59  → ti-sun-high     (afternoon)
 *   17:00–19:59  → ti-sunset       (evening)
 *   20:00–01:59  → ti-moon         (night)
 * If an alarm fires within the next 15 min → ti-alarm (override)
 * If a routine is active right now         → ti-list-check (override)
 */
function getMyDayIcon(alarms = [], routines = []) {
  const now = new Date();
  const h   = now.getHours();
  const m   = now.getMinutes();
  const hm  = h * 60 + m;

  // Alarm firing soon
  const soonAlarm = alarms.some((a) => {
    if (!a.enabled || !a.fire_at) return false;
    const diff = (new Date(a.fire_at) - now) / 60000;
    return diff >= 0 && diff <= 15;
  });
  if (soonAlarm) return 'ti-alarm';

  // Routine active now
  const activeRoutine = routines.some((r) => {
    if (!r.enabled || !r.startTime) return false;
    const [rh, rm] = r.startTime.split(':').map(Number);
    return Math.abs(hm - (rh * 60 + rm)) <= 15;
  });
  if (activeRoutine) return 'ti-list-check';

  // Time-of-day
  if (hm >= 5 * 60 && hm < 12 * 60) return 'ti-sun';
  if (hm >= 12 * 60 && hm < 17 * 60) return 'ti-sun-high';
  if (hm >= 17 * 60 && hm < 20 * 60) return 'ti-sunset';
  return 'ti-moon';
}

export default function Sidebar({ open, onClose, alarms = [], routines = [] }) {
  const myDayIcon = getMyDayIcon(alarms, routines);

  const NAV = [
    { to: '/',         icon: myDayIcon,          label: 'My Day'         },
    { to: '/alarms',   icon: 'ti-alarm',          label: 'Alarms & Links' },
    { to: '/voice',    icon: 'ti-speakerphone',   label: 'Voice'          },
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
