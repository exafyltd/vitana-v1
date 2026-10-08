import { Component, ErrorInfo, ReactNode } from "react";
import { t } from '@/lib/i18n-toast';
import { reportReactError } from '@/lib/notifDiag';
import {
  autoRecoveryAllowed,
  clearAutoRecoveryMark,
  markAutoRecovery,
  recoverFromStaleBundle,
} from '@/lib/stale-bundle-recovery';

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
 * and general render crashes. Chunk errors auto-recover once; other errors show a
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

    // VTID-05000: decide up front whether this crash will auto-recover, so the
    // beacon below can say so (`recovery_attempt`).
    const willRecover = autoRecoveryAllowed();

    // Report the crash to the gateway BEFORE the auto-recovery below. React
    // boundaries swallow render-phase errors before they reach window.onerror,
    // so without this the crash leaves no server-side trace — and the worst
    // offenders (e.g. the voice overlay auto-opening on mobile) only reproduce
    // on real devices. The component stack names the exact failing component.
    // Uses a keepalive fetch under the hood, so it survives the navigation that follows.
    try {
      reportReactError(error, errorInfo?.componentStack, {
        is_chunk_error: isChunkLoadError(error),
        recovery_attempt: willRecover,
        pathname: typeof window !== "undefined" ? window.location.pathname : "",
      });
    } catch {
      /* diagnostics must never mask the original error */
    }

    // Auto-recover once for ANY crash. Stale chunks after a deploy can cause
    // both recognizable chunk-load errors AND runtime TypeError/ReferenceError
    // when old code references changed exports. VTID-05000: recovery loads the
    // page under a fresh `_vr` URL (and clears app caches) instead of a plain
    // reload, which a WebView serving a stale shell answers with the same shell.
    if (willRecover) {
      markAutoRecovery();
      void recoverFromStaleBundle();
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, isChunkError: false });
  };

  handleReload = () => {
    clearAutoRecoveryMark();
    void recoverFromStaleBundle();
  };

  handleGoHome = () => {
    clearAutoRecoveryMark();
    void recoverFromStaleBundle("/");
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
              ? t('screens.common.appUpdatedTitle')
              : t('screens.common.somethingWentWrongTitle')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {this.state.isChunkError
              ? t('screens.common.appUpdatedBody')
              : t('screens.common.somethingWentWrongBody')}
          </p>
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
