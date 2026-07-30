import React, { useEffect, useState, useRef, useCallback } from "react";
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
  Linking
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import ImageView from "react-native-image-viewing";

import Colors from "../../constants/Colors";

import { useAudioRecorder, createAudioPlayer, AudioModule, RecordingPresets, setAudioModeAsync } from "expo-audio";
import { useSocket } from "../../context/SocketContext";
import {
  getChatHistory,
  deleteMessage,
  editMessage,
  uploadChatMedia,
  blockUser,
  reportUser
} from "../../services/chat";
import { getBookingDetails } from "../../services/booking";

export default function ChatRoomScreen({ route, navigation }) {
  const { bookingId, receiverId, receiverName, receiverImage } = route.params || {};

  const {
    connected,
    typingUsers,
    onlineStatus,
    lastSeen,
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

  useEffect(() => {
    async function checkVoiceSupport() {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true
        });
        setIsVoiceSupported(true);
      } catch (err) {
        console.log("Native Audio recording is not supported in this environment:", err.message);
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

  const loadHistoryAndDetails = useCallback(async () => {
    try {
      const history = await getChatHistory(bookingId);
      if (history) {
        setMessages(history);
      }
      
      // Load Booking details for Card
      const bDetails = await getBookingDetails(bookingId);
      setBooking(bDetails);
    } catch (e) {
      console.log("Error loading history/booking details:", e.message);
    } finally {
      setLoading(false);
    }
  }, [bookingId, setMessages]);

  const isChatExpired = useCallback(() => {
    if (booking?.detailed_status === "COMPLETED_CLOSED" || booking?.review_skipped) {
      return true;
    }
    if (booking?.booking_status === "COMPLETED") {
      const completionTime = new Date(booking.updatedAt || booking.createdAt).getTime();
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
    const timer = setTimeout(() => {
      loadHistoryAndDetails();
    }, 0);

    return () => {
      clearTimeout(timer);
      leaveRoom(bookingId);
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, [bookingId, joinRoom, leaveRoom, loadHistoryAndDetails]);

  // Handle message send
  const handleSend = () => {
    if (!inputText.trim()) return;

    if (editingMessage) {
      // Edit mode
      editMessage(editingMessage.id, inputText.trim())
        .then(() => {
          setEditingMessage(null);
          setInputText("");
        })
        .catch((e) => Alert.alert("Error", e.message));
    } else {
      // Send regular message (or reply)
      sendChatMessage(
        bookingId,
        inputText.trim(),
        "TEXT",
        replyMessage ? replyMessage.id : null
      );
      setReplyMessage(null);
      setInputText("");
    }
  };

  // Keyboard typing indicator helper
  const handleTextChange = (text) => {
    setInputText(text);

    // Socket typing broadcast
    emitTyping(bookingId, true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emitTyping(bookingId, false);
    }, 2000);
  };

  // 1. Camera Capture
  const handleCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Access Denied", "Camera permission is required.");
      return;
    }

    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.6
    });

    if (!res.canceled && res.assets?.[0]) {
      uploadMediaAttachment(res.assets[0].uri, "image");
    }
    setAttachmentVisible(false);
  };

  // 2. Gallery Pick
  const handleGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Access Denied", "Gallery permission is required.");
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: true,
      quality: 0.6
    });

    if (!res.canceled && res.assets?.[0]) {
      const isVideo = res.assets[0].type === "video";
      uploadMediaAttachment(res.assets[0].uri, isVideo ? "video" : "image");
    }
    setAttachmentVisible(false);
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
      quality: 0.6
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
      console.log("Document picker error:", err.message);
      Alert.alert("Notice", "Documents picker is not available in the current environment.");
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

      // Check if GPS is enabled
      const gpsEnabled = await Location.hasServicesEnabledAsync();
      if (!gpsEnabled) {
        try {
          if (Platform.OS === "android") {
            await Location.enableNetworkProviderAsync();
          } else {
            Alert.alert(
              "GPS Disabled",
              "Please enable Location Services/GPS in your device settings.",
              [
                { text: "Settings", onPress: () => Linking.openURL("app-settings:") },
                { text: "Cancel" }
              ]
            );
            return;
          }
        } catch (gpsError) {
          Alert.alert(
            "GPS Required",
            "Please enable Location Services/GPS in your device settings to continue.",
            [
              { text: "Settings", onPress: () => Linking.openURL("app-settings:") },
              { text: "Cancel" }
            ]
          );
          return;
        }
      }

      setMediaUploading(true);
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      
      // Share location coordinate payload
      sendChatMessage(bookingId, `📍 Shared Location`, "LOCATION", null, {
        file_url: `https://maps.google.com/?q=${loc.coords.latitude},${loc.coords.longitude}`,
        file_type: "location",
        waveform: { latitude: loc.coords.latitude, longitude: loc.coords.longitude }
      });
    } catch (e) {
      Alert.alert("Error", "Could not fetch current coordinates. Please make sure location services are enabled.");
    } finally {
      setMediaUploading(false);
    }
  };

  // Media upload to backend -> Cloudinary -> Socket emit
  const uploadMediaAttachment = async (uri, type) => {
    setMediaUploading(true);
    try {
      const res = await uploadChatMedia(uri, type);
      sendChatMessage(bookingId, `📎 Sent ${type}`, type.toUpperCase(), null, {
        file_url: res.file_url,
        file_type: type,
        file_size: res.file_size
      });
    } catch (e) {
      Alert.alert("Upload Error", e.message || "Failed to upload file attachment.");
    } finally {
      setMediaUploading(false);
    }
  };

  // 4. Voice Recording Operations
  const startRecording = async () => {
    if (!isVoiceSupported) {
      Alert.alert("Notice", "Voice messages aren't available in the current app environment.");
      return;
    }
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission Denied", "Audio recording permission required.");
        return;
      }

      await setAudioModeAsync({
        playsInSilentMode: true
      });

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();

      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimer.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      Alert.alert("Error", "Could not start audio recorder.");
    }
  };

  const stopRecordingAndSend = async () => {
    if (!audioRecorder.isRecording) return;

    setIsRecording(false);
    clearInterval(recordingTimer.current);

    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;

      if (uri) {
        setMediaUploading(true);
        const res = await uploadChatMedia(uri, "voice");
        sendChatMessage(bookingId, `🎵 Voice Note`, "VOICE", null, {
          file_url: res.file_url,
          file_type: "voice",
          duration: recordingDuration
        });
      }
    } catch (e) {
      Alert.alert("Audio Error", "Failed to process voice note.");
    } finally {
      setMediaUploading(false);
    }
  };

  const cancelRecording = async () => {
    if (!audioRecorder.isRecording) return;
    setIsRecording(false);
    clearInterval(recordingTimer.current);
    try {
      await audioRecorder.stop();
    } catch (e) {}
  };

  const handleMicPress = () => {
    if (!isVoiceSupported) {
      Alert.alert("Notice", "Voice messages aren't available in the current app environment.");
      return;
    }
    Alert.alert("How to Record", "Hold (long press) the microphone button to record. Release to send your voice note.");
  };

  // Play voice note playback
  const playAudio = async (messageId, url) => {
    try {
      if (playingAudioId === messageId) {
        // Pause
        if (soundRef.current) {
          soundRef.current.pause();
          setPlayingAudioId(null);
        }
        return;
      }

      // Release active player
      if (soundRef.current) {
        soundRef.current.release();
        soundRef.current = null;
      }

      const player = createAudioPlayer(url);
      soundRef.current = player;
      setPlayingAudioId(messageId);

      const subscription = player.addListener("playbackStatusUpdate", (status) => {
        if (status.didJustFinish) {
          setPlayingAudioId(null);
          subscription.remove();
          player.release();
          if (soundRef.current === player) {
            soundRef.current = null;
          }
        }
      });

      player.play();
    } catch (e) {
      Alert.alert("Error", "Playback failed.");
    }
  };

  // Star / Block / Moderation
  const handleBlockUser = async () => {
    setModerationMenuVisible(false);
    Alert.alert("Block User", "Are you sure you want to block/unblock this user?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: async () => {
          try {
            await blockUser(receiverId);
            Alert.alert("Done", "Preference updated successfully.");
            navigation.goBack();
          } catch (e) {
            Alert.alert("Error", e.message);
          }
        }
      }
    ]);
  };

  const handleReportUserSubmit = async () => {
    if (!reportReason.trim()) {
      Alert.alert("Error", "Please explain the reason for the moderation report.");
      return;
    }

    try {
      await reportUser(bookingId, receiverId, reportReason.trim());
      setReportModalVisible(false);
      setReportReason("");
      Alert.alert("Report Filed", "Our administrators will review this chat session within 24 hours.");
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  // Delete message popup
  const triggerDeleteMessage = (item) => {
    const isMe = item.sender_id === useSocket.user?.id; // Check using local storage check
    const options = [
      { text: "Delete For Me", onPress: () => deleteMessage(item.id, "me").then(() => loadHistoryAndDetails()) }
    ];

    const messageTime = new Date(item.createdAt).getTime();
    if (item.sender_id === receiverId) {
      // Received message
    } else {
      // Sent by me, can delete for everyone if under 15m
      if (getNow() - messageTime < 15 * 60 * 1000) {
        options.push({
          text: "Delete For Everyone",
          style: "destructive",
          onPress: () => deleteMessage(item.id, "everyone")
        });
      }
    }

    options.push({ text: "Cancel", style: "cancel" });

    Alert.alert("Delete Message", "Do you want to delete this message?", options);
  };

  // Open Message Actions options sheet
  const handleBubbleLongPress = (item) => {
    const isMe = item.sender_id !== receiverId;
    const messageTime = new Date(item.createdAt).getTime();
    const canEdit = isMe && (getNow() - messageTime < 15 * 60 * 1000) && item.message_type === "TEXT";

    Alert.alert(
      "Message Options",
      null,
      [
        { text: "Reply", onPress: () => setReplyMessage(item) },
        canEdit ? { text: "Edit", onPress: () => { setEditingMessage(item); setInputText(item.message); } } : null,
        { text: "Copy Text", onPress: () => { Clipboard.setString(item.message); } },
        { text: "Delete", style: "destructive", onPress: () => triggerDeleteMessage(item) },
        { text: "Cancel", style: "cancel" }
      ].filter(Boolean)
    );
  };

  // Renders chat bubble attachments
  const renderMessageContent = (item) => {
    if (item.is_deleted_everyone) {
      return (
        <View style={styles.deletedWrapper}>
          <Ionicons name="ban-outline" size={14} color={Colors.textTertiary} />
          <Text style={styles.deletedText}>This message was deleted</Text>
        </View>
      );
    }

    let resolvedType = item.message_type;
    const isMediaUrl = item.message && (item.message.includes("cloudinary") || item.message.startsWith("http"));
    if (resolvedType === "TEXT" && isMediaUrl) {
      if (item.message.match(/\.(jpg|jpeg|png|webp|gif)/i)) {
        resolvedType = "IMAGE";
        if (!item.media) {
          item.media = { file_url: item.message, fileUrl: item.message, file_type: "image", fileType: "image" };
        }
      } else if (item.message.match(/\.(mp4|mov|avi|mkv)/i)) {
        resolvedType = "VIDEO";
        if (!item.media) {
          item.media = { file_url: item.message, fileUrl: item.message, file_type: "video", fileType: "video" };
        }
      } else if (item.message.match(/\.(mp3|wav|m4a|aac|ogg)/i) || item.message.includes("voice")) {
        resolvedType = "VOICE";
        if (!item.media) {
          item.media = { file_url: item.message, fileUrl: item.message, file_type: "voice", fileType: "voice" };
        }
      } else if (item.message.includes("maps.google.com") || item.message.includes("google.com/maps")) {
        resolvedType = "LOCATION";
        if (!item.media) {
          item.media = { file_url: item.message, fileUrl: item.message, file_type: "location", fileType: "location" };
        }
      }
    }

    switch (resolvedType) {
      case "IMAGE":
        const imageUrl = item.media?.file_url || item.media?.fileUrl;
        return (
          <TouchableOpacity
            onPress={() => {
              setViewerImages([{ uri: imageUrl }]);
              setViewerVisible(true);
            }}
            onLongPress={() => handleBubbleLongPress(item)}
            activeOpacity={0.9}
          >
            <Image source={{ uri: imageUrl }} style={styles.bubbleImage} />
          </TouchableOpacity>
        );

      case "VIDEO":
        const videoUrl = item.media?.file_url || item.media?.fileUrl;
        return (
          <TouchableOpacity
            onLongPress={() => handleBubbleLongPress(item)}
            activeOpacity={0.9}
            style={styles.videoPlaceholder}
          >
            <Image
              source={{ uri: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=300" }}
              style={styles.bubbleImage}
            />
            <TouchableOpacity
              style={styles.videoPlayBtn}
              onPress={() => {
                navigation.navigate("VideoPlayer", {
                  videoUrl,
                  title: "Chat Video"
                });
              }}
            >
              <Ionicons name="play-circle" size={48} color={Colors.white} />
            </TouchableOpacity>
          </TouchableOpacity>
        );

      case "PDF":
        const pdfUrl = item.media?.file_url || item.media?.fileUrl;
        const fileSize = item.media?.file_size || item.media?.fileSize;
        const getFileName = (url) => {
          if (!url) return "Document";
          try {
            const parts = url.split("/");
            const name = parts[parts.length - 1];
            return decodeURIComponent(name);
          } catch {
            return "Document";
          }
        };
        const fileName = getFileName(pdfUrl);
        return (
          <TouchableOpacity
            style={styles.pdfCard}
            onPress={() => Linking.openURL(pdfUrl)}
            onLongPress={() => handleBubbleLongPress(item)}
          >
            <Ionicons name="document-text" size={32} color={Colors.primary} />
            <View style={styles.pdfDetails}>
              <Text style={styles.pdfName} numberOfLines={1}>
                {fileName}
              </Text>
              <Text style={styles.pdfSize}>
                {fileSize ? `${Math.round(fileSize / 1024)} KB` : "Document"}
              </Text>
            </View>
          </TouchableOpacity>
        );

      case "VOICE":
        const voiceUrl = item.media?.file_url || item.media?.fileUrl;
        const isPlaying = playingAudioId === item.id;
        return (
          <TouchableOpacity
            onLongPress={() => handleBubbleLongPress(item)}
            activeOpacity={0.95}
            style={styles.voiceWrapper}
          >
            <TouchableOpacity onPress={() => playAudio(item.id, voiceUrl)}>
              <Ionicons
                name={isPlaying ? "pause-circle" : "play-circle"}
                size={36}
                color={Colors.primary}
              />
            </TouchableOpacity>
            <View style={styles.voiceWaveform}>
              <View style={styles.waveformDummyBar} />
              <View style={[styles.waveformDummyBar, { height: 18 }]} />
              <View style={[styles.waveformDummyBar, { height: 24 }]} />
              <View style={[styles.waveformDummyBar, { height: 12 }]} />
              <View style={[styles.waveformDummyBar, { height: 16 }]} />
              <Text style={styles.voiceDuration}>
                {item.media?.duration ? `${item.media.duration}s` : "0:00"}
              </Text>
            </View>
          </TouchableOpacity>
        );

      case "LOCATION":
        const locationUrl = item.media?.file_url || item.media?.fileUrl;
        let coords = null;
        if (item.media?.waveform) {
          try {
            if (typeof item.media.waveform === "object") {
              coords = item.media.waveform;
            } else {
              let parsed = JSON.parse(item.media.waveform);
              if (typeof parsed === "string") {
                parsed = JSON.parse(parsed);
              }
              coords = parsed;
            }
          } catch (e) {
            console.warn("Failed to parse coordinates waveform:", e);
          }
        }

        const handleOpenMap = async () => {
          if (coords && coords.latitude && coords.longitude) {
            try {
              const { status } = await Location.requestForegroundPermissionsAsync();
              if (status !== "granted") {
                Alert.alert("Permission Required", "GPS permission is required to navigate.");
                return;
              }

              const provider = await Location.getProviderStatusAsync();
              if (!provider.gpsEnabled) {
                Alert.alert(
                  "GPS Disabled",
                  "Please turn on GPS/Location services in your settings to navigate.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Settings",
                      onPress: async () => {
                        const { Linking, Platform } = require("react-native");
                        if (Platform.OS === "android") {
                          await Location.enableNetworkProviderAsync().catch(() => {});
                        } else {
                          Linking.openSettings();
                        }
                      }
                    }
                  ]
                );
                return;
              }

              const url = Platform.select({
                ios: `maps://app?daddr=${coords.latitude},${coords.longitude}`,
                android: `google.navigation:q=${coords.latitude},${coords.longitude}`
              });
              Linking.openURL(url).catch(() => {
                Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${coords.latitude},${coords.longitude}`);
              });
            } catch (err) {
              console.warn("Navigation failed:", err.message);
              Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${coords.latitude},${coords.longitude}`);
            }
          } else if (locationUrl) {
            Linking.openURL(locationUrl);
          }
        };

        return (
          <TouchableOpacity
            style={styles.locationCard}
            onPress={handleOpenMap}
            onLongPress={() => handleBubbleLongPress(item)}
            activeOpacity={0.9}
          >
            <Ionicons name="map-outline" size={24} color={Colors.primary} />
            <View style={styles.locationDetails}>
              <Text style={styles.locationTitle}>📍 Shared Location</Text>
              <Text style={styles.locationSub}>
                {coords && coords.latitude && coords.longitude
                  ? `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)} (Tap to Navigate)`
                  : "View on Map"}
              </Text>
            </View>
          </TouchableOpacity>
        );

      case "BOOKING_CARD":
      default:
        return (
          <TouchableOpacity
            onLongPress={() => handleBubbleLongPress(item)}
            activeOpacity={0.9}
          >
            <Text style={styles.bubbleText}>
              {item.message}
            </Text>
          </TouchableOpacity>
        );
    }
  };

  const renderItem = ({ item }) => {
    const isMe = item.sender_id !== receiverId;

    return (
      <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.otherMessageRow]}>
        {!isMe && (
          <Image
            source={{ uri: receiverImage || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50" }}
            style={styles.bubbleAvatar}
          />
        )}

        <View style={styles.bubbleContainer}>
          <View
            style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]}
          >
            {/* Reply Header indicator inside bubble */}
            {item.parentMessage && (
              <View style={styles.replyBubbleHeader}>
                <Text style={styles.replyHeaderName}>Replying to message</Text>
                <Text style={styles.replyHeaderMsg} numberOfLines={1}>
                  {item.parentMessage.message}
                </Text>
              </View>
            )}

            {renderMessageContent(item)}

            {/* Bubble Footer Details */}
            <View style={styles.bubbleFooter}>
              {item.is_edited && <Text style={styles.editedTextLabel}>Edited </Text>}
              <Text style={styles.timeLabel}>
                {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
              {isMe && (
                <Ionicons
                  name={item.isOfflinePending ? "time-outline" : "checkmark-done"}
                  size={14}
                  color={item.is_read ? Colors.primary : Colors.textTertiary}
                  style={styles.tickIcon}
                />
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  const isOnline = onlineStatus[receiverId?.toString()] === "online";
  const userTyping = typingUsers[bookingId]?.has(receiverId);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        <Image
          source={{ uri: receiverImage || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100" }}
          style={styles.headerAvatar}
        />

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerName} numberOfLines={1}>
            {receiverName}
          </Text>
          <Text style={styles.headerStatus}>
            {userTyping ? "typing..." : isOnline ? "Online" : "Offline"}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => Linking.openURL(`tel:${booking?.artist?.user?.phone || booking?.user?.phone || "9999999999"}`)}
          >
            <Ionicons name="call-outline" size={20} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => setModerationMenuVisible(true)}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Booking card helper top pin */}
      {booking && (
        <View style={styles.bookingPinBar}>
          <Ionicons name="calendar" size={16} color={Colors.primary} />
          <Text style={styles.bookingPinText} numberOfLines={1}>
            Booking #{booking.booking_code} • {booking.service?.specialization_name} • ₹{booking.final_amount}
          </Text>
        </View>
      )}

      {/* Messages Board */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : null}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        {loading ? (
          <View style={styles.centerSpinner}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            initialNumToRender={12}
            maxToRenderPerBatch={10}
            windowSize={7}
            removeClippedSubviews={true}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        {/* Dynamic Media Attachment Indicator */}
        {mediaUploading && (
          <View style={styles.uploadingBar}>
            <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.uploadingText}>Uploading media files...</Text>
          </View>
        )}

        {/* Reply Preview Bar */}
        {replyMessage && (
          <View style={styles.replyPreviewBar}>
            <View style={styles.replyPreviewDetails}>
              <Text style={styles.replyPreviewTitle}>Replying to message</Text>
              <Text style={styles.replyPreviewContent} numberOfLines={1}>
                {replyMessage.message}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyMessage(null)}>
              <Ionicons name="close-circle" size={20} color={Colors.textTertiary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Edit Preview Bar */}
        {editingMessage && (
          <View style={styles.replyPreviewBar}>
            <View style={styles.replyPreviewDetails}>
              <Text style={[styles.replyPreviewTitle, { color: Colors.success }]}>Editing message</Text>
              <Text style={styles.replyPreviewContent} numberOfLines={1}>
                {editingMessage.message}
              </Text>
            </View>
            <TouchableOpacity onPress={() => { setEditingMessage(null); setInputText(""); }}>
              <Ionicons name="close-circle" size={20} color={Colors.textTertiary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Footer Text Inputs panel */}
        {["CANCELLED", "REJECTED"].includes(booking?.booking_status) || isChatExpired() ? (
          <View style={styles.closedChatBar}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.textSecondary || "#6B7280"} style={{ marginRight: 8 }} />
            <Text style={styles.closedChatText}>
              {booking?.detailed_status === "COMPLETED_CLOSED" || booking?.review_skipped
                ? "This chat is now closed and read-only since the booking review lifecycle is completed."
                : isChatExpired()
                  ? "This chat has been archived (active chat is only available for 7 days post completion)."
                  : "This chat is closed because the booking is cancelled or rejected."}
            </Text>
          </View>
        ) : (
          <View style={styles.footerInputBar}>
            <TouchableOpacity
              style={styles.attachBtn}
              onPress={() => setAttachmentVisible(true)}
            >
              <Ionicons name="add-circle" size={28} color={Colors.primary} />
            </TouchableOpacity>

            <TextInput
              placeholder="Type your message here..."
              placeholderTextColor={Colors.placeholder}
              style={styles.chatInput}
              value={inputText}
              onChangeText={handleTextChange}
              multiline
            />

            {inputText.trim().length > 0 || editingMessage ? (
              <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
                <Ionicons name="send" size={20} color={Colors.white} />
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {isRecording && (
          <View style={styles.recordingOverlayBar}>
            <Ionicons name="radio-button-on" size={16} color={Colors.error} style={styles.blinkDot} />
            <Text style={styles.recordingText}>Recording voice: {recordingDuration}s</Text>
            <TouchableOpacity onPress={cancelRecording} style={styles.recordingCancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Attachment Drawer Modal */}
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
          <View style={styles.attachmentModalContent}>
            <Text style={styles.attachmentTitle}>Share Attachments</Text>
            
            <View style={styles.attachmentGrid}>
              {/* Camera */}
              <TouchableOpacity style={styles.attachmentGridItem} onPress={handleCamera}>
                <View style={[styles.attachIconContainer, { backgroundColor: "#FF4D6D" }]}>
                  <Ionicons name="camera" size={24} color={Colors.white} />
                </View>
                <Text style={styles.attachIconLabel}>Camera</Text>
              </TouchableOpacity>

              {/* Gallery */}
              <TouchableOpacity style={styles.attachmentGridItem} onPress={handleGallery}>
                <View style={[styles.attachIconContainer, { backgroundColor: "#9F7AEA" }]}>
                  <Ionicons name="images" size={24} color={Colors.white} />
                </View>
                <Text style={styles.attachIconLabel}>Gallery</Text>
              </TouchableOpacity>

              {/* Video */}
              <TouchableOpacity style={styles.attachmentGridItem} onPress={handleVideoAttachment}>
                <View style={[styles.attachIconContainer, { backgroundColor: "#ED8936" }]}>
                  <Ionicons name="videocam" size={24} color={Colors.white} />
                </View>
                <Text style={styles.attachIconLabel}>Video</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.attachmentGrid}>
              {/* Location */}
              <TouchableOpacity style={styles.attachmentGridItem} onPress={handleLocation}>
                <View style={[styles.attachIconContainer, { backgroundColor: "#48BB78" }]}>
                  <Ionicons name="location" size={24} color={Colors.white} />
                </View>
                <Text style={styles.attachIconLabel}>Location</Text>
              </TouchableOpacity>

              {/* Voice and Document options commented out for now
              <TouchableOpacity style={styles.attachmentGridItem} onPress={() => { setAttachmentVisible(false); handleMicPress(); }}>
                <View style={[styles.attachIconContainer, { backgroundColor: "#319795" }]}>
                  <Ionicons name="mic" size={24} color={Colors.white} />
                </View>
                <Text style={styles.attachIconLabel}>Voice</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.attachmentGridItem} onPress={handleDocumentAttachment}>
                <View style={[styles.attachIconContainer, { backgroundColor: "#D69E2E" }]}>
                  <Ionicons name="document-text" size={24} color={Colors.white} />
                </View>
                <Text style={styles.attachIconLabel}>Document</Text>
              </TouchableOpacity>
              */}
            </View>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setAttachmentVisible(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Full Screen Image Viewer */}
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
              <Ionicons name="ban-outline" size={18} color={Colors.error} />
              <Text style={[styles.menuItemText, { color: Colors.error }]}>Block User</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setModerationMenuVisible(false); setReportModalVisible(true); }}
            >
              <Ionicons name="alert-circle-outline" size={18} color={Colors.text} />
              <Text style={styles.menuItemText}>Report Abuse</Text>
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
        <View style={styles.modalContainer}>
          <View style={styles.reportModalBox}>
            <Text style={styles.reportTitle}>File Abuse Report</Text>
            <Text style={styles.reportSubtitle}>
              Please explain the details of the concern regarding {receiverName}. Our safety agents will review the transcript history logs.
            </Text>
            <TextInput
              style={styles.reportInput}
              placeholder="Provide reason detail here..."
              placeholderTextColor={Colors.placeholder}
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
                style={styles.reportBtnPrimary}
                onPress={handleReportUserSubmit}
              >
                <Text style={styles.reportBtnTextPrimary}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border
  },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, marginHorizontal: 8 },
  headerTitleContainer: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: "700", color: Colors.text },
  headerStatus: { fontSize: 11, color: Colors.textSecondary },
  headerActions: { flexDirection: "row", alignItems: "center" },
  headerActionBtn: { padding: 6, marginLeft: 8 },
  bookingPinBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 6
  },
  bookingPinText: { fontSize: 11, color: Colors.text, marginLeft: 8, fontWeight: "600" },
  listContent: { paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 24 },
  messageRow: { flexDirection: "row", marginBottom: 14, alignItems: "flex-end" },
  myMessageRow: { justifyContent: "flex-end" },
  otherMessageRow: { justifyContent: "flex-start" },
  bubbleAvatar: { width: 28, height: 28, borderRadius: 14, marginRight: 8 },
  bubbleContainer: { maxWidth: "80%" },
  bubble: {
    padding: 12,
    borderRadius: 18,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1
  },
  myBubble: {
    backgroundColor: Colors.primaryLight,
    borderBottomRightRadius: 2
  },
  otherBubble: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 2
  },
  bubbleText: { fontSize: 14, color: Colors.text, lineHeight: 18 },
  bubbleFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 4
  },
  editedTextLabel: { fontSize: 9, color: Colors.textTertiary, fontStyle: "italic" },
  timeLabel: { fontSize: 9, color: Colors.textTertiary },
  tickIcon: { marginLeft: 4 },
  replyBubbleHeader: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    paddingLeft: 6,
    marginBottom: 6,
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 4,
    paddingVertical: 3
  },
  replyHeaderName: { fontSize: 10, fontWeight: "700", color: Colors.primary },
  replyHeaderMsg: { fontSize: 11, color: Colors.textSecondary },
  bubbleImage: { width: 200, height: 200, borderRadius: 12, resizeMode: "cover" },
  videoPlaceholder: { width: 200, height: 200, position: "relative" },
  videoPlayBtn: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -24 }, { translateY: -24 }]
  },
  pdfCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.03)",
    padding: 10,
    borderRadius: 12,
    width: 200
  },
  pdfDetails: { marginLeft: 10, flex: 1 },
  pdfName: { fontSize: 13, fontWeight: "600", color: Colors.text },
  pdfSize: { fontSize: 11, color: Colors.textTertiary },
  voiceCard: { flexDirection: "row", alignItems: "center", width: 160 },
  voiceWaveform: { flex: 1, flexDirection: "row", alignItems: "center", marginLeft: 8 },
  waveformDummyBar: { width: 3, height: 8, backgroundColor: Colors.primary, borderRadius: 2, marginRight: 2 },
  voiceDuration: { fontSize: 11, color: Colors.textTertiary, marginLeft: 10 },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.03)",
    padding: 10,
    borderRadius: 12,
    width: 200
  },
  locationDetails: { marginLeft: 10, flex: 1 },
  locationTitle: { fontSize: 13, fontWeight: "600", color: Colors.text },
  locationSub: { fontSize: 11, color: Colors.textTertiary },
  deletedWrapper: { flexDirection: "row", alignItems: "center" },
  deletedText: { fontSize: 13, fontStyle: "italic", color: Colors.textTertiary, marginLeft: 6 },
  centerSpinner: { flex: 1, justifyContent: "center", alignItems: "center" },
  uploadingBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    justifyContent: "center"
  },
  uploadingText: { fontSize: 12, color: Colors.textSecondary },
  replyPreviewBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 16
  },
  replyPreviewDetails: { flex: 1 },
  replyPreviewTitle: { fontSize: 11, fontWeight: "700", color: Colors.primary },
  replyPreviewContent: { fontSize: 12, color: Colors.textSecondary },
  footerInputBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border
  },
  attachBtn: { marginRight: 8 },
  chatInput: {
    flex: 1,
    backgroundColor: Colors.inputBackground,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    maxHeight: 100,
    fontSize: 14,
    color: Colors.text
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8
  },
  recordingActiveBtn: { backgroundColor: Colors.error },
  recordingOverlayBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: Colors.white,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    justifyContent: "space-between"
  },
  recordingText: { fontSize: 13, color: Colors.text, marginLeft: 8, flex: 1 },
  recordingCancelBtn: { padding: 8 },
  cancelText: { color: Colors.textSecondary, fontWeight: "600" },
  blinkDot: { width: 16, height: 16 },
  attachmentModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  attachmentModalContent: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  attachmentTitle: { fontSize: 16, fontWeight: "700", color: Colors.text, marginBottom: 16, textAlign: "center" },
  attachmentGrid: { flexDirection: "row", justifyContent: "space-around", marginVertical: 12 },
  attachmentGridItem: { alignItems: "center" },
  attachIconContainer: { width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  attachIconLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: "600" },
  cancelBtn: { marginTop: 10, paddingVertical: 14, alignItems: "center", justifyContent: "center", borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  cancelBtnText: { fontSize: 15, fontWeight: "700", color: Colors.error },
  menuOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.1)", justifyContent: "flex-start", alignItems: "flex-end" },
  menuContent: { marginTop: 54, marginRight: 16, backgroundColor: Colors.white, borderRadius: 12, padding: 8, elevation: 6, width: 160 },
  menuItem: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 12 },
  menuItemText: { fontSize: 14, color: Colors.text, marginLeft: 10, fontWeight: "600" },
  menuDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 4 },
  modalContainer: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  reportModalBox: { backgroundColor: Colors.white, borderRadius: 20, padding: 24, width: "100%" },
  reportTitle: { fontSize: 18, fontWeight: "700", color: Colors.text, marginBottom: 8 },
  reportSubtitle: { fontSize: 13, color: Colors.textSecondary, marginBottom: 16, lineHeight: 18 },
  reportInput: { height: 100, backgroundColor: Colors.inputBackground, borderRadius: 12, padding: 12, textAlignVertical: "top", color: Colors.text },
  reportModalActions: { flexDirection: "row", justifyContent: "flex-end", marginTop: 20 },
  reportBtnSecondary: { paddingVertical: 10, paddingHorizontal: 16, marginRight: 8 },
  reportBtnTextSecondary: { color: Colors.textSecondary, fontWeight: "600" },
  reportBtnPrimary: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 },
  reportBtnTextPrimary: { color: Colors.white, fontWeight: "700" },
  closedChatBar: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#F3F4F6",
    borderTopWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  closedChatText: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    flex: 1,
    lineHeight: 18,
  }
});

const getNow = () => Date.now();
