/**
 * First-launch onboarding screen for AI provider setup.
 *
 * Presents two paths:
 *   - Easy Mode   (Lightweight Gateway, single key, 25+ models)
 *   - Advanced    (Direct Anthropic / OpenAI / Custom endpoint)
 *
 * Once the user verifies a connection and selects a model the
 * onboarding is marked complete and the main app becomes visible.
 */

import { useCallback, useMemo, useState } from "react";
import {
  ZapIcon,
  SettingsIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  AlertCircleIcon,
  Loader2Icon,
  SparklesIcon,
} from "lucide-react";
import {
  useProviderStore,
  LIGHTWEIGHT_GATEWAY_ENDPOINT,
  LIGHTWEIGHT_DEFAULT_MODELS,
  PROVIDER_TYPE_META,
  type ProviderType,
} from "~/providerStore";
import { cn } from "~/lib/utils";

// ── Sub-types ────────────────────────────────────────────────────────────

type OnboardingStep = "choose" | "configure" | "model-select";
type ConnectionState = "idle" | "testing" | "success" | "error";

const ADVANCED_PROVIDERS: ProviderType[] = ["anthropic", "openai", "custom"];

// ── Nyx logo (inline SVG matching assets/prod/nyx-logo.svg) ─────────────

function NyxLogo({ className }: { className?: string }) {
  return (
    <svg
      width="128"
      height="128"
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="128" height="128" rx="9.984" fill="#0f0a1e" />
      <defs>
        <mask id="nyx-onboarding-moon-mask">
          <rect width="128" height="128" fill="white" />
          <circle cx="87.04" cy="57.6" r="33.28" fill="black" />
        </mask>
      </defs>
      <circle cx="57.6" cy="66.56" r="40.96" fill="#7c3aed" mask="url(#nyx-onboarding-moon-mask)" />
      <circle cx="96" cy="28.16" r="2.304" fill="#a78bfa" opacity="0.8" />
      <circle cx="104.96" cy="44.8" r="1.536" fill="#a78bfa" opacity="0.8" />
      <circle cx="87.04" cy="19.2" r="1.28" fill="#a78bfa" opacity="0.8" />
    </svg>
  );
}

// ── Main component ───────────────────────────────────────────────────────

