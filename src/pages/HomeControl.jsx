// src/pages/HomeControl.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useHome } from '../hooks/useHome';
import './HomeControl.css';

/* ─── Room icon picker options ─────────────────────────────────────────── */
const ROOM_ICONS = [
  { icon: 'ti-bed',             label: 'Bedroom'   },
  { icon: 'ti-sofa',            label: 'Living'    },
  { icon: 'ti-tool-kitchen-2',  label: 'Kitchen'   },
  { icon: 'ti-bath',            label: 'Bathroom'  },
  { icon: 'ti-briefcase',       label: 'Office'    },
  { icon: 'ti-ball-basketball', label: 'Kids'      },
  { icon: 'ti-car',             label: 'Vehicle'   },
  { icon: 'ti-building',        label: 'Other'     },
];

/* ─── Add Room Modal ────────────────────────────────────────────────────── */
function AddRoomModal({ onAdd, onClose }) {
  const [name, setName]     = useState('');
  const [icon, setIcon]     = useState('ti-bed');
  const [error, setError]   = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setError('Please enter a room name.'); return; }
    onAdd({ name: trimmed, icon });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Add a Room</span>
          <button className="modal-close" onClick={onClose}><i className="ti ti-x" /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="modal-label">Room Name</label>
          <input
            className="modal-input"
            placeholder="e.g. Master Bedroom"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            autoFocus
            maxLength={32}
          />
          {error && <div className="modal-error">{error}</div>}

          <label className="modal-label" style={{ marginTop: 16 }}>Room Type</label>
          <div className="icon-picker">
            {ROOM_ICONS.map((opt) => (
              <button
                type="button"
                key={opt.icon}
                className={`icon-pick-btn ${icon === opt.icon ? 'selected' : ''}`}
                onClick={() => setIcon(opt.icon)}
              >
                <i className={`ti ${opt.icon}`} />
                <span>{opt.label}</span>
              </button>
            ))}
          </div>

          <button type="submit" className="btn-primary modal-submit">
            <i className="ti ti-plus" /> Add Room
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─── Custom Setting Row ────────────────────────────────────────────────── */
function CustomSettingRow({ setting, onUpdate, onDelete }) {
  return (
    <div className="custom-setting-row">
      <input
        className="custom-setting-name"
        value={setting.label}
        onChange={(e) => onUpdate(setting.id, 'label', e.target.value)}
        placeholder="Setting name"
        maxLength={24}
      />
      <input
        className="custom-setting-value"
        value={setting.value}
        onChange={(e) => onUpdate(setting.id, 'value', e.target.value)}
        placeholder="Value"
        maxLength={32}
      />
      <button className="custom-setting-delete" onClick={() => onDelete(setting.id)}>
        <i className="ti ti-trash" />
      </button>
    </div>
  );
}

/* ─── Room Link Row ─────────────────────────────────────────────────────── */
function RoomLinkRow({ link, onUpdate, onDelete }) {
  return (
    <div className="room-link-row">
      <input
        className="room-link-label"
        value={link.label}
        onChange={(e) => onUpdate(link.id, 'label', e.target.value)}
        placeholder="Link label"
        maxLength={24}
      />
      <input
        className="room-link-url"
        type="url"
        value={link.url}
        onChange={(e) => onUpdate(link.id, 'url', e.target.value)}
        placeholder="https://..."
      />
      <button
        className="room-link-open"
        title="Open link"
        onClick={() => link.url && window.open(link.url, '_blank', 'noopener')}
        disabled={!link.url}
      >
        <i className="ti ti-external-link" />
      </button>
      <button className="custom-setting-delete" onClick={() => onDelete(link.id)}>
        <i className="ti ti-trash" />
      </button>
    </div>
  );
}

