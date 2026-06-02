// src/pages/AI.jsx
import './AI.css';

const INSIGHTS = [
  {
    title: "Alarm pattern detected",
    body: "You snooze your 05:30 alarm 4 out of 7 days. On days you get up at first alarm, your routine completion rate is 91% vs 47% on snooze days. Recommend locking the snooze.",
    suggestion: "Lock morning alarm — disable snooze before 05:45",
    icon: 'ti-lock',
  },
  {
    title: "Step count correlation",
    body: "On days your step count exceeds 8,000, your evening mood score averages 4.2/5. You're currently 4,760 steps behind your daily pace.",
    suggestion: "Add smart walk reminder — trigger at 3pm if steps under 4,000",
    icon: 'ti-walk',
  },
  {
    title: "Sleep optimization",
    body: "Your best sleep scores occur when your bedroom temperature is set to 68–70°F. Current setting: 72°F. A 2° drop could improve your recovery score.",
    suggestion: "Auto-set bedroom to 69°F at 21:00 on weeknights",
    icon: 'ti-moon',
  },
];

export default function AI() {
  return (
    <div className="page-wrap">
      <div className="page-header">
        <h1 className="page-title">MARS AI</h1>
        <span className="badge badge-blue"><i className="ti ti-sparkles" /> Learning your patterns</span>
      </div>

      <div className="card ai-intro">
        <i className="ti ti-brain ai-brain-icon" />
        <div>
          <div className="ai-intro-title">MARS AI is analyzing your data</div>
          <div className="ai-intro-sub">
            Based on your alarm history, routine completions, health metrics, and home usage,
            MARS surfaces insights and suggests automations to improve your days.
          </div>
        </div>
      </div>

      <div className="insight-list">
        {INSIGHTS.map((ins, i) => (
          <div key={i} className="card insight-card">
            <div className="insight-title">{ins.title}</div>
            <div className="insight-body">{ins.body}</div>
            <div className="insight-suggestion">
              <i className={`ti ${ins.icon}`} />
              {ins.suggestion}
              <button className="apply-btn">Apply</button>
            </div>
          </div>
        ))}
      </div>

      <div className="card ai-roadmap">
        <div className="section-label">AI features roadmap</div>
        <div className="roadmap-list">
          <div className="roadmap-row done"><i className="ti ti-check" /> Pattern detection from alarm + health data</div>
          <div className="roadmap-row done"><i className="ti ti-check" /> Mood-based home automation suggestions</div>
          <div className="roadmap-row next"><i className="ti ti-clock" /> Predictive routine scheduling</div>
          <div className="roadmap-row next"><i className="ti ti-clock" /> Natural language routine builder</div>
          <div className="roadmap-row next"><i className="ti ti-clock" /> AI voice assistant (custom MARS AI model)</div>
          <div className="roadmap-row next"><i className="ti ti-clock" /> Cross-family member coordination</div>
        </div>
      </div>
    </div>
  );
}
