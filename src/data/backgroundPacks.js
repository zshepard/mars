/**
 * MARS Background Packs
 * Each pack defines a CSS `background` value applied to the app root.
 * Camouflage patterns are generated with CSS gradients — no images needed.
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

  /* ─── CLASSIC CAMOUFLAGE ──────────────────────────────────────────── */
  {
    section: 'CLASSIC CAMOUFLAGE',
    packs: [
      {
        id: 'woodland-m81',
        label: 'M81 Woodland',
        preview: 'linear-gradient(135deg, #4b5320 0%, #556b2f 25%, #8b7355 50%, #2d4a1e 75%, #1a2e0a 100%)',
        background: `
          radial-gradient(ellipse 120px 80px at 10% 20%, rgba(75,83,32,1) 0%, transparent 100%),
          radial-gradient(ellipse 90px 120px at 35% 60%, rgba(45,74,30,1) 0%, transparent 100%),
          radial-gradient(ellipse 140px 60px at 60% 15%, rgba(85,107,47,1) 0%, transparent 100%),
          radial-gradient(ellipse 80px 100px at 80% 45%, rgba(139,115,85,1) 0%, transparent 100%),
          radial-gradient(ellipse 110px 90px at 20% 80%, rgba(26,46,10,1) 0%, transparent 100%),
          radial-gradient(ellipse 100px 70px at 55% 75%, rgba(75,83,32,0.9) 0%, transparent 100%),
          radial-gradient(ellipse 70px 110px at 90% 85%, rgba(45,74,30,0.95) 0%, transparent 100%),
          radial-gradient(ellipse 130px 50px at 45% 40%, rgba(30,20,10,0.8) 0%, transparent 100%),
          #3a4a1a`,
      },
      {
        id: 'desert-dcu',
        label: 'Desert (DCU)',
        preview: 'linear-gradient(135deg, #c2a06e 0%, #d4b483 25%, #8b7355 50%, #a0896a 75%, #6b5a3e 100%)',
        background: `
          radial-gradient(ellipse 130px 70px at 15% 25%, rgba(194,160,110,1) 0%, transparent 100%),
          radial-gradient(ellipse 80px 110px at 40% 55%, rgba(107,90,62,1) 0%, transparent 100%),
          radial-gradient(ellipse 150px 60px at 65% 20%, rgba(212,180,131,1) 0%, transparent 100%),
          radial-gradient(ellipse 90px 90px at 82% 50%, rgba(139,115,85,1) 0%, transparent 100%),
          radial-gradient(ellipse 100px 80px at 25% 75%, rgba(160,137,106,1) 0%, transparent 100%),
          radial-gradient(ellipse 120px 60px at 60% 80%, rgba(194,160,110,0.9) 0%, transparent 100%),
          radial-gradient(ellipse 70px 100px at 88% 85%, rgba(80,65,40,0.9) 0%, transparent 100%),
          #b8956a`,
      },
      {
        id: 'tiger-stripe',
        label: 'Tiger Stripe',
        preview: 'linear-gradient(135deg, #4a5e2a 0%, #2d3d18 30%, #6b7a3a 60%, #1a2810 100%)',
        background: `
          repeating-linear-gradient(
            -15deg,
            rgba(26,40,16,0.9) 0px, rgba(26,40,16,0.9) 3px,
            transparent 3px, transparent 9px,
            rgba(26,40,16,0.7) 9px, rgba(26,40,16,0.7) 11px,
            transparent 11px, transparent 18px
          ),
          repeating-linear-gradient(
            75deg,
            rgba(45,61,24,0.8) 0px, rgba(45,61,24,0.8) 4px,
            transparent 4px, transparent 12px,
            rgba(45,61,24,0.6) 12px, rgba(45,61,24,0.6) 15px,
            transparent 15px, transparent 24px
          ),
          #4a5e2a`,
      },
      {
        id: 'chocolate-chip',
        label: 'Chocolate Chip',
        preview: 'linear-gradient(135deg, #c4a882 0%, #a08060 25%, #3d2b1f 50%, #c4a882 75%, #8b6914 100%)',
        background: `
          radial-gradient(circle 8px at 12% 18%, rgba(61,43,31,1) 0%, transparent 100%),
          radial-gradient(circle 5px at 28% 8%, rgba(61,43,31,0.9) 0%, transparent 100%),
          radial-gradient(circle 10px at 45% 30%, rgba(61,43,31,1) 0%, transparent 100%),
          radial-gradient(circle 6px at 62% 12%, rgba(61,43,31,0.8) 0%, transparent 100%),
          radial-gradient(circle 9px at 78% 25%, rgba(61,43,31,1) 0%, transparent 100%),
          radial-gradient(circle 7px at 92% 40%, rgba(61,43,31,0.9) 0%, transparent 100%),
          radial-gradient(circle 11px at 20% 50%, rgba(61,43,31,1) 0%, transparent 100%),
          radial-gradient(circle 5px at 38% 65%, rgba(61,43,31,0.85) 0%, transparent 100%),
          radial-gradient(circle 8px at 55% 55%, rgba(61,43,31,1) 0%, transparent 100%),
          radial-gradient(circle 6px at 70% 70%, rgba(61,43,31,0.9) 0%, transparent 100%),
          radial-gradient(circle 10px at 85% 60%, rgba(61,43,31,1) 0%, transparent 100%),
          radial-gradient(circle 7px at 10% 80%, rgba(61,43,31,0.8) 0%, transparent 100%),
          radial-gradient(circle 9px at 32% 88%, rgba(61,43,31,1) 0%, transparent 100%),
          radial-gradient(circle 5px at 50% 82%, rgba(61,43,31,0.9) 0%, transparent 100%),
          radial-gradient(circle 8px at 68% 90%, rgba(61,43,31,1) 0%, transparent 100%),
          radial-gradient(circle 6px at 88% 78%, rgba(61,43,31,0.85) 0%, transparent 100%),
          #c4a882`,
      },
    ],
  },

  /* ─── DIGITAL CAMOUFLAGE ──────────────────────────────────────────── */
  {
    section: 'DIGITAL CAMOUFLAGE',
    packs: [
      {
        id: 'marpat-woodland',
        label: 'MARPAT Woodland',
        preview: 'linear-gradient(135deg, #3d4a1e 0%, #556b2f 30%, #2d3d18 60%, #8b7355 100%)',
        background: `
          repeating-linear-gradient(
            0deg,
            #0f140a 0px, #0f140a 7px,
            transparent 7px, transparent 14px,
            #415a2d 14px, #415a2d 21px,
            transparent 21px, transparent 28px,
            #8c7b46 28px, #8c7b46 35px,
            transparent 35px, transparent 42px,
            #8ca064 42px, #8ca064 49px,
            transparent 49px, transparent 56px
          ),
          repeating-linear-gradient(
            90deg,
            #0f140a 0px, #0f140a 14px,
            transparent 14px, transparent 21px,
            #8c7b46 21px, #8c7b46 35px,
            transparent 35px, transparent 42px,
            #415a2d 42px, #415a2d 56px,
            transparent 56px, transparent 63px,
            #8ca064 63px, #8ca064 70px,
            transparent 70px, transparent 84px
          ),
          #82703f`,
      },
      {
        id: 'marpat-desert',
        label: 'MARPAT Desert',
        preview: 'linear-gradient(135deg, #c8a96e 0%, #a08060 30%, #d4b483 60%, #8b7355 100%)',
        background: `
          repeating-linear-gradient(
            0deg,
            #503c23 0px, #503c23 7px,
            transparent 7px, transparent 14px,
            #a08255 14px, #a08255 21px,
            transparent 21px, transparent 28px,
            #d2be91 28px, #d2be91 35px,
            transparent 35px, transparent 42px,
            #785537 42px, #785537 49px,
            transparent 49px, transparent 56px
          ),
          repeating-linear-gradient(
            90deg,
            #503c23 0px, #503c23 14px,
            transparent 14px, transparent 21px,
            #d2be91 21px, #d2be91 35px,
            transparent 35px, transparent 42px,
            #a08255 42px, #a08255 56px,
            transparent 56px, transparent 63px,
            #785537 63px, #785537 70px,
            transparent 70px, transparent 84px
          ),
          #b99a6e`,
      },
      {
        id: 'acu-ucp',
        label: 'ACU (UCP)',
        preview: 'linear-gradient(135deg, #7b8b7a 0%, #9aa09a 30%, #5a6b5a 60%, #b0b8b0 100%)',
        background: `
          repeating-conic-gradient(
            rgba(123,139,122,1) 0% 25%,
            rgba(154,160,154,0.9) 25% 50%,
            rgba(90,107,90,1) 50% 75%,
            rgba(176,184,176,0.8) 75% 100%
          ) 0 0 / 6px 6px,
          repeating-conic-gradient(
            rgba(90,107,90,0.7) 0% 25%,
            rgba(123,139,122,0.5) 25% 50%,
            rgba(176,184,176,0.6) 50% 75%,
            rgba(60,75,60,0.8) 75% 100%
          ) 3px 3px / 12px 12px,
          #7b8b7a`,
      },
      {
        id: 'multicam',
        label: 'MultiCam',
        preview: 'linear-gradient(135deg, #7a6a4a 0%, #9a8a5a 25%, #4a5a2a 50%, #c8a870 75%, #3a4a1a 100%)',
        background: `
          radial-gradient(ellipse 100px 60px at 15% 20%, rgba(74,90,42,0.9) 0%, transparent 100%),
          radial-gradient(ellipse 80px 90px at 40% 50%, rgba(200,168,112,0.85) 0%, transparent 100%),
          radial-gradient(ellipse 120px 50px at 65% 25%, rgba(122,106,74,1) 0%, transparent 100%),
          radial-gradient(ellipse 70px 80px at 80% 60%, rgba(58,74,26,0.9) 0%, transparent 100%),
          radial-gradient(ellipse 90px 70px at 25% 75%, rgba(154,138,90,0.8) 0%, transparent 100%),
          radial-gradient(ellipse 110px 55px at 55% 80%, rgba(74,90,42,0.85) 0%, transparent 100%),
          repeating-linear-gradient(
            25deg,
            rgba(58,74,26,0.15) 0px, rgba(58,74,26,0.15) 2px,
            transparent 2px, transparent 20px
          ),
          #8a7850`,
      },
      {
        id: 'ocp-scorpion',
        label: 'OCP Scorpion',
        preview: 'linear-gradient(135deg, #6b7a3a 0%, #8a7050 25%, #4a5a2a 50%, #a08060 75%, #2a3a1a 100%)',
        background: `
          radial-gradient(ellipse 110px 65px at 20% 15%, rgba(42,58,26,0.95) 0%, transparent 100%),
          radial-gradient(ellipse 85px 95px at 45% 45%, rgba(160,128,96,0.9) 0%, transparent 100%),
          radial-gradient(ellipse 130px 55px at 70% 20%, rgba(107,122,58,1) 0%, transparent 100%),
          radial-gradient(ellipse 75px 85px at 85% 55%, rgba(42,58,26,0.9) 0%, transparent 100%),
          radial-gradient(ellipse 95px 75px at 30% 70%, rgba(138,112,80,0.85) 0%, transparent 100%),
          radial-gradient(ellipse 115px 50px at 60% 85%, rgba(107,122,58,0.9) 0%, transparent 100%),
          repeating-linear-gradient(
            -20deg,
            rgba(42,58,26,0.12) 0px, rgba(42,58,26,0.12) 3px,
            transparent 3px, transparent 22px
          ),
          #7a6a40`,
      },
      {
        id: 'urban-digital',
        label: 'Urban Digital',
        preview: 'linear-gradient(135deg, #4a4a4a 0%, #6a6a6a 30%, #2a2a2a 60%, #8a8a8a 100%)',
        background: `
          repeating-conic-gradient(
            rgba(74,74,74,1) 0% 25%,
            rgba(106,106,106,0.9) 25% 50%,
            rgba(42,42,42,1) 50% 75%,
            rgba(138,138,138,0.8) 75% 100%
          ) 0 0 / 7px 7px,
          repeating-conic-gradient(
            rgba(42,42,42,0.7) 0% 25%,
            rgba(74,74,74,0.5) 25% 50%,
            rgba(138,138,138,0.6) 50% 75%,
            rgba(20,20,20,0.8) 75% 100%
          ) 3.5px 3.5px / 14px 14px,
          #4a4a4a`,
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
