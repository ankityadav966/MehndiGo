import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../constants/Colors";
import OptimizedImage from "../OptimizedImage";

function ArtistProfileHeader({ profile, isFav, onToggleFavorite, onShare, onBack }) {
  if (!profile) return null;

  const { name, bio, city, state, experience_years, avg_rating, total_reviews, total_bookings, profile_image } = profile;

  return (
    <View style={styles.headerContainer}>
      <View style={styles.topNavRow}>
        <TouchableOpacity style={styles.navBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.rightNavRow}>
          <TouchableOpacity style={styles.navBtn} onPress={onShare}>
            <Ionicons name="share-social-outline" size={22} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={onToggleFavorite}>
            <Ionicons name={isFav ? "heart" : "heart-outline"} size={22} color={isFav ? Colors.error : Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.heroRow}>
        <OptimizedImage
          source={{ uri: profile_image || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=400" }}
          style={styles.avatar}
          width={100}
          height={100}
        />
        <View style={styles.heroInfo}>
          <Text style={styles.name} numberOfLines={1}>{name || "Mehndi Artist"}</Text>
          <Text style={styles.location}>📍 {city || "Jaipur"}, {state || "Rajasthan"}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Ionicons name="star" size={12} color="#FFB800" />
              <Text style={styles.badgeText}>{Number(avg_rating || 4.9).toFixed(1)} ({total_reviews || 0})</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{experience_years || 2}+ Yrs Exp</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{total_bookings || 0} Bookings</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Trust & Hygiene Guarantee Row */}
      <View style={styles.trustRow}>
        <View style={styles.trustItem}>
          <Ionicons name="shield-checkmark" size={14} color="#059669" />
          <Text style={styles.trustText}>Verified Artist</Text>
        </View>
        <View style={styles.trustItem}>
          <Ionicons name="leaf-outline" size={14} color="#059669" />
          <Text style={styles.trustText}>100% Organic Stain</Text>
        </View>
        <View style={styles.trustItem}>
          <Ionicons name="lock-closed-outline" size={14} color="#059669" />
          <Text style={styles.trustText}>Escrow Guarantee</Text>
        </View>
      </View>


      {bio ? <Text style={styles.bio}>{bio}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  topNavRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  rightNavRow: {
    flexDirection: "row",
    gap: 8,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  heroInfo: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text || "#1D1D1D",
    marginBottom: 4,
  },
  location: {
    fontSize: 13,
    color: Colors.textSecondary || "#666666",
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  badge: {
    backgroundColor: "#FFF1F5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.primary || "#9C1344",
  },
  bio: {
    marginTop: 12,
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
  },
  trustRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  trustItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  trustText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#065F46",
  },
});


export default React.memo(ArtistProfileHeader);
