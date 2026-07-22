import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, Text, Animated, View, Platform } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../constants/Colors";

export default function GlobalToast() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info"); // success, error, warning, info

  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(-120));

  useEffect(() => {
    global.showToast = (msg, toastType = "info") => {
      setMessage(msg);
      setType(toastType);
      setVisible(true);
    };

    return () => {
      global.showToast = null;
    };
  }, []);

  useEffect(() => {
    if (visible) {
      // Spring layout animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: Platform.OS === "ios" ? 54 : 36, // Top position offset
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-hide after 3.2 seconds
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: -120,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start(() => setVisible(false));
      }, 3200);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  // Type theme mapping
  let bg = "#1E293B"; // slate-800
  let border = "#334155";
  let icon = "information-circle";
  let iconColor = Colors.info || "#3B82F6";

  if (type === "success") {
    bg = "#F0FDF4"; // Light emerald
    border = "#DCFCE7";
    icon = "checkmark-circle";
    iconColor = Colors.success || "#16A34A";
  } else if (type === "error") {
    bg = "#FEF2F2"; // Light red
    border = "#FEE2E2";
    icon = "alert-circle";
    iconColor = Colors.error || "#EF4444";
  } else if (type === "warning") {
    bg = "#FFFBEB"; // Light amber
    border = "#FEF3C7";
    icon = "warning";
    iconColor = Colors.warning || "#F59E0B";
  } else if (type === "info") {
    bg = "#EFF6FF"; // Light blue
    border = "#DBEAFE";
    icon = "information-circle";
    iconColor = Colors.info || "#3B82F6";
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={[styles.toastCard, { backgroundColor: bg, borderColor: border }]}>
        <View style={styles.iconCircle}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        <Text style={[styles.text, { color: type === "info" || type === "success" || type === "warning" || type === "error" ? Colors.text : "#FFFFFF" }]}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    zIndex: 10000,
    alignItems: "center",
  },
  toastCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
    maxWidth: "96%",
  },
  iconCircle: {
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    textAlign: "left",
    fontFamily: "Poppins",
  },
});
