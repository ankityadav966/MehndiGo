import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Clipboard,
  Linking,
  Dimensions,
  StatusBar,
  Keyboard,
  ScrollView
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import ImageView from "react-native-image-viewing";

import Colors from "../../constants/Colors";
import { useAudioRecorder, createAudioPlayer, AudioModule, RecordingPresets, setAudioModeAsync } from "expo-audio";
import { useSocket } from "../../context/SocketContext";
import { useAuth } from "../../context/AuthContext";
import {
  getChatHistory,
  deleteMessage,
  editMessage,
  uploadChatMedia,
  blockUser,
  reportUser
} from "../../services/chat";
import { getBookingDetails } from "../../services/booking";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Header Primary Theme Color (Red as requested by user)
const HEADER_RED = "#D32F2F";

// WhatsApp Style Emoji Tray Data
const EMOJI_CATEGORIES = [
  {
    id: "smileys",
    title: "Smileys",
    icon: "happy-outline",
    emojis: ["😊", "😂", "🤣", "😍", "🥰", "😘", "😋", "😎", "🤩", "🥳", "🥺", "🤗", "😇", "🤫", "😴", "😁", "😃", "😉", "😜", "🤭", "😌", "🙌", "👏", "🤝"]
  },
  {
    id: "gestures",
    title: "Love & Gestures",
    icon: "thumbs-up-outline",
    emojis: ["👍", "👌", "✌️", "🤞", "🙏", "❤️", "💖", "💕", "💞", "💓", "🔥", "✨", "💯", "⭐", "💫", "💐", "🌹", "🎉", "🎊", "🎁", "🎈", "🪄", "🪅", "👑"]
  },
  {
    id: "mehndi",
    title: "Mehndi & Style",
    icon: "sparkles-outline",
    emojis: ["🌺", "🌸", "💍", "👰", "💃", "🪔", "🌿", "🕊️", "💎", "🎀", "🪞", "🥻", "👗", "👠", "🧿", "🪷", "🌼", "🌻", "🪡", "🎨", "💅", "💄", "🪘", "🪩"]
  }
];

const QUICK_RESPONSES = [
  "Namaste! 🙏",
  "Thank you so much! 😊",
  "The design looks gorgeous! 🌺",
  "Please share your live location 📍",
  "I am on my way 🚗",
  "Confirmed! Looking forward to it 👍",
  "How much time will it take? ⏳",
  "Done! Payment completed 💳"
];

// Helper: Extract valid media URL from any message payload variation
export const resolveMediaUrl = (item) => {
  if (!item) return null;
  if (item.media_url && typeof item.media_url === "string") return item.media_url;
  if (item.mediaUrl && typeof item.mediaUrl === "string") return item.mediaUrl;
  if (typeof item.media === "string" && item.media.length > 5) return item.media;
  if (item.media?.file_url && typeof item.media.file_url === "string") return item.media.file_url;
  if (item.media?.fileUrl && typeof item.media.fileUrl === "string") return item.media.fileUrl;
  if (item.media?.url && typeof item.media.url === "string") return item.media.url;
  if (item.media?.uri && typeof item.media.uri === "string") return item.media.uri;
  if (item.file_url && typeof item.file_url === "string") return item.file_url;
  if (item.fileUrl && typeof item.fileUrl === "string") return item.fileUrl;
  if (item.url && typeof item.url === "string") return item.url;
  if (typeof item.message === "string" && (item.message.startsWith("http") || item.message.startsWith("data:image"))) {
    return item.message;
  }
  return null;
};

// Helper: Determine the exact message type
export const resolveMessageType = (item) => {
  if (!item) return "TEXT";
  let type = String(item.message_type || item.messageType || "TEXT").toUpperCase();
  const url = resolveMediaUrl(item);
  if (type === "TEXT" && url) {
    if (url.match(/\.(jpg|jpeg|png|webp|gif)/i) || url.startsWith("data:image")) return "IMAGE";
    if (url.match(/\.(mp4|mov|avi|mkv)/i) || url.startsWith("data:video")) return "VIDEO";
    if (url.match(/\.(mp3|wav|m4a|aac|ogg)/i) || url.startsWith("data:audio") || url.includes("voice")) return "VOICE";
    if (url.match(/\.(pdf|doc|docx)/i) || url.startsWith("data:application")) return "PDF";
    if (url.includes("maps.google.com") || url.includes("google.com/maps")) return "LOCATION";
  }
  return type;
};

// WhatsApp Time Format: e.g. "11:42 AM"
export const formatMessageTime = (dateStr) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
  } catch {
    return "";
  }
};

// WhatsApp Date Separator: "TODAY", "YESTERDAY", or "26 AUG 2026"
export const formatDateSeparator = (dateStr) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return "TODAY";
    if (d.toDateString() === yesterday.toDateString()) return "YESTERDAY";
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }).toUpperCase();
  } catch {
    return "";
  }
};

