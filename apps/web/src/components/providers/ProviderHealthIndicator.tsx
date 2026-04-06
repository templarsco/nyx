/**
 * Compact provider health indicator for the sidebar footer.
 *
 * Shows a colored status dot, the active provider name, and the
 * currently selected model. Clicking it navigates to provider settings.
 */

import { Settings2Icon } from "lucide-react";
import { useProviderStore, type HealthStatus } from "~/providerStore";
import { cn } from "~/lib/utils";
import { Tooltip, TooltipTrigger, TooltipPopup } from "~/components/ui/tooltip";

const STATUS_DOT: Record<HealthStatus, { color: string; label: string }> = {
  healthy: {
    color: "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.45)]",
    label: "Connected",
  },
  degraded: {
    color: "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.45)]",
    label: "Degraded",
  },
  down: {
    color: "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.45)]",
    label: "Disconnected",
  },
  unknown: {
    color: "bg-muted-foreground/40",
    label: "Unknown",
  },
};

interface ProviderHealthIndicatorProps {
  /** Callback fired when the user clicks the indicator to open settings. */
  onOpenSettings?: () => void;
  className?: string;
}

function ProviderHealthIndicator({
  onOpenSettings,
  className,
}: ProviderHealthIndicatorProps) {
  const provider = useProviderStore((s) => s.activeProvider());
  const model = useProviderStore((s) => s.activeModel());

  if (!provider) {
    return null;
  }

  const { color, label } = STATUS_DOT[provider.healthStatus];

  const modelLabel =
    provider.selectedModel ?? model ?? "No model";

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            className={cn(
              "group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent/60",
              className,
            )}
            onClick={onOpenSettings}
            type="button"
          />
        }
      >
        {/* Status dot */}
        <span className="relative flex size-2.5 shrink-0">
          <span
            className={cn(
              "absolute inset-0 rounded-full",
              color,
            )}
          />
          {provider.healthStatus === "healthy" && (
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-30" />
          )}
        </span>

        {/* Provider + model */}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-xs font-medium text-foreground">
            {provider.name}
          </span>
          <span className="truncate text-[11px] leading-tight text-muted-foreground">
            {modelLabel}
          </span>
        </span>

        {/* Settings cog */}
        <Settings2Icon className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </TooltipTrigger>

      <TooltipPopup side="top" sideOffset={8}>
        {label} &mdash; click to configure providers
      </TooltipPopup>
    </Tooltip>
  );
}

export { ProviderHealthIndicator };
