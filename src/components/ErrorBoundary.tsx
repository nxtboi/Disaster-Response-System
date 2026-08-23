import * as React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export interface ErrorBoundaryProps {
  children?: React.ReactNode;
  fallback?: React.ReactNode;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn("Caught error in ErrorBoundary:", error, errorInfo);
  }

  public override render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="w-full h-full min-h-[200px] bg-zinc-950/90 border border-rose-500/40 rounded-xl p-6 flex flex-col items-center justify-center text-center gap-3">
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-full text-rose-400">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
            Component Error Recovered
          </h3>
          <p className="text-xs text-zinc-400 max-w-md font-mono">
            {this.state.error?.message || "An unexpected error occurred in this view."}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-mono transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Component</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
