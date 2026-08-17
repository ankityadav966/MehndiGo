import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SOCKET_URL } from "../services/api";
import { scheduleLocalNotification } from "../services/notification";

const SocketContext = createContext(null);

const OFFLINE_QUEUE_KEY = "@mehndigo_offline_msg_queue";

export function SocketProvider({ children }) {
  const { user, token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [activeRoom, setActiveRoom] = useState(null); // bookingId
  const [typingUsers, setTypingUsers] = useState({}); // bookingId -> Set of userIds
  const [onlineStatus, setOnlineStatus] = useState({}); // userId -> 'online' | 'offline'
  const [lastSeen, setLastSeen] = useState({}); // userId -> Date string
  const [messages, setMessages] = useState([]); // Active chat messages state in context
  const [offlineQueue, setOfflineQueue] = useState([]);

  // Use refs for callbacks to avoid re-initializing sockets on state changes
  const activeRoomRef = useRef(null);
  const offlineQueueRef = useRef([]);

  useEffect(() => {
    activeRoomRef.current = activeRoom;
  }, [activeRoom]);

  useEffect(() => {
    offlineQueueRef.current = offlineQueue;
  }, [offlineQueue]);

  // Load offline queue on mount
  useEffect(() => {
    async function loadQueue() {
      try {
        const stored = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
        if (stored) {
          setOfflineQueue(JSON.parse(stored));
        }
      } catch (e) {
        console.log("Error loading offline message queue", e);
      }
    }
    loadQueue();
  }, []);

  // Save offline queue when updated
  const saveOfflineQueue = async (queue) => {
    try {
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.log("Error saving offline message queue", e);
    }
  };

  // Flush offline queue when reconnected
  const flushOfflineQueue = useCallback((activeSocket) => {
    const queue = offlineQueueRef.current;
    if (queue.length === 0 || !activeSocket) return;

    console.log(`Flushing offline message queue: ${queue.length} messages`);
    
    // Process messages sequentially
    queue.forEach((msg) => {
      activeSocket.emit("send-message", {
        bookingId: msg.bookingId,
        message: msg.message,
        message_type: msg.messageType,
        parent_message_id: msg.parentMessageId,
        media: msg.media
      });
    });

    // Clear queue after emission (socket message_saved confirmation will append/update them in chat list)
    setOfflineQueue([]);
    saveOfflineQueue([]);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socket) {
        socket.disconnect();
        setTimeout(() => {
          setSocket(null);
        }, 0);
      }
      setTimeout(() => {
        setConnected(false);
      }, 0);
      return;
    }

    // Connect to websocket server
    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"]
    });

    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id);
      setConnected(true);
      
      // If we previously joined a room, rejoin it
      if (activeRoomRef.current) {
        newSocket.emit("join-room", { bookingId: activeRoomRef.current });
      }

      // Flush offline messages
      flushOfflineQueue(newSocket);
    });

    newSocket.on("disconnect", () => {
      console.log("Socket disconnected");
      setConnected(false);
    });

    // Status listeners
    newSocket.on("user_status", ({ userId, status, lastSeen: time }) => {
      setOnlineStatus((prev) => ({ ...prev, [userId]: status }));
      if (time) {
        setLastSeen((prev) => ({ ...prev, [userId]: time }));
      }
    });

    newSocket.on("typing", ({ bookingId, userId }) => {
      setTypingUsers((prev) => {
        const roomTyping = prev[bookingId] ? new Set(prev[bookingId]) : new Set();
        roomTyping.add(userId);
        return { ...prev, [bookingId]: roomTyping };
      });
    });

    newSocket.on("stop-typing", ({ bookingId, userId }) => {
      setTypingUsers((prev) => {
        const roomTyping = prev[bookingId] ? new Set(prev[bookingId]) : new Set();
        roomTyping.delete(userId);
        return { ...prev, [bookingId]: roomTyping };
      });
    });

    newSocket.on("receive-message", (message) => {
      // Append if it's the active room
      if (activeRoomRef.current === message.booking_id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) {
            return prev.filter((m) => !(m.isOfflinePending && m.message === message.message));
          }
          const clean = prev.filter((m) => !(m.isOfflinePending && m.message === message.message));
          return [...clean, message];
        });

        // Trigger read receipt since we are viewing it
        newSocket.emit("message-read", { bookingId: activeRoomRef.current });
      } else {
        const isFromSelf = message.sender_id === user?.id;
        if (!isFromSelf) {
          scheduleLocalNotification({
            title: "New Message Received",
            body: message.message_type === "TEXT" ? message.message : `Sent a ${message.message_type.toLowerCase()}`,
            data: {
              type: "chat",
              event: "new_message",
              bookingId: message.booking_id
            }
          });
        }
      }
    });

    newSocket.on("message_saved", (message) => {
      // Replace temporary offline message if exists, or append
      if (activeRoomRef.current === message.booking_id) {
        setMessages((prev) => {
          const clean = prev.filter((m) => !(m.isOfflinePending && m.message === message.message) && m.id !== message.id);
          return [...clean, message];
        });
      }
    });

    newSocket.on("messages_read", ({ bookingId, readerId }) => {
      if (activeRoomRef.current === bookingId) {
        setMessages((prev) =>
          prev.map((m) => (m.sender_id !== readerId ? { ...m, is_read: true } : m))
        );
      }
    });

    newSocket.on("message_deleted_everyone", ({ messageId, bookingId }) => {
      if (activeRoomRef.current === bookingId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === parseInt(messageId)
              ? { ...m, is_deleted_everyone: true, message: "This message was deleted", media: null }
              : m
          )
        );
      }
    });

    newSocket.on("message_edited", (message) => {
      if (activeRoomRef.current === message.booking_id) {
        setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [isAuthenticated, token, flushOfflineQueue]);

  // Join a booking room
  const joinRoom = useCallback((bookingId) => {
    setActiveRoom(bookingId);
    setMessages([]); // Clear active messages
    if (socket && connected) {
      socket.emit("join-room", { bookingId });
      socket.emit("message-read", { bookingId });
    }
  }, [socket, connected]);

  // Leave active room
  const leaveRoom = useCallback((bookingId) => {
    setActiveRoom(null);
    setMessages([]);
    if (socket && connected) {
      socket.emit("leave-room", { bookingId });
    }
  }, [socket, connected]);

  // Sending message wrapper with Offline Queue & REST fallback Support
  const sendChatMessage = useCallback(async (bookingId, messageText, messageType = "TEXT", parentMessageId = null, media = null) => {
    const localId = `offline_${Date.now()}`;
    const pendingMsg = {
      id: localId,
      sender_id: user?.id,
      receiver_id: null,
      booking_id: bookingId,
      message: messageText,
      content: messageText,
      message_type: messageType,
      messageType: messageType,
      is_read: false,
      isOfflinePending: true,
      parent_message_id: parentMessageId,
      media,
      media_url: typeof media === "string" ? media : (media?.file_url || media?.url || null),
      createdAt: new Date().toISOString()
    };

    // Update local UI immediately
    setMessages((prev) => [...prev, pendingMsg]);

    // Send via REST API to persist in D1
    try {
      const apiRequest = require("../services/api").default;
      const sentMsg = await apiRequest("POST", "/chat/send", {
        bookingId,
        message: messageText,
        content: messageText,
        messageType,
        message_type: messageType,
        parentMessageId,
        media,
        mediaUrl: typeof media === "string" ? media : (media?.file_url || media?.url || null),
        latitude: media?.waveform?.latitude || null,
        longitude: media?.waveform?.longitude || null
      }, true);

      if (sentMsg) {
        const payload = sentMsg?.data || sentMsg;
        const msgContent = sentMsg?.data?.content || sentMsg?.data?.message || messageText;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === localId
              ? {
                  ...m,
                  ...payload,
                  message: msgContent,
                  content: msgContent,
                  message_type: messageType,
                  messageType: messageType,
                  media: media || payload.media,
                  isOfflinePending: false
                }
              : m
          )
        );
      }
    } catch (err) {
      console.log("[CHAT] REST send fallback failed:", err.message);
    }

    if (connected && socket) {
      socket.emit("send-message", {
        bookingId,
        message: messageText,
        messageType,
        message_type: messageType,
        parentMessageId,
        parent_message_id: parentMessageId,
        media
      });
    }
  }, [connected, socket, user]);

  // Emit typing indicators
  const emitTyping = useCallback((bookingId, isTyping) => {
    if (socket && connected) {
      socket.emit(isTyping ? "typing" : "stop-typing", { bookingId });
    }
  }, [socket, connected]);

  const value = {
    socket,
    connected,
    activeRoom,
    typingUsers,
    onlineStatus,
    lastSeen,
    messages,
    setMessages,
    offlineQueue,
    joinRoom,
    leaveRoom,
    sendChatMessage,
    emitTyping
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}
