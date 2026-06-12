// ═══════════════════════════════════════════════════════════════
//  MARS SERVICE WORKER  —  My Automated Routine System
//  Handles: offline caching, background sync, push alarms,
//           voice command cache, offline home control queue
// ═══════════════════════════════════════════════════════════════

const MARS_VERSION  = 'mars-v1.5.0'; // fix false notifications: dedup, no early-fire, foreground close
const STATIC_CACHE  = `${MARS_VERSION}-static`;
const DYNAMIC_CACHE = `${MARS_VERSION}-dynamic`;
const ALARM_CACHE   = `${MARS_VERSION}-alarms`;

// ── Assets cached immediately on install ──────────────────────
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/sounds/alarm-default.wav',
  '/sounds/alarm-gentle.wav',
  '/sounds/alarm-military.wav',
  '/sounds/chime.wav',
  '/sounds/alarm-classic.mp3',
  '/sounds/alarm-digital.mp3',
  '/sounds/alarm-nature.mp3',
  '/sounds/alarm-motivational.mp3',
  '/sounds/alarm-piano.mp3',
  '/sounds/alarm-cosmic.mp3',
  '/sounds/alarm-marimba.mp3',
  '/sounds/alarm-pulse.mp3',
];

// ── Voice command phrases cached for offline recognition ───────
const VOICE_COMMANDS = [
  'hey mars start my morning',
  'hey mars im feeling tired',
  'hey mars open my workout',
  'hey mars kids room quiet mode',
  'hey mars snooze 10 minutes',
  'hey mars goodnight',
  'hey mars start routine',
  'hey mars im feeling energized',
  'hey mars im feeling focused',
  'hey mars im feeling calm',
  'hey mars lights on',
  'hey mars lights off',
  'hey mars dim lights',
  'hey mars temperature up',
  'hey mars temperature down',
  'hey mars volume up',
  'hey mars volume down',
  'hey mars lock morning alarm',
  'hey mars skip step',
  'hey mars pause routine',
  'hey mars resume routine',
  'hey mars open link on phone',
  'hey mars open link on computer',
];

// ════════════════════════════════════════════════════════════════
//  INSTALL — cache all static assets + voice commands
// ════════════════════════════════════════════════════════════════
self.addEventListener('install', (event) => {
  console.log('[MARS SW] Installing...');
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll(STATIC_ASSETS).catch((err) => {
          console.warn('[MARS SW] Some static assets failed to cache:', err);
        });
      }),
      // Store voice commands in cache storage for offline matching
      caches.open(ALARM_CACHE).then((cache) => {
        const voiceData = new Response(JSON.stringify({
          commands: VOICE_COMMANDS,
          version: MARS_VERSION,
          cached_at: new Date().toISOString(),
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
        return cache.put('/mars/voice-commands', voiceData);
      }),
    ]).then(() => {
      console.log('[MARS SW] Install complete — offline mode ready');
      return self.skipWaiting();
    })
  );
});

// ════════════════════════════════════════════════════════════════
//  ACTIVATE — clean up old caches from previous versions
// ════════════════════════════════════════════════════════════════
self.addEventListener('activate', (event) => {
  console.log('[MARS SW] Activating...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => {
            return key.startsWith('mars-') && key !== STATIC_CACHE
              && key !== DYNAMIC_CACHE && key !== ALARM_CACHE;
          })
          .map((key) => {
            console.log('[MARS SW] Removing old cache:', key);
            return caches.delete(key);
          })
      );
    }).then(() => {
      console.log('[MARS SW] Activated — claiming all clients');
      return self.clients.claim();
    })
  );
});

// ════════════════════════════════════════════════════════════════
//  FETCH — smart cache strategy per request type
// ════════════════════════════════════════════════════════════════
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and browser-extension requests
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // ── Strategy 1: Static assets → Cache First ──────────────────
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // ── Strategy 2: Firebase API → Network First with fallback ───
  if (url.hostname.includes('firebase') || url.hostname.includes('firestore')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // ── Strategy 3: MARS internal routes ────────────────────────────
  // HTML navigation requests → Network First so the browser always gets
  // the latest index.html from Vercel. staleWhileRevalidate was causing
  // different cached versions to cycle on each reload.
  if (url.origin === self.location.origin) {
    const isHtml = request.headers.get('Accept')?.includes('text/html')
      || url.pathname === '/' || !url.pathname.includes('.');
    if (isHtml) {
      event.respondWith(networkFirst(request));
    } else {
      event.respondWith(staleWhileRevalidate(request));
    }
    return;
  }

  // ── Strategy 4: External URLs (user-linked) → Network only ───
  event.respondWith(networkOnly(request));
});

