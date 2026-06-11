/**
 * MARS Shared Time Utilities
 * Single source of truth for all time/countdown helpers used across the app.
 * Eliminates duplicate implementations in Alarms.jsx, Dashboard.jsx,
 * useAlarmTimer.js, Sidebar.jsx, and BottomNav.jsx.
 */

/** Day-name array indexed by Date.getDay() (0=Sun) */
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

/**
 * Returns milliseconds until the next fire of a recurring alarm/link.
 * @param {string} timeStr  "HH:MM"
 * @param {string[]} days   ["Mon","Tue",...] — empty/undefined means every day
 * @returns {number|null}
 */
export function msUntilNextFire(timeStr, days = []) {
  if (!timeStr) return null;
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return null;

  const now = new Date();

  for (let offset = 0; offset < 8; offset++) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + offset);
    candidate.setHours(h, m, 0, 0);

    if (candidate <= now) continue;

    const dayName = DAY_NAMES[candidate.getDay()];
    if (!days || days.length === 0 || days.includes(dayName)) {
      return candidate.getTime() - now.getTime();
    }
  }
  return null;
}

/**
 * Returns the next Date object when an alarm/link will fire.
 * @param {string} timeStr  "HH:MM"
 * @param {string[]} days
 * @returns {Date|null}
 */
export function nextFireDate(timeStr, days = []) {
  const ms = msUntilNextFire(timeStr, days);
  if (ms == null) return null;
  return new Date(Date.now() + ms);
}

/**
 * Formats a millisecond duration into a human-readable countdown string.
 * Returns strings like "in 2h 15m", "in 45m", "now".
 * @param {number|null} ms
 * @returns {string}
 */
export function formatCountdown(ms) {
  if (ms == null || ms < 0) return '';
  if (ms < 60_000) return 'now';
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `in ${m}m`;
  if (m === 0) return `in ${h}h`;
  return `in ${h}h ${m}m`;
}

/**
 * Returns the Tabler icon class name for the My Day nav item.
 * Used by Sidebar.jsx (desktop) and BottomNav.jsx (mobile).
 * Returns one of: 'ti-alarm', 'ti-list-check', 'ti-sun', 'ti-sun-high',
 *                 'ti-sunset', 'ti-moon'
 *
 * Logic:
 *  - Alarm fires within 15 min (uses fire_at ISO string)  → ti-alarm
 *  - Routine starts within ±15 min (uses startTime HH:MM) → ti-list-check
 *  - 05:00–11:59  → ti-sun
 *  - 12:00–16:59  → ti-sun-high
 *  - 17:00–19:59  → ti-sunset
 *  - 20:00–04:59  → ti-moon
 *
 * @param {object[]} alarms
 * @param {object[]} routines
 * @returns {string}  Tabler icon class name (without the leading "ti " prefix)
 */
export function getMyDayIcon(alarms = [], routines = []) {
  const now = new Date();
  const h   = now.getHours();
  const m   = now.getMinutes();
  const hm  = h * 60 + m;

  const soonAlarm = alarms.some((a) => {
    if (!a.enabled || !a.fire_at) return false;
    const diff = (new Date(a.fire_at) - now) / 60_000;
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
