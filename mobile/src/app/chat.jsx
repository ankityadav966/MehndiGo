import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { getGlobalStyles } from '../theme/globalStyles';
import { Colors } from '../theme/colors';
import { chatService, adminService, artistService } from '../services/api';
import { Send, User, ChevronLeft, MessageSquare } from 'lucide-react-native';

const SOCKET_URL = 'http://98.70.11.123:8000';

export default function ChatScreen() {
  const { user, theme } = useAuth();
  const styles = getGlobalStyles(theme);
  const colors = Colors[theme];
  const { receiverId, receiverName } = useLocalSearchParams();

  const [activeReceiver, setActiveReceiver] = useState(
    receiverId ? { id: parseInt(receiverId), name: receiverName || "User" } : null
  );
  
  const [channels, setChannels] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [socket, setSocket] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [onlineUsersStatus, setOnlineUsersStatus] = useState({});
  
  const flatListRef = useRef(null);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    if (user?.id) {
      newSocket.emit("join", user.id);
    }

    fetchChannels();
    fetchUnreadCounts();

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  useEffect(() => {
    if (!socket) return;

    socket.on("receive_message", (message) => {
      if (
        (message.sender_id === activeReceiver?.id && message.receiver_id === user?.id) ||
        (message.sender_id === user?.id && message.receiver_id === activeReceiver?.id)
      ) {
        setMessages((prev) => [...prev, message]);
        socket.emit("read_messages", { sender_id: activeReceiver.id, receiver_id: user.id });
        chatService.markChatAsSeen(activeReceiver.id).catch(() => {});
      } else {
        setUnreadCounts((prev) => ({
          ...prev,
          [message.sender_id]: (prev[message.sender_id] || 0) + 1
        }));
      }
    });

    socket.on("message_saved", (message) => {
      if (message.receiver_id === activeReceiver?.id) {
        setMessages((prev) => [...prev, message]);
      }
    });

    socket.on("unread_update", ({ sender_id }) => {
      if (activeReceiver?.id === sender_id) {
        socket.emit("read_messages", { sender_id, receiver_id: user.id });
        chatService.markChatAsSeen(sender_id).catch(() => {});
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

    socket.on("messages_read", ({ sender_id, receiver_id }) => {
      if (activeReceiver?.id === receiver_id) {
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
      let list = [];
      if (user?.role === "ADMIN") {
        const res = await adminService.getUsers();
        list = res.data?.rows || res.data || [];
      } else if (user?.role === "ARTIST") {
        const res = await artistService.getArtistsNearby();
        list = res.data?.rows || res.data || [];
      } else {
        const res = await artistService.getArtists();
        const artists = res.data?.rows || res.data || [];
        list = artists.map((a) => ({
          id: a.user?.id || a.user_id,
          name: a.user?.name || "Artist Name",
          role: "ARTIST",
        }));
      }
      const filteredList = list.filter((u) => u.id !== user?.id);
      setChannels(filteredList);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (socket && channels.length > 0) {
      channels.forEach((chan) => {
        socket.emit("get_user_status", chan.id);
      });
    }
  }, [socket, channels]);

  const loadChatHistory = async (recId) => {
    try {
      const res = await chatService.getHistory(recId);
      setMessages(res.data || []);
      
      await chatService.markChatAsSeen(recId);
      setUnreadCounts((prev) => ({ ...prev, [recId]: 0 }));
      
      if (socket) {
        socket.emit("read_messages", { sender_id: recId, receiver_id: user.id });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendMessage = () => {
    if (!inputText.trim() || !activeReceiver || !socket) return;

    const messagePayload = {
      sender_id: user.id,
      receiver_id: activeReceiver.id,
      message: inputText.trim(),
    };

    socket.emit("send_message", messagePayload);
    setInputText("");
  };

  if (activeReceiver) {
    return (
      <KeyboardAvoidingView 
        style={[styles.container, { padding: 0 }]} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: colors.bgSecondary, borderBottomWidth: 1, borderBottomColor: colors.borderColor }}>
          <TouchableOpacity onPress={() => setActiveReceiver(null)} style={{ marginRight: 16 }}>
            <ChevronLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgTertiary, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
            <User size={20} color={colors.accent} />
          </View>
          <View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>{activeReceiver.name}</Text>
            <Text style={{ fontSize: 12, color: onlineUsersStatus[activeReceiver.id] === 'online' ? colors.success : colors.textSecondary }}>
              {onlineUsersStatus[activeReceiver.id] === 'online' ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          contentContainerStyle={{ padding: 16 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            const isMe = item.sender_id === user.id;
            return (
              <View style={{ 
                alignSelf: isMe ? 'flex-end' : 'flex-start',
                backgroundColor: isMe ? colors.accent : colors.bgSecondary,
                padding: 12,
                borderRadius: 16,
                borderBottomRightRadius: isMe ? 4 : 16,
                borderBottomLeftRadius: !isMe ? 4 : 16,
                marginBottom: 12,
                maxWidth: '80%'
              }}>
                <Text style={{ color: isMe ? '#fff' : colors.textPrimary, fontSize: 16 }}>{item.message}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4, gap: 4 }}>
                  <Text style={{ color: isMe ? 'rgba(255,255,255,0.7)' : colors.textSecondary, fontSize: 10 }}>
                    {new Date(item.createdAt || item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  {isMe && (
                    <Text style={{ color: item.is_read ? colors.success : 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700' }}>
                      {item.is_read ? '✓✓' : '✓'}
                    </Text>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Text style={{ color: colors.textSecondary }}>Say hello to start the conversation!</Text>
            </View>
          }
        />

        <View style={{ flexDirection: 'row', padding: 12, backgroundColor: colors.bgSecondary, borderTopWidth: 1, borderTopColor: colors.borderColor }}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0, marginRight: 12, borderRadius: 24, paddingHorizontal: 16 }]}
            placeholder="Type a message..."
            placeholderTextColor={colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
          />
          <TouchableOpacity 
            style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' }}
            onPress={handleSendMessage}
          >
            <Send size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // Channels List View
  return (
    <View style={[styles.container, { padding: 16 }]}>
      <Text style={[styles.title, { marginBottom: 24 }]}>Messages</Text>
      <FlatList
        data={channels}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.glassPanel, { flexDirection: 'row', alignItems: 'center', marginBottom: 12, padding: 16 }]}
            onPress={() => setActiveReceiver(item)}
          >
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.bgTertiary, justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
              <User size={24} color={colors.accent} />
              {onlineUsersStatus[item.id] === 'online' && (
                <View style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.success, borderWidth: 2, borderColor: colors.bgPrimary }} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>{item.name}</Text>
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>{item.role}</Text>
            </View>
            {unreadCounts[item.id] > 0 && (
              <View style={{ backgroundColor: colors.danger, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{unreadCounts[item.id]}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <MessageSquare size={64} color={colors.accent} style={{ marginBottom: 16 }} />
            <Text style={{ color: colors.textSecondary, fontSize: 16 }}>No contacts available.</Text>
          </View>
        }
      />
    </View>
  );
}
