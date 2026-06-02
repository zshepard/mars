// src/pages/HomeControl.jsx
import { useAuth } from '../hooks/useAuth';
import { useHome } from '../hooks/useHome';
import './HomeControl.css';

const MOODS = ['energized','focused','calm','tired','anxious'];

export default function HomeControl() {
  const { user }                          = useAuth();
  const { rooms, mood, loading, updateRoom, applyMood } = useHome(user?.uid);

  return (
    <div className="page-wrap">
      <div className="page-header">
        <h1 className="page-title">Home Control</h1>
        <span className="badge badge-green"><i className="ti ti-wifi" /> Synced</span>
      </div>

      {/* Mood selector */}
      <div className="card mood-section">
        <div className="section-label">Mood preset — adjusts all rooms</div>
        <div className="mood-pills">
          {MOODS.map((m) => (
            <button
              key={m}
              className={`mood-pill ${mood === m ? 'active' : ''}`}
              onClick={() => applyMood(m)}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Room grid */}
      {loading ? (
        <div className="empty-state">Loading rooms...</div>
      ) : (
        <div className="room-grid">
          {rooms.map((room) => (
            <div key={room.id} className="room-card card">
              <div className="room-header">
                <div className="room-name">
                  <i className={`ti ${room.icon}`} />
                  {room.name}
                </div>
              </div>

              <div className="slider-row">
                <span className="slider-label"><i className="ti ti-bulb" /> Light</span>
                <input type="range" min={0} max={100} value={room.light ?? 80}
                  onChange={(e) => updateRoom(room.id, 'light', +e.target.value)} />
                <span className="slider-val">{room.light ?? 80}%</span>
              </div>

              <div className="slider-row">
                <span className="slider-label"><i className="ti ti-temperature" /> Temp</span>
                <input type="range" min={60} max={85} value={room.temp ?? 70}
                  onChange={(e) => updateRoom(room.id, 'temp', +e.target.value)} />
                <span className="slider-val">{room.temp ?? 70}°</span>
              </div>

              <div className="slider-row">
                <span className="slider-label"><i className="ti ti-volume" /> Volume</span>
                <input type="range" min={0} max={100} value={room.volume ?? 50}
                  onChange={(e) => updateRoom(room.id, 'volume', +e.target.value)} />
                <span className="slider-val">{room.volume ?? 50}%</span>
              </div>

              <div className="room-toggles">
                <button
                  className={`room-toggle-btn ${room.aroma ? 'on' : ''}`}
                  onClick={() => updateRoom(room.id, 'aroma', !room.aroma)}
                >
                  <i className="ti ti-wind" /> Aroma {room.aroma ? 'On' : 'Off'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="offline-note card">
        <i className="ti ti-wifi-off" />
        <span>Home control actions taken offline are queued and synced automatically when you reconnect.</span>
      </div>
    </div>
  );
}