// ── Cache Strategies ──────────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return offlineFallback(request);
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || offlineFallback(request);
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cached = await cache.match(request);
  const networkPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  return cached || await networkPromise || offlineFallback(request);
}

async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch {
    return new Response(JSON.stringify({ error: 'offline', mars: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 503,
    });
  }
}

async function offlineFallback(request) {
  if (request.headers.get('Accept')?.includes('text/html')) {
    const cached = await caches.match('/offline.html');
    return cached || new Response('<h1>MARS — Offline Mode Active</h1>', {
      headers: { 'Content-Type': 'text/html' },
    });
  }
  return new Response(JSON.stringify({ mars_offline: true }), {
    headers: { 'Content-Type': 'application/json' },
    status: 503,
  });
}

function isStaticAsset(url) {
  return STATIC_ASSETS.some((asset) => url.pathname === asset)
    || url.pathname.match(/\.(js|css|png|jpg|ico|woff2|mp3|svg)$/);
}

// ════════════════════════════════════════════════════════════════
//  PUSH NOTIFICATIONS — alarm triggers from server
// ════════════════════════════════════════════════════════════════
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { title: 'MARS Alarm', body: 'Your routine is starting.' };
  }

  const {
    title       = 'MARS',
    body        = 'Routine triggered',
    alarm_id    = null,
    auto_dismiss= false,
    dismiss_after = 60,
    open_url    = null,
    open_device = 'phone',
    routine_step= null,
    sound       = 'alarm-default',
    icon        = '/icons/icon-192.png',
    badge       = '/icons/badge-72.png',
  } = data;

  const actions = auto_dismiss
    ? [{ action: 'snooze', title: '⏱ Snooze 5m' }]
    : [
        { action: 'dismiss', title: '✓ Dismiss' },
        { action: 'snooze',  title: '⏱ Snooze 5m' },
      ];

  // Resolve the correct sound URL — WAV sounds need .wav extension, MP3 sounds need .mp3.
  // Native Android ringtone URIs (content://) cannot be played by the SW; fall back to default.
  const WAV_SOUND_IDS = new Set([
    'alarm-default','alarm-gentle','alarm-military','chime',
    'Argon','Carbon','Helium','Krypton','Neon','Osmium','Oxygen','Platinum',
  ]);
  const isNativeUri = typeof sound === 'string' && sound.startsWith('content://');
  const soundUrl = isNativeUri
    ? '/sounds/alarm-default.wav'
    : `/sounds/${sound}.${WAV_SOUND_IDS.has(sound) ? 'wav' : 'mp3'}`;

  const options = {
    body,
    icon,
    badge,
    sound: soundUrl,
    vibrate: [200, 100, 200, 100, 400],
    requireInteraction: !auto_dismiss,
    actions,
    data: { alarm_id, open_url, open_device, routine_step, auto_dismiss, dismiss_after },
    tag: alarm_id || 'mars-alarm',
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(title, options).then(() => {
      // Auto-dismiss after delay if configured
      if (auto_dismiss && dismiss_after > 0) {
        setTimeout(() => {
          self.registration.getNotifications({ tag: options.tag }).then((notifs) => {
            notifs.forEach((n) => {
              n.close();
              handleAlarmDismiss({ alarm_id, open_url, open_device, routine_step });
            });
          });
        }, dismiss_after * 1000);
      }
    })
  );
});

