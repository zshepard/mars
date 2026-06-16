// src/components/WhatsNew.jsx
// "What's New" modal — shown once per app version after an update.
// Triggered by the native app setting window.__MARS_APP_VERSION__ in the bridge,
// or by a version bump in the CHANGELOG below.
// Falls back gracefully on web (non-native) by reading localStorage.

import { useState, useEffect } from 'react';
import './WhatsNew.css';

const STORAGE_KEY = 'mars-whats-new-seen-web';

// ── Changelog — add one entry per release ─────────────────────────────────────
// Keep the most recent version first.
export const CHANGELOG = [
  {
    version: '1.9.0',
    date: 'Jun 2026',
    items: [
      'Google Sign-In fixed — faster, more reliable login',
      'Server-driven update system — critical updates delivered instantly',
      'Force-update mode for security patches',
      'What\'s New modal — see exactly what changed after every update',
    ],
  },
  {
    version: '1.8.0',
    date: 'Jun 2026',
    items: [
      'Six Sigma & Lean refactor — faster startup, fewer bugs',
      'Merged duplicate alarm handlers for reliability',
      'Update banner improvements',
    ],
  },
  {
    version: '1.7.0',
    date: 'Jun 2026',
    items: [
      'Native MARS-styled login screen',
      'Google Sign-In before the app loads',
      'Continue as Guest option',
    ],
  },
];

const LATEST = CHANGELOG[0];

function getSeenVersion() {
  return localStorage.getItem(STORAGE_KEY) || null;
}

function markSeen(version) {
  localStorage.setItem(STORAGE_KEY, version);
}

export default function WhatsNew() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Determine which version to check against:
    // 1. If running inside native WebView, use the injected app version
    // 2. Otherwise use the latest changelog version
    const appVersion =
      (typeof window !== 'undefined' && window.__MARS_APP_VERSION__) ||
      LATEST.version;

    const seen = getSeenVersion();
    if (seen !== appVersion) {
      // Small delay so the dashboard renders first
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  function handleClose() {
    const appVersion =
      (typeof window !== 'undefined' && window.__MARS_APP_VERSION__) ||
      LATEST.version;
    markSeen(appVersion);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="wn-backdrop" onClick={handleClose}>
      <div className="wn-sheet" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="wn-header">
          <span className="wn-badge">NEW IN MARS</span>
          <h2 className="wn-title">What's New</h2>
          <p className="wn-version">v{LATEST.version} · {LATEST.date}</p>
        </div>

        <div className="wn-divider" />

        {/* Changelog items */}
        <ul className="wn-list">
          {LATEST.items.map((item, i) => (
            <li key={i} className="wn-item">
              <span className="wn-bullet">•</span>
              <span className="wn-text">{item}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button className="wn-btn" onClick={handleClose}>
          Got it
        </button>

      </div>
    </div>
  );
}
