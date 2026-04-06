/**
 * Notification panel component.
 *
 * Slides in from the right edge when toggled via Ctrl+Shift+N.
 * Groups notifications by time period (today, yesterday, older) and
 * provides bulk actions (mark all read, clear all).
 */

import { useCallback, useMemo } from "react";
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  BellIcon,
  CheckCircle2Icon,
  InfoIcon,
  MessageCircleQuestionIcon,
  Trash2Icon,
  CheckCheckIcon,
  XIcon,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "~/lib/utils";
import {
  type Notification,
  type NotificationType,
  useNotificationStore,
} from "~/notificationStore";

const NOTIFICATION_ICONS: Record<NotificationType, typeof InfoIcon> = {
  input_needed: MessageCircleQuestionIcon,
  warning: AlertTriangleIcon,
  error: AlertCircleIcon,
  completed: CheckCircle2Icon,
  info: InfoIcon,
};

const NOTIFICATION_ICON_COLORS: Record<NotificationType, string> = {
  input_needed: "text-info",
  warning: "text-warning",
  error: "text-destructive",
  completed: "text-success",
  info: "text-primary",
};

interface NotificationGroup {
  label: string;
  notifications: Notification[];
}

function groupNotificationsByTime(notifications: Notification[]): NotificationGroup[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86_400_000;

  const today: Notification[] = [];
  const yesterday: Notification[] = [];
  const older: Notification[] = [];

  for (const notification of notifications) {
    if (notification.dismissed) continue;
    if (notification.timestamp >= todayStart) {
      today.push(notification);
    } else if (notification.timestamp >= yesterdayStart) {
      yesterday.push(notification);
    } else {
      older.push(notification);
    }
  }

  const groups: NotificationGroup[] = [];
  if (today.length > 0) groups.push({ label: "Today", notifications: today });
  if (yesterday.length > 0) groups.push({ label: "Yesterday", notifications: yesterday });
  if (older.length > 0) groups.push({ label: "Older", notifications: older });
  return groups;
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface NotificationItemProps {
  notification: Notification;
  onNavigate: (threadId: string) => void;
  onMarkRead: (id: string) => void;
}

function NotificationItem({ notification, onNavigate, onMarkRead }: NotificationItemProps) {
  const Icon = NOTIFICATION_ICONS[notification.type];

  const handleClick = useCallback(() => {
    if (!notification.read) {
      onMarkRead(notification.id);
    }
    if (notification.threadId) {
      onNavigate(notification.threadId);
    }
  }, [notification.id, notification.threadId, notification.read, onNavigate, onMarkRead]);

  return (
    <button
      className={cn(
        "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent",
        !notification.read && "bg-accent/50",
      )}
      onClick={handleClick}
      type="button"
    >
      <Icon
        className={cn("mt-0.5 size-4 shrink-0", NOTIFICATION_ICON_COLORS[notification.type])}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p
          className={cn(
            "text-sm leading-snug",
            !notification.read ? "font-medium text-foreground" : "text-muted-foreground",
          )}
        >
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground">{formatTimestamp(notification.timestamp)}</p>
      </div>
      {!notification.read && (
        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
      )}
    </button>
  );
}

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationPanel({ open, onClose }: NotificationPanelProps) {
  const notifications = useNotificationStore((s) => s.notifications);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const clearAll = useNotificationStore((s) => s.clearAll);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const navigate = useNavigate();

  const count = unreadCount();

  const groups = useMemo(() => groupNotificationsByTime(notifications), [notifications]);

  const visibleNotificationCount = useMemo(
    () => notifications.filter((n) => !n.dismissed).length,
    [notifications],
  );

  const handleNavigate = useCallback(
    (threadId: string) => {
      void navigate({ to: "/$threadId", params: { threadId } });
      onClose();
    },
    [navigate, onClose],
  );

  const handleClearAll = useCallback(() => {
    clearAll();
  }, [clearAll]);

  const handleMarkAllRead = useCallback(() => {
    markAllAsRead();
  }, [markAllAsRead]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-96 max-w-[calc(100vw-2rem)] flex-col border-l bg-background shadow-xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
        role="dialog"
        aria-label="Notifications"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <BellIcon className="size-5 text-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Notifications</h2>
            {count > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </div>
          <button
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
            onClick={onClose}
            type="button"
            aria-label="Close notifications"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        {/* Actions */}
        {visibleNotificationCount > 0 && (
          <div className="flex items-center gap-2 border-b px-4 py-2">
            <button
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
              disabled={count === 0}
              onClick={handleMarkAllRead}
              type="button"
            >
              <CheckCheckIcon className="size-3.5" />
              Mark all as read
            </button>
            <button
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
              onClick={handleClearAll}
              type="button"
            >
              <Trash2Icon className="size-3.5" />
              Clear all
            </button>
          </div>
        )}

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto">
          {groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <BellIcon className="size-8 opacity-40" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {groups.map((group) => (
                <div key={group.label}>
                  <div className="sticky top-0 bg-background/95 px-4 py-2 backdrop-blur-sm">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {group.label}
                    </p>
                  </div>
                  <div className="flex flex-col gap-0.5 px-1">
                    {group.notifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onMarkRead={markAsRead}
                        onNavigate={handleNavigate}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
