import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import { chatService, adminService, artistService } from "../services/api";
import { Send, User, MessageSquare } from "lucide-react";

const ChatPage = ({ showToast }) => {
  const { user, token } = useAuth();
  const location = useLocation();
  
  // Potential pre-selected user to chat with from query state
  const stateReceiverId = location.state?.receiverId || "";
  const stateReceiverName = location.state?.receiverName || "";

  const [activeReceiver, setActiveReceiver] = useState(
    stateReceiverId ? { id: stateReceiverId, name: stateReceiverName } : null
  );
  const [channels, setChannels] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [socket, setSocket] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [onlineUsersStatus, setOnlineUsersStatus] = useState({});

  const messagesEndRef = useRef(null);

  useEffect(() => {
    // 1. Establish Socket Connection
    const socketUrl = window.location.hostname ? `${window.location.protocol}//${window.location.hostname}:3000` : "http://localhost:3000";
    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ["websocket"]
    });
    setSocket(newSocket);

    // 2. Fetch all possible users to chat with (based on role)
    fetchChannels();
    fetchUnreadCounts();

    return () => {
      newSocket.disconnect();
    };
  }, [user, token]);

  // Join/leave room on active channel changes
  useEffect(() => {
    if (socket && activeReceiver?.bookingId) {
      socket.emit("join-room", { bookingId: activeReceiver.bookingId });
      
      return () => {
        socket.emit("leave-room", { bookingId: activeReceiver.bookingId });
      };
    }
  }, [socket, activeReceiver]);

  useEffect(() => {
    if (!socket) return;

    // 3. Listen for socket message broadcasts
    socket.on("receive_message", (message) => {
      // Append if it's from the active chat receiver
      const isFromActive = (
        (message.sender_id === activeReceiver?.id && message.receiver_id === user?.id) ||
        (message.sender_id === user?.id && message.receiver_id === activeReceiver?.id)
      );
      if (isFromActive) {
        setMessages((prev) => [...prev, message]);
        // Send instant read message socket notification
        socket.emit("read_messages", { sender_id: activeReceiver.id, receiver_id: user.id, bookingId: activeReceiver.bookingId });
        chatService.markChatAsSeen(activeReceiver.bookingId || activeReceiver.id).catch(() => {});
      } else {
        // Increment unread count for background sender
        setUnreadCounts((prev) => ({
          ...prev,
          [message.sender_id]: (prev[message.sender_id] || 0) + 1
        }));
        showToast(`New message from user #${message.sender_id}`, "info");
      }
    });

    socket.on("message_saved", (message) => {
      if (message.receiver_id === activeReceiver?.id || message.booking_id === activeReceiver?.bookingId) {
        setMessages((prev) => {
          // Prevent duplicates
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
    });

    socket.on("unread_update", ({ sender_id, bookingId }) => {
      const activeId = activeReceiver?.bookingId || activeReceiver?.id;
      if (activeId === bookingId || activeReceiver?.id === sender_id) {
        socket.emit("read_messages", { sender_id, receiver_id: user.id, bookingId });
        chatService.markChatAsSeen(bookingId || sender_id).catch(() => {});
      } else {
        setUnreadCounts((prev) => ({
          ...prev,
          [sender_id]: (prev[sender_id] || 0) + 1
        }));
      }
    });

    socket.on("user_status", ({ userId, status }) => {
      setOnlineUsersStatus((prev) => ({
        ...prev,
        [userId]: status
      }));
    });

    socket.on("messages_read", ({ sender_id, receiver_id, bookingId }) => {
      const activeId = activeReceiver?.bookingId || activeReceiver?.id;
      if (activeId === bookingId || activeReceiver?.id === receiver_id) {
        setMessages((prev) =>
          prev.map((msg) => (msg.sender_id === user.id ? { ...msg, is_read: true } : msg))
        );
      }
    });

    return () => {
      socket.off("receive_message");
      socket.off("message_saved");
      socket.off("unread_update");
      socket.off("user_status");
      socket.off("messages_read");
    };
  }, [socket, activeReceiver, user]);

  useEffect(() => {
    // Auto-scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (activeReceiver?.id) {
      loadChatHistory(activeReceiver.id);
    }
  }, [activeReceiver]);

  const fetchUnreadCounts = async () => {
    try {
      const res = await chatService.getUnreadCounts();
      const counts = {};
      res.data?.forEach((item) => {
        counts[item.sender_id] = Number(item.count || 0);
      });
      setUnreadCounts(counts);
    } catch (e) {}
  };

  const fetchChannels = async () => {
    try {
      const role = String(user?.role).toUpperCase();
      let list = [];
      if (role === "ADMIN") {
        const res = await adminService.getUsers().catch(() => ({ data: [] }));
        const rawUsers = res.data?.rows || res.data || [];
        list = rawUsers.map((u) => ({
          id: u.id,
          name: u.full_name || u.name || `User #${u.id}`,
          role: (u.role || "CUSTOMER").toUpperCase(),
          bookingId: null
        }));
      } else {
        const res = await chatService.getChatList().catch(() => ({ data: [] }));
        const chats = res.data || res || [];
        list = chats.map((c) => ({
          id: c.recipient?.id || c.id,
          name: c.recipient?.name || c.name || "Support Admin",
          role: (c.recipient?.role || (c.id === 1 ? "ADMIN" : "ARTIST")).toUpperCase(),
          bookingId: c.bookingId
        }));
      }
      const filteredList = list.filter((u) => u.id && u.id !== user?.id);
      setChannels(filteredList.length > 0 ? filteredList : [{ id: 1, name: "MehndiGo Support Admin", role: "ADMIN", bookingId: null }]);
    } catch (e) {
      console.log("Could not fetch user directory:", e.message);
    }
  };

  // Trigger status checks once channels are loaded and socket is connected
  useEffect(() => {
    if (socket && channels.length > 0) {
      channels.forEach((chan) => {
        socket.emit("get_user_status", chan.id);
      });
    }
  }, [socket, channels]);

  const loadChatHistory = async (receiverId) => {
    try {
      const targetId = activeReceiver?.bookingId || receiverId;
      const res = await chatService.getHistory(targetId);
      const historyList = res.data || res || [];
      setMessages(Array.isArray(historyList) ? historyList : []);
      
      // Clear unread counts for this channel
      await chatService.markChatAsSeen(targetId).catch(() => {});
      setUnreadCounts((prev) => ({ ...prev, [receiverId]: 0 }));
      
      // Notify sender that we read their messages
      if (socket && socket.connected) {
        socket.emit("read_messages", { sender_id: receiverId, receiver_id: user?.id, bookingId: activeReceiver?.bookingId });
      }
    } catch (e) {
      console.log("Error loading messages:", e.message);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeReceiver) return;

    const textToSend = inputText.trim();
    setInputText("");

    const messagePayload = {
      sender_id: user?.id,
      receiver_id: activeReceiver.id,
      booking_id: activeReceiver.bookingId || null,
      message: textToSend,
      message_type: "TEXT"
    };

    // Optimistic UI update
    const tempId = Date.now();
    const optimisticMsg = {
      id: tempId,
      sender_id: user?.id,
      receiver_id: activeReceiver.id,
      message: textToSend,
      isMe: true,
      created_at: new Date().toISOString(),
      timestamp: new Date().toISOString()
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      if (socket && socket.connected) {
        socket.emit("send_message", messagePayload);
      }
      // Persist via live REST API
      const res = await chatService.sendMessage(activeReceiver.id, textToSend);
      if (res?.data) {
        setMessages((prev) => prev.map(m => m.id === tempId ? { ...res.data, isMe: true } : m));
      }
    } catch (err) {
      console.log("Chat send notice:", err.message);
    }
  };

  return (
    <div style={{ padding: "2rem", flexGrow: 1, display: "flex", flexDirection: "column" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "1rem" }}>In-App Chat Messaging</h1>
      
      <div className="chat-container">
        {/* Users list / channels */}
        <div className="chat-users-list">
          <div style={{ padding: "1rem", borderBottom: "1px solid var(--border-color)", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <MessageSquare style={{ width: "18px" }} /> Contacts List
          </div>
          {channels.length === 0 ? (
            <p style={{ padding: "2rem", color: "var(--text-secondary)", fontSize: "0.9rem", textAlign: "center" }}>No other users active.</p>
          ) : (
            channels.map((chan) => (
              <div
                key={chan.id}
                className={`chat-user-item ${activeReceiver?.id === chan.id ? "active" : ""}`}
                onClick={() => setActiveReceiver(chan)}
              >
                <div style={{ background: "var(--bg-tertiary)", padding: "0.5rem", borderRadius: "50%", display: "flex", position: "relative" }}>
                  <User style={{ width: "16px", height: "16px", color: "var(--accent-color)" }} />
                </div>
                <div style={{ flexGrow: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{chan.name}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    {chan.role} • {onlineUsersStatus[chan.id] === "online" ? "Online" : "Offline"}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {unreadCounts[chan.id] > 0 && (
                    <span style={{ background: "var(--danger-color)", color: "#fff", borderRadius: "50%", minWidth: "18px", height: "18px", padding: "1px 5px", fontSize: "0.7rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {unreadCounts[chan.id]}
                    </span>
                  )}
                  {onlineUsersStatus[chan.id] === "online" && (
                    <span style={{ width: "8px", height: "8px", background: "var(--success-color)", borderRadius: "50%" }} />
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Message Window */}
        <div className="chat-window">
          {activeReceiver ? (
            <>
              {/* Chat Header */}
              <div style={{ padding: "1rem 1.5rem", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ background: "var(--bg-tertiary)", padding: "0.5rem", borderRadius: "50%", display: "flex" }}>
                  <User style={{ width: "18px", height: "18px", color: "var(--accent-color)" }} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 700 }}>{activeReceiver.name}</h3>
                  <span style={{ fontSize: "0.75rem", color: onlineUsersStatus[activeReceiver.id] === "online" ? "var(--success-color)" : "var(--text-secondary)", fontWeight: 600 }}>
                    {onlineUsersStatus[activeReceiver.id] === "online" ? "Active now" : "Offline"}
                  </span>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="chat-messages">
                {messages.length === 0 ? (
                  <div style={{ textAlign: "center", color: "var(--text-secondary)", margin: "auto", fontSize: "0.95rem" }}>
                    Say hello to start the conversation!
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isSentByMe = msg.sender_id === user.id;
                    const date = new Date(msg.createdAt || msg.created_at);
                    return (
                      <div
                        key={msg.id || Math.random()}
                        className={`message-bubble ${isSentByMe ? "sent" : "received"}`}
                      >
                        <div>{msg.message}</div>
                        <div style={{ fontSize: "0.7rem", textAlign: "right", marginTop: "0.25rem", opacity: 0.8, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.25rem" }}>
                          <span>{date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          {isSentByMe && (
                            <span style={{ color: msg.is_read ? "#00b894" : "inherit", fontWeight: 700 }}>
                              {msg.is_read ? "✓✓" : "✓"}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <form onSubmit={handleSendMessage} className="chat-input-bar">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Type your message here..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  style={{ flexGrow: 1 }}
                />
                <button type="submit" className="btn btn-primary" style={{ borderRadius: "10px" }}>
                  <Send style={{ width: "16px" }} />
                </button>
              </form>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-secondary)", gap: "0.5rem" }}>
              <MessageSquare style={{ width: "48px", height: "48px", strokeWidth: 1.25 }} />
              <h3>Select a Contact</h3>
              <p style={{ fontSize: "0.9rem" }}>Choose a user from the list on the left to start chatting.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
