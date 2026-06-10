/**
 * MARS Background Packs
 * Each pack defines a CSS `background` value applied to the app root.
 */

export const BACKGROUND_PACKS = [
  /* ─── DEFAULT ─────────────────────────────────────────────────────── */
  {
    section: 'DEFAULT',
    packs: [
      {
        id: 'default-dark',
        label: 'Default Dark',
        preview: 'linear-gradient(135deg, #080808 0%, #111 100%)',
        background: null, // null = use CSS variables (original theme)
        textColor: null,
      },
    ],
  },

  /* ─── MILITARY BRANCHES ───────────────────────────────────────────── */
  {
    section: 'MILITARY BRANCHES',
    packs: [
      {
        id: 'us-army',
        label: 'U.S. Army',
        preview: 'linear-gradient(135deg, #4b5320 0%, #78866b 40%, #f8c300 70%, #000 100%)',
        background: `
          radial-gradient(ellipse at 20% 30%, rgba(75,83,32,0.95) 0%, transparent 60%),
          radial-gradient(ellipse at 80% 70%, rgba(120,134,107,0.9) 0%, transparent 55%),
          radial-gradient(ellipse at 50% 50%, rgba(30,30,20,1) 0%, transparent 80%),
          repeating-linear-gradient(
            45deg,
            rgba(75,83,32,0.3) 0px, rgba(75,83,32,0.3) 8px,
            rgba(120,134,107,0.2) 8px, rgba(120,134,107,0.2) 16px,
            rgba(30,30,20,0.4) 16px, rgba(30,30,20,0.4) 24px,
            rgba(100,110,60,0.2) 24px, rgba(100,110,60,0.2) 32px
          ),
          #1a1e0a`,
      },
      {
        id: 'us-navy',
        label: 'U.S. Navy',
        preview: 'linear-gradient(135deg, #000080 0%, #1c2b5e 40%, #c8a951 70%, #fff 100%)',
        background: `
          radial-gradient(ellipse at 30% 20%, rgba(0,0,128,0.9) 0%, transparent 60%),
          radial-gradient(ellipse at 70% 80%, rgba(28,43,94,0.95) 0%, transparent 55%),
          repeating-linear-gradient(
            0deg,
            rgba(0,0,80,0.4) 0px, rgba(0,0,80,0.4) 4px,
            rgba(28,43,94,0.3) 4px, rgba(28,43,94,0.3) 12px,
            rgba(10,20,60,0.5) 12px, rgba(10,20,60,0.5) 16px
          ),
          #050a1e`,
      },
      {
        id: 'us-air-force',
        label: 'U.S. Air Force',
        preview: 'linear-gradient(135deg, #003087 0%, #0066cc 40%, #c0c0c0 70%, #fff 100%)',
        background: `
          radial-gradient(ellipse at 50% 0%, rgba(0,102,204,0.7) 0%, transparent 70%),
          radial-gradient(ellipse at 20% 80%, rgba(0,48,135,0.9) 0%, transparent 60%),
          repeating-linear-gradient(
            60deg,
            rgba(0,48,135,0.3) 0px, rgba(0,48,135,0.3) 6px,
            rgba(0,102,204,0.2) 6px, rgba(0,102,204,0.2) 14px,
            rgba(192,192,192,0.1) 14px, rgba(192,192,192,0.1) 20px
          ),
          #020b22`,
      },
      {
        id: 'us-marines',
        label: 'U.S. Marines',
        preview: 'linear-gradient(135deg, #8b0000 0%, #c41e3a 30%, #d4af37 60%, #000 100%)',
        background: `
          radial-gradient(ellipse at 40% 30%, rgba(139,0,0,0.9) 0%, transparent 55%),
          radial-gradient(ellipse at 80% 70%, rgba(196,30,58,0.8) 0%, transparent 50%),
          repeating-linear-gradient(
            -45deg,
            rgba(139,0,0,0.35) 0px, rgba(139,0,0,0.35) 8px,
            rgba(20,10,10,0.5) 8px, rgba(20,10,10,0.5) 16px,
            rgba(196,30,58,0.2) 16px, rgba(196,30,58,0.2) 24px,
            rgba(10,5,5,0.4) 24px, rgba(10,5,5,0.4) 32px
          ),
          #0f0303`,
      },
      {
        id: 'us-coast-guard',
        label: 'U.S. Coast Guard',
        preview: 'linear-gradient(135deg, #003366 0%, #0066cc 40%, #ff6600 60%, #fff 100%)',
        background: `
          radial-gradient(ellipse at 30% 50%, rgba(0,51,102,0.95) 0%, transparent 60%),
          radial-gradient(ellipse at 75% 25%, rgba(0,102,204,0.8) 0%, transparent 55%),
          repeating-linear-gradient(
            30deg,
            rgba(0,51,102,0.4) 0px, rgba(0,51,102,0.4) 10px,
            rgba(255,102,0,0.15) 10px, rgba(255,102,0,0.15) 14px,
            rgba(0,30,70,0.5) 14px, rgba(0,30,70,0.5) 22px
          ),
          #010c1f`,
      },
      {
        id: 'us-space-force',
        label: 'U.S. Space Force',
        preview: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 70%, #533483 100%)',
        background: `
          radial-gradient(ellipse at 50% 50%, rgba(83,52,131,0.6) 0%, transparent 70%),
          radial-gradient(ellipse at 20% 20%, rgba(15,52,96,0.9) 0%, transparent 55%),
          radial-gradient(ellipse at 80% 80%, rgba(26,26,46,1) 0%, transparent 60%),
          repeating-radial-gradient(
            circle at 50% 50%,
            rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px,
            transparent 1px, transparent 40px
          ),
          #05050f`,
      },
    ],
  },

  /* ─── MARS THEMES ─────────────────────────────────────────────────────── */
  {
    section: 'MARS THEMES',
    packs: [
      {
        id: 'mars-red',
        label: 'MARS Red',
        preview: 'linear-gradient(135deg, #0d1117 0%, #1a0a0a 40%, #e63946 70%, #ff6b35 100%)',
        background: `
          radial-gradient(ellipse at 60% 30%, rgba(230,57,70,0.18) 0%, transparent 55%),
          radial-gradient(ellipse at 20% 70%, rgba(193,68,14,0.15) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 80%, rgba(255,107,53,0.10) 0%, transparent 45%),
          radial-gradient(ellipse at 50% 50%, rgba(13,17,23,1) 0%, transparent 80%),
          #0d1117`,
        cssVars: {
          '--green':     '#e63946',
          '--green-dim': 'rgba(230,57,70,0.15)',
          '--bg':        '#0d1117',
          '--bg2':       '#13191f',
          '--bg3':       '#1a2030',
          '--border':    'rgba(230,57,70,0.18)',
          '--border2':   'rgba(230,57,70,0.32)',
          '--text':      '#f0e6e6',
          '--text2':     '#c4a8a8',
          '--text3':     '#8a6060',
        },
      },
      {
        id: 'mars-deep-space',
        label: 'MARS Deep Space',
        preview: 'linear-gradient(135deg, #080c14 0%, #0f1624 40%, #c1440e 65%, #ff6b35 85%, #ffd580 100%)',
        background: `
          radial-gradient(ellipse at 55% 25%, rgba(193,68,14,0.22) 0%, transparent 50%),
          radial-gradient(ellipse at 15% 60%, rgba(230,57,70,0.12) 0%, transparent 45%),
          radial-gradient(ellipse at 85% 75%, rgba(255,107,53,0.14) 0%, transparent 40%),
          radial-gradient(ellipse at 40% 90%, rgba(255,213,128,0.06) 0%, transparent 35%),
          repeating-linear-gradient(
            0deg,
            transparent 0px, transparent 3px,
            rgba(193,68,14,0.03) 3px, rgba(193,68,14,0.03) 4px
          ),
          #080c14`,
        cssVars: {
          '--green':     '#ff6b35',
          '--green-dim': 'rgba(255,107,53,0.15)',
          '--bg':        '#080c14',
          '--bg2':       '#0f1624',
          '--bg3':       '#161e30',
          '--border':    'rgba(193,68,14,0.20)',
          '--border2':   'rgba(255,107,53,0.35)',
          '--text':      '#ffe8d6',
          '--text2':     '#c49070',
          '--text3':     '#8a5040',
        },
      },
      {
        id: 'mars-ember',
        label: 'MARS Ember',
        preview: 'linear-gradient(135deg, #100808 0%, #2a0e0e 40%, #8b0000 65%, #e63946 85%, #ff6b35 100%)',
        background: `
          radial-gradient(ellipse at 50% 40%, rgba(139,0,0,0.35) 0%, transparent 60%),
          radial-gradient(ellipse at 20% 20%, rgba(230,57,70,0.20) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 80%, rgba(255,107,53,0.18) 0%, transparent 45%),
          repeating-linear-gradient(
            135deg,
            rgba(139,0,0,0.06) 0px, rgba(139,0,0,0.06) 1px,
            transparent 1px, transparent 8px
          ),
          #100808`,
        cssVars: {
          '--green':     '#e63946',
          '--green-dim': 'rgba(230,57,70,0.18)',
          '--bg':        '#100808',
          '--bg2':       '#1a0e0e',
          '--bg3':       '#241414',
          '--border':    'rgba(139,0,0,0.30)',
          '--border2':   'rgba(230,57,70,0.45)',
          '--text':      '#ffe0e0',
          '--text2':     '#c48080',
          '--text3':     '#8a4040',
        },
      },
    ],
  },
];

/** Flat list of all packs for easy lookup by id */
export const ALL_PACKS = BACKGROUND_PACKS.flatMap(s => s.packs);

/** Get a pack by id */
export function getPackById(id) {
  return ALL_PACKS.find(p => p.id === id) || null;
}
