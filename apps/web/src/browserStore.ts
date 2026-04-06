import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Browser pane store manages in-app browser instances.
 * Each browser pane is an Electron webview that can be split alongside terminals.
 * Agents can control browser panes via Playwright bridge (MCP tools).
 */

export interface BrowserPane {
  readonly id: string;
  readonly url: string;
  readonly title: string;
  readonly loading: boolean;
  readonly canGoBack: boolean;
  readonly canGoForward: boolean;
  readonly error: string | null;
  readonly createdAt: number;

  /** Which thread/agent opened this pane (null = user-opened) */
  readonly sourceThreadId: string | null;
}

export interface BrowserHistoryEntry {
  readonly url: string;
  readonly title: string;
  readonly visitedAt: number;
}

export interface BrowserState {
  /** Active browser panes */
  panes: BrowserPane[];

  /** Currently focused pane ID */
  activePaneId: string | null;

  /** Navigation history per pane (last 50 entries) */
  historyByPaneId: Record<string, BrowserHistoryEntry[]>;

  /** Default URL for new browser panes */
  defaultUrl: string;

  /** Whitelist of allowed domains (empty = localhost only) */
  allowedDomains: string[];
}

export interface BrowserActions {
  // Pane lifecycle
  openPane: (url?: string, sourceThreadId?: string | null) => string;
  closePane: (id: string) => void;
  setActivePane: (id: string | null) => void;

  // Navigation
  navigateTo: (paneId: string, url: string) => void;
  updatePaneState: (
    paneId: string,
    updates: Partial<
      Pick<BrowserPane, "url" | "title" | "loading" | "canGoBack" | "canGoForward" | "error">
    >,
  ) => void;

  // History
  addHistoryEntry: (paneId: string, entry: Omit<BrowserHistoryEntry, "visitedAt">) => void;
  clearHistory: (paneId: string) => void;

  // Settings
  setDefaultUrl: (url: string) => void;
  addAllowedDomain: (domain: string) => void;
  removeAllowedDomain: (domain: string) => void;

  // Getters
  activePane: () => BrowserPane | null;
  paneById: (id: string) => BrowserPane | undefined;
}

const MAX_HISTORY_PER_PANE = 50;

const initialState: BrowserState = {
  panes: [],
  activePaneId: null,
  historyByPaneId: {},
  defaultUrl: "http://localhost:3000",
  allowedDomains: [],
};

export const useBrowserStore = create<BrowserState & BrowserActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      openPane: (url?: string, sourceThreadId?: string | null) => {
        const id = crypto.randomUUID();
        const resolvedUrl = url ?? get().defaultUrl;
        const pane: BrowserPane = {
          id,
          url: resolvedUrl,
          title: resolvedUrl,
          loading: true,
          canGoBack: false,
          canGoForward: false,
          error: null,
          createdAt: Date.now(),
          sourceThreadId: sourceThreadId ?? null,
        };
        set((state) => ({
          panes: [...state.panes, pane],
          activePaneId: id,
        }));
        return id;
      },

      closePane: (id: string) => {
        set((state) => {
          const newPanes = state.panes.filter((p) => p.id !== id);
          const newHistory = { ...state.historyByPaneId };
          delete newHistory[id];
          return {
            panes: newPanes,
            historyByPaneId: newHistory,
            activePaneId:
              state.activePaneId === id ? (newPanes[0]?.id ?? null) : state.activePaneId,
          };
        });
      },

      setActivePane: (id: string | null) => {
        set({ activePaneId: id });
      },

      navigateTo: (paneId: string, url: string) => {
        set((state) => ({
          panes: state.panes.map((p) =>
            p.id === paneId ? { ...p, url, loading: true, error: null } : p,
          ),
        }));
      },

      updatePaneState: (paneId, updates) => {
        set((state) => ({
          panes: state.panes.map((p) => (p.id === paneId ? { ...p, ...updates } : p)),
        }));
      },

      addHistoryEntry: (paneId, entry) => {
        set((state) => {
          const existing = state.historyByPaneId[paneId] ?? [];
          const newEntry: BrowserHistoryEntry = {
            ...entry,
            visitedAt: Date.now(),
          };
          const updated = [...existing, newEntry].slice(-MAX_HISTORY_PER_PANE);
          return {
            historyByPaneId: { ...state.historyByPaneId, [paneId]: updated },
          };
        });
      },

      clearHistory: (paneId: string) => {
        set((state) => ({
          historyByPaneId: { ...state.historyByPaneId, [paneId]: [] },
        }));
      },

      setDefaultUrl: (url: string) => {
        set({ defaultUrl: url });
      },

      addAllowedDomain: (domain: string) => {
        set((state) => ({
          allowedDomains: [...new Set([...state.allowedDomains, domain])],
        }));
      },

      removeAllowedDomain: (domain: string) => {
        set((state) => ({
          allowedDomains: state.allowedDomains.filter((d) => d !== domain),
        }));
      },

      activePane: () => {
        const state = get();
        return state.panes.find((p) => p.id === state.activePaneId) ?? null;
      },

      paneById: (id: string) => {
        return get().panes.find((p) => p.id === id);
      },
    }),
    {
      name: "nyx:browser-state:v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        defaultUrl: state.defaultUrl,
        allowedDomains: state.allowedDomains,
        // Don't persist active panes — they're ephemeral
      }),
    },
  ),
);
