import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../constants/Colors";

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Basic ping check or offline event listener
    const interval = setInterval(async () => {
      try {
        const res = await fetch("https://www.google.com/generate_204", { method: "HEAD" });
        if (!res.ok) setIsOffline(true);
        else setIsOffline(false);
      } catch {
        setIsOffline(true);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: isOffline ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOffline, fadeAnim]);

  if (!isOffline) return null;

  return (
    <Animated.View style={[styles.banner, { opacity: fadeAnim }]}>
      <Ionicons name="wifi-outline" size={16} color={Colors.white} style={{ marginRight: 8 }} />
      <Text style={styles.text}>No Internet Connection. Retrying automatically...</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#DC2626",
    paddingVertical: 6,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
});
