// src/components/RoutinePlayer.jsx
// ─────────────────────────────────────────────────────────────────────────────
//  Full-screen routine player overlay.
//  Activated by:  window.dispatchEvent(new CustomEvent('mars:start-routine', { detail: routine }))
//  Dismissed by:  user tapping Complete / Close, or the routine finishing all steps.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState, useRef, useCallback } from 'react';
import './RoutinePlayer.css';

const DEFAULT_STEP_DURATION = 30; // seconds per step (if no duration set on step)

export default function RoutinePlayer() {
  const [routine,     setRoutine]     = useState(null);
  const [stepIndex,   setStepIndex]   = useState(0);
  const [elapsed,     setElapsed]     = useState(0);
  const [completed,   setCompleted]   = useState(false);
  const audioRef = useRef(null);
  const timerRef = useRef(null);

  // ── Listen for mars:start-routine events ──────────────────────
  useEffect(() => {
    const handler = (e) => {
      const r = e.detail;
      if (!r) return;
      setRoutine(r);
      setStepIndex(0);
      setElapsed(0);
      setCompleted(false);
      // Play routine sound
      if (r.sound) {
        const ext = ['alarm-default','alarm-gentle','alarm-military','chime',
          'Argon','Carbon','Helium','Krypton','Neon','Osmium','Oxygen','Platinum'].includes(r.sound)
          ? 'wav' : 'mp3';
        const audio = new Audio(`/sounds/${r.sound}.${ext}`);
        audio.volume = 0.7;
        audio.play().catch(() => {});
        audioRef.current = audio;
        // Stop after 8 seconds
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
          }
        }, 8000);
      }
    };
    window.addEventListener('mars:start-routine', handler);
    return () => window.removeEventListener('mars:start-routine', handler);
  }, []);

  // ── Per-step elapsed timer ─────────────────────────────────────
  useEffect(() => {
    if (!routine || completed) return;
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed(s => s + 1);
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [routine, stepIndex, completed]);

  const steps = routine?.steps || [];
  const currentStep = steps[stepIndex];
  const stepDuration = currentStep?.duration || DEFAULT_STEP_DURATION;
  const progress = Math.min((elapsed / stepDuration) * 100, 100);

  const nextStep = useCallback(() => {
    if (stepIndex < steps.length - 1) {
      setStepIndex(i => i + 1);
    } else {
      // All steps done
      setCompleted(true);
      clearInterval(timerRef.current);
      // Open routine URL if set
      if (routine?.openUrl) {
        window.open(routine.openUrl, '_blank', 'noopener');
      }
    }
  }, [stepIndex, steps.length, routine]);

  const close = useCallback(() => {
    clearInterval(timerRef.current);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setRoutine(null);
    setCompleted(false);
  }, []);

  if (!routine) return null;

  return (
    <div className="routine-player-overlay">
      <div className="routine-player-card">
        {/* Header */}
        <div className="rp-header">
          <div className="rp-title">{routine.name}</div>
          <button className="rp-close" onClick={close}>
            <i className="ti ti-x" />
          </button>
        </div>

        {completed ? (
          /* ── Completion screen ── */
          <div className="rp-complete">
            <div className="rp-complete-icon">✓</div>
            <div className="rp-complete-text">Routine complete!</div>
            <button className="btn btn-primary" onClick={close}>Done</button>
          </div>
        ) : (
          /* ── Active step screen ── */
          <>
            {/* Step progress dots */}
            <div className="rp-dots">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`rp-dot ${i < stepIndex ? 'done' : i === stepIndex ? 'active' : ''}`}
                />
              ))}
            </div>

            {/* Current step */}
            <div className="rp-step-num">Step {stepIndex + 1} of {steps.length}</div>
            <div className="rp-step-icon">
              <i className={`ti ${currentStep?.icon || 'ti-check'}`} />
            </div>
            <div className="rp-step-label">{currentStep?.label || 'Step'}</div>

            {/* Progress bar */}
            <div className="rp-progress-track">
              <div className="rp-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="rp-elapsed">{elapsed}s</div>

            {/* Actions */}
            <div className="rp-actions">
              <button className="btn" onClick={close}>Pause</button>
              <button className="btn btn-primary" onClick={nextStep}>
                {stepIndex < steps.length - 1 ? 'Next Step' : 'Complete'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
