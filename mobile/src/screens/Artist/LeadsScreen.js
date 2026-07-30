import React, { useState, useEffect, useCallback } from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  RefreshControl
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../constants/Colors";
import { getLeads } from "../../services/leads";

export default function LeadsScreen({ route, navigation }) {
  // Tabs & Lists
  const [activeTab, setActiveTab] = useState("All");

  useEffect(() => {
    if (route?.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route?.params?.initialTab]);
  const [leadsList, setLeadsList] = useState([]);
  const [stats, setStats] = useState(null);
  
  // Controls
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Sorting
  const [selectedSort, setSelectedSort] = useState("Newest");
  const [sortModalVisible, setSortModalVisible] = useState(false);

  // Filters Modal
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [cityFilter, setCityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFilter, setDateFilter] = useState(""); // Today, Tomorrow, This Week
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  // Search debounce simulation
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const filters = {
        search: debouncedSearch,
        sort: selectedSort,
        city: cityFilter,
        category: categoryFilter,
        dateRange: dateFilter,
        minPrice,
        maxPrice
      };

      if (activeTab !== "All") {
        filters.status = activeTab;
      }

      const response = await getLeads(filters);
      setLeadsList(response?.leads || []);
      setStats(response?.stats || null);
    } catch (err) {
      console.log("Failed to load leads:", err);
      setError(err?.message || "Something went wrong. Please check your connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, debouncedSearch, selectedSort, cityFilter, categoryFilter, dateFilter, minPrice, maxPrice]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadData(true);
    });
    return unsubscribe;
  }, [navigation, loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const clearFilters = () => {
    setCityFilter("");
    setCategoryFilter("");
    setDateFilter("");
    setMinPrice("");
    setMaxPrice("");
    setFilterModalVisible(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "New Lead": return { bg: "#FFEBEB", text: "#FF4D4D" };
      case "Viewed": return { bg: "#EAF2FF", text: "#2F80ED" };
      case "Accepted": return { bg: "#E3F9E5", text: "#18B65B" };
      case "Rejected": return { bg: "#FFF0F0", text: "#EB5757" };
      case "Expired": return { bg: "#F2F2F2", text: "#828282" };
      case "Cancelled": return { bg: "#FFF4E6", text: "#FF8C00" };
      case "Completed": return { bg: "#E3F9E5", text: "#18B65B" };
      default: return { bg: "#F2F2F2", text: "#333333" };
    }
  };

  const renderLeadCard = ({ item }) => {
    const statusStyle = getStatusColor(item.status);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("LeadDetails", { id: item.id })}
        activeOpacity={0.9}
      >
        <Image
          source={item.customer_image ? { uri: item.customer_image } : require("../../assets/images/Henna.jpg")}
          style={styles.avatar}
        />
        <View style={styles.cardDetails}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.customerName}>{item.customer_name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>{item.status}</Text>
            </View>
          </View>
          
          <Text style={styles.serviceName}>{item.service_name}</Text>
          
          <View style={styles.cardInfoRow}>
            <Ionicons name="calendar-outline" size={13} color={Colors.textTertiary} />
            <Text style={styles.cardInfoText}>
              {new Date(item.booking_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} at {item.booking_time}
            </Text>
          </View>

          <View style={styles.cardInfoRow}>
            <Ionicons name="location-outline" size={13} color={Colors.textTertiary} />
            <Text style={styles.cardInfoText} numberOfLines={1}>
              {item.address || `${item.city}, Goa`} • {item.distance}
            </Text>
          </View>

          <View style={styles.cardFooterRow}>
            <Text style={styles.bookingCode}>ID: {item.booking_code}</Text>
            <Text style={styles.priceText}>₹{item.price?.toLocaleString("en-IN")}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderStatsDashboard = () => {
    if (!stats) return null;
    
    const items = [
      { label: "Today's Leads", value: stats.todayLeads, icon: "calendar-outline", color: "#FF4D6D", bg: "#FFF0F2" },
      { label: "Pending Leads", value: stats.pendingLeads, icon: "hourglass-outline", color: "#FFAA00", bg: "#FFF9E6" },
      { label: "Conversion", value: `${stats.conversionRate}%`, icon: "analytics-outline", color: "#2F80ED", bg: "#EBF3FF" },
      { label: "Response", value: stats.responseTime, icon: "speedometer-outline", color: "#9B51E0", bg: "#F6EEFF" },
      { label: "Earnings", value: `₹${stats.totalEarnings?.toLocaleString("en-IN")}`, icon: "wallet-outline", color: "#27AE60", bg: "#EAF9EE" }
    ];

    return (
      <View style={styles.statsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statsScrollView}
          contentContainerStyle={styles.statsContainer}
        >
          {items.map((item, index) => (
            <View key={index} style={[styles.statCard, { backgroundColor: item.bg, borderColor: item.color + "25" }]}>
              <View style={styles.statCardHeader}>
                <Ionicons name={item.icon} size={15} color={item.color} />
                <Text style={styles.statLabel} numberOfLines={1}>{item.label}</Text>
              </View>
              <Text style={[styles.statValue, { color: Colors.text }]}>{item.value}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Title & Filter Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Customer Leads</Text>
          <Text style={styles.subtitle}>Manage bookings & request list</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => setSortModalVisible(true)}>
            <Ionicons name="swap-vertical-outline" size={20} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => setFilterModalVisible(true)}>
            <Ionicons name="filter-outline" size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Board */}
      {renderStatsDashboard()}

      {/* Search Input */}
      <View style={styles.searchSection}>
        <View style={styles.searchBarContainer}>
          <Ionicons name="search-outline" size={18} color={Colors.textTertiary} />
          <TextInput
            placeholder="Search by ID, name, city..."
            placeholderTextColor={Colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={16} color={Colors.textTertiary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabScrollWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabContainer}>
          {["All", "New Lead", "Viewed", "Accepted", "Completed", "Expired"].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Lead Cards List */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loaderText}>Loading live leads...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.primary} />
          <Text style={styles.errorTitle}>Failed to load leads</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadData()}>
            <Text style={styles.retryText}>Retry Connection</Text>
          </TouchableOpacity>
        </View>
      ) : leadsList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="file-tray-outline" size={54} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>No Leads Found</Text>
          <Text style={styles.emptySubtitle}>Try adjusting your filters or pull to refresh.</Text>
        </View>
      ) : (
        <FlatList
          data={leadsList}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderLeadCard}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={5}
          removeClippedSubviews={true}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />
          }
        />
      )}

      {/* Sorting Modal */}
      <Modal visible={sortModalVisible} transparent animationType="fade" onRequestClose={() => setSortModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSortModalVisible(false)}>
          <View style={styles.sortModalContent}>
            <Text style={styles.modalTitle}>Sort By</Text>
            {["Newest", "Oldest", "Highest Budget", "Lowest Budget"].map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.modalOption}
                onPress={() => {
                  setSelectedSort(option);
                  setSortModalVisible(false);
                }}
              >
                <Text style={[styles.modalOptionText, selectedSort === option && styles.modalOptionActiveText]}>{option}</Text>
                {selectedSort === option && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Advanced Filters Modal */}
      <Modal visible={filterModalVisible} transparent animationType="slide" onRequestClose={() => setFilterModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Advanced Filters</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.filterFormScroll}>
              <Text style={styles.filterLabel}>City</Text>
              <TextInput
                placeholder="e.g. Panaji, Margao"
                placeholderTextColor={Colors.textTertiary}
                value={cityFilter}
                onChangeText={setCityFilter}
                style={styles.modalInput}
              />

              <Text style={styles.filterLabel}>Mehndi Category</Text>
              <TextInput
                placeholder="e.g. Arabic, Bridal, Wedding"
                placeholderTextColor={Colors.textTertiary}
                value={categoryFilter}
                onChangeText={setCategoryFilter}
                style={styles.modalInput}
              />

              <Text style={styles.filterLabel}>Date Slot</Text>
              <View style={styles.choiceRow}>
                {["Today", "Tomorrow", "This Week"].map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.choiceChip, dateFilter === d && styles.choiceActiveChip]}
                    onPress={() => setDateFilter(dateFilter === d ? "" : d)}
                  >
                    <Text style={[styles.choiceChipText, dateFilter === d && styles.choiceActiveChipText]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.filterLabel}>Budget Range (₹)</Text>
              <View style={styles.rangeRow}>
                <TextInput
                  placeholder="Min"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="numeric"
                  value={minPrice}
                  onChangeText={setMinPrice}
                  style={[styles.modalInput, { flex: 1, marginRight: 8 }]}
                />
                <TextInput
                  placeholder="Max"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="numeric"
                  value={maxPrice}
                  onChangeText={maxPrice => setMaxPrice(maxPrice)}
                  style={[styles.modalInput, { flex: 1, marginLeft: 8 }]}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooterRow}>
              <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
                <Text style={styles.clearText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={() => setFilterModalVisible(false)}>
                <Text style={styles.applyText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF8FA" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 15, paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: "800", color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.textTertiary, marginTop: 2 },
  headerActions: { flexDirection: "row", alignItems: "center" },
  headerIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.white, justifyContent: "center", alignItems: "center", marginLeft: 8, elevation: 1, shadowColor: Colors.shadow, shadowOpacity: 0.05, shadowRadius: 4 },
  
  statsWrapper: {
    paddingVertical: 4,
    height: 95,
  },
  statsScrollView: {
    height: 95,
    flexGrow: 0,
  },
  statsContainer: {
    paddingHorizontal: 16,
    alignItems: "center",
  },
  statCard: {
    width: 125,
    height: 75,
    padding: 10,
    borderRadius: 16,
    marginRight: 10,
    justifyContent: "space-between",
    borderWidth: 1,
    elevation: 0.5,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.02,
    shadowRadius: 3,
  },
  statCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  statLabel: {
    fontSize: 10.5,
    color: Colors.textSecondary,
    fontWeight: "600",
    marginLeft: 6,
    flex: 1,
  },
  statValue: {
    fontSize: 17,
    fontWeight: "800",
    marginTop: 2,
  },

  searchSection: { paddingHorizontal: 16, marginBottom: 12 },
  searchBarContainer: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.white, borderRadius: 14, height: 48, paddingHorizontal: 12, borderWidth: 1, borderColor: Colors.border, elevation: 1, shadowColor: Colors.shadow, shadowOpacity: 0.04, shadowRadius: 4 },
  searchInput: { flex: 1, marginLeft: 8, color: Colors.text, fontSize: 14 },

  tabScrollWrapper: { height: 45, marginBottom: 8 },
  tabContainer: { paddingHorizontal: 16, alignItems: "center" },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.white, marginRight: 8, elevation: 1, shadowColor: Colors.shadow, shadowOpacity: 0.03, shadowRadius: 4 },
  activeTab: { backgroundColor: Colors.primary },
  tabText: { color: Colors.textSecondary, fontSize: 13, fontWeight: "600" },
  activeTabText: { color: Colors.white },

  listContainer: { paddingHorizontal: 16, paddingBottom: 120 },
  card: { flexDirection: "row", backgroundColor: Colors.white, padding: 14, borderRadius: 20, marginBottom: 12, elevation: 1.5, shadowColor: Colors.shadow, shadowOpacity: 0.05, shadowRadius: 6 },
  avatar: { width: 65, height: 65, borderRadius: 16, alignSelf: "center" },
  cardDetails: { flex: 1, marginLeft: 12 },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  customerName: { fontSize: 15, fontWeight: "700", color: Colors.text },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { fontSize: 10, fontWeight: "700" },
  serviceName: { fontSize: 13, color: Colors.primary, fontWeight: "600", marginTop: 2 },
  cardInfoRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  cardInfoText: { fontSize: 12, color: Colors.textSecondary, marginLeft: 5 },
  cardFooterRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, borderTopWidth: 0.5, borderTopColor: "#F0F0F0", paddingTop: 8 },
  bookingCode: { fontSize: 11, color: Colors.textTertiary, fontWeight: "500" },
  priceText: { fontSize: 15, fontWeight: "800", color: Colors.text },

  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loaderText: { fontSize: 14, color: Colors.textSecondary, marginTop: 8 },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 30 },
  errorTitle: { fontSize: 16, fontWeight: "700", color: Colors.text, marginTop: 10 },
  errorSubtitle: { fontSize: 13, color: Colors.textTertiary, textAlign: "center", marginTop: 4 },
  retryBtn: { marginTop: 15, backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: Colors.white, fontWeight: "600" },

  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 100 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: Colors.textSecondary, marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: Colors.textTertiary, textAlign: "center", marginTop: 4, paddingHorizontal: 30 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sortModalContent: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: Colors.text, marginBottom: 16 },
  modalOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: "#F0F0F0" },
  modalOptionText: { fontSize: 15, color: Colors.textSecondary },
  modalOptionActiveText: { color: Colors.primary, fontWeight: "600" },

  filterModalContent: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: "70%", padding: 24 },
  modalHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  filterFormScroll: { paddingBottom: 20 },
  filterLabel: { fontSize: 14, fontWeight: "600", color: Colors.textSecondary, marginTop: 14, marginBottom: 8 },
  modalInput: { backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, height: 46, color: Colors.text, fontSize: 14 },
  choiceRow: { flexDirection: "row", marginTop: 4 },
  choiceChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.background, marginRight: 8, borderWidth: 1, borderColor: Colors.border },
  choiceActiveChip: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  choiceChipText: { fontSize: 12, color: Colors.textSecondary },
  choiceActiveChipText: { color: Colors.white, fontWeight: "600" },
  rangeRow: { flexDirection: "row", alignItems: "center" },
  modalFooterRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#EEE", paddingTop: 15, marginTop: 15 },
  clearBtn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, borderColor: Colors.primary, justifyContent: "center", alignItems: "center", marginRight: 8 },
  clearText: { color: Colors.primary, fontWeight: "700" },
  applyBtn: { flex: 1.5, height: 48, borderRadius: 12, backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center", marginLeft: 8 },
  applyText: { color: Colors.white, fontWeight: "700" }
});
