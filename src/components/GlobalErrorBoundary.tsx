import { Component, ErrorInfo, ReactNode } from "react";
import { t } from '@/lib/i18n-toast';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isChunkError: boolean;
}

/**
 * Detects stale-cache chunk load failures (e.g. after a deploy changes asset hashes)
 * and general render crashes. Chunk errors auto-reload once; other errors show a
 * recovery UI so the user isn't stuck on a white screen.
 */
function isChunkLoadError(error: Error): boolean {
  const msg = error.message || "";
  return (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Loading chunk") ||
    msg.includes("Loading CSS chunk") ||
    msg.includes("Importing a module script failed") ||
    error.name === "ChunkLoadError"
  );
}

const RELOAD_KEY = "vitana_chunk_reload";

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, isChunkError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      isChunkError: isChunkLoadError(error),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[GlobalErrorBoundary]", error);
    console.error("[ErrorInfo]", errorInfo);

    // Auto-reload once for ANY crash. Stale chunks after a deploy can cause
    // both recognizable chunk-load errors AND runtime TypeError/ReferenceError
    // when old code references changed exports. A single reload fetches the
    // latest index.html and resolves both cases.
    const lastReload = sessionStorage.getItem(RELOAD_KEY);
    const now = Date.now();
    if (!lastReload || now - Number(lastReload) > 10_000) {
      sessionStorage.setItem(RELOAD_KEY, String(now));
      window.location.reload();
      return;
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, isChunkError: false });
  };

  handleReload = () => {
    sessionStorage.removeItem(RELOAD_KEY);
    window.location.reload();
  };

  handleGoHome = () => {
    sessionStorage.removeItem(RELOAD_KEY);
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex items-center justify-center min-h-[80vh] px-6">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-lg font-semibold">
            {this.state.isChunkError
              ? "App updated — please reload"
              : "Something went wrong"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {this.state.isChunkError
              ? "A new version was deployed. Reload to get the latest."
              : "An unexpected error occurred. Try reloading the page."}
          </p>
          {/* Surface the actual error so a mobile user can screenshot it for
              support/diagnosis without needing a desktop console. Expressions
              only (no raw JSX text) to satisfy the i18n lint. */}
          {!this.state.isChunkError && this.state.error ? (
            <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-muted/50 p-2 text-left text-[10px] leading-snug text-muted-foreground">
              {String(this.state.error.message || this.state.error)}
              {this.state.error.stack
                ? "\n\n" + this.state.error.stack.split("\n").slice(0, 6).join("\n")
                : ""}
            </pre>
          ) : null}
          <div className="flex flex-col gap-2">
            <button
              onClick={this.handleReload}
              className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground font-medium text-sm"
            >
              {t('screens.common.reloadPage')}
            </button>
            {!this.state.isChunkError && (
              <button
                onClick={this.handleRetry}
                className="w-full py-2.5 px-4 rounded-lg border border-border text-sm"
              >
                {t('screens.common.tryAgain')}
              </button>
            )}
            <button
              onClick={this.handleGoHome}
              className="w-full py-2 px-4 text-sm text-muted-foreground"
            >
              {t('screens.common.goHome')}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
