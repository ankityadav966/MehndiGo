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
import { getArtistDetails, getArtistPortfolio, updateArtistProfileDetails, uploadPortfolioMedia } from "../../services/artist";
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
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

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
      console.log("Could not open link:", e.message);
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

  const resolveImage = (uri) => {
    if (!uri) return null;
    if (uri.startsWith("http://") || uri.startsWith("https://") || uri.startsWith("file://") || uri.startsWith("content://")) {
      return uri;
    }
    const cleanUri = uri.startsWith("/") ? uri : `/${uri}`;
    const { BASE_URL } = require("../../services/api");
    return `${BASE_URL}${cleanUri}`;
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
            user: {
              ...prev?.user,
              profile_image: uploadedUrl,
            },
          }));

          Alert.alert("Success", "Profile photo updated successfully!");
        }
      }
    } catch (err) {
      console.log("Failed to upload avatar:", err);
      Alert.alert("Error", err.message || "Failed to upload avatar.");
    } finally {
      setProfileLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const data = await getArtistDetails();
      setProfile(data);
    } catch (err) {
      console.log("Failed to fetch artist details:", err?.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const fetchArtistPortfolioItems = async () => {
    try {
      const data = await getArtistPortfolio();
      setPortfolioItems(data || []);
    } catch (err) {
      console.log("Failed to fetch portfolio items:", err?.message);
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
      console.log("Failed to refresh profile:", err);
    } finally {
      setRefreshingState(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPortfolios();
      fetchProfile();
      fetchArtistPortfolioItems();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchPortfolios]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      fetchPortfolios();
      fetchProfile();
      fetchArtistPortfolioItems();
    });
    return unsubscribe;
  }, [navigation, fetchPortfolios]);

  const filteredPortfolios = useMemo(() => {
    if (activeTab === "Services") {
      return portfolios;
    }
    return portfolioItems.filter((item) => {
      if (activeTab === "Posts") return !item.video_url;
      if (activeTab === "Videos") return !!item.video_url;
      return true;
    });
  }, [activeTab, portfolios, portfolioItems]);

  const renderGridItem = (item, index) => {
    const isService = activeTab === "Services";
    const uri = isService ? item.image : item.image_url;
    const isVideo = !isService && !!item.video_url;
    const title = isService ? item.serviceName : item.title;

    return (
      <TouchableOpacity
        key={item.id ? `${activeTab}-${item.id}` : `${activeTab}-idx-${index}`}
        activeOpacity={0.85}
        style={styles.gridItem}
        onPress={() => {
          if (isService) {
            navigation.navigate("ServiceDetails", { id: item.id });
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
            <TouchableOpacity style={styles.avatarContainer} onPress={handleUploadAvatar} activeOpacity={0.8}>
              <Image
                source={
                  profile?.user?.profile_image
                    ? { uri: resolveImage(profile.user.profile_image) }
                    : user?.profile_image || user?.avatar
                      ? { uri: resolveImage(user.profile_image || user.avatar) }
                      : require("../../assets/images/Henna.jpg")
                }
                style={styles.avatar}
              />
              <View style={styles.addAvatarBadge}>
                <Ionicons name="camera" size={12} color={Colors.white} />
              </View>
            </TouchableOpacity>

            <View style={styles.profileMainInfo}>
              <Text style={styles.name}>
                {profile?.name || user?.name || "Mehendi Artist"}
              </Text>
              {profile?.email || user?.email ? (
                <Text style={styles.email}>{profile?.email || user?.email}</Text>
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

        {/* Social Connections */}
        <View style={styles.socialCard}>
          <Text style={styles.socialSectionTitle}>Social Connections</Text>
          
          {/* Instagram */}
          <View style={styles.socialRow}>
            <TouchableOpacity 
              style={styles.socialLeft} 
              activeOpacity={instagramHandle ? 0.7 : 1}
              onPress={() => openSocialLink("instagram", instagramHandle)}
            >
              <View style={[styles.socialIconCircle, { backgroundColor: "#FFE5EC" }]}>
                <Ionicons name="logo-instagram" size={20} color="#E1306C" />
              </View>
              <View>
                <Text style={styles.socialLabel}>Instagram</Text>
                <Text style={[styles.socialValue, instagramHandle && { color: Colors.primary, fontWeight: "600" }]}>
                  {instagramHandle ? `@${instagramHandle} (Tap to view)` : "Not Connected"}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.connectBtn, instagramHandle && styles.disconnectBtn]} 
              onPress={handleInstagramConnect}
            >
              <Text style={[styles.connectBtnText, instagramHandle && styles.disconnectBtnText]}>
                {instagramHandle ? "Disconnect" : "Connect"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Facebook */}
          <View style={styles.socialRow}>
            <TouchableOpacity 
              style={styles.socialLeft} 
              activeOpacity={facebookHandle ? 0.7 : 1}
              onPress={() => openSocialLink("facebook", facebookHandle)}
            >
              <View style={[styles.socialIconCircle, { backgroundColor: "#E8F0FE" }]}>
                <Ionicons name="logo-facebook" size={20} color="#1877F2" />
              </View>
              <View>
                <Text style={styles.socialLabel}>Facebook</Text>
                <Text style={[styles.socialValue, facebookHandle && { color: "#1877F2", fontWeight: "600" }]}>
                  {facebookHandle ? `${facebookHandle} (Tap to view)` : "Not Connected"}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.connectBtn, facebookHandle && styles.disconnectBtn]} 
              onPress={handleFacebookConnect}
            >
              <Text style={[styles.connectBtnText, facebookHandle && styles.disconnectBtnText]}>
                {facebookHandle ? "Disconnect" : "Connect"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Instagram modal */}
        <Modal visible={instagramModalVisible} transparent animationType="slide">
          <View style={styles.modalBg}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Connect Instagram</Text>
              <Text style={styles.modalDesc}>Enter your Instagram username (e.g. priya_mehndi_goa)</Text>
              <TextInput
                placeholder="Username"
                placeholderTextColor={Colors.textTertiary}
                style={styles.modalInput}
                value={tempInsta}
                onChangeText={setTempInsta}
                autoCapitalize="none"
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setInstagramModalVisible(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={saveInstagram}>
                  <Text style={styles.submitBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Facebook modal */}
        <Modal visible={facebookModalVisible} transparent animationType="slide">
          <View style={styles.modalBg}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Connect Facebook</Text>
              <Text style={styles.modalDesc}>Enter your Facebook profile handle or page link</Text>
              <TextInput
                placeholder="Username or URL"
                placeholderTextColor={Colors.textTertiary}
                style={styles.modalInput}
                value={tempFB}
                onChangeText={setTempFB}
                autoCapitalize="none"
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setFacebookModalVisible(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={saveFacebook}>
                  <Text style={styles.submitBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

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
});
