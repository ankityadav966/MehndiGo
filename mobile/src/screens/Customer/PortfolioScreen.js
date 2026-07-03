import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useEffect } from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Share,
  ScrollView
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import ImageViewing from "react-native-image-viewing";
import Colors from "../../constants/Colors";
import CustomButton from "../../components/CustomButton";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import {
  fetchPortfolios,
  likePortfolioItem,
  unlikePortfolioItem,
  savePortfolioItem,
  unsavePortfolioItem
} from "../../services/customer";

const CATEGORIES = [
  "All",
  "Bridal Mehndi",
  "Arabic Mehndi",
  "Royal Mehndi",
  "Indo Arabic",
  "Portrait Mehndi",
  "Minimal Mehndi",
  "Engagement",
  "Festival",
  "Kids Mehndi"
];

export default function PortfolioScreen({ navigation }) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Likes & Saves tracking lists
  const [likedIds, setLikedIds] = useState([]);
  const [savedIds, setSavedIds] = useState([]);

  // Fullscreen Viewer state
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const fetchItems = async (pageNum = 1, isRefresh = false) => {
    if (pageNum === 1) {
      if (!isRefresh) setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const filters = {};
      if (selectedCategory !== "All") {
        filters.category = selectedCategory;
      }
      
      const response = await fetchPortfolios(query, filters, pageNum, 8);
      const rows = response?.rows || [];
      const total = response?.count || 0;

      if (pageNum === 1) {
        setPortfolioItems(rows);
      } else {
        setPortfolioItems((prev) => [...prev, ...rows]);
      }

      // Sync liked/saved array statuses on load
      if (response?.likedIds) setLikedIds(response.likedIds);
      if (response?.savedIds) setSavedIds(response.savedIds);

      setHasMore(portfolioItems.length + rows.length < total);
      setPage(pageNum);
    } catch (e) {
      console.log("Failed to fetch gallery portfolios:", e.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchItems(1);
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedCategory]);

  // Debounced query search
  useEffect(() => {
    const delay = setTimeout(() => {
      fetchItems(1);
    }, 450);
    return () => clearTimeout(delay);
  }, [query]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchItems(1, true);
  };

  const handleLoadMore = () => {
    if (hasMore && !loadingMore && !loading) {
      fetchItems(page + 1);
    }
  };

  // Like Portfolio item sync
  const handleToggleLike = async (item) => {
    const isLiked = likedIds.includes(item.id);
    try {
      if (isLiked) {
        await unlikePortfolioItem(item.id);
        setLikedIds((prev) => prev.filter((id) => id !== item.id));
        setPortfolioItems((prev) =>
          prev.map((p) => (p.id === item.id ? { ...p, likes_count: Math.max(0, p.likes_count - 1) } : p))
        );
      } else {
        await likePortfolioItem(item.id);
        setLikedIds((prev) => [...prev, item.id]);
        setPortfolioItems((prev) =>
          prev.map((p) => (p.id === item.id ? { ...p, likes_count: p.likes_count + 1 } : p))
        );
      }
    } catch (err) {
      console.log("Failed to like portfolio:", err.message);
    }
  };

  // Bookmark Save portfolio item sync
  const handleToggleSave = async (item) => {
    const isSaved = savedIds.includes(item.id);
    try {
      if (isSaved) {
        await unsavePortfolioItem(item.id);
        setSavedIds((prev) => prev.filter((id) => id !== item.id));
      } else {
        await savePortfolioItem(item.id);
        setSavedIds((prev) => [...prev, item.id]);
        Alert.alert("Saved", "Design sample added to your saved bookmarks!");
      }
    } catch (err) {
      console.log("Failed to save portfolio item:", err.message);
    }
  };

  // Share portfolio item trigger
  const handleShareItem = async (item) => {
    try {
      await Share.share({
        title: item.title || "Mehndi design sample",
        message: `Look at this beautiful mehndi art design: ${item.title || "Traditional Sample"} by artist on MehandiGo. Photo: ${item.image_url}`
      });
    } catch (e) {
      console.log("Share failed:", e.message);
    }
  };

  const openFullscreenViewer = (index) => {
    setViewerIndex(index);
    setViewerVisible(true);
  };

  const renderGalleryCard = ({ item, index }) => {
    const isLiked = likedIds.includes(item.id);
    const isSaved = savedIds.includes(item.id);

    return (
      <View style={styles.card}>
        {/* Thumbnail Preview Area */}
        <TouchableOpacity
          style={styles.imageContainer}
          activeOpacity={0.9}
          onPress={() => openFullscreenViewer(index)}
        >
          <Image source={{ uri: item.image_url }} style={styles.image} />
          {item.video_url && (
            <View style={styles.videoBadge}>
              <Ionicons name="play" size={14} color={Colors.white} />
            </View>
          )}
          
          {/* Reaction Overlay Buttons */}
          <TouchableOpacity
            style={styles.likeOverlayBtn}
            onPress={() => handleToggleLike(item)}
          >
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={18}
              color={isLiked ? Colors.error : Colors.text}
            />
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Info detail and action options footer */}
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title || "Traditional Henna"}</Text>
          <Text style={styles.cardArtist} numberOfLines={1}>
            By: {item.artist?.user?.name || "Mehndi Artist"}
          </Text>
          
          <View style={styles.cardFooter}>
            <Text style={styles.likesText}>❤️ {item.likes_count || 0} likes</Text>
            
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleToggleSave(item)}>
                <Ionicons
                  name={isSaved ? "bookmark" : "bookmark-outline"}
                  size={16}
                  color={isSaved ? Colors.primary : Colors.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { marginLeft: 8 }]} onPress={() => handleShareItem(item)}>
                <Ionicons name="share-social-outline" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Convert portfolio images list to viewer structure
  const viewerImages = portfolioItems.map((item) => ({ uri: item.image_url }));

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Portfolio Gallery</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Input Box */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={Colors.textTertiary} style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Search occasion, design style, tags..."
          placeholderTextColor={Colors.textTertiary}
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery("")}>
            <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Categories Badge list */}
      <View style={{ height: 40, marginBottom: 10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  isSelected ? styles.activeChip : null
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[styles.chipText, isSelected ? styles.activeChipText : null]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Grid Gallery */}
      {loading ? (
        <View style={{ paddingHorizontal: 16 }}>
          <LoadingSkeleton type="grid" count={4} />
        </View>
      ) : (
        <FlatList
          data={portfolioItems}
          numColumns={2}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderGalleryCard}
          columnWrapperStyle={styles.gridRowWrapper}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.listContent}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loaderFooter}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="images-outline" size={54} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>No Designs Found</Text>
              <Text style={styles.emptySubtitle}>{"We couldn't find any portfolio design samples under these tags or styling category."}</Text>
            </View>
          }
        />
      )}

      {/* Fullscreen Photo Viewer */}
      <ImageViewing
        images={viewerImages}
        imageIndex={viewerIndex}
        visible={viewerVisible}
        onRequestClose={() => setViewerVisible(false)}
        DoubleTapToZoomEnabled={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "700", color: Colors.text },
  searchBar: {
    height: 46,
    backgroundColor: Colors.background,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 14
  },
  searchInput: { flex: 1, color: Colors.text, fontSize: 13 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.background,
    marginRight: 8,
    alignSelf: "flex-start"
  },
  activeChip: { backgroundColor: Colors.primary },
  chipText: { fontSize: 12, fontWeight: "600", color: Colors.textSecondary },
  activeChipText: { color: Colors.white },
  listContent: { paddingHorizontal: 10, paddingBottom: 60 },
  gridRowWrapper: { justifyContent: "space-between" },
  card: {
    width: "48%",
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
    overflow: "hidden"
  },
  imageContainer: { position: "relative", width: "100%", height: 160 },
  image: { width: "100%", height: "100%", resizeMode: "cover" },
  videoBadge: {
    position: "absolute",
    right: 8,
    top: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center"
  },
  likeOverlayBtn: {
    position: "absolute",
    left: 8,
    top: 8,
    backgroundColor: Colors.white + "DD",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3
  },
  cardInfo: { padding: 10 },
  cardTitle: { fontSize: 13, fontWeight: "700", color: Colors.text },
  cardArtist: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  likesText: { fontSize: 11, color: Colors.textSecondary, fontWeight: "600" },
  actionsRow: { flexDirection: "row", alignItems: "center" },
  actionBtn: { padding: 4 },
  loaderFooter: { paddingVertical: 12, alignItems: "center" },
  emptyContainer: { paddingVertical: 80, alignItems: "center", paddingHorizontal: 30 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: Colors.text },
  emptySubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 4, textAlign: "center", lineHeight: 18 }
});
