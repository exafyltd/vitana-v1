/**
 * VTID-05297 (Native Wave 2, home-feed lane) — class-component twin of the web
 * `src/components/feed/FeedItemErrorBoundary.tsx`. Isolates one feed item's
 * render error from the rest of the list: a malformed item (a null field, an
 * unexpected shape) degrades to the already-translated `fallback` instead of
 * tearing down the whole feed. Mount one per item, keyed by the item's own id
 * — a key change remounts the boundary and clears the error, so there is no
 * separate retry affordance to build. React 19: typed with `ReactNode`.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Already-translated fallback shown in place of a crashed item. */
  fallback: ReactNode;
}

interface State {
  hasError: boolean;
}

export class FeedItemErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[FeedItemErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
