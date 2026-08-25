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
import { getCoupons, autoApplyCoupon } from "../../services/coupon";

export default function CouponsScreen({ route, navigation }) {
  const [coupons, setCoupons] = useState([]);
  const [couponCode, setCouponCode] = useState(route.params?.prefilledCode || "");
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const onSelectCoupon = route.params?.onSelectCoupon;
  const appliedCode = (route.params?.prefilledCode || "").trim().toUpperCase();
  const basePrice = Number(route.params?.basePrice || route.params?.amount || 0);

  useEffect(() => {
    if (route.params?.prefilledCode) {
      setCouponCode(route.params.prefilledCode);
    }
  }, [route.params?.prefilledCode]);

  const fetchCouponsList = React.useCallback(async () => {
    try {
      const data = await getCoupons();
      setCoupons(Array.isArray(data) ? data : (data?.data || []));
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

  const handleAutoApplyBest = async () => {
    setApplying(true);
    try {
      const res = await autoApplyCoupon(basePrice);
      const best = res?.data || res;
      if (best && (best.couponCode || best.coupon_code || best.code)) {
        const code = (best.couponCode || best.coupon_code || best.code).toUpperCase();
        if (onSelectCoupon) {
          onSelectCoupon(code);
          navigation.goBack();
        } else {
          Alert.alert("Best Coupon Applied 🎉", `Applied ${code} for maximum savings!`);
        }
      } else {
        Alert.alert("Notice", "No eligible coupons for this booking value.");
      }
    } catch (err) {
      Alert.alert("Notice", err.message || "No auto-apply coupon found.");
    } finally {
      setApplying(false);
    }
  };

  const handleApplyCode = async () => {
    const clean = couponCode.trim().toUpperCase();
    if (!clean) {
      Alert.alert("Input Error", "Please type a coupon code.");
      return;
    }
    if (clean === appliedCode) {
      Alert.alert("Notice", "This coupon is already applied.");
      return;
    }

    if (onSelectCoupon) {
      onSelectCoupon(clean);
      navigation.goBack();
    } else {
      Alert.alert("Applied 🎉", `Promo code ${clean} applied!`);
    }
  };

  const handleSelectCoupon = (item) => {
    const itemCode = (item.code || "").trim().toUpperCase();
    if (item.is_active === false) {
      Alert.alert("Promo Error", "This coupon code has expired.");
      return;
    }
    if (itemCode === appliedCode) {
      Alert.alert("Notice", "This coupon is already applied to your booking.");
      return;
    }

    if (onSelectCoupon) {
      onSelectCoupon(itemCode);
      navigation.goBack();
    } else {
      Alert.alert("Applied 🎉", `Promo code ${itemCode} selected!`);
    }
  };

  const renderCoupon = ({ item }) => {
    const itemCode = (item.code || "").trim().toUpperCase();
    const isCurrentlyApplied = appliedCode === itemCode;
    const expiresDate = item.expires_at ? new Date(item.expires_at).toDateString() : "Active";
    const dType = String(item.discount_type || "").toUpperCase();
    const isFlat = dType === "FLAT" || dType === "FIXED";
    const discountText = isFlat
      ? `₹${item.discount_value || 100} FLAT Discount`
      : `${item.discount_value || item.discount_percentage || 20}% OFF${item.max_discount ? ` up to ₹${item.max_discount}` : ""}`;

    const tagLabel = itemCode.includes("FIRST") || itemCode.includes("WELCOME")
      ? "First Order Offer 🎉"
      : itemCode.includes("RAKHI") || itemCode.includes("TEEJ") || itemCode.includes("KANHA") || itemCode.includes("BAPPA") || itemCode.includes("GARBA") || itemCode.includes("KARWA") || itemCode.includes("DIWALI") || itemCode.includes("HOLI")
      ? "Festival Special ✨"
      : itemCode.includes("BRIDAL")
      ? "Bridal Package 👰"
      : "Exclusive Offer";

    const minOrder = item.min_order_amount || item.min_booking_value || item.min_booking_amount || 0;

    return (
      <View style={[styles.couponCard, isCurrentlyApplied && styles.couponCardApplied]}>
        <View style={[styles.iconBox, isCurrentlyApplied && styles.iconBoxApplied]}>
          <Ionicons name={isCurrentlyApplied ? "checkmark-circle" : "pricetag"} size={20} color={isCurrentlyApplied ? "#059669" : (Colors.primary || "#9C1344")} />
        </View>
        <View style={styles.detailsContainer}>
          <View style={styles.codeRow}>
            <Text style={[styles.couponCode, isCurrentlyApplied && { color: "#059669" }]}>{item.code}</Text>
            <View style={[styles.tagBadge, isCurrentlyApplied && { backgroundColor: "#ECFDF5" }]}>
              <Text style={[styles.tagText, isCurrentlyApplied && { color: "#059669" }]}>{tagLabel}</Text>
            </View>
          </View>
          <Text style={styles.description}>{discountText}</Text>
          <Text style={styles.validity}>Expires: {expiresDate}{minOrder > 0 ? ` • Min Order: ₹${minOrder}` : ""}</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={isCurrentlyApplied}
          onPress={() => handleSelectCoupon(item)}
          style={[styles.applyButton, isCurrentlyApplied && styles.applyButtonApplied]}
        >
          <Text style={[styles.applyButtonText, isCurrentlyApplied && styles.applyButtonTextApplied]}>
            {isCurrentlyApplied ? "Applied ✓" : "Apply"}
          </Text>
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
  couponCardApplied: {
    borderColor: "#10B981",
    backgroundColor: "#F0FDF4",
  },
  iconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: "#FFF0F4", justifyContent: "center", alignItems: "center" },
  iconBoxApplied: { backgroundColor: "#DCFCE7" },
  detailsContainer: { flex: 1, marginLeft: 12 },
  codeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  couponCode: { fontSize: 14, fontWeight: "700", color: Colors.text || "#1D1D1D" },
  tagBadge: { backgroundColor: "#FFF1F5", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  tagText: { fontSize: 9, fontWeight: "700", color: Colors.primary || "#9C1344" },
  description: { fontSize: 12, color: Colors.textSecondary || "#666666", marginTop: 4 },
  validity: { fontSize: 10, color: Colors.textTertiary || "#94A3B8", marginTop: 4 },
  applyButton: { borderWidth: 1, borderColor: Colors.primary || "#9C1344", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  applyButtonApplied: { backgroundColor: "#059669", borderColor: "#059669" },
  applyButtonText: { color: Colors.primary || "#9C1344", fontWeight: "700", fontSize: 12 },
  applyButtonTextApplied: { color: "#FFFFFF" },
  emptyContainer: { alignItems: "center", marginTop: 40 },
  emptyText: { color: Colors.textSecondary || "#666666", marginTop: 10, fontSize: 14 },
});
