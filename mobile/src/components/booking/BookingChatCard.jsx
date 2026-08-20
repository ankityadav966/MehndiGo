import React from "react";
import { StyleSheet, Text, View, TouchableOpacity, Linking } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function BookingChatCard({
  otherPartyName = "Customer",
  phone,
  onOpenChat
}) {
  const handleCall = () => {
    if (phone) {
      Linking.openURL(`tel:${phone}`).catch(() => {});
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.leftInfo}>
        <View style={styles.iconCircle}>
          <Ionicons name="chatbubbles" size={17} color="#701DDB" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.titleText}>Direct Communication</Text>
          <Text style={styles.subText} numberOfLines={1}>
            Chat or call {otherPartyName} directly
          </Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        {phone ? (
          <TouchableOpacity
            style={styles.callBtn}
            onPress={handleCall}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="call" size={16} color="#059669" />
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={styles.chatBtn}
          onPress={onOpenChat}
          activeOpacity={0.85}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chatbubble-ellipses" size={15} color="#FFFFFF" />
          <Text style={styles.chatBtnText}>Chat</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FDF4FF",
    borderRadius: 18,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1.2,
    borderColor: "#F5D0FE",
    shadowColor: "#701DDB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2
  },
  leftInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#EDE9FE",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DDD6FE"
  },
  textContainer: {
    marginLeft: 10,
    flex: 1
  },
  titleText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1F2937"
  },
  subText: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 1.5,
    fontWeight: "500"
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.2,
    borderColor: "#A7F3D0",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1
  },
  chatBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#701DDB",
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 12,
    gap: 5,
    shadowColor: "#701DDB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2
  },
  chatBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF"
  }
});
