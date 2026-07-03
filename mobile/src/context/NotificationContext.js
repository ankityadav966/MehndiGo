import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { useAuth } from "./AuthContext";
import {
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  registerForPushNotificationsAsync,
  removeNotificationToken,
  clearBadge,
  getLastNotificationResponse,
} from "../services/notification";
import { resolveNotificationRoute } from "../services/deepLink";

const NotificationContext = createContext(null);

export function NotificationProvider({ children, navigationRef }) {
  const { isAuthenticated, role } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastNotification, setLastNotification] = useState(null);
  const notificationListener = useRef(null);
  const responseListener = useRef(null);
  const appState = useRef(AppState.currentState);

  const handleNotificationResponse = useCallback(
    (response) => {
      const route = resolveNotificationRoute(response.notification, role);
      if (route && navigationRef?.current) {
        setTimeout(() => {
          if (route.params) {
            navigationRef.current.navigate(route.screen, route.params);
          } else {
            navigationRef.current.navigate(route.screen);
          }
        }, 500);
      }
    },
    [role, navigationRef],
  );

  useEffect(() => {
    if (!isAuthenticated) return;

    const setupNotifications = async () => {
      try {
        await registerForPushNotificationsAsync();
      } catch (_) {
        // Notification registration failed, non-critical
      }
    };

    setupNotifications();

    const handleAppStateChange = async (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === "active") {
        const pendingResponse = await getLastNotificationResponse();
        if (pendingResponse) {
          handleNotificationResponse(pendingResponse);
        }
        await clearBadge();
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);

    notificationListener.current = addNotificationReceivedListener((notification) => {
      setUnreadCount((prev) => prev + 1);
      setLastNotification(notification);
    });

    responseListener.current = addNotificationResponseReceivedListener(handleNotificationResponse);

    (async () => {
      const initialResponse = await getLastNotificationResponse();
      if (initialResponse) {
        handleNotificationResponse(initialResponse);
      }
    })();

    return () => {
      subscription?.remove();
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [isAuthenticated, handleNotificationResponse]);

  useEffect(() => {
    if (!isAuthenticated) {
      removeNotificationToken();
      setTimeout(() => {
        setUnreadCount(0);
      }, 0);
    }
  }, [isAuthenticated]);

  const markAllRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const value = useMemo(
    () => ({
      unreadCount,
      lastNotification,
      markAllRead,
      setUnreadCount,
    }),
    [unreadCount, lastNotification, markAllRead],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
