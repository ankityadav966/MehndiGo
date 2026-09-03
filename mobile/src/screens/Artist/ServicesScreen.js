/**
 * ServicesScreen.js  — My Services (Artist)
 *
 * Features:
 *  - GET services from API on mount + on focus
 *  - Pull-to-refresh
 *  - Service cards with: cover image, categories (with +N overflow), price,
 *    service type badge, active/inactive toggle
 *  - Stats header (Total / Active / Inactive)
 *  - Empty state with "+ Add Your First Service" CTA
 *  - Tap card → ServiceDetails; 3-dot menu → Edit / Delete (via ServiceDetails)
 */

import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import { getArtistServices, updateArtistServiceStatus } from "../../services/artist";

const PLACEHOLDER_IMG =
  "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=400&q=70";

/** Safely parse category stored as JSON string or already-array */
function parseCategory(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [raw];
    } catch {
      return [raw];
    }
  }
  return [];
}

/** Safely parse service_image which may be a JSON array of URLs or a single URL */
function parseCoverImage(raw) {
  if (!raw) return null;
  if (typeof raw === "string") {
    if (raw.startsWith("[")) {
      try {
        const arr = JSON.parse(raw);
        return Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
      } catch {
        return raw;
      }
    }
    return raw;
  }
  return null;
}

function parseImageCount(raw) {
  if (!raw) return 0;
  if (typeof raw === "string" && raw.startsWith("[")) {
    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.length : 1;
    } catch {
      return 1;
    }
  }
  return raw ? 1 : 0;
}

// ── Category chips with overflow ──────────────────────────────────────────────
function CategoryChips({ categories }) {
  const visible = categories.slice(0, 3);
  const overflow = categories.length - visible.length;
  return (
    <View style={chipStyles.row}>
      {visible.map((cat, i) => (
        <View key={i} style={chipStyles.chip}>
          <Text style={chipStyles.chipText} numberOfLines={1}>
            {cat}
          </Text>
        </View>
      ))}
      {overflow > 0 && (
        <View style={[chipStyles.chip, chipStyles.chipMore]}>
          <Text style={chipStyles.chipMoreText}>+{overflow}</Text>
        </View>
      )}
    </View>
  );
}

