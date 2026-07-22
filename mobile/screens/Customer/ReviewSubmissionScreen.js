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
  View
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import { createNewReview, skipReview } from "../../services/review";

const PRESET_TAGS = ["Professional", "Friendly", "Creative", "Punctual", "Value for Money", "Expert Design", "Clean Work"];

export default function ReviewSubmissionScreen({ route, navigation }) {
  const { bookingId, artistName, artistImage, specializationName } = route.params || {};

  const [rating, setRating] = useState(5);
  const [designRating, setDesignRating] = useState(5);
  const [punctualityRating, setPunctualityRating] = useState(5);
  const [professionalismRating, setProfessionalismRating] = useState(5);

  const [comment, setComment] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async () => {
    setLoading(true);
    try {
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
        professionalism: professionalismRating
      });

      Alert.alert("Review Submitted 🎉", "Thank you for sharing your valuable feedback!");
      navigation.navigate("CustomerTabs", { screen: "Home" });
    } catch (err) {
      Alert.alert("Submission Error", err.message || "Failed to save review.");
    } finally {
      setLoading(false);
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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
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

      <View style={styles.footer}>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} />
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
  submitBtnText: { color: Colors.white, fontWeight: "700", fontSize: 14 }
});