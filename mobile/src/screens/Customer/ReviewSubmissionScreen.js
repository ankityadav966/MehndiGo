import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import { createNewReview, skipReview, uploadReviewMedia } from "../../services/review";

const PRESET_TAGS = ["Professional", "Friendly", "Creative", "Punctual", "Value for Money", "Expert Design", "Clean Work"];

export default function ReviewSubmissionScreen({ route, navigation }) {
  const { bookingId, artistName, artistImage, specializationName } = route.params || {};

  const [rating, setRating] = useState(5);
  const [designRating, setDesignRating] = useState(5);
  const [punctualityRating, setPunctualityRating] = useState(5);
  const [professionalismRating, setProfessionalismRating] = useState(5);

  const [comment, setComment] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [videoMedia, setVideoMedia] = useState(null); // { uri }
  const [photos, setPhotos] = useState([]); // [ { uri } ]
  const [loading, setLoading] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState("");

  useEffect(() => {
    if (!bookingId) {
      Alert.alert("Error", "Missing booking ID context.");
      navigation.goBack();
    }
  }, [bookingId]);

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handlePickVideo = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 60
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        if (asset.fileSize && asset.fileSize > 50 * 1024 * 1024) {
          Alert.alert("File Too Large", "Review video cannot exceed 50 MB.");
          return;
        }
        if (asset.duration && asset.duration > 61000) {
          Alert.alert("Video Too Long", "Review video must be a short-form video (max 60 seconds).");
          return;
        }
        setVideoMedia(asset);
      }
    } catch (e) {
      Alert.alert("Error", "Failed to select video: " + e.message);
    }
  };

  const handlePickPhotos = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 4,
        quality: 0.8
      });
      if (!res.canceled && res.assets) {
        setPhotos((prev) => [...prev, ...res.assets].slice(0, 4));
      }
    } catch (e) {
      Alert.alert("Error", "Failed to select photos: " + e.message);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let uploadedVideoUrl = null;
      let uploadedVideoThumbnail = null;
      const uploadedPhotosList = [];

      // 1. Upload Video if selected
      if (videoMedia?.uri) {
        setUploadStatusText("Uploading video review...");
        const vRes = await uploadReviewMedia(videoMedia.uri, true);
        uploadedVideoUrl = vRes?.url;
        uploadedVideoThumbnail = vRes?.thumbnail;
      }

      // 2. Upload Photos if selected
      if (photos.length > 0) {
        setUploadStatusText("Uploading mehndi photos...");
        for (const p of photos) {
          if (p.uri) {
            const pRes = await uploadReviewMedia(p.uri, false);
            if (pRes?.url) uploadedPhotosList.push(pRes.url);
          }
        }
      }

      setUploadStatusText("Submitting verified review...");

      // Prepend tags to the comment text block
      let finalComment = comment.trim();
      if (selectedTags.length > 0) {
        finalComment = `[Tags: ${selectedTags.join(", ")}]\n\n${finalComment}`;
      }

      await createNewReview({
        booking_id: bookingId,
        rating,
        comment: finalComment,
        design_quality: designRating,
        punctuality: punctualityRating,
        professionalism: professionalismRating,
        video_url: uploadedVideoUrl,
        video_thumbnail: uploadedVideoThumbnail,
        photos: uploadedPhotosList
      });

      Alert.alert("Review Submitted 🎉", "Thank you! Your verified review has been published successfully.");
      navigation.goBack();
    } catch (err) {
      Alert.alert("Submission Error", err.message || "Failed to save review.");
    } finally {
      setLoading(false);
      setUploadStatusText("");
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      await skipReview(bookingId);
      Alert.alert("Review Skipped", "Review skipped successfully. Conversation is now closed.");
      navigation.navigate("CustomerTabs", { screen: "Home" });
    } catch (err) {
      Alert.alert("Skip Error", err.message || "Failed to skip review.");
    } finally {
      setLoading(false);
    }
  };

  const renderStarsSelector = (currentVal, setter) => (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} onPress={() => setter(star)} style={styles.starBtn}>
          <Ionicons
            name={star <= currentVal ? "star" : "star-outline"}
            size={22}
            color={star <= currentVal ? Colors.warning : Colors.border}
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={22} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Write Review</Text>
            <TouchableOpacity style={styles.skipHeaderBtn} onPress={handleSkip}>
              <Text style={styles.skipBtnText}>Skip</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.artistCard}>
            <Image
              source={{ uri: artistImage || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200" }}
              style={styles.artistImage}
            />
            <View style={styles.artistInfo}>
              <Text style={styles.artistName}>{artistName || "Mehndi Artist"}</Text>
              <Text style={styles.artistService}>{specializationName || "Mehndi Style Session"}</Text>
            </View>
          </View>

          {/* 1. Overall Rating */}
          <View style={styles.ratingSection}>
            <Text style={styles.ratingLabel}>Overall Experience Rating *</Text>
            {renderStarsSelector(rating, setRating)}
          </View>

          {/* 2. Sub Category Ratings */}
          <View style={styles.subRatingsCard}>
            <Text style={styles.subTitle}>Rate Specific Elements</Text>

            <View style={styles.subRow}>
              <Text style={styles.subLabel}>Design Quality</Text>
              {renderStarsSelector(designRating, setDesignRating)}
            </View>

            <View style={styles.subRow}>
              <Text style={styles.subLabel}>Punctuality</Text>
              {renderStarsSelector(punctualityRating, setPunctualityRating)}
            </View>

            <View style={styles.subRow}>
              <Text style={styles.subLabel}>Professionalism</Text>
              {renderStarsSelector(professionalismRating, setProfessionalismRating)}
            </View>
          </View>

          {/* 3. Preset Tags Selection */}
          <View style={styles.tagsContainer}>
            <Text style={styles.sectionLabel}>Select Highlights</Text>
            <View style={styles.tagsRow}>
              {PRESET_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.tagChip, isSelected && styles.selectedTagChip]}
                    onPress={() => toggleTag(tag)}
                  >
                    <Text style={[styles.tagText, isSelected && styles.selectedTagText]}>{tag}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 4. Video Review & Proof Media */}
          <View style={styles.mediaUploadSection}>
            <Text style={styles.sectionLabel}>Add Visual Proof (Video & Photos)</Text>
            <Text style={styles.mediaHint}>Upload a 15–60s video of your Mehndi design or clear photos to earn a Verified Review badge.</Text>

            {/* Video Review Attachment */}
            <View style={styles.videoPickerRow}>
              {videoMedia ? (
                <View style={styles.selectedVideoCard}>
                  <Ionicons name="videocam" size={24} color={Colors.primary} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.selectedVideoTitle} numberOfLines={1}>Video Review Selected</Text>
                    <Text style={styles.selectedVideoSub}>Duration: {videoMedia.duration ? `${Math.round(videoMedia.duration)}s` : "< 60s"}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setVideoMedia(null)} style={styles.removeMediaBtn}>
                    <Ionicons name="close-circle" size={22} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.addVideoBtn} onPress={handlePickVideo}>
                  <Ionicons name="videocam-outline" size={22} color={Colors.primary} />
                  <Text style={styles.addVideoBtnText}>Record / Select Video Review (15-60s)</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Photos Attachment */}
            <View style={styles.photosGridRow}>
              {photos.map((p, pIdx) => (
                <View key={pIdx} style={styles.photoThumbWrapper}>
                  <Image source={{ uri: p.uri }} style={styles.photoThumb} />
                  <TouchableOpacity
                    style={styles.removePhotoBtn}
                    onPress={() => setPhotos((prev) => prev.filter((_, idx) => idx !== pIdx))}
                  >
                    <Ionicons name="close-circle" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
              {photos.length < 4 && (
                <TouchableOpacity style={styles.addPhotoSlot} onPress={handlePickPhotos}>
                  <Ionicons name="camera-outline" size={22} color="#64748B" />
                  <Text style={styles.addPhotoSlotText}>Add Photo</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.reviewSection}>
            <Text style={styles.reviewLabel}>Detailed Comment</Text>
            <TextInput
              style={styles.reviewInput}
              placeholder="Help others decide by describing your overall experience..."
              placeholderTextColor={Colors.textTertiary}
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        {loading ? (
          <View style={{ alignItems: "center" }}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={{ marginTop: 6, fontSize: 12, color: Colors.textSecondary }}>{uploadStatusText || "Submitting..."}</Text>
          </View>
        ) : (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
              <Text style={styles.skipBtnLabel}>Skip Review</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
              <Text style={styles.submitBtnText}>Submit Review</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  skipHeaderBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  skipBtnText: { color: Colors.textSecondary, fontWeight: "600", fontSize: 13 },
  artistCard: { margin: 16, flexDirection: "row", alignItems: "center", backgroundColor: Colors.white, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.border, elevation: 1 },
  artistImage: { width: 50, height: 50, borderRadius: 25 },
  artistInfo: { marginLeft: 12, flex: 1 },
  artistName: { fontSize: 14, fontWeight: "700", color: Colors.text },
  artistService: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  ratingSection: { alignItems: "center", paddingVertical: 20, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  ratingLabel: { fontSize: 13, fontWeight: "700", color: Colors.text, marginBottom: 12 },
  starsRow: { flexDirection: "row", gap: 6 },
  starBtn: { padding: 4 },
  subRatingsCard: { backgroundColor: Colors.white, marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, elevation: 1 },
  subTitle: { fontSize: 13, fontWeight: "700", color: Colors.text, marginBottom: 14 },
  subRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  subLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: "700" },
  tagsContainer: { paddingHorizontal: 16, marginTop: 16 },
  sectionLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: "700", marginBottom: 8 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tagChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white },
  selectedTagChip: { backgroundColor: Colors.primaryLight + "15", borderColor: Colors.primary },
  tagText: { fontSize: 11, color: Colors.textSecondary, fontWeight: "600" },
  selectedTagText: { color: Colors.primary, fontWeight: "700" },
  reviewSection: { paddingHorizontal: 16, marginTop: 16 },
  reviewLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 8, fontWeight: "700" },
  reviewInput: { height: 100, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingTop: 10, fontSize: 13, color: Colors.text, backgroundColor: Colors.white },
  footer: { padding: 16, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border },
  actionButtons: { flexDirection: "row", gap: 12 },
  skipBtn: { flex: 1, height: 48, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, justifyContent: "center", alignItems: "center" },
  skipBtnLabel: { color: Colors.textSecondary, fontWeight: "600", fontSize: 13 },
  submitBtn: { flex: 2, height: 48, borderRadius: 10, backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center" },
  submitBtnText: { color: Colors.white, fontWeight: "700", fontSize: 14 },
  mediaUploadSection: { paddingHorizontal: 16, marginTop: 16 },
  mediaHint: { fontSize: 11, color: Colors.textTertiary, marginBottom: 10, lineHeight: 15 },
  videoPickerRow: { marginBottom: 12 },
  addVideoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: "dashed",
    backgroundColor: Colors.primaryLight + "10",
  },
  addVideoBtnText: {
    color: Colors.primary,
    fontWeight: "700",
    fontSize: 13,
    marginLeft: 8,
  },
  selectedVideoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  selectedVideoTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
  },
  selectedVideoSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  removeMediaBtn: {
    padding: 4,
  },
  photosGridRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  photoThumbWrapper: {
    width: 72,
    height: 72,
    borderRadius: 10,
    position: "relative",
  },
  photoThumb: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  removePhotoBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
  },
  addPhotoSlot: {
    width: 72,
    height: 72,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderStyle: "dashed",
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
  },
  addPhotoSlotText: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 2,
  },
});