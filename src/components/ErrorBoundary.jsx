import { Component } from "react";

/**
 * Error Boundary Component
 * Catches JavaScript errors in child components and displays a fallback UI
 * Prevents entire app from crashing when a single component fails
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI
    return {
      hasError: true,
      error: error
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error information for debugging
    console.error('ErrorBoundary caught an error:', {
      error: error?.message || error,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack
    });

    this.setState({
      errorInfo
    });

    // Optional: Send error to logging service
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI or use default
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center border border-slate-100">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h1 className="text-xl font-bold text-slate-800 mb-2">
              Terjadi Kesalahan
            </h1>

            <p className="text-sm text-slate-500 mb-6">
              {this.state.error?.message || 'Komponen mengalami error yang tidak terduga.'}
            </p>

            <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Detail Error
              </p>
              <pre className="text-xs text-red-600 overflow-x-auto max-h-32 font-mono">
                {this.state.error?.stack?.split('\n').slice(0, 3).join('\n') || 'No stack trace available'}
              </pre>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-colors border-0 cursor-pointer"
              >
                Kembali ke Beranda
              </button>
              <button
                onClick={this.handleRetry}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-colors border-0 cursor-pointer"
              >
                Coba Lagi
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

/**
 * HOC version for functional components
 * Wraps a component with error boundary
 */
export function withErrorBoundary(Component, fallback = null, onError = null) {
  return function WrappedComponent(props) {
    return (
      <ErrorBoundary fallback={fallback} onError={onError}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
