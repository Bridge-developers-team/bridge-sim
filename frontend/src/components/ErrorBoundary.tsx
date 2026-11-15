import { Component, type ErrorInfo, type ReactNode } from "react";

/** If a page crashes while rendering, show a calm way out instead of a blank
 * screen. The user's saved progress lives in localStorage and is untouched.
 * Placed around each page (keyed by path), so moving to another page resets it. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Kept in the browser console for whoever debugs it; nothing is sent anywhere.
    console.error("Page crashed:", error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="panel crash" role="alert">
        <h1>Something went wrong on this page</h1>
        <p className="muted">Your progress is saved on this device. Reloading usually fixes it.</p>
        <div className="row">
          <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
            Reload the page
          </button>
          <a className="btn btn--default" href="/">
            Back to the start
          </a>
        </div>
      </div>
    );
  }
}
