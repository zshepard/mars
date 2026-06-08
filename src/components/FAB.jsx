// src/components/FAB.jsx
// Floating Action Button — mobile only, fires a 'mars:fab' CustomEvent
// Pages listen for this event to open their add form
import './FAB.css';

export default function FAB() {
  function handleClick() {
    window.dispatchEvent(new CustomEvent('mars:fab'));
  }

  return (
    <button className="fab" onClick={handleClick} aria-label="Add new">
      <i className="ti ti-plus" />
    </button>
  );
}