// ════════════════════════════════════════════════════════════════
//  NOTIFICATION CLICK — dismiss or snooze, then open URL / start routine
// ════════════════════════════════════════════════════════════════
self.addEventListener('notificationclick', (event) => {
  const { action, notification } = event;
  const data = notification.data || {};
  const { alarm_id, open_url, open_device, routine_step, notification_type, routine_data, link_url } = data;
  notification.close();

  if (action === 'snooze') {
    event.waitUntil(handleSnooze(alarm_id, 5));
    return;
  }

  // ── Scheduled link notification click — open the URL ──────────
  if (notification_type === 'scheduled-link') {
    event.waitUntil((async () => {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      if (link_url) {
        if (clients.length > 0) {
          // Focus the app, then let the global mars:open-url listener in App.jsx open the URL.
          // Use a short delay so the page is active before the message arrives.
          const client = await clients[0].focus();
          await new Promise(r => setTimeout(r, 300));
          client.postMessage({ type: 'MARS_OPEN_URL', url: link_url, device: open_device });
        } else {
          // App is fully closed — open the URL directly
          await self.clients.openWindow(link_url);
        }
      } else if (clients.length > 0) {
        await clients[0].focus();
      } else {
        await self.clients.openWindow('/');
      }
    })());
    return;
  }

  // ── Routine notification click — focus app and start routine player ──
  if (notification_type === 'routine') {
    event.waitUntil((async () => {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const focusedClient = clients.length > 0 ? await clients[0].focus() : await self.clients.openWindow('/');
      if (focusedClient && routine_data) {
        // Small delay to let the page re-mount after focus
        setTimeout(() => {
          focusedClient.postMessage({ type: 'MARS_START_ROUTINE', routine: routine_data });
        }, 600);
      }
    })());
    return;
  }

  // ── Default: alarm dismiss + proceed ──────────────────────────
  event.waitUntil(handleAlarmDismiss({ alarm_id, open_url, open_device, routine_step }));
});

async function handleAlarmDismiss({ alarm_id, open_url, open_device, routine_step }) {
  // Notify all open MARS windows of the dismiss event
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach((client) => {
    client.postMessage({
      type: 'MARS_ALARM_DISMISSED',
      alarm_id,
      routine_step,
      open_url,
      open_device,
      timestamp: new Date().toISOString(),
    });
  });

  // Open URL on this device if open_device is 'phone' or 'all'
  if (open_url && (open_device === 'phone' || open_device === 'all')) {
    // Determine if the URL is same-origin (MARS internal) or external
    let isSameOrigin = false;
    try { isSameOrigin = new URL(open_url).origin === self.location.origin; } catch {}

    if (clients.length > 0) {
      const client = await clients[0].focus();
      if (isSameOrigin) {
        // Internal page — navigate the existing tab
        try { await client.navigate(open_url); } catch { client.postMessage({ type: 'MARS_OPEN_URL', url: open_url }); }
      } else {
        // External URL — post to global listener in App.jsx which opens a new tab
        // (client.navigate() throws on cross-origin)
        client.postMessage({ type: 'MARS_OPEN_URL', url: open_url, device: open_device });
      }
    } else {
      // App is fully closed — open the URL directly
      await self.clients.openWindow(open_url);
    }
  } else if (!open_url) {
    // No URL — just focus or open the MARS app
    if (clients.length > 0) {
      await clients[0].focus();
    } else {
      await self.clients.openWindow('/');
    }
  }

  // Queue the dismissal for background sync to Firestore
  await queueBackgroundSync('alarm-dismissed', { alarm_id, routine_step, timestamp: Date.now() });
}

async function handleSnooze(alarm_id, minutes) {
  await queueBackgroundSync('alarm-snoozed', { alarm_id, snooze_minutes: minutes, timestamp: Date.now() });
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach((c) => c.postMessage({ type: 'MARS_ALARM_SNOOZED', alarm_id, minutes }));
}

// ════════════════════════════════════════════════════════════════
//  BACKGROUND SYNC — queue offline actions, replay when online
// ════════════════════════════════════════════════════════════════
const SYNC_QUEUE_KEY = 'mars-sync-queue';

async function queueBackgroundSync(tag, payload) {
  // Store in cache for replay
  const cache = await caches.open(ALARM_CACHE);
  const existing = await cache.match('/mars/sync-queue');
  let queue = [];
  if (existing) {
    try { queue = await existing.json(); } catch { queue = []; }
  }
  queue.push({ tag, payload, queued_at: Date.now() });
  await cache.put('/mars/sync-queue', new Response(JSON.stringify(queue), {
    headers: { 'Content-Type': 'application/json' },
  }));

  // Register background sync if supported
  if ('sync' in self.registration) {
    try { await self.registration.sync.register(`mars-${tag}`); } catch {}
  }
}