/* ─── Room Card ─────────────────────────────────────────────────────────── */
function RoomCard({ room, onUpdate, onDelete, onAddCustom, onUpdateCustom, onDeleteCustom, onAddLink, onUpdateLink, onDeleteLink }) {
  const [showCustom, setShowCustom] = useState(false);
  const [showLinks, setShowLinks]   = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="room-card card">
      {/* Header */}
      <div className="room-header">
        <div className="room-name">
          <i className={`ti ${room.icon || 'ti-home'}`} />
          <span>{room.name}</span>
        </div>
        <button
          className="room-delete-btn"
          onClick={() => setConfirmDelete(true)}
          title="Remove room"
        >
          <i className="ti ti-trash" />
        </button>
      </div>

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="delete-confirm">
          <span>Remove <strong>{room.name}</strong>?</span>
          <div className="delete-confirm-btns">
            <button className="btn-danger-sm" onClick={() => onDelete(room.id)}>Remove</button>
            <button className="btn-ghost-sm" onClick={() => setConfirmDelete(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Temperature */}
      <div className="slider-row">
        <span className="slider-label"><i className="ti ti-temperature" /> Temp</span>
        <input
          type="range" min={60} max={85}
          value={room.temp ?? 70}
          onChange={(e) => onUpdate(room.id, 'temp', +e.target.value)}
        />
        <span className="slider-val">{room.temp ?? 70}°F</span>
      </div>

      {/* Light Brightness */}
      <div className="slider-row">
        <span className="slider-label"><i className="ti ti-bulb" /> Light</span>
        <input
          type="range" min={0} max={100}
          value={room.light ?? 80}
          onChange={(e) => onUpdate(room.id, 'light', +e.target.value)}
        />
        <span className="slider-val">{room.light ?? 80}%</span>
      </div>

      {/* Aroma toggle */}
      <div className="room-toggles">
        <button
          className={`room-toggle-btn ${room.aroma ? 'on' : ''}`}
          onClick={() => onUpdate(room.id, 'aroma', !room.aroma)}
        >
          <i className="ti ti-wind" /> Aroma {room.aroma ? 'On' : 'Off'}
        </button>
      </div>

      {/* Room Links */}
      <div className="custom-settings-section">
        <button
          className="custom-settings-toggle"
          onClick={() => setShowLinks((v) => !v)}
        >
          <i className={`ti ${showLinks ? 'ti-chevron-up' : 'ti-link'}`} />
          Room Links
          {room.roomLinks?.length > 0 && (
            <span className="custom-count">{room.roomLinks.length}</span>
          )}
        </button>

        {showLinks && (
          <div className="custom-settings-panel">
            {(room.roomLinks || []).map((lnk) => (
              <RoomLinkRow
                key={lnk.id}
                link={lnk}
                onUpdate={(lid, field, val) => onUpdateLink(room.id, lid, field, val)}
                onDelete={(lid) => onDeleteLink(room.id, lid)}
              />
            ))}
            <button
              className="add-custom-btn"
              onClick={() => onAddLink(room.id)}
            >
              <i className="ti ti-plus" /> Add Link
            </button>
          </div>
        )}
      </div>

      {/* Custom Settings */}
      <div className="custom-settings-section">
        <button
          className="custom-settings-toggle"
          onClick={() => setShowCustom((v) => !v)}
        >
          <i className={`ti ${showCustom ? 'ti-chevron-up' : 'ti-settings'}`} />
          Custom Settings
          {room.customSettings?.length > 0 && (
            <span className="custom-count">{room.customSettings.length}</span>
          )}
        </button>

        {showCustom && (
          <div className="custom-settings-panel">
            {(room.customSettings || []).map((s) => (
              <CustomSettingRow
                key={s.id}
                setting={s}
                onUpdate={(sid, field, val) => onUpdateCustom(room.id, sid, field, val)}
                onDelete={(sid) => onDeleteCustom(room.id, sid)}
              />
            ))}
            <button
              className="add-custom-btn"
              onClick={() => onAddCustom(room.id)}
            >
              <i className="ti ti-plus" /> Add Custom Setting
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────────── */
export default function HomeControl() {
  const { user } = useAuth();
  const {
    rooms, loading,
    addRoom, updateRoom, deleteRoom,
    addCustomSetting, updateCustomSetting, deleteCustomSetting,
    addRoomLink, updateRoomLink, deleteRoomLink,
  } = useHome(user?.uid);

  const [showAddModal, setShowAddModal] = useState(false);

  // FAB listener — opens Add Room modal when FAB is tapped on mobile
  useEffect(() => {
    function onFab() { setShowAddModal(true); }
    window.addEventListener('mars:fab', onFab);
    return () => window.removeEventListener('mars:fab', onFab);
  }, []);

  return (
    <div className="page-wrap">
      <div className="page-header">
        <h1 className="page-title">Home Control</h1>
        <button className="btn-add-room" onClick={() => setShowAddModal(true)}>
          <i className="ti ti-plus" /> Add Room
        </button>
      </div>

      {loading ? (
        <div className="empty-state">Loading rooms...</div>
      ) : rooms.length === 0 ? (
        <div className="no-rooms-state card">
          <i className="ti ti-home-off" />
          <p>No rooms yet.</p>
          <span>Tap <strong>+ Add Room</strong> to get started.</span>
          <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => setShowAddModal(true)}>
            <i className="ti ti-plus" /> Add Your First Room
          </button>
        </div>
      ) : (
        <div className="room-grid">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onUpdate={updateRoom}
              onDelete={deleteRoom}
              onAddCustom={addCustomSetting}
              onUpdateCustom={updateCustomSetting}
              onDeleteCustom={deleteCustomSetting}
              onAddLink={addRoomLink}
              onUpdateLink={updateRoomLink}
              onDeleteLink={deleteRoomLink}
            />
          ))}
        </div>
      )}

      {showAddModal && (
        <AddRoomModal
          onAdd={addRoom}
          onClose={() => setShowAddModal(false)}
        />
      )}

      <div className="offline-note card">
        <i className="ti ti-wifi-off" />
        <span>Changes made offline are queued and synced automatically when you reconnect.</span>
      </div>
    </div>
  );
}
