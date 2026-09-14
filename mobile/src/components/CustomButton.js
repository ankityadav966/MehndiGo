import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  Animated,
  ActivityIndicator,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../constants/Colors";

export default function CustomButton({
  title,
  onPress,
  disabled,
  loading = false,
  style,
  textStyle,
  variant = "primary", // primary, secondary, outline, ghost, danger
  icon,
  iconPosition = "left",
  size = "medium", // small, medium, large
}) {
  const [scaleAnim] = useState(() => new Animated.Value(1));

  const handlePressIn = () => {
    if (disabled || loading) return;
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      friction: 8,
      tension: 60,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 60,
      useNativeDriver: true,
    }).start();
  };

  const isPrimary = variant === "primary";
  const isOutline = variant === "outline";
  const isDanger = variant === "danger";
  const isSecondary = variant === "secondary";
  const isGhost = variant === "ghost";

  // Height and font size based on size prop
  const sizeStyles = {
    small: { height: 38, paddingHorizontal: 14, fontSize: 13 },
    medium: { height: 48, paddingHorizontal: 20, fontSize: 15 },
    large: { height: 54, paddingHorizontal: 24, fontSize: 16 },
  }[size] || { height: 48, paddingHorizontal: 20, fontSize: 15 };

  let btnBg = Colors.primary;
  let btnBorder = "transparent";
  let textColor = Colors.white;

  if (isOutline) {
    btnBg = "transparent";
    btnBorder = Colors.primary;
    textColor = Colors.primary;
  } else if (isDanger) {
    btnBg = "#E11D48";
    textColor = Colors.white;
  } else if (isSecondary) {
    btnBg = "#F8BBD0";
    textColor = "#9C1344";
  } else if (isGhost) {
    btnBg = "transparent";
    textColor = Colors.primary;
  }

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[
          styles.button,
          {
            height: sizeStyles.height,
            paddingHorizontal: sizeStyles.paddingHorizontal,
            backgroundColor: btnBg,
            borderColor: btnBorder,
            borderWidth: isOutline ? 1.5 : 0,
          },
          (isPrimary || isDanger) && styles.shadow,
          disabled && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={isOutline || isGhost ? Colors.primary : Colors.white}
          />
        ) : (
          <View style={styles.contentRow}>
            {icon && iconPosition === "left" && (
              <Ionicons
                name={icon}
                size={sizeStyles.fontSize + 2}
                color={textColor}
                style={styles.leftIcon}
              />
            )}
            <Text
              style={[
                styles.buttonText,
                { fontSize: sizeStyles.fontSize, color: textColor },
                textStyle,
              ]}
            >
              {title}
            </Text>
            {icon && iconPosition === "right" && (
              <Ionicons
                name={icon}
                size={sizeStyles.fontSize + 2}
                color={textColor}
                style={styles.rightIcon}
              />
            )}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  shadow: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 3,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontWeight: "600",
    fontFamily: "Poppins",
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },
  disabled: {
    opacity: 0.55,
  },
});