function OnboardingScreen() {
  const addProvider = useProviderStore((s) => s.addProvider);
  const completeOnboarding = useProviderStore((s) => s.completeOnboarding);

  // Step navigation
  const [step, setStep] = useState<OnboardingStep>("choose");
  const [selectedPath, setSelectedPath] = useState<"easy" | "advanced" | null>(null);

  // Provider form state
  const [advancedType, setAdvancedType] = useState<ProviderType>("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [customEndpoint, setCustomEndpoint] = useState("");
  const [customName, setCustomName] = useState("");

  // Connection test
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [discoveredModels, setDiscoveredModels] = useState<string[]>([]);

  // Model selection
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  // ── Derived values ───────────────────────────────────────────────────

  const providerType: ProviderType = selectedPath === "easy" ? "lightweight" : advancedType;

  const meta = PROVIDER_TYPE_META[providerType];

  const endpoint = providerType === "custom" ? customEndpoint : meta.defaultEndpoint;

  const providerName = providerType === "custom" && customName.length > 0 ? customName : meta.label;

  const isKeyValid = useMemo(() => {
    const trimmed = apiKey.trim();
    if (trimmed.length < 8) return false;
    if (providerType === "lightweight") return trimmed.startsWith("lw_sk_");
    if (providerType === "custom") return trimmed.length >= 8;
    if (meta.keyPrefix.length > 0) return trimmed.startsWith(meta.keyPrefix);
    return true;
  }, [apiKey, providerType, meta.keyPrefix]);

  const canTest = isKeyValid && (providerType !== "custom" || customEndpoint.trim().length > 0);

  // ── Connection test ──────────────────────────────────────────────────

  const testConnection = useCallback(async () => {
    setConnectionState("testing");
    setConnectionError(null);

    try {
      const testEndpoint = endpoint.replace(/\/$/, "");
      const response = await fetch(`${testEndpoint}/models`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 401 || status === 403) {
          throw new Error("Invalid API key. Please check and try again.");
        }
        throw new Error(`Server responded with ${status}. Check your endpoint.`);
      }

      const body = (await response.json()) as {
        data?: Array<{ id?: string }>;
      };

      const modelIds = (body.data ?? [])
        .map((m) => m.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0);

      // Fall back to well-known defaults when the endpoint returns nothing
      const models =
        modelIds.length > 0
          ? modelIds
          : providerType === "lightweight"
            ? [...LIGHTWEIGHT_DEFAULT_MODELS]
            : [];

      setDiscoveredModels(models);
      setConnectionState("success");

      // Auto-select the first model and advance to model selection
      if (models.length > 0) {
        setSelectedModel(models[0]!);
        setStep("model-select");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Connection failed. Check your network and try again.";
      setConnectionError(message);
      setConnectionState("error");
    }
  }, [apiKey, endpoint, providerType]);

  // ── Finalize onboarding ──────────────────────────────────────────────

  const handleFinish = useCallback(() => {
    if (!selectedModel) return;

    const keyRef = `provider-key-${Date.now()}`;

    addProvider({
      type: providerType,
      name: providerName,
      endpoint,
      apiKeyRef: keyRef,
      isDefault: true,
      models: discoveredModels,
      selectedModel,
    });

    completeOnboarding();
  }, [
    addProvider,
    completeOnboarding,
    discoveredModels,
    endpoint,
    providerName,
    providerType,
    selectedModel,
  ]);

  // ── Render helpers ───────────────────────────────────────────────────

  const renderChooseStep = () => (
    <div className="flex w-full max-w-lg flex-col gap-5">
      {/* Easy Mode card */}
      <button
        type="button"
        className={cn(
          "group relative flex flex-col gap-3 rounded-2xl border p-5 text-left transition-all",
          "hover:border-primary/40 hover:shadow-[0_0_24px_rgba(124,58,237,0.08)]",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background outline-none",
          selectedPath === "easy"
            ? "border-primary/50 bg-primary/[0.04] shadow-[0_0_24px_rgba(124,58,237,0.08)]"
            : "border-border bg-card",
        )}
        onClick={() => {
          setSelectedPath("easy");
          setStep("configure");
        }}
      >
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <ZapIcon className="size-5 text-primary" />
          </div>
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="text-sm font-semibold text-foreground">Easy Mode</span>
            <span className="text-xs text-muted-foreground">
              Lightweight Gateway &mdash; one key, 25+ models
            </span>
          </div>
          <ChevronRightIcon className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
        <div className="flex flex-wrap gap-1.5 pl-[3.25rem]">
          {["Claude", "GPT-4.1", "Gemini", "DeepSeek"].map((name) => (
            <span
              key={name}
              className="inline-flex items-center rounded-md bg-secondary/70 px-2 py-0.5 text-[11px] font-medium text-secondary-foreground"
            >
              {name}
            </span>
          ))}
          <span className="inline-flex items-center rounded-md bg-secondary/50 px-2 py-0.5 text-[11px] text-muted-foreground">
            +21 more
          </span>
        </div>
      </button>

      {/* Advanced card */}
      <button
        type="button"
        className={cn(
          "group relative flex items-center gap-3 rounded-2xl border p-5 text-left transition-all",
          "hover:border-border/80 hover:bg-accent/30",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background outline-none",
          selectedPath === "advanced"
            ? "border-primary/50 bg-primary/[0.04]"
            : "border-border bg-card",
        )}
        onClick={() => {
          setSelectedPath("advanced");
          setStep("configure");
        }}
      >
        <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
          <SettingsIcon className="size-5 text-muted-foreground" />
        </div>
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="text-sm font-semibold text-foreground">Advanced</span>
          <span className="text-xs text-muted-foreground">
            Direct provider &mdash; Anthropic, OpenAI, or custom endpoint
          </span>
        </div>
        <ChevronRightIcon className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </button>
    </div>
  );

  const renderConfigureStep = () => (
    <div className="flex w-full max-w-lg flex-col gap-5">
      {/* Back link */}
      <button
        type="button"
        className="inline-flex items-center gap-1 self-start text-xs text-muted-foreground transition-colors hover:text-foreground outline-none focus-visible:underline"
        onClick={() => {
          setStep("choose");
          setConnectionState("idle");
          setConnectionError(null);
        }}
      >
        <ChevronRightIcon className="size-3 rotate-180" />
        Back
      </button>

      {/* Advanced: provider type selector */}
      {selectedPath === "advanced" && (
        <div className="flex gap-2">
          {ADVANCED_PROVIDERS.map((type) => {
            const typeMeta = PROVIDER_TYPE_META[type];
            return (
              <button
                key={type}
                type="button"
                className={cn(
                  "flex-1 rounded-lg border px-3 py-2 text-center text-xs font-medium transition-all outline-none",
                  "focus-visible:ring-2 focus-visible:ring-ring",
                  advancedType === type
                    ? "border-primary/50 bg-primary/[0.06] text-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-border/80 hover:text-foreground",
                )}
                onClick={() => {
                  setAdvancedType(type);
                  setApiKey("");
                  setConnectionState("idle");
                  setConnectionError(null);
                }}
              >
                {typeMeta.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Custom endpoint input */}
      {providerType === "custom" && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-foreground" htmlFor="onb-custom-name">
            Provider Name
          </label>
          <span className="relative inline-flex w-full rounded-lg border border-input bg-background text-sm shadow-xs/5 ring-ring/24 transition-shadow has-focus-visible:border-ring has-focus-visible:ring-[3px] dark:bg-input/32">
            <input
              id="onb-custom-name"
              type="text"
              className="h-8 w-full min-w-0 rounded-[inherit] bg-transparent px-3 leading-8 outline-none placeholder:text-muted-foreground/60"
              placeholder="My Provider"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
            />
          </span>

          <label className="mt-1 text-xs font-medium text-foreground" htmlFor="onb-endpoint">
            Endpoint URL
          </label>
          <span className="relative inline-flex w-full rounded-lg border border-input bg-background text-sm shadow-xs/5 ring-ring/24 transition-shadow has-focus-visible:border-ring has-focus-visible:ring-[3px] dark:bg-input/32">
            <input
              id="onb-endpoint"
              type="url"
              className="h-8 w-full min-w-0 rounded-[inherit] bg-transparent px-3 leading-8 outline-none placeholder:text-muted-foreground/60 font-mono text-xs"
              placeholder="https://my-provider.example.com/v1"
              value={customEndpoint}
              onChange={(e) => setCustomEndpoint(e.target.value)}
            />
          </span>
        </div>
      )}

      {/* API key input */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-foreground" htmlFor="onb-api-key">
          API Key
        </label>
        <span
          className={cn(
            "relative inline-flex w-full rounded-lg border bg-background text-sm shadow-xs/5 ring-ring/24 transition-shadow dark:bg-input/32",
            connectionState === "error"
              ? "border-destructive/40 has-focus-visible:border-destructive has-focus-visible:ring-destructive/16"
              : "border-input has-focus-visible:border-ring has-focus-visible:ring-[3px]",
          )}
        >
          <input
            id="onb-api-key"
            type="password"
            autoComplete="off"
            className="h-8 w-full min-w-0 rounded-[inherit] bg-transparent px-3 leading-8 outline-none placeholder:text-muted-foreground/60 font-mono text-xs"
            placeholder={providerType === "lightweight" ? "lw_sk_..." : `${meta.keyPrefix}...`}
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              if (connectionState !== "idle") {
                setConnectionState("idle");
                setConnectionError(null);
              }
            }}
          />
        </span>
        {providerType === "lightweight" && (
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Get your key at{" "}
            <a
              href="https://lightweight.one"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:opacity-80"
            >
              lightweight.one
            </a>
          </p>
        )}
      </div>

      {/* Connection error */}
      {connectionState === "error" && connectionError && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/[0.04] px-3 py-2.5">
          <AlertCircleIcon className="mt-0.5 size-3.5 shrink-0 text-destructive-foreground" />
          <p className="text-xs leading-relaxed text-destructive-foreground">{connectionError}</p>
        </div>
      )}

      {/* Test connection button */}
      <button
        type="button"
        disabled={!canTest || connectionState === "testing"}
        className={cn(
          "relative inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium transition-all outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
          "disabled:pointer-events-none disabled:opacity-50",
          connectionState === "success"
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "border-primary bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        )}
        onClick={testConnection}
      >
        {connectionState === "testing" && <Loader2Icon className="size-4 animate-spin" />}
        {connectionState === "success" && <CheckCircle2Icon className="size-4" />}
        {connectionState === "testing"
          ? "Testing connection..."
          : connectionState === "success"
            ? "Connected"
            : "Test Connection"}
      </button>
    </div>
  );

  const renderModelSelectStep = () => (
    <div className="flex w-full max-w-lg flex-col gap-5">
      {/* Back link */}
      <button
        type="button"
        className="inline-flex items-center gap-1 self-start text-xs text-muted-foreground transition-colors hover:text-foreground outline-none focus-visible:underline"
        onClick={() => setStep("configure")}
      >
        <ChevronRightIcon className="size-3 rotate-180" />
        Back
      </button>

      <div className="flex flex-col gap-1.5">
        <h3 className="text-sm font-semibold text-foreground">Choose your default model</h3>
        <p className="text-xs text-muted-foreground">
          You can change this anytime from the chat header.
        </p>
      </div>

      {/* Model grid */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {discoveredModels.slice(0, 20).map((model) => (
          <button
            key={model}
            type="button"
            className={cn(
              "flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left transition-all outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring",
              selectedModel === model
                ? "border-primary/50 bg-primary/[0.06] shadow-[0_0_12px_rgba(124,58,237,0.06)]"
                : "border-border bg-card hover:border-border/80 hover:bg-accent/30",
            )}
            onClick={() => setSelectedModel(model)}
          >
            <span
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                selectedModel === model
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground/30",
              )}
            >
              {selectedModel === model && <CheckCircle2Icon className="size-3" />}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
              {model}
            </span>
          </button>
        ))}
      </div>

      {discoveredModels.length > 20 && (
        <p className="text-center text-[11px] text-muted-foreground">
          +{discoveredModels.length - 20} more models available after setup
        </p>
      )}

      {/* Get Started */}
      <button
        type="button"
        disabled={!selectedModel}
        className={cn(
          "relative inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-xs transition-all outline-none",
          "hover:bg-primary/90",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
          "disabled:pointer-events-none disabled:opacity-50",
        )}
        onClick={handleFinish}
      >
        <SparklesIcon className="size-4" />
        Get Started
      </button>
    </div>
  );

  // ── Layout ─────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      {/* Subtle radial glow behind the logo */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[28%] size-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.05] blur-[120px]" />
      </div>

      <div className="relative flex w-full max-w-xl flex-col items-center gap-8 px-6 py-10">
        {/* Logo + heading */}
        <div className="flex flex-col items-center gap-4">
          <NyxLogo className="size-16 rounded-2xl shadow-lg" />
          <div className="flex flex-col items-center gap-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome to Nyx</h1>
            <p className="max-w-xs text-center text-sm text-muted-foreground">
              {step === "choose" &&
                "Connect an AI provider to get started with your coding assistant."}
              {step === "configure" && `Enter your ${providerName} API key to connect.`}
              {step === "model-select" && "Pick the model you want to use by default."}
            </p>
          </div>
        </div>

        {/* Step content */}
        {step === "choose" && renderChooseStep()}
        {step === "configure" && renderConfigureStep()}
        {step === "model-select" && renderModelSelectStep()}

        {/* Progress dots */}
        <div className="flex items-center gap-2">
          {(["choose", "configure", "model-select"] as const).map((dotStep) => (
            <span
              key={dotStep}
              className={cn(
                "size-1.5 rounded-full transition-colors",
                dotStep === step ? "bg-primary" : "bg-muted-foreground/25",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export { OnboardingScreen };
