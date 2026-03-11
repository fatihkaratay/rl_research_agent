import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '40vh', gap: 12,
          fontFamily: 'sans-serif', color: '#64748b', padding: 32,
        }}>
          <span style={{ fontSize: 32 }}>⚠️</span>
          <h2 style={{ margin: 0, color: '#1e293b' }}>Something went wrong</h2>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              marginTop: 8, padding: '8px 20px', borderRadius: 8,
              border: '1px solid #e2e8f0', background: '#f8fafc',
              cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