self.addEventListener('sync', (event) => {
  console.log('[MARS SW] Background sync:', event.tag);
  if (event.tag.startsWith('mars-')) {
    event.waitUntil(replayQueuedActions());
  }
});

async function replayQueuedActions() {
  const cache = await caches.open(ALARM_CACHE);
  const stored = await cache.match('/mars/sync-queue');
  if (!stored) return;

  let queue = [];
  try { queue = await stored.json(); } catch { return; }
  if (!queue.length) return;

  // Notify open windows to sync queued actions to Firestore
  const clients = await self.clients.matchAll({ type: 'window' });
  if (clients.length > 0) {
    clients[0].postMessage({ type: 'MARS_SYNC_QUEUE', queue });
    // Clear the queue after sending
    await cache.put('/mars/sync-queue', new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' },
    }));
  }
}

// ════════════════════════════════════════════════════════════════
//  MESSAGE HANDLER — receive commands from the MARS app
// ════════════════════════════════════════════════════════════════
self.addEventListener('message', async (event) => {
  const { type, data } = event.data || {};

  switch (type) {

    // App telling SW to schedule an alarm
    case 'SCHEDULE_ALARM': {
      const { alarm_id, fire_at, payload } = data;
      // Persist alarm to cache so it survives SW restart
      const alarmCache = await caches.open(ALARM_CACHE);
      const existingResp = await alarmCache.match('/mars/scheduled-alarms');
      const alarmData = existingResp ? await existingResp.json() : { alarms: [] };
      alarmData.alarms = alarmData.alarms.filter(a => a.alarm_id !== alarm_id);
      alarmData.alarms.push({ alarm_id, fire_at, payload });
      await alarmCache.put('/mars/scheduled-alarms', new Response(JSON.stringify(alarmData)));
      // Schedule the in-memory timer
      scheduleAlarmTimer(alarm_id, fire_at, payload);
      console.log(`[MARS SW] Alarm ${alarm_id} persisted and scheduled`);
      break;
    }

    // App telling SW to cancel a scheduled alarm
    case 'CANCEL_ALARM': {
      const { alarm_id } = data;
      // Remove from persistence
      const aCache = await caches.open(ALARM_CACHE);
      const aResp = await aCache.match('/mars/scheduled-alarms');
      const aData = aResp ? await aResp.json() : { alarms: [] };
      aData.alarms = aData.alarms.filter(a => a.alarm_id !== alarm_id);
      await aCache.put('/mars/scheduled-alarms', new Response(JSON.stringify(aData)));
      // Cancel in-memory timer
      if (scheduledAlarmTimers[alarm_id]) {
        clearTimeout(scheduledAlarmTimers[alarm_id]);
        delete scheduledAlarmTimers[alarm_id];
      }
      const notifs = await self.registration.getNotifications({ tag: alarm_id });
      notifs.forEach((n) => n.close());
      console.log(`[MARS SW] Alarm ${alarm_id} cancelled and removed`);
      break;
    }

    // App requesting the cached voice commands list
    case 'GET_VOICE_COMMANDS': {
      const cache = await caches.open(ALARM_CACHE);
      const stored = await cache.match('/mars/voice-commands');
      const voiceData = stored ? await stored.json() : { commands: VOICE_COMMANDS };
      event.source.postMessage({ type: 'VOICE_COMMANDS_RESULT', data: voiceData });
      break;
    }

    // App telling SW to schedule a URL to open at a specific time
    case 'SCHEDULE_LINK': {
      const { link_id, time, days, url, device } = data;
      // Store link schedule in cache for persistence
      const linkCache = await caches.open(ALARM_CACHE);
      const existingResp = await linkCache.match('/mars/scheduled-links');
      const existing = existingResp ? await existingResp.json() : { links: [] };
      existing.links = existing.links.filter(l => l.link_id !== link_id);
      existing.links.push({ link_id, time, days, url, device });
      await linkCache.put('/mars/scheduled-links', new Response(JSON.stringify(existing)));
      // Schedule the next occurrence
      scheduleNextLinkOpen(link_id, time, days, url, device);
      console.log(`[MARS SW] Link ${link_id} scheduled at ${time}`);
      break;
    }

    // App telling SW to cancel a scheduled link
    case 'CANCEL_LINK': {
      const { link_id: cancelId } = data;
      const lCache = await caches.open(ALARM_CACHE);
      const eResp = await lCache.match('/mars/scheduled-links');
      const eData = eResp ? await eResp.json() : { links: [] };
      eData.links = eData.links.filter(l => l.link_id !== cancelId);
      await lCache.put('/mars/scheduled-links', new Response(JSON.stringify(eData)));
      console.log(`[MARS SW] Link ${cancelId} cancelled`);
      break;
    }

    // App telling SW to queue a home control action (works offline)
    case 'HOME_ACTION_OFFLINE': {
      await queueBackgroundSync('home-action', data);
      event.source.postMessage({ type: 'HOME_ACTION_QUEUED', data });
      break;
    }

    // App telling SW to update the cache version
    case 'SKIP_WAITING': {
      self.skipWaiting();
      break;
    }

    default:
      console.log('[MARS SW] Unknown message type:', type);
  }
});

