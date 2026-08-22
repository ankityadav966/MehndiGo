import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState, useMemo } from "react";
import {
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Modal,
  TextInput,
  Linking
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import EmptyState from "../../components/EmptyState";
import { SkeletonGrid } from "../../components/LoadingSkeleton";
import Colors from "../../constants/Colors";
import { useAuth } from "../../context/AuthContext";
import { usePortfolio } from "../../context/PortfolioContext";
import { getArtistDetails, getArtistPortfolio, getArtistServices, updateArtistProfileDetails, uploadPortfolioMedia } from "../../services/artist";
import { secureStorage } from "../../utils/storage";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GRID_SPACING = 2;
const COLUMN_COUNT = 3;
const ITEM_SIZE =
  (SCREEN_WIDTH - GRID_SPACING * (COLUMN_COUNT + 1)) / COLUMN_COUNT;

const TABS = ["Posts", "Videos", "Services"];

export default function ArtistProfileScreen({ navigation }) {
  const { user, dispatch } = useAuth();
  const {
    portfolios,
    loading,
    refreshing,
    fetchPortfolios,
    refreshPortfolios,
  } = usePortfolio();
  const [activeTab, setActiveTab] = useState("Posts");
  const [profile, setProfile] = useState(user ? { user } : null);
  const [profileLoading, setProfileLoading] = useState(!user);

  const [instagramHandle, setInstagramHandle] = useState("");
  const [facebookHandle, setFacebookHandle] = useState("");
  const [instagramModalVisible, setInstagramModalVisible] = useState(false);
  const [facebookModalVisible, setFacebookModalVisible] = useState(false);
  const [tempInsta, setTempInsta] = useState("");
  const [tempFB, setTempFB] = useState("");

  useEffect(() => {
    if (user?.id) {
      AsyncStorage.getItem(`@mehndigo_insta_${user.id}`).then(val => {
        if (val) setInstagramHandle(val);
      });
      AsyncStorage.getItem(`@mehndigo_fb_${user.id}`).then(val => {
        if (val) setFacebookHandle(val);
      });
    }
  }, [user]);

  const handleInstagramConnect = () => {
    if (instagramHandle) {
      Alert.alert("Disconnect Instagram", "Are you sure you want to disconnect your Instagram profile?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            setInstagramHandle("");
            if (user?.id) {
              await AsyncStorage.removeItem(`@mehndigo_insta_${user.id}`);
            }
          }
        }
      ]);
    } else {
      setTempInsta("");
      setInstagramModalVisible(true);
    }
  };

  const handleFacebookConnect = () => {
    if (facebookHandle) {
      Alert.alert("Disconnect Facebook", "Are you sure you want to disconnect your Facebook profile?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            setFacebookHandle("");
            if (user?.id) {
              await AsyncStorage.removeItem(`@mehndigo_fb_${user.id}`);
            }
          }
        }
      ]);
    } else {
      setTempFB("");
      setFacebookModalVisible(true);
    }
  };

  const openSocialLink = async (platform, handle) => {
    if (!handle) return;
    try {
      if (platform === "instagram") {
        const appUrl = `instagram://user?username=${handle}`;
        const webUrl = `https://instagram.com/${handle}`;
        const supported = await Linking.canOpenURL(appUrl);
        if (supported) {
          await Linking.openURL(appUrl);
        } else {
          await Linking.openURL(webUrl);
        }
      } else if (platform === "facebook") {
        let webUrl = handle;
        if (!handle.startsWith("http://") && !handle.startsWith("https://")) {
          webUrl = `https://facebook.com/${handle}`;
        }
        let fbUsername = handle;
        if (handle.includes("facebook.com/")) {
          fbUsername = handle.split("facebook.com/")[1].split("/")[0].split("?")[0];
        }
        const appUrl = `fb://profile/${fbUsername}`;
        const supported = await Linking.canOpenURL(appUrl);
        if (supported) {
          await Linking.openURL(appUrl);
        } else {
          await Linking.openURL(webUrl);
        }
      }
    } catch (e) {
      if (__DEV__) console.log("Could not open link:", e.message);
      const webUrl = platform === "instagram" ? `https://instagram.com/${handle}` : (handle.startsWith("http") ? handle : `https://facebook.com/${handle}`);
      Linking.openURL(webUrl).catch(() => Alert.alert("Error", "Could not open link."));
    }
  };

  const saveInstagram = async () => {
    let input = tempInsta.trim();
    if (!input) {
      Alert.alert("Validation Error", "Please enter a username or Instagram URL.");
      return;
    }
    if (input.includes("instagram.com/")) {
      const parts = input.split("instagram.com/")[1].split("/");
      input = parts[0].split("?")[0];
    }
    input = input.replace("@", "");
    const regex = /^[a-zA-Z0-9._]+$/;
    if (!regex.test(input)) {
      Alert.alert("Validation Error", "Username contains invalid characters. Only letters, numbers, dots, and underscores are allowed.");
      return;
    }
    setInstagramHandle(input);
    setInstagramModalVisible(false);
    if (user?.id) {
      await AsyncStorage.setItem(`@mehndigo_insta_${user.id}`, input);
    }
  };

  const saveFacebook = async () => {
    let input = tempFB.trim();
    if (!input) {
      Alert.alert("Validation Error", "Please enter a username, page handle or Facebook URL.");
      return;
    }
    if (input.includes("facebook.com/")) {
      const parts = input.split("facebook.com/")[1].split("/");
      input = parts[0].split("?")[0];
    }
    input = input.replace("@", "");
    const regex = /^[a-zA-Z0-9.]+$/;
    if (!regex.test(input)) {
      Alert.alert("Validation Error", "Facebook handle contains invalid characters. Only letters, numbers, and dots are allowed.");
      return;
    }
    setFacebookHandle(input);
    setFacebookModalVisible(false);
    if (user?.id) {
      await AsyncStorage.setItem(`@mehndigo_fb_${user.id}`, input);
    }
  };

  const resolveImage = (uri, videoUrl) => {
    const target = uri || videoUrl;
    const placeholder = "https://images.unsplash.com/photo-1590012357675-bc55909793fb?w=300";
    if (!target) return placeholder;
    let finalUrl = target;
    if (!target.startsWith("http://") && !target.startsWith("https://") && !target.startsWith("file://") && !target.startsWith("content://")) {
      const cleanUri = target.startsWith("/") ? target : `/${target}`;
      const { SOCKET_URL } = require("../../services/api");
      finalUrl = `${SOCKET_URL}${cleanUri}`;
    }
    if (finalUrl.includes("/video/upload/")) {
      return finalUrl
        .replace("/video/upload/", "/video/upload/so_0,f_jpg/")
        .replace(/\.(mp4|mov|3gp|mkv|webm|avi|flv)$/i, ".jpg");
    }
    return finalUrl;
  };

  const [portfolioItems, setPortfolioItems] = useState([]);
  const [portfolioLoading, setPortfolioLoading] = useState(true);
  const [refreshingState, setRefreshingState] = useState(false);

  const handleUploadAvatar = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Required", "Please allow photo library access to change your profile picture.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProfileLoading(true);
        const pickedUri = result.assets[0].uri;
        const uploadResult = await uploadPortfolioMedia([{ uri: pickedUri }]);
        
        if (uploadResult && uploadResult.length > 0) {
          const uploadedUrl = uploadResult[0].url;

          // Save on backend
          await updateArtistProfileDetails({
            profileImage: uploadedUrl,
          });

          // Update local secure storage
          const currentStored = await secureStorage.getUserData();
          const updatedUser = {
            ...currentStored,
            profile_image: uploadedUrl,
            avatar: uploadedUrl,
          };
          await secureStorage.setUserData(updatedUser);

          // Dispatch updated user info to AuthContext
          dispatch({ type: "UPDATE_USER", payload: updatedUser });

          // Update local profile state
          setProfile((prev) => ({
            ...prev,
            profile_image: uploadedUrl,
            selfie_image: uploadedUrl,
            avatar: uploadedUrl,
            user: {
              ...prev?.user,
              profile_image: uploadedUrl,
              avatar: uploadedUrl,
            },
          }));

          Alert.alert("Success", "Profile photo updated successfully!");
        }
      }
    } catch (err) {
      if (__DEV__) console.log("Failed to upload avatar:", err);
      Alert.alert("Error", err.message || "Failed to upload avatar.");
    } finally {
      setProfileLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const data = await getArtistDetails();
      const servicesData = await getArtistServices().catch(() => []);
      setProfile({ ...data, services: servicesData });
    } catch (err) {
      if (__DEV__) console.log("Failed to fetch artist details:", err?.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const fetchArtistPortfolioItems = async () => {
    try {
      const data = await getArtistPortfolio();
      setPortfolioItems(data || []);
    } catch (err) {
      if (__DEV__) console.log("Failed to fetch portfolio items:", err?.message);
    } finally {
      setPortfolioLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshingState(true);
    try {
      await Promise.all([
        refreshPortfolios(),
        fetchProfile(),
        fetchArtistPortfolioItems(),
      ]);
    } catch (err) {
      if (__DEV__) console.log("Failed to refresh profile:", err);
    } finally {
      setRefreshingState(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchArtistPortfolioItems();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      fetchProfile();
      fetchArtistPortfolioItems();
    });
    return unsubscribe;
  }, [navigation]);

  const filteredPortfolios = useMemo(() => {
    if (activeTab === "Services") {
      return profile?.services || [];
    }
    return portfolioItems.filter((item) => {
      if (activeTab === "Posts") return !item.video_url;
      if (activeTab === "Videos") return !!item.video_url;
      return true;
    });
  }, [activeTab, profile?.services, portfolioItems]);

  const renderGridItem = (item, index) => {
    const isService = activeTab === "Services";
    const rawUri = isService ? (item.service_image || "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=500") : (item.image_url || item.video_url);
    const uri = resolveImage(rawUri, item.video_url);
    const isVideo = !isService && !!item.video_url;
    const title = isService ? item.specialization_name : item.title;

    return (
      <TouchableOpacity
        key={item.id ? `${activeTab}-${item.id}` : `${activeTab}-idx-${index}`}
        activeOpacity={0.85}
        style={styles.gridItem}
        onPress={() => {
          if (isService) {
            navigation.navigate("ServiceDetails", { id: item.id });
          } else if (isVideo) {
            if (__DEV__) console.log("[PORTFOLIO VIDEO URL]", item.video_url);
            navigation.navigate("VideoPlayer", {
              videoUrl: item.video_url,
              title: item.title || "Portfolio Video"
            });
          } else {
            navigation.navigate("PortfolioDetail", { portfolio: item });
          }
        }}
      >
        <Image source={{ uri }} style={styles.gridImage} />
        {isVideo && (
          <View style={styles.videoBadge}>
            <Ionicons name="play" size={14} color={Colors.white} />
          </View>
        )}
        {title ? (
          <View style={styles.gridOverlay}>
            <Text style={styles.gridLabel} numberOfLines={1}>
              {title}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  const renderContent = () => {
    const isService = activeTab === "Services";
    const isContentLoading = isService ? loading : portfolioLoading;

    if (isContentLoading && filteredPortfolios.length === 0) {
      return <SkeletonGrid count={9} columns={3} />;
    }

    if (!isContentLoading && filteredPortfolios.length === 0) {
      return (
        <EmptyState
          icon="portfolio"
          title={
            activeTab === "Posts"
              ? "No Posts Yet"
              : activeTab === "Videos"
                ? "No Videos Yet"
                : "No Services Yet"
          }
          message={
            activeTab === "Posts"
              ? "Tap Add Portfolio to share your work"
              : activeTab === "Videos"
                ? "Upload videos to showcase your skills"
                : "Add services to get more bookings"
          }
          actionLabel={isService ? "Add Service" : "Add Portfolio"}
          onAction={() => navigation.navigate(isService ? "AddService" : "AddPortfolio")}
        />
      );
    }

    return (
      <View style={styles.grid}>{filteredPortfolios.map(renderGridItem)}</View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || refreshingState}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.username}>{user?.name || "Artist"}</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons
                name="notifications-outline"
                size={22}
                color={Colors.text}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate("Settings")}>
              <Ionicons name="menu-outline" size={22} color={Colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.profileSection}>
          <View style={styles.profileTopHeader}>
            <View style={styles.avatarContainer}>
              <Image
                source={
                  (() => {
                    const raw = profile?.profile_image || profile?.user?.profile_image || profile?.selfie_image || profile?.avatar || user?.profile_image || user?.avatar;
                    const resolved = resolveImage(raw);
                    return resolved ? { uri: resolved } : require("../../assets/images/Henna.jpg");
                  })()
                }
                style={styles.avatar}
              />
            </View>

            <View style={styles.profileMainInfo}>
              <Text style={styles.name}>
                {profile?.user?.name || profile?.name || user?.name || "Mehendi Artist"}
              </Text>
              {profile?.user?.email || profile?.email || user?.email ? (
                <Text style={styles.email}>{profile?.user?.email || profile?.email || user?.email}</Text>
              ) : null}
              {profile?.city || profile?.location ? (
                <Text style={{ fontSize: 12, color: Colors.textSecondary, marginTop: 2 }} numberOfLines={1}>
                  📍 {profile?.city ? `${profile.city}${profile?.state ? `, ${profile.state}` : ''}` : profile?.location}
                </Text>
              ) : null}
              {profile?.starting_price ? (
                <Text style={{ fontSize: 13, color: Colors.primary, fontWeight: "700", marginTop: 3 }}>
                  Starts at ₹{profile.starting_price}
                </Text>
              ) : null}
              {profile?.rating ? (
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color="#F5A623" />
                  <Text style={styles.ratingText}>{profile.rating}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {profile?.bio || user?.bio ? (
            <View style={styles.bioContainer}>
              <Text style={styles.bio}>{profile?.bio || user?.bio}</Text>
            </View>
          ) : null}

          {/* Profile Videos Section */}
          {(profile?.intro_video || profile?.portfolio_video) ? (
            <View style={[styles.bioContainer, { borderTopWidth: 1, borderColor: Colors.border, paddingTop: 10, marginTop: 5 }]}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.text, marginBottom: 8 }}>Profile Videos</Text>
              <View style={{ flexDirection: "row", gap: 12 }}>
                {profile.intro_video ? (
                  <TouchableOpacity
                    style={styles.selfVideoCard}
                    onPress={() => navigation.navigate("VideoPlayer", { videoUrl: profile.intro_video, title: "Introduction Video" })}
                  >
                    <Ionicons name="play-circle" size={24} color={Colors.primary} />
                    <Text style={styles.selfVideoText}>Intro Video</Text>
                  </TouchableOpacity>
                ) : null}
                {profile.portfolio_video ? (
                  <TouchableOpacity
                    style={styles.selfVideoCard}
                    onPress={() => navigation.navigate("VideoPlayer", { videoUrl: profile.portfolio_video, title: "Portfolio Video" })}
                  >
                    <Ionicons name="play-circle" size={24} color={Colors.primary} />
                    <Text style={styles.selfVideoText}>Portfolio Video</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* Stats Bar */}
          <View style={styles.statsBar}>
            <TouchableOpacity 
              style={styles.statsDividerItem}
              onPress={() => navigation.navigate("Bookings")}
            >
              <Text style={styles.statValue}>
                {profile?.bookingStats?.total ?? "0"}
              </Text>
              <Text style={styles.statLabel}>Bookings</Text>
              <View style={{ flexDirection: "row", gap: 4, marginTop: 4, flexWrap: "wrap", justifyContent: "center" }}>
                <Text style={{ fontSize: 9, color: Colors.primary, fontWeight: "600" }}>P:{profile?.bookingStats?.pending ?? 0}</Text>
                <Text style={{ fontSize: 9, color: Colors.success, fontWeight: "600" }}>C:{profile?.bookingStats?.completed ?? 0}</Text>
                <Text style={{ fontSize: 9, color: Colors.error, fontWeight: "600" }}>Can:{profile?.bookingStats?.cancelled ?? 0}</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.statsSeparator} />
            <View style={styles.statsDividerItem}>
              <Text style={styles.statValue}>
                {profile?.experience_years ?? profile?.experience ?? profile?.experienceYears ?? "0"}
              </Text>
              <Text style={styles.statLabel}>Experience</Text>
            </View>
            <View style={styles.statsSeparator} />
            <View style={styles.statsDividerItem}>
              <Text style={styles.statValue}>{portfolioItems.length || portfolios.length}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.editProfileBtn}
              onPress={() => navigation.navigate("EditProfile")}
            >
              <Text style={styles.editProfileText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addPortfolioBtn}
              onPress={() => navigation.navigate("AddPortfolio")}
            >
              <Ionicons name="add" size={18} color={Colors.white} />
              <Text style={styles.addPortfolioText}>Add Portfolio</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Professional Details & Services Card */}
        <View style={styles.detailsCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardSectionTitle}>Professional Details & KYC</Text>
            <TouchableOpacity onPress={() => navigation.navigate("EditProfile")}>
              <Text style={styles.cardActionText}>Edit</Text>
            </TouchableOpacity>
          </View>

          {/* Service Badges & Pricing */}
          <View style={styles.badgeRow}>
            {profile?.starting_price ? (
              <View style={[styles.infoBadge, { backgroundColor: "#FFF0F0", borderColor: "#FFD0D0" }]}>
                <Ionicons name="pricetag" size={13} color={Colors.primary} />
                <Text style={[styles.infoBadgeText, { color: Colors.primary, fontWeight: "700" }]}>
                  Starts at ₹{profile.starting_price}
                </Text>
              </View>
            ) : null}

            {profile?.home_service !== false ? (
              <View style={[styles.infoBadge, { backgroundColor: "#E6F4EA", borderColor: "#CEEAD6" }]}>
                <Ionicons name="home" size={13} color={Colors.success} />
                <Text style={[styles.infoBadgeText, { color: Colors.success }]}>Home Service</Text>
              </View>
            ) : null}

            {profile?.salon_service ? (
              <View style={[styles.infoBadge, { backgroundColor: "#E8F0FE", borderColor: "#D2E3FC" }]}>
                <Ionicons name="business" size={13} color="#1A73E8" />
                <Text style={[styles.infoBadgeText, { color: "#1A73E8" }]}>Studio / Salon</Text>
              </View>
            ) : null}

            <View style={[styles.infoBadge, { backgroundColor: profile?.is_available !== false ? "#E6F4EA" : "#FEF3C7", borderColor: profile?.is_available !== false ? "#CEEAD6" : "#FDE68A" }]}>
              <View style={[styles.statusDot, { backgroundColor: profile?.is_available !== false ? Colors.success : Colors.warning }]} />
              <Text style={[styles.infoBadgeText, { color: profile?.is_available !== false ? Colors.success : "#B45309" }]}>
                {profile?.is_available !== false ? "Accepting Bookings" : "Unavailable"}
              </Text>
            </View>
          </View>

          {/* Detailed Location & Address */}
          <View style={styles.detailItemRow}>
            <Ionicons name="location-outline" size={18} color={Colors.textSecondary} style={styles.detailIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.detailLabel}>Studio Location & Address</Text>
              <Text style={styles.detailValue}>
                {profile?.location || profile?.locality
                  ? `${profile.location || profile.locality}${profile?.city ? `, ${profile.city}` : ''}${profile?.state ? `, ${profile.state}` : ''}${profile?.pincode ? ` - ${profile.pincode}` : ''}`
                  : (profile?.city ? `${profile.city}${profile?.state ? `, ${profile.state}` : ''}${profile?.pincode ? ` - ${profile.pincode}` : ''}` : "Location not specified")}
              </Text>
            </View>
          </View>

          {/* Languages Spoken */}
          {profile?.languages ? (
            <View style={styles.detailItemRow}>
              <Ionicons name="language-outline" size={18} color={Colors.textSecondary} style={styles.detailIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Languages Spoken</Text>
                <Text style={styles.detailValue}>{profile.languages}</Text>
              </View>
            </View>
          ) : null}

          {/* Verified KYC Identity Box */}
          <View style={styles.kycSectionBox}>
            <View style={styles.kycLeft}>
              <View style={styles.kycShieldCircle}>
                <Ionicons name="shield-checkmark" size={18} color={Colors.success} />
              </View>
              <View>
                <Text style={styles.kycTitle}>Government ID (Aadhaar KYC)</Text>
                <Text style={styles.kycMaskedNumber}>
                  {profile?.aadhaar_number || "•••• •••• Verified"}
                </Text>
              </View>
            </View>
            <View style={[styles.kycBadgePill, { backgroundColor: profile?.verification_status === "APPROVED" ? "#E6F4EA" : "#FEF3C7" }]}>
              <Text style={[styles.kycBadgeText, { color: profile?.verification_status === "APPROVED" ? Colors.success : "#B45309" }]}>
                {profile?.verification_status || "PENDING"}
              </Text>
            </View>
          </View>
        </View>

        {/* Social Connections (View-Only / Click to Open) */}
        <View style={styles.socialCard}>
          <Text style={styles.socialSectionTitle}>Social Connections</Text>
          
          {/* Instagram */}
          <View style={styles.socialRow}>
            <TouchableOpacity 
              style={styles.socialLeft} 
              activeOpacity={instagramHandle ? 0.7 : 1}
              onPress={() => instagramHandle ? openSocialLink("instagram", instagramHandle) : navigation.navigate("EditProfile")}
            >
              <View style={[styles.socialIconCircle, { backgroundColor: "#FFE5EC" }]}>
                <Ionicons name="logo-instagram" size={20} color="#E1306C" />
              </View>
              <View>
                <Text style={styles.socialLabel}>Instagram</Text>
                <Text style={[styles.socialValue, instagramHandle && { color: Colors.primary, fontWeight: "600" }]}>
                  {instagramHandle ? `@${instagramHandle}` : "Not Connected"}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.connectBtn} 
              onPress={() => instagramHandle ? openSocialLink("instagram", instagramHandle) : navigation.navigate("EditProfile")}
            >
              <Text style={styles.connectBtnText}>
                {instagramHandle ? "View" : "Edit"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Facebook */}
          <View style={styles.socialRow}>
            <TouchableOpacity 
              style={styles.socialLeft} 
              activeOpacity={facebookHandle ? 0.7 : 1}
              onPress={() => facebookHandle ? openSocialLink("facebook", facebookHandle) : navigation.navigate("EditProfile")}
            >
              <View style={[styles.socialIconCircle, { backgroundColor: "#E8F0FE" }]}>
                <Ionicons name="logo-facebook" size={20} color="#1877F2" />
              </View>
              <View>
                <Text style={styles.socialLabel}>Facebook</Text>
                <Text style={[styles.socialValue, facebookHandle && { color: "#1877F2", fontWeight: "600" }]}>
                  {facebookHandle ? `${facebookHandle}` : "Not Connected"}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.connectBtn} 
              onPress={() => facebookHandle ? openSocialLink("facebook", facebookHandle) : navigation.navigate("EditProfile")}
            >
              <Text style={styles.connectBtnText}>
                {facebookHandle ? "View" : "Edit"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabBar}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Ionicons
                name={
                  tab === "Posts"
                    ? "grid-outline"
                    : tab === "Videos"
                      ? "videocam-outline"
                      : "apps-outline"
                }
                size={20}
                color={activeTab === tab ? Colors.text : Colors.textTertiary}
              />
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === tab && styles.activeTabLabel,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.divider} />

        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  username: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
  },
  headerIcons: {
    flexDirection: "row",
    gap: 12,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  profileSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  profileTopHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 16,
  },
  profileMainInfo: {
    flex: 1,
    justifyContent: "center",
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  addAvatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.white,
  },
  statsBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 16,
  },
  statsDividerItem: {
    flex: 1,
    alignItems: "center",
  },
  statsSeparator: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
  },
  email: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
  },
  bioContainer: {
    backgroundColor: Colors.inputBackground,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  bio: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },
  selfVideoCard: {
    flex: 1,
    flexDirection: "row",
    height: 44,
    backgroundColor: Colors.inputBackground || "#F5F5F5",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  selfVideoText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  location: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  editProfileBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.white,
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
  },
  addPortfolioBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  addPortfolioText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.white,
  },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: Colors.text,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.textTertiary,
  },
  activeTabLabel: {
    color: Colors.text,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingLeft: GRID_SPACING,
  },
  gridItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    marginRight: GRID_SPACING,
    marginBottom: GRID_SPACING,
    backgroundColor: Colors.inputBackground,
    position: "relative",
  },
  gridImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  videoBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  gridOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  gridLabel: {
    fontSize: 11,
    color: Colors.white,
    fontWeight: "500",
  },
  socialCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  socialSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 12,
  },
  socialRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + "50",
  },
  socialLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  socialIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  socialLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
  },
  socialValue: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  connectBtn: {
    backgroundColor: Colors.primaryLight + "30",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  disconnectBtn: {
    backgroundColor: Colors.errorLight + "20",
  },
  connectBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
  },
  disconnectBtnText: {
    color: Colors.error,
  },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    textAlign: "center",
  },
  modalDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 18,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
    backgroundColor: Colors.inputBackground,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  submitBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.white,
  },
  analyticsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    marginHorizontal: 12,
    marginBottom: 8,
  },
  analyticsCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 10,
    width: "30%",
    marginHorizontal: "1.5%",
    marginBottom: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 1,
  },
  analyticsValue: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
  },
  analyticsLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
  detailsCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
  },
  cardActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  infoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  infoBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  detailItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border + "60",
  },
  detailIcon: {
    marginTop: 2,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
    marginTop: 2,
  },
  kycSectionBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.border + "80",
  },
  kycLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  kycShieldCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E6F4EA",
    justifyContent: "center",
    alignItems: "center",
  },
  kycTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  kycMaskedNumber: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
    marginTop: 1,
  },
  kycBadgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  kycBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
});
