/**
 * Notification provider component.
 *
 * Wraps the application to supply:
 *  - Toast rendering via <NotificationToastContainer />
 *  - Keyboard shortcut listener for Ctrl+Shift+N (panel toggle)
 *  - Notification panel rendering
 *
 * Place this inside the router context so navigation from panel items works.
 */

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { NotificationToastContainer } from "./NotificationToast";
import { NotificationPanel } from "./NotificationPanel";

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [panelOpen, setPanelOpen] = useState(false);

  const togglePanel = useCallback(() => {
    setPanelOpen((prev) => !prev);
  }, []);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Ctrl+Shift+N (or Cmd+Shift+N on macOS)
      if (
        event.key === "N" &&
        event.shiftKey &&
        (event.ctrlKey || event.metaKey) &&
        !event.altKey
      ) {
        event.preventDefault();
        togglePanel();
      }

      // Escape closes the panel when open.
      if (event.key === "Escape" && panelOpen) {
        event.preventDefault();
        closePanel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [panelOpen, togglePanel, closePanel]);

  return (
    <>
      {children}
      {typeof document !== "undefined" &&
        createPortal(
          <>
            <NotificationToastContainer />
            <NotificationPanel open={panelOpen} onClose={closePanel} />
          </>,
          document.body,
        )}
    </>
  );
}
