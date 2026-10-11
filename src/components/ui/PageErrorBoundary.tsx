import { Component, type ErrorInfo, type ReactNode } from "react";
import { isChunkLoadError } from "../../lib/lazyPage";

interface Props {
  children: ReactNode;
  /** Clears the error when it changes (routes.tsx passes the pathname). */
  resetKey?: string;
}

interface State {
  error: Error | null;
  /** resetKey the error belongs to; a different key (new page) clears it. */
  key?: string;
  /** Where in the component tree it broke (dev details). */
  componentStack?: string;
}

/** Plain-text report of the crash, for the dev-only details panel and its Copy button. */
function crashReport(error: Error, componentStack?: string): string {
  const NL = "\n";
  const stack = (error.stack ?? "").split(NL).slice(0, 8).join(NL);
  const where = (componentStack ?? "").trim().split(NL).slice(0, 8).join(NL);
  return [
    `${error.name}: ${error.message}`,
    `Page: ${window.location.pathname}${window.location.search}`,
    `When: ${new Date().toISOString()}`,
    "",
    "Stack:",
    stack,
    "",
    "Component:",
    where,
  ].join(NL);
}

/**
 * Last line of defence for route pages: instead of React unmounting everything
 * (a blank screen), show what happened and a way forward. routes.tsx passes the
 * pathname as resetKey, so moving to another page clears it without remounting
 * the layouts.
 */
export class PageErrorBoundary extends Component<Props, State> {
  state: State = { error: null, key: this.props.resetKey };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.resetKey !== state.key ? { key: props.resetKey, error: null, componentStack: undefined } : null;
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Page failed to render:", error, info.componentStack);
    this.setState({ componentStack: info.componentStack ?? undefined });
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    const stale = isChunkLoadError(error);
    const report = import.meta.env.DEV ? crashReport(error, this.state.componentStack) : "";
    return (
      <div className="page-error" role="alert">
        <div className="page-error__card">
          <h1 className="page-error__title">{stale ? "This page didn't load" : "Something went wrong"}</h1>
          <p className="page-error__text">
            {stale
              ? "Zinwe was updated while this tab was open. Reload to get the latest version. Anything you've already saved is safe."
              : "This page hit an unexpected problem. Reload to try again. Anything you've already saved is safe."}
          </p>
          <div className="page-error__actions">
            <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
              Reload
            </button>
            <a className="btn btn--ghost" href="/">
              Go to home
            </a>
          </div>
          {import.meta.env.DEV ? (
            <details className="page-error__details">
              <summary>Technical details (development only)</summary>
              <pre>{report}</pre>
              <button type="button" className="btn btn--ghost" onClick={() => void navigator.clipboard?.writeText(report)}>
                Copy details
              </button>
            </details>
          ) : null}
        </div>
      </div>
    );
  }
}
