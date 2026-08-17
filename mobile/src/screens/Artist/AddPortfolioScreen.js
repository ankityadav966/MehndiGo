import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import CustomButton from "../../components/CustomButton";
import { createPortfolioItem } from "../../services/artist";

const CATEGORIES = [
  "Bridal Mehndi",
  "Arabic Mehndi",
  "Royal Mehndi",
  "Indo Arabic",
  "Portrait Mehndi",
  "Minimal Mehndi",
  "Engagement",
  "Festival",
  "Kids Mehndi",
  "Custom Design",
  "Others"
];

const OCCASIONS = [
  "Wedding",
  "Engagement",
  "Karwa Chauth",
  "Teej",
  "Eid",
  "Diwali",
  "Baby Shower",
  "Roka",
  "Casual Sample",
  "Others"
];

export default function AddPortfolioScreen({ navigation }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [occasion, setOccasion] = useState("");
  const [tags, setTags] = useState("");
  const [location, setLocation] = useState("Jaipur");
  const [artTier, setArtTier] = useState("STANDARD"); // STANDARD or PREMIUM
  const [price, setPrice] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [complexityLevel, setComplexityLevel] = useState("MEDIUM");
  const [visibility, setVisibility] = useState(true);
  const [media, setMedia] = useState(null); // { uri, type, width, height }
  const [videoThumbnail, setVideoThumbnail] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showOccasionDropdown, setShowOccasionDropdown] = useState(false);

  const pickVideoThumbnail = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow gallery access in settings to upload a cover image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setVideoThumbnail(result.assets[0].uri);
    }
  };

  const pickMedia = async (type = "images") => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow gallery access in settings to upload media samples.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: type === "images" ? ['images'] : ['videos'],
      quality: 0.7,
      allowsEditing: true
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selected = result.assets[0];
      const isVid = type === "videos" || type === "video" || selected.type === "video" || (selected.mimeType && selected.mimeType.startsWith("video/")) || /\.(mp4|mov|3gp|mkv)$/i.test(selected.uri);
      
      console.log("[PICKED MEDIA ASSET]", {
        uri: selected.uri,
        fileName: selected.fileName || selected.name,
        type: selected.type,
        mimeType: selected.mimeType,
        fileSize: selected.fileSize || selected.size,
        isVid
      });

      setMedia({
        uri: selected.uri,
        type: isVid ? "video" : "image",
        mimeType: selected.mimeType || (isVid ? "video/mp4" : "image/jpeg")
      });
    }
  };

  const handleRemoveMedia = () => {
    setMedia(null);
    setVideoThumbnail(null);
  };

  const handleSave = async () => {
    const isVid = media && (media.type === "video" || (media.mimeType && media.mimeType.startsWith("video/")) || /\.(mp4|mov|3gp|mkv)$/i.test(media.uri));
    if (!media) {
      Alert.alert("Missing Media", "Please select a photograph or video sample of your work.");
      return;
    }
    if (isVid && !videoThumbnail) {
      Alert.alert("Cover Image Required", "Please select a cover image/thumbnail for your video portfolio sample.");
      return;
    }
    if (!title.trim()) {
      Alert.alert("Missing Title", "Please provide a title describing this design sample.");
      return;
    }
    if (!category) {
      Alert.alert("Category Required", "Please select a mehndi category.");
      return;
    }
    if (artTier === "PREMIUM" && (!price || Number(price) <= 0)) {
      Alert.alert("Price Required", "Please enter a valid price in ₹ for this Premium Art design.");
      return;
    }

    setSubmitting(true);
    setUploadProgress(0.01);

    try {
      let remoteThumbnailUrl = null;
      if (isVid && videoThumbnail) {
        const { uploadPortfolioMedia } = require("../../services/artist");
        const uploadResult = await uploadPortfolioMedia(
          [{ uri: videoThumbnail }],
          (progress) => {
            setUploadProgress(0.01 + progress * 0.14);
          }
        );
        if (uploadResult && uploadResult.length > 0) {
          remoteThumbnailUrl = uploadResult[0].url;
        }
      }

      const itemData = {
        title: title.trim(),
        description: description.trim(),
        category,
        occasion,
        tags: tags.trim(),
        location,
        visibility,
        art_tier: artTier,
        price: artTier === "PREMIUM" ? Number(price) : null,
        duration_minutes: Number(durationMinutes) || 60,
        complexity_level: complexityLevel,
        image_url: isVid ? (remoteThumbnailUrl || null) : media.uri,
        video_url: isVid ? media.uri : null
      };

      const startVal = remoteThumbnailUrl ? 0.15 : 0.01;
      await createPortfolioItem(itemData, (progress) => {
        setUploadProgress(startVal + progress * (0.90 - startVal));
      });
      setUploadProgress(1.0);
      
      navigation.goBack();
    } catch (err) {
      console.log("Upload failed:", err.message);
      Alert.alert("Error", err.message || "Failed to publish portfolio item.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Design Sample</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContainer} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Media Picker Section */}
          <View style={styles.mediaContainer}>
            {media ? (
              <View style={styles.previewWrapper}>
                <Image source={{ uri: media.uri }} style={styles.previewImage} />
                {media.type === "video" && (
                  <View style={styles.videoPlayOverlay}>
                    <Ionicons name="play-circle" size={48} color={Colors.white} />
                  </View>
                )}
                <TouchableOpacity style={styles.removeMediaBtn} onPress={handleRemoveMedia}>
                  <Ionicons name="close-circle" size={24} color={Colors.error} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.pickRow}>
                <TouchableOpacity style={styles.pickBox} onPress={() => pickMedia("images")}>
                  <Ionicons name="camera-outline" size={32} color={Colors.primary} />
                  <Text style={styles.pickText}>Choose Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pickBox} onPress={() => pickMedia("videos")}>
                  <Ionicons name="videocam-outline" size={32} color={Colors.primary} />
                  <Text style={styles.pickText}>Choose Video</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {media && media.type === "video" && (
            <View style={styles.thumbnailSection}>
              <Text style={styles.thumbnailLabel}>Select Video Cover / Thumbnail *</Text>
              {videoThumbnail ? (
                <View style={styles.thumbnailPreviewWrapper}>
                  <Image source={{ uri: videoThumbnail }} style={styles.thumbnailPreview} />
                  <TouchableOpacity style={styles.removeThumbnailBtn} onPress={() => setVideoThumbnail(null)}>
                    <Ionicons name="close-circle" size={22} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.pickThumbnailBtn} onPress={pickVideoThumbnail}>
                  <Ionicons name="image-outline" size={20} color={Colors.primary} />
                  <Text style={styles.pickThumbnailText}>Choose Cover Image</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Form Fields */}
          <Text style={styles.inputLabel}>Title *</Text>
          <TextInput
            placeholder="e.g. Traditional Rajasthani Bridal"
            placeholderTextColor={Colors.textTertiary}
            style={styles.textInput}
            value={title}
            onChangeText={setTitle}
          />

          {/* Art Tier Selector */}
          <Text style={styles.inputLabel}>Art Listing Tier *</Text>
          <View style={styles.tierSelectorRow}>
            <TouchableOpacity
              style={[styles.tierOption, artTier === "STANDARD" && styles.activeTierOption]}
              onPress={() => setArtTier("STANDARD")}
            >
              <Ionicons name="sparkles" size={16} color={artTier === "STANDARD" ? Colors.white : Colors.primary} />
              <Text style={[styles.tierOptionText, artTier === "STANDARD" && styles.activeTierOptionText]}>
                Standard Design
              </Text>
              <Text style={[styles.tierSubText, artTier === "STANDARD" && styles.activeTierSubText]}>
                Included in basic package
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tierOption, artTier === "PREMIUM" && styles.activeTierOption]}
              onPress={() => setArtTier("PREMIUM")}
            >
              <Ionicons name="diamond" size={16} color={artTier === "PREMIUM" ? Colors.white : "#7C3AED"} />
              <Text style={[styles.tierOptionText, artTier === "PREMIUM" && styles.activeTierOptionText]}>
                💎 Premium Art
              </Text>
              <Text style={[styles.tierSubText, artTier === "PREMIUM" && styles.activeTierSubText]}>
                Custom priced design
              </Text>
            </TouchableOpacity>
          </View>

          {/* Premium Price Input */}
          {artTier === "PREMIUM" && (
            <View style={{ marginTop: 4 }}>
              <Text style={styles.inputLabel}>Premium Art Price (₹) *</Text>
              <TextInput
                placeholder="e.g. 2500"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="numeric"
                style={styles.textInput}
                value={price}
                onChangeText={setPrice}
              />
            </View>
          )}

          {/* Application Duration & Calendar Buffer */}
          <View style={{ marginTop: 4 }}>
            <Text style={styles.inputLabel}>Estimated Application Time (Minutes) *</Text>
            <View style={styles.durationRow}>
              {[30, 45, 60, 90, 120, 180].map((mins) => (
                <TouchableOpacity
                  key={mins}
                  style={[styles.durationChip, Number(durationMinutes) === mins && styles.activeDurationChip]}
                  onPress={() => setDurationMinutes(String(mins))}
                >
                  <Text style={[styles.durationChipText, Number(durationMinutes) === mins && styles.activeDurationChipText]}>
                    {mins}m
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.bufferHint}>
              ℹ️ MehndiGo automatically adds a 20-min travel & prep buffer before booking your next client.
            </Text>
          </View>

          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            placeholder="Describe styling details, motifs, or design pattern..."
            placeholderTextColor={Colors.textTertiary}
            multiline
            numberOfLines={3}
            style={[styles.textInput, { height: 80, textAlignVertical: "top" }]}
            value={description}
            onChangeText={setDescription}
          />

          {/* Category Dropdown */}
          <Text style={styles.inputLabel}>Mehndi Category *</Text>
          <TouchableOpacity
            style={styles.dropdownSelector}
            onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
          >
            <Text style={{ color: category ? Colors.text : Colors.textTertiary }}>
              {category || "Select Category"}
            </Text>
            <Ionicons name={showCategoryDropdown ? "chevron-up" : "chevron-down"} size={18} color={Colors.textSecondary} />
          </TouchableOpacity>

          {showCategoryDropdown && (
            <View style={styles.dropdownList}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setCategory(cat);
                    setShowCategoryDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Occasion Dropdown */}
          <Text style={styles.inputLabel}>Occasion</Text>
          <TouchableOpacity
            style={styles.dropdownSelector}
            onPress={() => setShowOccasionDropdown(!showOccasionDropdown)}
          >
            <Text style={{ color: occasion ? Colors.text : Colors.textTertiary }}>
              {occasion || "Select Occasion"}
            </Text>
            <Ionicons name={showOccasionDropdown ? "chevron-up" : "chevron-down"} size={18} color={Colors.textSecondary} />
          </TouchableOpacity>

          {showOccasionDropdown && (
            <View style={styles.dropdownList}>
              {OCCASIONS.map((occ) => (
                <TouchableOpacity
                  key={occ}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setOccasion(occ);
                    setShowOccasionDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{occ}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.inputLabel}>Tags (comma separated)</Text>
          <TextInput
            placeholder="e.g. peacock, full hand, shaded henna"
            placeholderTextColor={Colors.textTertiary}
            style={styles.textInput}
            value={tags}
            onChangeText={setTags}
          />

          <Text style={styles.inputLabel}>Location</Text>
          <TextInput
            placeholder="e.g. Jaipur"
            placeholderTextColor={Colors.textTertiary}
            style={styles.textInput}
            value={location}
            onChangeText={setLocation}
          />

          {/* Visibility Switch */}
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>Public Visibility</Text>
              <Text style={styles.switchSub}>Show this sample on your public listing gallery</Text>
            </View>
            <Switch
              value={visibility}
              onValueChange={setVisibility}
              trackColor={{ false: Colors.border, true: Colors.primaryLight }}
              thumbColor={visibility ? Colors.primary : Colors.textTertiary}
            />
          </View>

          {submitting && (
            <View style={styles.progressContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.progressText}>
                {uploadProgress >= 1.0 
                  ? "Upload complete" 
                  : uploadProgress >= 0.90 
                    ? "Processing and saving portfolio..." 
                    : `Uploading media... (${Math.round(uploadProgress * 100)}%)`}
              </Text>
            </View>
          )}

          <CustomButton
            title={submitting ? "Publishing..." : "Publish Design Sample"}
            onPress={handleSave}
            disabled={submitting}
            style={{ marginTop: 24, marginBottom: 40 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.white, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  scrollContainer: { padding: 16 },
  mediaContainer: {
    height: 180,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    overflow: "hidden"
  },
  pickRow: { flexDirection: "row", justifyContent: "space-around", width: "100%" },
  pickBox: { alignItems: "center", padding: 12, width: 120 },
  pickText: { fontSize: 12, color: Colors.primary, fontWeight: "700", marginTop: 8 },
  previewWrapper: { ...StyleSheet.absoluteFillObject },
  previewImage: { width: "100%", height: "100%", resizeMode: "cover" },
  videoPlayOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", alignItems: "center" },
  removeMediaBtn: { position: "absolute", top: 12, right: 12, zIndex: 5 },
  inputLabel: { fontSize: 13, fontWeight: "700", color: Colors.text, marginTop: 14, marginBottom: 6 },
  textInput: {
    height: 48,
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    fontSize: 13,
    color: Colors.text
  },
  dropdownSelector: {
    height: 48,
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  dropdownList: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 4,
    elevation: 3,
    maxHeight: 200,
    overflow: "scroll"
  },
  dropdownItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.background },
  dropdownItemText: { fontSize: 13, color: Colors.text },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.white,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 20
  },
  switchLabel: { fontSize: 13, fontWeight: "700", color: Colors.text },
  switchSub: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  progressContainer: { flexDirection: "row", alignItems: "center", marginTop: 16, justifyContent: "center" },
  progressText: { fontSize: 12, color: Colors.textSecondary, marginLeft: 8 },
  thumbnailSection: {
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 16,
    marginBottom: 8
  },
  thumbnailLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 12
  },
  thumbnailPreviewWrapper: {
    width: 100,
    height: 100,
    borderRadius: 10,
    position: "relative",
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.border
  },
  thumbnailPreview: {
    width: "100%",
    height: "100%",
    borderRadius: 9
  },
  removeThumbnailBtn: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: Colors.white,
    borderRadius: 11
  },
  pickThumbnailBtn: {
    height: 48,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: "dashed",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  pickThumbnailText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary
  },
  tierSelectorRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  tierOption: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: Colors.white,
    alignItems: "center",
  },
  activeTierOption: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  tierOptionText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
    marginTop: 4,
  },
  activeTierOptionText: {
    color: "#FFFFFF",
  },
  tierSubText: {
    fontSize: 10,
    color: Colors.textTertiary,
    marginTop: 2,
    textAlign: "center",
  },
  activeTierSubText: {
    color: "rgba(255,255,255,0.85)",
  },
  durationRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  durationChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  activeDurationChip: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  durationChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  activeDurationChipText: {
    color: "#FFFFFF",
  },
  bufferHint: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 6,
    fontStyle: "italic",
  },
});

