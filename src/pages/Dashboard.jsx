// src/pages/Dashboard.jsx  (My Day)
// Shows all upcoming alarms, scheduled links, and routines sorted by next fire time.
import { useState, useEffect, useCallback } from 'react';
import { useAuth }           from '../hooks/useAuth';
import { useAlarms }         from '../hooks/useAlarms';
import { useRoutines }       from '../hooks/useRoutines';
import { useScheduledLinks } from '../hooks/useScheduledLinks';
import { useMars }           from '../hooks/useMars';
import { Link }              from 'react-router-dom';
import {
  doc, getDoc, setDoc, serverTimestamp,
} from 'firebase/firestore';
import { db, reconnectFirestore } from '../firebase/config';
import './Dashboard.css';

// ── Time helpers ─────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

/** Returns the next fire Date for a time string + optional days array. */
function nextFireDate(timeStr, days = []) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  const now = new Date();
  for (let offset = 0; offset <= 7; offset++) {
    const c = new Date(now);
    c.setDate(now.getDate() + offset);
    c.setHours(h, m, 0, 0);
    if (c <= now) continue;
    if (!days || days.length === 0) return c;
    if (days.includes(DAY_NAMES[c.getDay()])) return c;
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

// eslint-disable-next-line no-unused-vars
function timeUntil(timeStr, days = []) {
  const d = nextFireDate(timeStr, days);
  if (!d) return null;
  return formatDiff(d - new Date());
}

// ── Greeting ─────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 2  && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 20) return 'Good evening';
  return 'Good night';
}

// ── My Day item types ─────────────────────────────────────────────────────────

function buildTimeline(alarms, routines, links) {
  const now = new Date();
  const items = [];

  // Enabled alarms
  alarms.filter(a => a.enabled !== false).forEach((a) => {
    const fireDate = a.fire_at ? new Date(a.fire_at) : nextFireDate(a.time, a.days);
    if (!fireDate) return;
    items.push({
      type:     'alarm',
      id:       a.id,
      time:     a.time,
      label:    a.label || 'Alarm',
      url:      a.openUrl || null,
      fireDate,
      countdown: formatDiff(fireDate - now),
      days:     a.days || [],
    });
  });

  // Active routines
  routines.filter(r => r.active || r.enabled !== false).forEach((r) => {
    const fireDate = nextFireDate(r.startTime || r.time, r.days);
    if (!fireDate) return;
    items.push({
      type:      'routine',
      id:        r.id,
      time:      r.startTime || r.time,
      label:     r.name || 'Routine',
      stepCount: (r.steps || []).length,
      fireDate,
      countdown: formatDiff(fireDate - now),
      days:      r.days || [],
    });
  });

  // Enabled scheduled links
  links.filter(l => l.enabled !== false).forEach((l) => {
    const fireDate = nextFireDate(l.time, l.days);
    if (!fireDate) return;
    items.push({
      type:     'link',
      id:       l.id,
      time:     l.time,
      label:    l.label || 'Scheduled Link',
      url:      l.url || null,
      fireDate,
      countdown: formatDiff(fireDate - now),
      days:     l.days || [],
    });
  });

  // Sort by next fire time ascending
  items.sort((a, b) => a.fireDate - b.fireDate);
  return items;
}

// ── Type icons and colours ────────────────────────────────────────────────────

