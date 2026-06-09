import React, { useState, useEffect } from 'react';
import { BACKGROUND_PACKS, getPackById } from '../data/backgroundPacks';
import './BackgroundPacks.css';

const STORAGE_KEY = 'mars-background-pack';

export default function BackgroundPacks() {
  const [selected, setSelected] = useState(() => localStorage.getItem(STORAGE_KEY) || 'default-dark');
  const [preview, setPreview]   = useState(null); // id of the pack being hovered/previewed

  /* Apply background + optional CSS variable overrides to the root element */
  function applyBackground(packId) {
    const pack = getPackById(packId);
    const root = document.documentElement;

    // Reset all theme-overridable vars first
    const THEME_VARS = [
      '--green','--green-dim','--bg','--bg2','--bg3',
      '--border','--border2','--text','--text2','--text3',
    ];
    THEME_VARS.forEach(v => root.style.removeProperty(v));

    if (!pack || !pack.background) {
      root.style.removeProperty('--app-bg-override');
    } else {
      root.style.setProperty('--app-bg-override', pack.background);
      // Apply any custom CSS variable overrides (e.g. MARS Red accent color)
      if (pack.cssVars) {
        Object.entries(pack.cssVars).forEach(([k, v]) => {
          root.style.setProperty(k, v);
        });
      }
    }
  }

  /* On mount, restore saved background */
  useEffect(() => {
    applyBackground(selected);
  }, []); // eslint-disable-line

  function handleSelect(packId) {
    setSelected(packId);
    localStorage.setItem(STORAGE_KEY, packId);
    applyBackground(packId);
    setPreview(null);
  }

  function handlePreview(packId) {
    setPreview(packId);
    applyBackground(packId);
  }

  function handlePreviewEnd() {
    setPreview(null);
    applyBackground(selected);
  }

  return (
    <div className="bg-packs-page page-wrap">
      <div className="page-header">
        <h1 className="page-title">
          <i className="ti ti-palette" /> Background Packs
        </h1>
        <p className="page-subtitle">Pick a background that fits your style — you can always change it later.</p>
      </div>

      {BACKGROUND_PACKS.map(section => (
        <div key={section.section} className="bg-section">
          <h2 className="bg-section-title">{section.section}</h2>
          <div className="bg-grid">
            {section.packs.map(pack => {
              const isActive = selected === pack.id;
              const isPreviewing = preview === pack.id;
              return (
                <button
                  key={pack.id}
                  className={`bg-card ${isActive ? 'active' : ''} ${isPreviewing ? 'previewing' : ''}`}
                  onClick={() => handleSelect(pack.id)}
                  onMouseEnter={() => handlePreview(pack.id)}
                  onMouseLeave={handlePreviewEnd}
                  onTouchStart={() => handlePreview(pack.id)}
                  onTouchEnd={() => { handleSelect(pack.id); }}
                  aria-label={`Select ${pack.label} background`}
                >
                  {/* Colour strip preview at top of card */}
                  <div
                    className="bg-card-strip"
                    style={{ background: pack.preview }}
                  />
                  <div className="bg-card-body">
                    <span className="bg-card-label">{pack.label}</span>
                    {isActive && (
                      <span className="bg-card-check">
                        <i className="ti ti-check" />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
