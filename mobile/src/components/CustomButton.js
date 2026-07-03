import { Pressable, StyleSheet, Text } from "react-native";
import Colors from "../constants/Colors";

export default function CustomButton({ title, onPress, disabled, style, variant = "primary" }) {
  const isPrimary = variant === "primary";
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        isPrimary ? styles.primary : styles.outline,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.buttonText, !isPrimary && styles.outlineText]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: Colors.primary,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  buttonText: {
    color: Colors.white,
    fontWeight: "600",
    fontSize: 16,
  },
  outlineText: {
    color: Colors.primary,
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.8,
  },
});
