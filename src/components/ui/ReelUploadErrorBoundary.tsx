import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ReelUploadErrorBoundaryProps {
  children: ReactNode;
}

interface ReelUploadErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ReelUploadErrorBoundary — catches ANY JavaScript exception thrown
 * inside the Upload Reel form (file parsing, state updates, etc.) and
 * FREEZES the page state with a visible red error box instead of
 * letting the component unmount or vanish.
 *
 * The user can click "Dismiss" to clear the error and continue.
 */
export default class ReelUploadErrorBoundary extends Component<
  ReelUploadErrorBoundaryProps,
  ReelUploadErrorBoundaryState
> {
  constructor(props: ReelUploadErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ReelUploadErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ReelUploadErrorBoundary] Caught exception:', error, info.componentStack);
  }

  handleDismiss = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[60] bg-charcoal-900/70 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl w-full max-w-lg overflow-hidden shadow-elevation-3 border border-error/20">
            {/* Header */}
            <div className="flex items-center gap-3 p-6 border-b border-error/10">
              <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center text-error shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h2 className="text-lg font-serif text-charcoal-700">Upload Error</h2>
                <p className="text-xs text-charcoal-400 mt-0.5">
                  The upload component encountered a system error
                </p>
              </div>
            </div>

            {/* Error message body */}
            <div className="p-6">
              <div className="p-4 rounded-xl bg-error/5 border border-error/15 text-error/90 text-xs leading-relaxed">
                <p className="font-medium mb-1">System Error Message:</p>
                <code className="block text-[11px] font-mono break-all whitespace-pre-wrap">
                  {this.state.error?.message || 'Unknown error'}
                </code>
              </div>

              <p className="mt-4 text-xs text-charcoal-400 leading-relaxed">
                The page state has been frozen so no data is lost. Click
                below to dismiss this error and return to the dashboard.
              </p>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={this.handleDismiss}
                  className="px-5 py-2.5 rounded-xl text-xs font-medium text-white bg-charcoal-700 hover:bg-charcoal-800 transition-all"
                >
                  Dismiss &amp; Return
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}