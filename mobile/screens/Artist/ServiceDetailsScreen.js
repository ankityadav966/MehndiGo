import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import { getArtistServiceById, deleteArtistService } from "../../services/artist";

export default function ServiceDetailsScreen({ route, navigation }) {
  const { id } = route.params || {};

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchServiceDetail = React.useCallback(async () => {
    try {
      const data = await getArtistServiceById(id);
      setService(data);
    } catch (err) {
      Alert.alert("Error", "Failed to retrieve service details.");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [id, navigation]);

  useEffect(() => {
    if (!id) {
      Alert.alert("Error", "Missing service parameter ID.");
      navigation.goBack();
      return;
    }
    const timer = setTimeout(() => {
      fetchServiceDetail();
    }, 0);
    return () => clearTimeout(timer);
  }, [id, fetchServiceDetail, navigation]);

  const handleEdit = () => {
    navigation.navigate("EditService", { id });
  };

  const handleDelete = () => {
    Alert.alert(
      "Confirm Action",
      "Are you sure you want to permanently delete this service catalog option?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteArtistService(id);
              Alert.alert("Deleted", "Service catalog removed successfully.");
              navigation.goBack();
            } catch (err) {
              Alert.alert("Delete Error", "Could not delete this catalog option.");
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const imageUri = service.service_image || "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=500";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Catalog Details</Text>
          <View style={{ width: 40 }} />
        </View>

        <Image source={{ uri: imageUri }} style={styles.image} />

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <View style={styles.titleInfo}>
              <Text style={styles.serviceName}>{service.specialization_name}</Text>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{service.category}</Text>
              </View>
            </View>
            <Text style={styles.price}>Min ₹{service.minimum_price}</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Short Description</Text>
          <Text style={styles.description}>
            {service.description || "Beautiful custom mehndi styling for all events and occasions."}
          </Text>

          <View style={styles.divider} />

          {/* Service Packages display list */}
          <Text style={styles.sectionTitle}>Packages Offered</Text>
          {service.packages?.map((pkg) => (
            <View key={pkg.id} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{pkg.package_name}</Text>
                <Text style={styles.itemSub}>{pkg.included_designs || "Custom designs"}</Text>
                <Text style={styles.itemSub}>
                  Hands: {pkg.number_of_hands} • Feet: {pkg.number_of_feet} • ⏱️ {pkg.duration} mins
                </Text>
              </View>
              <Text style={styles.itemVal}>₹{pkg.package_price}</Text>
            </View>
          ))}
          {(!service.packages || service.packages.length === 0) && (
            <Text style={styles.emptyNote}>No packages declared.</Text>
          )}

          <View style={styles.divider} />

          {/* Service Add-ons display list */}
          <Text style={styles.sectionTitle}>Add-ons & Extras</Text>
          {service.addons?.map((addon) => (
            <View key={addon.id} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{addon.addon_name}</Text>
                <Text style={styles.itemSub}>{addon.description || "Styling extra option"}</Text>
              </View>
              <Text style={styles.itemVal}>+₹{addon.addon_price}</Text>
            </View>
          ))}
          {(!service.addons || service.addons.length === 0) && (
            <Text style={styles.emptyNote}>No optional add-ons registered.</Text>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
          <Ionicons name="create-outline" size={18} color={Colors.white} />
          <Text style={styles.editButtonText}>Edit Details</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
          <Text style={styles.deleteButtonText}>Delete Catalog</Text>
        </TouchableOpacity>
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
  image: { width: "100%", height: 200, resizeMode: "cover" },
  body: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  titleInfo: { flex: 1, marginRight: 12 },
  serviceName: { fontSize: 18, fontWeight: "800", color: Colors.text },
  categoryBadge: { marginTop: 6, alignSelf: "flex-start", backgroundColor: "#FFF0F4", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  categoryText: { fontSize: 11, fontWeight: "700", color: Colors.primary },
  price: { fontSize: 16, fontWeight: "800", color: Colors.primary },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 16 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: Colors.textSecondary, marginBottom: 8 },
  description: { fontSize: 12, color: Colors.text, lineHeight: 18 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  itemTitle: { fontSize: 13, fontWeight: "700", color: Colors.text },
  itemSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  itemVal: { fontSize: 13, fontWeight: "800", color: Colors.primary },
  emptyNote: { fontSize: 11, color: Colors.textTertiary, fontStyle: "italic" },
  footer: { padding: 16, gap: 10, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border },
  editButton: { height: 48, backgroundColor: Colors.primary, borderRadius: 10, flexDirection: "row", justifyContent: "center", alignItems: "center" },
  editButtonText: { color: Colors.white, fontSize: 14, fontWeight: "700", marginLeft: 8 },
  deleteButton: { height: 48, backgroundColor: Colors.white, borderRadius: 10, borderWidth: 1, borderColor: "#EF4444", flexDirection: "row", justifyContent: "center", alignItems: "center" },
  deleteButtonText: { color: "#EF4444", fontSize: 14, fontWeight: "700", marginLeft: 8 }
});
