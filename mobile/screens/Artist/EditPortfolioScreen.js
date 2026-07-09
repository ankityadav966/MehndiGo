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
import { updatePortfolioItem, uploadPortfolioMedia } from "../../services/artist";

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

export default function EditPortfolioScreen({ route, navigation }) {
  const { portfolio } = route.params;

  const [title, setTitle] = useState(portfolio.title || "");
  const [description, setDescription] = useState(portfolio.description || "");
  const [category, setCategory] = useState(portfolio.category || "");
  const [occasion, setOccasion] = useState(portfolio.occasion || "");
  const [tags, setTags] = useState(portfolio.tags || "");
  const [location, setLocation] = useState(portfolio.location || "Jaipur");
  const [visibility, setVisibility] = useState(portfolio.visibility);
  const [submitting, setSubmitting] = useState(false);
  const [imageUri, setImageUri] = useState(portfolio.image_url || "");

  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showOccasionDropdown, setShowOccasionDropdown] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow gallery access in settings to change the portfolio cover photo.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleUpdate = async () => {
    if (!title.trim()) {
      Alert.alert("Missing Title", "Please provide a title describing this design sample.");
      return;
    }
    if (!category) {
      Alert.alert("Category Required", "Please select a mehndi category.");
      return;
    }

    setSubmitting(true);

    try {
      let finalImageUrl = imageUri;
      const isLocal = (val) => {
        if (!val) return false;
        return (
          val.startsWith("file://") ||
          val.startsWith("content://") ||
          val.startsWith("ph://") ||
          val.startsWith("assets-library://")
        );
      };

      if (imageUri && isLocal(imageUri)) {
        const uploadResult = await uploadPortfolioMedia([imageUri]);
        if (uploadResult && uploadResult.length > 0) {
          finalImageUrl = uploadResult[0].url;
        }
      }

      const updateData = {
        title: title.trim(),
        description: description.trim(),
        category,
        occasion,
        tags: tags.trim(),
        location,
        visibility,
        image_url: finalImageUrl
      };

      await updatePortfolioItem(portfolio.id, updateData);

      Alert.alert("Success", "Portfolio item updated successfully!", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to update portfolio item.");
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
          <Text style={styles.headerTitle}>Edit Design Sample</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContainer} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Media Preview Section */}
          <TouchableOpacity style={styles.mediaContainer} onPress={pickImage} activeOpacity={0.9}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
            <View style={styles.editImageOverlay}>
              <Ionicons name="camera" size={20} color={Colors.white} />
              <Text style={styles.editImageText}>Change Cover Photo</Text>
            </View>
            {portfolio.video_url && (
              <View style={styles.videoPlayOverlay}>
                <Ionicons name="play-circle" size={48} color={Colors.white} />
              </View>
            )}
          </TouchableOpacity>

          {/* Form Fields */}
          <Text style={styles.inputLabel}>Title *</Text>
          <TextInput
            placeholder="e.g. Traditional Rajasthani Bridal"
            placeholderTextColor={Colors.textTertiary}
            style={styles.textInput}
            value={title}
            onChangeText={setTitle}
          />

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
              <Text style={styles.progressText}>Saving changes...</Text>
            </View>
          )}

          <CustomButton
            title={submitting ? "Saving..." : "Save Changes"}
            onPress={handleUpdate}
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
  previewImage: { width: "100%", height: "100%", resizeMode: "cover" },
  videoPlayOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", alignItems: "center" },
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
  editImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center"
  },
  editImageText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4
  }
});
