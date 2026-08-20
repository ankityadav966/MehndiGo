import React, { useState, useEffect } from "react";
import { StyleSheet, Text, Animated, View, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../constants/Colors";

export default function GlobalToast() {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info"); // success, error, warning, info

  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(-150));

  const targetTop = (insets.top > 0 ? insets.top : (Platform.OS === "android" ? 28 : 44)) + 12;

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
      // Spring layout animation below status bar
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: targetTop,
          friction: 7,
          tension: 50,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-hide after 3.2 seconds
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: -150,
            duration: 220,
            useNativeDriver: true,
          }),
        ]).start(() => setVisible(false));
      }, 3200);

      return () => clearTimeout(timer);
    }
  }, [visible, insets.top]);

  if (!visible) return null;

  // Type theme mapping with high-contrast sleek styling
  let bg = "#1E293B"; // Dark slate
  let border = "#334155";
  let icon = "information-circle";
  let iconColor = "#38BDF8";
  let textColor = "#FFFFFF";

  if (type === "success") {
    bg = "#064E3B"; // Dark emerald
    border = "#059669";
    icon = "checkmark-circle";
    iconColor = "#34D399";
    textColor = "#FFFFFF";
  } else if (type === "error") {
    bg = "#7F1D1D"; // Dark red
    border = "#DC2626";
    icon = "alert-circle";
    iconColor = "#F87171";
    textColor = "#FFFFFF";
  } else if (type === "warning") {
    bg = "#78350F"; // Dark amber
    border = "#D97706";
    icon = "warning";
    iconColor = "#FBBF24";
    textColor = "#FFFFFF";
  } else if (type === "info") {
    bg = "#0F172A"; // Sleek dark slate
    border = "#38BDF8";
    icon = "information-circle";
    iconColor = "#38BDF8";
    textColor = "#FFFFFF";
  }

  return (
    <Animated.View
      pointerEvents="none"
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
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <Text style={[styles.text, { color: textColor }]}>
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
    left: 20,
    right: 20,
    zIndex: 99999,
    elevation: 99999,
    alignItems: "center",
  },
  toastCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 12,
    maxWidth: "92%",
  },
  iconCircle: {
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 13.5,
    fontWeight: "600",
    lineHeight: 18,
    textAlign: "left",
    flexShrink: 1,
  },
});
