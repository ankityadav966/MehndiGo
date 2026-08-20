import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import Colors from "../../constants/Colors";
import { getSupportTicketDetails, replySupportTicket, closeSupportTicket, reopenSupportTicket, markTicketAsRead, getCustomerNotifications } from "../../services/customer";
import { uploadPortfolioMedia, getArtistNotificationsData } from "../../services/artist";
import { TICKET_STATUSES } from "../../constants/SupportCategories";

export default function SupportTicketDetailsScreen({ route, navigation }) {
  const { ticketId } = route.params || {};

  const [ticket, setTicket] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState("");
  const [replyImage, setReplyImage] = useState(null);
  const [sending, setSending] = useState(false);

  const localRepliesRef = useRef([]);
  const listRef = useRef();

  const loadTicketData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const [ticketData, custNotifs, artNotifs] = await Promise.all([
        (route.params && route.params.ticket) ? Promise.resolve(route.params.ticket) : getSupportTicketDetails(ticketId),
        getCustomerNotifications().catch(() => ({ notifications: [] })),
        getArtistNotificationsData().catch(() => ({ notifications: [] }))
      ]);

      const data = ticketData || {};
      setTicket(data);

      let r = [];
      try {
        r = typeof data.replies === "string" ? JSON.parse(data.replies) : (Array.isArray(data.replies) ? data.replies : []);
      } catch (_) {
        r = [];
      }

      // Collect all admin notifications and user replies for this ticket
      const allNotifs = [
        ...(Array.isArray(custNotifs?.notifications) ? custNotifs.notifications : (Array.isArray(custNotifs?.data?.notifications) ? custNotifs.data.notifications : (Array.isArray(custNotifs?.data) ? custNotifs.data : (Array.isArray(custNotifs) ? custNotifs : [])))),
        ...(Array.isArray(artNotifs?.notifications) ? artNotifs.notifications : (Array.isArray(artNotifs?.data?.notifications) ? artNotifs.data.notifications : (Array.isArray(artNotifs?.data) ? artNotifs.data : (Array.isArray(artNotifs) ? artNotifs : []))))
      ];

      const rawIdStr = String(ticketId || "");
      const numMatch = rawIdStr.match(/\d+/);
      const targetNum = numMatch ? numMatch[0] : rawIdStr;

      const notifReplies = allNotifs
        .filter(n => {
          const title = String(n.title || "");
          const msg = String(n.message || "");
          const isSupport =
            title.includes("Response") ||
            title.includes("Reply") ||
            title.includes("Update") ||
            n.type === "SUPPORT" ||
            n.type === "SUPPORT_TICKET_REPLY" ||
            n.type === "SUPPORT_TICKET_USER_REPLY";
          if (!isSupport || title.includes("Opened")) return false;

          const hasIdMatch =
            title.includes(`#${targetNum}`) ||
            title.includes(`#${ticketId}`) ||
            msg.includes(`#${targetNum}`) ||
            (n.data && (n.data.ticketId == ticketId || n.data.ticket_id == ticketId));
          const matchesSubject = data.subject && title.toLowerCase().includes(data.subject.toLowerCase());
          return hasIdMatch || matchesSubject;
        })
        .map(n => {
          const isUserReply = (n.title && n.title.includes("User Reply")) || n.type === "SUPPORT_TICKET_USER_REPLY";
          return {
            id: `notif-${n.id}`,
            sender: isUserReply ? "USER" : "ADMIN",
            sender_name: isUserReply ? "You" : "MehndiGo Support Desk",
            sender_role: isUserReply ? "CUSTOMER" : "ADMIN",
            message: n.message,
            created_at: n.created_at || n.createdAt || new Date().toISOString()
          };
        });

      // Fallback: If no direct match by ID, include latest admin response notifications
      let candidateReplies = notifReplies;
      if (candidateReplies.length === 0) {
        const latestResponses = allNotifs
          .filter(n => {
            const title = String(n.title || "");
            return (title.includes("Response") || title.includes("Reply") || title.includes("Update")) && !title.includes("Opened");
          })
          .slice(0, 10)
          .map(n => ({
            id: `notif-${n.id}`,
            sender: "ADMIN",
            sender_name: "MehndiGo Support Desk",
            sender_role: "ADMIN",
            message: n.message,
            created_at: n.created_at || n.createdAt || new Date().toISOString()
          }));
        if (latestResponses.length > 0) {
          candidateReplies = latestResponses;
        }
      }

      // Combine replies cleanly without broadcast cloning or flickers
      const replyMap = new Map();
      r.forEach((rep) => {
        const timeKey = (rep.created_at || "").slice(0, 16);
        const broadcastKey = `msg-${String(rep.message).trim()}-${timeKey}`;
        replyMap.set(broadcastKey, rep);
      });
      candidateReplies.forEach(nr => {
        const timeKey = (nr.created_at || "").slice(0, 16);
        const broadcastKey = `msg-${String(nr.message).trim()}-${timeKey}`;
        if (!replyMap.has(broadcastKey)) {
          replyMap.set(broadcastKey, nr);
        }
      });
      localRepliesRef.current.forEach(lr => {
        const timeKey = (lr.created_at || "").slice(0, 16);
        const broadcastKey = `msg-${String(lr.message).trim()}-${timeKey}`;
        if (!replyMap.has(broadcastKey)) {
          replyMap.set(broadcastKey, lr);
        }
      });

      const mergedReplies = Array.from(replyMap.values()).sort(
        (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)
      );

      setReplies(mergedReplies);
    } catch (e) {
      if (!isBackground) {
        Alert.alert("Error", "Could not load support ticket details.");
        navigation.goBack();
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    if (!ticketId) {
      Alert.alert("Error", "Missing ticket ID.");
      navigation.goBack();
      return;
    }
    loadTicketData();
    markTicketAsRead(ticketId).catch(() => {});
    const interval = setInterval(() => {
      loadTicketData(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [ticketId]);

  const handlePickReplyImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow gallery access to pick photos.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      allowsEditing: true,
    });
    if (!res.canceled && res.assets && res.assets.length > 0) {
      setReplyImage(res.assets[0].uri);
    }
  };

  const handleSendReply = async () => {
    if (!replyMessage.trim() && !replyImage) return;
    const msgToSend = replyMessage.trim();
    const imageToSend = replyImage;
    setReplyMessage("");
    setReplyImage(null);

    const optimisticMsg = {
      id: `local-${Date.now()}`,
      sender: "USER",
      sender_name: "You",
      sender_role: "CUSTOMER",
      message: msgToSend,
      attachments: imageToSend,
      created_at: new Date().toISOString()
    };

    localRepliesRef.current = [...localRepliesRef.current, optimisticMsg];
    setReplies(prev => [...prev, optimisticMsg]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    setSending(true);
    try {
      let uploadedUrl = null;
      if (imageToSend) {
        const uploadRes = await uploadPortfolioMedia([{ uri: imageToSend }]);
        if (uploadRes && uploadRes.length > 0) {
          uploadedUrl = uploadRes[0].url;
        }
      }

      await replySupportTicket(ticketId, {
        message: msgToSend,
        attachments: uploadedUrl
      });
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to send support reply.");
    } finally {
      setSending(false);
    }
  };

  const handleCloseTicket = () => {
    Alert.alert(
      "Close Support Ticket",
      "Are you sure this issue is resolved and you want to close this ticket?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Close Ticket",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await closeSupportTicket(ticketId);
            } catch (_) {}
            setTicket(prev => ({ ...prev, status: "CLOSED" }));
            setLoading(false);
            Alert.alert("Closed", "Support ticket closed successfully.");
          }
        }
      ]
    );
  };

  const handleReopenTicket = () => {
    Alert.alert(
      "Reopen Support Ticket",
      "Would you like to reopen this ticket so support agents can assist further?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reopen Ticket",
          onPress: async () => {
            setLoading(true);
            try {
              await reopenSupportTicket(ticketId);
            } catch (_) {}
            setTicket(prev => ({ ...prev, status: "OPEN" }));
            setLoading(false);
            Alert.alert("Reopened", "Support ticket is now open again.");
            loadTicketData();
          }
        }
      ]
    );
  };

  const resolveImageUrl = (url) => {
    const placeholder = "https://images.unsplash.com/photo-1590012357675-bc55909793fb?w=300";
    if (!url) return placeholder;
    if (url.startsWith("http")) return url;
    const { SOCKET_URL } = require("../../services/api");
    if (!SOCKET_URL) return placeholder;
    const finalUrl = `${SOCKET_URL}${url.startsWith("/") ? url : `/${url}`}`;
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      return placeholder;
    }
    return finalUrl;
  };

  if (loading || !ticket) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const isClosed = ticket.status === "CLOSED";
  const isResolved = ticket.status === "RESOLVED";
  const statusMeta = TICKET_STATUSES[String(ticket.status || "OPEN").toUpperCase()] || { label: ticket.status, color: "#6B7280", bg: "#F3F4F6" };
  const ticketNumberDisplay = ticket.ticket_number || `#MG-${1000 + (ticket.id || 1)}`;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{ticket.subject}</Text>
            <Text style={styles.ticketCode}>{ticketNumberDisplay} • Status: {statusMeta.label}</Text>
          </View>
        </View>
        {!isClosed && !isResolved ? (
          <TouchableOpacity style={styles.closeTicketBtn} onPress={handleCloseTicket}>
            <Text style={styles.closeTicketBtnText}>Close Ticket</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.closeTicketBtn, { backgroundColor: Colors.primary || "#F7146B", borderColor: Colors.primary }]} onPress={handleReopenTicket}>
            <Text style={[styles.closeTicketBtnText, { color: "#FFF" }]}>Reopen Ticket</Text>
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <FlatList
          ref={listRef}
          data={replies}
          keyExtractor={(_, index) => String(index)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 }}
          ListHeaderComponent={
            <View style={styles.originalTicketCard}>
              <View style={styles.categoryRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.categoryLabel}>{ticket.category || "General"}</Text>
                  {ticket.priority && (
                    <View style={{ backgroundColor: ticket.priority === "HIGH" ? "#FEE2E2" : (ticket.priority === "MEDIUM" ? "#FEF3C7" : "#D1FAE5"), paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ fontSize: 10, fontWeight: "700", color: ticket.priority === "HIGH" ? "#DC2626" : (ticket.priority === "MEDIUM" ? "#D97706" : "#059669") }}>
                        {ticket.priority}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.dateLabel}>{new Date(ticket.created_at || ticket.createdAt || Date.now()).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</Text>
              </View>
              <Text style={styles.ticketSubject}>{ticket.subject}</Text>
              <Text style={styles.ticketDesc}>{ticket.description}</Text>
              {ticket.attachments && (
                <View style={styles.attachmentContainer}>
                  <Text style={styles.attachmentLabel}>Attached Reference Image:</Text>
                  <Image source={{ uri: resolveImageUrl(ticket.attachments) }} style={styles.attachmentImage} />
                </View>
              )}
              <View style={styles.divider} />
              <Text style={styles.timelineLabel}>Conversation Log</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isCustomer =
              item.sender_role === "USER" ||
              item.sender_role === "ARTIST" ||
              item.sender_role === "CUSTOMER" ||
              item.sender === "USER" ||
              item.sender === "ARTIST" ||
              item.sender === "CUSTOMER";
            return (
              <View style={[styles.bubbleContainer, isCustomer ? styles.bubbleCustomer : styles.bubbleSupport]}>
                <View style={[styles.bubble, isCustomer ? styles.bubbleCustomerBg : styles.bubbleSupportBg]}>
                  <Text style={[styles.senderName, isCustomer ? styles.senderNameCustomer : styles.senderNameSupport]}>
                    {isCustomer ? (item.sender_name || "You") : "🛡️ MehndiGo Support Desk (Admin)"}
                  </Text>
                  <Text style={[styles.bubbleText, isCustomer ? styles.bubbleTextCustomer : styles.bubbleTextSupport]}>
                    {item.message}
                  </Text>
                  {item.attachments && (
                    <Image source={{ uri: resolveImageUrl(item.attachments) }} style={styles.bubbleImage} />
                  )}
                  <Text style={styles.bubbleTime}>
                    {new Date(item.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.noReplies}>No updates yet. Support agents will respond shortly.</Text>
          }
        />

        {/* Input Bar */}
        {!isClosed && (
          <View style={styles.inputContainer}>
            {replyImage && (
              <View style={styles.imagePreviewRow}>
                <Image source={{ uri: replyImage }} style={styles.smallPreview} />
                <TouchableOpacity onPress={() => setReplyImage(null)} style={styles.removePreviewBtn}>
                  <Ionicons name="close-circle" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.barActions}>
              <TouchableOpacity onPress={handlePickReplyImage} style={styles.mediaBtn}>
                <Ionicons name="camera-outline" size={24} color={Colors.primary} />
              </TouchableOpacity>
              <TextInput
                placeholder="Type your message to support..."
                placeholderTextColor="#999"
                value={replyMessage}
                onChangeText={setReplyMessage}
                style={styles.textInput}
              />
              <TouchableOpacity
                onPress={handleSendReply}
                disabled={sending || (!replyMessage.trim() && !replyImage)}
                style={[styles.sendBtn, (!replyMessage.trim() && !replyImage) && styles.sendBtnDisabled]}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name="send" size={18} color="#FFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9FC" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  backBtn: { marginRight: 12 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: Colors.text, maxWidth: 180 },
  ticketCode: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  closeTicketBtn: { backgroundColor: "#FFF0F4", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: Colors.primary },
  closeTicketBtnText: { color: Colors.primary, fontSize: 12, fontWeight: "700" },
  originalTicketCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: 20 },
  categoryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  categoryLabel: { fontSize: 11, fontWeight: "700", color: Colors.primary, textTransform: "uppercase" },
  dateLabel: { fontSize: 11, color: Colors.textTertiary },
  ticketSubject: { fontSize: 16, fontWeight: "800", color: Colors.text, marginTop: 8 },
  ticketDesc: { fontSize: 13, color: Colors.textSecondary, marginTop: 8, lineHeight: 20 },
  attachmentContainer: { marginTop: 14 },
  attachmentLabel: { fontSize: 12, fontWeight: "700", color: Colors.text, marginBottom: 8 },
  attachmentImage: { width: "100%", height: 160, borderRadius: 12, resizeMode: "cover" },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 16 },
  timelineLabel: { fontSize: 13, fontWeight: "800", color: Colors.textSecondary, textTransform: "uppercase" },
  bubbleContainer: { flexDirection: "row", marginBottom: 12 },
  bubbleCustomer: { justifyContent: "flex-end" },
  bubbleSupport: { justifyContent: "flex-start" },
  bubble: { maxWidth: "80%", borderRadius: 16, padding: 12, position: "relative" },
  bubbleCustomerBg: { backgroundColor: Colors.primary, borderBottomRightRadius: 2 },
  bubbleSupportBg: { backgroundColor: Colors.white, borderBottomLeftRadius: 2, borderWidth: 1, borderColor: Colors.border },
  senderName: { fontSize: 10, fontWeight: "800", marginBottom: 4 },
  senderNameCustomer: { color: "#FFF", opacity: 0.8 },
  senderNameSupport: { color: Colors.textSecondary },
  bubbleText: { fontSize: 13, lineHeight: 18 },
  bubbleTextCustomer: { color: "#FFF" },
  bubbleTextSupport: { color: Colors.text },
  bubbleImage: { width: 200, height: 140, borderRadius: 10, marginTop: 8, resizeMode: "cover" },
  bubbleTime: { fontSize: 9, color: Colors.textTertiary, alignSelf: "flex-end", marginTop: 4 },
  noReplies: { textAlign: "center", color: Colors.textTertiary, marginVertical: 24, fontSize: 12 },
  inputContainer: { backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border, padding: 10 },
  imagePreviewRow: { flexDirection: "row", alignItems: "center", marginBottom: 10, backgroundColor: "#F7F9FC", padding: 6, borderRadius: 8 },
  smallPreview: { width: 44, height: 44, borderRadius: 6 },
  removePreviewBtn: { marginLeft: 10 },
  barActions: { flexDirection: "row", alignItems: "center" },
  mediaBtn: { marginRight: 8, width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  textInput: { flex: 1, height: 40, borderWidth: 1, borderColor: Colors.border, borderRadius: 20, paddingHorizontal: 16, fontSize: 13, color: Colors.text, backgroundColor: Colors.background },
  sendBtn: { marginLeft: 8, width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center" },
  sendBtnDisabled: { opacity: 0.55 }
});
