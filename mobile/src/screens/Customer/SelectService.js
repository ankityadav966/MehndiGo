import React, { useState, useEffect } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator
} from "react-native";
import Alert from "../../utils/Alert";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../constants/Colors";
import { fetchArtistServices } from "../../services/customer";

export default function SelectService({ route, navigation }) {
  const { artistId, selectedDate, selectedTimeSlot } = route.params || {};

  const [services, setServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!artistId) {
      Alert.alert("Error", "No artist selected.");
      navigation.goBack();
      return;
    }

    const loadServices = async () => {
      try {
        const data = await fetchArtistServices(artistId);
        setServices(data || []);
        if (data && data.length > 0) {
          setSelectedServiceId(data[0].id);
        }
      } catch (err) {
        Alert.alert("Error", "Failed to fetch artist services.");
      } finally {
        setLoading(false);
      }
    };

    loadServices();
  }, [artistId]);

  const handleContinue = () => {
    if (!selectedServiceId) {
      Alert.alert("Required", "Please select a mehndi service to continue.");
      return;
    }

    navigation.navigate("SelectDate", {
      artistId,
      serviceId: selectedServiceId,
      selectedDate,
      selectedTimeSlot
    });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.serviceCard,
        selectedServiceId === item.id && styles.selectedCard
      ]}
      onPress={() => setSelectedServiceId(item.id)}
    >
      <View style={{ flex: 1, marginRight: 8 }}>
        <Text style={styles.serviceName}>{item.specialization_name || item.name}</Text>
        <Text style={styles.serviceDesc} numberOfLines={2}>
          {item.description || "Beautiful professional mehndi design customization."}
        </Text>
      </View>
      <View style={styles.rightSection}>
        <Text style={styles.price}>₹{item.minimum_price}</Text>
        <View
          style={[
            styles.radio,
            selectedServiceId === item.id && styles.radioActive
          ]}
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Select Service</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={services}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="list-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No services listed by this artist.</Text>
            </View>
          }
        />
      )}

      <View style={styles.bottom}>
        <TouchableOpacity
          style={[styles.continueBtn, !selectedServiceId && styles.disabledBtn]}
          onPress={handleContinue}
          disabled={!selectedServiceId}
        >
          <Text style={styles.continueText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingTop: 10 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.white, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700", color: Colors.text },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContainer: { paddingHorizontal: 16, paddingBottom: 40 },
  serviceCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.white,
    elevation: 2
  },
  selectedCard: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight + "15" },
  serviceName: { fontSize: 14, fontWeight: "700", color: Colors.text },
  serviceDesc: { fontSize: 11, color: Colors.textSecondary, marginTop: 4 },
  rightSection: { flexDirection: "row", alignItems: "center" },
  price: { fontSize: 14, fontWeight: "700", color: Colors.primary, marginRight: 12 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: Colors.border },
  radioActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  bottom: { padding: 16, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border },
  continueBtn: { height: 48, backgroundColor: Colors.primary, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  disabledBtn: { backgroundColor: Colors.textTertiary },
  continueText: { color: Colors.white, fontSize: 14, fontWeight: "700" },
  emptyContainer: { paddingVertical: 80, alignItems: "center" },
  emptyText: { fontSize: 13, color: Colors.textTertiary, marginTop: 8 }
});
