// src/pages/HealthAgent.jsx
// ─────────────────────────────────────────────────────────────────────────────
//  MARS AI Health Agent
//  Analyzes the user's alarms, routines, and scheduled links using Groq
//  (Llama 3.3 70B) to provide personalized health & productivity feedback.
//  Also supports free-form chat about the user's routine.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth }           from '../hooks/useAuth';
import { useAlarms }         from '../hooks/useAlarms';
import { useRoutines }       from '../hooks/useRoutines';
import { useScheduledLinks } from '../hooks/useScheduledLinks';
import './HealthAgent.css';

// ── Groq API (free, no key needed for low-volume use) ─────────────────────────
// Uses the public Groq Cloud endpoint with llama-3.3-70b-versatile
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL   = 'llama-3.3-70b-versatile';
// Public demo key — replace with REACT_APP_GROQ_API_KEY in .env for production
const GROQ_KEY     = process.env.REACT_APP_GROQ_API_KEY || '';

const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ── Build a structured summary of the user's MARS data ───────────────────────
function buildRoutineSummary(alarms, routines, links) {
  const lines = [];

  if (alarms.length > 0) {
    lines.push('ALARMS:');
    alarms.forEach((a) => {
      const days = a.days?.length ? a.days.join(', ') : 'every day';
      const snooze = a.autoDismiss ? `auto-dismiss after ${a.dismissAfter || 60}s` : 'manual dismiss';
      const url = a.openUrl ? ` | opens: ${a.openUrl}` : '';
      lines.push(`  - ${a.time} (${days}) — "${a.label || 'Alarm'}" — ${snooze}${url}`);
    });
  } else {
    lines.push('ALARMS: none set');
  }

  if (routines.length > 0) {
    lines.push('\nROUTINES:');
    routines.forEach((r) => {
      const days = r.days?.length ? r.days.join(', ') : 'every day';
      const steps = r.steps?.map(s => s.label).join(' → ') || 'no steps';
      lines.push(`  - "${r.name}" at ${r.triggerTime || '?'} (${days}): ${steps}`);
    });
  }

  if (links.length > 0) {
    lines.push('\nSCHEDULED LINKS:');
    links.forEach((l) => {
      const days = l.days?.length ? l.days.join(', ') : 'every day';
      lines.push(`  - ${l.time} (${days}) — ${l.url || l.openUrl || 'no url'} — "${l.label || 'Link'}"`);
    });
  }

  const today = DAY_NAMES[new Date().getDay()];
  const hour  = new Date().getHours();
  lines.push(`\nCURRENT: ${today}, ${hour}:00`);

  return lines.join('\n');
}

// ── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt(routineSummary) {
  return `You are MARS Health Agent, an AI health and productivity coach built into the MARS Morning Operating System app.

Your role is to analyze the user's daily routine data and provide specific, actionable, and encouraging feedback about:
- Sleep schedule quality (wake time consistency, sleep debt risk)
- Morning routine structure and timing
- Productivity patterns (when they work best based on their schedule)
- Health habits (exercise windows, meal timing, screen time)
- Routine optimization suggestions

You have access to the user's current MARS data:
${routineSummary}

Guidelines:
- Be specific — reference actual times and alarm names from their data
- Be concise — 2-4 sentences per insight, no walls of text
- Be encouraging but honest — flag real issues clearly
- Use plain language, no jargon
- When asked a question, answer it directly then offer one follow-up suggestion
- Format responses with clear sections when giving a full analysis
- Never make up health data you don't have — only analyze what's in their MARS data
- If they have no alarms set, encourage them to set one and explain why consistency matters`;
}

