import React from 'react';

type ErrorBoundaryState = { hasError: boolean; error?: any };

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    // eslint-disable-next-line no-console
    console.error('UI ErrorBoundary caught error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="p-4 border rounded bg-red-50 text-red-700">
          Ocorreu um erro ao renderizar esta seção. Tente recarregar a página.
        </div>
      );
    }
    return this.props.children;
  }
}


