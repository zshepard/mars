// src/components/ErrorBoundary.jsx
// Catches unhandled React render errors so the app never shows a blank screen.
import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to console.error so it surfaces in crash-reporting tools
    console.error('[MARS] Unhandled render error:', error, info?.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '100dvh', padding: '2rem',
        background: 'var(--bg, #0d0d0d)', color: 'var(--text, #f0f0f0)',
        textAlign: 'center', gap: '1rem',
      }}>
        <span style={{ fontSize: '3rem' }}>⚠️</span>
        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Something went wrong</h2>
        <p style={{ margin: 0, opacity: 0.6, fontSize: '0.9rem', maxWidth: 320 }}>
          MARS hit an unexpected error. Your data is safe — tap below to reload.
        </p>
        <button
          onClick={this.handleReload}
          style={{
            marginTop: '0.5rem', padding: '0.65rem 1.5rem',
            background: 'var(--accent, #e63946)', color: '#fff',
            border: 'none', borderRadius: '0.5rem', cursor: 'pointer',
            fontSize: '0.95rem', fontWeight: 600,
          }}
        >
          Reload App
        </button>
        {process.env.NODE_ENV === 'development' && this.state.error && (
          <pre style={{
            marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.05)',
            borderRadius: '0.5rem', fontSize: '0.75rem', textAlign: 'left',
            maxWidth: '90vw', overflowX: 'auto', color: '#ff6b6b',
          }}>
            {this.state.error.toString()}
          </pre>
        )}
      </div>
    );
  }
}
