import React, { useState, useEffect } from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl,
  StatusBar
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../constants/Colors";
import { getLiveCategories } from "../../services/category";
import { SkeletonGrid } from "../../components/LoadingSkeleton";

export default function CategoriesScreen({ navigation }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [imageErrors, setImageErrors] = useState({});

  const fetchCategories = React.useCallback(async () => {
    try {
      setError(null);
      const data = await getLiveCategories();
      setCategories(data || []);
    } catch (err) {
      console.log("Failed to fetch categories:", err.message);
      setError("Failed to load categories. Please tap to retry.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCategories();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchCategories]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCategories();
  };

  const LOCAL_CATEGORY_IMAGES = {
    "bridal": require("../../assets/images/categories/bridal.png"),
    "royal": require("../../assets/images/categories/royal.png"),
    "arabic": require("../../assets/images/categories/arabic.png"),
    "traditional": require("../../assets/images/categories/traditional.png"),
    "floral": require("../../assets/images/categories/floral.png"),
    "minimal": require("../../assets/images/categories/minimal.png"),
    "modern": require("../../assets/images/categories/modern.png"),
    "finger": require("../../assets/images/categories/finger.png"),
    "full-hand": require("../../assets/images/categories/full_hand.png"),
    "back-hand": require("../../assets/images/categories/back_hand.png"),
    "front-hand": require("../../assets/images/categories/front_hand.png"),
    "leg": require("../../assets/images/categories/leg.png"),
    "kids": require("../../assets/images/categories/kids.png"),
    "groom": require("../../assets/images/categories/groom.png"),
    "engagement": require("../../assets/images/categories/engagement.png"),
    "wedding": require("../../assets/images/categories/wedding.png"),
    "karwa-chauth": require("../../assets/images/categories/karwa_chauth.png"),
    "eid": require("../../assets/images/categories/eid.png"),
    "festival": require("../../assets/images/categories/festival.png"),
    "indo-arabic": require("../../assets/images/categories/indo_arabic.png"),
    "custom": require("../../assets/images/categories/custom.png")
  };

  const getCategoryImage = (item) => {
    if (item && item.image && typeof item.image === "string") {
      if (item.image.startsWith("http://") || item.image.startsWith("https://")) {
        return { uri: item.image };
      }
      if (item.image.startsWith("/")) {
        const { BASE_URL } = require("../../services/api");
        const cleanBase = (BASE_URL || "").replace(/\/api\/v1\/?$/, "");
        return { uri: `${cleanBase}${item.image}` };
      }
    }

    const name = (item?.name || "").toLowerCase();
    const slug = (item?.slug || "").toLowerCase();

    let key = "custom";
    if (slug.includes("indo-arabic") || slug.includes("indo_arabic") || name.includes("indo-arabic") || name.includes("indo arabic") || name.includes("fusion")) key = "indo-arabic";
    else if (slug.includes("royal") || name.includes("royal")) key = "royal";
    else if (slug.includes("bridal") || name.includes("bridal")) key = "bridal";
    else if (slug.includes("arabic") || name.includes("arabic")) key = "arabic";
    else if (slug.includes("traditional") || name.includes("traditional")) key = "traditional";
    else if (slug.includes("floral") || name.includes("floral")) key = "floral";
    else if (slug.includes("minimal") || name.includes("minimal")) key = "minimal";
    else if (slug.includes("modern") || name.includes("modern")) key = "modern";
    else if (slug.includes("finger") || name.includes("finger")) key = "finger";
    else if (slug.includes("full-hand") || name.includes("full hand") || name.includes("full-hand") || name.includes("hand mehendi") || name.includes("hand mehndi")) key = "full-hand";
    else if (slug.includes("back-hand") || name.includes("back hand") || name.includes("back-hand")) key = "back-hand";
    else if (slug.includes("front-hand") || name.includes("front hand") || name.includes("front-hand")) key = "front-hand";
    else if (slug.includes("leg") || name.includes("leg") || slug.includes("feet") || name.includes("feet")) key = "leg";
    else if (slug.includes("kids") || name.includes("kid") || slug.includes("kid")) key = "kids";
    else if (slug.includes("groom") || name.includes("groom")) key = "groom";
    else if (slug.includes("engagement") || name.includes("engagement")) key = "engagement";
    else if (slug.includes("wedding") || name.includes("wedding")) key = "wedding";
    else if (slug.includes("karwa") || name.includes("karwa")) key = "karwa-chauth";
    else if (slug.includes("eid") || name.includes("eid")) key = "eid";
    else if (slug.includes("festival") || name.includes("festival")) key = "festival";

    return LOCAL_CATEGORY_IMAGES[key] || LOCAL_CATEGORY_IMAGES.custom;
  };

  const renderItem = ({ item }) => {
    const hasError = !!imageErrors[item.id];
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() =>
          navigation.navigate("ArtistListing", {
            category: item.name,
          })
        }
      >
        <Image
          source={hasError ? LOCAL_CATEGORY_IMAGES.custom : getCategoryImage(item)}
          onError={() => {
            setImageErrors((prev) => ({ ...prev, [item.id]: true }));
          }}
          style={styles.image}
          resizeMode="cover"
        />

        <View style={styles.cardFooter}>
          <Ionicons name={item.icon || "flower-outline"} size={16} color={Colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={styles.header}>All Categories</Text>
            <Text style={styles.subHeader}>Choose your Mehendi style</Text>
          </View>
        </View>
        <View style={{ padding: 20 }}>
          <SkeletonGrid count={8} columns={2} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={styles.header}>All Categories</Text>
            <Text style={styles.subHeader}>Choose your Mehendi style</Text>
          </View>
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={54} color={Colors.error || "#FF3B30"} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchCategories}>
            <Text style={styles.retryBtnText}>Tap to Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.header}>All Categories</Text>
          <Text style={styles.subHeader}>Choose your Mehendi style</Text>
        </View>
      </View>

      <FlatList
        data={categories}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={{
          justifyContent: "space-between",
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 30,
          paddingHorizontal: 20,
          paddingTop: 10
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderColor: Colors.border
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12
  },
  header: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.text,
  },
  subHeader: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  card: {
    width: "48%",
    backgroundColor: Colors.white,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 16,
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },
  image: {
    width: "100%",
    height: 120,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    justifyContent: "center"
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
  },
  errorText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 12,
    marginBottom: 20,
    textAlign: "center"
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.primary
  },
  retryBtnText: {
    fontSize: 14,
    color: Colors.white,
    fontWeight: "700"
  }
});
