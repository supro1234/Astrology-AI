import React from 'react';
import * as Sentry from '@sentry/react';

/**
 * GlobalErrorBoundary — wraps the entire app to catch unhandled React errors.
 * Reports to Sentry automatically and shows a graceful fallback UI.
 */
class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, eventId: null };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    const eventId = Sentry.captureException(error, {
      contexts: { react: { componentStack: info.componentStack } },
    });
    this.setState({ eventId });
    console.error('[VedAstro] Uncaught error:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, eventId: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0A0A1A 0%, #1A0A2E 100%)',
            color: '#E2E8F0',
            fontFamily: 'Inter, sans-serif',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          {/* Star icon */}
          <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>✦</div>

          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#FFD700', marginBottom: '0.75rem' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#94A3B8', maxWidth: '480px', lineHeight: 1.6, marginBottom: '2rem' }}>
            An unexpected error occurred in VedAstro. Our team has been notified
            automatically. Please try returning to the home page.
          </p>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: '0.75rem 1.75rem',
                background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                color: '#0A0A1A',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
              }}
            >
              Return to Home
            </button>

            {this.state.eventId && (
              <button
                onClick={() =>
                  Sentry.showReportDialog({ eventId: this.state.eventId })
                }
                style={{
                  padding: '0.75rem 1.75rem',
                  background: 'transparent',
                  color: '#FFD700',
                  border: '1px solid rgba(255,215,0,0.4)',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                }}
              >
                Report Feedback
              </button>
            )}
          </div>

          {this.state.eventId && (
            <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: '#475569' }}>
              Event ID: {this.state.eventId}
            </p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
