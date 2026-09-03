import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Modal
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../constants/Colors";
import Alert from "../../utils/Alert";
import { getNormalizedUrl } from "../../services/api";
import { submitCustomDesignRequest } from "../../services/customer";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const OCCASIONS = [
  "Bridal / Wedding",
  "Engagement",
  "Baby Shower / Godh Bharai",
  "Karwa Chauth / Teej",
  "Festival / Eid",
  "Party / Social Event"
];

const STYLES = [
  "Rajasthani Royal Traditional",
  "Modern Arabic Floral",
  "Indo-Western Fusion",
  "Custom Couple Portrait",
  "Mandala & Geometric Jaal"
];

const COVERAGE_OPTIONS = [
  { id: "PALMS_ONLY", label: "Palms Only (2 Hands)" },
  { id: "HANDS_WRIST", label: "Hands to Wrist (Front & Back)" },
  { id: "HANDS_ELBOW", label: "Hands to Elbows" },
  { id: "FULL_BRIDAL", label: "Full Bridal (Hands to Elbows + Feet)" }
];

const TIME_SLOTS = [
  "Morning (9:00 AM - 12:00 PM)",
  "Afternoon (1:00 PM - 4:00 PM)",
  "Evening (5:00 PM - 8:00 PM)"
];

const resolveImage = (uri) => {
  if (!uri || typeof uri !== "string") return "";
  const trimmed = uri.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("file://") ||
    trimmed.startsWith("content://") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }
  return getNormalizedUrl(trimmed);
};

