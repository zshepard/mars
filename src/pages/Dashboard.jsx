// src/pages/Dashboard.jsx  (My Day)
// Presents upcoming alarms, scheduled links, and routines in Settings-style rows.
// Clicking an item ACTIVATES it immediately:
//   alarm   → plays alarm sound + shows dismiss overlay
//   routine → fires mars:start-routine event → RoutinePlayer overlay
//   link    → opens URL via marsOpenUrl (new tab / native Linking)
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth }           from '../hooks/useAuth';
import { useAlarms }         from '../hooks/useAlarms';
import { useRoutines }       from '../hooks/useRoutines';
import { useScheduledLinks } from '../hooks/useScheduledLinks';
import { useMars }           from '../hooks/useMars';
import { useNavigate }       from 'react-router-dom';
import { marsPlaySound, marsStopSound, marsOpenUrl } from '../marsBridge';
import './Dashboard.css';
import { nextFireDate, formatCountdown } from '../utils/timeUtils';

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
      _raw: a,
    });
  });

  routines.filter(r => r.active || r.enabled !== false).forEach((r) => {
    const fireDate = nextFireDate(r.startTime || r.time, r.days);
    if (!fireDate) return;
    items.push({
      type: 'routine', id: r.id, time: r.startTime || r.time,
      label: r.name || 'Routine', stepCount: (r.steps || []).length,
      fireDate, countdown: formatDiff(fireDate - now), days: r.days || [],
      _raw: r,
    });
  });

  links.filter(l => l.enabled !== false).forEach((l) => {
    const fireDate = nextFireDate(l.time, l.days);
    if (!fireDate) return;
    items.push({
      type: 'link', id: l.id, time: l.time,
      label: l.label || 'Scheduled Link', url: l.url || null,
      fireDate, countdown: formatDiff(fireDate - now), days: l.days || [],
      _raw: l,
    });
  });

  items.sort((a, b) => a.fireDate - b.fireDate);
  return items;
}

// ── Type meta ─────────────────────────────────────────────────────────────────
const TYPE_META = {
  alarm:   { icon: 'ti-alarm',      label: 'Alarm'          },
  routine: { icon: 'ti-list-check', label: 'Routine'        },
  link:    { icon: 'ti-link',       label: 'Scheduled Link' },
};

// ── Alarm fire overlay ────────────────────────────────────────────────────────
function AlarmOverlay({ alarm, onDismiss, onSnooze }) {
  return (
    <div className="alarm-overlay" onClick={onDismiss}>
      <div className="alarm-overlay-card" onClick={e => e.stopPropagation()}>
        <div className="alarm-overlay-icon"><i className="ti ti-alarm" /></div>
        <div className="alarm-overlay-label">{alarm.label || 'Alarm'}</div>
        <div className="alarm-overlay-time">{alarm.time}</div>
        <div className="alarm-overlay-actions">
          <button className="btn btn-sm" onClick={onSnooze}>
            <i className="ti ti-clock-snooze" /> Snooze
          </button>
          <button className="btn btn-primary btn-sm" onClick={onDismiss}>
            <i className="ti ti-check" /> Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

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

  // Active alarm overlay state
  const [firingAlarm, setFiringAlarm] = useState(null);
  const snoozeTimeout = useRef(null);

  // ── Activate handlers ───────────────────────────────────────────────────────

  const activateAlarm = useCallback((item) => {
    const alarm = item._raw;
    const soundName = alarm.sound || 'alarm-default';
    const ext = ['alarm-default','alarm-gentle','alarm-military','chime',
      'Argon','Carbon','Helium','Krypton','Neon','Osmium','Oxygen','Platinum'].includes(soundName)
      ? 'wav' : 'mp3';
    marsPlaySound(`/sounds/${soundName}.${ext}`, false);
    setFiringAlarm(item);
  }, []);

  const dismissAlarm = useCallback(() => {
    marsStopSound();
    if (snoozeTimeout.current) { clearTimeout(snoozeTimeout.current); snoozeTimeout.current = null; }
    // Open URL if alarm has one
    if (firingAlarm?._raw?.openUrl) marsOpenUrl(firingAlarm._raw.openUrl);
    setFiringAlarm(null);
  }, [firingAlarm]);

  const snoozeAlarm = useCallback(() => {
    marsStopSound();
    const snoozeMins = parseInt(localStorage.getItem('mars-snooze-duration') || '5', 10);
    setFiringAlarm(null);
    // Re-fire after snooze duration
    snoozeTimeout.current = setTimeout(() => {
      activateAlarm(firingAlarm);
    }, snoozeMins * 60 * 1000);
  }, [firingAlarm, activateAlarm]);

  const activateRoutine = useCallback((item) => {
    window.dispatchEvent(new CustomEvent('mars:start-routine', { detail: item._raw }));
  }, []);

  const activateLink = useCallback((item) => {
    if (item.url) marsOpenUrl(item.url);
  }, []);

  const handleItemClick = useCallback((item) => {
    if (item.type === 'alarm')   activateAlarm(item);
    if (item.type === 'routine') activateRoutine(item);
    if (item.type === 'link')    activateLink(item);
  }, [activateAlarm, activateRoutine, activateLink]);

  // Cleanup snooze timer on unmount
  useEffect(() => () => {
    if (snoozeTimeout.current) clearTimeout(snoozeTimeout.current);
    marsStopSound();
  }, []);

  const timeline = buildTimeline(alarms, routines, links);
  const userName  = user?.displayName?.trim() || localStorage.getItem('mars-guest-display-name') || 'there';
  const greeting  = getGreeting();

  return (
    <div className="dash-page">

      {/* Alarm fire overlay */}
      {firingAlarm && (
        <AlarmOverlay
          alarm={firingAlarm._raw}
          onDismiss={dismissAlarm}
          onSnooze={snoozeAlarm}
        />
      )}

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
        <div className="settings-group-label">MY DAY — tap to activate</div>

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
              <button
                key={`${item.type}-${item.id}`}
                className="settings-row myday-row myday-row--btn"
                onClick={() => handleItemClick(item)}
                title={
                  item.type === 'alarm'   ? `Fire alarm: ${item.label}` :
                  item.type === 'routine' ? `Start routine: ${item.label}` :
                  `Open link: ${item.url}`
                }
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
                  <i className={`ti ${
                    item.type === 'alarm'   ? 'ti-player-play' :
                    item.type === 'routine' ? 'ti-player-play' :
                    'ti-external-link'
                  } sr-chevron`} />
                </div>
              </button>
            );
          })
        )}
      </div>

    </div>
  );
}
