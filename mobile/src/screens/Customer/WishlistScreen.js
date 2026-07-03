import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useEffect } from "react";
import {
  FlatList,
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import { getCustomerWishlist, removeArtistFavorite } from "../../services/customer";

export default function WishlistScreen({ navigation }) {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWishlist = React.useCallback(async () => {
    try {
      const data = await getCustomerWishlist();
      setWishlist(data || []);
    } catch (err) {
      console.log("Failed to fetch customer wishlist:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchWishlist();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchWishlist]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      fetchWishlist();
    });
    return unsubscribe;
  }, [navigation, fetchWishlist]);

  const handleRemoveFavorite = async (artistId) => {
    try {
      await removeArtistFavorite(artistId);
      setWishlist((prev) => prev.filter((item) => item.id !== artistId));
      Alert.alert("Wishlist Updated", "Artist removed from favorites.");
    } catch (err) {
      Alert.alert("Error", "Could not update wishlist.");
    }
  };

  const renderItem = ({ item }) => {
    const artist = item || {};
    const userObj = artist.user || {};
    const artistImage = userObj.profile_image || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500";

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.card}
        onPress={() => navigation.navigate("ArtistProfile", { artistId: artist.id })}
      >
        <Image source={{ uri: artistImage }} style={styles.artistImage} />
        <View style={styles.infoContainer}>
          <Text numberOfLines={1} style={styles.artistName}>{userObj.name || "Mehndi Artist"}</Text>
          <Text style={styles.location}>📍 {artist.city || "Jaipur, Rajasthan"}</Text>
          <View style={styles.bottomRow}>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={11} color={Colors.warning} />
              <Text style={styles.ratingText}>{artist.avg_rating || "4.8"}</Text>
            </View>
            <Text style={styles.price}>Exp. {artist.experience_years || "3"}+ Yrs</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.heartButton} onPress={() => handleRemoveFavorite(artist.id)}>
          <Ionicons name="heart" size={18} color={Colors.primary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Favorite Mehndi Artists</Text>
      </View>

      {wishlist.length > 0 ? (
        <FlatList
          data={wishlist}
          renderItem={renderItem}
          keyExtractor={(item, index) => item?.id ? item.id.toString() : index.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={fetchWishlist} colors={[Colors.primary]} />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="heart-outline" size={50} color={Colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Your Wishlist is Empty</Text>
          <Text style={styles.emptySubtitle}>Save your favorite artists by tapping the heart icon on their profiles.</Text>
          <TouchableOpacity
            style={styles.exploreBtn}
            onPress={() => navigation.navigate("Categories")}
          >
            <Text style={styles.exploreBtnText}>Explore Artists</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center", marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  headerSubTitle: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  listContainer: { paddingVertical: 14, paddingBottom: 100 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.white, marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: Colors.border, elevation: 1 },
  artistImage: { width: 64, height: 64, borderRadius: 12 },
  infoContainer: { flex: 1, marginLeft: 12 },
  artistName: { fontSize: 14, fontWeight: "700", color: Colors.text },
  location: { marginTop: 4, fontSize: 11, color: Colors.textSecondary },
  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  ratingBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF0F4", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  ratingText: { marginLeft: 4, fontSize: 10, fontWeight: "700", color: Colors.primary },
  price: { fontSize: 11, fontWeight: "700", color: Colors.primary },
  heartButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#FFF0F2", justifyContent: "center", alignItems: "center" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },
  iconContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#FFF0F2", justifyContent: "center", alignItems: "center", marginBottom: 24 },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: Colors.text, textAlign: "center", marginBottom: 10 },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 22, paddingHorizontal: 16 },
  exploreBtn: { backgroundColor: Colors.primary, paddingVertical: 14, paddingHorizontal: 36, borderRadius: 12, marginTop: 24 },
  exploreBtnText: { color: Colors.white, fontSize: 14, fontWeight: "700" }
});
