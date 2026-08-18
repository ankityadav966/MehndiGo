import React, { useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

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

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = () => {
    if (onSubmitReview) {
      const fullComment = [comment.trim(), selectedTags.length ? `Highlights: ${selectedTags.join(", ")}` : ""]
        .filter(Boolean)
        .join("\n\n");
      onSubmitReview({ rating, comment: fullComment });
    }
  };

  if (existingReview) {
    return (
      <View style={styles.submittedCard}>
        <View style={styles.submittedHeader}>
          <Ionicons name="checkmark-circle" size={20} color="#059669" />
          <Text style={styles.submittedTitle}>Review Submitted</Text>
        </View>
        <View style={styles.starRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name={star <= rating ? "star" : "star-outline"}
              size={18}
              color="#F59E0B"
            />
          ))}
        </View>
        {comment ? <Text style={styles.submittedComment}>&quot;{comment}&quot;</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="star" size={20} color="#F59E0B" style={{ marginRight: 6 }} />
        <Text style={styles.title}>Rate Your Experience with {artistName}</Text>
      </View>

      {/* 5-Star Interactive Row */}
      <View style={styles.starRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            activeOpacity={0.7}
            style={styles.starBtn}
          >
            <Ionicons
              name={star <= rating ? "star" : "star-outline"}
              size={32}
              color="#F59E0B"
            />
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.ratingDescriptor}>
        {rating === 5 ? "Outstanding & Beautiful! 🌟" : rating === 4 ? "Very Good Experience! 👍" : rating === 3 ? "Average Service" : "Needs Improvement"}
      </Text>

      {/* Compliment Quick Tags */}
      <Text style={styles.tagLabel}>What did you like most?</Text>
      <View style={styles.tagsContainer}>
        {TAGS.map((tag) => {
          const isSelected = selectedTags.includes(tag);
          return (
            <TouchableOpacity
              key={tag}
              style={[styles.tagPill, isSelected && styles.tagPillSelected]}
              onPress={() => toggleTag(tag)}
              activeOpacity={0.7}
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
        placeholder="Write a feedback or review for your artist..."
        placeholderTextColor="#9CA3AF"
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.submitBtnText}>Submit Review</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: "#FEF3C7",
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12
  },
  title: {
    fontSize: 14,
    fontWeight: "800",
    color: "#212121",
    flex: 1
  },
  starRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginVertical: 6
  },
  starBtn: {
    padding: 4
  },
  ratingDescriptor: {
    fontSize: 12,
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
    color: "#212121",
    minHeight: 70,
    marginBottom: 14
  },
  submitBtn: {
    height: 46,
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
    fontWeight: "700",
    color: "#FFFFFF"
  },
  submittedCard: {
    backgroundColor: "#ECFDF5",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0"
  },
  submittedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  submittedTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#065F46"
  },
  submittedComment: {
    fontSize: 12,
    color: "#047857",
    fontStyle: "italic",
    marginTop: 6
  }
});
