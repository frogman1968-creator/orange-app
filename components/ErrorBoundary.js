/**
 * ErrorBoundary
 * Catches runtime errors in any child component tree.
 * Shows a branded fallback instead of a white crash screen.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <YourComponent />
 *   </ErrorBoundary>
 *
 * Or with a custom fallback:
 *   <ErrorBoundary fallback={<div>Something went wrong</div>}>
 *     <YourComponent />
 *   </ErrorBoundary>
 */

import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to console in dev — swap for Sentry/LogRocket later
    console.error('[Orange ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={styles.wrapper}>
          <div style={styles.emoji}>🟠</div>
          <div style={styles.title}>Something went wrong</div>
          <div style={styles.sub}>
            {this.props.context
              ? `Could not load ${this.props.context}. `
              : 'An unexpected error occurred. '}
            Your data is safe.
          </div>
          <button
            style={styles.btn}
            onClick={() => {
              this.setState({ hasError: false, error: null });
              if (this.props.onReset) this.props.onReset();
            }}
          >
            Try Again
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre style={styles.devError}>
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

const styles = {
  wrapper: {
    background: '#0f0f0f',
    border: '1px solid #1a1a1a',
    borderRadius: 16,
    padding: '32px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    margin: '16px 0',
  },
  emoji: { fontSize: 40, marginBottom: 12 },
  title: {
    fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8,
  },
  sub: {
    fontSize: 13, color: '#71717a', lineHeight: 1.5, marginBottom: 20, maxWidth: 280,
  },
  btn: {
    background: '#f97316', color: '#000', border: 'none',
    borderRadius: 8, padding: '10px 24px', fontSize: 14,
    fontWeight: 700, cursor: 'pointer',
  },
  devError: {
    marginTop: 16, padding: 12, background: '#1a0000',
    border: '1px solid #7f1d1d', borderRadius: 8,
    color: '#f87171', fontSize: 11, textAlign: 'left',
    maxWidth: '100%', overflowX: 'auto', whiteSpace: 'pre-wrap',
  },
};
