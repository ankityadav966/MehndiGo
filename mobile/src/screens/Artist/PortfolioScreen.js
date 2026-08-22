import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useEffect } from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import { getArtistPortfolio, deletePortfolioItem, updatePortfolioItem } from "../../services/artist";

export default function PortfolioScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPortfolio = async () => {
    try {
      const data = await getArtistPortfolio();
      setPortfolioItems(data || []);
    } catch (e) {
      if (__DEV__) console.log("Failed to load portfolio items:", e.message);
      Alert.alert("Error", "Could not fetch portfolio items.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      if (portfolioItems.length === 0) {
        setLoading(true);
      }
      fetchPortfolio();
    });
    return unsubscribe;
  }, [navigation, portfolioItems]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPortfolio();
  };

  const handleDeleteItem = (id) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to remove this portfolio item from your gallery?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deletePortfolioItem(id);
              setPortfolioItems((prev) => prev.filter((item) => item.id !== id));
            } catch (err) {
              Alert.alert("Error", "Failed to delete item.");
            }
          }
        }
      ]
    );
  };

  const handleToggleVisibility = async (item) => {
    try {
      const updated = await updatePortfolioItem(item.id, {
        visibility: !item.visibility
      });
      setPortfolioItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, visibility: updated.visibility } : i))
      );
    } catch (err) {
      Alert.alert("Error", "Failed to update visibility status.");
    }
  };

  const handleMoveOrder = async (item, direction) => {
    const index = portfolioItems.findIndex((i) => i.id === item.id);
    if (index === -1) return;
    
    let targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= portfolioItems.length) return;

    // Swap display order values
    const targetItem = portfolioItems[targetIndex];
    try {
      await Promise.all([
        updatePortfolioItem(item.id, { display_order: targetItem.display_order || 0 }),
        updatePortfolioItem(targetItem.id, { display_order: item.display_order || 0 })
      ]);
      fetchPortfolio();
    } catch (err) {
      Alert.alert("Error", "Failed to swap item display order.");
    }
  };

  const renderPortfolioCard = ({ item, index }) => (
    <View style={styles.card}>
      <TouchableOpacity 
        style={styles.imageSection}
        activeOpacity={0.9}
        onPress={() => navigation.navigate("PortfolioDetail", { portfolio: item })}
      >
        <Image source={{ uri: item.image_url }} style={styles.image} />
        {item.video_url && (
          <View style={styles.videoBadge}>
            <Ionicons name="play" size={14} color={Colors.white} />
          </View>
        )}
        {!item.visibility && (
          <View style={styles.hiddenOverlay}>
            <Ionicons name="eye-off" size={24} color={Colors.white} />
            <Text style={styles.hiddenText}>Hidden</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.details}>
        <Text style={styles.title} numberOfLines={1}>{item.title || "Untitled Sample"}</Text>
        <Text style={styles.meta} numberOfLines={1}>🏷️ {item.category || "General"} • {item.occasion || "Teej"}</Text>
        <Text style={styles.desc} numberOfLines={2}>{item.description || "No description provided."}</Text>
        <Text style={styles.likes}>❤️ {item.likes_count || 0} Likes</Text>

        <View style={styles.actions}>
          {/* Visibility Toggle */}
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleToggleVisibility(item)}>
            <Ionicons name={item.visibility ? "eye" : "eye-off"} size={16} color={Colors.primary} />
          </TouchableOpacity>

          {/* Edit Button */}
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate("EditPortfolio", { portfolio: item })}>
            <Ionicons name="create-outline" size={16} color={Colors.primary} />
          </TouchableOpacity>

          {/* Delete Button */}
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteItem(item.id)}>
            <Ionicons name="trash-outline" size={16} color={Colors.error} />
          </TouchableOpacity>

          {/* Move Up Order */}
          {index > 0 && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleMoveOrder(item, "up")}>
              <Ionicons name="arrow-up" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}

          {/* Move Down Order */}
          {index < portfolioItems.length - 1 && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleMoveOrder(item, "down")}>
              <Ionicons name="arrow-down" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Portfolio</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={portfolioItems}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderPortfolioCard}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />
          }
          contentContainerStyle={[styles.listContainer, { paddingBottom: 100 + insets.bottom }]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="image-outline" size={60} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>Add Portfolio Items</Text>
              <Text style={styles.emptySubtitle}>Upload photos and videos of your mehndi art designs to impress clients.</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity style={[styles.fab, { bottom: Math.max(insets.bottom, 20) + 10 }]} onPress={() => navigation.navigate("AddPortfolio")}>
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.white, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "700", color: Colors.text },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContainer: { paddingHorizontal: 16, paddingBottom: 100 },
  card: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5
  },
  imageSection: { position: "relative", width: 100, height: 120, borderRadius: 12, overflow: "hidden" },
  image: { width: "100%", height: "100%" },
  videoBadge: {
    position: "absolute",
    right: 6,
    top: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center"
  },
  hiddenOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center"
  },
  hiddenText: { color: Colors.white, fontSize: 10, marginTop: 4, fontWeight: "700" },
  details: { flex: 1, marginLeft: 12, justifyContent: "space-between" },
  title: { fontSize: 14, fontWeight: "700", color: Colors.text },
  meta: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  desc: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  likes: { fontSize: 11, fontWeight: "600", color: Colors.primary, marginTop: 4 },
  actions: { flexDirection: "row", marginTop: 8, alignItems: "center" },
  actionBtn: {
    marginRight: 10,
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center"
  },
  fab: { position: "absolute", bottom: 25, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center", elevation: 8 },
  emptyContainer: { paddingVertical: 80, alignItems: "center", paddingHorizontal: 40 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: Colors.text, marginTop: 16 },
  emptySubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 6, textAlign: "center", lineHeight: 18 }
});
