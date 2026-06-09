// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { useAuth }     from '../hooks/useAuth';
import { useAlarms }   from '../hooks/useAlarms';
import { useRoutines } from '../hooks/useRoutines';
import { useMars }     from '../hooks/useMars';
import { Link }        from 'react-router-dom';
import './Dashboard.css';

// ── Countdown helper ──────────────────────────────────────────────
function timeUntil(timeStr, days = []) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const now = new Date();
  for (let offset = 0; offset <= 7; offset++) {
    const c = new Date(now);
    c.setDate(now.getDate() + offset);
    c.setHours(h, m, 0, 0);
    if (c <= now) continue;
    if (!days || days.length === 0) {
      const diff = c - now;
      return formatDiff(diff);
    }
    if (days.includes(DAY_NAMES[c.getDay()])) {
      const diff = c - now;
      return formatDiff(diff);
    }
  }
  return null;
}

function formatDiff(ms) {
  const totalMin = Math.floor(ms / 60000);
  const hrs = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (hrs > 0) return `in ${hrs}h ${min}m`;
  if (min > 0) return `in ${min}m`;
  return 'now';
}

export default function Dashboard() {
  const { user }    = useAuth();
  const { alarms }  = useAlarms(user?.uid);
  const { routines } = useRoutines(user?.uid);
  const { isOnline, notifPermission, requestNotifications } = useMars();

  // ── Missed alarm banner (fired by Bug #4 fix in useAlarms) ───────
  const [missedAlarms, setMissedAlarms] = useState([]);
  useEffect(() => {
    const handler = (e) => setMissedAlarms(e.detail || []);
    window.addEventListener('mars:missed-alarms', handler);
    return () => window.removeEventListener('mars:missed-alarms', handler);
  }, []);

  const nextAlarm = alarms.find((a) => a.enabled !== false);
  const activeRoutines = routines.filter((r) => r.active);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const userName = user?.displayName?.split(' ')[0] || 'Guest';

  return (
    <div className="dash-page">
      {/* Missed alarm banner */}
      {missedAlarms.length > 0 && (
        <div className="missed-alarm-banner">
          <i className="ti ti-alarm-off" />
          <span>
            {missedAlarms.length === 1
              ? `Missed alarm: ${missedAlarms[0].label || missedAlarms[0].time}`
              : `${missedAlarms.length} alarms missed while device was off`}
          </span>
          <button className="missed-dismiss" onClick={() => setMissedAlarms([])}>
            <i className="ti ti-x" />
          </button>
        </div>
      )}

      <div className="dash-greeting">
        <div>
          <h1>{greeting}, {userName}.</h1>
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
            <span>Next Alarm</span>
          </div>
          {nextAlarm ? (
            <>
              <div className="dc-big">{nextAlarm.time}</div>
              <div className="dc-sub">{nextAlarm.label || 'Alarm'}</div>
              <div className="dc-countdown">{timeUntil(nextAlarm.time, nextAlarm.days)}</div>
              {nextAlarm.openUrl && (
                <div className="dc-link"><i className="ti ti-external-link" /> {nextAlarm.openUrl}</div>
              )}
            </>
          ) : (
            <div className="dc-sub">No alarms set</div>
          )}
        </Link>

        {/* Active Routines */}
        <Link to="/routines" className="dash-card">
          <div className="dc-header">
            <i className="ti ti-route" />
            <span>Routines</span>
          </div>
          <div className="dc-big">{activeRoutines.length}</div>
          <div className="dc-sub">active routine{activeRoutines.length !== 1 ? 's' : ''}</div>
          {activeRoutines.length > 0 && (
            <div className="dc-sub" style={{ marginTop: 4, fontSize: '0.78rem', opacity: 0.7 }}>
              {activeRoutines.slice(0, 2).map(r => r.name).join(', ')}
              {activeRoutines.length > 2 ? ` +${activeRoutines.length - 2} more` : ''}
            </div>
          )}
        </Link>


        {/* All alarms summary */}
        <Link to="/alarms" className="dash-card">
          <div className="dc-header">
            <i className="ti ti-list" />
            <span>Alarms</span>
          </div>
          <div className="dc-big">{alarms.filter(a => a.enabled !== false).length}</div>
          <div className="dc-sub">
            of {alarms.length} alarm{alarms.length !== 1 ? 's' : ''} active
          </div>
          {alarms.length > 0 && (
            <div className="alarm-pills">
              {alarms.filter(a => a.enabled !== false).slice(0, 3).map(a => (
                <span key={a.id} className="alarm-pill">{a.time}</span>
              ))}
            </div>
          )}
        </Link>

        {/* Quick actions */}
        <div className="dash-card quick-actions">
          <div className="dc-header">
            <i className="ti ti-bolt" />
            <span>Quick Actions</span>
          </div>
          <div className="qa-grid">
            <Link to="/alarms"    className="qa-btn"><i className="ti ti-alarm" />      New Alarm</Link>
            <Link to="/routines"  className="qa-btn"><i className="ti ti-route" />      New Routine</Link>
            <Link to="/alarms"    className="qa-btn"><i className="ti ti-link" />       Add Link</Link>
            <Link to="/voice"     className="qa-btn"><i className="ti ti-microphone" /> Voice</Link>
            <Link to="/settings"  className="qa-btn"><i className="ti ti-settings" />   Settings</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