const chipStyles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 },
  chip: {
    backgroundColor: "#FFF0F4",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  chipText: { fontSize: 10, color: Colors.primary, fontWeight: "600" },
  chipMore: { backgroundColor: Colors.border },
  chipMoreText: { fontSize: 10, color: Colors.textSecondary, fontWeight: "600" }
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ServicesScreen({ navigation }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchServices = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);
      const data = await getArtistServices();
      setServices(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load services.");
      if (__DEV__) console.log("ServicesScreen fetch error:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
    const unsubscribe = navigation.addListener("focus", () => {
      fetchServices();
    });
    return unsubscribe;
  }, [fetchServices, navigation]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchServices(true);
  }, [fetchServices]);

  const handleToggleStatus = async (item) => {
    const newStatus = !item.is_active;
    try {
      await updateArtistServiceStatus(item.id, newStatus);
      setServices((prev) =>
        prev.map((s) => (s.id === item.id ? { ...s, is_active: newStatus } : s))
      );
    } catch (err) {
      Alert.alert("Error", "Could not update service status.");
    }
  };

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading && services.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Services</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading your services…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (error && services.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Services</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="cloud-offline-outline" size={52} color={Colors.border} />
          <Text style={styles.errorTitle}>Could not load services</Text>
          <Text style={styles.errorMsg}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchServices()}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const total = services.length;
  const activeCount = services.filter((s) => s.is_active).length;
  const inactiveCount = total - activeCount;

  // ── Service card ─────────────────────────────────────────────────────────
  const renderItem = ({ item }) => {
    const categories = parseCategory(item.category);
    const coverUri = parseCoverImage(item.service_image) || PLACEHOLDER_IMG;

    return (
      <TouchableOpacity
        style={[styles.serviceItemCard, !item.is_active && styles.cardInactive]}
        activeOpacity={0.88}
        onPress={() => navigation.navigate("ServiceDetails", { id: item.id })}
      >
        {/* Image (Left) */}
        <View style={{ width: 64, height: 64, borderRadius: 10, backgroundColor: '#f1f5f9', overflow: 'hidden' }}>
          <Image source={{ uri: coverUri }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
          {!item.is_active && (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="eye-off" size={24} color="#fff" />
            </View>
          )}
        </View>

        {/* Title & Subtitle (Center) */}
        <View style={{ flex: 1, marginLeft: 14, justifyContent: 'center' }}>
          <Text style={[styles.svcTitle, { fontSize: 15, marginBottom: 4 }]} numberOfLines={1}>
            {item.specialization_name || (categories.length > 0 ? categories[0] : item.category)}
          </Text>
          <Text style={{ fontSize: 13, color: '#64748B' }} numberOfLines={1}>
            {item.description || (categories.length > 0 ? categories.join(', ') : "Mehndi Service")}
          </Text>
        </View>

        {/* Price & Action (Right) */}
        <View style={{ alignItems: 'flex-end', marginLeft: 10, justifyContent: 'center' }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 4 }}>
            {item.minimum_price ? `₹${item.minimum_price}` : "On Req"}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: Colors.primary, fontWeight: '600', marginRight: 2 }}>View</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Empty state ──────────────────────────────────────────────────────────
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name="cut-outline" size={40} color={Colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>No Services Added Yet</Text>
      <Text style={styles.emptySubtitle}>
        Create your first service to start receiving bookings from customers.
      </Text>
      <TouchableOpacity
        style={styles.emptyAddBtn}
        onPress={() => navigation.navigate("AddService")}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={18} color={Colors.white} />
        <Text style={styles.emptyAddBtnText}>Add Your First Service</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Services</Text>
        <TouchableOpacity
          style={styles.addHeaderBtn}
          onPress={() => navigation.navigate("AddService")}
        >
          <Ionicons name="add" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={services}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        contentContainerStyle={services.length === 0 ? styles.emptyList : styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          services.length > 0 ? (
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{total}</Text>
                <Text style={styles.statLbl}>Total</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statVal, { color: Colors.success }]}>{activeCount}</Text>
                <Text style={styles.statLbl}>Active</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statVal, { color: Colors.error }]}>{inactiveCount}</Text>
                <Text style={styles.statLbl}>Paused</Text>
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={renderEmpty}
      />

      {/* Footer add button — only when services exist */}
      {services.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate("AddService")}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle-outline" size={20} color={Colors.white} />
            <Text style={styles.addButtonText}>Add New Service</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  loadingText: { marginTop: 12, fontSize: 13, color: Colors.textSecondary },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center"
  },
  addHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFF0F4",
    justifyContent: "center",
    alignItems: "center"
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },

  // Stats
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 16,
    marginVertical: 14
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 1
  },
  statVal: { fontSize: 18, fontWeight: "800", color: Colors.text },
  statLbl: { fontSize: 10, color: Colors.textSecondary, marginTop: 2, fontWeight: "600" },

  // List
  list: { paddingBottom: 110 },
  emptyList: { flexGrow: 1 },

  // Card
  serviceItemCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    flexDirection: 'row',
    alignItems: 'center'
  },
  cardInactive: { opacity: 0.7 },
  svcTitle: {
    fontSize: 14,
    fontWeight: "750",
    color: "#0F172A"
  },

  // Error
  errorTitle: { fontSize: 16, fontWeight: "700", color: Colors.text, marginTop: 14 },
  errorMsg: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18
  },
  retryBtn: {
    marginTop: 20,
    paddingHorizontal: 28,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: 12
  },
  retryText: { color: Colors.white, fontWeight: "700", fontSize: 14 },

  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 60
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#FFF0F4",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.text,
    textAlign: "center"
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20
  },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 28,
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    elevation: 3,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  emptyAddBtnText: { color: Colors.white, fontWeight: "700", fontSize: 15 },

  // Footer
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border
  },
  addButton: {
    height: 50,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    elevation: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6
  },
  addButtonText: { color: Colors.white, fontWeight: "700", fontSize: 15 }
});
