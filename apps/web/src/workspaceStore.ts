import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Workspace store manages the concept of workspaces (project-bound)
 * and free terminals (standalone terminal sessions not tied to any project).
 *
 * Workspaces map 1:1 to Projects in the main store, but add Nyx-specific
 * metadata like active layout, pinned status, and custom terminal names.
 */

export interface FreeTerminal {
  readonly id: string;
  readonly name: string;
  readonly createdAt: number;
  readonly cwd: string | null;
}

export interface WorkspaceTerminalMeta {
  readonly terminalId: string;
  readonly customName: string | null;
}

export interface WorkspaceState {
  /** Free terminals not associated with any project workspace */
  freeTerminals: FreeTerminal[];

  /** Custom terminal names, keyed by terminalId (works for both workspace and free terminals) */
  terminalNamesById: Record<string, string>;

  /** Active section in sidebar: 'workspaces' | 'agents' | 'terminals' */
  activeSidebarSection: "workspaces" | "agents" | "terminals";

  /** Whether the free terminal section is expanded in sidebar */
  freeTerminalSectionExpanded: boolean;
}

export interface WorkspaceActions {
  // Free terminal management
  addFreeTerminal: (name?: string, cwd?: string) => string;
  removeFreeTerminal: (id: string) => void;
  renameFreeTerminal: (id: string, name: string) => void;
  reorderFreeTerminals: (orderedIds: string[]) => void;

  // Terminal naming (works for any terminal)
  setTerminalName: (terminalId: string, name: string) => void;
  clearTerminalName: (terminalId: string) => void;
  getTerminalName: (terminalId: string) => string | null;

  // Sidebar section
  setActiveSidebarSection: (section: WorkspaceState["activeSidebarSection"]) => void;
  setFreeTerminalSectionExpanded: (expanded: boolean) => void;
}

const initialState: WorkspaceState = {
  freeTerminals: [],
  terminalNamesById: {},
  activeSidebarSection: "workspaces",
  freeTerminalSectionExpanded: true,
};

export const useWorkspaceStore = create<WorkspaceState & WorkspaceActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      addFreeTerminal: (name?: string, cwd?: string) => {
        const id = crypto.randomUUID();
        const terminal: FreeTerminal = {
          id,
          name: name ?? `Terminal ${get().freeTerminals.length + 1}`,
          createdAt: Date.now(),
          cwd: cwd ?? null,
        };
        set((state) => ({
          freeTerminals: [...state.freeTerminals, terminal],
        }));
        return id;
      },

      removeFreeTerminal: (id: string) => {
        set((state) => ({
          freeTerminals: state.freeTerminals.filter((t) => t.id !== id),
          terminalNamesById: Object.fromEntries(
            Object.entries(state.terminalNamesById).filter(([key]) => key !== id),
          ),
        }));
      },

      renameFreeTerminal: (id: string, name: string) => {
        set((state) => ({
          freeTerminals: state.freeTerminals.map((t) => (t.id === id ? { ...t, name } : t)),
        }));
      },

      reorderFreeTerminals: (orderedIds: string[]) => {
        set((state) => {
          const byId = new Map(state.freeTerminals.map((t) => [t.id, t]));
          const reordered = orderedIds
            .map((id) => byId.get(id))
            .filter((t): t is FreeTerminal => t !== undefined);
          // Append any terminals not in orderedIds (shouldn't happen, but safety)
          for (const t of state.freeTerminals) {
            if (!orderedIds.includes(t.id)) {
              reordered.push(t);
            }
          }
          return { freeTerminals: reordered };
        });
      },

      setTerminalName: (terminalId: string, name: string) => {
        set((state) => ({
          terminalNamesById: { ...state.terminalNamesById, [terminalId]: name },
        }));
      },

      clearTerminalName: (terminalId: string) => {
        set((state) => ({
          terminalNamesById: Object.fromEntries(
            Object.entries(state.terminalNamesById).filter(([key]) => key !== terminalId),
          ),
        }));
      },

      getTerminalName: (terminalId: string) => {
        return get().terminalNamesById[terminalId] ?? null;
      },

      setActiveSidebarSection: (section) => {
        set({ activeSidebarSection: section });
      },

      setFreeTerminalSectionExpanded: (expanded) => {
        set({ freeTerminalSectionExpanded: expanded });
      },
    }),
    {
      name: "nyx:workspace-state:v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        freeTerminals: state.freeTerminals,
        terminalNamesById: state.terminalNamesById,
        activeSidebarSection: state.activeSidebarSection,
        freeTerminalSectionExpanded: state.freeTerminalSectionExpanded,
      }),
    },
  ),
);