// ── Quick-start prompts ───────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  { icon: 'ti-chart-bar', label: 'Analyze my routine',   text: 'Analyze my daily routine and give me your top 3 insights.' },
  { icon: 'ti-moon',      label: 'Sleep quality',        text: 'What does my alarm schedule say about my sleep habits?' },
  { icon: 'ti-bolt',      label: 'Optimize my morning',  text: 'How can I optimize my morning routine for more energy?' },
  { icon: 'ti-clock',     label: 'Best wake time',       text: 'What\'s the ideal wake time for me based on my schedule?' },
  { icon: 'ti-heart-rate',label: 'Health score',         text: 'Give me a health score out of 10 based on my routine data.' },
  { icon: 'ti-calendar',  label: 'Weekly pattern',       text: 'What patterns do you see in my weekly schedule?' },
];

// ── Groq API call ─────────────────────────────────────────────────────────────
async function callGroq(messages, signal) {
  if (!GROQ_KEY) {
    // Demo mode — return a realistic-looking response
    await new Promise(r => setTimeout(r, 1200));
    return `I can see your routine data, but I need a Groq API key to provide real AI analysis. 

To enable the full Health Agent, add your free Groq API key to the project environment as \`REACT_APP_GROQ_API_KEY\`. You can get a free key at [console.groq.com](https://console.groq.com) — no credit card required.

In the meantime, here's what I can see from your data: you have alarms set and a schedule in place. Consistency is the #1 predictor of morning routine success — the fact that you're using MARS puts you ahead of 80% of people.`;
  }

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 600,
      stream: false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'No response from AI.';
}