const TYPE_META = {
  alarm:   { icon: 'ti-alarm',      accent: 'var(--accent, #e84393)',   label: 'Alarm'           },
  routine: { icon: 'ti-list-check', accent: 'var(--accent2, #7c3aed)',  label: 'Routine'         },
  link:    { icon: 'ti-link',       accent: 'var(--accent3, #0ea5e9)',  label: 'Scheduled Link'  },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user }    = useAuth();
  const { alarms }  = useAlarms(user?.uid);
  const { routines } = useRoutines(user?.uid);
  const { links }   = useScheduledLinks(user?.uid);
  const { isOnline, notifPermission, requestNotifications } = useMars();

  // Missed alarm banner
  const [missedAlarms, setMissedAlarms] = useState([]);
  useEffect(() => {
    const handler = (e) => setMissedAlarms(e.detail || []);
    window.addEventListener('mars:missed-alarms', handler);
    return () => window.removeEventListener('mars:missed-alarms', handler);
  }, []);

  // Manual sync
  const [syncStatus, setSyncStatus] = useState('idle');
  const [syncMsg, setSyncMsg]       = useState('');

  const handleSync = useCallback(async () => {
    if (!user || user.isGuest) {
      setSyncStatus('error'); setSyncMsg('Sign in to sync');
      setTimeout(() => setSyncStatus('idle'), 3000);
      return;
    }
    setSyncStatus('syncing'); setSyncMsg('Reconnecting…');
    try {
      await reconnectFirestore();
      setSyncMsg('Checking profile…');
      const uid     = user.uid;
      const userRef = doc(db, 'users', uid);
      const snap    = await getDoc(userRef);
      if (!snap.exists()) {
        setSyncMsg('Creating profile…');
        await setDoc(userRef, {
          uid, googleSub: uid,
          displayName: user.displayName || '', email: user.email || '',
          emailVerified: user.emailVerified ?? false, photoURL: user.photoURL || '',
          primaryProvider: user.providerData?.[0]?.providerId || 'unknown',
          providerData: (user.providerData || []).map((p) => ({
            providerId: p.providerId, uid: p.uid,
            email: p.email || '', displayName: p.displayName || '', photoURL: p.photoURL || '',
          })),
          createdAt: serverTimestamp(), lastLoginAt: serverTimestamp(),
          lastSeenAt: serverTimestamp(), loginCount: 1, platform: 'web', platforms: ['web'],
        });
        setSyncStatus('ok'); setSyncMsg('Profile created — data will now sync');
      } else {
        await setDoc(userRef, { lastSeenAt: serverTimestamp(), platform: 'web' }, { merge: true });
        setSyncStatus('ok'); setSyncMsg('Synced');
      }
    } catch (err) {
      setSyncStatus('error');
      const msg =
        err.code === 'unavailable'         ? 'Firestore offline — check your connection' :
        err.code === 'permission-denied'   ? 'Permission denied — sign out and sign back in' :
        err.code === 'unauthenticated'     ? 'Not signed in — please sign in again' :
        err.code === 'failed-precondition' ? 'Another tab may be blocking sync — close other tabs' :
                                             `Error (${err.code || 'unknown'}): ${err.message}`;
      setSyncMsg(msg);
    }
    setTimeout(() => { setSyncStatus('idle'); setSyncMsg(''); }, 6000);
  }, [user]);

  // Build timeline
  const timeline = buildTimeline(alarms, routines, links);

  // Display name — prefer Firestore displayName, fall back to localStorage (guest / onboarding)
  const userName =
    user?.displayName?.trim() ||
    localStorage.getItem('mars-guest-display-name') ||
    'there';

  const greeting = getGreeting();

  const syncIcon =
    syncStatus === 'syncing' ? 'ti-loader-2 spin' :
    syncStatus === 'ok'      ? 'ti-check'         :
    syncStatus === 'error'   ? 'ti-alert-circle'  : 'ti-refresh';

  const syncLabel =
    syncStatus === 'syncing' ? 'Syncing…' :
    syncStatus === 'ok'      ? 'Synced'   :
    syncStatus === 'error'   ? 'Failed'   : 'Sync';

  // Route for each item type
  const typeRoute = { alarm: '/alarms', routine: '/alarms', link: '/alarms' };

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

      {/* ── My Day Timeline ─────────────────────────────────────────────── */}
      <div className="myday-section">
        <div className="myday-section-header">
          <i className="ti ti-calendar-time" />
          <span>My Day</span>
          <span className="myday-count">{timeline.length} upcoming</span>
        </div>

        {timeline.length === 0 ? (
          <div className="myday-empty">
            <i className="ti ti-calendar-off" />
            <p>Nothing scheduled yet.</p>
            <p className="myday-empty-hint">Add an alarm, routine, or scheduled link to get started.</p>
          </div>
        ) : (
          <div className="myday-list">
            {timeline.map((item) => {
              const meta = TYPE_META[item.type];
              return (
                <Link
                  key={`${item.type}-${item.id}`}
                  to={typeRoute[item.type]}
                  className="myday-item"
                  style={{ '--item-accent': meta.accent }}
                >
                  {/* Time column */}
                  <div className="myday-time-col">
                    <span className="myday-time">{item.time}</span>
                    <span className="myday-countdown">{item.countdown}</span>
                  </div>

                  {/* Divider line */}
                  <div className="myday-line">
                    <div className="myday-dot" />
                    <div className="myday-track" />
                  </div>

                  {/* Content */}
                  <div className="myday-content">
                    <div className="myday-type-badge">
                      <i className={`ti ${meta.icon}`} />
                      <span>{meta.label}</span>
                    </div>
                    <div className="myday-label">{item.label}</div>
                    {item.days && item.days.length > 0 && (
                      <div className="myday-days">{item.days.join(' · ')}</div>
                    )}
                    {item.url && (
                      <div className="myday-url">
                        <i className="ti ti-external-link" />
                        <span>{item.url}</span>
                      </div>
                    )}
                    {item.type === 'routine' && item.stepCount > 0 && (
                      <div className="myday-steps">{item.stepCount} step{item.stepCount !== 1 ? 's' : ''}</div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Quick Actions ────────────────────────────────────────────────── */}
      <div className="myday-section">
        <div className="myday-section-header">
          <i className="ti ti-bolt" />
          <span>Quick Actions</span>
        </div>
        <div className="qa-grid">
          <Link to="/alarms"   className="qa-btn"><i className="ti ti-alarm" />      New Alarm</Link>
          <Link to="/alarms"   className="qa-btn"><i className="ti ti-route" />      New Routine</Link>
          <Link to="/alarms"   className="qa-btn"><i className="ti ti-link" />       Add Link</Link>
          <Link to="/voice"    className="qa-btn"><i className="ti ti-speakerphone" /> Voice</Link>
          <Link to="/settings" className="qa-btn"><i className="ti ti-settings" />   Settings</Link>
          <button
            className={`qa-btn qa-btn--sync qa-btn--${syncStatus}`}
            onClick={handleSync}
            disabled={syncStatus === 'syncing'}
            title={syncMsg || 'Force reconnect and sync data with Firestore'}
          >
            <i className={`ti ${syncIcon}`} />
            {syncLabel}
          </button>
        </div>
        {syncMsg && (
          <div className={`qa-sync-msg qa-sync-msg--${syncStatus}`}>{syncMsg}</div>
        )}
      </div>

    </div>
  );
}
