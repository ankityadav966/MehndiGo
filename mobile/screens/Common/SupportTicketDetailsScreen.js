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
import { getSupportTicketDetails, replySupportTicket, closeSupportTicket } from "../../services/customer";
import { uploadPortfolioMedia } from "../../services/artist";

export default function SupportTicketDetailsScreen({ route, navigation }) {
  const { ticketId } = route.params || {};

  const [ticket, setTicket] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState("");
  const [replyImage, setReplyImage] = useState(null);
  const [sending, setSending] = useState(false);

  const listRef = useRef();

  const loadTicketData = async () => {
    try {
      const data = await getSupportTicketDetails(ticketId);
      setTicket(data);
      setReplies(data.replies ? JSON.parse(data.replies) : []);
    } catch (e) {
      Alert.alert("Error", "Could not load support ticket details.");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!ticketId) {
      Alert.alert("Error", "Missing ticket ID.");
      navigation.goBack();
      return;
    }
    const timer = setTimeout(() => {
      loadTicketData();
    }, 0);
    return () => clearTimeout(timer);
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
    setSending(true);
    try {
      let uploadedUrl = null;
      if (replyImage) {
        const uploadRes = await uploadPortfolioMedia([{ uri: replyImage }]);
        if (uploadRes && uploadRes.length > 0) {
          uploadedUrl = uploadRes[0].url;
        }
      }

      const updated = await replySupportTicket(ticketId, {
        message: replyMessage.trim(),
        attachments: uploadedUrl
      });
      setTicket(updated);
      setReplies(updated.replies ? JSON.parse(updated.replies) : []);
      setReplyMessage("");
      setReplyImage(null);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
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
              const closed = await closeSupportTicket(ticketId);
              setTicket(closed);
              Alert.alert("Closed", "Support ticket closed successfully.");
              loadTicketData();
            } catch (err) {
              Alert.alert("Error", "Failed to close ticket.");
              setLoading(false);
            }
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

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{ticket.subject}</Text>
            <Text style={styles.ticketCode}>Status: {ticket.status}</Text>
          </View>
        </View>
        {!isClosed && (
          <TouchableOpacity style={styles.closeTicketBtn} onPress={handleCloseTicket}>
            <Text style={styles.closeTicketBtnText}>Close Ticket</Text>
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          ref={listRef}
          data={replies}
          keyExtractor={(_, index) => String(index)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 }}
          ListHeaderComponent={
            <View style={styles.originalTicketCard}>
              <View style={styles.categoryRow}>
                <Text style={styles.categoryLabel}>{ticket.category}</Text>
                <Text style={styles.dateLabel}>{new Date(ticket.createdAt).toLocaleDateString()}</Text>
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
            const isCustomer = item.sender_role === "USER" || item.sender_role === "ARTIST";
            return (
              <View style={[styles.bubbleContainer, isCustomer ? styles.bubbleCustomer : styles.bubbleSupport]}>
                <View style={[styles.bubble, isCustomer ? styles.bubbleCustomerBg : styles.bubbleSupportBg]}>
                  <Text style={[styles.senderName, isCustomer ? styles.senderNameCustomer : styles.senderNameSupport]}>
                    {item.sender_name} ({item.sender_role})
                  </Text>
                  <Text style={[styles.bubbleText, isCustomer ? styles.bubbleTextCustomer : styles.bubbleTextSupport]}>
                    {item.message}
                  </Text>
                  {item.attachments && (
                    <Image source={{ uri: resolveImageUrl(item.attachments) }} style={styles.bubbleImage} />
                  )}
                  <Text style={styles.bubbleTime}>
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
