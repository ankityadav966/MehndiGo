import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  Animated,
  View,
  Platform,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function GlobalToast() {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info"); // success, error, warning, info

  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(-120));
  const [scaleAnim] = useState(() => new Animated.Value(0.92));
  const hideTimerRef = useRef(null);

  const targetTop =
    (insets.top > 0 ? insets.top : Platform.OS === "android" ? 28 : 44) + 10;

  const dismissToast = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -120,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.92,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setVisible(false));
  }, [fadeAnim, slideAnim, scaleAnim]);

  const showToastAnimation = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    // Spring into place with subtle scale pop
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: targetTop,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-hide after 3.2s
    hideTimerRef.current = setTimeout(() => {
      dismissToast();
    }, 3200);
  }, [targetTop, dismissToast, fadeAnim, slideAnim, scaleAnim]);

  useEffect(() => {
    global.showToast = (msg, toastType = "info") => {
      setMessage(String(msg || ""));
      setType(toastType || "info");
      setVisible(true);
      requestAnimationFrame(() => {
        showToastAnimation();
      });
    };

    return () => {
      global.showToast = null;
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [showToastAnimation]);

  if (!visible) return null;

  // Refined palette: subtle luxury obsidian with luminous status accents
  let bg = "#18181B";
  let border = "rgba(255, 255, 255, 0.12)";
  let icon = "information-circle";
  let iconColor = "#9C1344"; // Royal Burgundy accent
  let iconBg = "rgba(156, 19, 68, 0.18)";
  let textColor = "#F4F4F5";

  if (type === "success") {
    bg = "#092E20"; // Subtle deep emerald
    border = "rgba(52, 211, 153, 0.28)";
    icon = "checkmark-circle";
    iconColor = "#34D399";
    iconBg = "rgba(52, 211, 153, 0.16)";
  } else if (type === "error") {
    bg = "#3B0715"; // Deep velvet ruby
    border = "rgba(244, 63, 94, 0.32)";
    icon = "alert-circle";
    iconColor = "#FB7185";
    iconBg = "rgba(244, 63, 94, 0.16)";
  } else if (type === "warning") {
    bg = "#361B04"; // Warm amber espresso
    border = "rgba(245, 158, 11, 0.3)";
    icon = "warning";
    iconColor = "#FBBF24";
    iconBg = "rgba(245, 158, 11, 0.16)";
  } else if (type === "info") {
    bg = "#18181B";
    border = "rgba(212, 175, 55, 0.25)"; // Subtle heritage gold border
    icon = "sparkles";
    iconColor = "#D4AF37";
    iconBg = "rgba(212, 175, 55, 0.14)";
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={dismissToast}
        style={[
          styles.toastCard,
          {
            backgroundColor: bg,
            borderColor: border,
          },
        ]}
      >
        <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={17} color={iconColor} />
        </View>
        <Text style={[styles.text, { color: textColor }]} numberOfLines={3}>
          {message}
        </Text>
        <Ionicons
          name="close"
          size={14}
          color="rgba(255, 255, 255, 0.4)"
          style={styles.closeHint}
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    zIndex: 99999,
    elevation: 99999,
    alignItems: "center",
  },
  toastCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 14,
    borderRadius: 22,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 10,
    maxWidth: "94%",
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
    textAlign: "left",
    flexShrink: 1,
    fontFamily: "Poppins",
  },
  closeHint: {
    marginLeft: 8,
    opacity: 0.7,
  },
});
