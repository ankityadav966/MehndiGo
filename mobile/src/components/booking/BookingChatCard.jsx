import React from "react";
import { StyleSheet, Text, View, TouchableOpacity, Linking } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function BookingChatCard({
  otherPartyName = "Mehndi Artist",
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
          <Ionicons name="chatbubbles" size={18} color="#701DDB" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.titleText}>Need to communicate?</Text>
          <Text style={styles.subText}>Chat or call {otherPartyName} directly</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        {phone ? (
          <TouchableOpacity style={styles.callBtn} onPress={handleCall} activeOpacity={0.7}>
            <Ionicons name="call" size={16} color="#059669" />
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity style={styles.chatBtn} onPress={onOpenChat} activeOpacity={0.7}>
          <Ionicons name="chatbubble-ellipses" size={16} color="#FFFFFF" />
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
    backgroundColor: "#FAF5FF",
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#F3E8FF"
  },
  leftInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EDE9FE",
    justifyContent: "center",
    alignItems: "center"
  },
  textContainer: {
    marginLeft: 10,
    flex: 1
  },
  titleText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#212121"
  },
  subText: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 1
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  callBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#D1FAE5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#A7F3D0"
  },
  chatBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#701DDB",
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 12,
    gap: 6
  },
  chatBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF"
  }
});
