// src/pages/Voice.jsx
import { useState } from 'react';
import './Voice.css';

const PRESET_COMMANDS = [
  { phrase: 'start my morning',        action: 'Fires full morning routine flow' },
  { phrase: "I'm feeling tired",       action: 'Adjusts house to calm preset' },
  { phrase: "I'm feeling energized",   action: 'Adjusts house to energized preset' },
  { phrase: "I'm feeling focused",     action: 'Adjusts house to focused preset' },
  { phrase: 'open my workout',         action: 'Opens workout URL on chosen device' },
  { phrase: 'kids room quiet mode',    action: 'Drops kids room volume + dims lights' },
  { phrase: 'snooze 10 minutes',       action: 'Delays next routine step 10 min' },
  { phrase: 'goodnight',               action: 'Activates full wind-down protocol' },
  { phrase: 'start routine',           action: 'Begins next scheduled routine' },
  { phrase: 'lights on',              action: 'All rooms lights to 100%' },
  { phrase: 'lights off',             action: 'All rooms lights to 0%' },
  { phrase: 'dim lights',             action: 'All rooms lights to 30%' },
  { phrase: 'temperature up',         action: 'Raises all rooms temp by 2°' },
  { phrase: 'temperature down',       action: 'Lowers all rooms temp by 2°' },
  { phrase: 'open link on phone',     action: 'Sends URL to mobile device' },
  { phrase: 'open link on computer',  action: 'Sends URL to desktop device' },
  { phrase: 'pause routine',          action: 'Pauses current routine flow' },
  { phrase: 'resume routine',         action: 'Resumes paused routine' },
  { phrase: 'skip step',              action: 'Skips current routine step' },
  { phrase: 'lock morning alarm',     action: 'Disables snooze on morning alarm' },
];

export default function Voice() {
  const [listening, setListening]   = useState(false);
  const [transcript, setTranscript] = useState('');
  const [search, setSearch]         = useState('');

  const filtered = PRESET_COMMANDS.filter((c) =>
    c.phrase.includes(search.toLowerCase()) || c.action.toLowerCase().includes(search.toLowerCase())
  );

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Speech recognition is not supported in this browser.'); return; }
    const recognition = new SR();
    recognition.continuous   = false;
    recognition.interimResults = false;
    recognition.lang          = 'en-US';
    recognition.onstart  = () => setListening(true);
    recognition.onend    = () => setListening(false);
    recognition.onresult = (e) => setTranscript(e.results[0][0].transcript);
    recognition.start();
  };

  return (
    <div className="page-wrap">
      <div className="page-header">
        <h1 className="page-title">Voice Commands</h1>
        <span className="badge badge-green"><i className="ti ti-wifi-off" /> Works offline</span>
      </div>

      {/* Voice trigger */}
      <div className="card voice-card">
        <div className="voice-circle-wrap">
          <button
            className={`voice-circle ${listening ? 'listening' : ''}`}
            onClick={startListening}
          >
            <i className="ti ti-microphone" />
          </button>
          {listening && <div className="voice-ring" />}
        </div>
        <div className="voice-prompt">
          {listening ? 'Listening...' : 'Tap to speak'}
        </div>
        {transcript && (
          <div className="voice-transcript">
            <span className="voice-hey">Hey Mars, </span>
            <span>{transcript}</span>
          </div>
        )}
        <p className="voice-note">
          Say <strong>"Hey Mars"</strong> followed by any command below.<br />
          Voice recognition runs on-device and works without internet.
        </p>
      </div>

      {/* Command list */}
      <div style={{ marginBottom: 14 }}>
        <input
          className="search-input"
          type="text"
          placeholder="Search commands..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="cmd-list">
        {filtered.map((c) => (
          <div key={c.phrase} className="cmd-row card">
            <div className="cmd-phrase">
              "Hey Mars, <span className="cmd-highlight">{c.phrase}"</span>
            </div>
            <div className="cmd-action">{c.action}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
