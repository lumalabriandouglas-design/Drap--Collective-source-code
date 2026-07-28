import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Link } from 'react-router-dom';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional label shown in the error card header */
  label?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary — catches render errors in its subtree and displays
 * a polite, brand-aligned fallback UI instead of crashing the whole app.
 *
 * Place it around Layout / dashboard routes so a desktop-only component
 * crash never freezes the user on a loading spinner.
 */
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`ErrorBoundary${this.props.label ? ` (${this.props.label})` : ''}:`, error, info.componentStack);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-bg px-4">
          <div className="max-w-md w-full text-center animate-scale-in">
            {/* Brand icon */}
            <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-ivory-100 flex items-center justify-center">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="text-charcoal-300"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
            </div>

            <h2 className="text-xl font-serif text-charcoal-700 mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-charcoal-400 font-light leading-relaxed mb-6 max-w-xs mx-auto">
              {this.props.label ?? 'A section'} encountered an unexpected error.
              Our team has been notified.
            </p>

            {/* Stack trace (dev only) */}
            {this.state.error && (
              <details className="mb-6 text-left max-w-full overflow-auto">
                <summary className="cursor-pointer text-xs text-charcoal-300 hover:text-charcoal-500 font-medium tracking-wide mb-2">
                  Error details
                </summary>
                <pre className="text-[10px] text-error bg-error/5 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap leading-relaxed border border-error/10">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleRetry}
                className="btn-luxury btn-luxury-primary text-xs"
              >
                Try Again
              </button>
              <Link
                to="/"
                className="btn-luxury btn-luxury-outline text-xs"
                onClick={() => this.setState({ hasError: false, error: null })}
              >
                Go Home
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
