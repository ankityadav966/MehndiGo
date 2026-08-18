import React from "react";
import { StyleSheet, Text, View, Image, TouchableOpacity } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../constants/Colors";
import moment from "moment";

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
  const rawDate = booking?.selected_date || booking?.booking_date || booking?.date;
  const formattedDate = rawDate ? moment(rawDate).format("ddd, DD MMMM YYYY") : "Scheduled Date";
  const timeSlot = booking?.time_slot || booking?.slot_time || booking?.time || "10:00 AM - 11:00 AM";

  const groupSize = booking?.group_size || 1;
  const coverage = booking?.service_coverage || "BOTH_HANDS";
  const coverageLabel = coverage === "BOTH_HANDS" ? "Both Hands" : coverage === "FEET" ? "Feet Only" : coverage === "FULL_BRIDAL" ? "Full Bridal (Hands & Feet)" : "One Hand";

  return (
    <View style={styles.card}>
      {/* Party Profile Header */}
      <View style={styles.partyHeader}>
        <Image source={{ uri: otherPartyImage }} style={styles.avatar} />
        
        <View style={styles.partyInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.partyName} numberOfLines={1}>
              {otherPartyName}
            </Text>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#059669" />
            </View>
          </View>

          <Text style={styles.roleSubtext}>
            {isArtistView ? "Customer" : "Verified Artist"}
          </Text>

          {otherPartyPhone ? (
            <View style={styles.phoneRow}>
              <Ionicons name="call-outline" size={12} color="#6B7280" />
              <Text style={styles.phoneText}>+91 {otherPartyPhone}</Text>
            </View>
          ) : null}
        </View>

        {!isArtistView && onViewProfile && (
          <TouchableOpacity style={styles.profileBtn} onPress={onViewProfile} activeOpacity={0.7}>
            <Text style={styles.profileBtnText}>Profile</Text>
            <Ionicons name="chevron-forward" size={14} color="#E91E63" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.divider} />

      {/* Service & Schedule Details */}
      <View style={styles.serviceSection}>
        <View style={styles.serviceTitleRow}>
          <Ionicons name="sparkles" size={16} color="#E91E63" style={{ marginRight: 6 }} />
          <Text style={styles.serviceTitleText}>{serviceTitle}</Text>
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={15} color="#701DDB" />
            <View style={styles.metaTextContainer}>
              <Text style={styles.metaLabel}>Date</Text>
              <Text style={styles.metaValue}>{formattedDate}</Text>
            </View>
          </View>

          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={15} color="#701DDB" />
            <View style={styles.metaTextContainer}>
              <Text style={styles.metaLabel}>Time Slot</Text>
              <Text style={styles.metaValue}>{timeSlot}</Text>
            </View>
          </View>

          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={15} color="#E91E63" />
            <View style={styles.metaTextContainer}>
              <Text style={styles.metaLabel}>Group Size</Text>
              <Text style={styles.metaValue}>{groupSize} {groupSize === 1 ? "Person" : "People"}</Text>
            </View>
          </View>

          <View style={styles.metaItem}>
            <Ionicons name="hand-left-outline" size={15} color="#E91E63" />
            <View style={styles.metaTextContainer}>
              <Text style={styles.metaLabel}>Coverage</Text>
              <Text style={styles.metaValue}>{coverageLabel}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1
  },
  partyHeader: {
    flexDirection: "row",
    alignItems: "center"
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F3F4F6",
    borderWidth: 1.5,
    borderColor: "#FCE7F3"
  },
  partyInfo: {
    flex: 1,
    marginLeft: 12
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  partyName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#212121",
    maxWidth: "80%"
  },
  verifiedBadge: {
    marginLeft: 4
  },
  roleSubtext: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 1
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    gap: 4
  },
  phoneText: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500"
  },
  profileBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FCE7F3",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 2
  },
  profileBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#E91E63"
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 14
  },
  serviceSection: {},
  serviceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12
  },
  serviceTitleText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#212121"
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 12,
    columnGap: 12
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    width: "48%",
    backgroundColor: "#F9FAFB",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6"
  },
  metaTextContainer: {
    marginLeft: 8,
    flex: 1
  },
  metaLabel: {
    fontSize: 10,
    color: "#6B7280",
    textTransform: "uppercase",
    fontWeight: "600"
  },
  metaValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#212121",
    marginTop: 1
  }
});
