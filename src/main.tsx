import {StrictMode, Component, ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Silence expected Supabase session expiration errors to prevent red overlay in AI Studio
const originalError = console.error;
console.error = (...args) => {
  const msg = args.join(" ").toLowerCase();
  if (
    msg.includes("refresh token") ||
    msg.includes("invalid refresh token") ||
    msg.includes("authsessionmissingerror") ||
    msg.includes("session_not_found")
  ) {
    console.warn("Squashed Auth Error:", ...args);
    return;
  }
  originalError(...args);
};

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && typeof event.reason.message === 'string') {
    const rawMsg = event.reason.message.toLowerCase();
    if (
      rawMsg.includes("refresh token") ||
      rawMsg.includes("invalid refresh token") ||
      rawMsg.includes("authsessionmissingerror") ||
      rawMsg.includes("session_not_found")
    ) {
      event.preventDefault(); // crucial to prevent the browser/Vite from showing standard Uncaught Promise Rejection
      console.warn("Squashed Unhandled Promise Rejection (Auth):", event.reason.message);
    }
  }
});

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // @ts-ignore
  public state: ErrorBoundaryState;
  
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    // @ts-ignore
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'red', fontFamily: 'monospace' }}>
          <h2>Something went wrong.</h2>
          {/* @ts-ignore */}
          <pre style={{whiteSpace: 'pre-wrap'}}>{this.state.error?.toString()}</pre>
          {/* @ts-ignore */}
          <pre style={{whiteSpace: 'pre-wrap', marginTop: 10, fontSize: '0.8em'}}>{this.state.error?.stack}</pre>
        </div>
      );
    }
    // @ts-ignore
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason) {
    const msg = (event.reason.message || String(event.reason)).toLowerCase();
    // Squash common network/timeout errors that don't need intrusive alerts
    if (msg.includes('failed to fetch') || msg.includes('load failed') || msg.includes('network error') || msg.includes('conexão recusada')) {
      event.preventDefault(); // Squash it safely
    }
  }
});
