// src/data/neonThemes.js
// MARS Neon Color Themes
// Each theme overrides the CSS custom properties defined in global.css.
// The `accent` color replaces --green throughout the UI.

export const NEON_THEMES = [
  {
    id: 'mars-green',
    label: 'MARS Green',
    emoji: '🟢',
    accent:    '#1D9E75',
    accentDim: 'rgba(29,158,117,0.12)',
    accentGlow:'rgba(29,158,117,0.28)',
    accentText:'#0F6E56',
    preview:   '#1D9E75',
  },
  {
    id: 'neon-cyan',
    label: 'Neon Cyan',
    emoji: '🔵',
    accent:    '#00F5FF',
    accentDim: 'rgba(0,245,255,0.10)',
    accentGlow:'rgba(0,245,255,0.30)',
    accentText:'#00B8C4',
    preview:   '#00F5FF',
  },
  {
    id: 'neon-magenta',
    label: 'Neon Magenta',
    emoji: '🟣',
    accent:    '#FF2D78',
    accentDim: 'rgba(255,45,120,0.10)',
    accentGlow:'rgba(255,45,120,0.30)',
    accentText:'#C4004E',
    preview:   '#FF2D78',
  },
  {
    id: 'neon-orange',
    label: 'Neon Orange',
    emoji: '🟠',
    accent:    '#FF6B00',
    accentDim: 'rgba(255,107,0,0.10)',
    accentGlow:'rgba(255,107,0,0.30)',
    accentText:'#C45200',
    preview:   '#FF6B00',
  },
  {
    id: 'neon-violet',
    label: 'Neon Violet',
    emoji: '💜',
    accent:    '#A855F7',
    accentDim: 'rgba(168,85,247,0.10)',
    accentGlow:'rgba(168,85,247,0.30)',
    accentText:'#7C3AED',
    preview:   '#A855F7',
  },
  {
    id: 'neon-gold',
    label: 'Neon Gold',
    emoji: '🟡',
    accent:    '#FFD600',
    accentDim: 'rgba(255,214,0,0.10)',
    accentGlow:'rgba(255,214,0,0.30)',
    accentText:'#B89A00',
    preview:   '#FFD600',
  },
  {
    id: 'neon-red',
    label: 'Neon Red',
    emoji: '🔴',
    accent:    '#FF3B3B',
    accentDim: 'rgba(255,59,59,0.10)',
    accentGlow:'rgba(255,59,59,0.30)',
    accentText:'#C40000',
    preview:   '#FF3B3B',
  },
  {
    id: 'neon-lime',
    label: 'Neon Lime',
    emoji: '🍏',
    accent:    '#AAFF00',
    accentDim: 'rgba(170,255,0,0.10)',
    accentGlow:'rgba(170,255,0,0.28)',
    accentText:'#6BBF00',
    preview:   '#AAFF00',
  },
];

export const DEFAULT_THEME_ID = 'mars-green';

export function getThemeById(id) {
  return NEON_THEMES.find(t => t.id === id) || NEON_THEMES[0];
}

// Apply a theme by injecting CSS variables onto :root
export function applyTheme(themeId) {
  const theme = getThemeById(themeId);
  const root = document.documentElement;
  root.style.setProperty('--green',      theme.accent);
  root.style.setProperty('--green-dim',  theme.accentDim);
  root.style.setProperty('--green-glow', theme.accentGlow);
  root.style.setProperty('--green-text', theme.accentText);
  // Store for persistence
  try { localStorage.setItem('mars-neon-theme', themeId); } catch (_) {}
}

// Read the saved theme from localStorage
export function getSavedThemeId() {
  try { return localStorage.getItem('mars-neon-theme') || DEFAULT_THEME_ID; } catch (_) { return DEFAULT_THEME_ID; }
}
