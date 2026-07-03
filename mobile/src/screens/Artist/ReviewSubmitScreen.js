import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import { useArtistOnboarding } from "../../context/ArtistOnboardingContext";
import { createArtistProfile } from "../../services/artist";
import { secureStorage } from "../../utils/storage";

export default function ReviewSubmitScreen({ navigation }) {
  const { artistDetails, aadhaarFiles, profilePhoto, submitArtistProfile } =
    useArtistOnboarding();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await createArtistProfile({
        bio: artistDetails.bio,
        experience_years: Number(artistDetails.experienceYears),
        home_service: artistDetails.homeService,
        salon_service: artistDetails.salonService,
        city: artistDetails.city,
        state: artistDetails.state,
        location: artistDetails.location,
        pincode: artistDetails.pincode,
        latitude: artistDetails.latitude || "26.912434",
        longitude: artistDetails.longitude || "75.787270",
        aadhaar_front: aadhaarFiles?.front,
        aadhaar_back: aadhaarFiles?.back,
        selfie_image: profilePhoto,
      });

      await secureStorage.setArtistProfileCompleted(true);
      await secureStorage.setArtistOnboardingDone(true);
      submitArtistProfile();
      navigation.reset({
        index: 0,
        routes: [{ name: "ArtistStack" }],
      });
    } catch (err) {
      if (err.message && err.message.includes("already exists")) {
        await secureStorage.setArtistProfileCompleted(true);
        await secureStorage.setArtistOnboardingDone(true);
        submitArtistProfile();
        navigation.reset({
          index: 0,
          routes: [{ name: "ArtistStack" }],
        });
      } else {
        setError(err.message || "Failed to submit profile. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        <Text style={styles.heading}>Review & Submit</Text>
        <Text style={styles.subHeading}>
          Please review all details before submitting your artist profile.
        </Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons
              name="briefcase-outline"
              size={22}
              color={Colors.primary}
            />
            <Text style={styles.cardTitle}>Professional Info</Text>
          </View>
          <Text style={styles.infoLight}>
            Bio: {artistDetails?.bio || "N/A"}
          </Text>
          <Text style={styles.infoLight}>
            Experience: {artistDetails?.experienceYears || "0"} years
          </Text>
          <Text style={styles.infoLight}>
            Services: {artistDetails?.homeService ? "Home" : ""}
            {artistDetails?.homeService && artistDetails?.salonService
              ? " + "
              : ""}
            {artistDetails?.salonService ? "Salon" : ""}
          </Text>
          <Text style={styles.infoLight}>
            Location: {artistDetails?.location || "N/A"}
          </Text>
          <Text style={styles.infoLight}>
            Pincode: {artistDetails?.pincode || "N/A"}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons
              name="document-text-outline"
              size={22}
              color={Colors.primary}
            />
            <Text style={styles.cardTitle}>Documents</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusText}>Aadhaar Front</Text>
            <Ionicons
              name={
                aadhaarFiles?.front ? "checkmark-circle" : "ellipse-outline"
              }
              size={20}
              color={aadhaarFiles?.front ? Colors.success : Colors.textTertiary}
            />
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusText}>Aadhaar Back</Text>
            <Ionicons
              name={aadhaarFiles?.back ? "checkmark-circle" : "ellipse-outline"}
              size={20}
              color={aadhaarFiles?.back ? Colors.success : Colors.textTertiary}
            />
          </View>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={20} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.noteCard}>
          <Ionicons
            name="information-circle"
            size={22}
            color={Colors.primary}
          />
          <Text style={styles.noteText}>
            After submission our team will review your profile and approve it
            within 24-48 hours.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.disabledBtn]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Application</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.white },
  container: { padding: 20, paddingBottom: 120 },
  heading: { fontSize: 22, fontWeight: "700", color: Colors.text },
  subHeading: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 5,
    marginBottom: 25,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  cardTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  info: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 4,
  },
  infoLight: { fontSize: 13, color: Colors.textSecondary, marginBottom: 4 },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statusText: { fontSize: 14, color: Colors.text },
  errorCard: {
    flexDirection: "row",
    backgroundColor: Colors.error + "15",
    borderRadius: 12,
    padding: 14,
    marginBottom: 15,
    alignItems: "center",
    gap: 10,
  },
  errorText: { flex: 1, color: Colors.error, fontSize: 13 },
  noteCard: {
    flexDirection: "row",
    backgroundColor: Colors.primaryLight + "40",
    borderRadius: 14,
    padding: 15,
    alignItems: "flex-start",
  },
  noteText: {
    flex: 1,
    marginLeft: 10,
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    padding: 20,
  },
  submitBtn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  disabledBtn: { opacity: 0.7 },
  submitBtnText: { color: Colors.white, fontSize: 16, fontWeight: "700" },
});
