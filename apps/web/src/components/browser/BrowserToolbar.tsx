import { Globe, Plus, X } from "lucide-react";
import { useBrowserStore } from "../../browserStore";

/**
 * Toolbar for managing multiple browser panes.
 * Shows tabs for each open pane with close buttons.
 */
export function BrowserToolbar() {
  const panes = useBrowserStore((s) => s.panes);
  const activePaneId = useBrowserStore((s) => s.activePaneId);
  const setActivePane = useBrowserStore((s) => s.setActivePane);
  const closePane = useBrowserStore((s) => s.closePane);
  const openPane = useBrowserStore((s) => s.openPane);

  if (panes.length === 0) return null;

  return (
    <div className="flex items-center gap-0.5 border-b border-border bg-card px-1 py-0.5">
      {panes.map((pane) => (
        <div
          key={pane.id}
          className={`group flex max-w-[180px] cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors ${
            pane.id === activePaneId
              ? "bg-accent text-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          }`}
          onClick={() => setActivePane(pane.id)}
        >
          <Globe className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{pane.title || pane.url}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              closePane(pane.id);
            }}
            className="ml-auto flex h-4 w-4 items-center justify-center rounded opacity-0 transition-opacity hover:bg-destructive/20 group-hover:opacity-100"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
      ))}

      {/* New pane button */}
      <button
        type="button"
        onClick={() => openPane()}
        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        title="New browser pane"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
