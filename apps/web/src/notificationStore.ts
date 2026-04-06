/**
 * Zustand store for the notification system.
 *
 * Supports notification persistence via localStorage, per-thread ring state
 * for sidebar indicators, and two notification modes: "full" (rings + toasts +
 * panel) and "simple" (rings only).
 */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { resolveStorage } from "./lib/storage";

const NOTIFICATION_STATE_STORAGE_KEY = "nyx:notifications:v1";

export type NotificationType = "input_needed" | "warning" | "error" | "completed" | "info";

export type RingState = "input" | "warning" | "completed";

export type NotificationMode = "full" | "simple";

export interface Notification {
  id: string;
  agentId: string | null;
  threadId: string | null;
  type: NotificationType;
  message: string;
  timestamp: number;
  read: boolean;
  dismissed: boolean;
}

interface NotificationState {
  notifications: Notification[];
  notificationMode: NotificationMode;
  soundEnabled: boolean;
  ringStateByThreadId: Record<string, RingState | null>;
}

interface NotificationStore extends NotificationState {
  addNotification: (
    notification: Omit<Notification, "id" | "timestamp" | "read" | "dismissed">,
  ) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismissNotification: (id: string) => void;
  clearAll: () => void;
  setNotificationMode: (mode: NotificationMode) => void;
  setSoundEnabled: (enabled: boolean) => void;
  updateRingState: (threadId: string, state: RingState | null) => void;
  clearRingState: (threadId: string) => void;
  unreadCount: () => number;
  activeRings: () => Array<{ threadId: string; state: RingState }>;
}

function createNotificationStateStorage() {
  return resolveStorage(typeof window !== "undefined" ? window.localStorage : undefined);
}

const MAX_NOTIFICATIONS = 200;

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      notifications: [],
      notificationMode: "full",
      soundEnabled: true,
      ringStateByThreadId: {},

      addNotification: (notification) => {
        const id = crypto.randomUUID();
        const timestamp = Date.now();
        set((state) => {
          const nextNotification: Notification = {
            ...notification,
            id,
            timestamp,
            read: false,
            dismissed: false,
          };
          const nextNotifications = [nextNotification, ...state.notifications];
          // Cap notification list to prevent unbounded growth.
          if (nextNotifications.length > MAX_NOTIFICATIONS) {
            nextNotifications.length = MAX_NOTIFICATIONS;
          }
          return { notifications: nextNotifications };
        });
      },

      markAsRead: (id) => {
        set((state) => {
          const index = state.notifications.findIndex((n) => n.id === id);
          if (index === -1) return state;
          const target = state.notifications[index];
          if (!target || target.read) return state;
          const nextNotifications = [...state.notifications];
          nextNotifications[index] = { ...target, read: true };
          return { notifications: nextNotifications };
        });
      },

      markAllAsRead: () => {
        set((state) => {
          const hasUnread = state.notifications.some((n) => !n.read);
          if (!hasUnread) return state;
          return {
            notifications: state.notifications.map((n) => (n.read ? n : { ...n, read: true })),
          };
        });
      },

      dismissNotification: (id) => {
        set((state) => {
          const index = state.notifications.findIndex((n) => n.id === id);
          if (index === -1) return state;
          const target = state.notifications[index];
          if (!target || target.dismissed) return state;
          const nextNotifications = [...state.notifications];
          nextNotifications[index] = { ...target, dismissed: true };
          return { notifications: nextNotifications };
        });
      },

      clearAll: () => {
        set((state) => {
          if (state.notifications.length === 0) return state;
          return { notifications: [] };
        });
      },

      setNotificationMode: (mode) => {
        set((state) => {
          if (state.notificationMode === mode) return state;
          return { notificationMode: mode };
        });
      },

      setSoundEnabled: (enabled) => {
        set((state) => {
          if (state.soundEnabled === enabled) return state;
          return { soundEnabled: enabled };
        });
      },

      updateRingState: (threadId, ringState) => {
        if (threadId.length === 0) return;
        set((state) => {
          if (state.ringStateByThreadId[threadId] === ringState) return state;
          if (ringState === null) {
            if (state.ringStateByThreadId[threadId] === undefined) return state;
            const { [threadId]: _removed, ...rest } = state.ringStateByThreadId;
            return { ringStateByThreadId: rest };
          }
          return {
            ringStateByThreadId: {
              ...state.ringStateByThreadId,
              [threadId]: ringState,
            },
          };
        });
      },

      clearRingState: (threadId) => {
        if (threadId.length === 0) return;
        set((state) => {
          if (
            state.ringStateByThreadId[threadId] === undefined ||
            state.ringStateByThreadId[threadId] === null
          ) {
            return state;
          }
          const { [threadId]: _removed, ...rest } = state.ringStateByThreadId;
          return { ringStateByThreadId: rest };
        });
      },

      unreadCount: () => {
        return get().notifications.filter((n) => !n.read && !n.dismissed).length;
      },

      activeRings: () => {
        const { ringStateByThreadId } = get();
        const rings: Array<{ threadId: string; state: RingState }> = [];
        for (const [threadId, ringState] of Object.entries(ringStateByThreadId)) {
          if (ringState !== null && ringState !== undefined) {
            rings.push({ threadId, state: ringState });
          }
        }
        return rings;
      },
    }),
    {
      name: NOTIFICATION_STATE_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(createNotificationStateStorage),
      partialize: (state) => ({
        notifications: state.notifications.filter((n) => !n.dismissed),
        notificationMode: state.notificationMode,
        soundEnabled: state.soundEnabled,
        ringStateByThreadId: state.ringStateByThreadId,
      }),
    },
  ),
);
