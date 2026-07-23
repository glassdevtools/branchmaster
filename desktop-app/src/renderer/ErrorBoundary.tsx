import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

const logRendererError = (error: Error, componentStack: string | null) => {
  // The boundary reports to the main process so a render crash leaves a breadcrumb even after reload.
  if (typeof window !== "undefined" && window.branchtracker !== undefined) {
    void window.branchtracker
      .logRendererError({
        message: error.message,
        source: "react-error-boundary",
        stack: error.stack ?? null,
        componentStack,
      })
      .catch(() => {});
  }
};

// A render exception without a boundary unmounts the whole app into a blank window, so this catches it
// and shows the error with a reload instead. One bad row can no longer take down the entire UI.
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logRendererError(error, errorInfo.componentStack ?? null);
  }

  render() {
    const { error } = this.state;

    if (error === null) {
      return this.props.children;
    }

    return (
      <div className="error-boundary-screen">
        <div className="error-boundary-card">
          <h1 className="error-boundary-title">Something went wrong</h1>
          <p className="error-boundary-message">{error.message}</p>
          {error.stack === undefined ? null : (
            <pre className="error-boundary-stack">{error.stack}</pre>
          )}
          <div className="error-boundary-actions">
            <button
              className="error-boundary-reload"
              type="button"
              onClick={() => {
                window.location.reload();
              }}
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
