/**
 * Model selector dropdown for the chat header.
 *
 * Displays the active model and lets the user switch models across all
 * configured providers without restarting. Models are grouped by provider.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import { ChevronDownIcon, CheckIcon, ZapIcon } from "lucide-react";
import { useProviderStore, type ProviderConfig } from "~/providerStore";
import { cn } from "~/lib/utils";

interface ModelGroup {
  provider: ProviderConfig;
  models: string[];
}

interface ModelSelectorProps {
  className?: string;
}

function ModelSelector({ className }: ModelSelectorProps) {
  const providers = useProviderStore((s) => s.providers);
  const activeProviderId = useProviderStore((s) => s.activeProviderId);
  const setActiveProvider = useProviderStore((s) => s.setActiveProvider);
  const setSelectedModel = useProviderStore((s) => s.setSelectedModel);
  const currentProvider = useProviderStore((s) => s.activeProvider());
  const currentModel = useProviderStore((s) => s.activeModel());

  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const groups: ModelGroup[] = useMemo(
    () =>
      providers
        .filter((p) => p.models.length > 0)
        .map((p) => ({ provider: p, models: p.models })),
    [providers],
  );

  const handleSelect = useCallback(
    (providerId: string, model: string) => {
      if (providerId !== activeProviderId) {
        setActiveProvider(providerId);
      }
      setSelectedModel(providerId, model);
      setOpen(false);
      triggerRef.current?.focus();
    },
    [activeProviderId, setActiveProvider, setSelectedModel],
  );

  const handleBlur = useCallback(
    (event: React.FocusEvent) => {
      // Close when focus leaves the panel entirely
      if (
        panelRef.current &&
        !panelRef.current.contains(event.relatedTarget as Node)
      ) {
        setOpen(false);
      }
    },
    [],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    },
    [],
  );

  if (providers.length === 0) {
    return null;
  }

  const displayModel = currentModel ?? "Select model";

  return (
    <div className={cn("relative", className)}>
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-xs font-medium text-muted-foreground transition-colors",
          "hover:border-border hover:bg-accent/50 hover:text-foreground",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background outline-none",
          open && "border-border bg-accent/50 text-foreground",
        )}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <ZapIcon className="size-3 opacity-60" />
        <span className="max-w-[10rem] truncate">{displayModel}</span>
        <ChevronDownIcon
          className={cn(
            "size-3 opacity-50 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          role="listbox"
          tabIndex={-1}
          className="absolute left-0 top-full z-50 mt-1 min-w-[14rem] max-w-[20rem] origin-top-left animate-in fade-in-0 zoom-in-95 rounded-lg border bg-popover not-dark:bg-clip-padding text-popover-foreground shadow-lg/5 before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] dark:before:shadow-[0_-1px_--theme(--color-white/6%)]"
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        >
          <div className="relative max-h-72 overflow-y-auto p-1">
            {groups.map((group, groupIndex) => (
              <div key={group.provider.id}>
                {/* Provider group header */}
                {groups.length > 1 && (
                  <>
                    {groupIndex > 0 && (
                      <div className="mx-2 my-1 h-px bg-border" />
                    )}
                    <div className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {group.provider.name}
                    </div>
                  </>
                )}

                {/* Model items */}
                {group.models.map((model) => {
                  const isActive =
                    group.provider.id === currentProvider?.id &&
                    model === currentModel;

                  return (
                    <button
                      key={`${group.provider.id}:${model}`}
                      role="option"
                      type="button"
                      aria-selected={isActive}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none transition-colors",
                        "hover:bg-accent hover:text-accent-foreground",
                        "focus-visible:bg-accent focus-visible:text-accent-foreground",
                        isActive && "bg-accent/60 text-accent-foreground",
                      )}
                      onClick={() =>
                        handleSelect(group.provider.id, model)
                      }
                    >
                      <span
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center",
                          !isActive && "invisible",
                        )}
                      >
                        <CheckIcon className="size-3" />
                      </span>
                      <span className="min-w-0 flex-1 truncate">{model}</span>
                    </button>
                  );
                })}
              </div>
            ))}

            {groups.length === 0 && (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                No models available. Add a provider first.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export { ModelSelector };