export default function CustomDesignRequestScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const {
    artistId,
    serviceId,
    serviceTitle,
    artist = {},
    initialReference,
    preferredStyle: initialStyle
  } = route.params || {};

  const [referenceImages, setReferenceImages] = useState(
    initialReference ? [initialReference] : []
  );
  const [occasion, setOccasion] = useState("Bridal / Wedding");
  const [preferredStyle, setPreferredStyle] = useState(
    initialStyle || "Rajasthani Royal Traditional"
  );
  const [groupSize, setGroupSize] = useState(1);
  const [serviceCoverage, setServiceCoverage] = useState("HANDS_ELBOW");
  const [description, setDescription] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState(TIME_SLOTS[0]);
  const [address, setAddress] = useState("");
  const [budgetPreference, setBudgetPreference] = useState("");
  const [loading, setLoading] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [createdRequestId, setCreatedRequestId] = useState(null);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Needed", "Please grant photo library access to upload design references.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newUris = result.assets.map(a => a.uri);
        setReferenceImages(prev => [...prev, ...newUris].slice(0, 6));
      }
    } catch (e) {
      if (__DEV__) console.log("Image picker error:", e.message);
      Alert.alert("Error", "Could not pick image. Please try again.");
    }
  };

  const handleRemoveImage = (index) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!description.trim() && referenceImages.length === 0) {
      Alert.alert("Incomplete Request", "Please provide a brief description or at least one reference photo.");
      return;
    }

    setLoading(true);
    try {
      const res = await submitCustomDesignRequest({
        artist_id: artistId || artist.id,
        service_id: serviceId,
        occasion,
        preferred_style: preferredStyle,
        description: description.trim() || `Custom ${occasion} design requested.`,
        reference_images: referenceImages,
        group_size: groupSize,
        service_coverage: serviceCoverage,
        budget_preference: budgetPreference ? Number(budgetPreference) : null,
        preferred_date: preferredDate || null,
        preferred_time: preferredTime,
        address: address.trim() || null
      });

      setLoading(false);
      setCreatedRequestId(res?.id || res?.data?.id || 1);
      setSuccessModalVisible(true);
    } catch (e) {
      setLoading(false);
      Alert.alert("Request Failed", e.message || "Failed to submit custom design request. Please try again.");
    }
  };

  const handleMessageArtist = () => {
    setSuccessModalVisible(false);
    const initialMsg = `Hi ${artist.name || "Artist"}! I just sent you a custom design request for ${occasion} (${preferredStyle}). Looking forward to discussing details!`;
    navigation.navigate("ChatRoom", {
      artistId: artist.user_id || artist.id || artistId,
      artistName: artist.name || "Artist",
      artistAvatar: artist.profile_image,
      initialMessage: initialMsg
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleCol}>
            <Text style={styles.headerTitle}>Custom Design Request</Text>
            <Text style={styles.headerSubtitle}>
              {artist.name ? `Direct to ${artist.name}` : "Bespoke Mehndi Styling"}
            </Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 + insets.bottom }}
        >
          {/* Artist Target Card */}
          <View style={styles.artistTargetCard}>
            <Image
              source={{
                uri: resolveImage(artist.profile_image) ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(artist.name || "Artist")}&background=F3E8FF&color=7C3AED`
              }}
              style={styles.artistAvatar}
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.artistName}>{artist.name || "Mehndi Artist"}</Text>
              <Text style={styles.artistMeta}>
                ⭐ {Number(artist.avg_rating || 4.8).toFixed(1)} • {artist.city || "Available in city"}
              </Text>
            </View>
            <View style={styles.customBadge}>
              <Text style={styles.customBadgeText}>🎨 Bespoke</Text>
            </View>
          </View>

          {/* Reference Photos Upload Section */}
          <View style={styles.formSection}>
            <Text style={styles.sectionHeading}>Reference Photos / Sketches (Up to 6)</Text>
            <Text style={styles.sectionSubheading}>
              Upload images of designs you love from Pinterest, Instagram, or our catalog.
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
              <View style={styles.photoGrid}>
                {referenceImages.map((uri, idx) => (
                  <View key={`ref-${idx}`} style={styles.photoThumbWrapper}>
                    <Image source={{ uri: resolveImage(uri) }} style={styles.photoThumb} />
                    <TouchableOpacity
                      style={styles.deletePhotoBtn}
                      onPress={() => handleRemoveImage(idx)}
                    >
                      <Ionicons name="close" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}

                {referenceImages.length < 6 && (
                  <TouchableOpacity style={styles.addPhotoCard} onPress={handlePickImage}>
                    <Ionicons name="camera-outline" size={26} color={Colors.primary} />
                    <Text style={styles.addPhotoText}>+ Add Photo</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>

          {/* Occasion Selection */}
          <View style={styles.formSection}>
            <Text style={styles.sectionHeading}>Occasion</Text>
            <View style={styles.chipRow}>
              {OCCASIONS.map((occ) => {
                const isSelected = occasion === occ;
                return (
                  <TouchableOpacity
                    key={`occ-${occ}`}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => setOccasion(occ)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{occ}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Preferred Style */}
          <View style={styles.formSection}>
            <Text style={styles.sectionHeading}>Preferred Mehndi Style</Text>
            <View style={styles.chipRow}>
              {STYLES.map((st) => {
                const isSelected = preferredStyle === st;
                return (
                  <TouchableOpacity
                    key={`st-${st}`}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => setPreferredStyle(st)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{st}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Coverage */}
          <View style={styles.formSection}>
            <Text style={styles.sectionHeading}>Service Coverage</Text>
            <View style={styles.chipRow}>
              {COVERAGE_OPTIONS.map((cov) => {
                const isSelected = serviceCoverage === cov.id;
                return (
                  <TouchableOpacity
                    key={`cov-${cov.id}`}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => setServiceCoverage(cov.id)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{cov.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Group Size Counter */}
          <View style={styles.formSection}>
            <View style={styles.counterRow}>
              <View>
                <Text style={styles.sectionHeading}>Number of People (Group Size)</Text>
                <Text style={styles.sectionSubheading}>How many people will get mehndi applied?</Text>
              </View>
              <View style={styles.counterControls}>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => setGroupSize(prev => Math.max(1, prev - 1))}
                >
                  <Ionicons name="remove" size={18} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.counterValue}>{groupSize}</Text>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => setGroupSize(prev => Math.min(20, prev + 1))}
                >
                  <Ionicons name="add" size={18} color="#0F172A" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Description & Custom Elements */}
          <View style={styles.formSection}>
            <Text style={styles.sectionHeading}>Design Details & Special Customizations</Text>
            <Text style={styles.sectionSubheading}>
              Mention names, wedding hashtags, specific figures, dates, or symmetry preferences.
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder="e.g. Include groom portrait on left palm, our wedding hashtag #PoojaRahul on wrist, and lotus motifs throughout..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              value={description}
              onChangeText={setDescription}
            />
          </View>

          {/* Preferred Date & Time */}
          <View style={styles.formSection}>
            <Text style={styles.sectionHeading}>Preferred Date & Time Slot</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 25th Nov 2026 or Next Sunday"
              placeholderTextColor="#94A3B8"
              value={preferredDate}
              onChangeText={setPreferredDate}
            />
            <View style={[styles.chipRow, { marginTop: 8 }]}>
              {TIME_SLOTS.map((slot) => {
                const isSelected = preferredTime === slot;
                return (
                  <TouchableOpacity
                    key={`slot-${slot}`}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => setPreferredTime(slot)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{slot}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Doorstep Location Address */}
          <View style={styles.formSection}>
            <Text style={styles.sectionHeading}>Service Location / Address</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter venue or doorstep address"
              placeholderTextColor="#94A3B8"
              value={address}
              onChangeText={setAddress}
            />
          </View>

          {/* Budget Preference */}
          <View style={styles.formSection}>
            <Text style={styles.sectionHeading}>Budget Preference (Optional, ₹)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 5000"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={budgetPreference}
              onChangeText={setBudgetPreference}
            />
          </View>
        </ScrollView>

        {/* Sticky Submit Bar */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.submitBtnText}>Submit Custom Request</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Success Modal */}
      <Modal visible={successModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark-circle" size={56} color="#059669" />
            </View>
            <Text style={styles.modalTitle}>Request Submitted! 🎨</Text>
            <Text style={styles.modalDesc}>
              {artist.name || "The artist"} has received your custom design specifications and will respond with a quote shortly.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalMsgBtn} onPress={handleMessageArtist}>
                <Ionicons name="chatbubble-ellipses" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.modalMsgBtnText}>Chat with Artist</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDoneBtn}
                onPress={() => {
                  setSuccessModalVisible(false);
                  navigation.goBack();
                }}
              >
                <Text style={styles.modalDoneBtnText}>Back to Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0"
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center"
  },
  headerTitleCol: {
    flex: 1,
    marginLeft: 12
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "750",
    color: "#0F172A"
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2
  },
  artistTargetCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    marginBottom: 16
  },
  artistAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F3E8FF"
  },
  artistName: {
    fontSize: 14,
    fontWeight: "750",
    color: "#0F172A"
  },
  artistMeta: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2
  },
  customBadge: {
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  customBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7C3AED"
  },
  formSection: {
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: "750",
    color: "#0F172A"
  },
  sectionSubheading: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3
  },
  photoGrid: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center"
  },
  photoThumbWrapper: {
    width: 80,
    height: 80,
    borderRadius: 10,
    position: "relative"
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 10,
    resizeMode: "cover"
  },
  deletePhotoBtn: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center"
  },
  addPhotoCard: {
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC"
  },
  addPhotoText: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: "700",
    marginTop: 4
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  chipActive: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED"
  },
  chipText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600"
  },
  chipTextActive: {
    color: Colors.white,
    fontWeight: "700"
  },
  counterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  counterControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10
  },
  counterBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    elevation: 1
  },
  counterValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    minWidth: 20,
    textAlign: "center"
  },
  textArea: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    fontSize: 13,
    color: "#0F172A",
    textAlignVertical: "top",
    minHeight: 90
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
    fontSize: 13,
    color: "#0F172A"
  },
  bottomBar: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0"
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: "750",
    color: Colors.white
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24
  },
  modalContent: {
    width: "100%",
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    elevation: 10
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center"
  },
  modalDesc: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18
  },
  modalButtons: {
    width: "100%",
    gap: 10,
    marginTop: 20
  },
  modalMsgBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center"
  },
  modalMsgBtnText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "750"
  },
  modalDoneBtn: {
    backgroundColor: "#F1F5F9",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center"
  },
  modalDoneBtnText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "700"
  }
});
