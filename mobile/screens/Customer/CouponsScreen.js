import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import { getCoupons, applyCoupon } from "../../services/coupon";

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
      console.log("Failed to load coupons:", err.message);
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

  const handleApplyCode = async () => {
    if (!couponCode.trim()) {
      Alert.alert("Input Error", "Please type a coupon code.");
      return;
    }
    
    // If we have an onSelectCoupon callback, invoke it and return
    if (onSelectCoupon) {
      onSelectCoupon(couponCode.trim().toUpperCase());
      navigation.goBack();
    } else {
      Alert.alert("Applied 🎉", `Promo code ${couponCode.trim().toUpperCase()} applied successfully!`);
    }
  };

  const handleSelectCoupon = (item) => {
    if (!item.is_active) {
      Alert.alert("Promo Error", "This coupon code has expired.");
      return;
    }
    
    if (onSelectCoupon) {
      onSelectCoupon(item.code);
      navigation.goBack();
    } else {
      Alert.alert("Applied", `Promo code ${item.code} selected!`);
    }
  };

  const renderCoupon = ({ item }) => {
    const expiresDate = item.expires_at ? new Date(item.expires_at).toDateString() : "TBD";
    const discountText = item.discount_type === "FLAT" 
      ? `₹${item.discount_value} FLAT Discount`
      : `${item.discount_percentage}% off up to ₹${item.max_discount}`;

    return (
      <View style={styles.couponCard}>
        <View style={styles.iconBox}>
          <Ionicons name="gift" size={20} color={Colors.primary} />
        </View>
        <View style={styles.detailsContainer}>
          <Text style={styles.couponCode}>{item.code}</Text>
          <Text style={styles.description}>{discountText}</Text>
          <Text style={styles.validity}>Expires: {expiresDate} • Min Order: ₹{item.min_booking_value}</Text>
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Coupons & Offers</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.couponInputCard}>
        <TextInput
          value={couponCode}
          onChangeText={setCouponCode}
          placeholder="Enter Custom Promo Code"
          placeholderTextColor={Colors.textTertiary}
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
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="gift-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No available coupons at the moment.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 16 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.white, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700", color: Colors.text },
  couponInputCard: { backgroundColor: Colors.white, borderRadius: 14, padding: 8, flexDirection: "row", alignItems: "center", marginVertical: 14, borderWidth: 1, borderColor: Colors.border, elevation: 1 },
  input: { flex: 1, height: 40, fontSize: 13, color: Colors.text, paddingHorizontal: 10 },
  inputApplyBtn: { backgroundColor: Colors.primary, paddingHorizontal: 18, height: 38, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  inputApplyText: { color: Colors.white, fontWeight: "700", fontSize: 12 },
  couponCard: { backgroundColor: Colors.white, borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", marginBottom: 10, borderWidth: 1, borderColor: Colors.border, elevation: 1 },
  iconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: "#FFF0F4", justifyContent: "center", alignItems: "center" },
  detailsContainer: { flex: 1, marginLeft: 12 },
  couponCode: { fontSize: 14, fontWeight: "700", color: Colors.text },
  description: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  validity: { fontSize: 10, color: Colors.textTertiary, marginTop: 4 },
  applyButton: { borderWidth: 1, borderColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  applyButtonText: { color: Colors.primary, fontWeight: "700", fontSize: 12 },
  emptyContainer: { alignItems: "center", marginTop: 40 },
  emptyText: { color: Colors.textSecondary, marginTop: 10, fontSize: 14 }
});
