// src/pages/Dashboard.jsx
import { useAuth }     from '../hooks/useAuth';
import { useAlarms }   from '../hooks/useAlarms';
import { useRoutines } from '../hooks/useRoutines';
import { useHome }     from '../hooks/useHome';
import { useMars }     from '../hooks/useMars';
import { Link }        from 'react-router-dom';
import './Dashboard.css';

export default function Dashboard() {
  const { user }              = useAuth();
  const { alarms }            = useAlarms(user?.uid);
  const { routines }          = useRoutines(user?.uid);
  const { rooms, mood }       = useHome(user?.uid);
  const { isOnline, notifPermission, requestNotifications } = useMars();

  const nextAlarm = alarms.find((a) => a.enabled);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="dash-page">
      <div className="dash-greeting">
        <div>
          <h1>{greeting}, {user?.displayName?.split(' ')[0]}.</h1>
          <p>Your MARS system is {isOnline ? 'fully online' : 'running in offline mode'}.</p>
        </div>
        {notifPermission !== 'granted' && (
          <button className="notif-cta" onClick={requestNotifications}>
            <i className="ti ti-bell" /> Enable alarm notifications
          </button>
        )}
      </div>

      <div className="dash-grid">
        {/* Next Alarm */}
        <Link to="/alarms" className="dash-card card-accent">
          <div className="dc-header">
            <i className="ti ti-alarm" />
            <span>Next alarm</span>
          </div>
          {nextAlarm ? (
            <>
              <div className="dc-big">{nextAlarm.time}</div>
              <div className="dc-sub">{nextAlarm.label}</div>
              {nextAlarm.openUrl && (
                <div className="dc-link"><i className="ti ti-external-link" /> {nextAlarm.openUrl}</div>
              )}
            </>
          ) : (
            <div className="dc-sub">No alarms set</div>
          )}
        </Link>

        {/* Active Routine */}
        <Link to="/routines" className="dash-card">
          <div className="dc-header">
            <i className="ti ti-route" />
            <span>Routines</span>
          </div>
          <div className="dc-big">{routines.filter((r) => r.active).length}</div>
          <div className="dc-sub">active routine{routines.filter(r=>r.active).length !== 1 ? 's' : ''}</div>
        </Link>

        {/* Home */}
        <Link to="/home" className="dash-card">
          <div className="dc-header">
            <i className="ti ti-home" />
            <span>Home</span>
          </div>
          <div className="dc-big" style={{ textTransform: 'capitalize' }}>{mood}</div>
          <div className="dc-sub">{rooms.length} rooms connected</div>
          <div className="room-pills">
            {rooms.slice(0, 3).map((r) => (
              <span key={r.id} className="room-pill">
                <i className={`ti ${r.icon}`} /> {r.name.split(' ')[0]}
              </span>
            ))}
          </div>
        </Link>

        {/* System status */}
        <Link to="/platforms" className="dash-card">
          <div className="dc-header">
            <i className="ti ti-devices" />
            <span>Platforms</span>
          </div>
          <div className="status-list">
            <div className="status-row">
              <span><i className="ti ti-world" /> Web</span>
              <span className="badge badge-green">Live</span>
            </div>
            <div className="status-row">
              <span><i className="ti ti-device-mobile" /> Mobile PWA</span>
              <span className="badge badge-green">Ready</span>
            </div>
            <div className="status-row">
              <span><i className="ti ti-brand-google-play" /> Play Store</span>
              <span className="badge badge-amber">Pending</span>
            </div>
          </div>
        </Link>

        {/* Quick actions */}
        <div className="dash-card quick-actions">
          <div className="dc-header">
            <i className="ti ti-bolt" />
            <span>Quick actions</span>
          </div>
          <div className="qa-grid">
            <Link to="/alarms"   className="qa-btn"><i className="ti ti-alarm" />      New alarm</Link>
            <Link to="/routines" className="qa-btn"><i className="ti ti-route" />      New routine</Link>
            <Link to="/home"     className="qa-btn"><i className="ti ti-home" />       Home control</Link>
            <Link to="/voice"    className="qa-btn"><i className="ti ti-microphone" /> Voice</Link>
            <Link to="/health"   className="qa-btn"><i className="ti ti-heart-rate" />  Health</Link>
            <Link to="/ai"       className="qa-btn"><i className="ti ti-sparkles" />   AI</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
