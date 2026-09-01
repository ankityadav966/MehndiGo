import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  Share,
  Dimensions
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../constants/Colors";
import Alert from "../../utils/Alert";
import { getNormalizedUrl } from "../../services/api";
import { fetchArtistServiceCatalog, savePortfolioItem, unsavePortfolioItem } from "../../services/customer";
import { createDesignDeepLink, createArtistServiceDeepLink } from "../../services/deepLink";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 44) / 2;

const resolveImage = (uri) => {
  if (!uri || typeof uri !== "string") return "";
  const trimmed = uri.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("file://") ||
    trimmed.startsWith("content://") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }
  return getNormalizedUrl(trimmed);
};

export default function ArtistServiceCatalogScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const {
    artistId,
    serviceId,
    service: initialService,
    artist: initialArtist
  } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [catalogData, setCatalogData] = useState(null);
  const [selectedComplexity, setSelectedComplexity] = useState("ALL");
  const [selectedTier, setSelectedTier] = useState("ALL");
  const [sortBy, setSortBy] = useState("popular");
  const [savedDesignIds, setSavedDesignIds] = useState([]);

  const loadCatalog = useCallback(async () => {
    if (!artistId || !serviceId) {
      setError("Missing artist or service reference");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchArtistServiceCatalog(
        artistId,
        serviceId,
        {
          complexity: selectedComplexity !== "ALL" ? selectedComplexity : null,
          art_tier: selectedTier !== "ALL" ? selectedTier : null
        },
        sortBy
      );
      setCatalogData(data);
    } catch (err) {
      if (__DEV__) console.log("Catalog loading error:", err.message);
      setError(err.message || "Failed to load service catalog.");
    } finally {
      setLoading(false);
    }
  }, [artistId, serviceId, selectedComplexity, selectedTier, sortBy]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const handleToggleSave = async (designId) => {
    try {
      const isSaved = savedDesignIds.includes(designId);
      if (isSaved) {
        setSavedDesignIds(prev => prev.filter(id => id !== designId));
        await unsavePortfolioItem(designId).catch(() => {});
      } else {
        setSavedDesignIds(prev => [...prev, designId]);
        await savePortfolioItem(designId).catch(() => {});
      }
    } catch (e) {
      if (__DEV__) console.log("Toggle save design error:", e.message);
    }
  };

  const handleShareDesign = async (design) => {
    try {
      const shareUrl = createDesignDeepLink(artistId, design.id);
      const artistName = catalogData?.artist?.name || "Mehndi Artist";
      await Share.share({
        title: `${design.title || "Mehndi Design"} by ${artistName}`,
        message: `Check out this gorgeous ${design.title || "Mehndi Design"} by ${artistName} on MehndiGo! ₹${design.price || catalogData?.service?.minimum_price || 0}\n\nView Design: ${shareUrl}`,
        url: shareUrl
      });
    } catch (e) {
      if (__DEV__) console.log("Share design error:", e.message);
    }
  };

  const handleBookDesign = (design) => {
    navigation.navigate("SelectDate", {
      artistId,
      serviceId,
      selectedArt: {
        id: design.id,
        title: design.title || catalogData?.service?.specialization_name || "Mehndi Design",
        image_url: design.image_url,
        art_tier: design.art_tier || "STANDARD",
        duration_minutes: design.duration_minutes || catalogData?.service?.duration_minutes || 60,
        price: design.price || catalogData?.service?.minimum_price
      }
    });
  };

  const handleSelectPackage = (pkg) => {
    navigation.navigate("SelectDate", {
      artistId,
      serviceId,
      packageId: pkg.id,
      selectedArt: {
        id: null,
        title: `${pkg.package_name} (${catalogData?.service?.specialization_name || "Package"})`,
        image_url: catalogData?.service?.service_image || catalogData?.artist?.profile_image,
        art_tier: "PREMIUM",
        duration_minutes: pkg.duration || 120,
        price: pkg.package_price
      }
    });
  };

  const handleRequestCustomDesign = () => {
    navigation.navigate("CustomDesignRequest", {
      artistId,
      serviceId,
      serviceTitle: catalogData?.service?.specialization_name,
      artist: catalogData?.artist
    });
  };

  const handleOpenDesignDetails = (design, index) => {
    navigation.navigate("DesignDetails", {
      artistId,
      serviceId,
      initialDesignIndex: index,
      designs: catalogData?.designs || [design],
      artist: catalogData?.artist,
      service: catalogData?.service
    });
  };

  const artist = catalogData?.artist || initialArtist || {};
  const service = catalogData?.service || initialService || {};
  const designs = catalogData?.designs || [];
  const packages = catalogData?.packages || [];

  const complexityOptions = [
    { label: "All Designs", value: "ALL" },
    { label: "✨ Simple", value: "SIMPLE" },
    { label: "🌸 Medium", value: "MEDIUM" },
    { label: "💫 Intricate", value: "INTRICATE" },
    { label: "👑 Masterpiece", value: "MASTERPIECE" }
  ];

  const sortOptions = [
    { label: "🔥 Popular", value: "popular" },
    { label: "⚡ Newest", value: "newest" },
    { label: "💰 Low to High", value: "price_asc" },
    { label: "💎 High to Low", value: "price_desc" }
  ];

  return (
    <View style={styles.container}>
      {/* Top App Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {service.specialization_name || service.category || "Service Catalog"}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            By {artist.name || "Artist Storefront"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.headerShareBtn}
          onPress={() => {
            const url = createArtistServiceDeepLink(artistId, serviceId);
            Share.share({
              title: `${service.specialization_name || "Catalog"} by ${artist.name || "Artist"}`,
              message: `Explore ${service.specialization_name || "Mehndi Services"} by ${artist.name || "Artist"} on MehndiGo:\n${url}`,
              url
            }).catch(() => {});
          }}
        >
          <Ionicons name="share-social-outline" size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {loading && !catalogData ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading Design Catalog...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadCatalog}>
            <Text style={styles.retryBtnText}>Retry Catalog</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}
        >
          {/* Artist Identity Bar */}
          <TouchableOpacity
            style={styles.artistBar}
            activeOpacity={0.9}
            onPress={() => navigation.navigate("ArtistProfile", { artistId: artist.id || artistId })}
          >
            <Image
              source={{
                uri: resolveImage(artist.profile_image) ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(artist.name || "Artist")}&background=F3E8FF&color=7C3AED`
              }}
              style={styles.artistBarAvatar}
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={styles.artistBarName}>{artist.name || "Mehndi Artist"}</Text>
                {artist.is_verified && (
                  <Ionicons name="checkmark-circle" size={15} color="#059669" style={{ marginLeft: 4 }} />
                )}
                {artist.is_premium && (
                  <View style={styles.premiumPill}>
                    <Text style={styles.premiumPillText}>💎 Premium</Text>
                  </View>
                )}
              </View>
              <Text style={styles.artistBarMeta}>
                ⭐ {Number(artist.avg_rating || artist.rating || 5.0).toFixed(1)} ({artist.total_reviews || 0} reviews) • {artist.experience_years ? `${artist.experience_years} Yrs Exp` : "Verified Artist"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
          </TouchableOpacity>

          {/* Service Banner Info Card */}
          <View style={styles.serviceBannerCard}>
            <View style={styles.serviceBannerHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.serviceTitle}>{service.specialization_name || service.category || "Mehndi Service"}</Text>
                <Text style={styles.serviceDesc}>{service.description || "Bespoke mehndi artwork tailored with authentic organic dark-stain henna."}</Text>
              </View>
              <View style={styles.servicePriceBox}>
                <Text style={styles.servicePriceLabel}>Starting</Text>
                <Text style={styles.servicePriceVal}>₹{service.minimum_price || 0}</Text>
              </View>
            </View>

            <View style={styles.serviceMetaRow}>
              <View style={styles.serviceMetaTag}>
                <Ionicons name="time-outline" size={12} color={Colors.primary} />
                <Text style={styles.serviceMetaTagText}> {service.duration_minutes || 60} mins duration</Text>
              </View>
              <View style={styles.serviceMetaTag}>
                <Ionicons name="home-outline" size={12} color="#059669" />
                <Text style={[styles.serviceMetaTagText, { color: "#059669" }]}> Doorstep Home Service</Text>
              </View>
            </View>
          </View>

          {/* Service Packages Carousel (if available) */}
          {packages.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Curated Service Packages ({packages.length})</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
                {packages.map((pkg, pIdx) => (
                  <View key={`pkg-${pkg.id || pIdx}`} style={styles.packageCard}>
                    <View style={styles.pkgHeader}>
                      <Text style={styles.pkgName}>{pkg.package_name}</Text>
                      <Text style={styles.pkgPrice}>₹{pkg.package_price}</Text>
                    </View>
                    {pkg.included_designs ? (
                      <Text style={styles.pkgInclusions} numberOfLines={2}>
                        {pkg.included_designs}
                      </Text>
                    ) : null}
                    <View style={styles.pkgMetaRow}>
                      {pkg.duration ? <Text style={styles.pkgMeta}>⏱️ {pkg.duration} mins</Text> : null}
                      {pkg.number_of_hands > 0 && <Text style={styles.pkgMeta}>✋ {pkg.number_of_hands} Hands</Text>}
                      {pkg.aftercare_included && <Text style={styles.pkgMeta}>🌿 Aftercare</Text>}
                    </View>
                    <TouchableOpacity
                      style={styles.selectPkgBtn}
                      onPress={() => handleSelectPackage(pkg)}
                    >
                      <Text style={styles.selectPkgBtnText}>Select Package</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Custom Design Banner Card */}
          <TouchableOpacity
            style={styles.customDesignBanner}
            activeOpacity={0.9}
            onPress={handleRequestCustomDesign}
          >
            <View style={styles.customDesignIconCircle}>
              <Ionicons name="sparkles" size={24} color="#D97706" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.customDesignTitle}>Have a Specific Design in Mind?</Text>
              <Text style={styles.customDesignSubtitle}>Upload your reference photos for custom pricing & styling.</Text>
            </View>
            <Ionicons name="arrow-forward-circle" size={28} color="#D97706" />
          </TouchableOpacity>

          {/* Filter & Sort Controls */}
          <View style={styles.filterSection}>
            <Text style={styles.catalogHeading}>Catalog Designs ({designs.length})</Text>

            {/* Complexity Filter Horizontal Bar */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, marginVertical: 8 }}>
              {complexityOptions.map((opt) => {
                const isSelected = selectedComplexity === opt.value;
                return (
                  <TouchableOpacity
                    key={`comp-${opt.value}`}
                    style={[styles.filterChip, isSelected && styles.filterChipActive]}
                    onPress={() => setSelectedComplexity(opt.value)}
                  >
                    <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Sort Bar */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, marginBottom: 12 }}>
              {sortOptions.map((opt) => {
                const isSelected = sortBy === opt.value;
                return (
                  <TouchableOpacity
                    key={`sort-${opt.value}`}
                    style={[styles.sortChip, isSelected && styles.sortChipActive]}
                    onPress={() => setSortBy(opt.value)}
                  >
                    <Text style={[styles.sortChipText, isSelected && styles.sortChipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Designs Grid */}
          {designs.length === 0 ? (
            <View style={styles.emptyGridContainer}>
              <Ionicons name="images-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyGridTitle}>No designs match this filter</Text>
              <Text style={styles.emptyGridSubtitle}>Try resetting filters or submit a custom design request.</Text>
              <TouchableOpacity
                style={styles.resetFilterBtn}
                onPress={() => {
                  setSelectedComplexity("ALL");
                  setSelectedTier("ALL");
                  setSortBy("popular");
                }}
              >
                <Text style={styles.resetFilterBtnText}>Reset Filters</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.designGrid}>
              {designs.map((design, index) => {
                const isSaved = savedDesignIds.includes(design.id);
                const displayPrice = design.price || service.minimum_price || 0;
                return (
                  <View key={`design-${design.id || index}`} style={styles.designCard}>
                    {/* Image Box */}
                    <TouchableOpacity
                      activeOpacity={0.95}
                      onPress={() => handleOpenDesignDetails(design, index)}
                      style={styles.designImageBox}
                    >
                      <Image
                        source={{ uri: resolveImage(design.image_url || design.url) }}
                        style={styles.designImage}
                      />
                      {/* Tier Tag */}
                      <View style={[
                        styles.tierBadge,
                        design.art_tier === "BRIDAL_EXCLUSIVE" ? styles.bridalBadge :
                        design.art_tier === "PREMIUM" ? styles.premiumBadge : styles.standardBadge
                      ]}>
                        <Text style={styles.tierBadgeText}>
                          {design.art_tier === "BRIDAL_EXCLUSIVE" ? "👑 Bridal" :
                           design.art_tier === "PREMIUM" ? "💎 Premium" : "✨ Standard"}
                        </Text>
                      </View>

                      {/* Wishlist & Share Quick Icons */}
                      <View style={styles.imageActionButtons}>
                        <TouchableOpacity
                          style={styles.iconCircleBtn}
                          onPress={() => handleToggleSave(design.id)}
                        >
                          <Ionicons
                            name={isSaved ? "heart" : "heart-outline"}
                            size={16}
                            color={isSaved ? "#E11D48" : "#FFFFFF"}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.iconCircleBtn}
                          onPress={() => handleShareDesign(design)}
                        >
                          <Ionicons name="share-social-outline" size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>

                    {/* Metadata */}
                    <View style={styles.designCardBody}>
                      <Text style={styles.designTitle} numberOfLines={1}>
                        {design.title || `${service.specialization_name || "Henna"} Design #${design.id}`}
                      </Text>
                      <Text style={styles.designMeta} numberOfLines={1}>
                        {design.complexity_level || "Medium"} • ⏱️ {design.duration_minutes || 60}m
                      </Text>
                      <View style={styles.designPriceRow}>
                        <Text style={styles.designPrice}>₹{displayPrice}</Text>
                        <TouchableOpacity
                          style={styles.bookDesignBtn}
                          onPress={() => handleBookDesign(design)}
                        >
                          <Text style={styles.bookDesignBtnText}>Book</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* Sticky Bottom Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.bottomPriceCol}>
          <Text style={styles.bottomPriceLabel}>Service Starting from</Text>
          <Text style={styles.bottomPriceVal}>₹{service.minimum_price || 0}</Text>
        </View>
        <TouchableOpacity
          style={styles.bottomBookBtn}
          onPress={() => {
            navigation.navigate("SelectDate", {
              artistId,
              serviceId,
              selectedArt: designs.length > 0 ? {
                id: designs[0].id,
                title: designs[0].title || service.specialization_name,
                image_url: designs[0].image_url,
                art_tier: designs[0].art_tier || "STANDARD",
                duration_minutes: designs[0].duration_minutes || service.duration_minutes || 60,
                price: designs[0].price || service.minimum_price
              } : null
            });
          }}
        >
          <Text style={styles.bottomBookBtnText}>Book {service.specialization_name ? service.specialization_name.split(" ")[0] : "Service"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0"
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center"
  },
  headerTitleCol: {
    flex: 1,
    marginHorizontal: 12
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "750",
    color: "#0F172A"
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2
  },
  headerShareBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center"
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500"
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.error,
    textAlign: "center"
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 10
  },
  retryBtnText: {
    color: Colors.white,
    fontWeight: "700",
    fontSize: 13
  },
  artistBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0"
  },
  artistBarAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F3E8FF"
  },
  artistBarName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A"
  },
  premiumPill: {
    marginLeft: 6,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  premiumPillText: {
    fontSize: 10,
    color: "#92400E",
    fontWeight: "700"
  },
  artistBarMeta: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2
  },
  serviceBannerCard: {
    margin: 16,
    padding: 16,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6
  },
  serviceBannerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A"
  },
  serviceDesc: {
    fontSize: 12,
    color: "#475569",
    marginTop: 4,
    lineHeight: 17
  },
  servicePriceBox: {
    alignItems: "flex-end",
    marginLeft: 12
  },
  servicePriceLabel: {
    fontSize: 10,
    color: "#64748B",
    textTransform: "uppercase",
    fontWeight: "600"
  },
  servicePriceVal: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.primary,
    marginTop: 2
  },
  serviceMetaRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9"
  },
  serviceMetaTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  serviceMetaTagText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.primary
  },
  sectionContainer: {
    marginBottom: 16
  },
  sectionHeaderRow: {
    paddingHorizontal: 16,
    marginBottom: 10
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "750",
    color: "#0F172A"
  },
  packageCard: {
    width: 260,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#DDD6FE",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4
  },
  pkgHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  pkgName: {
    fontSize: 13,
    fontWeight: "750",
    color: "#0F172A",
    flex: 1
  },
  pkgPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.primary,
    marginLeft: 8
  },
  pkgInclusions: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 6,
    lineHeight: 15
  },
  pkgMetaRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9"
  },
  pkgMeta: {
    fontSize: 10,
    fontWeight: "600",
    color: "#475569"
  },
  selectPkgBtn: {
    marginTop: 10,
    backgroundColor: "#7C3AED",
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: "center"
  },
  selectPkgBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.white
  },
  customDesignBanner: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#FFFBEB",
    borderWidth: 1.5,
    borderColor: "#FDE68A",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center"
  },
  customDesignIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center"
  },
  customDesignTitle: {
    fontSize: 13,
    fontWeight: "750",
    color: "#92400E"
  },
  customDesignSubtitle: {
    fontSize: 11,
    color: "#B45309",
    marginTop: 2
  },
  filterSection: {
    backgroundColor: Colors.white,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0"
  },
  catalogHeading: {
    fontSize: 15,
    fontWeight: "750",
    color: "#0F172A",
    paddingHorizontal: 16
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary
  },
  filterChipText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600"
  },
  filterChipTextActive: {
    color: Colors.white,
    fontWeight: "700"
  },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  sortChipActive: {
    backgroundColor: "#F3E8FF",
    borderColor: "#C084FC"
  },
  sortChipText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600"
  },
  sortChipTextActive: {
    color: "#7C3AED",
    fontWeight: "700"
  },
  designGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    gap: 12,
    justifyContent: "space-between"
  },
  designCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.white,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4
  },
  designImageBox: {
    width: "100%",
    height: CARD_WIDTH * 1.25,
    position: "relative",
    backgroundColor: "#F1F5F9"
  },
  designImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover"
  },
  tierBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6
  },
  standardBadge: {
    backgroundColor: "rgba(15, 23, 42, 0.75)"
  },
  premiumBadge: {
    backgroundColor: "#D97706"
  },
  bridalBadge: {
    backgroundColor: "#BE123C"
  },
  tierBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.white
  },
  imageActionButtons: {
    position: "absolute",
    top: 8,
    right: 8,
    gap: 6
  },
  iconCircleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center"
  },
  designCardBody: {
    padding: 10
  },
  designTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A"
  },
  designMeta: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2
  },
  designPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9"
  },
  designPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.primary
  },
  bookDesignBtn: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
  },
  bookDesignBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.white
  },
  emptyGridContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center"
  },
  emptyGridTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#334155",
    marginTop: 10
  },
  emptyGridSubtitle: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4
  },
  resetFilterBtn: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 8
  },
  resetFilterBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  bottomPriceCol: {
    flex: 1
  },
  bottomPriceLabel: {
    fontSize: 10,
    color: "#64748B",
    textTransform: "uppercase",
    fontWeight: "600"
  },
  bottomPriceVal: {
    fontSize: 18,
    fontWeight: "850",
    color: Colors.primary,
    marginTop: 1
  },
  bottomBookBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 2
  },
  bottomBookBtnText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "750"
  }
});