export default function ChatRoomScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { bookingId, receiverId, receiverName, receiverImage } = route.params || {};

  const {
    connected,
    typingUsers,
    onlineStatus,
    messages,
    setMessages,
    joinRoom,
    leaveRoom,
    sendChatMessage,
    emitTyping
  } = useSocket();

  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [booking, setBooking] = useState(null);
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // Check voice hardware support
  useEffect(() => {
    async function checkVoiceSupport() {
      try {
        await setAudioModeAsync({ playsInSilentMode: true });
        setIsVoiceSupported(true);
      } catch (err) {
        if (__DEV__) console.log("Native Audio recording not supported:", err.message);
        setIsVoiceSupported(false);
      }
    }
    checkVoiceSupport();
  }, []);

  // Rich Actions States
  const [replyMessage, setReplyMessage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [attachmentVisible, setAttachmentVisible] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState("smileys");

  // Voice Message Recording States
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const recordingTimer = useRef(null);

  // Voice Audio Player States
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const soundRef = useRef(null);

  // Full Screen Image Viewer State
  const [viewerImages, setViewerImages] = useState([]);
  const [viewerVisible, setViewerVisible] = useState(false);

  // Moderation Dialogs
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [moderationMenuVisible, setModerationMenuVisible] = useState(false);

  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Load chat history and booking details
  const loadHistoryAndDetails = useCallback(async () => {
    try {
      const history = await getChatHistory(bookingId);
      if (Array.isArray(history)) {
        setMessages(history);
      }
      
      const bDetails = await getBookingDetails(bookingId);
      if (bDetails) {
        setBooking(bDetails);
      }
    } catch (e) {
      if (__DEV__) console.log("Error loading history/booking details:", e.message);
    } finally {
      setLoading(false);
    }
  }, [bookingId, setMessages]);

  const isChatExpired = useCallback(() => {
    if (booking?.detailed_status === "COMPLETED_CLOSED" || booking?.review_skipped) {
      return true;
    }
    if (booking?.booking_status === "COMPLETED") {
      const completionTime = new Date(booking.updatedAt || booking.createdAt || booking.created_at).getTime();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      return Date.now() - completionTime > sevenDaysMs;
    }
    return false;
  }, [booking]);

  useEffect(() => {
    if (!bookingId) {
      Alert.alert("Error", "Missing booking ID parameter.");
      navigation.goBack();
      return;
    }

    joinRoom(bookingId);
    loadHistoryAndDetails();

    // Fast 1.2-second smart polling backup to guarantee instantaneous sync
    const interval = setInterval(() => {
      getChatHistory(bookingId).then((history) => {
        if (Array.isArray(history) && history.length > 0) {
          setMessages((prev) => {
            const pending = prev.filter((m) => m.isOfflinePending);
            const remainingPending = pending.filter((p) => !history.some((h) => h.message === p.message || String(h.id) === String(p.id)));
            if (history.length === prev.length && !pending.length) {
              const lastPrev = prev[prev.length - 1];
              const lastHist = history[history.length - 1];
              if (lastPrev && lastHist && String(lastPrev.id) === String(lastHist.id)) {
                return prev;
              }
            }
            return [...history, ...remainingPending];
          });
        }
      }).catch(() => {});
    }, 1200);

    return () => {
      clearInterval(interval);
      leaveRoom(bookingId);
      if (soundRef.current) {
        soundRef.current.unloadAsync ? soundRef.current.unloadAsync() : null;
      }
    };
  }, [bookingId, joinRoom, leaveRoom, loadHistoryAndDetails, setMessages]);

  // Auto-scroll on new message arrivals
  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages.length]);

  // Handle message send
  const handleSend = () => {
    if (!inputText.trim()) return;

    if (editingMessage) {
      editMessage(editingMessage.id, inputText.trim())
        .then(() => {
          setEditingMessage(null);
          setInputText("");
        })
        .catch((e) => Alert.alert("Error", e.message));
    } else {
      sendChatMessage(
        bookingId,
        inputText.trim(),
        "TEXT",
        replyMessage ? replyMessage.id : null,
        null,
        receiverId
      );
      setReplyMessage(null);
      setInputText("");
    }
  };

  // Keyboard typing indicator helper
  const handleTextChange = (text) => {
    setInputText(text);
    emitTyping(bookingId, true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emitTyping(bookingId, false);
    }, 2000);
  };

  // 1. Camera Capture
  const handleCamera = async () => {
    setAttachmentVisible(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Access Denied", "Camera permission is required to take photos.");
      return;
    }

    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7
    });

    if (!res.canceled && res.assets?.[0]) {
      uploadMediaAttachment(res.assets[0].uri, "image");
    }
  };

  // 2. Gallery Pick
  const handleGallery = async () => {
    setAttachmentVisible(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Access Denied", "Gallery permission is required.");
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: true,
      quality: 0.7
    });

    if (!res.canceled && res.assets?.[0]) {
      const isVideo = res.assets[0].type === "video";
      uploadMediaAttachment(res.assets[0].uri, isVideo ? "video" : "image");
    }
  };

  const handleVideoAttachment = async () => {
    setAttachmentVisible(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Access Denied", "Gallery permission is required.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: true,
      quality: 0.7
    });
    if (!res.canceled && res.assets?.[0]) {
      uploadMediaAttachment(res.assets[0].uri, "video");
    }
  };

  const handleDocumentAttachment = async () => {
    setAttachmentVisible(false);
    try {
      const DocumentPicker = require("expo-document-picker");
      const res = await DocumentPicker.getDocumentAsync({
        type: "*/*"
      });
      if (!res.canceled && res.assets?.[0]) {
        uploadMediaAttachment(res.assets[0].uri, "pdf");
      }
    } catch (err) {
      if (__DEV__) console.log("Document picker error:", err.message);
      Alert.alert("Notice", "Documents picker is not available in current environment.");
    }
  };

  // 3. Location Share
  const handleLocation = async () => {
    setAttachmentVisible(false);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required to share your current location.");
        return;
      }

      const gpsEnabled = await Location.hasServicesEnabledAsync();
      if (!gpsEnabled) {
        if (Platform.OS === "android") {
          await Location.enableNetworkProviderAsync().catch(() => {});
        } else {
          Alert.alert("GPS Disabled", "Please enable Location Services in your settings.", [
            { text: "Settings", onPress: () => Linking.openURL("app-settings:") },
            { text: "Cancel" }
          ]);
          return;
        }
      }

      setMediaUploading(true);
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      
      sendChatMessage(bookingId, `📍 Shared Location`, "LOCATION", null, {
        file_url: `https://maps.google.com/?q=${loc.coords.latitude},${loc.coords.longitude}`,
        file_type: "location",
        waveform: { latitude: loc.coords.latitude, longitude: loc.coords.longitude }
      }, receiverId);
    } catch (e) {
      Alert.alert("Error", "Could not fetch current coordinates. Please make sure GPS is enabled.");
    } finally {
      setMediaUploading(false);
    }
  };

  // Media upload to backend -> Cloudinary -> Socket emit
  const uploadMediaAttachment = async (uri, type) => {
    setMediaUploading(true);
    try {
      const res = await uploadChatMedia(uri, type);
      const persistentUrl = res?.file_url || res?.url || uri;
      sendChatMessage(bookingId, `📎 Sent ${type}`, type.toUpperCase(), null, {
        file_url: persistentUrl,
        fileUrl: persistentUrl,
        url: persistentUrl,
        file_type: type,
        file_size: res?.file_size || null
      }, receiverId);
    } catch (e) {
      Alert.alert("Upload Error", e.message || "Failed to upload file attachment.");
    } finally {
      setMediaUploading(false);
    }
  };

  // Emoji and Quick Phrase Handlers
  const handleEmojiSelect = (emoji) => {
    setInputText((prev) => prev + emoji);
  };

  const handleQuickResponseSelect = (phrase) => {
    setInputText(phrase);
    setEmojiPickerVisible(false);
  };

  const handleBackspaceEmoji = () => {
    setInputText((prev) => {
      if (!prev) return "";
      const chars = Array.from(prev);
      chars.pop();
      return chars.join("");
    });
  };

  // 4. Voice Recording Operations (Start, Stop & Send, Cancel)
  const startRecording = async () => {
    if (!isVoiceSupported) {
      Alert.alert("Notice", "Voice messages aren't available in current environment.");
      return;
    }
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission Denied", "Microphone access is required to record voice notes.");
        return;
      }
      setEmojiPickerVisible(false);
      setIsRecording(true);
      setRecordingDuration(0);
      if (recordingTimer.current) clearInterval(recordingTimer.current);
      recordingTimer.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch (err) {
      if (__DEV__) console.log("Audio record error:", err.message);
      setIsRecording(false);
      if (recordingTimer.current) clearInterval(recordingTimer.current);
      Alert.alert("Recording Error", "Could not start audio recorder. Please try again.");
    }
  };

  const stopRecordingAndSend = async () => {
    if (!isRecording) return;

    const currentDuration = recordingDuration || 1;
    setIsRecording(false);
    if (recordingTimer.current) clearInterval(recordingTimer.current);

    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (__DEV__) console.log("[RECORDED AUDIO URI]", uri);

      if (uri) {
        setMediaUploading(true);
        let persistentUrl = uri;
        try {
          const res = await uploadChatMedia(uri, "voice");
          persistentUrl = res?.file_url || res?.url || uri;
        } catch (uploadErr) {
          if (__DEV__) console.log("[VOICE UPLOAD NOTICE, FALLBACK TO DIRECT URI]", uploadErr.message);
        }

        await sendChatMessage(bookingId, `🎵 Voice Note (${currentDuration}s)`, "VOICE", null, {
          file_url: persistentUrl,
          fileUrl: persistentUrl,
          url: persistentUrl,
          file_type: "voice",
          duration: currentDuration
        }, receiverId);
      } else {
        Alert.alert("Notice", "Voice recording was empty. Please try recording again.");
      }
    } catch (e) {
      if (__DEV__) console.log("[VOICE SEND ERROR]", e.message);
      Alert.alert("Audio Error", "Failed to process and send voice note.");
    } finally {
      setMediaUploading(false);
    }
  };

  const cancelRecording = async () => {
    setIsRecording(false);
    if (recordingTimer.current) clearInterval(recordingTimer.current);
    try {
      await audioRecorder.stop();
    } catch (e) {}
  };

  const handleMicPress = () => {
    if (isRecording) {
      stopRecordingAndSend();
    } else {
      startRecording();
    }
  };

  // Play voice note playback
  const playAudio = async (messageId, url) => {
    try {
      if (playingAudioId === messageId) {
        if (soundRef.current) {
          soundRef.current.pause ? soundRef.current.pause() : null;
          setPlayingAudioId(null);
        }
        return;
      }

      if (soundRef.current) {
        soundRef.current.release ? soundRef.current.release() : null;
        soundRef.current = null;
      }

      const player = createAudioPlayer(url);
      soundRef.current = player;
      setPlayingAudioId(messageId);

      const subscription = player.addListener("playbackStatusUpdate", (status) => {
        if (status.didJustFinish) {
          setPlayingAudioId(null);
          subscription.remove();
        }
      });
      player.play();
    } catch (err) {
      Alert.alert("Audio Error", "Could not play voice recording.");
      setPlayingAudioId(null);
    }
  };

  // Moderation Block User
  const handleBlockUser = () => {
    setModerationMenuVisible(false);
    Alert.alert(
      "Block Contact",
      `Are you sure you want to block ${receiverName || "this user"}? You won't receive messages from them.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            try {
              await blockUser(receiverId);
              Alert.alert("User Blocked", "User has been blocked.");
              navigation.goBack();
            } catch (e) {
              Alert.alert("Error", e.message);
            }
          }
        }
      ]
    );
  };

  // Moderation Report User
  const handleReportUserSubmit = async () => {
    if (!reportReason.trim()) {
      Alert.alert("Validation", "Please describe the reason for your report.");
      return;
    }
    try {
      await reportUser(receiverId, reportReason.trim());
      setReportModalVisible(false);
      setReportReason("");
      Alert.alert("Report Submitted", "Thank you for letting us know. Our team will review this transcript.");
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  // Trigger Delete Message
  const triggerDeleteMessage = (item) => {
    const isMe = Boolean(item.isMe || (user?.id && Number(item.sender_id || item.senderId) === Number(user.id)));
    const options = [
      { text: "Delete For Me", onPress: () => deleteMessage(item.id, "me").then(() => loadHistoryAndDetails()) }
    ];

    const messageTime = new Date(item.createdAt || item.created_at || item.timestamp).getTime();
    if (isMe && Date.now() - messageTime < 15 * 60 * 1000) {
      options.push({
        text: "Delete For Everyone",
        style: "destructive",
        onPress: () => deleteMessage(item.id, "everyone").then(() => loadHistoryAndDetails())
      });
    }

    options.push({ text: "Cancel", style: "cancel" });
    Alert.alert("Delete Message", "Delete message from chat?", options);
  };

  // Bubble Long Press Menu
  const handleBubbleLongPress = (item) => {
    const isMe = Boolean(item.isMe || (user?.id && Number(item.sender_id || item.senderId) === Number(user.id)));
    const messageTime = new Date(item.createdAt || item.created_at || item.timestamp).getTime();
    const canEdit = isMe && (Date.now() - messageTime < 15 * 60 * 1000) && (item.message_type === "TEXT" || !item.media_url);

    Alert.alert(
      "Message Options",
      null,
      [
        { text: "Reply", onPress: () => setReplyMessage(item) },
        canEdit ? { text: "Edit", onPress: () => { setEditingMessage(item); setInputText(item.message); } } : null,
        { text: "Copy", onPress: () => { Clipboard.setString(item.message); Alert.alert("Copied", "Message copied to clipboard."); } },
        { text: "Delete", style: "destructive", onPress: () => triggerDeleteMessage(item) },
        { text: "Cancel", style: "cancel" }
      ].filter(Boolean)
    );
  };

  // WhatsApp Message Content Renderer
  const renderMessageContent = (item, isMe) => {
    if (item.is_deleted_everyone) {
      return (
        <View style={styles.deletedWrapper}>
          <Ionicons name="ban-outline" size={14} color="#8696A0" />
          <Text style={styles.deletedText}>This message was deleted</Text>
        </View>
      );
    }

    const resolvedType = resolveMessageType(item);
    const mediaUrl = resolveMediaUrl(item);

    switch (resolvedType) {
      case "IMAGE":
        return (
          <TouchableOpacity
            onPress={() => {
              if (mediaUrl) {
                setViewerImages([{ uri: mediaUrl }]);
                setViewerVisible(true);
              }
            }}
            onLongPress={() => handleBubbleLongPress(item)}
            activeOpacity={0.9}
            style={styles.imageBubbleContainer}
          >
            <Image
              source={{ uri: mediaUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400" }}
              style={styles.bubbleImage}
            />
            {item.message && !item.message.startsWith("[Photo") && !item.message.startsWith("http") && (
              <Text style={styles.imageCaptionText}>{item.message}</Text>
            )}
          </TouchableOpacity>
        );

      case "VIDEO":
        return (
          <TouchableOpacity
            onLongPress={() => handleBubbleLongPress(item)}
            activeOpacity={0.9}
            style={styles.videoPlaceholder}
            onPress={() => {
              if (mediaUrl) {
                navigation.navigate("VideoPlayer", { videoUrl: mediaUrl, title: "Chat Video" });
              }
            }}
          >
            <Image
              source={{ uri: mediaUrl || "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400" }}
              style={styles.bubbleImage}
            />
            <View style={styles.videoPlayOverlay}>
              <Ionicons name="play-circle" size={48} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        );

      case "PDF":
        const fileName = mediaUrl ? decodeURIComponent(mediaUrl.split("/").pop()) : "Document.pdf";
        return (
          <TouchableOpacity
            style={styles.pdfCard}
            onPress={() => mediaUrl && Linking.openURL(mediaUrl)}
            onLongPress={() => handleBubbleLongPress(item)}
          >
            <View style={styles.pdfIconBox}>
              <Ionicons name="document-text" size={26} color="#FFFFFF" />
            </View>
            <View style={styles.pdfDetails}>
              <Text style={styles.pdfName} numberOfLines={1}>{fileName}</Text>
              <Text style={styles.pdfSize}>Document • Tap to open</Text>
            </View>
          </TouchableOpacity>
        );

      case "VOICE":
        const isPlaying = playingAudioId === item.id;
        return (
          <TouchableOpacity
            onLongPress={() => handleBubbleLongPress(item)}
            activeOpacity={0.95}
            style={styles.voiceWrapper}
          >
            <View style={styles.voiceAvatarBox}>
              <Ionicons name="mic" size={16} color="#00A884" />
            </View>
            <TouchableOpacity
              style={styles.voicePlayBtn}
              onPress={() => mediaUrl && playAudio(item.id, mediaUrl)}
            >
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={20}
                color="#FFFFFF"
              />
            </TouchableOpacity>
            <View style={styles.voiceWaveform}>
              <View style={[styles.waveformBar, { height: 10 }]} />
              <View style={[styles.waveformBar, { height: 16 }]} />
              <View style={[styles.waveformBar, { height: 22 }]} />
              <View style={[styles.waveformBar, { height: 14 }]} />
              <View style={[styles.waveformBar, { height: 18 }]} />
              <View style={[styles.waveformBar, { height: 10 }]} />
              <View style={[styles.waveformBar, { height: 20 }]} />
              <Text style={styles.voiceDuration}>
                {item.media?.duration ? `${item.media.duration}s` : "0:15"}
              </Text>
            </View>
          </TouchableOpacity>
        );

      case "LOCATION":
        const coords = item.media?.waveform || {};
        const openMaps = () => {
          if (coords.latitude && coords.longitude) {
            Linking.openURL(`https://maps.google.com/?q=${coords.latitude},${coords.longitude}`);
          } else if (mediaUrl) {
            Linking.openURL(mediaUrl);
          }
        };
        return (
          <TouchableOpacity
            style={styles.locationCard}
            onPress={openMaps}
            onLongPress={() => handleBubbleLongPress(item)}
            activeOpacity={0.9}
          >
            <View style={styles.locationIconBox}>
              <Ionicons name="location" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.locationDetails}>
              <Text style={styles.locationTitle}>📍 Live Location</Text>
              <Text style={styles.locationSub}>Tap to view on Google Maps</Text>
            </View>
          </TouchableOpacity>
        );

      case "TEXT":
      default:
        return (
          <TouchableOpacity
            onLongPress={() => handleBubbleLongPress(item)}
            activeOpacity={0.9}
          >
            <Text style={styles.bubbleText}>
              {item.message || item.text || item.content}
            </Text>
          </TouchableOpacity>
        );
    }
  };

  // Group messages and compute date separators
  const messagesWithDates = useMemo(() => {
    const list = [];
    let lastDate = "";
    (messages || []).forEach((m) => {
      const msgDate = formatDateSeparator(m.createdAt || m.created_at || m.timestamp);
      if (msgDate && msgDate !== lastDate) {
        list.push({ id: `date_${msgDate}_${m.id}`, isDateSeparator: true, dateText: msgDate });
        lastDate = msgDate;
      }
      list.push(m);
    });
    return list;
  }, [messages]);

  const renderItem = ({ item }) => {
    if (item.isDateSeparator) {
      return (
        <View style={styles.dateSeparatorRow}>
          <View style={styles.dateSeparatorBadge}>
            <Text style={styles.dateSeparatorText}>{item.dateText}</Text>
          </View>
        </View>
      );
    }

    const isMe = Boolean(
      item.isMe ||
      (user?.id && Number(item.sender_id || item.senderId) === Number(user.id)) ||
      (receiverId && Number(item.sender_id || item.senderId) !== Number(receiverId))
    );

    const isRead = Boolean(item.is_read || item.isRead);
    const timeString = formatMessageTime(item.createdAt || item.created_at || item.timestamp);

    return (
      <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.otherMessageRow]}>
        <View style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]}>
          {/* Quoted Message Preview Header */}
          {item.parentMessage && (
            <View style={[styles.replyBubbleHeader, isMe ? styles.replyMyHeader : styles.replyOtherHeader]}>
              <Text style={styles.replyHeaderName}>{isMe ? "You" : receiverName || "Contact"}</Text>
              <Text style={styles.replyHeaderMsg} numberOfLines={1}>
                {item.parentMessage.message || "Attachment"}
              </Text>
            </View>
          )}

          {renderMessageContent(item, isMe)}

          {/* WhatsApp Bubble Timestamp & Ticks */}
          <View style={styles.bubbleFooter}>
            {item.is_edited && <Text style={styles.editedTextLabel}>edited </Text>}
            <Text style={styles.timeLabel}>{timeString}</Text>
            {isMe && (
              <View style={styles.tickContainer}>
                {item.isOfflinePending ? (
                  <Ionicons name="time-outline" size={13} color="#8696A0" />
                ) : isRead ? (
                  <Ionicons name="checkmark-done" size={16} color="#53BDEB" />
                ) : (
                  <Ionicons name="checkmark-done" size={16} color="#8696A0" />
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  const isOnline = onlineStatus[receiverId?.toString()] === "online";
  const userTyping = typingUsers[bookingId]?.has(receiverId);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={HEADER_RED} />

      {/* Top Header in Red as requested */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerProfileContainer}
          activeOpacity={0.8}
          onPress={() => {
            if (booking?.artist?.id || booking?.artist_id) {
              navigation.navigate("ArtistProfile", { artistId: booking?.artist?.id || booking?.artist_id });
            }
          }}
        >
          <View style={styles.avatarWrapper}>
            <Image
              source={{ uri: receiverImage || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120" }}
              style={styles.headerAvatar}
            />
            {isOnline && <View style={styles.onlineBadge} />}
          </View>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerName} numberOfLines={1}>
              {receiverName || "MehndiGo User"}
            </Text>
            <Text style={styles.headerStatus} numberOfLines={1}>
              {userTyping ? "typing..." : isOnline ? "Online" : "Booking #" + (booking?.booking_code || bookingId)}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => {
              const phone = booking?.artist?.user?.phone || booking?.user?.phone || "9999999999";
              Linking.openURL(`tel:${phone}`);
            }}
          >
            <Ionicons name="call" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => setModerationMenuVisible(true)}
          >
            <Ionicons name="ellipsis-vertical" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Pinned Booking Details Bar */}
      {booking && (
        <View style={styles.bookingPinBar}>
          <Ionicons name="shield-checkmark" size={15} color={HEADER_RED} />
          <Text style={styles.bookingPinText} numberOfLines={1}>
            Booking #{booking.booking_code || booking.id} • {booking.service?.specialization_name || "Mehndi Service"} • ₹{booking.final_amount || booking.total_amount}
          </Text>
        </View>
      )}

      {/* Chat Wallpaper Canvas */}
      <View style={styles.wallpaperContainer}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          {loading ? (
            <View style={styles.centerSpinner}>
              <ActivityIndicator size="large" color={HEADER_RED} />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messagesWithDates}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderItem}
              initialNumToRender={15}
              maxToRenderPerBatch={12}
              windowSize={9}
              removeClippedSubviews={true}
              contentContainerStyle={styles.listContent}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />
          )}

          {/* Media Upload Progress Bar */}
          {mediaUploading && (
            <View style={styles.uploadingBar}>
              <ActivityIndicator size="small" color={HEADER_RED} style={{ marginRight: 8 }} />
              <Text style={styles.uploadingText}>Sending attachment...</Text>
            </View>
          )}

          {/* Reply Banner */}
          {replyMessage && (
            <View style={styles.replyPreviewBar}>
              <View style={styles.replyLeftBar} />
              <View style={styles.replyPreviewDetails}>
                <Text style={styles.replyPreviewTitle}>
                  Replying to {replyMessage.senderName || "message"}
                </Text>
                <Text style={styles.replyPreviewContent} numberOfLines={1}>
                  {replyMessage.message || "Attachment"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setReplyMessage(null)} style={{ padding: 4 }}>
                <Ionicons name="close" size={20} color="#667781" />
              </TouchableOpacity>
            </View>
          )}

          {/* Edit Banner */}
          {editingMessage && (
            <View style={styles.replyPreviewBar}>
              <View style={[styles.replyLeftBar, { backgroundColor: HEADER_RED }]} />
              <View style={styles.replyPreviewDetails}>
                <Text style={[styles.replyPreviewTitle, { color: HEADER_RED }]}>Editing Message</Text>
                <Text style={styles.replyPreviewContent} numberOfLines={1}>
                  {editingMessage.message}
                </Text>
              </View>
              <TouchableOpacity onPress={() => { setEditingMessage(null); setInputText(""); }} style={{ padding: 4 }}>
                <Ionicons name="close" size={20} color="#667781" />
              </TouchableOpacity>
            </View>
          )}

          {/* WhatsApp Bottom Input Bar or Active Voice Recording Bar */}
          {["CANCELLED", "REJECTED"].includes(booking?.booking_status) || isChatExpired() ? (
            <View style={styles.closedChatBar}>
              <Ionicons name="lock-closed" size={16} color="#667781" style={{ marginRight: 8 }} />
              <Text style={styles.closedChatText}>
                {isChatExpired()
                  ? "This conversation is closed (active chat is preserved for 7 days post booking)."
                  : "This conversation is closed because the booking is cancelled."}
              </Text>
            </View>
          ) : isRecording ? (
            /* Active Voice Recording Controller Bar with Delete / Cancel and Send / Stop Buttons */
            <View style={[styles.recordingControllerBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
              {/* Delete / Cancel Button on Left */}
              <TouchableOpacity style={styles.recordingDiscardBtn} onPress={cancelRecording}>
                <Ionicons name="trash-outline" size={22} color="#EA0038" />
                <Text style={styles.discardLabel}>Cancel</Text>
              </TouchableOpacity>

              {/* Pulsing Red Dot + Duration Counter in Center */}
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingPulsingDot} />
                <Text style={styles.recordingLiveTimer}>
                  {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, "0")}
                </Text>
                <View style={styles.recordingWaveBars}>
                  <View style={[styles.recordingWaveBar, { height: 8 }]} />
                  <View style={[styles.recordingWaveBar, { height: 16 }]} />
                  <View style={[styles.recordingWaveBar, { height: 22 }]} />
                  <View style={[styles.recordingWaveBar, { height: 14 }]} />
                  <View style={[styles.recordingWaveBar, { height: 18 }]} />
                </View>
              </View>

              {/* Green Stop & Send Button on Right */}
              <TouchableOpacity style={styles.recordingSendBtn} onPress={stopRecordingAndSend}>
                <Ionicons name="send" size={20} color="#FFFFFF" style={{ marginLeft: 2 }} />
              </TouchableOpacity>
            </View>
          ) : (
            /* Normal Input Bar */
            <View>
              <View style={[styles.footerInputBar, { paddingBottom: emojiPickerVisible ? 4 : Math.max(insets.bottom, 10) }]}>
                {/* WhatsApp Capsule Box */}
                <View style={styles.inputCapsule}>
                  <TouchableOpacity
                    style={styles.emojiBtn}
                    onPress={() => {
                      Keyboard.dismiss();
                      setEmojiPickerVisible((prev) => !prev);
                    }}
                  >
                    <Ionicons
                      name={emojiPickerVisible ? "keypad-outline" : "happy-outline"}
                      size={24}
                      color={emojiPickerVisible ? HEADER_RED : "#8696A0"}
                    />
                  </TouchableOpacity>

                  <TextInput
                    placeholder="Message"
                    placeholderTextColor="#8696A0"
                    style={styles.chatInput}
                    value={inputText}
                    onChangeText={handleTextChange}
                    onFocus={() => setEmojiPickerVisible(false)}
                    multiline
                  />

                  <TouchableOpacity
                    style={styles.capsuleIconBtn}
                    onPress={() => {
                      setEmojiPickerVisible(false);
                      setAttachmentVisible(true);
                    }}
                  >
                    <Ionicons name="attach" size={24} color="#8696A0" style={{ transform: [{ rotate: "-45deg" }] }} />
                  </TouchableOpacity>

                  {inputText.trim().length === 0 && (
                    <TouchableOpacity
                      style={styles.capsuleIconBtn}
                      onPress={() => {
                        setEmojiPickerVisible(false);
                        handleCamera();
                      }}
                    >
                      <Ionicons name="camera" size={22} color="#8696A0" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Floating Action Button: Send if text typed, Mic if empty */}
                {inputText.trim().length > 0 || editingMessage ? (
                  <TouchableOpacity style={styles.floatingSendBtn} onPress={handleSend}>
                    <Ionicons name="send" size={20} color="#FFFFFF" style={{ marginLeft: 2 }} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.floatingSendBtn}
                    onPress={handleMicPress}
                    onLongPress={startRecording}
                    onPressOut={stopRecordingAndSend}
                  >
                    <Ionicons name="mic" size={22} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
              </View>

              {/* WhatsApp Style Emoji & Quick Response Drawer */}
              {emojiPickerVisible && (
                <View style={[styles.emojiDrawerContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                  {/* Quick Responses Carousel */}
                  <View style={styles.quickResponsesBar}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickResponsesScroll}>
                      {QUICK_RESPONSES.map((phrase, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={styles.quickResponseChip}
                          onPress={() => handleQuickResponseSelect(phrase)}
                        >
                          <Text style={styles.quickResponseText}>{phrase}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Emoji Categories Header Tabs */}
                  <View style={styles.emojiCategoryTabs}>
                    {EMOJI_CATEGORIES.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.emojiTabBtn, activeEmojiCategory === cat.id && styles.emojiTabBtnActive]}
                        onPress={() => setActiveEmojiCategory(cat.id)}
                      >
                        <Ionicons
                          name={cat.icon}
                          size={18}
                          color={activeEmojiCategory === cat.id ? HEADER_RED : "#8696A0"}
                        />
                        <Text style={[styles.emojiTabText, activeEmojiCategory === cat.id && styles.emojiTabTextActive]}>
                          {cat.title}
                        </Text>
                      </TouchableOpacity>
                    ))}

                    {/* Backspace Button */}
                    <TouchableOpacity style={styles.emojiBackspaceBtn} onPress={handleBackspaceEmoji}>
                      <Ionicons name="backspace-outline" size={22} color="#8696A0" />
                    </TouchableOpacity>
                  </View>

                  {/* Emoji Grid */}
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.emojiGridContent}
                  >
                    <View style={styles.emojiGrid}>
                      {(EMOJI_CATEGORIES.find((c) => c.id === activeEmojiCategory)?.emojis || []).map((em, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={styles.emojiGridCell}
                          onPress={() => handleEmojiSelect(em)}
                        >
                          <Text style={styles.emojiChar}>{em}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}
            </View>
          )}
        </KeyboardAvoidingView>
      </View>

      {/* WhatsApp Style Attachment Drawer Modal */}
      <Modal
        visible={attachmentVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAttachmentVisible(false)}
      >
        <TouchableOpacity
          style={styles.attachmentModalOverlay}
          activeOpacity={1}
          onPress={() => setAttachmentVisible(false)}
        >
          <View style={[styles.attachmentModalContent, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.attachmentGrid}>
              {/* Document */}
              <TouchableOpacity style={styles.attachmentGridItem} onPress={handleDocumentAttachment}>
                <View style={[styles.attachIconContainer, { backgroundColor: "#5F66CD" }]}>
                  <Ionicons name="document-text" size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.attachIconLabel}>Document</Text>
              </TouchableOpacity>

              {/* Camera */}
              <TouchableOpacity style={styles.attachmentGridItem} onPress={handleCamera}>
                <View style={[styles.attachIconContainer, { backgroundColor: "#D3396D" }]}>
                  <Ionicons name="camera" size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.attachIconLabel}>Camera</Text>
              </TouchableOpacity>

              {/* Gallery */}
              <TouchableOpacity style={styles.attachmentGridItem} onPress={handleGallery}>
                <View style={[styles.attachIconContainer, { backgroundColor: "#AC44CF" }]}>
                  <Ionicons name="images" size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.attachIconLabel}>Gallery</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.attachmentGrid}>
              {/* Audio / Video */}
              <TouchableOpacity style={styles.attachmentGridItem} onPress={handleVideoAttachment}>
                <View style={[styles.attachIconContainer, { backgroundColor: "#E07B39" }]}>
                  <Ionicons name="videocam" size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.attachIconLabel}>Video</Text>
              </TouchableOpacity>

              {/* Location */}
              <TouchableOpacity style={styles.attachmentGridItem} onPress={handleLocation}>
                <View style={[styles.attachIconContainer, { backgroundColor: "#1B9A59" }]}>
                  <Ionicons name="location" size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.attachIconLabel}>Location</Text>
              </TouchableOpacity>

              {/* Info / Contact */}
              <TouchableOpacity
                style={styles.attachmentGridItem}
                onPress={() => {
                  setAttachmentVisible(false);
                  if (booking?.artist?.id || booking?.artist_id) {
                    navigation.navigate("ArtistProfile", { artistId: booking?.artist?.id || booking?.artist_id });
                  }
                }}
              >
                <View style={[styles.attachIconContainer, { backgroundColor: "#009DE2" }]}>
                  <Ionicons name="person" size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.attachIconLabel}>Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Full Screen Image Viewer Modal */}
      <ImageView
        images={viewerImages}
        imageIndex={0}
        visible={viewerVisible}
        onRequestClose={() => setViewerVisible(false)}
      />

      {/* Moderation Dropdown Menu Sheet */}
      <Modal
        visible={moderationMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModerationMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setModerationMenuVisible(false)}
        >
          <View style={styles.menuContent}>
            <TouchableOpacity style={styles.menuItem} onPress={handleBlockUser}>
              <Ionicons name="ban-outline" size={18} color="#EA0038" />
              <Text style={[styles.menuItemText, { color: "#EA0038" }]}>Block User</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setModerationMenuVisible(false); setReportModalVisible(true); }}
            >
              <Ionicons name="alert-circle-outline" size={18} color="#111B21" />
              <Text style={styles.menuItemText}>Report User</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Report Modal */}
      <Modal
        visible={reportModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.reportModalBox}>
            <Text style={styles.reportTitle}>Report User</Text>
            <Text style={styles.reportSubtitle}>
              Please describe the issue. Our support team will investigate.
            </Text>
            <TextInput
              style={styles.reportInput}
              placeholder="Reason for report..."
              placeholderTextColor="#8696A0"
              value={reportReason}
              onChangeText={setReportReason}
              multiline
            />
            <View style={styles.reportModalActions}>
              <TouchableOpacity
                style={styles.reportBtnSecondary}
                onPress={() => { setReportModalVisible(false); setReportReason(""); }}
              >
                <Text style={styles.reportBtnTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.reportBtnPrimary, { backgroundColor: HEADER_RED }]}
                onPress={handleReportUserSubmit}
              >
                <Text style={styles.reportBtnTextPrimary}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: HEADER_RED
  },
  wallpaperContainer: {
    flex: 1,
    backgroundColor: "#EFEAE2"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: HEADER_RED
  },
  backBtn: {
    padding: 6
  },
  headerProfileContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 2
  },
  avatarWrapper: {
    position: "relative"
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E1F3FB"
  },
  onlineBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#25D366",
    borderWidth: 1.5,
    borderColor: HEADER_RED
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 10
  },
  headerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2
  },
  headerStatus: {
    fontSize: 12,
    color: "#FFEBEE",
    marginTop: 1
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center"
  },
  headerActionBtn: {
    padding: 8,
    marginLeft: 4
  },
  bookingPinBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 2
  },
  bookingPinText: {
    fontSize: 12,
    color: "#111B21",
    marginLeft: 8,
    fontWeight: "600"
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingBottom: 20
  },
  dateSeparatorRow: {
    alignItems: "center",
    marginVertical: 12
  },
  dateSeparatorBadge: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1
  },
  dateSeparatorText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#667781",
    letterSpacing: 0.5
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 6,
    width: "100%"
  },
  myMessageRow: {
    justifyContent: "flex-end"
  },
  otherMessageRow: {
    justifyContent: "flex-start"
  },
  bubble: {
    maxWidth: "82%",
    paddingHorizontal: 10,
    paddingTop: 7,
    paddingBottom: 6,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1
  },
  myBubble: {
    backgroundColor: "#D9FDD3",
    borderTopRightRadius: 2
  },
  otherBubble: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 2
  },
  bubbleText: {
    fontSize: 15,
    color: "#111B21",
    lineHeight: 20
  },
  bubbleFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 3,
    alignSelf: "flex-end"
  },
  editedTextLabel: {
    fontSize: 10,
    color: "#667781",
    fontStyle: "italic",
    marginRight: 4
  },
  timeLabel: {
    fontSize: 10,
    color: "#667781"
  },
  tickContainer: {
    marginLeft: 3
  },
  replyBubbleHeader: {
    borderLeftWidth: 4,
    paddingLeft: 8,
    marginBottom: 6,
    borderRadius: 4,
    paddingVertical: 4
  },
  replyMyHeader: {
    backgroundColor: "rgba(0,0,0,0.05)",
    borderLeftColor: "#00A884"
  },
  replyOtherHeader: {
    backgroundColor: "rgba(0,0,0,0.04)",
    borderLeftColor: "#027EB5"
  },
  replyHeaderName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#00A884"
  },
  replyHeaderMsg: {
    fontSize: 12,
    color: "#667781"
  },
  imageBubbleContainer: {
    borderRadius: 8,
    overflow: "hidden"
  },
  bubbleImage: {
    width: SCREEN_WIDTH * 0.65,
    height: SCREEN_WIDTH * 0.65,
    borderRadius: 8,
    resizeMode: "cover"
  },
  imageCaptionText: {
    fontSize: 14,
    color: "#111B21",
    marginTop: 6,
    lineHeight: 18
  },
  videoPlaceholder: {
    width: SCREEN_WIDTH * 0.65,
    height: SCREEN_WIDTH * 0.65,
    borderRadius: 8,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center"
  },
  videoPlayOverlay: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    width: "100%",
    height: "100%"
  },
  pdfCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.04)",
    padding: 10,
    borderRadius: 8,
    width: SCREEN_WIDTH * 0.65
  },
  pdfIconBox: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: "#5F66CD",
    justifyContent: "center",
    alignItems: "center"
  },
  pdfDetails: {
    marginLeft: 10,
    flex: 1
  },
  pdfName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111B21"
  },
  pdfSize: {
    fontSize: 11,
    color: "#667781",
    marginTop: 2
  },
  voiceWrapper: {
    flexDirection: "row",
    alignItems: "center",
    width: SCREEN_WIDTH * 0.65,
    paddingVertical: 4
  },
  voiceAvatarBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,168,132,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8
  },
  voicePlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#00A884",
    justifyContent: "center",
    alignItems: "center"
  },
  voiceWaveform: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10
  },
  waveformBar: {
    width: 3,
    backgroundColor: "#00A884",
    borderRadius: 2,
    marginRight: 3
  },
  voiceDuration: {
    fontSize: 11,
    color: "#667781",
    marginLeft: 8
  },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.04)",
    padding: 10,
    borderRadius: 8,
    width: SCREEN_WIDTH * 0.65
  },
  locationIconBox: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: "#1B9A59",
    justifyContent: "center",
    alignItems: "center"
  },
  locationDetails: {
    marginLeft: 10,
    flex: 1
  },
  locationTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111B21"
  },
  locationSub: {
    fontSize: 11,
    color: "#667781",
    marginTop: 2
  },
  deletedWrapper: {
    flexDirection: "row",
    alignItems: "center"
  },
  deletedText: {
    fontSize: 13,
    fontStyle: "italic",
    color: "#8696A0",
    marginLeft: 6
  },
  centerSpinner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  uploadingBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
    justifyContent: "center"
  },
  uploadingText: {
    fontSize: 12,
    color: "#667781"
  },
  replyPreviewBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F2F5",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)"
  },
  replyLeftBar: {
    width: 4,
    height: "100%",
    backgroundColor: HEADER_RED,
    borderRadius: 2,
    marginRight: 8
  },
  replyPreviewDetails: {
    flex: 1
  },
  replyPreviewTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: HEADER_RED
  },
  replyPreviewContent: {
    fontSize: 12,
    color: "#667781"
  },
  footerInputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 6,
    paddingVertical: 6,
    backgroundColor: "#EFEAE2"
  },
  inputCapsule: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 10,
    minHeight: 46,
    maxHeight: 120,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2
  },
  emojiBtn: {
    padding: 6
  },
  chatInput: {
    flex: 1,
    fontSize: 15,
    color: "#111B21",
    paddingHorizontal: 6,
    paddingVertical: 8
  },
  capsuleIconBtn: {
    padding: 6
  },
  floatingSendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: HEADER_RED,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3
  },
  recordingControllerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 4
  },
  recordingDiscardBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#FEE2E2",
    borderRadius: 20
  },
  discardLabel: {
    color: "#EA0038",
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 4
  },
  recordingIndicator: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8
  },
  recordingPulsingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EA0038",
    marginRight: 6
  },
  recordingLiveTimer: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111B21",
    marginRight: 8
  },
  recordingWaveBars: {
    flexDirection: "row",
    alignItems: "center"
  },
  recordingWaveBar: {
    width: 3,
    backgroundColor: "#EA0038",
    borderRadius: 2,
    marginRight: 2
  },
  recordingSendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#00A884",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3
  },
  attachmentModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end"
  },
  attachmentModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20
  },
  attachmentGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 10
  },
  attachmentGridItem: {
    alignItems: "center",
    width: 70
  },
  attachIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3
  },
  attachIconLabel: {
    fontSize: 12,
    color: "#667781",
    fontWeight: "500"
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.1)",
    justifyContent: "flex-start",
    alignItems: "flex-end"
  },
  menuContent: {
    marginTop: 54,
    marginRight: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 6,
    elevation: 6,
    width: 150,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10
  },
  menuItemText: {
    fontSize: 14,
    color: "#111B21",
    marginLeft: 8,
    fontWeight: "500"
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#E9EDEF",
    marginVertical: 2
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },
  reportModalBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "100%"
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111B21",
    marginBottom: 6
  },
  reportSubtitle: {
    fontSize: 13,
    color: "#667781",
    marginBottom: 14,
    lineHeight: 18
  },
  reportInput: {
    height: 90,
    backgroundColor: "#F0F2F5",
    borderRadius: 10,
    padding: 12,
    textAlignVertical: "top",
    color: "#111B21"
  },
  reportModalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16
  },
  reportBtnSecondary: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8
  },
  reportBtnTextSecondary: {
    color: "#667781",
    fontWeight: "600"
  },
  reportBtnPrimary: {
    backgroundColor: HEADER_RED,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 18
  },
  reportBtnTextPrimary: {
    color: "#FFFFFF",
    fontWeight: "700"
  },
  closedChatBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F0F2F5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center"
  },
  closedChatText: {
    fontSize: 12,
    color: "#667781",
    textAlign: "center",
    flex: 1,
    lineHeight: 16
  },
  emojiDrawerContainer: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E9EDEF",
    height: 250
  },
  quickResponsesBar: {
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F5",
    paddingVertical: 8
  },
  quickResponsesScroll: {
    paddingHorizontal: 12,
    gap: 8
  },
  quickResponseChip: {
    backgroundColor: "#F0F2F5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  quickResponseText: {
    fontSize: 12,
    color: "#111B21",
    fontWeight: "500"
  },
  emojiCategoryTabs: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F5"
  },
  emojiTabBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginRight: 6
  },
  emojiTabBtnActive: {
    backgroundColor: "#FFEBEE"
  },
  emojiTabText: {
    fontSize: 12,
    color: "#8696A0",
    marginLeft: 4,
    fontWeight: "600"
  },
  emojiTabTextActive: {
    color: HEADER_RED,
    fontWeight: "700"
  },
  emojiBackspaceBtn: {
    marginLeft: "auto",
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#F0F2F5"
  },
  emojiGridContent: {
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  emojiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start"
  },
  emojiGridCell: {
    width: "12.5%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 4
  },
  emojiChar: {
    fontSize: 26
  }
});