// ════════════════════════════════════════════════════════════════
//  SCHEDULED ALARMS — persistent alarm timers that survive SW restart
// ════════════════════════════════════════════════════════════════
const scheduledAlarmTimers = {};

// ── Detect whether this device matches the alarm's target ─────────────────
// Returns true if the alarm should fire on this device.
function shouldFireOnThisDevice(targetDevice) {
  if (!targetDevice || targetDevice === 'all') return true;
  const ua = (self.navigator && self.navigator.userAgent) || '';
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  if (targetDevice === 'phone')    return isMobile;
  if (targetDevice === 'computer') return !isMobile;
  return true; // unknown target — fire everywhere
}

function scheduleAlarmTimer(alarm_id, fire_at, payload) {
  // Clear any existing timer for this alarm
  if (scheduledAlarmTimers[alarm_id]) {
    clearTimeout(scheduledAlarmTimers[alarm_id]);
  }
  const delay = new Date(fire_at).getTime() - Date.now();
  if (delay <= 0) {
    console.log(`[MARS SW] Alarm ${alarm_id} fire_at is in the past — skipping`);
    return;
  }
  // Cap at 24h — SW will be restarted and alarms re-loaded from cache before then
  const safeDelay = Math.min(delay, 86400000);
  scheduledAlarmTimers[alarm_id] = setTimeout(async () => {
    delete scheduledAlarmTimers[alarm_id];
    // Remove from persistence after firing
    const aCache = await caches.open(ALARM_CACHE);
    const aResp = await aCache.match('/mars/scheduled-alarms');
    const aData = aResp ? await aResp.json() : { alarms: [] };
    aData.alarms = aData.alarms.filter(a => a.alarm_id !== alarm_id);
    await aCache.put('/mars/scheduled-alarms', new Response(JSON.stringify(aData)));
    // ── Device targeting check — skip if this device is not the target
    const targetDevice = payload.device || payload.open_device || 'all';
    if (!shouldFireOnThisDevice(targetDevice)) {
      console.log(`[MARS SW] Alarm ${alarm_id} skipped on this device (target: ${targetDevice})`);
      return;
    }
    // Mark as fired BEFORE showing notification so the periodic check
    // won't fire it again if it runs in the same window.
    await markAlarmFired(alarm_id);
    // Resolve the correct sound URL for this alarm.
    // WAV sounds need .wav; MP3 sounds need .mp3; native Android URIs fall back to default.
    const SW_WAV_IDS = new Set([
      'alarm-default','alarm-gentle','alarm-military','chime',
      'Argon','Carbon','Helium','Krypton','Neon','Osmium','Oxygen','Platinum',
    ]);
    const alarmSound = payload.sound || 'alarm-default';
    const isNativeRingtone = typeof alarmSound === 'string' && alarmSound.startsWith('content://');
    const alarmSoundUrl = isNativeRingtone
      ? '/sounds/alarm-default.wav'
      : `/sounds/${alarmSound}.${SW_WAV_IDS.has(alarmSound) ? 'wav' : 'mp3'}`;
    // Tell all active clients (including the Android WebView bridge) to play the alarm sound.
    // This is the only reliable way to play audio when the screen is off on Android —
    // the Web Audio API is blocked when the page is hidden, and Chrome ignores the
    // notification `sound:` property entirely.
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    allClients.forEach(client => {
      client.postMessage({
        type: 'MARS_PLAY_SOUND',
        uri: alarmSound.startsWith('content://') ? alarmSound : alarmSoundUrl,
        loop: true,
        alarm_id,
      });
    });
    // Fire the notification
    await self.registration.showNotification(payload.label || payload.title || 'MARS Alarm', {
      body: payload.body || 'Time to start your routine.',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      sound: alarmSoundUrl,
      vibrate: [300, 100, 300, 100, 500],
      requireInteraction: true,
      data: { alarm_id, ...payload },
      tag: alarm_id,
      renotify: true,
      actions: [
        { action: 'dismiss', title: '\u2713 Dismiss' },
        { action: 'snooze', title: '\u23f1 Snooze 5m' },
      ],
    });
    console.log(`[MARS SW] Alarm ${alarm_id} fired!`);
  }, safeDelay);
  console.log(`[MARS SW] Alarm ${alarm_id} scheduled in ${Math.round(safeDelay/1000)}s`);
}

