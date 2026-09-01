import React from "react";
import { StyleSheet, Text, View, Image, TouchableOpacity } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { formatServiceDate } from "../../utils/date";

export default function BookingSummaryCard({
  booking,
  isArtistView = false,
  onViewProfile
}) {
  if (!booking) return null;

  // Resolve user info depending on who is viewing
  const otherPartyName = isArtistView
    ? booking?.customer_name || booking?.user?.name || "Customer"
    : booking?.artist_name || booking?.artist?.user?.name || "Mehndi Artist";

  const otherPartyImage = isArtistView
    ? booking?.customer_image || booking?.user?.profile_image || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"
    : booking?.artist_image || booking?.artist?.user?.profile_image || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200";

  const otherPartyPhone = isArtistView
    ? booking?.customer_phone || booking?.user?.phone
    : booking?.artist_phone || booking?.artist?.user?.phone;

  const serviceTitle = booking?.service_name || booking?.service?.specialization_name || booking?.specialization_name || "Bridal Mehndi Service";
  const rawDate = booking?.selected_date || booking?.booking_date || booking?.date || booking?.event_date;
  const formattedDate = rawDate ? formatServiceDate(rawDate) : "Scheduled Date";
  const timeSlot = booking?.time_slot || booking?.slot_time || booking?.time || "10:00 AM - 11:00 AM";

  const groupSize = booking?.group_size || 1;
  const coverage = booking?.service_coverage || "BOTH_HANDS";
  const coverageLabel =
    coverage === "BOTH_HANDS"
      ? "Both Hands"
      : coverage === "FEET"
      ? "Feet Only"
      : coverage === "FULL_BRIDAL"
      ? "Full Bridal"
      : "One Hand";

  return (
    <View style={styles.card}>
      {/* Party Profile Header */}
      <View style={styles.partyHeader}>
        <View style={styles.avatarWrapper}>
          <Image source={{ uri: otherPartyImage }} style={styles.avatar} />
          <View style={styles.verifiedMiniBadge}>
            <Ionicons name="checkmark-circle" size={13} color="#059669" />
          </View>
        </View>

        <View style={styles.partyInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.partyName} numberOfLines={1} ellipsizeMode="tail">
              {otherPartyName}
            </Text>
            <View style={styles.roleTag}>
              <Text style={styles.roleTagText}>{isArtistView ? "Client" : "Pro Artist"}</Text>
            </View>
          </View>

          {otherPartyPhone ? (
            <View style={styles.phoneRow}>
              <Ionicons name="call" size={11} color="#E91E63" />
              <Text style={styles.phoneText}>+91 {otherPartyPhone}</Text>
            </View>
          ) : (
            <Text style={styles.roleSubtext}>Verified MehndiGo User</Text>
          )}
        </View>

        {!isArtistView && onViewProfile && (
          <TouchableOpacity style={styles.profileBtn} onPress={onViewProfile} activeOpacity={0.75}>
            <Text style={styles.profileBtnText}>Profile</Text>
            <Ionicons name="chevron-forward" size={13} color="#E91E63" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.divider} />

      {/* Service & Schedule Details */}
      <View style={styles.serviceSection}>
        <View style={styles.serviceTitleRow}>
          <View style={styles.sparkleBox}>
            <Ionicons name="sparkles" size={13} color="#E91E63" />
          </View>
          <Text style={styles.serviceTitleText} numberOfLines={1} ellipsizeMode="tail">
            {serviceTitle}
          </Text>
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <View style={[styles.metaIconBox, { backgroundColor: "#F5F3FF" }]}>
              <Ionicons name="calendar" size={13} color="#701DDB" />
            </View>
            <View style={styles.metaTextContainer}>
              <Text style={styles.metaLabel}>Date</Text>
              <Text style={styles.metaValue} numberOfLines={1} ellipsizeMode="tail">
                {formattedDate}
              </Text>
            </View>
          </View>

          <View style={styles.metaItem}>
            <View style={[styles.metaIconBox, { backgroundColor: "#F5F3FF" }]}>
              <Ionicons name="time" size={13} color="#701DDB" />
            </View>
            <View style={styles.metaTextContainer}>
              <Text style={styles.metaLabel}>Slot Window</Text>
              <Text style={styles.metaValue} numberOfLines={1} ellipsizeMode="tail">
                {timeSlot}
              </Text>
            </View>
          </View>

          <View style={styles.metaItem}>
            <View style={[styles.metaIconBox, { backgroundColor: "#FFF8FA" }]}>
              <Ionicons name="people" size={13} color="#E91E63" />
            </View>
            <View style={styles.metaTextContainer}>
              <Text style={styles.metaLabel}>Group Size</Text>
              <Text style={styles.metaValue} numberOfLines={1} ellipsizeMode="tail">
                {groupSize} {groupSize === 1 ? "Person" : "People"}
              </Text>
            </View>
          </View>

          <View style={styles.metaItem}>
            <View style={[styles.metaIconBox, { backgroundColor: "#FFF8FA" }]}>
              <Ionicons name="hand-left" size={13} color="#E91E63" />
            </View>
            <View style={styles.metaTextContainer}>
              <Text style={styles.metaLabel}>Coverage</Text>
              <Text style={styles.metaValue} numberOfLines={1} ellipsizeMode="tail">
                {coverageLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* Selected Design Preview if present */}
        {(booking?.selected_art_title || booking?.selected_art_image) && (
          <View style={styles.designPreviewContainer}>
            <Text style={styles.designPreviewHeading}>Chosen Mehndi Artwork</Text>
            <View style={styles.designPreviewCard}>
              {Boolean(booking?.selected_art_image) && (
                <Image source={{ uri: booking.selected_art_image }} style={styles.designPreviewThumb} />
              )}
              <View style={{ flex: 1, marginLeft: booking?.selected_art_image ? 10 : 0 }}>
                <Text style={styles.designPreviewTitle} numberOfLines={1}>
                  {booking.selected_art_title}
                </Text>
                <View style={styles.designPreviewMetaRow}>
                  {booking.selected_art_tier && (
                    <View style={[
                      styles.designTierTag,
                      booking.selected_art_tier === "BRIDAL_EXCLUSIVE" ? styles.bridalTierTag :
                      booking.selected_art_tier === "PREMIUM" ? styles.premiumTierTag : styles.standardTierTag
                    ]}>
                      <Text style={styles.designTierTagText}>
                        {booking.selected_art_tier === "BRIDAL_EXCLUSIVE" ? "👑 Bridal" :
                         booking.selected_art_tier === "PREMIUM" ? "💎 Premium" : "✨ Standard"}
                      </Text>
                    </View>
                  )}
                  {booking.selected_art_duration && (
                    <Text style={styles.designDurationText}>⏱️ {booking.selected_art_duration} mins</Text>
                  )}
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    overflow: "hidden"
  },
  partyHeader: {
    flexDirection: "row",
    alignItems: "center"
  },
  avatarWrapper: {
    position: "relative",
    flexShrink: 0
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F3F4F6",
    borderWidth: 1.5,
    borderColor: "#FCE7F3"
  },
  verifiedMiniBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center"
  },
  partyInfo: {
    flex: 1,
    marginLeft: 10,
    justifyContent: "center"
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "nowrap"
  },
  partyName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1F2937",
    flexShrink: 1
  },
  roleTag: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    flexShrink: 0
  },
  roleTagText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#059669"
  },
  roleSubtext: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    gap: 4
  },
  phoneText: {
    fontSize: 11,
    color: "#4B5563",
    fontWeight: "600"
  },
  profileBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF8FA",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FCE7F3",
    gap: 2,
    flexShrink: 0
  },
  profileBtnText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#E91E63"
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 12
  },
  serviceSection: {},
  serviceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10
  },
  sparkleBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: "#FFF8FA",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#FCE7F3",
    flexShrink: 0
  },
  serviceTitleText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#1F2937",
    flex: 1
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 8
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    width: "48.5%",
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6"
  },
  metaIconBox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0
  },
  metaTextContainer: {
    marginLeft: 6,
    flex: 1
  },
  metaLabel: {
    fontSize: 9,
    color: "#9CA3AF",
    textTransform: "uppercase",
    fontWeight: "700",
    letterSpacing: 0.3
  },
  metaValue: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#1F2937",
    marginTop: 1
  },
  designPreviewContainer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6"
  },
  designPreviewHeading: {
    fontSize: 11,
    fontWeight: "750",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 6
  },
  designPreviewCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EDE9FE"
  },
  designPreviewThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#EDE9FE"
  },
  designPreviewTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#1F2937"
  },
  designPreviewMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3
  },
  designTierTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  standardTierTag: {
    backgroundColor: "#E5E7EB"
  },
  premiumTierTag: {
    backgroundColor: "#FEF3C7"
  },
  bridalTierTag: {
    backgroundColor: "#FCE7F3"
  },
  designTierTagText: {
    fontSize: 9.5,
    fontWeight: "750",
    color: "#4B5563"
  },
  designDurationText: {
    fontSize: 10.5,
    color: "#6B7280",
    fontWeight: "600"
  }
});
