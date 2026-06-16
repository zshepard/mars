// api/version-check.js
// Vercel serverless function — POST /api/version-check
//
// Request body:  { version: "1.8.0", platform: "android" }
// Response:      { update_required, force_update, update_url, min_version, latest_version }
//
// To change version requirements, edit VERSION_CONFIG below.
// No database needed — deploy a new version of this file to update the policy.

// ── Version policy ────────────────────────────────────────────────────────────
// min_version:   Versions below this will see a flexible (dismissible) update prompt.
// force_version: Versions below this will see a forced (blocking) update prompt.
// latest_version: The current production version (informational only).
const VERSION_CONFIG = {
  android: {
    latest_version: '1.9.0',
    min_version:    '1.7.0',   // show flexible prompt for anything below this
    force_version:  '1.6.0',   // show force prompt for anything below this
    update_url:     'https://play.google.com/store/apps/details?id=com.marshealthhub.app',
  },
};

// ── Semver comparison helper ──────────────────────────────────────────────────
function semverLt(a, b) {
  // Returns true if version string a < version string b
  const pa = String(a || '0').split('.').map(Number);
  const pb = String(b || '0').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na < nb) return true;
    if (na > nb) return false;
  }
  return false; // equal
}

export default function handler(req, res) {
  // CORS — allow the MARS app and any native fetch
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { version = '0.0.0', platform = 'android' } = req.body || {};
  const config = VERSION_CONFIG[platform] || VERSION_CONFIG.android;

  const force_update    = semverLt(version, config.force_version);
  const update_required = force_update || semverLt(version, config.min_version);

  return res.status(200).json({
    update_required,
    force_update,
    update_url:      config.update_url,
    min_version:     config.min_version,
    latest_version:  config.latest_version,
  });
}