// ════════════════════════════════════════════════════════════════
//  SCHEDULED LINKS — open URLs at set times throughout the day
// ════════════════════════════════════════════════════════════════
const scheduledLinkTimers = {};

function scheduleNextLinkOpen(link_id, time, days, url, device) {
  // Clear existing timer for this link
  if (scheduledLinkTimers[link_id]) {
    clearTimeout(scheduledLinkTimers[link_id]);
  }
  const now = new Date();
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const todayName = dayNames[now.getDay()];
  const [hours, minutes] = time.split(':').map(Number);
  
  // Check if today is a scheduled day and time hasn't passed
  let target = new Date();
  target.setHours(hours, minutes, 0, 0);
  
  if (days.includes(todayName) && target > now) {
    // Schedule for today
    const delay = target.getTime() - now.getTime();
    scheduledLinkTimers[link_id] = setTimeout(() => fireLinkOpen(link_id, url, device), delay);
    console.log(`[MARS SW] Link ${link_id} fires in ${Math.round(delay/60000)}min`);
  } else {
    // Find next scheduled day
    for (let i = 1; i <= 7; i++) {
      const nextDate = new Date(now.getTime() + i * 86400000);
      const nextDayName = dayNames[nextDate.getDay()];
      if (days.includes(nextDayName)) {
        nextDate.setHours(hours, minutes, 0, 0);
        const delay = nextDate.getTime() - now.getTime();
        if (delay < 86400000 * 7) { // Only schedule within 7 days
          scheduledLinkTimers[link_id] = setTimeout(() => fireLinkOpen(link_id, url, device), delay);
          console.log(`[MARS SW] Link ${link_id} fires in ${Math.round(delay/3600000)}hrs`);
        }
        break;
      }
    }
  }
}

async function fireLinkOpen(link_id, url, device) {
  console.log(`[MARS SW] Opening scheduled link: ${url} on ${device}`);

  // Check if this device should handle the link
  if (!shouldFireOnThisDevice(device)) {
    console.log(`[MARS SW] Link ${link_id} skipped on this device (target: ${device})`);
  } else {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const visibleClient = clients.find(c => c.visibilityState === 'visible');

    if (visibleClient) {
      // App is in the foreground — open URL directly
      visibleClient.postMessage({ type: 'MARS_OPEN_URL', url, device });
    } else {
      // App is backgrounded or tab is hidden — show a notification
      await self.registration.showNotification('MARS — Scheduled Link', {
        body: url,
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
        vibrate: [200, 100, 200],
        requireInteraction: false,
        tag: `link-${link_id}`,
        renotify: true,
        data: {
          notification_type: 'scheduled-link',
          link_id,
          link_url: url,
          open_device: device,
        },
        actions: [
          { action: 'open', title: '\u2197 Open' },
          { action: 'dismiss', title: '\u2715 Dismiss' },
        ],
      });
    }
  }

  // Queue for background sync to other devices
  await queueBackgroundSync('open-url-remote', { link_id, url, device, timestamp: Date.now() });
  // Re-schedule for next occurrence
  const linkCache = await caches.open(ALARM_CACHE);
  const resp = await linkCache.match('/mars/scheduled-links');
  if (resp) {
    const data = await resp.json();
    const link = data.links.find(l => l.link_id === link_id);
    if (link) {
      scheduleNextLinkOpen(link.link_id, link.time, link.days, link.url, link.device);
    }
  }
}

