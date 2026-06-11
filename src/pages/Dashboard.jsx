// src/pages/Dashboard.jsx  (My Day)
// Presents upcoming alarms, scheduled links, and routines in Settings-style rows.
import { useState, useEffect } from 'react';
import { useAuth }           from '../hooks/useAuth';
import { useAlarms }         from '../hooks/useAlarms';
import { useRoutines }       from '../hooks/useRoutines';
import { useScheduledLinks } from '../hooks/useScheduledLinks';
import { useMars }           from '../hooks/useMars';
import { Link, useNavigate } from 'react-router-dom';
// Firestore imports reserved for future manual-sync feature
import './Dashboard.css';
import { nextFireDate, formatCountdown } from '../utils/timeUtils';

// nextFireDate and formatCountdown (as formatDiff) imported from ../utils/timeUtils
// Local alias so existing buildTimeline calls remain unchanged
const formatDiff = formatCountdown;

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 2  && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 20) return 'Good evening';
  return 'Good night';
}

// ── Build sorted timeline ─────────────────────────────────────────────────────
function buildTimeline(alarms, routines, links) {
  const now = new Date();
  const items = [];

  alarms.filter(a => a.enabled !== false).forEach((a) => {
    const fireDate = nextFireDate(a.time, a.days);
    if (!fireDate) return;
    items.push({
      type: 'alarm', id: a.id, time: a.time,
      label: a.label || 'Alarm', url: a.openUrl || null,
      fireDate, countdown: formatDiff(fireDate - now), days: a.days || [],
    });
  });

  routines.filter(r => r.active || r.enabled !== false).forEach((r) => {
    const fireDate = nextFireDate(r.startTime || r.time, r.days);
    if (!fireDate) return;
    items.push({
      type: 'routine', id: r.id, time: r.startTime || r.time,
      label: r.name || 'Routine', stepCount: (r.steps || []).length,
      fireDate, countdown: formatDiff(fireDate - now), days: r.days || [],
    });
  });

  links.filter(l => l.enabled !== false).forEach((l) => {
    const fireDate = nextFireDate(l.time, l.days);
    if (!fireDate) return;
    items.push({
      type: 'link', id: l.id, time: l.time,
      label: l.label || 'Scheduled Link', url: l.url || null,
      fireDate, countdown: formatDiff(fireDate - now), days: l.days || [],
    });
  });

  items.sort((a, b) => a.fireDate - b.fireDate);
  return items;
}

// ── Type meta ─────────────────────────────────────────────────────────────────
const TYPE_META = {
  alarm:   { icon: 'ti-alarm',      label: 'Alarm',           route: '/alarms'   },
  routine: { icon: 'ti-list-check', label: 'Routine',         route: '/alarms'   },
  link:    { icon: 'ti-link',       label: 'Scheduled Link',  route: '/alarms'   },
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user }     = useAuth();
  const { alarms, loading: alarmsLoading }   = useAlarms(user?.uid);
  const { routines } = useRoutines(user?.uid);
  const { links }    = useScheduledLinks(user?.uid);
  const isLoading    = alarmsLoading;
  const { isOnline, notifPermission, requestNotifications } = useMars();
  const navigate     = useNavigate();

  // Missed alarm banner
  const [missedAlarms, setMissedAlarms] = useState([]);
  useEffect(() => {
    const handler = (e) => setMissedAlarms(e.detail || []);
    window.addEventListener('mars:missed-alarms', handler);
    return () => window.removeEventListener('mars:missed-alarms', handler);
  }, []);

  // Manual sync reserved for future FAB / keyboard shortcut use

  const timeline = buildTimeline(alarms, routines, links);
  const userName  = user?.displayName?.trim() || localStorage.getItem('mars-guest-display-name') || 'there';
  const greeting  = getGreeting();

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

      {/* Greeting */}
      <div className="dash-greeting">
        <h1>{greeting}, {userName}.</h1>
        <p>Your MARS system is {isOnline ? 'fully online' : 'running in offline mode'}.</p>
        {notifPermission !== 'granted' && (
          <button className="notif-cta" onClick={requestNotifications}>
            <i className="ti ti-bell" /> Enable alarm notifications
          </button>
        )}
      </div>

      {/* ── My Day Section ─────────────────────────────────────────────── */}
      <div className="settings-group">
        <div className="settings-group-label">MY DAY</div>

        {isLoading ? (
          // Skeleton rows while Firestore loads
          [1, 2, 3].map((n) => (
            <div key={n} className="settings-row myday-skeleton-row" aria-hidden="true">
              <div className="sr-icon-wrap myday-skeleton-box" style={{ borderRadius: 10 }} />
              <div className="sr-body">
                <div className="myday-skeleton-line" style={{ width: '55%', height: 13, marginBottom: 6 }} />
                <div className="myday-skeleton-line" style={{ width: '35%', height: 11 }} />
              </div>
            </div>
          ))
        ) : timeline.length === 0 ? (
          <div className="settings-row myday-empty-row">
            <div className="sr-icon-wrap">
              <i className="ti ti-calendar-off" />
            </div>
            <div className="sr-body">
              <div className="sr-title">Nothing scheduled yet</div>
              <div className="sr-desc">Add an alarm, routine, or scheduled link to get started.</div>
            </div>
            <button className="sr-btn" onClick={() => navigate('/alarms')}>
              Add
            </button>
          </div>
        ) : (
          timeline.map((item) => {
            const meta = TYPE_META[item.type];
            return (
              <Link
                key={`${item.type}-${item.id}`}
                to={meta.route}
                className="settings-row myday-row"
              >
                <div className="sr-icon-wrap">
                  <i className={`ti ${meta.icon}`} />
                </div>
                <div className="sr-body">
                  <div className="sr-title">
                    {item.label}
                    {item.type === 'routine' && item.stepCount > 0 && (
                      <span className="sr-badge">{item.stepCount} steps</span>
                    )}
                  </div>
                  <div className="sr-desc">
                    {item.time}
                    {item.days && item.days.length > 0 ? ` · ${item.days.join(', ')}` : ''}
                    {item.url ? ` · ${item.url}` : ''}
                  </div>
                </div>
                <div className="sr-right">
                  <span className="myday-countdown-pill">{item.countdown}</span>
                  <i className="ti ti-chevron-right sr-chevron" />
                </div>
              </Link>
            );
          })
        )}
      </div>



    </div>
  );
}
