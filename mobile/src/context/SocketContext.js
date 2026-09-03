import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiRequest, { SOCKET_URL } from "../services/api";
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
        if (__DEV__) console.log("Error loading offline message queue", e);
      }
    }
    loadQueue();
  }, []);

  // Save offline queue when updated
  const saveOfflineQueue = async (queue) => {
    try {
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      if (__DEV__) console.log("Error saving offline message queue", e);
    }
  };

  // Flush offline queue when reconnected
  const flushOfflineQueue = useCallback((activeSocket) => {
    const queue = offlineQueueRef.current;
    if (queue.length === 0 || !activeSocket) return;

    if (__DEV__) console.log(`Flushing offline message queue: ${queue.length} messages`);
    
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
      if (__DEV__) console.log("Socket connected:", newSocket.id);
      setConnected(true);
      
      // If we previously joined a room, rejoin it
      if (activeRoomRef.current) {
        newSocket.emit("join-room", { bookingId: activeRoomRef.current });
      }

      // Flush offline messages
      flushOfflineQueue(newSocket);
    });

    newSocket.on("disconnect", () => {
      if (__DEV__) console.log("Socket disconnected");
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
      const bId = String(bookingId || "");
      setTypingUsers((prev) => {
        const roomTyping = prev[bId] ? new Set(prev[bId]) : new Set();
        roomTyping.add(userId);
        return { ...prev, [bId]: roomTyping };
      });
    });

    newSocket.on("stop-typing", ({ bookingId, userId }) => {
      const bId = String(bookingId || "");
      setTypingUsers((prev) => {
        const roomTyping = prev[bId] ? new Set(prev[bId]) : new Set();
        roomTyping.delete(userId);
        return { ...prev, [bId]: roomTyping };
      });
    });

    newSocket.on("receive-message", (message) => {
      if (!message) return;
      const msgBookingId = String(message.booking_id || message.bookingId || "");
      const currentActiveRoom = String(activeRoomRef.current || "");
      const isCurrentActiveRoom = currentActiveRoom && msgBookingId && currentActiveRoom === msgBookingId;
      const isFromSelf = String(message.sender_id || message.senderId || "") === String(user?.id || "");

      // Normalized message object
      const normalizedMsg = {
        ...message,
        id: message.id || `msg_${Date.now()}`,
        booking_id: msgBookingId,
        bookingId: msgBookingId,
        sender_id: message.sender_id || message.senderId,
        senderId: message.sender_id || message.senderId,
        receiver_id: message.receiver_id || message.receiverId,
        receiverId: message.receiver_id || message.receiverId,
        message: message.message || message.text || message.content || "",
        content: message.message || message.text || message.content || "",
        message_type: String(message.message_type || message.messageType || "TEXT").toUpperCase(),
        messageType: String(message.message_type || message.messageType || "TEXT").toUpperCase(),
        media_url: message.media_url || message.mediaUrl || message.media?.file_url || message.media?.url || null,
        mediaUrl: message.media_url || message.mediaUrl || message.media?.file_url || message.media?.url || null,
        media: message.media || (message.media_url || message.mediaUrl ? {
          file_url: message.media_url || message.mediaUrl,
          fileUrl: message.media_url || message.mediaUrl,
          url: message.media_url || message.mediaUrl,
          file_type: String(message.message_type || message.messageType || "image").toLowerCase()
        } : null),
        is_read: Boolean(message.is_read || message.isRead),
        isRead: Boolean(message.is_read || message.isRead),
        isMe: isFromSelf,
        createdAt: message.createdAt || message.created_at || message.timestamp || new Date().toISOString(),
        created_at: message.created_at || message.createdAt || message.timestamp || new Date().toISOString()
      };

      if (isCurrentActiveRoom) {
        setMessages((prev) => {
          // Check if message already exists by id
          const existsById = prev.some((m) => String(m.id) === String(normalizedMsg.id));
          if (existsById) {
            return prev.map((m) => (String(m.id) === String(normalizedMsg.id) ? { ...m, ...normalizedMsg } : m));
          }
          // Remove any offline pending message with matching content
          const clean = prev.filter((m) => !(m.isOfflinePending && m.message === normalizedMsg.message));
          return [...clean, normalizedMsg];
        });

        // Trigger read receipt
        newSocket.emit("message-read", { bookingId: activeRoomRef.current });
      } else if (!isFromSelf) {
        scheduleLocalNotification({
          title: `New Message from ${message.senderName || message.sender_name || "User"} 💬`,
          body: normalizedMsg.message_type === "TEXT" ? normalizedMsg.message : `Sent a ${normalizedMsg.message_type.toLowerCase()}`,
          data: {
            type: "chat",
            event: "new_message",
            bookingId: msgBookingId
          }
        });
      }
    });

    newSocket.on("message_saved", (message) => {
      if (!message) return;
      const msgBookingId = String(message.booking_id || message.bookingId || "");
      const currentActiveRoom = String(activeRoomRef.current || "");
      if (currentActiveRoom && msgBookingId && currentActiveRoom === msgBookingId) {
        setMessages((prev) => {
          const clean = prev.filter((m) => !(m.isOfflinePending && m.message === message.message) && String(m.id) !== String(message.id));
          return [...clean, message];
        });
      }
    });

    newSocket.on("messages_read", ({ bookingId, readerId }) => {
      if (String(activeRoomRef.current || "") === String(bookingId || "")) {
        setMessages((prev) =>
          prev.map((m) => (String(m.sender_id || m.senderId) !== String(readerId) ? { ...m, is_read: true, isRead: true } : m))
        );
      }
    });

    newSocket.on("message_deleted_everyone", ({ messageId, bookingId }) => {
      if (String(activeRoomRef.current || "") === String(bookingId || "")) {
        setMessages((prev) =>
          prev.map((m) =>
            String(m.id) === String(messageId)
              ? { ...m, is_deleted_everyone: true, message: "This message was deleted", media: null, media_url: null, mediaUrl: null }
              : m
          )
        );
      }
    });

    newSocket.on("message_edited", (message) => {
      if (!message) return;
      const msgBookingId = String(message.booking_id || message.bookingId || "");
      if (String(activeRoomRef.current || "") === msgBookingId) {
        setMessages((prev) => prev.map((m) => (String(m.id) === String(message.id) ? { ...m, ...message } : m)));
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
  const sendChatMessage = useCallback(async (bookingId, messageText, messageType = "TEXT", parentMessageId = null, media = null, receiverId = null) => {
    const localId = `offline_${Date.now()}`;
    const pendingMsg = {
      id: localId,
      sender_id: user?.id,
      receiver_id: receiverId,
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
      const sentMsg = await apiRequest("POST", "/chat/send", {
        bookingId,
        booking_id: bookingId,
        receiverId,
        receiver_id: receiverId,
        message: messageText,
        text: messageText,
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
        const msgContent = payload?.content || payload?.message || messageText;
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
      if (__DEV__) {
        console.log("[CHAT] REST send fallback notice:", err.message);
      }
    }

    if (connected && socket) {
      socket.emit("send-message", {
        bookingId,
        receiverId,
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

  const value = useMemo(
    () => ({
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
    }),
    [
      socket,
      connected,
      activeRoom,
      typingUsers,
      onlineStatus,
      lastSeen,
      messages,
      offlineQueue,
      joinRoom,
      leaveRoom,
      sendChatMessage,
      emitTyping
    ]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}
