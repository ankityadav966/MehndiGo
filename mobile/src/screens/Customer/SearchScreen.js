import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect, useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  FlatList,
  ActivityIndicator,
  Keyboard
} from "react-native";
import Colors from "../../constants/Colors";
import {
  getSearchSuggestions,
  getTrendingSearches,
  getRecentSearches,
  saveRecentSearch,
  deleteRecentSearch,
  getCategories
} from "../../services/customer";

export default function SearchScreen({ navigation }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [trendingSearches, setTrendingSearches] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [popularCategories, setPopularCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // Fetch recent and trending searches on mount
  const loadSearchData = useCallback(async () => {
    try {
      const [recent, trending, cats] = await Promise.all([
        getRecentSearches(),
        getTrendingSearches(),
        getCategories()
      ]);
      setRecentSearches(recent || []);
      setTrendingSearches(trending || []);
      setPopularCategories((cats || []).slice(0, 4));
    } catch (e) {
      console.log("Failed to load initial search data:", e.message);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSearchData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadSearchData]);

  // Fetch suggestions when text query updates
  useEffect(() => {
    if (!query.trim()) {
      const timer = setTimeout(() => {
        setSuggestions([]);
      }, 0);
      return () => clearTimeout(timer);
    }

    const delayDebounce = setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        const list = await getSearchSuggestions(query);
        setSuggestions(list || []);
      } catch (err) {
        console.log("Failed to load suggestions:", err.message);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 400); // 400ms debouncing to prevent server overload

    return () => clearTimeout(delayDebounce);
  }, [query]);

  // Submit search query
  const handleSearchSubmit = async (searchTerm) => {
    const term = searchTerm || query;
    if (!term.trim()) return;

    Keyboard.dismiss();
    setLoading(true);
    try {
      await saveRecentSearch(term);
      await loadSearchData(); // Refresh history
      navigation.navigate("ArtistListing", { searchQuery: term });
    } catch (err) {
      console.log("Failed to save search history:", err.message);
      navigation.navigate("ArtistListing", { searchQuery: term });
    } finally {
      setLoading(false);
    }
  };

  // Remove single search history entry
  const handleDeleteHistoryItem = async (queryId) => {
    try {
      await deleteRecentSearch(queryId);
      setRecentSearches((prev) => prev.filter((item) => item.id !== queryId));
    } catch (err) {
      console.log("Failed to delete search item:", err.message);
    }
  };

  // Clear all search history entries
  const handleClearAllHistory = async () => {
    try {
      await deleteRecentSearch("all");
      setRecentSearches([]);
    } catch (err) {
      console.log("Failed to clear search history:", err.message);
    }
  };

  const clearQueryInput = () => {
    setQuery("");
    setSuggestions([]);
  };

  // Render suggestion list item
  const handleSuggestionPress = (item) => {
    Keyboard.dismiss();
    if (item.type === "artist" && item.artistId) {
      navigation.navigate("ArtistProfile", { artistId: item.artistId });
    } else if (item.type === "category") {
      navigation.navigate("ArtistListing", { category: item.text });
    } else {
      handleSearchSubmit(item.text);
    }
  };

  // Render suggestion list item
  const renderSuggestionItem = ({ item }) => {
    let iconName = "search-outline";
    if (item.type === "artist") iconName = "person-outline";
    if (item.type === "service") iconName = "cut-outline";
    if (item.type === "category") iconName = "flower-outline";
    if (item.type === "city") iconName = "location-outline";

    return (
      <TouchableOpacity
        style={styles.suggestionItem}
        onPress={() => handleSuggestionPress(item)}
      >
        <Ionicons name={iconName} size={18} color={Colors.primary} style={{ marginRight: 12 }} />
        <View style={styles.suggestionTextContainer}>
          <Text style={styles.suggestionText}>{item.text}</Text>
          <Text style={styles.suggestionType}>{item.type}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
      </TouchableOpacity>
    );
  };


      {/* Voice Search Simulation State */}
      const [isListening, setIsListening] = useState(false);

      const handleVoiceSearch = () => {
        setIsListening(true);
        // Simulate speech recognition timer
        setTimeout(() => {
          setIsListening(false);
          setQuery("Bridal Mehendi Jaipur");
        }, 2200);
      };

      const QUICK_FILTERS = [
        { label: "Bridal", query: "Bridal Mehendi", icon: "sparkles-outline" },
        { label: "Arabic", query: "Arabic Mehendi", icon: "color-wand-outline" },
        { label: "Under ₹1000", query: "Under 1000", icon: "wallet-outline" },
        { label: "4.5★+ Rating", query: "Top Rated", icon: "star-outline" },
        { label: "Nearest", query: "Nearest", icon: "navigate-outline" },
        { label: "5+ Yrs Exp", query: "Experienced", icon: "ribbon-outline" },
      ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search & Discover</Text>
        {loading && <ActivityIndicator size="small" color={Colors.primary} style={{ marginLeft: 10 }} />}
      </View>

      {/* Search Input Bar with Voice Mic */}
      <View style={styles.searchBarContainer}>
        <Ionicons name="search-outline" size={20} color={Colors.primary} style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Search by artist, category, price, city..."
          placeholderTextColor={Colors.textTertiary}
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => handleSearchSubmit()}
          returnKeyType="search"
          autoFocus
        />
        {query.length > 0 ? (
          <TouchableOpacity onPress={clearQueryInput} style={{ marginRight: 8 }}>
            <Ionicons name="close-circle" size={20} color={Colors.textTertiary} />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity onPress={handleVoiceSearch} style={styles.micBtn}>
          <Ionicons name="mic-outline" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Voice Listening Modal / Banner */}
      {isListening && (
        <View style={styles.voiceBanner}>
          <Ionicons name="mic" size={24} color="#FFFFFF" style={{ marginRight: 10 }} />
          <Text style={styles.voiceText}>Listening... Speak artist or category name</Text>
          <ActivityIndicator size="small" color="#FFFFFF" style={{ marginLeft: 10 }} />
        </View>
      )}

      {/* Quick Filter Chips Bar */}
      <View style={styles.chipsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer}>
          {QUICK_FILTERS.map((chip, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.filterChip}
              onPress={() => handleSearchSubmit(chip.query)}
            >
              <Ionicons name={chip.icon} size={14} color={Colors.primary} style={{ marginRight: 4 }} />
              <Text style={styles.chipText}>{chip.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Autocomplete suggestions or initial search panels */}
      {query.length > 0 ? (
        suggestionsLoading ? (
          <View style={styles.centerLoader}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loaderText}>Searching suggestions...</Text>
          </View>
        ) : (
          <FlatList
            data={suggestions}
            keyExtractor={(item, index) => `${item.type}-${index}`}
            renderItem={renderSuggestionItem}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptySuggestions}>
                <Text style={styles.emptyText}>{"Press return to search for \"" + query + "\""}</Text>
              </View>
            }
          />
        )
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 80 }}
        >
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Searches</Text>
                <TouchableOpacity onPress={handleClearAllHistory}>
                  <Text style={styles.clearAllBtn}>Clear All</Text>
                </TouchableOpacity>
              </View>
              {recentSearches.map((item) => (
                <View key={item.id} style={styles.historyRow}>
                  <TouchableOpacity
                    style={styles.historyBtn}
                    onPress={() => handleSearchSubmit(item.search_query)}
                  >
                    <Ionicons name="time-outline" size={18} color={Colors.textTertiary} style={{ marginRight: 10 }} />
                    <Text style={styles.historyText} numberOfLines={1}>{item.search_query}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.historyDelete}
                    onPress={() => handleDeleteHistoryItem(item.id)}
                  >
                    <Ionicons name="close" size={18} color={Colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Trending Searches */}
          {trendingSearches.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Trending Searches 🔥</Text>
              <View style={styles.trendingContainer}>
                {trendingSearches.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.trendingChip}
                    onPress={() => handleSearchSubmit(item)}
                  >
                    <Ionicons name="flame" size={14} color={Colors.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.trendingText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Popular Categories */}
          <Text style={styles.sectionTitle}>Popular Categories</Text>
          <View style={styles.popularCategoriesContainer}>
            {popularCategories.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.popularCategoryCard}
                onPress={() => handleSearchSubmit(item.name)}
              >
                <Ionicons name={item.icon || "color-palette-outline"} size={22} color={Colors.primary} style={{ marginBottom: 6 }} />
                <Text style={styles.popularCategoryText}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );

}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white, paddingHorizontal: 16, paddingTop: 50 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.inputBackground,
    justifyContent: "center",
    alignItems: "center"
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.text, marginLeft: 12, flex: 1 },
  searchBarContainer: {
    height: 50,
    backgroundColor: Colors.inputBackground,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 16
  },
  searchInput: { flex: 1, color: Colors.text, fontSize: 14 },
  centerLoader: { paddingVertical: 40, alignItems: "center" },
  loaderText: { fontSize: 12, color: Colors.textSecondary, marginTop: 8 },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border
  },
  suggestionTextContainer: { flex: 1 },
  suggestionText: { fontSize: 14, fontWeight: "600", color: Colors.text },
  suggestionType: { fontSize: 10, color: Colors.textSecondary, textTransform: "capitalize", marginTop: 2 },
  emptySuggestions: { paddingVertical: 30, alignItems: "center" },
  emptyText: { fontSize: 13, color: Colors.textSecondary, fontStyle: "italic" },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: Colors.text, marginBottom: 10 },
  clearAllBtn: { fontSize: 12, fontWeight: "600", color: Colors.primary },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border
  },
  historyBtn: { flex: 1, flexDirection: "row", alignItems: "center" },
  historyText: { fontSize: 14, color: Colors.text, flex: 1 },
  historyDelete: { padding: 4 },
  trendingContainer: { flexDirection: "row", flexWrap: "wrap", marginTop: 6 },
  trendingChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primaryLight + "15",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8
  },
  trendingText: { fontSize: 12, color: Colors.primary, fontWeight: "600" },
  popularCategoriesContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 6 },
  popularCategoryCard: {
    width: "48%",
    backgroundColor: Colors.inputBackground,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10
  },
  popularCategoryText: { fontSize: 12, fontWeight: "600", color: Colors.text },
  micBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: Colors.white,
  },
  voiceBanner: {
    backgroundColor: Colors.primary || "#9C1344",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  voiceText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  chipsWrapper: {
    marginBottom: 14,
  },
  chipsContainer: {
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.inputBackground,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border || "#E5E7EB",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.text || "#1D1D1D",
  },
});

