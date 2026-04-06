/**
 * Notification toast component.
 *
 * Renders transient toast notifications in the top-right corner.
 * Each toast auto-dismisses after 5 seconds and can be clicked to
 * navigate to the associated thread. Only active in "full" notification mode.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  InfoIcon,
  MessageCircleQuestionIcon,
  XIcon,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "~/lib/utils";
import {
  type Notification,
  type NotificationType,
  useNotificationStore,
} from "~/notificationStore";

const TOAST_DISMISS_MS = 5_000;

const TOAST_ICONS: Record<NotificationType, typeof InfoIcon> = {
  input_needed: MessageCircleQuestionIcon,
  warning: AlertTriangleIcon,
  error: AlertCircleIcon,
  completed: CheckCircle2Icon,
  info: InfoIcon,
};

const TOAST_BORDER_COLORS: Record<NotificationType, string> = {
  input_needed: "border-l-info",
  warning: "border-l-warning",
  error: "border-l-destructive",
  completed: "border-l-success",
  info: "border-l-primary",
};

const TOAST_ICON_COLORS: Record<NotificationType, string> = {
  input_needed: "text-info",
  warning: "text-warning",
  error: "text-destructive",
  completed: "text-success",
  info: "text-primary",
};

interface ToastItemProps {
  notification: Notification;
  onDismiss: (id: string) => void;
  onNavigate: (threadId: string) => void;
}

function ToastItem({ notification, onDismiss, onNavigate }: ToastItemProps) {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onDismiss(notification.id), 300);
    }, TOAST_DISMISS_MS);
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, [notification.id, onDismiss]);

  const handleClick = useCallback(() => {
    if (notification.threadId) {
      onNavigate(notification.threadId);
    }
    onDismiss(notification.id);
  }, [notification.id, notification.threadId, onDismiss, onNavigate]);

  const handleClose = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setExiting(true);
      setTimeout(() => onDismiss(notification.id), 300);
    },
    [notification.id, onDismiss],
  );

  const Icon = TOAST_ICONS[notification.type];

  return (
    <div
      className={cn(
        "pointer-events-auto flex w-80 cursor-pointer items-start gap-3 rounded-lg border border-l-4 bg-popover p-3 text-popover-foreground shadow-lg/5 transition-all duration-300",
        TOAST_BORDER_COLORS[notification.type],
        exiting ? "translate-x-full opacity-0" : "translate-x-0 opacity-100",
      )}
      onClick={handleClick}
      role="alert"
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", TOAST_ICON_COLORS[notification.type])} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-sm font-medium leading-snug">{notification.message}</p>
        <p className="text-xs text-muted-foreground">
          {new Date(notification.timestamp).toLocaleTimeString()}
        </p>
      </div>
      <button
        className="shrink-0 rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground"
        onClick={handleClose}
        type="button"
      >
        <XIcon className="size-3.5" />
      </button>
    </div>
  );
}

export function NotificationToastContainer() {
  const notificationMode = useNotificationStore((s) => s.notificationMode);
  const notifications = useNotificationStore((s) => s.notifications);
  const dismissNotification = useNotificationStore((s) => s.dismissNotification);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const navigate = useNavigate();

  // Track which notification IDs have been shown as toasts so we only show new ones.
  const shownIdsRef = useRef(new Set<string>());
  const [activeToasts, setActiveToasts] = useState<Notification[]>([]);

  useEffect(() => {
    if (notificationMode !== "full") return;
    const newToasts: Notification[] = [];
    for (const notification of notifications) {
      if (notification.dismissed) continue;
      if (shownIdsRef.current.has(notification.id)) continue;
      // Only show toasts for notifications created in the last 10 seconds
      // to avoid flooding on page reload.
      if (Date.now() - notification.timestamp > 10_000) {
        shownIdsRef.current.add(notification.id);
        continue;
      }
      shownIdsRef.current.add(notification.id);
      newToasts.push(notification);
    }
    if (newToasts.length > 0) {
      setActiveToasts((prev) => [...newToasts, ...prev].slice(0, 5));
    }
  }, [notifications, notificationMode]);

  const handleDismiss = useCallback(
    (id: string) => {
      setActiveToasts((prev) => prev.filter((t) => t.id !== id));
      markAsRead(id);
    },
    [markAsRead],
  );

  const handleNavigate = useCallback(
    (threadId: string) => {
      void navigate({ to: "/$threadId", params: { threadId } });
    },
    [navigate],
  );

  if (notificationMode !== "full" || activeToasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-16 z-50 flex flex-col gap-2">
      {activeToasts.map((toast) => (
        <ToastItem
          key={toast.id}
          notification={toast}
          onDismiss={handleDismiss}
          onNavigate={handleNavigate}
        />
      ))}
    </div>
  );
}
