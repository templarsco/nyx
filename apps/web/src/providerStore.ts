/**
 * Zustand store for managing AI provider configuration.
 *
 * Persists provider configs to localStorage with debounced writes.
 * API keys are stored by reference only — actual secrets live in
 * Electron safeStorage, never in the browser store.
 */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createDebouncedStorage, createMemoryStorage } from "./lib/storage";

const PROVIDER_STORAGE_KEY = "nyx:provider-config:v1";
const PROVIDER_STORAGE_VERSION = 1;
const PROVIDER_PERSIST_DEBOUNCE_MS = 500;

const providerDebouncedStorage = createDebouncedStorage(
  typeof localStorage !== "undefined" ? localStorage : createMemoryStorage(),
  PROVIDER_PERSIST_DEBOUNCE_MS,
);

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    providerDebouncedStorage.flush();
  });
}

// ── Types ────────────────────────────────────────────────────────────────

export type ProviderType = "lightweight" | "anthropic" | "openai" | "custom";

export type HealthStatus = "healthy" | "degraded" | "down" | "unknown";

export interface ProviderConfig {
  id: string;
  type: ProviderType;
  name: string;
  endpoint: string;
  apiKeyRef: string;
  isDefault: boolean;
  models: string[];
  selectedModel: string | null;
  healthStatus: HealthStatus;
  lastHealthCheck: number | null;
}

// ── Persisted shape (excludes volatile runtime fields) ───────────────────

interface PersistedProviderConfig {
  id: string;
  type: ProviderType;
  name: string;
  endpoint: string;
  apiKeyRef: string;
  isDefault: boolean;
  models: string[];
  selectedModel: string | null;
}

interface PersistedProviderState {
  providers: PersistedProviderConfig[];
  activeProviderId: string | null;
  onboardingComplete: boolean;
}

// ── Store interface ──────────────────────────────────────────────────────

export interface ProviderState {
  providers: ProviderConfig[];
  activeProviderId: string | null;
  onboardingComplete: boolean;

  // Actions
  addProvider: (
    config: Omit<ProviderConfig, "id" | "healthStatus" | "lastHealthCheck">,
  ) => string;
  updateProvider: (id: string, updates: Partial<ProviderConfig>) => void;
  removeProvider: (id: string) => void;
  setActiveProvider: (id: string) => void;
  setSelectedModel: (providerId: string, model: string) => void;
  updateHealthStatus: (providerId: string, status: HealthStatus) => void;
  completeOnboarding: () => void;

