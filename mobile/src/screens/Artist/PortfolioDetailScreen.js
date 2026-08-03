import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import { deletePortfolioItem } from "../../services/artist";
import { getNormalizedUrl } from "../../services/api";

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

let VideoComponent = null;

export default function PortfolioDetailScreen({ route, navigation }) {
  const { portfolio } = route.params;
  const [deleting, setDeleting] = useState(false);

  const handleEdit = () => {
    navigation.navigate("EditPortfolio", { portfolio });
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Portfolio Item",
      "Are you sure you want to remove this design sample from your portfolio gallery?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await deletePortfolioItem(portfolio.id);
              Alert.alert("Deleted", "Portfolio item has been removed.", [
                { text: "OK", onPress: () => navigation.goBack() },
              ]);
            } catch (err) {
              Alert.alert("Error", err.message || "Failed to delete portfolio item");
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handlePlayVideo = async () => {
    if (portfolio.video_url) {
      navigation.navigate("VideoPlayer", {
        videoUrl: portfolio.video_url,
        title: portfolio.title || "Portfolio Video"
      });
    }
  };



  const isVideo = !!portfolio.video_url;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Portfolio Details</Text>
        <TouchableOpacity style={styles.editBtn} onPress={handleEdit}>
          <Ionicons name="create-outline" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {isVideo ? (
          VideoComponent ? (
            <VideoComponent
              source={{ uri: portfolio.video_url }}
              rate={1.0}
              volume={1.0}
              isMuted={false}
              resizeMode="contain"
              shouldPlay={true}
              isLooping={true}
              useNativeControls
              usePoster={true}
              posterSource={{ uri: resolveImage(portfolio.image_url) }}
              posterStyle={{ resizeMode: "cover" }}
              style={styles.videoPlayer}
            />
          ) : (
            <TouchableOpacity style={styles.videoPlaceholder} onPress={handlePlayVideo} activeOpacity={0.9}>
              <Image
                source={{ uri: resolveImage(portfolio.image_url) }}
                style={styles.coverImage}
                resizeMode="cover"
              />
              <View style={styles.videoPlayOverlay}>
                <Ionicons name="play-circle" size={54} color={Colors.white} />
                <Text style={styles.playText}>Tap to Play Video</Text>
              </View>
            </TouchableOpacity>
          )
        ) : (
          <Image
            source={{ uri: resolveImage(portfolio.image_url) }}
            style={styles.coverImage}
            resizeMode="cover"
          />
        )}



        <View style={styles.content}>
          <Text style={styles.serviceName}>{portfolio.title || "Design Sample"}</Text>

          <View style={styles.badgesRow}>
            <Badge label="Publicly Visible" active={portfolio.visibility} />
            {portfolio.occasion ? (
              <Badge label={portfolio.occasion} active={true} />
            ) : null}
          </View>

          <View style={styles.infoCard}>
            <InfoRow icon="pricetag-outline" label="Category" value={portfolio.category} />
            <View style={styles.divider} />
            <InfoRow icon="calendar-outline" label="Occasion" value={portfolio.occasion} />
            <View style={styles.divider} />
            <InfoRow icon="location-outline" label="Location" value={portfolio.location} />
            <View style={styles.divider} />
            <InfoRow icon="key-outline" label="Tags" value={portfolio.tags} />
          </View>

          {portfolio.description ? (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{portfolio.description}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={handleDelete}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator size="small" color={Colors.error} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={18} color={Colors.error} />
              <Text style={styles.deleteBtnText}>Delete Item</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoLabel}>
      <Ionicons name={icon} size={16} color={Colors.textSecondary} />
      <Text style={styles.infoLabelText}>{label}</Text>
    </View>
    <Text style={styles.infoValue}>{value || "N/A"}</Text>
  </View>
);

const Badge = ({ label, active }) => (
  <View style={[styles.badge, active ? styles.badgeActive : styles.badgeInactive]}>
    <View style={[styles.badgeDot, active ? styles.dotActive : styles.dotInactive]} />
    <Text style={[styles.badgeText, active ? styles.badgeTextActive : styles.badgeTextInactive]}>
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
  },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight + "30",
    justifyContent: "center",
    alignItems: "center",
  },
  coverImage: {
    width: "100%",
    height: 320,
  },
  videoPlaceholder: {
    position: "relative",
    width: "100%",
    height: 320,
  },
  videoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  content: {
    padding: 16,
  },
  serviceName: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 12,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  badgeActive: {
    backgroundColor: Colors.success + "15",
  },
  badgeInactive: {
    backgroundColor: Colors.textTertiary + "15",
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: Colors.success,
  },
  dotInactive: {
    backgroundColor: Colors.textTertiary,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  badgeTextActive: {
    color: Colors.success,
  },
  badgeTextInactive: {
    color: Colors.textTertiary,
  },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  infoLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoLabelText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.inputBackground,
  },
  descriptionSection: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  footer: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  deleteBtn: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.error,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.white,
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.error,
  },
  videoPlayer: {
    width: "100%",
    height: 320,
    backgroundColor: "#000000",
  },
  playText: {
    color: Colors.white,
    marginTop: 8,
    fontSize: 14,
    fontWeight: "600",
    textShadowColor: "rgba(0, 0, 0, 0.4)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});