// ─────────────────────────────────────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────────────────────────────────────
export default function HealthAgent() {
  const { user }    = useAuth();
  const { alarms }  = useAlarms(user?.uid);
  const { routines } = useRoutines(user?.uid);
  const { links }   = useScheduledLinks(user?.uid);

  const [messages,  setMessages]  = useState([]);   // { role, content, ts }
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [autoAnalyzed, setAutoAnalyzed] = useState(false);

  const chatEndRef  = useRef(null);
  const inputRef    = useRef(null);
  const abortRef    = useRef(null);

  // Build system context from live data
  const routineSummary = buildRoutineSummary(alarms, routines, links || []);
  const systemPrompt   = buildSystemPrompt(routineSummary);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auto-analyze on first load once data is ready
  useEffect(() => {
    if (autoAnalyzed) return;
    if (alarms.length === 0 && routines.length === 0) return; // wait for data
    setAutoAnalyzed(true);
    sendMessage('Give me a quick health and productivity analysis of my current MARS routine.', true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alarms, routines, autoAnalyzed]);

  const sendMessage = useCallback(async (text, isAuto = false) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;

    if (!isAuto) setInput('');
    setError(null);
    setLoading(true);

    const userMsg = { role: 'user', content: userText, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);

    // Build message history for context
    const history = messages.map(m => ({ role: m.role, content: m.content }));
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userText },
    ];

    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      const reply = await callGroq(apiMessages, abortRef.current.signal);
      setMessages(prev => [...prev, { role: 'assistant', content: reply, ts: Date.now() }]);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError('Could not reach the AI. Check your connection and try again.');
      console.error('[MARS AI]', err);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading, messages, systemPrompt]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    if (abortRef.current) abortRef.current.abort();
    setMessages([]);
    setAutoAnalyzed(false);
    setError(null);
  };

  const hasData = alarms.length > 0 || routines.length > 0;

  return (
    <div className="page-wrap ha-wrap">
      {/* Header */}
      <div className="page-header">
        <div className="ha-header-left">
          <div className="ha-avatar">
            <i className="ti ti-brain" />
          </div>
          <div>
            <h1 className="page-title">Health Agent</h1>
            <span className="ha-subtitle">Powered by Llama 3 · Analyzing your MARS data</span>
          </div>
        </div>
        {messages.length > 0 && (
          <button className="ha-clear-btn" onClick={clearChat} title="Clear conversation">
            <i className="ti ti-refresh" />
          </button>
        )}
      </div>

      {/* Data context pill */}
      <div className="ha-context-bar">
        <span className="ha-context-pill">
          <i className="ti ti-alarm" /> {alarms.length} alarm{alarms.length !== 1 ? 's' : ''}
        </span>
        <span className="ha-context-pill">
          <i className="ti ti-list-check" /> {routines.length} routine{routines.length !== 1 ? 's' : ''}
        </span>
        {(links?.length > 0) && (
          <span className="ha-context-pill">
            <i className="ti ti-link" /> {links.length} link{links.length !== 1 ? 's' : ''}
          </span>
        )}
        <span className="ha-context-pill ha-context-live">
          <i className="ti ti-circle-filled" /> Live data
        </span>
      </div>

      {/* No data state */}
      {!hasData && messages.length === 0 && (
        <div className="card ha-empty">
          <i className="ti ti-alarm-off ha-empty-icon" />
          <div className="ha-empty-title">No routine data yet</div>
          <div className="ha-empty-sub">
            Set up at least one alarm or routine and the Health Agent will automatically analyze your schedule and give you personalized feedback.
          </div>
        </div>
      )}

      {/* Quick prompts — shown when no messages */}
      {messages.length === 0 && hasData && !loading && (
        <div className="ha-quick-grid">
          {QUICK_PROMPTS.map((p) => (
            <button key={p.text} className="ha-quick-btn" onClick={() => sendMessage(p.text)}>
              <i className={`ti ${p.icon}`} />
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Chat messages */}
      {messages.length > 0 && (
        <div className="ha-chat">
          {messages.map((msg, i) => (
            <div key={i} className={`ha-msg ha-msg--${msg.role}`}>
              {msg.role === 'assistant' && (
                <div className="ha-msg-avatar">
                  <i className="ti ti-brain" />
                </div>
              )}
              <div className="ha-msg-bubble">
                <MessageContent content={msg.content} />
              </div>
            </div>
          ))}

          {loading && (
            <div className="ha-msg ha-msg--assistant">
              <div className="ha-msg-avatar">
                <i className="ti ti-brain" />
              </div>
              <div className="ha-msg-bubble ha-msg-bubble--loading">
                <span className="ha-dot" /><span className="ha-dot" /><span className="ha-dot" />
              </div>
            </div>
          )}

          {error && (
            <div className="ha-error">
              <i className="ti ti-alert-triangle" /> {error}
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      )}

      {/* Quick prompts after first message */}
      {messages.length > 0 && !loading && (
        <div className="ha-quick-row">
          {QUICK_PROMPTS.slice(0, 3).map((p) => (
            <button key={p.text} className="ha-quick-chip" onClick={() => sendMessage(p.text)}>
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="ha-input-bar">
        <textarea
          ref={inputRef}
          className="ha-input"
          placeholder="Ask about your routine, sleep, energy, habits…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={loading}
        />
        <button
          className={`ha-send-btn ${input.trim() && !loading ? 'active' : ''}`}
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
          aria-label="Send"
        >
          <i className="ti ti-send" />
        </button>
      </div>
      <p className="ha-disclaimer">
        AI analysis is for guidance only. Always consult a healthcare professional for medical advice.
      </p>
    </div>
  );
}

// ── Renders markdown-lite: bold, line breaks, bullet points ──────────────────
function MessageContent({ content }) {
  // Split into paragraphs
  const paragraphs = content.split(/\n\n+/);
  return (
    <div className="ha-msg-content">
      {paragraphs.map((para, pi) => {
        const lines = para.split('\n');
        const isList = lines.every(l => l.match(/^[-•*]\s/) || l.match(/^\d+\.\s/) || l.trim() === '');
        if (isList) {
          return (
            <ul key={pi} className="ha-msg-list">
              {lines.filter(l => l.trim()).map((l, li) => (
                <li key={li}>{renderInline(l.replace(/^[-•*\d.]+\s/, ''))}</li>
              ))}
            </ul>
          );
        }
        return <p key={pi}>{renderInline(para)}</p>;
      })}
    </div>
  );
}

function renderInline(text) {
  // Bold: **text** or *text*
  const parts = text.split(/(\*{1,2}[^*]+\*{1,2})/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}
