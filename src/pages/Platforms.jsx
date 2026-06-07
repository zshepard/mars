// src/pages/Platforms.jsx
import { useState, useEffect } from 'react';
import './Platforms.css';

function detectDevice() {
  const ua = navigator.userAgent;
  const info = {};

  info.isMARSApp = /MARS-App/.test(ua);

  // OS
  if (/Windows NT 10/.test(ua))        { info.os = 'Windows 11 / 10'; info.osIcon = 'ti-brand-windows'; }
  else if (/Windows NT 6\.3/.test(ua)) { info.os = 'Windows 8.1';     info.osIcon = 'ti-brand-windows'; }
  else if (/Windows NT 6\.1/.test(ua)) { info.os = 'Windows 7';       info.osIcon = 'ti-brand-windows'; }
  else if (/Windows/.test(ua))         { info.os = 'Windows';         info.osIcon = 'ti-brand-windows'; }
  else if (/Android/.test(ua)) {
    const ver = ua.match(/Android ([\d.]+)/);
    info.os = `Android ${ver ? ver[1] : ''}`.trim();
    info.osIcon = 'ti-brand-android';
  }
  else if (/iPhone|iPad|iPod/.test(ua)) {
    const ver = ua.match(/OS ([\d_]+)/);
    info.os = `iOS ${ver ? ver[1].replace(/_/g, '.') : ''}`.trim();
    info.osIcon = 'ti-brand-apple';
  }
  else if (/Mac OS X/.test(ua)) {
    const ver = ua.match(/Mac OS X ([\d_]+)/);
    info.os = `macOS ${ver ? ver[1].replace(/_/g, '.') : ''}`.trim();
    info.osIcon = 'ti-brand-apple';
  }
  else if (/Linux/.test(ua))  { info.os = 'Linux';    info.osIcon = 'ti-brand-ubuntu'; }
  else if (/CrOS/.test(ua))   { info.os = 'ChromeOS'; info.osIcon = 'ti-brand-chrome'; }
  else                        { info.os = 'Unknown';  info.osIcon = 'ti-device-desktop'; }

  // Android device model
  if (/Android/.test(ua)) {
    const m = ua.match(/Android[\d. ]+;\s*([^)]+?)\s*(Build\/|MIUI|EMUI|\))/);
    if (m) {
      let model = m[1].trim().replace(/\s*(Build|MIUI|EMUI|HarmonyOS).*$/i, '').trim();
      info.deviceModel = model;
      const brands = {
        'SM-':'Samsung','Galaxy':'Samsung','Pixel':'Google','Nexus':'Google',
        'OnePlus':'OnePlus','Redmi':'Xiaomi','POCO':'Xiaomi','Mi ':'Xiaomi',
        'HUAWEI':'Huawei','Moto':'Motorola','XT':'Motorola','LM-':'LG','LG-':'LG',
        'CPH':'OPPO','OPPO':'OPPO','vivo':'Vivo','V2':'Vivo','Nokia':'Nokia',
        'TA-':'Nokia','TCL':'TCL','realme':'realme','RMX':'realme','ZTE':'ZTE',
        'ASUS':'ASUS','XQ-':'Sony','Sony':'Sony',
      };
      for (const [k, v] of Object.entries(brands)) {
        if (model.startsWith(k) || model.includes(k)) { info.brand = v; break; }
      }
      if (!info.brand) info.brand = 'Android';
    } else {
      info.deviceModel = 'Android Device'; info.brand = 'Android';
    }
    info.deviceIcon = 'ti-device-mobile'; info.deviceType = 'Smartphone';
  }
  else if (/Windows/.test(ua)) {
    info.deviceType = navigator.maxTouchPoints > 0 ? 'Laptop / Tablet' : 'Desktop PC';
    info.deviceIcon = navigator.maxTouchPoints > 0 ? 'ti-device-laptop' : 'ti-device-desktop';
    info.brand = 'Windows PC'; info.deviceModel = '';
  }
  else if (/Mac OS X/.test(ua) && !/iPhone|iPad/.test(ua)) {
    info.deviceType = 'Mac'; info.deviceIcon = 'ti-device-laptop';
    info.brand = 'Apple'; info.deviceModel = 'Mac';
  }
  else if (/iPhone/.test(ua)) {
    info.deviceType = 'iPhone'; info.deviceIcon = 'ti-device-mobile';
    info.brand = 'Apple'; info.deviceModel = 'iPhone';
  }
  else if (/iPad/.test(ua)) {
    info.deviceType = 'iPad'; info.deviceIcon = 'ti-device-tablet';
    info.brand = 'Apple'; info.deviceModel = 'iPad';
  }
  else if (/CrOS/.test(ua)) {
    info.deviceType = 'Chromebook'; info.deviceIcon = 'ti-device-laptop';
    info.brand = 'Chromebook'; info.deviceModel = '';
  }
  else {
    info.deviceType = 'Unknown Device'; info.deviceIcon = 'ti-device-desktop';
    info.brand = ''; info.deviceModel = '';
  }

  // Browser
  if (/Edg\//.test(ua))               { info.browser = 'Microsoft Edge';   info.browserIcon = 'ti-brand-edge'; }
  else if (/OPR\/|Opera/.test(ua))    { info.browser = 'Opera';            info.browserIcon = 'ti-browser'; }
  else if (/SamsungBrowser/.test(ua)) { info.browser = 'Samsung Internet'; info.browserIcon = 'ti-browser'; }
  else if (/Chrome\//.test(ua))       { info.browser = 'Chrome';           info.browserIcon = 'ti-brand-chrome'; }
  else if (/Firefox\//.test(ua))      { info.browser = 'Firefox';          info.browserIcon = 'ti-brand-firefox'; }
  else if (/Safari\//.test(ua))       { info.browser = 'Safari';           info.browserIcon = 'ti-brand-safari'; }
  else                                { info.browser = 'Browser';          info.browserIcon = 'ti-browser'; }

  info.screen   = `${window.screen.width} × ${window.screen.height}`;
  info.pixelRatio = window.devicePixelRatio ? `${window.devicePixelRatio}x` : '1x';
  info.viewport = `${window.innerWidth} × ${window.innerHeight}`;
  if (navigator.deviceMemory)       info.memory = `${navigator.deviceMemory} GB RAM`;
  if (navigator.hardwareConcurrency) info.cores  = `${navigator.hardwareConcurrency} cores`;
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (conn) {
    info.connection = conn.effectiveType ? conn.effectiveType.toUpperCase() : 'Unknown';
    if (conn.downlink) info.connection += ` · ${conn.downlink} Mbps`;
  }
  info.touch    = navigator.maxTouchPoints > 0 ? `Yes (${navigator.maxTouchPoints} points)` : 'No';
  info.language = navigator.language || 'Unknown';
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Convert IANA timezone ID to a friendly display name
    const tzFriendly = tz
      .replace('America/New_York',      'Eastern Time (ET)')
      .replace('America/Chicago',       'Central Time (CT)')
      .replace('America/Denver',        'Mountain Time (MT)')
      .replace('America/Los_Angeles',   'Pacific Time (PT)')
      .replace('America/Phoenix',       'Arizona (MT no DST)')
      .replace('America/Anchorage',     'Alaska Time (AKT)')
      .replace('Pacific/Honolulu',      'Hawaii Time (HT)')
      .replace('America/Puerto_Rico',   'Atlantic Time (AT)')
      .replace(/_/g, ' ');
    info.timezone = tzFriendly;
  } catch { info.timezone = 'Unknown'; }

  return info;
}

const PLATFORMS = [
  { icon: 'ti-device-mobile',  label: 'Android',       status: 'PWA + Play Store', badge: 'green' },
  { icon: 'ti-device-laptop',  label: 'Windows',       status: 'Web app',          badge: 'green' },
  { icon: 'ti-device-laptop',  label: 'macOS',         status: 'Web app',          badge: 'green' },
  { icon: 'ti-world',          label: 'Web',           status: 'Live on Vercel',   badge: 'green' },
  { icon: 'ti-watch',          label: 'Smartwatch',    status: 'In development',   badge: 'amber' },
  { icon: 'ti-car',            label: 'Vehicle',       status: 'In development',   badge: 'amber' },
  { icon: 'ti-eyeglass',       label: 'Smart glasses', status: 'Planned',          badge: 'gray'  },
];

const OFFLINE = [
  'Alarms fire on schedule',
  'Voice commands (all 20 presets)',
  'Home control (actions queued)',
  'Routine flow continues',
  'Health data logging',
];

const ONLINE = [
  'Cloud sync across all devices',
  'Push notifications (remote)',
  'AI insights',
  'URL auto-open on other devices',
  'Real-time Firebase updates',
];

export default function Platforms() {
  const [device, setDevice] = useState(null);
  useEffect(() => { setDevice(detectDevice()); }, []);

  return (
    <div className="page-wrap">
      <div className="page-header">
        <h1 className="page-title">Platforms</h1>
      </div>

      {device && (
        <div className="card device-detect-card">
          <div className="device-detect-header">
            <i className={`ti ${device.deviceIcon} device-detect-icon`} />
            <div>
              <div className="device-detect-name">
                {device.brand && <span className="device-brand">{device.brand} </span>}
                {device.deviceModel || device.deviceType}
              </div>
              <div className="device-detect-sub">
                <i className={`ti ${device.osIcon}`} /> {device.os}
                {device.isMARSApp && (
                  <span className="badge badge-green" style={{ marginLeft: 8 }}>MARS App</span>
                )}
              </div>
            </div>
          </div>

          <div className="device-specs-grid">
            <div className="spec-item">
              <span className="spec-label"><i className="ti ti-browser" /> Browser</span>
              <span className="spec-value"><i className={`ti ${device.browserIcon}`} /> {device.browser}</span>
            </div>
            <div className="spec-item">
              <span className="spec-label"><i className="ti ti-device-desktop-analytics" /> Screen</span>
              <span className="spec-value">{device.screen} @ {device.pixelRatio}</span>
            </div>
            <div className="spec-item">
              <span className="spec-label"><i className="ti ti-layout" /> Viewport</span>
              <span className="spec-value">{device.viewport}</span>
            </div>
            {device.memory && (
              <div className="spec-item">
                <span className="spec-label"><i className="ti ti-cpu" /> Memory</span>
                <span className="spec-value">{device.memory}</span>
              </div>
            )}
            {device.cores && (
              <div className="spec-item">
                <span className="spec-label"><i className="ti ti-cpu-2" /> CPU</span>
                <span className="spec-value">{device.cores}</span>
              </div>
            )}
            {device.connection && (
              <div className="spec-item">
                <span className="spec-label"><i className="ti ti-wifi" /> Network</span>
                <span className="spec-value">{device.connection}</span>
              </div>
            )}
            <div className="spec-item">
              <span className="spec-label"><i className="ti ti-hand-finger" /> Touch</span>
              <span className="spec-value">{device.touch}</span>
            </div>
            <div className="spec-item">
              <span className="spec-label"><i className="ti ti-clock" /> Timezone</span>
              <span className="spec-value">{device.timezone}</span>
            </div>
            <div className="spec-item">
              <span className="spec-label"><i className="ti ti-language" /> Language</span>
              <span className="spec-value">{device.language}</span>
            </div>
          </div>
        </div>
      )}

      <div className="platform-grid">
        {PLATFORMS.map((p) => (
          <div key={p.label} className="platform-card card">
            <i className={`ti ${p.icon} platform-icon`} />
            <div className="platform-label">{p.label}</div>
            <span className={`badge badge-${p.badge}`}>{p.status}</span>
          </div>
        ))}
      </div>

      <div className="feature-compare">
        <div className="card">
          <div className="section-label"><i className="ti ti-wifi-off" /> Works offline</div>
          <ul className="feature-list">
            {OFFLINE.map((f) => <li key={f}><i className="ti ti-check" /> {f}</li>)}
          </ul>
        </div>
        <div className="card">
          <div className="section-label"><i className="ti ti-wifi" /> Requires internet</div>
          <ul className="feature-list online">
            {ONLINE.map((f) => <li key={f}><i className="ti ti-check" /> {f}</li>)}
          </ul>
        </div>
      </div>

      <div className="card deploy-status">
        <div className="section-label">Deployment status</div>
        <div className="deploy-row">
          <span><i className="ti ti-brand-vercel" /> Vercel (web)</span>
          <span className="badge badge-green">Live</span>
        </div>
        <div className="deploy-row">
          <span><i className="ti ti-brand-firebase" /> Firebase (mars-d3745)</span>
          <span className="badge badge-green">Active</span>
        </div>
        <div className="deploy-row">
          <span><i className="ti ti-brand-google-play" /> Google Play (MARS)</span>
          <span className="badge badge-amber">Pending review</span>
        </div>
      </div>
    </div>
  );
}
