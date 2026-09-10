import React from "react";

interface Props {
  children: React.ReactNode;
  /** Already-translated fallback content shown in place of a crashed item. */
  fallback: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Isolates a single list/feed item's render errors from the rest of the app.
 *
 * Before this, one malformed item (a null image field, an unexpected API
 * shape) thrown from deep inside a card propagated all the way up to
 * GlobalErrorBoundary, which unmounts the entire routed app and force-reloads
 * the page — reported as "the app kicks me out" while scrolling the News
 * Feed. Wrapping each item with its own boundary means a bad item degrades to
 * `fallback` and every other item keeps working.
 *
 * Mount one instance per item, keyed by the item's own id — a key change on
 * the wrapper remounts the boundary and clears any previous error state, so
 * there is no separate "retry" affordance to build.
 */
export class FeedItemErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[FeedItemErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
