import React, { useEffect, useState, useCallback } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  ActivityIndicator,
  RefreshControl
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../constants/Colors";
import { getChatList, pinOrArchiveRoom } from "../../services/chat";
import { useSocket } from "../../context/SocketContext";

export default function ChatListScreen({ navigation }) {
  const { onlineStatus, socket } = useSocket();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chats, setChats] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'pinned' | 'archived'

  const loadChats = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const data = await getChatList();
      setChats(data);
    } catch (err) {
      if (__DEV__) console.log("Error fetching chat list:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadChats();
    }, 0);

    // Reload list when socket notifies message receive or connection changes
    if (socket) {
      socket.on("receive-message", () => loadChats(false));
      socket.on("message_saved", () => loadChats(false));
      socket.on("messages_read", () => loadChats(false));
      socket.on("unread_update", () => loadChats(false));
    }

    return () => {
      clearTimeout(timer);
      if (socket) {
        socket.off("receive-message");
        socket.off("message_saved");
        socket.off("messages_read");
        socket.off("unread_update");
      }
    };
  }, [socket, loadChats]);

  const onRefresh = () => {
    setRefreshing(true);
    loadChats(false);
  };

  const handlePin = async (bookingId, currentVal) => {
    try {
      await pinOrArchiveRoom(bookingId, "pin", !currentVal);
      loadChats(false);
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  const handleArchive = async (bookingId, currentVal) => {
    try {
      await pinOrArchiveRoom(bookingId, "archive", !currentVal);
      loadChats(false);
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  // Format timestamp helper
  const formatTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  // Get preview helper for attachments
  const getMessagePreview = (item) => {
    if (!item.lastMessage) return "No messages yet";
    if (item.lastMessage.messageType === "IMAGE") {
      return "📷 Photo";
    }
    if (item.lastMessage.messageType === "VIDEO") {
      return "🎥 Video";
    }
    if (item.lastMessage.messageType === "PDF") {
      return "📄 PDF Document";
    }
    if (item.lastMessage.messageType === "VOICE") {
      return "🎵 Voice Message";
    }
    if (item.lastMessage.messageType === "LOCATION") {
      return "📍 Location Pin";
    }
    return item.lastMessage.message;
  };

  // Filter logic
  const filteredChats = chats.filter((chat) => {
    const matchesSearch =
      chat.recipient?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.bookingCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.serviceName?.toLowerCase().includes(searchQuery.toLowerCase());

    const isPinned = chat.roomSettings?.isPinned;
    const isArchived = chat.roomSettings?.isArchived;

    if (activeTab === "pinned") {
      return matchesSearch && isPinned && !isArchived;
    }
    if (activeTab === "archived") {
      return matchesSearch && isArchived;
    }
    return matchesSearch && !isArchived;
  });

  const renderChatItem = ({ item }) => {
    const isOnline = onlineStatus[item.recipient?.id?.toString()] === "online";
    const hasUnread = item.unreadCount > 0;

    return (
      <TouchableOpacity
        style={styles.chatCard}
        onPress={() =>
          navigation.navigate("ChatRoom", {
            bookingId: item.bookingId,
            receiverId: item.recipient?.id,
            receiverName: item.recipient?.name,
            receiverImage: item.recipient?.profileImage
          })
        }
      >
        <View style={styles.avatarWrapper}>
          <Image
            source={{ uri: item.recipient?.profileImage || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100" }}
            style={styles.avatar}
          />
          {isOnline && !item.recipient?.hideLastSeen && (
            <View style={styles.onlineDot} />
          )}
        </View>

        <View style={styles.chatDetails}>
          <View style={styles.chatHeaderRow}>
            <Text style={styles.recipientName} numberOfLines={1}>
              {item.recipient?.name || "User"}
            </Text>
            <Text style={[styles.timeText, hasUnread && styles.unreadTimeText]}>
              {formatTime(item.lastMessage?.createdAt)}
            </Text>
          </View>

          <Text style={styles.serviceText} numberOfLines={1}>
            {item.serviceName || "Mehndi Service"} • #{item.bookingCode}
          </Text>

          <View style={styles.previewRow}>
            <Text
              style={[styles.previewText, hasUnread && styles.unreadPreviewText]}
              numberOfLines={1}
            >
              {getMessagePreview(item)}
            </Text>

            {/* Quick Actions (Pin & Archive) */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                onPress={() => handlePin(item.bookingId, item.roomSettings?.isPinned)}
                style={styles.actionIcon}
              >
                <Ionicons
                  name={item.roomSettings?.isPinned ? "pin" : "pin-outline"}
                  size={16}
                  color={item.roomSettings?.isPinned ? Colors.primary : Colors.textTertiary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleArchive(item.bookingId, item.roomSettings?.isArchived)}
                style={styles.actionIcon}
              >
                <Ionicons
                  name={item.roomSettings?.isArchived ? "archive" : "archive-outline"}
                  size={16}
                  color={item.roomSettings?.isArchived ? Colors.primary : Colors.textTertiary}
                />
              </TouchableOpacity>
            </View>

            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCountText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>In-App Messages</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={18} color={Colors.textTertiary} style={styles.searchIcon} />
        <TextInput
          placeholder="Search by name, booking ID or service..."
          placeholderTextColor={Colors.placeholder}
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={16} color={Colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsWrapper}>
        {["all", "pinned", "archived"].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredChats}
          keyExtractor={(item) => item.bookingId.toString()}
          renderItem={renderChatItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={60} color={Colors.border} />
              <Text style={styles.emptyTitle}>No Conversations Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery.length > 0
                  ? "Try checking your spelling or search for a different name."
                  : `Active chats will appear here after booking confirmations.`}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white
  },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  headerTitle: { fontSize: 20, fontWeight: "700", color: Colors.text },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.inputBackground,
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },
  tabsWrapper: {
    flexDirection: "row",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.white
  },
  tabButton: {
    paddingVertical: 12,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: "transparent"
  },
  activeTabButton: { borderBottomColor: Colors.primary },
  tabText: { fontSize: 12, fontWeight: "700", color: Colors.textSecondary },
  activeTabText: { color: Colors.primary },
  listContent: { padding: 16, paddingBottom: 100 },
  chatCard: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6
  },
  avatarWrapper: { position: "relative" },
  avatar: { width: 54, height: 54, borderRadius: 27 },
  onlineDot: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: Colors.white,
    backgroundColor: Colors.success
  },
  chatDetails: { flex: 1, marginLeft: 12, justifyContent: "center" },
  chatHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  recipientName: { fontSize: 16, fontWeight: "700", color: Colors.text, flex: 1, marginRight: 8 },
  timeText: { fontSize: 11, color: Colors.textTertiary },
  unreadTimeText: { color: Colors.primary, fontWeight: "700" },
  serviceText: { fontSize: 12, color: Colors.textSecondary, marginVertical: 3 },
  previewRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  previewText: { fontSize: 13, color: Colors.textTertiary, flex: 1, marginRight: 8 },
  unreadPreviewText: { color: Colors.text, fontWeight: "600" },
  actionButtons: { flexDirection: "row", alignItems: "center", marginRight: 8 },
  actionIcon: { padding: 4, marginLeft: 6 },
  unreadBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center"
  },
  unreadCountText: { color: Colors.white, fontSize: 10, fontWeight: "700" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: Colors.text, marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: Colors.textSecondary, textAlign: "center", lineHeight: 18 }
});