  // Getters
  activeProvider: () => ProviderConfig | null;
  activeModel: () => string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function partializeState(
  state: ProviderState,
): PersistedProviderState {
  return {
    providers: state.providers.map(
      ({ healthStatus: _h, lastHealthCheck: _l, ...rest }) => rest,
    ),
    activeProviderId: state.activeProviderId,
    onboardingComplete: state.onboardingComplete,
  };
}

function hydrateProviders(
  persisted: PersistedProviderConfig[],
): ProviderConfig[] {
  return persisted.map((p) => ({
    ...p,
    healthStatus: "unknown" as const,
    lastHealthCheck: null,
  }));
}

function migrateState(persisted: unknown): PersistedProviderState {
  if (!persisted || typeof persisted !== "object") {
    return { providers: [], activeProviderId: null, onboardingComplete: false };
  }
  const candidate = persisted as Record<string, unknown>;
  return {
    providers: Array.isArray(candidate.providers) ? candidate.providers : [],
    activeProviderId:
      typeof candidate.activeProviderId === "string"
        ? candidate.activeProviderId
        : null,
    onboardingComplete: candidate.onboardingComplete === true,
  };
}

// ── Store ────────────────────────────────────────────────────────────────

export const useProviderStore = create<ProviderState>()(
  persist(
    (set, get) => ({
      providers: [],
      activeProviderId: null,
      onboardingComplete: false,

      addProvider: (config) => {
        const id = generateId();
        const newProvider: ProviderConfig = {
          ...config,
          id,
          healthStatus: "unknown",
          lastHealthCheck: null,
        };

        set((state) => {
          // If this provider is marked as default, clear default on all others
          const updatedProviders = config.isDefault
            ? state.providers.map((p) => ({ ...p, isDefault: false }))
            : [...state.providers];

          return {
            providers: [...updatedProviders, newProvider],
            activeProviderId:
              config.isDefault || state.providers.length === 0
                ? id
                : state.activeProviderId,
          };
        });

        return id;
      },

      updateProvider: (id, updates) => {
        set((state) => {
          const index = state.providers.findIndex((p) => p.id === id);
          if (index < 0) return state;

          const updatedProviders = [...state.providers];
          updatedProviders[index] = { ...updatedProviders[index]!, ...updates };

          // If setting as default, clear default on all others
          if (updates.isDefault === true) {
            for (let i = 0; i < updatedProviders.length; i++) {
              if (i !== index) {
                updatedProviders[i] = { ...updatedProviders[i]!, isDefault: false };
              }
            }
          }

          return { providers: updatedProviders };
        });
      },

      removeProvider: (id) => {
        set((state) => {
          const nextProviders = state.providers.filter((p) => p.id !== id);
          const needsNewActive = state.activeProviderId === id;
          return {
            providers: nextProviders,
            activeProviderId: needsNewActive
              ? (nextProviders.find((p) => p.isDefault)?.id ??
                nextProviders[0]?.id ??
                null)
              : state.activeProviderId,
          };
        });
      },

      setActiveProvider: (id) => {
        const state = get();
        if (state.activeProviderId === id) return;
        if (!state.providers.some((p) => p.id === id)) return;
        set({ activeProviderId: id });
      },

      setSelectedModel: (providerId, model) => {
        set((state) => {
          const index = state.providers.findIndex((p) => p.id === providerId);
          if (index < 0) return state;

          const provider = state.providers[index]!;
          if (provider.selectedModel === model) return state;

          const updatedProviders = [...state.providers];
          updatedProviders[index] = { ...provider, selectedModel: model };
          return { providers: updatedProviders };
        });
      },

      updateHealthStatus: (providerId, status) => {
        set((state) => {
          const index = state.providers.findIndex((p) => p.id === providerId);
          if (index < 0) return state;

          const provider = state.providers[index]!;
          if (provider.healthStatus === status) return state;

          const updatedProviders = [...state.providers];
          updatedProviders[index] = {
            ...provider,
            healthStatus: status,
            lastHealthCheck: Date.now(),
          };
          return { providers: updatedProviders };
        });
      },

      completeOnboarding: () => {
        if (get().onboardingComplete) return;
        set({ onboardingComplete: true });
      },

      activeProvider: () => {
        const state = get();
        return (
          state.providers.find((p) => p.id === state.activeProviderId) ??
          state.providers.find((p) => p.isDefault) ??
          state.providers[0] ??
          null
        );
      },

      activeModel: () => {
        const provider = get().activeProvider();
        return provider?.selectedModel ?? provider?.models[0] ?? null;
      },
    }),
    {
      name: PROVIDER_STORAGE_KEY,
      version: PROVIDER_STORAGE_VERSION,
      storage: createJSONStorage(() => providerDebouncedStorage),
      migrate: migrateState,
      partialize: partializeState,
      merge: (persistedState, currentState) => {
        const normalized = migrateState(persistedState);
        return {
          ...currentState,
          providers: hydrateProviders(
            normalized.providers as PersistedProviderConfig[],
          ),
          activeProviderId: normalized.activeProviderId,
          onboardingComplete: normalized.onboardingComplete,
        };
      },
    },
  ),
);

// ── Well-known provider defaults ─────────────────────────────────────────

export const LIGHTWEIGHT_GATEWAY_ENDPOINT = "https://api.lightweight.one/v1";

export const LIGHTWEIGHT_DEFAULT_MODELS = [
  "claude-sonnet-4-20250514",
  "claude-3-5-haiku-20241022",
  "gpt-4.1",
  "gpt-4.1-mini",
  "gpt-4.1-nano",
  "o4-mini",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "deepseek-chat",
  "deepseek-reasoner",
] as const;

export const PROVIDER_TYPE_META: Record<
  ProviderType,
  { label: string; defaultEndpoint: string; keyPrefix: string }
> = {
  lightweight: {
    label: "Lightweight Gateway",
    defaultEndpoint: LIGHTWEIGHT_GATEWAY_ENDPOINT,
    keyPrefix: "lw_sk_",
  },
  anthropic: {
    label: "Anthropic",
    defaultEndpoint: "https://api.anthropic.com/v1",
    keyPrefix: "sk-ant-",
  },
  openai: {
    label: "OpenAI",
    defaultEndpoint: "https://api.openai.com/v1",
    keyPrefix: "sk-",
  },
  custom: {
    label: "Custom Endpoint",
    defaultEndpoint: "",
    keyPrefix: "",
  },
};
