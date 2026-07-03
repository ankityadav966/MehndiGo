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

const CATEGORY_IMAGES = {
  bridal: "https://images.unsplash.com/photo-1590012357675-bc55909793fb?q=80&w=400",
  arabic: "https://images.unsplash.com/photo-1601054790522-d08317b75567?q=80&w=400",
  royal: "https://images.unsplash.com/photo-1601054790740-975949514f7b?q=80&w=400",
  portrait: "https://images.unsplash.com/photo-1601054791559-0a67ab92b6a2?q=80&w=400",
  engagement: "https://images.unsplash.com/photo-1601054791572-c510255b77ea?q=80&w=400",
  festival: "https://images.unsplash.com/photo-1601054791585-fb4050d24bf5?q=80&w=400",
  kids: "https://images.unsplash.com/photo-1601054791599-23efbf1c65d6?q=80&w=400",
  custom: "https://images.unsplash.com/photo-1601054791612-4029237c1d76?q=80&w=400"
};

const getCategoryImage = (item) => {
  const name = (item.name || "").toLowerCase();
  const slug = (item.slug || "").toLowerCase();

  const isUrlValid = item.image && 
    (item.image.startsWith("http://") || item.image.startsWith("https://")) &&
    !item.image.includes("localhost") &&
    !item.image.includes("127.0.0.1");

  if (isUrlValid) {
    return { uri: item.image };
  }

  let key = "custom";
  if (slug.includes("bridal") || name.includes("bridal")) key = "bridal";
  else if (slug.includes("arabic") || name.includes("arabic")) key = "arabic";
  else if (slug.includes("royal") || name.includes("royal")) key = "royal";
  else if (slug.includes("portrait") || name.includes("portrait")) key = "portrait";
  else if (slug.includes("engagement") || name.includes("engagement")) key = "engagement";
  else if (slug.includes("festival") || name.includes("festival")) key = "festival";
  else if (slug.includes("kid") || name.includes("kid")) key = "kids";

  const fallbackUrl = CATEGORY_IMAGES[key] || CATEGORY_IMAGES.custom;
  return { uri: fallbackUrl };
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
          source={hasError ? require("../../../assets/images/logo.jpg") : getCategoryImage(item)}
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