// On SW activate, re-register all scheduled alarms AND links
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(ALARM_CACHE);

    // Restore persisted alarms
    const alarmResp = await cache.match('/mars/scheduled-alarms');
    if (alarmResp) {
      const alarmData = await alarmResp.json();
      const now = Date.now();
      const stillPending = [];
      for (const alarm of (alarmData.alarms || [])) {
        const fireTime = new Date(alarm.fire_at).getTime();
        if (fireTime > now) {
          scheduleAlarmTimer(alarm.alarm_id, alarm.fire_at, alarm.payload);
          stillPending.push(alarm);
        } else if ((now - fireTime) < 30 * 60 * 1000) {
          // BUG FIX #4: Alarm fired while device was off — show missed alarm notification
          try {
            await self.registration.showNotification(
              `Missed: ${alarm.payload?.label || 'MARS Alarm'}`,
              {
                body: `This alarm fired at ${new Date(alarm.fire_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} while your device was off.`,
                icon: '/icons/icon-192.png',
                badge: '/icons/badge-72.png',
                tag: `missed-${alarm.alarm_id}`,
                requireInteraction: false,
                data: { alarm_id: alarm.alarm_id, missed: true, ...alarm.payload },
                actions: [{ action: 'dismiss', title: '\u2713 Dismiss' }],
              }
            );
          } catch (e) {
            console.warn('[MARS SW] Could not show missed alarm notification:', e);
          }
          // Expired alarms are NOT re-queued — just notify once
        }
        // Alarms older than 30 min are silently dropped
      }
      // Update cache to only keep still-pending alarms
      await cache.put('/mars/scheduled-alarms', new Response(JSON.stringify({ alarms: stillPending })));
      console.log(`[MARS SW] Restored ${stillPending.length} alarm(s) on activate`);
    }

    // Restore persisted links
    const linkResp = await cache.match('/mars/scheduled-links');
    if (linkResp) {
      const data = await linkResp.json();
      (data.links || []).forEach(link => {
        scheduleNextLinkOpen(link.link_id, link.time, link.days, link.url, link.device);
      });
    }
  })());
});

// ════════════════════════════════════════════════════════════════
//  PERIODIC BACKGROUND SYNC — alarm check + daily routine pre-fetch
//  (Android Chrome only — wakes SW every ~15 min even when app closed)
// ════════════════════════════════════════════════════════════════
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'mars-alarm-check') {
    event.waitUntil(checkAndFireDueAlarms());
  } else if (event.tag === 'mars-daily-refresh') {
    event.waitUntil(refreshTodaysRoutine());
  }
});

// ── Fired-alarm deduplication store ──────────────────────────────────────────
// Keeps a set of alarm IDs that have already been notified in this SW lifetime.
// Prevents the periodic check from re-firing an alarm that the in-memory timer
// already handled (or vice versa).
const firedAlarmIds = new Set();

// Persist fired IDs to cache so they survive a SW restart within the same session.
async function markAlarmFired(alarm_id) {
  firedAlarmIds.add(alarm_id);
  try {
    const cache = await caches.open(ALARM_CACHE);
    const resp = await cache.match('/mars/fired-alarms');
    const list = resp ? await resp.json() : [];
    if (!list.includes(alarm_id)) list.push(alarm_id);
    // Keep only the last 100 entries to avoid unbounded growth
    const trimmed = list.slice(-100);
    await cache.put('/mars/fired-alarms', new Response(JSON.stringify(trimmed), {
      headers: { 'Content-Type': 'application/json' },
    }));
  } catch {}
}

