import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.hash = '';
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{ minHeight: '100vh', backgroundColor: '#0B0E14', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
          <div style={{ maxWidth: '480px', width: '100%', backgroundColor: '#151921', border: '1px solid #222834', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', color: '#fff' }}>Recuperação de Página</h2>
            <p style={{ fontSize: '13px', color: '#A1A1AA', marginBottom: '16px', lineHeight: '1.5' }}>
              Ocorreu um ajuste temporário durante o carregamento dos dados. Clique abaixo para reiniciar a navegação.
            </p>
            {this.state.error && (
              <div style={{ background: '#000', color: '#ef4444', fontSize: '11px', padding: '10px', borderRadius: '8px', textAlign: 'left', marginBottom: '16px', overflowX: 'auto' }}>
                {this.state.error.message || String(this.state.error)}
              </div>
            )}
            <button
              onClick={this.handleReset}
              style={{ width: '100%', backgroundColor: '#00E676', color: '#0B0E14', fontWeight: 'bold', padding: '12px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '14px' }}
            >
              Reiniciar Aplicação
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
