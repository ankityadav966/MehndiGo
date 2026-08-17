import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { useAuth } from "./AuthContext";
import { useSocket } from "./SocketContext";
import {
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  registerForPushNotificationsAsync,
  removeNotificationToken,
  sendNotificationTokenToServer,
  clearBadge,
  getLastNotificationResponse,
  scheduleLocalNotification,
} from "../services/notification";
import { handleNotificationNavigation } from "../services/deepLink";

const NotificationContext = createContext(null);

export function NotificationProvider({ children, navigationRef }) {
  const { isAuthenticated, role } = useAuth();
  const { socket } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || !socket) return;

    const handleNewNotification = (notification) => {
      scheduleLocalNotification({
        title: notification.title,
        body: notification.message,
        data: notification
      });
      setUnreadCount((prev) => prev + 1);
    };

    const handleBookingCreated = (booking) => {
      scheduleLocalNotification({
        title: "New Booking Request 🌸",
        body: `You received a new booking request #${booking.bookingCode || ""}`,
        data: booking
      });
      setUnreadCount((prev) => prev + 1);
    };

    socket.on("new_notification", handleNewNotification);
    socket.on("booking_created", handleBookingCreated);

    return () => {
      socket.off("new_notification", handleNewNotification);
      socket.off("booking_created", handleBookingCreated);
    };
  }, [isAuthenticated, socket]);
  const [lastNotification, setLastNotification] = useState(null);
  const notificationListener = useRef(null);
  const responseListener = useRef(null);
  const appState = useRef(AppState.currentState);
  const pendingNotification = useRef(null);

  const executeNotificationNavigation = useCallback(
    (notification) => {
      if (!notification) return;
      const nav = navigationRef?.current || navigationRef;
      if (nav && (!navigationRef.isReady || navigationRef.isReady())) {
        setTimeout(() => {
          handleNotificationNavigation(notification, nav, role);
          pendingNotification.current = null;
        }, 300);
      } else {
        pendingNotification.current = notification;
      }
    },
    [role, navigationRef]
  );

  const handleNotificationResponse = useCallback(
    (response) => {
      if (!response?.notification) return;
      executeNotificationNavigation(response.notification);
    },
    [executeNotificationNavigation]
  );

  // Process pending notification when navigation or authentication settles
  useEffect(() => {
    if (isAuthenticated && pendingNotification.current) {
      const timer = setTimeout(() => {
        if (pendingNotification.current) {
          const nav = navigationRef?.current || navigationRef;
          if (nav && (!navigationRef.isReady || navigationRef.isReady())) {
            handleNotificationNavigation(pendingNotification.current, nav, role);
            pendingNotification.current = null;
          }
        }
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, role, navigationRef]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const setupNotifications = async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        if (token) {
          await sendNotificationTokenToServer(token);
        }
      } catch (err) {
        console.log("[NotificationContext] Push registration notice:", err.message);
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
