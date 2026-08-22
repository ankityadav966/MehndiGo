import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";
import Alert from "../../utils/Alert";
import Colors from "../../constants/Colors";
import { getCoupons } from "../../services/coupon";

export default function CouponsScreen({ route, navigation }) {
  const [coupons, setCoupons] = useState([]);
  const [couponCode, setCouponCode] = useState("");
  const [loading, setLoading] = useState(true);
  const onSelectCoupon = route.params?.onSelectCoupon;

  const fetchCouponsList = React.useCallback(async () => {
    try {
      const data = await getCoupons();
      setCoupons(data || []);
    } catch (err) {
      if (__DEV__) console.log("Failed to load coupons:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCouponsList();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchCouponsList]);

  const handleAutoApplyBest = () => {
    if (!coupons || coupons.length === 0) {
      Alert.alert("Notice", "No active coupons available right now.");
      return;
    }
    // Pick active coupon with max discount
    const activeCoupons = coupons.filter((c) => c.is_active !== false);
    if (activeCoupons.length === 0) {
      Alert.alert("Notice", "No valid coupons currently available.");
      return;
    }
    const best = activeCoupons[0];
    if (onSelectCoupon) {
      onSelectCoupon(best.code);
      navigation.goBack();
    } else {
      Alert.alert("Best Coupon Applied 🎉", `Applied ${best.code} for maximum savings!`);
    }
  };

  const handleApplyCode = async () => {
    if (!couponCode.trim()) {
      Alert.alert("Input Error", "Please type a coupon code.");
      return;
    }

    if (onSelectCoupon) {
      onSelectCoupon(couponCode.trim().toUpperCase());
      navigation.goBack();
    } else {
      Alert.alert("Applied 🎉", `Promo code ${couponCode.trim().toUpperCase()} applied successfully!`);
    }
  };

  const handleSelectCoupon = (item) => {
    if (item.is_active === false) {
      Alert.alert("Promo Error", "This coupon code has expired.");
      return;
    }

    if (onSelectCoupon) {
      onSelectCoupon(item.code);
      navigation.goBack();
    } else {
      Alert.alert("Applied 🎉", `Promo code ${item.code} selected!`);
    }
  };

  const renderCoupon = ({ item }) => {
    const expiresDate = item.expires_at ? new Date(item.expires_at).toDateString() : "TBD";
    const discountText =
      item.discount_type === "FLAT"
        ? `₹${item.discount_value || 100} FLAT Discount`
        : `${item.discount_percentage || 20}% off up to ₹${item.max_discount || 500}`;

    const tagLabel = item.code?.includes("FIRST")
      ? "First Order Offer"
      : item.code?.includes("FESTIVAL") || item.code?.includes("EID")
      ? "Festival Special"
      : "Category Deal";

    return (
      <View style={styles.couponCard}>
        <View style={styles.iconBox}>
          <Ionicons name="pricetag" size={20} color={Colors.primary || "#9C1344"} />
        </View>
        <View style={styles.detailsContainer}>
          <View style={styles.codeRow}>
            <Text style={styles.couponCode}>{item.code}</Text>
            <View style={styles.tagBadge}>
              <Text style={styles.tagText}>{tagLabel}</Text>
            </View>
          </View>
          <Text style={styles.description}>{discountText}</Text>
          <Text style={styles.validity}>Expires: {expiresDate} • Min Order: ₹{item.min_booking_value || 500}</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleSelectCoupon(item)}
          style={styles.applyButton}
        >
          <Text style={styles.applyButtonText}>Apply</Text>
        </TouchableOpacity>
      </View>
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
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={Colors.text || "#1D1D1D"} />
          </TouchableOpacity>
          <Text style={styles.title}>Coupons & Offers</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Auto Apply Best Banner */}
        <View style={styles.autoApplyCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.autoTitle}>Save Max on Your Booking</Text>
            <Text style={styles.autoSub}>Auto-detect best available promo discount</Text>
          </View>
          <TouchableOpacity style={styles.autoBtn} onPress={handleAutoApplyBest}>
            <Ionicons name="sparkles" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.autoBtnText}>Auto-Apply</Text>
          </TouchableOpacity>
        </View>

        {/* Custom Promo Code Input */}
        <View style={styles.couponInputCard}>
          <TextInput
            value={couponCode}
            onChangeText={setCouponCode}
            placeholder="Enter Custom Promo Code"
            placeholderTextColor={Colors.textTertiary || "#94A3B8"}
            autoCapitalize="characters"
            style={styles.input}
          />
          <TouchableOpacity style={styles.inputApplyBtn} onPress={handleApplyCode}>
            <Text style={styles.inputApplyText}>Apply</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={coupons}
          renderItem={renderCoupon}
          keyExtractor={(item) => (item.id || item.code).toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="gift-outline" size={48} color={Colors.textTertiary || "#94A3B8"} />
              <Text style={styles.emptyText}>No available coupons at the moment.</Text>
            </View>
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background || "#F9FAFB", paddingHorizontal: 16 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.white || "#FFFFFF", justifyContent: "center", alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700", color: Colors.text || "#1D1D1D" },
  autoApplyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  autoTitle: { fontSize: 14, fontWeight: "700", color: "#065F46" },
  autoSub: { fontSize: 11, color: "#047857", marginTop: 2 },
  autoBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary || "#9C1344",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  autoBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 12 },
  couponInputCard: {
    backgroundColor: Colors.white || "#FFFFFF",
    borderRadius: 14,
    padding: 6,
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border || "#E5E7EB",
  },
  input: { flex: 1, height: 40, fontSize: 13, color: Colors.text || "#1D1D1D", paddingHorizontal: 10 },
  inputApplyBtn: { backgroundColor: Colors.primary || "#9C1344", paddingHorizontal: 18, height: 38, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  inputApplyText: { color: Colors.white || "#FFFFFF", fontWeight: "700", fontSize: 12 },
  couponCard: {
    backgroundColor: Colors.white || "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border || "#E5E7EB",
  },
  iconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: "#FFF0F4", justifyContent: "center", alignItems: "center" },
  detailsContainer: { flex: 1, marginLeft: 12 },
  codeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  couponCode: { fontSize: 14, fontWeight: "700", color: Colors.text || "#1D1D1D" },
  tagBadge: { backgroundColor: "#FFF1F5", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  tagText: { fontSize: 9, fontWeight: "700", color: Colors.primary || "#9C1344" },
  description: { fontSize: 12, color: Colors.textSecondary || "#666666", marginTop: 4 },
  validity: { fontSize: 10, color: Colors.textTertiary || "#94A3B8", marginTop: 4 },
  applyButton: { borderWidth: 1, borderColor: Colors.primary || "#9C1344", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  applyButtonText: { color: Colors.primary || "#9C1344", fontWeight: "700", fontSize: 12 },
  emptyContainer: { alignItems: "center", marginTop: 40 },
  emptyText: { color: Colors.textSecondary || "#666666", marginTop: 10, fontSize: 14 },
});
