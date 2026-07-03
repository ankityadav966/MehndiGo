import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState, useCallback } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomButton from "../../components/CustomButton";
import Colors from "../../constants/Colors";
import { useAuth } from "../../context/AuthContext";
import { getCustomerProfile, updateCustomerProfile } from "../../services/customer";
import { getArtistDetails, updateArtistProfileDetails, uploadPortfolioMedia } from "../../services/artist";
import { secureStorage } from "../../utils/storage";

export default function EditProfileScreen({ navigation }) {
  const { user, dispatch } = useAuth();
  const isArtist = user?.role === "ARTIST";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Common Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUri, setAvatarUri] = useState("");

  // Artist Fields
  const [bio, setBio] = useState("");
  const [experience, setExperience] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [location, setLocation] = useState("");
  const [pincode, setPincode] = useState("");
  const [coverImageUri, setCoverImageUri] = useState("");
  const [languages, setLanguages] = useState("");

  const loadProfileData = useCallback(async () => {
    setLoading(true);
    try {
      if (isArtist) {
        const data = await getArtistDetails();
        setFullName(data.user?.name || "");
        setEmail(data.user?.email || "");
        setPhone(data.user?.phone || "");
        setAvatarUri(data.user?.profile_image || "");
        setBio(data.bio || "");
        setExperience(data.experience_years ? String(data.experience_years) : "");
        setLocation(data.location || "");
        setCity(data.city || "");
        setState(data.state || "");
        setPincode(data.pincode || "");
        setCoverImageUri(data.cover_image || "");
        setLanguages(data.languages || "");
      } else {
        const data = await getCustomerProfile();
        setFullName(data.name || "");
        setEmail(data.email || "");
        setPhone(data.phone || "");
        setAvatarUri(data.profile_image || "");
      }
    } catch (err) {
      console.log("Failed to load profile data:", err);
      Alert.alert("Error", err.message || "Failed to load profile data.");
    } finally {
      setLoading(false);
    }
  }, [isArtist]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProfileData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadProfileData]);

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Please allow access to photos to change profile picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handlePickCoverImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Please allow access to photos to change cover picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setCoverImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert("Validation Error", "Please enter your name");
      return;
    }

    if (email.trim() && !/\S+@\S+\.\S+/.test(email.trim())) {
      Alert.alert("Validation Error", "Please enter a valid email address");
      return;
    }

    if (isArtist) {
      if (experience.trim() !== "" && (isNaN(Number(experience)) || Number(experience) < 0)) {
        Alert.alert("Validation Error", "Experience must be a positive number");
        return;
      }
      if (pincode.trim() !== "" && (pincode.trim().length !== 6 || isNaN(Number(pincode)))) {
        Alert.alert("Validation Error", "Pincode must be a 6-digit number");
        return;
      }
    }

    setSaving(true);
    try {
      let uploadedUrl = null;
      // If photo was changed (local file scheme)
      if (avatarUri && (avatarUri.startsWith("file://") || avatarUri.startsWith("content://"))) {
        const uploadResult = await uploadPortfolioMedia([{ uri: avatarUri }]);
        if (uploadResult && uploadResult.length > 0) {
          uploadedUrl = uploadResult[0].url;
        }
      }

      let uploadedCoverUrl = null;
      // If cover photo was changed (local file scheme)
      if (coverImageUri && (coverImageUri.startsWith("file://") || coverImageUri.startsWith("content://"))) {
        const uploadResult = await uploadPortfolioMedia([{ uri: coverImageUri }]);
        if (uploadResult && uploadResult.length > 0) {
          uploadedCoverUrl = uploadResult[0].url;
        }
      }

      const finalAvatar = uploadedUrl || avatarUri;
      const finalCover = uploadedCoverUrl || coverImageUri;

      if (isArtist) {
        await updateArtistProfileDetails({
          name: fullName.trim(),
          profileImage: finalAvatar,
          coverImage: finalCover,
          bio: bio.trim(),
          experience_years: experience.trim() ? Number(experience) : undefined,
          location: location.trim(),
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim() || undefined,
          languages: languages.trim(),
        });
      } else {
        await updateCustomerProfile({
          name: fullName.trim(),
          email: email.trim(),
          profile_image: finalAvatar,
        });
      }

      // Sync local auth context and secureStorage
      const currentStored = await secureStorage.getUserData();
      const updatedUser = {
        ...currentStored,
        name: fullName.trim(),
        profile_image: finalAvatar,
        avatar: finalAvatar, // Sync avatar key
        email: email.trim(),
      };
      await secureStorage.setUserData(updatedUser);
      dispatch({ type: "UPDATE_USER", payload: updatedUser });

      Alert.alert("Success", "Profile Updated Successfully");
      navigation.goBack();
    } catch (err) {
      console.log("Failed to save profile:", err);
      Alert.alert("Error", err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContainer}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Profile Picture Section */}
          <View style={styles.profileSection}>
            <View style={styles.avatarWrapper}>
              <Image
                source={avatarUri ? { uri: avatarUri } : require("../../assets/images/Henna.jpg")}
                style={styles.profileImage}
              />
              <TouchableOpacity style={styles.cameraButton} onPress={handlePickImage}>
                <Ionicons name="camera" size={18} color={Colors.white} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={handlePickImage}>
              <Text style={styles.changePhoto}>Change Profile Photo</Text>
            </TouchableOpacity>
          </View>

          {/* Cover Image Section */}
          {isArtist && (
            <View style={styles.coverSection}>
              <Text style={styles.sectionLabel}>Cover Image</Text>
              <TouchableOpacity style={styles.coverWrapper} onPress={handlePickCoverImage} activeOpacity={0.8}>
                {coverImageUri ? (
                  <Image source={{ uri: coverImageUri }} style={styles.coverImage} />
                ) : (
                  <View style={styles.coverPlaceholder}>
                    <Ionicons name="image-outline" size={32} color={Colors.textTertiary} />
                    <Text style={styles.coverPlaceholderText}>Upload Cover Image</Text>
                  </View>
                )}
                <View style={styles.coverEditBadge}>
                  <Ionicons name="camera" size={14} color={Colors.white} />
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Form Card */}
          <View style={styles.formCard}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="person-outline"
                size={20}
                color={Colors.textTertiary}
              />
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter Full Name"
                placeholderTextColor={Colors.textTertiary}
                style={styles.input}
              />
            </View>

            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={Colors.textTertiary}
              />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter Email"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="email-address"
                style={styles.input}
              />
            </View>

            <Text style={styles.label}>Phone Number (Read-only)</Text>
            <View style={[styles.inputContainer, styles.disabledInput]}>
              <Ionicons
                name="call-outline"
                size={20}
                color={Colors.textTertiary}
              />
              <TextInput
                value={phone}
                editable={false}
                placeholder="Enter Phone Number"
                placeholderTextColor={Colors.textTertiary}
                style={[styles.input, { color: Colors.textTertiary }]}
              />
            </View>

            {isArtist && (
              <>
                <Text style={styles.label}>Bio</Text>
                <View style={[styles.inputContainer, { height: 80, alignItems: "flex-start", paddingTop: 10 }]}>
                  <Ionicons
                    name="document-text-outline"
                    size={20}
                    color={Colors.textTertiary}
                    style={{ marginTop: 2 }}
                  />
                  <TextInput
                    value={bio}
                    onChangeText={setBio}
                    placeholder="Tell clients about yourself..."
                    placeholderTextColor={Colors.textTertiary}
                    multiline
                    numberOfLines={3}
                    style={[styles.input, { height: 60, textAlignVertical: "top" }]}
                  />
                </View>

                <Text style={styles.label}>Experience (Years)</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="briefcase-outline"
                    size={20}
                    color={Colors.textTertiary}
                  />
                  <TextInput
                    value={experience}
                    onChangeText={setExperience}
                    placeholder="Years of experience"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>

                <Text style={styles.label}>City</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="business-outline"
                    size={20}
                    color={Colors.textTertiary}
                  />
                  <TextInput
                    value={city}
                    onChangeText={setCity}
                    placeholder="City"
                    placeholderTextColor={Colors.textTertiary}
                    style={styles.input}
                  />
                </View>

                <Text style={styles.label}>State</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="map-outline"
                    size={20}
                    color={Colors.textTertiary}
                  />
                  <TextInput
                    value={state}
                    onChangeText={setState}
                    placeholder="State"
                    placeholderTextColor={Colors.textTertiary}
                    style={styles.input}
                  />
                </View>

                <Text style={styles.label}>Location / Address</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="location-outline"
                    size={20}
                    color={Colors.textTertiary}
                  />
                  <TextInput
                    value={location}
                    onChangeText={setLocation}
                    placeholder="Full Address"
                    placeholderTextColor={Colors.textTertiary}
                    style={styles.input}
                  />
                </View>

                <Text style={styles.label}>Pincode</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="pin-outline"
                    size={20}
                    color={Colors.textTertiary}
                  />
                  <TextInput
                    value={pincode}
                    onChangeText={setPincode}
                    placeholder="Pincode"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>

                <Text style={styles.label}>Languages (e.g. English, Hindi)</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="language-outline"
                    size={20}
                    color={Colors.textTertiary}
                  />
                  <TextInput
                    value={languages}
                    onChangeText={setLanguages}
                    placeholder="Languages spoken"
                    placeholderTextColor={Colors.textTertiary}
                    style={styles.input}
                  />
                </View>
              </>
            )}
          </View>

          {/* Save Button */}
          <View style={styles.footer}>
            {saving ? (
              <ActivityIndicator size="large" color={Colors.primary} />
            ) : (
              <CustomButton title="Save Changes" onPress={handleSave} />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primaryLight + "20" },
  scrollContainer: { paddingBottom: 40 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF" },
  loadingText: { marginTop: 12, fontSize: 15, color: Colors.textSecondary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: Colors.text },
  profileSection: { alignItems: "center", marginTop: 10, marginBottom: 25 },
  avatarWrapper: { position: "relative" },
  profileImage: { width: 110, height: 110, borderRadius: 55 },
  cameraButton: {
    position: "absolute",
    right: 0,
    bottom: 5,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  changePhoto: {
    marginTop: 12,
    color: Colors.primary,
    fontWeight: "600",
    fontSize: 14,
  },
  formCard: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 18,
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 8,
    marginTop: 12,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 54,
  },
  disabledInput: {
    backgroundColor: Colors.border + "40",
  },
  input: { flex: 1, marginLeft: 10, fontSize: 15, color: Colors.text },
  footer: { paddingHorizontal: 16, paddingTop: 25 },
  coverSection: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  coverWrapper: {
    height: 150,
    borderRadius: 14,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  coverImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  coverPlaceholder: {
    alignItems: "center",
  },
  coverPlaceholderText: {
    fontSize: 13,
    color: Colors.textTertiary,
    marginTop: 6,
  },
  coverEditBadge: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
});
