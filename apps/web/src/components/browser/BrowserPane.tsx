import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Globe, Loader2, RefreshCw, X, AlertTriangle } from "lucide-react";
import { useBrowserStore } from "../../browserStore";

interface BrowserPaneProps {
  readonly paneId: string;
  readonly className?: string;
}

export function BrowserPane({ paneId, className }: BrowserPaneProps) {
  const pane = useBrowserStore((s) => s.panes.find((p) => p.id === paneId));
  const updatePaneState = useBrowserStore((s) => s.updatePaneState);
  const navigateTo = useBrowserStore((s) => s.navigateTo);
  const closePane = useBrowserStore((s) => s.closePane);
  const addHistoryEntry = useBrowserStore((s) => s.addHistoryEntry);

  const [urlInput, setUrlInput] = useState(pane?.url ?? "");
  const webviewRef = useRef<HTMLWebViewElement | null>(null);

  // Sync URL input with pane URL
  useEffect(() => {
    if (pane?.url) {
      setUrlInput(pane.url);
    }
  }, [pane?.url]);

  const handleNavigate = useCallback(
    (url: string) => {
      let resolvedUrl = url.trim();
      if (!resolvedUrl) return;

      // Auto-add protocol
      if (!resolvedUrl.startsWith("http://") && !resolvedUrl.startsWith("https://")) {
        if (resolvedUrl.startsWith("localhost") || resolvedUrl.match(/^\d+\.\d+\.\d+\.\d+/)) {
          resolvedUrl = `http://${resolvedUrl}`;
        } else {
          resolvedUrl = `https://${resolvedUrl}`;
        }
      }

      navigateTo(paneId, resolvedUrl);
      setUrlInput(resolvedUrl);
    },
    [paneId, navigateTo],
  );

  const handleUrlSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      handleNavigate(urlInput);
    },
    [urlInput, handleNavigate],
  );

  const handleBack = useCallback(() => {
    const wv = webviewRef.current as unknown as { goBack?: () => void };
    wv?.goBack?.();
  }, []);

  const handleForward = useCallback(() => {
    const wv = webviewRef.current as unknown as { goForward?: () => void };
    wv?.goForward?.();
  }, []);

  const handleReload = useCallback(() => {
    const wv = webviewRef.current as unknown as { reload?: () => void };
    wv?.reload?.();
  }, []);

  if (!pane) {
    return (
      <div
        className={`flex items-center justify-center bg-background text-muted-foreground ${className ?? ""}`}
      >
        <p>Browser pane not found</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col bg-background ${className ?? ""}`}>
      {/* Navigation bar */}
      <div className="flex items-center gap-1.5 border-b border-border bg-card px-2 py-1.5">
        {/* Back / Forward */}
        <button
          type="button"
          onClick={handleBack}
          disabled={!pane.canGoBack}
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
          title="Back"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleForward}
          disabled={!pane.canGoForward}
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
          title="Forward"
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleReload}
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
          title="Reload"
        >
          {pane.loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
        </button>

        {/* URL bar */}
        <form onSubmit={handleUrlSubmit} className="flex-1">
          <div className="flex items-center gap-1.5 rounded border border-border bg-background px-2 py-1">
            <Globe className="h-3 w-3 flex-shrink-0 text-primary" />
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
              placeholder="Enter URL..."
              spellCheck={false}
            />
          </div>
        </form>

        {/* Close button */}
        <button
          type="button"
          onClick={() => closePane(paneId)}
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:text-destructive"
          title="Close browser pane"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Content area */}
      <div className="relative flex-1">
        {pane.error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 text-warning" />
            <p className="text-sm">{pane.error}</p>
            <button
              type="button"
              onClick={handleReload}
              className="rounded border border-border px-3 py-1 text-xs transition-colors hover:bg-accent"
            >
              Retry
            </button>
          </div>
        ) : (
          <webview
            ref={webviewRef as React.Ref<HTMLWebViewElement>}
            src={pane.url}
            className="h-full w-full"
            /* Security: sandbox the webview */
            {...({
              nodeintegration: "false",
              contextIsolation: "true",
              partition: "persist:nyx-browser",
            } as Record<string, string>)}
          />
        )}
      </div>
    </div>
  );
}

export function BrowserPanePlaceholder({ className }: { className?: string }) {
  const openPane = useBrowserStore((s) => s.openPane);

  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 bg-background text-muted-foreground ${className ?? ""}`}
    >
      <Globe className="h-12 w-12 opacity-20" />
      <div className="text-center">
        <p className="text-sm font-medium">No browser pane open</p>
        <p className="mt-1 text-xs">Open a URL to preview your app alongside your terminal</p>
      </div>
      <button
        type="button"
        onClick={() => openPane()}
        className="rounded-md border border-border bg-card px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent"
      >
        Open Browser
      </button>
    </div>
  );
}