async function loadFiredAlarmIds() {
  try {
    const cache = await caches.open(ALARM_CACHE);
    const resp = await cache.match('/mars/fired-alarms');
    if (resp) {
      const list = await resp.json();
      list.forEach((id) => firedAlarmIds.add(id));
    }
  } catch {}
}

// Check the persisted alarm cache and fire any alarms that are due or overdue.
// This is the Android background fallback — called every ~15 min by periodicsync.
async function checkAndFireDueAlarms() {
  console.log('[MARS SW] Periodic alarm check...');
  await loadFiredAlarmIds();
  const cache = await caches.open(ALARM_CACHE);
  const alarmResp = await cache.match('/mars/scheduled-alarms');
  if (!alarmResp) return;

  const alarmData = await alarmResp.json();
  const now = Date.now();
  // Only fire alarms that are actually due (past their fire_at time) or
  // missed within the last 5 minutes. Do NOT fire alarms still in the future
  // — the in-memory scheduleAlarmTimer will handle those precisely.
  const MISSED_WINDOW_MS = 5 * 60 * 1000;
  const stillPending = [];

  for (const alarm of (alarmData.alarms || [])) {
    const fireTime = new Date(alarm.fire_at).getTime();

    if (fireTime <= now && (now - fireTime) <= MISSED_WINDOW_MS) {
      // Alarm is due or was missed within the last 5 min
      // Skip if already fired in this SW session
      if (firedAlarmIds.has(alarm.alarm_id)) {
        console.log(`[MARS SW] Periodic check: alarm ${alarm.alarm_id} already fired — skipping`);
        // Don't keep in pending — it's done
        continue;
      }
      const targetDevice = alarm.payload?.device || alarm.payload?.open_device || 'all';
      if (!shouldFireOnThisDevice(targetDevice)) {
        stillPending.push(alarm); // keep for other device
        continue;
      }
      const p = alarm.payload || {};
      const isMissed = (now - fireTime) > 60 * 1000; // >1 min late = "missed"
      const title = isMissed
        ? `Missed: ${p.label || 'MARS Alarm'}`
        : (p.label || 'MARS Alarm');
      const body = isMissed
        ? `This alarm was scheduled for ${new Date(fireTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : (p.body || 'Time to wake up!');
      try {
        await self.registration.showNotification(title, {
          body,
          icon:              '/icons/icon-192.png',
          badge:             '/icons/badge-72.png',
          vibrate:           [300, 100, 300, 100, 500],
          requireInteraction: !isMissed,
          data:              { alarm_id: alarm.alarm_id, missed: isMissed, ...p },
          tag:               alarm.alarm_id,
          renotify:          true,
          actions: isMissed
            ? [{ action: 'dismiss', title: '\u2713 Dismiss' }]
            : [
                { action: 'dismiss', title: '\u2713 Dismiss' },
                { action: 'snooze',  title: '\u23f1 Snooze 5m' },
              ],
        });
        await markAlarmFired(alarm.alarm_id);
        console.log(`[MARS SW] Periodic check fired alarm: ${alarm.alarm_id}`);
      } catch (e) {
        console.warn('[MARS SW] Periodic check — could not show notification:', e);
      }
      // Don't re-add to stillPending — alarm has fired
    } else if (fireTime > now) {
      // Still in the future — keep it and ensure in-memory timer is running
      stillPending.push(alarm);
      if (!scheduledAlarmTimers[alarm.alarm_id]) {
        scheduleAlarmTimer(alarm.alarm_id, alarm.fire_at, alarm.payload);
      }
    }
    // Alarms more than 5 min overdue are silently dropped
  }

  await cache.put('/mars/scheduled-alarms', new Response(JSON.stringify({ alarms: stillPending })));
  console.log(`[MARS SW] Periodic check done. ${stillPending.length} alarm(s) still pending.`);
}

async function refreshTodaysRoutine() {
  console.log('[MARS SW] Periodic sync — refreshing today\'s routine...');
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach((c) => c.postMessage({ type: 'MARS_DAILY_REFRESH' }));
}

console.log('[MARS SW] MARS Service Worker loaded —', MARS_VERSION);
