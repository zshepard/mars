// src/pages/Dashboard.jsx  (My Day)
// Presents upcoming alarms, scheduled links, and routines in Settings-style rows.
import { useState, useEffect, useCallback } from 'react';
import { useAuth }           from '../hooks/useAuth';
import { useAlarms }         from '../hooks/useAlarms';
import { useRoutines }       from '../hooks/useRoutines';
import { useScheduledLinks } from '../hooks/useScheduledLinks';
import { useMars }           from '../hooks/useMars';
import { Link, useNavigate } from 'react-router-dom';
import {
  doc, getDoc, setDoc, serverTimestamp,
} from 'firebase/firestore';
import { db, reconnectFirestore } from '../firebase/config';
import './Dashboard.css';

// ── Time helpers ──────────────────────────────────────────────────────────────
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

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
  const { alarms }   = useAlarms(user?.uid);
  const { routines } = useRoutines(user?.uid);
  const { links }    = useScheduledLinks(user?.uid);
  const { isOnline, notifPermission, requestNotifications } = useMars();
  const navigate     = useNavigate();

  // Missed alarm banner
  const [missedAlarms, setMissedAlarms] = useState([]);
  useEffect(() => {
    const handler = (e) => setMissedAlarms(e.detail || []);
    window.addEventListener('mars:missed-alarms', handler);
    return () => window.removeEventListener('mars:missed-alarms', handler);
  }, []);

  // Manual sync (kept for FAB / keyboard shortcut use)
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
      const uid = user.uid;
      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
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
        setSyncStatus('ok'); setSyncMsg('Profile created');
      } else {
        await setDoc(userRef, { lastSeenAt: serverTimestamp(), platform: 'web' }, { merge: true });
        setSyncStatus('ok'); setSyncMsg('Synced');
      }
    } catch (err) {
      setSyncStatus('error');
      setSyncMsg(
        err.code === 'unavailable'         ? 'Firestore offline — check your connection' :
        err.code === 'permission-denied'   ? 'Permission denied — sign out and sign back in' :
        err.code === 'unauthenticated'     ? 'Not signed in — please sign in again' :
                                             `Error: ${err.message}`
      );
    }
    setTimeout(() => { setSyncStatus('idle'); setSyncMsg(''); }, 6000);
  }, [user]);

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

        {timeline.length === 0 ? (
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

      {/* Sync status message */}
      {syncMsg && (
        <div className={`qa-sync-msg qa-sync-msg--${syncStatus}`}>{syncMsg}</div>
      )}

    </div>
  );
}
