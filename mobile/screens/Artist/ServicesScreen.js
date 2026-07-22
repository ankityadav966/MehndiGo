import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useEffect } from "react";
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
import CustomButton from "../../components/CustomButton";
import { getArtistServices, updateArtistServiceStatus } from "../../services/artist";

export default function ServicesScreen({ navigation }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchServicesList = React.useCallback(async () => {
    try {
      const data = await getArtistServices();
      setServices(data || []);
    } catch (err) {
      console.log("Failed to load services list:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchServicesList();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchServicesList]);

  const handleToggleStatus = async (item) => {
    const newStatus = !item.is_active;
    try {
      await updateArtistServiceStatus(item.id, newStatus);
      setServices((prev) =>
        prev.map((s) => (s.id === item.id ? { ...s, is_active: newStatus } : s))
      );
      Alert.alert("Status Updated", `Service status set to ${newStatus ? "ACTIVE" : "INACTIVE"}`);
    } catch (err) {
      Alert.alert("Error", "Could not toggle service status.");
    }
  };

  const renderItem = ({ item }) => {
    const imageUri = item.service_image || "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=500";
    return (
      <TouchableOpacity
        style={[styles.card, !item.is_active && styles.inactiveCard]}
        activeOpacity={0.9}
        onPress={() => navigation.navigate("ServiceDetails", { id: item.id })}
      >
        <View style={styles.leftSection}>
          <Image source={{ uri: imageUri }} style={styles.image} />
          <View style={styles.info}>
            <Text style={styles.serviceName}>{item.specialization_name}</Text>
            <Text style={styles.serviceType}>
              {item.category} • ⏱️ {item.duration_minutes} mins
            </Text>
            <Text style={styles.price}>Min: ₹{item.minimum_price}</Text>
          </View>
        </View>
        <View style={styles.rightSection}>
          <Switch
            value={item.is_active}
            onValueChange={() => handleToggleStatus(item)}
            trackColor={{ false: "#E0E0E0", true: "#FCCFDF" }}
            thumbColor={item.is_active ? Colors.primary : Colors.border}
          />
        </View>
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

  // Statistics calculation
  const total = services.length;
  const activeCount = services.filter((s) => s.is_active).length;
  const inactiveCount = total - activeCount;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Services Catalog</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={services}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchServicesList} colors={[Colors.primary]} />
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
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
              <Text style={styles.statLbl}>Inactive</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="list-outline" size={48} color={Colors.border} />
            <Text style={styles.emptyText}>No services created yet.</Text>
          </View>
        }
      />

      <View style={styles.footer}>
        <CustomButton title="Create New Service" onPress={() => navigation.navigate("AddService")} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  statsRow: { flexDirection: "row", gap: 10, marginHorizontal: 16, marginVertical: 14 },
  statBox: { flex: 1, backgroundColor: Colors.white, borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: Colors.border, elevation: 1 },
  statVal: { fontSize: 16, fontWeight: "800", color: Colors.text },
  statLbl: { fontSize: 10, color: Colors.textSecondary, marginTop: 4 },
  list: { paddingBottom: 100 },
  card: { backgroundColor: Colors.white, borderRadius: 16, padding: 14, marginHorizontal: 16, marginBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: Colors.border, elevation: 1 },
  inactiveCard: { opacity: 0.65 },
  leftSection: { flexDirection: "row", alignItems: "center", flex: 1 },
  image: { width: 60, height: 60, borderRadius: 12 },
  info: { marginLeft: 12, flex: 1 },
  serviceName: { fontSize: 14, fontWeight: "700", color: Colors.text },
  serviceType: { marginTop: 4, fontSize: 11, color: Colors.textSecondary },
  price: { fontSize: 12, fontWeight: "700", color: Colors.primary, marginTop: 4 },
  rightSection: { justifyContent: "center", alignItems: "flex-end" },
  emptyContainer: { paddingVertical: 60, alignItems: "center" },
  emptyText: { fontSize: 12, color: Colors.textTertiary, marginTop: 12 },
  footer: { paddingHorizontal: 16, paddingBottom: 20, backgroundColor: Colors.background }
});
