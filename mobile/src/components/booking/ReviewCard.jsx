import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Modal,
  Platform
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import Alert from "../../utils/Alert";
import { uploadReviewMedia } from "../../services/review";

const TAGS = [
  "Punctual & On Time",
  "Intricate Henna Art",
  "Polite & Professional",
  "Clean & Hygienic",
  "Fast Application",
  "Dark Stain Result"
];

export default function ReviewCard({
  artistName = "Artist",
  onSubmitReview,
  loading = false,
  existingReview = null
}) {
  const [rating, setRating] = useState(existingReview?.rating || 5);
  const [selectedTags, setSelectedTags] = useState([]);
  const [comment, setComment] = useState(existingReview?.comment || "");
  const [photos, setPhotos] = useState([]); // [{ uri }]
  const [videoMedia, setVideoMedia] = useState(null); // { uri, duration }
  const [isUploading, setIsUploading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [previewImage, setPreviewImage] = useState(null);

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handlePickPhotos = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 4 - photos.length,
        quality: 0.8
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        setPhotos((prev) => [...prev, ...res.assets].slice(0, 4));
      }
    } catch (e) {
      Alert.alert("Error", "Failed to select photos: " + e.message);
    }
  };

  const handleRemovePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
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
        setVideoMedia(res.assets[0]);
      }
    } catch (e) {
      Alert.alert("Error", "Failed to select video: " + e.message);
    }
  };

  const handleRemoveVideo = () => {
    setVideoMedia(null);
  };

  const handleSubmit = async () => {
    if (!rating || rating < 1) {
      Alert.alert("Rating Required", "Please select at least 1 star for your review.");
      return;
    }

    setIsUploading(true);
    try {
      let uploadedVideoUrl = null;
      let uploadedVideoThumbnail = null;
      const uploadedPhotosList = [];

      // 1. Upload Video if selected
      if (videoMedia?.uri) {
        setStatusText("Uploading video review...");
        try {
          const vRes = await uploadReviewMedia(videoMedia.uri, true);
          uploadedVideoUrl = vRes?.url || vRes?.secure_url || (Array.isArray(vRes) ? vRes[0]?.url : null);
          uploadedVideoThumbnail = vRes?.thumbnail || uploadedVideoUrl;
        } catch (vErr) {
          console.warn("[Video Upload Warning]", vErr.message);
        }
      }

      // 2. Upload Photos if selected
      if (photos.length > 0) {
        setStatusText("Uploading review photos...");
        for (const p of photos) {
          if (p.uri) {
            try {
              const pRes = await uploadReviewMedia(p.uri, false);
              const pUrl = pRes?.url || pRes?.secure_url || (Array.isArray(pRes) ? pRes[0]?.url : null);
              if (pUrl) uploadedPhotosList.push(pUrl);
            } catch (pErr) {
              console.warn("[Photo Upload Warning]", pErr.message);
            }
          }
        }
      }

      setStatusText("Saving your review...");

      const fullComment = [comment.trim(), selectedTags.length ? `Highlights: ${selectedTags.join(", ")}` : ""]
        .filter(Boolean)
        .join("\n\n");

      if (onSubmitReview) {
        await onSubmitReview({
          rating,
          comment: fullComment,
          photos: uploadedPhotosList,
          video_url: uploadedVideoUrl,
          video_thumbnail: uploadedVideoThumbnail
        });
      }
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to submit review");
    } finally {
      setIsUploading(false);
      setStatusText("");
    }
  };

  // If a review already exists for this booking, render the Verified Review Card
  if (existingReview) {
    const existingPhotos = Array.isArray(existingReview.photos)
      ? existingReview.photos
      : (typeof existingReview.photos === 'string'
        ? (() => { try { return JSON.parse(existingReview.photos); } catch (_) { return []; } })()
        : []);
    const existingRating = Number(existingReview.rating || 5);
    const existingComment = existingReview.comment || "";
    const existingVideo = existingReview.video_url || null;
    const createdAtText = existingReview.created_at
      ? new Date(existingReview.created_at).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric"
        })
      : "Verified Customer";

    return (
      <View style={styles.submittedCard}>
        <View style={styles.submittedHeader}>
          <View style={styles.shieldBadge}>
            <Ionicons name="shield-checkmark" size={16} color="#059669" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.submittedTitle}>Your Verified Review</Text>
            <Text style={styles.submittedDate}>Submitted on {createdAtText}</Text>
          </View>
          <View style={styles.verifiedTag}>
            <Text style={styles.verifiedTagText}>PUBLISHED</Text>
          </View>
        </View>

        {/* Star Rating Display */}
        <View style={styles.submittedStarRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name={star <= existingRating ? "star" : "star-outline"}
              size={20}
              color="#F59E0B"
            />
          ))}
          <Text style={styles.submittedRatingNumber}>{existingRating.toFixed(1)} / 5.0</Text>
        </View>

        {/* Comment */}
        {existingComment ? (
          <Text style={styles.submittedCommentText}>&quot;{existingComment}&quot;</Text>
        ) : null}

        {/* Photos Gallery */}
        {existingPhotos.length > 0 && (
          <View style={styles.submittedGallery}>
            <Text style={styles.submittedMediaLabel}>Uploaded Photos ({existingPhotos.length})</Text>
            <View style={styles.photoGrid}>
              {existingPhotos.map((photoUrl, idx) => (
                <TouchableOpacity
                  key={`photo-${idx}`}
                  activeOpacity={0.8}
                  onPress={() => setPreviewImage(photoUrl)}
                  style={styles.photoGridItem}
                >
                  <Image source={{ uri: photoUrl }} style={styles.photoGridImg} />
                  <View style={styles.zoomIconOverlay}>
                    <Ionicons name="scan-outline" size={12} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Video Preview */}
        {existingVideo && (
          <View style={styles.videoSubmittedBadge}>
            <Ionicons name="videocam" size={16} color="#701DDB" style={{ marginRight: 6 }} />
            <Text style={styles.videoSubmittedText}>Video review uploaded successfully</Text>
          </View>
        )}

        {/* Modal for full photo preview */}
        <Modal
          visible={!!previewImage}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setPreviewImage(null)}
        >
          <View style={styles.modalBackdrop}>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setPreviewImage(null)}>
              <Ionicons name="close-circle" size={32} color="#FFFFFF" />
            </TouchableOpacity>
            {previewImage && (
              <Image source={{ uri: previewImage }} style={styles.fullScreenImage} resizeMode="contain" />
            )}
          </View>
        </Modal>
      </View>
    );
  }

  const isBusy = loading || isUploading;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="star" size={22} color="#F59E0B" style={{ marginRight: 8 }} />
        <Text style={styles.title}>Rate & Review {artistName}</Text>
      </View>

      {/* 5-Star Interactive Selector */}
      <View style={styles.starRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            activeOpacity={0.7}
            style={styles.starBtn}
            disabled={isBusy}
          >
            <Ionicons
              name={star <= rating ? "star" : "star-outline"}
              size={34}
              color="#F59E0B"
            />
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.ratingDescriptor}>
        {rating === 5
          ? "🌟 Outstanding & Beautiful Mehndi!"
          : rating === 4
          ? "👍 Very Good Experience!"
          : rating === 3
          ? "✨ Average Service"
          : rating === 2
          ? "⚠️ Needs Improvement"
          : "❌ Dissatisfied"}
      </Text>

      {/* Compliment Quick Tags */}
      <Text style={styles.tagLabel}>What stood out the most?</Text>
      <View style={styles.tagsContainer}>
        {TAGS.map((tag) => {
          const isSelected = selectedTags.includes(tag);
          return (
            <TouchableOpacity
              key={tag}
              style={[styles.tagPill, isSelected && styles.tagPillSelected]}
              onPress={() => toggleTag(tag)}
              activeOpacity={0.7}
              disabled={isBusy}
            >
              <Text style={[styles.tagText, isSelected && styles.tagTextSelected]}>
                {tag}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Comment Input */}
      <TextInput
        style={styles.commentInput}
        value={comment}
        onChangeText={setComment}
        placeholder="Share your feedback, design quality, henna stain, etc..."
        placeholderTextColor="#9CA3AF"
        multiline
        numberOfLines={3}
        textAlignVertical="top"
        editable={!isBusy}
      />

      {/* Media Pickers (Photos & Video) */}
      <View style={styles.mediaSection}>
        <Text style={styles.tagLabel}>Add Photos & Video (Optional)</Text>
        
        <View style={styles.mediaButtonsRow}>
          {/* Photo Picker Button */}
          {photos.length < 4 && (
            <TouchableOpacity
              style={styles.mediaPickerBtn}
              onPress={handlePickPhotos}
              disabled={isBusy}
              activeOpacity={0.8}
            >
              <Ionicons name="camera-outline" size={18} color="#701DDB" />
              <Text style={styles.mediaPickerBtnText}>
                {photos.length === 0 ? "Add Photos" : `Add More (${photos.length}/4)`}
              </Text>
            </TouchableOpacity>
          )}

          {/* Video Picker Button */}
          {!videoMedia && (
            <TouchableOpacity
              style={styles.mediaPickerBtn}
              onPress={handlePickVideo}
              disabled={isBusy}
              activeOpacity={0.8}
            >
              <Ionicons name="videocam-outline" size={18} color="#E91E63" />
              <Text style={[styles.mediaPickerBtnText, { color: "#E91E63" }]}>Add Video (60s)</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Selected Photos Thumbnails */}
        {photos.length > 0 && (
          <View style={styles.thumbnailRow}>
            {photos.map((p, index) => (
              <View key={`thumb-${index}`} style={styles.thumbWrapper}>
                <Image source={{ uri: p.uri }} style={styles.thumbImage} />
                <TouchableOpacity
                  style={styles.thumbRemoveBtn}
                  onPress={() => handleRemovePhoto(index)}
                  disabled={isBusy}
                >
                  <Ionicons name="close-circle" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Selected Video Badge */}
        {videoMedia && (
          <View style={styles.videoBadge}>
            <Ionicons name="film-outline" size={18} color="#701DDB" style={{ marginRight: 6 }} />
            <Text style={styles.videoBadgeText} numberOfLines={1}>
              Video Selected {videoMedia.duration ? `(~${Math.round(videoMedia.duration)}s)` : ""}
            </Text>
            <TouchableOpacity
              onPress={handleRemoveVideo}
              disabled={isBusy}
              style={{ marginLeft: 6 }}
            >
              <Ionicons name="close-circle" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Uploading Status Text */}
      {statusText ? (
        <Text style={styles.uploadStatusText}>{statusText}</Text>
      ) : null}

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitBtn, isBusy && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={isBusy}
        activeOpacity={0.8}
      >
        {isBusy ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.submitBtnText}>Submitting Review...</Text>
          </View>
        ) : (
          <Text style={styles.submitBtnText}>Submit Verified Review</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: "#FEF3C7",
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1F2937",
    flex: 1
  },
  starRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginVertical: 8
  },
  starBtn: {
    padding: 4
  },
  ratingDescriptor: {
    fontSize: 13,
    fontWeight: "700",
    color: "#D97706",
    textAlign: "center",
    marginBottom: 14
  },
  tagLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    marginBottom: 8
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12
  },
  tagPill: {
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB"
  },
  tagPillSelected: {
    backgroundColor: "#FEF3C7",
    borderColor: "#F59E0B"
  },
  tagText: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500"
  },
  tagTextSelected: {
    color: "#B45309",
    fontWeight: "700"
  },
  commentInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    fontSize: 13,
    color: "#1F2937",
    minHeight: 75,
    marginBottom: 12
  },
  mediaSection: {
    marginBottom: 14
  },
  mediaButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10
  },
  mediaPickerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 6
  },
  mediaPickerBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#701DDB"
  },
  thumbnailRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8
  },
  thumbWrapper: {
    position: "relative"
  },
  thumbImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: "#E5E7EB"
  },
  thumbRemoveBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#FFFFFF",
    borderRadius: 10
  },
  videoBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F3FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DDD6FE"
  },
  videoBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#701DDB",
    flex: 1
  },
  uploadStatusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#701DDB",
    textAlign: "center",
    marginBottom: 10
  },
  submitBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: "#E91E63",
    justifyContent: "center",
    alignItems: "center"
  },
  submitBtnDisabled: {
    backgroundColor: "#9CA3AF"
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  submittedCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: "#86EFAC",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2
  },
  submittedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10
  },
  shieldBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center"
  },
  submittedTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#065F46"
  },
  submittedDate: {
    fontSize: 11,
    color: "#059669",
    fontWeight: "500"
  },
  verifiedTag: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#86EFAC"
  },
  verifiedTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#047857"
  },
  submittedStarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 10
  },
  submittedRatingNumber: {
    fontSize: 13,
    fontWeight: "800",
    color: "#D97706",
    marginLeft: 6
  },
  submittedCommentText: {
    fontSize: 13,
    color: "#1F2937",
    lineHeight: 18,
    fontStyle: "italic",
    marginBottom: 12
  },
  submittedGallery: {
    marginBottom: 10
  },
  submittedMediaLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#047857",
    textTransform: "uppercase",
    marginBottom: 6
  },
  photoGrid: {
    flexDirection: "row",
    gap: 8
  },
  photoGridItem: {
    position: "relative"
  },
  photoGridImg: {
    width: 55,
    height: 55,
    borderRadius: 8,
    backgroundColor: "#E5E7EB"
  },
  zoomIconOverlay: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 4,
    padding: 2
  },
  videoSubmittedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAF5FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E9D5FF"
  },
  videoSubmittedText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#701DDB"
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center"
  },
  modalCloseBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10
  },
  fullScreenImage: {
    width: "90%",
    height: "80%"
  }
});
