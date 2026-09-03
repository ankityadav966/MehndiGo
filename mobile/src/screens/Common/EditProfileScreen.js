import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
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
  Platform,
  Switch
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomButton from "../../components/CustomButton";
import Colors from "../../constants/Colors";
import { useAuth } from "../../context/AuthContext";
import { getCustomerProfile, updateCustomerProfile } from "../../services/customer";
import { getArtistDetails, updateArtistProfileDetails, uploadPortfolioMedia } from "../../services/artist";
import { secureStorage } from "../../utils/storage";
import { resolveImage } from "../../utils/imageHelper";

import AsyncStorage from "@react-native-async-storage/async-storage";

export default function EditProfileScreen({ navigation }) {
  const { user, dispatch } = useAuth();
  const isArtist = String(user?.role || "").toUpperCase() === "ARTIST";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Common Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUri, setAvatarUri] = useState("");
  const [bannerUri, setBannerUri] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");

  // Artist Specific Fields
  const [bio, setBio] = useState("");
  const [experience, setExperience] = useState("");
  const [startingPrice, setStartingPrice] = useState("");
  const [location, setLocation] = useState("");
  const [languages, setLanguages] = useState("");
  const [homeService, setHomeService] = useState(true);
  const [salonService, setSalonService] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("PENDING");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [facebookHandle, setFacebookHandle] = useState("");
  const [serviceRadius, setServiceRadius] = useState("25");

  const loadProfileData = useCallback(async () => {
    setLoading(true);
    try {
      if (isArtist) {
        const data = await getArtistDetails();
        const artistUser = data.user || user || {};
        setFullName(artistUser.name || artistUser.full_name || "");
        setEmail(artistUser.email || "");
        setPhone(artistUser.phone || "");
        
        const photo = data.profile_image || data.selfie_image || data.avatar || artistUser.profile_image || artistUser.avatar || user?.profile_image || user?.avatar;
        if (photo) {
          setAvatarUri(resolveImage(photo));
        }

        const banner = data.banner_image || data.cover_image || data.banner || artistUser.banner_image || artistUser.cover_image;
        if (banner) {
          setBannerUri(resolveImage(banner));
        }

        setBio(data.bio || "");
        setExperience(data.experience_years !== undefined && data.experience_years !== null ? String(data.experience_years) : "");
        setStartingPrice(data.starting_price ? String(data.starting_price) : "");
        setLocation(data.location || "");
        setCity(data.city || "");
        setState(data.state || "");
        setPincode(data.pincode || "");
        setLanguages(data.languages || "English, Hindi");
        setHomeService(data.home_service !== undefined ? Boolean(data.home_service) : true);
        setSalonService(Boolean(data.salon_service));
        setIsAvailable(data.is_available !== undefined ? Boolean(data.is_available) : true);
        setAadhaarNumber(data.aadhaar_number || "");
        setServiceRadius(data.service_radius !== undefined && data.service_radius !== null ? String(data.service_radius) : "25");
        setVerificationStatus(data.verification_status || data.status || "PENDING");

        if (user?.id) {
          const insta = await AsyncStorage.getItem(`@mehndigo_insta_${user.id}`);
          if (insta) setInstagramHandle(insta);
          const fb = await AsyncStorage.getItem(`@mehndigo_fb_${user.id}`);
          if (fb) setFacebookHandle(fb);
        }
      } else {
        const data = await getCustomerProfile();
        setFullName(data.name || data.full_name || "");
        setEmail(data.email || "");
        setPhone(data.phone || "");
        setCity(data.city || "");
        setState(data.state || "");
        setPincode(data.pincode || "");
        if (data.profile_image || data.avatar) {
          setAvatarUri(resolveImage(data.profile_image || data.avatar));
        }
      }
    } catch (err) {
      if (__DEV__) console.log("Failed to load profile data:", err);
      Alert.alert("Error", err.message || "Failed to load profile data.");
    } finally {
      setLoading(false);
    }
  }, [isArtist, user]);

  useEffect(() => {
    loadProfileData();
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
      const uri = result.assets[0].uri;
      setAvatarUri(uri);
    }
  };

  const handlePickBanner = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Please allow access to photos to change profile banner.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      setBannerUri(uri);
    }
  };

  const [fetchingLocation, setFetchingLocation] = useState(false);

  const handleGetLocation = async () => {
    try {
      setFetchingLocation(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Permission to access location was denied. Please enable it in settings.");
        setFetchingLocation(false);
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});
      let geocode = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (geocode && geocode.length > 0) {
        const addr = geocode[0];
        const formattedAddress = [addr.street, addr.subregion, addr.city, addr.region].filter(Boolean).join(", ");
        setLocation(formattedAddress);
      } else {
        setLocation(`${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`);
      }
    } catch (err) {
      Alert.alert("Location Error", "Could not fetch location. Please try again.");
    } finally {
      setFetchingLocation(false);
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

    if (!phone.trim()) {
      Alert.alert("Validation Error", "Please enter your phone number");
      return;
    }

    const cleanPhone = phone.trim().replace(/[^0-9]/g, "");
    if (cleanPhone.length !== 10) {
      Alert.alert("Validation Error", "Phone number must be exactly 10 digits");
      return;
    }

    if (isArtist) {
      if (experience.trim() !== "" && (isNaN(Number(experience)) || Number(experience) < 0)) {
        Alert.alert("Validation Error", "Experience must be a positive number");
        return;
      }
      if (startingPrice.trim() !== "" && (isNaN(Number(startingPrice)) || Number(startingPrice) <= 0)) {
        Alert.alert("Validation Error", "Starting price must be a valid positive amount");
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
      const isLocalAvatar = avatarUri && (avatarUri.startsWith("file://") || avatarUri.startsWith("content://") || avatarUri.startsWith("ph://") || avatarUri.startsWith("assets-library://") || avatarUri.startsWith("/"));
      if (isLocalAvatar) {
        if (__DEV__) console.log('[CLOUDINARY AVATAR UPLOAD START]');
        const uploadResult = await uploadPortfolioMedia([{ uri: avatarUri }]);
        if (uploadResult && uploadResult.length > 0 && uploadResult[0].url) {
          uploadedUrl = uploadResult[0].url;
        } else {
          throw new Error("Failed to upload profile photo. Please try again.");
        }
      }

      let uploadedBannerUrl = null;
      const isLocalBanner = bannerUri && (bannerUri.startsWith("file://") || bannerUri.startsWith("content://") || bannerUri.startsWith("ph://") || bannerUri.startsWith("assets-library://") || bannerUri.startsWith("/"));
      if (isLocalBanner) {
        if (__DEV__) console.log('[CLOUDINARY BANNER UPLOAD START]');
        const bannerUploadResult = await uploadPortfolioMedia([{ uri: bannerUri }]);
        if (bannerUploadResult && bannerUploadResult.length > 0 && bannerUploadResult[0].url) {
          uploadedBannerUrl = bannerUploadResult[0].url;
        } else {
          throw new Error("Failed to upload banner image. Please try again.");
        }
      }

      // If a new photo was uploaded, use uploadedUrl; if unchanged remote URL, use avatarUri; otherwise undefined to preserve DB image
      const finalAvatar = uploadedUrl ? uploadedUrl : (!isLocalAvatar && avatarUri ? avatarUri : undefined);
      const finalBanner = uploadedBannerUrl ? uploadedBannerUrl : (!isLocalBanner && bannerUri ? bannerUri : undefined);

      if (isArtist) {
        const payload = {
          name: fullName.trim(),
          fullName: fullName.trim(),
          full_name: fullName.trim(),
          profile_image: finalAvatar,
          profileImage: finalAvatar,
          avatar: finalAvatar,
          selfie_image: finalAvatar,
          cover_image: finalBanner,
          coverImage: finalBanner,
          banner_image: finalBanner,
          bannerImage: finalBanner,
          bio: bio.trim(),
          experience_years: experience.trim() ? Number(experience) : undefined,
          experience: experience.trim() ? Number(experience) : undefined,
          starting_price: startingPrice.trim() ? Number(startingPrice) : 0,
          startingPrice: startingPrice.trim() ? Number(startingPrice) : 0,
          home_service: homeService,
          homeService: homeService,
          salon_service: salonService,
          salonService: salonService,
          is_available: isAvailable,
          isAvailable: isAvailable,
          service_radius: serviceRadius.trim() ? Number(serviceRadius) : null,
          location: location.trim(),
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim() || undefined,
          languages: languages.trim(),
          phone: cleanPhone,
          email: email.trim(),
        };

        await updateArtistProfileDetails(payload);

        if (user?.id) {
          const cleanInsta = instagramHandle.trim().replace("@", "");
          if (cleanInsta) {
            await AsyncStorage.setItem(`@mehndigo_insta_${user.id}`, cleanInsta);
          } else {
            await AsyncStorage.removeItem(`@mehndigo_insta_${user.id}`);
          }
          const cleanFb = facebookHandle.trim().replace("@", "");
          if (cleanFb) {
            await AsyncStorage.setItem(`@mehndigo_fb_${user.id}`, cleanFb);
          } else {
            await AsyncStorage.removeItem(`@mehndigo_fb_${user.id}`);
          }
        }
      } else {
        await updateCustomerProfile({
          name: fullName.trim(),
          email: email.trim(),
          profile_image: finalAvatar,
          phone: cleanPhone,
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
        });
      }

      // Sync local auth context and secureStorage
      const currentStored = await secureStorage.getUserData();
      const resolvedStoredAvatar = finalAvatar || currentStored?.profile_image || currentStored?.avatar || user?.profile_image || user?.avatar || null;
      const resolvedStoredBanner = finalBanner || currentStored?.banner_image || currentStored?.cover_image || null;
      const updatedUser = {
        ...currentStored,
        name: fullName.trim(),
        full_name: fullName.trim(),
        profile_image: resolvedStoredAvatar,
        avatar: resolvedStoredAvatar,
        banner_image: resolvedStoredBanner,
        cover_image: resolvedStoredBanner,
        email: email.trim(),
        phone: cleanPhone,
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
      };
      await secureStorage.setUserData(updatedUser);
      dispatch({ type: "UPDATE_USER", payload: updatedUser });

      Alert.alert("Success", "Profile Updated Successfully");
      navigation.goBack();
    } catch (err) {
      if (__DEV__) console.log("Failed to save profile:", err);
      const errMsg = err.response?.data?.message || err.message || "Failed to update profile.";
      Alert.alert("Error", errMsg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading profile details...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
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

          {/* Banner & Profile Pictures Section for Artists */}
          {isArtist && (
            <View style={styles.bannerSection}>
              <TouchableOpacity activeOpacity={0.85} style={styles.bannerWrapper} onPress={handlePickBanner}>
                {bannerUri ? (
                  <Image source={{ uri: bannerUri }} style={styles.bannerImage} resizeMode="cover" />
                ) : (
                  <View style={styles.bannerPlaceholder}>
                    <Ionicons name="image-outline" size={32} color={Colors.primary} />
                    <Text style={styles.bannerPlaceholderText}>Tap to add Profile Banner Photo</Text>
                  </View>
                )}
                <View style={styles.bannerEditBtn}>
                  <Ionicons name="camera" size={16} color={Colors.white} />
                  <Text style={styles.bannerEditText}>{bannerUri ? "Change Banner" : "Add Banner"}</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

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

          {/* Status Banner */}
          {isArtist && verificationStatus && (
            <View style={{ marginHorizontal: 16 }}>
              <View style={[
                styles.statusBanner,
                verificationStatus === "APPROVED" ? styles.statusApproved : (verificationStatus === "REJECTED" ? styles.statusRejected : styles.statusPending)
              ]}>
                <Ionicons
                  name={verificationStatus === "APPROVED" ? "checkmark-circle" : (verificationStatus === "REJECTED" ? "close-circle" : "time")}
                  size={20}
                  color={verificationStatus === "APPROVED" ? "#16A34A" : (verificationStatus === "REJECTED" ? "#DC2626" : "#D97706")}
                />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.statusTitle}>KYC Verification: {verificationStatus}</Text>
                  <Text style={styles.statusSubtitle}>
                    {verificationStatus === "APPROVED" ? "Your profile is verified and visible to clients." : (verificationStatus === "REJECTED" ? "Application rejected. Please check details." : "Application under admin review.")}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Personal Info Card */}
          <View style={styles.cardGroup}>
            <Text style={styles.sectionHeader}>Personal Information</Text>

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
                autoCapitalize="none"
                style={styles.input}
              />
            </View>

            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="call-outline"
                size={20}
                color={Colors.textTertiary}
              />
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter Phone Number"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="phone-pad"
                maxLength={10}
                style={styles.input}
              />
            </View>
          </View>

          {/* Location Card */}
          <View style={styles.cardGroup}>
            <Text style={styles.sectionHeader}>Location Details</Text>

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
                placeholder="City (e.g. Jaipur)"
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
                placeholder="State (e.g. Rajasthan)"
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
                placeholder="6-digit Pincode"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="numeric"
                maxLength={6}
                style={styles.input}
              />
            </View>
          </View>

          {isArtist && (
            <>
              {/* Professional Card */}
              <View style={styles.cardGroup}>
                <Text style={styles.sectionHeader}>Professional & Service Info</Text>

                <Text style={styles.label}>Bio</Text>
                <View style={[styles.inputContainer, { height: 84, alignItems: "flex-start", paddingTop: 10 }]}>
                  <Ionicons
                    name="document-text-outline"
                    size={20}
                    color={Colors.textTertiary}
                    style={{ marginTop: 2 }}
                  />
                  <TextInput
                    value={bio}
                    onChangeText={setBio}
                    placeholder="Tell clients about your mehndi style and background..."
                    placeholderTextColor={Colors.textTertiary}
                    multiline
                    numberOfLines={3}
                    style={[styles.input, { height: 64, textAlignVertical: "top" }]}
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
                    placeholder="Years of experience (e.g. 5)"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>

                <Text style={styles.label}>Starting Service Price (₹)</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="cash-outline"
                    size={20}
                    color={Colors.primary}
                  />
                  <TextInput
                    value={startingPrice}
                    onChangeText={setStartingPrice}
                    placeholder="Starting Price (Optional)"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>

                <Text style={styles.label}>Studio / Workshop Address</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="location-outline"
                    size={20}
                    color={Colors.textTertiary}
                  />
                  <TextInput
                    value={location}
                    onChangeText={setLocation}
                    placeholder="Full Studio Address or Area"
                    placeholderTextColor={Colors.textTertiary}
                    style={[styles.input, { flex: 1 }]}
                  />
                  <TouchableOpacity onPress={handleGetLocation} disabled={fetchingLocation} style={{ padding: 5 }}>
                    {fetchingLocation ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <Ionicons name="navigate" size={24} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Service Radius (km)</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
                  {[10, 15, 25].map((radius) => (
                    <TouchableOpacity
                      key={radius}
                      onPress={() => setServiceRadius(radius.toString())}
                      style={{
                        flex: 1,
                        marginHorizontal: 5,
                        paddingVertical: 10,
                        borderWidth: 1,
                        borderColor: serviceRadius === radius.toString() ? Colors.primary : Colors.border,
                        backgroundColor: serviceRadius === radius.toString() ? Colors.primary + '1A' : Colors.surface,
                        borderRadius: 8,
                        alignItems: 'center'
                      }}
                    >
                      <Text style={{ 
                        color: serviceRadius === radius.toString() ? Colors.primary : Colors.textSecondary,
                        fontWeight: serviceRadius === radius.toString() ? 'bold' : 'normal'
                      }}>
                        {radius} KM
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Languages Spoken</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="language-outline"
                    size={20}
                    color={Colors.textTertiary}
                  />
                  <TextInput
                    value={languages}
                    onChangeText={setLanguages}
                    placeholder="e.g. Hindi, English, Rajasthani"
                    placeholderTextColor={Colors.textTertiary}
                    style={styles.input}
                  />
                </View>

                {/* Service Types & Availability Switches */}
                <View style={[styles.switchRow, { borderTopWidth: 1, borderTopColor: Colors.border + "50", marginTop: 10 }]}>
                  <View style={styles.switchLabelContainer}>
                    <Ionicons name="home-outline" size={20} color={Colors.textSecondary} />
                    <View style={{ marginLeft: 10 }}>
                      <Text style={styles.switchTitle}>Home Service</Text>
                      <Text style={styles.switchSubtitle}>Travel to client&apos;s location for bookings</Text>
                    </View>
                  </View>
                  <Switch
                    value={homeService}
                    onValueChange={setHomeService}
                    trackColor={{ false: Colors.border, true: Colors.primary }}
                    thumbColor={Colors.white}
                  />
                </View>

                <View style={styles.switchRow}>
                  <View style={styles.switchLabelContainer}>
                    <Ionicons name="business-outline" size={20} color={Colors.textSecondary} />
                    <View style={{ marginLeft: 10 }}>
                      <Text style={styles.switchTitle}>Salon / Studio Service</Text>
                      <Text style={styles.switchSubtitle}>Host clients at your studio/salon</Text>
                    </View>
                  </View>
                  <Switch
                    value={salonService}
                    onValueChange={setSalonService}
                    trackColor={{ false: Colors.border, true: Colors.primary }}
                    thumbColor={Colors.white}
                  />
                </View>

                <View style={styles.switchRow}>
                  <View style={styles.switchLabelContainer}>
                    <Ionicons name="radio-button-on" size={20} color={isAvailable ? "#16A34A" : Colors.textTertiary} />
                    <View style={{ marginLeft: 10 }}>
                      <Text style={styles.switchTitle}>Accepting New Bookings</Text>
                      <Text style={styles.switchSubtitle}>Turn off if temporarily unavailable</Text>
                    </View>
                  </View>
                  <Switch
                    value={isAvailable}
                    onValueChange={setIsAvailable}
                    trackColor={{ false: Colors.border, true: "#16A34A" }}
                    thumbColor={Colors.white}
                  />
                </View>

                {/* Secure KYC Identity Badge */}
                {aadhaarNumber ? (
                  <View style={styles.kycCard}>
                    <View style={styles.kycHeader}>
                      <Ionicons name="shield-checkmark" size={22} color={Colors.primary} />
                      <Text style={styles.kycTitle}>Verified Aadhaar Identity</Text>
                    </View>
                    <Text style={styles.kycNumber}>{aadhaarNumber}</Text>
                    <Text style={styles.kycNote}>Government ID securely stored. Masked for your privacy.</Text>
                  </View>
                ) : null}
              </View>

              {/* Social Handles Card */}
              <View style={styles.cardGroup}>
                <Text style={styles.sectionHeader}>Social Handles</Text>

                <Text style={styles.label}>Instagram Handle</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="logo-instagram"
                    size={20}
                    color="#E1306C"
                  />
                  <TextInput
                    value={instagramHandle}
                    onChangeText={setInstagramHandle}
                    placeholder="e.g. username"
                    placeholderTextColor={Colors.textTertiary}
                    autoCapitalize="none"
                    style={styles.input}
                  />
                </View>

                <Text style={styles.label}>Facebook Handle</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="logo-facebook"
                    size={20}
                    color="#1877F2"
                  />
                  <TextInput
                    value={facebookHandle}
                    onChangeText={setFacebookHandle}
                    placeholder="e.g. username or profile link"
                    placeholderTextColor={Colors.textTertiary}
                    autoCapitalize="none"
                    style={styles.input}
                  />
                </View>
              </View>
            </>
          )}

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
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
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
  cardGroup: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 12,
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.primary,
    marginBottom: 8,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  statusApproved: { backgroundColor: "#DCFCE7", borderWidth: 1, borderColor: "#86EFAC" },
  statusPending: { backgroundColor: "#FEF3C7", borderWidth: 1, borderColor: "#FCD34D" },
  statusRejected: { backgroundColor: "#FEE2E2", borderWidth: 1, borderColor: "#FCA5A5" },
  statusTitle: { fontSize: 13, fontWeight: "700", color: Colors.text },
  statusSubtitle: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 4,
    marginTop: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  input: { flex: 1, marginLeft: 8, fontSize: 14, color: Colors.text },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + "50",
  },
  switchLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 10,
  },
  switchTitle: { fontSize: 13, fontWeight: "600", color: Colors.text },
  switchSubtitle: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  kycCard: {
    backgroundColor: Colors.primaryLight + "15",
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
    marginBottom: 8,
  },
  kycHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  kycTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
    marginLeft: 8,
  },
  kycNumber: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
    letterSpacing: 2,
    marginVertical: 4,
  },
  kycNote: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  bannerSection: {
    marginHorizontal: 16,
    marginBottom: 10,
    marginTop: 4,
  },
  bannerWrapper: {
    height: 140,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: Colors.primaryLight + "30",
    borderWidth: 1,
    borderColor: Colors.border,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  bannerPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
  },
  bannerPlaceholderText: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
  },
  bannerEditBtn: {
    position: "absolute",
    right: 10,
    bottom: 10,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  bannerEditText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "600",
  },
  footer: { paddingHorizontal: 16, paddingTop: 25 },
});
