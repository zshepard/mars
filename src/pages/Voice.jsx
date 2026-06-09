// src/pages/Voice.jsx
import { useState, useMemo } from 'react';
import { useAuth }           from '../hooks/useAuth';
import { useAlarms }         from '../hooks/useAlarms';
import { useAlarmTimer }     from '../hooks/useAlarmTimer';
import { useMars }           from '../hooks/useMars';
import { useVoiceCommand, COMMAND_DEFS } from '../hooks/useVoiceCommand';
import './Voice.css';

const CATEGORY_ICONS = {
  Navigation: 'ti-compass',
  Alarms:     'ti-alarm',
  Links:      'ti-link',
  Routines:   'ti-refresh',
  System:     'ti-settings',
};

function ConfidenceBar({ score }) {
  const pct = Math.round((score ?? 0) * 100);
  const color = pct >= 80 ? 'var(--green)' : pct >= 50 ? '#f5a623' : '#e63946';
  return (
    <div className="conf-bar-wrap" title={`Confidence: ${pct}%`}>
      <div className="conf-bar-track">
        <div className="conf-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="conf-pct" style={{ color }}>{pct}%</span>
    </div>
  );
}

function WaveformBars({ active }) {
  return (
    <div className={`waveform ${active ? 'active' : ''}`}>
      {[...Array(7)].map((_, i) => (
        <div key={i} className="wave-bar" style={{ animationDelay: `${i * 0.08}s` }} />
      ))}
    </div>
  );
}

