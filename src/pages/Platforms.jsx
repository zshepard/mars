// src/pages/Platforms.jsx
import './Platforms.css';

const PLATFORMS = [
  { icon: 'ti-device-mobile',  label: 'iOS',          status: 'PWA install',   badge: 'green' },
  { icon: 'ti-device-mobile',  label: 'Android',      status: 'PWA + Play Store', badge: 'green' },
  { icon: 'ti-device-laptop',  label: 'macOS',        status: 'Web app',       badge: 'green' },
  { icon: 'ti-device-desktop', label: 'Windows',      status: 'Web app',       badge: 'green' },
  { icon: 'ti-world',          label: 'Web',          status: 'Live on Vercel', badge: 'green' },
  { icon: 'ti-watch',          label: 'Smartwatch',   status: 'In development', badge: 'amber' },
  { icon: 'ti-car',            label: 'Vehicle',      status: 'In development', badge: 'amber' },
  { icon: 'ti-home-2',         label: 'Mobile home',  status: 'In development', badge: 'amber' },
  { icon: 'ti-eyeglass',       label: 'Smart glasses','status': 'Planned',     badge: 'gray' },
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
  return (
    <div className="page-wrap">
      <div className="page-header">
        <h1 className="page-title">Platforms</h1>
      </div>

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
            {OFFLINE.map((f) => (
              <li key={f}><i className="ti ti-check" /> {f}</li>
            ))}
          </ul>
        </div>
        <div className="card">
          <div className="section-label"><i className="ti ti-wifi" /> Requires internet</div>
          <ul className="feature-list online">
            {ONLINE.map((f) => (
              <li key={f}><i className="ti ti-check" /> {f}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card deploy-status">
        <div className="section-label">Deployment status</div>
        <div className="deploy-row">
          <span><i className="ti ti-brand-vercel" /> Vercel (web)</span>
          <span className="badge badge-amber">Connect GitHub repo to activate</span>
        </div>
        <div className="deploy-row">
          <span><i className="ti ti-brand-firebase" /> Firebase (mars-d3745)</span>
          <span className="badge badge-amber">Enable Auth + Firestore</span>
        </div>
        <div className="deploy-row">
          <span><i className="ti ti-brand-google-play" /> Google Play (MARS)</span>
          <span className="badge badge-amber">Upload .aab via PWABuilder</span>
        </div>
      </div>
    </div>
  );
}
