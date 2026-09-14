import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../constants/Colors";

export default function CustomInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  style,
  inputStyle,
  multiline,
  numberOfLines,
  keyboardType,
  autoCapitalize = "none",
  error,
  icon,
  onBlur,
  onFocus,
  disabled = false,
  editable = true,
  maxLength,
  clearButtonMode,
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleFocus = (e) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  const isPassword = !!secureTextEntry;

  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputFocused,
          error && styles.inputError,
          disabled && styles.inputDisabled,
          multiline && styles.multilineWrapper,
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={isFocused ? Colors.primary : Colors.textTertiary}
            style={styles.leadingIcon}
          />
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          secureTextEntry={isPassword && !showPassword}
          placeholderTextColor={Colors.placeholder}
          multiline={multiline}
          numberOfLines={numberOfLines}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={handleFocus}
          onBlur={handleBlur}
          editable={editable && !disabled}
          maxLength={maxLength}
          style={[
            styles.input,
            multiline && styles.multilineInput,
            inputStyle,
          ]}
        />
        {isPassword ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowPassword((prev) => !prev)}
            style={styles.trailingBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={18}
              color={Colors.textTertiary}
            />
          </TouchableOpacity>
        ) : value && clearButtonMode && !disabled ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onChangeText && onChangeText("")}
            style={styles.trailingBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="close-circle"
              size={16}
              color={Colors.textTertiary}
            />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: 16,
  },
  label: {
    color: Colors.textSecondary,
    marginBottom: 6,
    fontSize: 13.5,
    fontWeight: "500",
    fontFamily: "Poppins",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.2,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: Colors.inputBackground,
    minHeight: 50,
  },
  inputFocused: {
    borderColor: Colors.primary,
    backgroundColor: "#FFFFFF",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  inputError: {
    borderColor: Colors.error || "#E11D48",
  },
  inputDisabled: {
    opacity: 0.6,
    backgroundColor: "#F4F4F5",
  },
  multilineWrapper: {
    alignItems: "flex-start",
    paddingVertical: 10,
    minHeight: 80,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: 14.5,
    fontFamily: "Poppins",
    paddingVertical: 10,
  },
  multilineInput: {
    textAlignVertical: "top",
  },
  leadingIcon: {
    marginRight: 10,
  },
  trailingBtn: {
    marginLeft: 8,
    padding: 2,
  },
  errorText: {
    color: Colors.error || "#E11D48",
    fontSize: 12,
    marginTop: 4,
    fontFamily: "Poppins",
  },
});