export default function Voice() {
  const { user }                                           = useAuth();
  const { isOnline }                                       = useMars();
  const { alarms, updateAlarm }                            = useAlarms(user?.uid);
  const { firingAlarm, dismissAlarm, snoozeAlarm }         = useAlarmTimer(alarms);

  const [search, setSearch]     = useState('');
  const [activeTab, setActiveTab] = useState('commands'); // 'commands' | 'history'

  const voice = useVoiceCommand({
    alarms,
    updateAlarm,
    firingAlarm,
    dismissAlarm,
    snoozeAlarm,
    isOnline,
  });

  // Group commands by category
  const grouped = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = COMMAND_DEFS.filter(c =>
      !q ||
      c.label.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.phrases.some(p => p.includes(q)) ||
      c.keywords.some(k => k.includes(q))
    );
    return filtered.reduce((acc, cmd) => {
      (acc[cmd.category] = acc[cmd.category] || []).push(cmd);
      return acc;
    }, {});
  }, [search]);

  const statusText = () => {
    if (!voice.supported)  return 'Not supported in this browser';
    if (voice.continuous)  return 'Always listening — say "Hey Mars ..."';
    if (voice.listening)   return 'Listening...';
    return 'Tap to speak';
  };

  return (
    <div className="page-wrap voice-page">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="page-header">
        <h1 className="page-title">Voice Control</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="badge badge-green">
            <i className="ti ti-wifi-off" /> Works offline
          </span>
          {voice.continuous && (
            <span className="badge badge-pulse">
              <i className="ti ti-radio" /> Always on
            </span>
          )}
        </div>
      </div>

      {/* ── Mic card ──────────────────────────────────────────────── */}
      <div className="card voice-card">
        {/* Rings */}
        <div className="voice-circle-wrap">
          {(voice.listening || voice.continuous) && (
            <>
              <div className="voice-ring voice-ring--1" />
              <div className="voice-ring voice-ring--2" />
            </>
          )}
          <button
            className={`voice-circle ${voice.listening ? 'listening' : ''} ${voice.continuous ? 'continuous' : ''}`}
            onClick={voice.toggle}
            disabled={!voice.supported}
            title="Tap to speak once"
          >
            <i className={`ti ${voice.listening ? 'ti-microphone' : 'ti-microphone-off'}`} />
          </button>
        </div>

        {/* Waveform */}
        <WaveformBars active={voice.listening} />

        {/* Status */}
        <div className="voice-prompt">{statusText()}</div>

        {/* Interim transcript (live) */}
        {voice.interim && (
          <div className="voice-interim">
            <i className="ti ti-dots" /> {voice.interim}
          </div>
        )}

        {/* Final transcript + confidence */}
        {voice.transcript && !voice.interim && (
          <div className="voice-transcript-block">
            <div className="voice-transcript">
              <span className="voice-hey">Hey Mars, </span>
              <span>{voice.transcript}</span>
            </div>
            {voice.confidence !== null && (
              <ConfidenceBar score={voice.confidence} />
            )}
          </div>
        )}

        {/* Command result */}
        {voice.result && (
          <div className={`voice-result ${voice.result.success ? 'success' : 'fail'}`}>
            <i className={`ti ${voice.result.success ? 'ti-check' : 'ti-x'}`} />
            <span>{voice.result.message}</span>
            {voice.result.command && (
              <span className="result-category">{voice.result.command.category}</span>
            )}
          </div>
        )}

        {/* Error */}
        {voice.error && (
          <div className="voice-result fail">
            <i className="ti ti-alert-triangle" /> {voice.error}
          </div>
        )}

        {/* Controls */}
        <div className="voice-controls">
          <button
            className={`btn ${voice.continuous ? 'btn-primary' : ''}`}
            onClick={voice.toggleContinuous}
            disabled={!voice.supported}
            title="Keep microphone open continuously"
          >
            <i className={`ti ${voice.continuous ? 'ti-radio-off' : 'ti-radio'}`} />
            {voice.continuous ? 'Stop always-on' : 'Always listen'}
          </button>
        </div>

        <p className="voice-note">
          Say <strong>"Hey Mars"</strong> followed by any command below.
          Voice recognition runs on-device — no audio leaves your phone.
        </p>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────── */}
      <div className="voice-tabs">
        <button
          className={`voice-tab ${activeTab === 'commands' ? 'active' : ''}`}
          onClick={() => setActiveTab('commands')}
        >
          <i className="ti ti-terminal" /> Commands
          <span className="tab-badge">{COMMAND_DEFS.length}</span>
        </button>
        <button
          className={`voice-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <i className="ti ti-history" /> History
          {voice.history.length > 0 && (
            <span className="tab-badge">{voice.history.length}</span>
          )}
        </button>
      </div>

      {/* ── Commands tab ──────────────────────────────────────────── */}
      {activeTab === 'commands' && (
        <>
          <div style={{ marginBottom: 14 }}>
            <input
              className="search-input"
              type="text"
              placeholder="Search commands..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {Object.entries(grouped).map(([category, cmds]) => (
            <div key={category} className="cmd-category">
              <div className="cmd-category-title">
                <i className={`ti ${CATEGORY_ICONS[category] || 'ti-star'}`} />
                {category}
              </div>
              <div className="cmd-list">
                {cmds.map(cmd => (
                  <div key={cmd.id} className="cmd-row card">
                    <div className="cmd-left">
                      <div className="cmd-label">{cmd.label}</div>
                      <div className="cmd-phrases">
                        {cmd.phrases.slice(0, 2).map(p => (
                          <span key={p} className="cmd-phrase-chip">
                            "Hey Mars, <span className="cmd-highlight">{p}</span>"
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      className="btn btn-sm"
                      onClick={() => voice.start({ continuous: false })}
                      title="Tap mic then say this command"
                    >
                      <i className="ti ti-microphone" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {Object.keys(grouped).length === 0 && (
            <div className="empty-state">
              <i className="ti ti-search" style={{ fontSize: 32, color: 'var(--text3)' }} />
              <p>No commands match "{search}"</p>
            </div>
          )}
        </>
      )}

      {/* ── History tab ───────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="history-list">
          {voice.history.length === 0 ? (
            <div className="empty-state">
              <i className="ti ti-history" style={{ fontSize: 32, color: 'var(--text3)' }} />
              <p>No commands yet. Tap the mic and speak.</p>
            </div>
          ) : (
            voice.history.map((h, i) => (
              <div key={i} className={`history-row card ${h.success ? '' : 'history-fail'}`}>
                <div className="history-left">
                  <i className={`ti ${h.success ? 'ti-check-circle' : 'ti-circle-x'} history-icon`} />
                  <div>
                    <div className="history-text">"{h.text}"</div>
                    <div className="history-result">{h.message}</div>
                  </div>
                </div>
                <div className="history-meta">
                  {h.command && <span className="result-category">{h.command.category}</span>}
                  <span className="history-time">
                    {new Date(h.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
