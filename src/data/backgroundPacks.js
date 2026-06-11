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

  /* ─── 2026 TRENDING PACKS ───────────────────────────────────────────── */
  {
    section: '2026 TRENDING',
    packs: [
      // 1. Anthracite & Mint
      {
        id: 'anthracite-mint',
        label: 'Anthracite & Mint',
        preview: 'linear-gradient(135deg, #1c1c1e 0%, #2a2a2e 50%, #00e5a0 100%)',
        background: `
          radial-gradient(ellipse at 70% 20%, rgba(0,229,160,0.12) 0%, transparent 55%),
          radial-gradient(ellipse at 20% 80%, rgba(0,200,130,0.08) 0%, transparent 50%),
          #1c1c1e`,
        cssVars: {
          '--green':     '#00e5a0',
          '--green-dim': 'rgba(0,229,160,0.14)',
          '--bg':        '#1c1c1e',
          '--bg2':       '#242428',
          '--bg3':       '#2e2e34',
          '--border':    'rgba(0,229,160,0.18)',
          '--border2':   'rgba(0,229,160,0.35)',
          '--text':      '#e8f8f2',
          '--text2':     '#90b0a4',
          '--text3':     '#5a7a6e',
          '--accent':    '#00e5a0',
        },
      },
      // 2. Dracula
      {
        id: 'dracula',
        label: 'Dracula',
        preview: 'linear-gradient(135deg, #282a36 0%, #44475a 40%, #ff79c6 70%, #50fa7b 100%)',
        background: `
          radial-gradient(ellipse at 60% 30%, rgba(255,121,198,0.12) 0%, transparent 55%),
          radial-gradient(ellipse at 25% 75%, rgba(80,250,123,0.08) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 80%, rgba(189,147,249,0.10) 0%, transparent 45%),
          #282a36`,
        cssVars: {
          '--green':     '#50fa7b',
          '--green-dim': 'rgba(80,250,123,0.14)',
          '--bg':        '#282a36',
          '--bg2':       '#313344',
          '--bg3':       '#3d3f52',
          '--border':    'rgba(68,71,90,0.8)',
          '--border2':   'rgba(255,121,198,0.35)',
          '--text':      '#f8f8f2',
          '--text2':     '#bd93f9',
          '--text3':     '#6272a4',
          '--accent':    '#ff79c6',
        },
      },
      // 3. Lava Core
      {
        id: 'lava-core',
        label: 'Lava Core',
        preview: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 40%, #ff4d4d 70%, #ff8c69 100%)',
        background: `
          radial-gradient(ellipse at 65% 25%, rgba(255,77,77,0.15) 0%, transparent 55%),
          radial-gradient(ellipse at 20% 70%, rgba(255,140,105,0.10) 0%, transparent 50%),
          repeating-linear-gradient(
            45deg,
            rgba(255,77,77,0.02) 0px, rgba(255,77,77,0.02) 1px,
            transparent 1px, transparent 10px
          ),
          #1a1a1a`,
        cssVars: {
          '--green':     '#ff4d4d',
          '--green-dim': 'rgba(255,77,77,0.14)',
          '--bg':        '#1a1a1a',
          '--bg2':       '#222222',
          '--bg3':       '#2c2c2c',
          '--border':    'rgba(255,77,77,0.20)',
          '--border2':   'rgba(255,77,77,0.40)',
          '--text':      '#fff0ee',
          '--text2':     '#c49090',
          '--text3':     '#8a5050',
          '--accent':    '#ff4d4d',
        },
      },
      // 4. Transformative Teal
      {
        id: 'transformative-teal',
        label: 'Transformative Teal',
        preview: 'linear-gradient(135deg, #0a1628 0%, #0d2137 40%, #00897b 70%, #1565c0 100%)',
        background: `
          radial-gradient(ellipse at 60% 30%, rgba(0,137,123,0.18) 0%, transparent 55%),
          radial-gradient(ellipse at 20% 70%, rgba(21,101,192,0.15) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 80%, rgba(0,120,110,0.10) 0%, transparent 45%),
          #0a1628`,
        cssVars: {
          '--green':     '#00bfa5',
          '--green-dim': 'rgba(0,191,165,0.14)',
          '--bg':        '#0a1628',
          '--bg2':       '#0d1e35',
          '--bg3':       '#112540',
          '--border':    'rgba(0,137,123,0.22)',
          '--border2':   'rgba(0,191,165,0.40)',
          '--text':      '#e0f4f1',
          '--text2':     '#80b8b2',
          '--text3':     '#406e6a',
          '--accent':    '#00bfa5',
        },
      },
      // 5. Pistachio & Sage
      {
        id: 'pistachio-sage',
        label: 'Pistachio & Sage',
        preview: 'linear-gradient(135deg, #f5f0e8 0%, #e8ede0 50%, #93a87a 100%)',
        background: `
          radial-gradient(ellipse at 60% 30%, rgba(147,168,122,0.15) 0%, transparent 60%),
          radial-gradient(ellipse at 20% 80%, rgba(120,145,95,0.10) 0%, transparent 55%),
          #f5f0e8`,
        cssVars: {
          '--green':     '#5a7a40',
          '--green-dim': 'rgba(90,122,64,0.12)',
          '--bg':        '#f5f0e8',
          '--bg2':       '#ede8dc',
          '--bg3':       '#e0dbd0',
          '--border':    'rgba(90,122,64,0.18)',
          '--border2':   'rgba(90,122,64,0.35)',
          '--text':      '#2a3020',
          '--text2':     '#5a6a48',
          '--text3':     '#8a9a78',
          '--accent':    '#5a7a40',
        },
      },
      // 6. Plum Noir
      {
        id: 'plum-noir',
        label: 'Plum Noir',
        preview: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 40%, #7b2d8b 70%, #c084fc 100%)',
        background: `
          radial-gradient(ellipse at 60% 30%, rgba(123,45,139,0.20) 0%, transparent 55%),
          radial-gradient(ellipse at 20% 70%, rgba(192,132,252,0.10) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 80%, rgba(100,30,120,0.15) 0%, transparent 45%),
          #1a0a2e`,
        cssVars: {
          '--green':     '#c084fc',
          '--green-dim': 'rgba(192,132,252,0.14)',
          '--bg':        '#1a0a2e',
          '--bg2':       '#22103a',
          '--bg3':       '#2c1848',
          '--border':    'rgba(123,45,139,0.25)',
          '--border2':   'rgba(192,132,252,0.40)',
          '--text':      '#f0e8ff',
          '--text2':     '#b090d0',
          '--text3':     '#7050a0',
          '--accent':    '#c084fc',
        },
      },
      // 7. Digital Peach & Indigo
      {
        id: 'digital-peach-indigo',
        label: 'Digital Peach & Indigo',
        preview: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #f97316 70%, #fcd5b0 100%)',
        background: `
          radial-gradient(ellipse at 65% 25%, rgba(249,115,22,0.14) 0%, transparent 55%),
          radial-gradient(ellipse at 20% 70%, rgba(49,46,129,0.90) 0%, transparent 60%),
          radial-gradient(ellipse at 80% 80%, rgba(252,213,176,0.06) 0%, transparent 40%),
          #1e1b4b`,
        cssVars: {
          '--green':     '#f97316',
          '--green-dim': 'rgba(249,115,22,0.14)',
          '--bg':        '#1e1b4b',
          '--bg2':       '#262358',
          '--bg3':       '#302c68',
          '--border':    'rgba(249,115,22,0.20)',
          '--border2':   'rgba(249,115,22,0.40)',
          '--text':      '#fef3e8',
          '--text2':     '#c4a080',
          '--text3':     '#806050',
          '--accent':    '#f97316',
        },
      },
      // 8. Persimmon & Wasabi
      {
        id: 'persimmon-wasabi',
        label: 'Persimmon & Wasabi',
        preview: 'linear-gradient(135deg, #1a1200 0%, #2a1800 40%, #e85d04 65%, #a3b800 100%)',
        background: `
          radial-gradient(ellipse at 60% 25%, rgba(232,93,4,0.18) 0%, transparent 55%),
          radial-gradient(ellipse at 25% 75%, rgba(163,184,0,0.14) 0%, transparent 50%),
          #1a1200`,
        cssVars: {
          '--green':     '#a3b800',
          '--green-dim': 'rgba(163,184,0,0.14)',
          '--bg':        '#1a1200',
          '--bg2':       '#221800',
          '--bg3':       '#2c2000',
          '--border':    'rgba(232,93,4,0.22)',
          '--border2':   'rgba(163,184,0,0.38)',
          '--text':      '#fff8e0',
          '--text2':     '#c4a840',
          '--text3':     '#8a7020',
          '--accent':    '#e85d04',
        },
      },
      // 9. Rebel Pink
      {
        id: 'rebel-pink',
        label: 'Rebel Pink',
        preview: 'linear-gradient(135deg, #f8f4f0 0%, #f0e8e4 50%, #e91e8c 100%)',
        background: `
          radial-gradient(ellipse at 70% 20%, rgba(233,30,140,0.12) 0%, transparent 55%),
          radial-gradient(ellipse at 20% 80%, rgba(233,30,140,0.07) 0%, transparent 50%),
          #f8f4f0`,
        cssVars: {
          '--green':     '#c2006e',
          '--green-dim': 'rgba(194,0,110,0.12)',
          '--bg':        '#f8f4f0',
          '--bg2':       '#ede8e4',
          '--bg3':       '#e0dbd6',
          '--border':    'rgba(233,30,140,0.18)',
          '--border2':   'rgba(233,30,140,0.38)',
          '--text':      '#1a0010',
          '--text2':     '#7a2050',
          '--text3':     '#b06080',
          '--accent':    '#e91e8c',
        },
      },
      // 10. Cloud Dancer & Tech Violet
      {
        id: 'cloud-dancer-violet',
        label: 'Cloud Dancer & Tech Violet',
        preview: 'linear-gradient(135deg, #faf9f6 0%, #f0eef8 50%, #7c3aed 100%)',
        background: `
          radial-gradient(ellipse at 65% 25%, rgba(124,58,237,0.10) 0%, transparent 60%),
          radial-gradient(ellipse at 20% 80%, rgba(124,58,237,0.06) 0%, transparent 55%),
          #faf9f6`,
        cssVars: {
          '--green':     '#5b21b6',
          '--green-dim': 'rgba(91,33,182,0.10)',
          '--bg':        '#faf9f6',
          '--bg2':       '#f0eef8',
          '--bg3':       '#e4e0f0',
          '--border':    'rgba(124,58,237,0.16)',
          '--border2':   'rgba(124,58,237,0.32)',
          '--text':      '#1a1030',
          '--text2':     '#5040a0',
          '--text3':     '#9080c0',
          '--accent':    '#7c3aed',
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
