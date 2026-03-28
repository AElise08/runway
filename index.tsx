
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// ─── Error Boundary ───────────────────────────────────────────────────────────
// Prevents the whole app from rendering a blank white screen when a render
// error happens (e.g. AI returns a JSON with missing fields).
type EBState = { hasError: boolean; errorMsg: string };

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, EBState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    (this as any).state = { hasError: false, errorMsg: '' } as EBState;
  }

  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, errorMsg: error?.message || 'Erro desconhecido.' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    const s = (this as any).state as EBState;
    if (s.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            background: '#0a0a0a',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'serif',
            padding: '2rem',
            textAlign: 'center',
            gap: '1.5rem',
          }}
        >
          <p style={{ fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#D32F2F', fontWeight: 900 }}>
            Falha Crítica de Sistema
          </p>
          <h1 style={{ fontSize: '2.5rem', fontStyle: 'italic', color: 'rgba(255,255,255,0.85)', marginBottom: '0.5rem' }}>
            "Alguém na TI será demitido."
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.35)', maxWidth: '440px', lineHeight: 1.8 }}>
            {s.errorMsg}
          </p>
          <button
            onClick={() => { window.location.reload(); }}
            style={{ marginTop: '1rem', padding: '1rem 2.5rem', background: '#fff', color: '#000', border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', borderRadius: '999px' }}
          >
            Reiniciar
          </button>
        </div>
      );
    }
    return (this as any).props.children;
  }
}
// ─────────────────────────────────────────────────────────────────────────────

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
