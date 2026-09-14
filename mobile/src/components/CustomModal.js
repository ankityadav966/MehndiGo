import React, { useEffect, useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
  Dimensions,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function CustomModal({
  visible,
  onClose,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  buttons = null,
  type = "info", // danger, warning, success, info, update
  loading = false,
  dismissible = true,
}) {
  const [slideAnim] = useState(() => new Animated.Value(SCREEN_HEIGHT));
  const [fadeAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      // Fluid spring in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 42,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Fluid exit
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  const handleClose = () => {
    if (dismissible && !loading) {
      if (onCancel) onCancel();
      else if (onClose) onClose();
    }
  };

  const handleConfirm = () => {
    if (loading) return;
    if (onConfirm) onConfirm();
  };

  const handleCancel = () => {
    if (loading) return;
    if (onCancel) onCancel();
    else if (onClose) onClose();
  };

  // Icon mapping with luxury accents
  let iconName = "sparkles";
  let iconColor = "#9C1344"; // Royal Burgundy
  let iconBg = "rgba(156, 19, 68, 0.08)";

  if (type === "danger") {
    iconName = "trash-bin-outline";
    iconColor = "#E11D48";
    iconBg = "rgba(225, 29, 72, 0.1)";
  } else if (type === "warning") {
    iconName = "alert-circle-outline";
    iconColor = "#D97706";
    iconBg = "rgba(217, 119, 6, 0.1)";
  } else if (type === "success") {
    iconName = "checkmark-circle-outline";
    iconColor = "#16A34A";
    iconBg = "rgba(22, 163, 74, 0.1)";
  } else if (type === "update") {
    iconName = "cloud-download-outline";
    iconColor = "#9C1344";
    iconBg = "rgba(156, 19, 68, 0.08)";
  } else if (type === "info") {
    iconName = "information-circle-outline";
    iconColor = "#2563EB";
    iconBg = "rgba(37, 99, 235, 0.08)";
  }

  // Multi-button stacked check (if 3 or more buttons provided)
  const isMultiButton = Array.isArray(buttons) && buttons.length > 2;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop tap dismissal */}
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
        </TouchableWithoutFeedback>

        {/* Bottom Sheet Container */}
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Top handle bar for drag affordance */}
          <View style={styles.handle} />

          {/* Close button */}
          {dismissible && !loading && (
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleClose}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={18} color="#71717A" />
            </TouchableOpacity>
          )}

          {/* Action type Icon */}
          <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
            <Ionicons name={iconName} size={32} color={iconColor} />
          </View>

          {/* Title */}
          {title ? (
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
          ) : null}

          {/* Description */}
          {description ? (
            <Text style={styles.description}>{description}</Text>
          ) : null}

          {/* Action Buttons */}
          {isMultiButton ? (
            <View style={styles.stackBtnContainer}>
              {buttons.map((btn, index) => {
                const isCancel =
                  btn.style === "cancel" ||
                  String(btn.text || "").toLowerCase() === "cancel";
                const isDestructive = btn.style === "destructive";

                return (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.8}
                    disabled={loading}
                    onPress={() => {
                      if (btn.onPress) btn.onPress();
                      handleClose();
                    }}
                    style={[
                      styles.stackedBtn,
                      isCancel
                        ? styles.cancelBtn
                        : isDestructive
                        ? styles.destructiveBtn
                        : styles.primaryBtn,
                    ]}
                  >
                    <Text
                      style={[
                        styles.btnTextBase,
                        isCancel
                          ? styles.cancelBtnText
                          : styles.primaryBtnText,
                      ]}
                    >
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.btnRow}>
              {onCancel || onClose ? (
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={handleCancel}
                  disabled={loading}
                  activeOpacity={0.75}
                >
                  <Text style={styles.cancelBtnText}>{cancelText}</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor:
                      type === "danger"
                        ? "#E11D48"
                        : type === "warning"
                        ? "#D97706"
                        : "#9C1344",
                  },
                  loading && styles.disabledBtn,
                ]}
                onPress={handleConfirm}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>{confirmText}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.48)",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 34,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 24,
  },
  handle: {
    width: 38,
    height: 4.5,
    backgroundColor: "#E4E4E7",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 16,
  },
  closeBtn: {
    position: "absolute",
    right: 18,
    top: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F4F4F5",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#18181B",
    textAlign: "center",
    fontFamily: "Poppins",
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  description: {
    fontSize: 13.5,
    color: "#71717A",
    textAlign: "center",
    fontFamily: "Poppins",
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 14,
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    justifyContent: "center",
  },
  stackBtnContainer: {
    width: "100%",
    gap: 10,
  },
  stackedBtn: {
    width: "100%",
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E4E4E7",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#52525B",
    fontFamily: "Poppins",
  },
  primaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#9C1344",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#9C1344",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  destructiveBtn: {
    backgroundColor: "#E11D48",
    shadowColor: "#E11D48",
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: "Poppins",
  },
  btnTextBase: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Poppins",
  },
  disabledBtn: {
    opacity: 0.65,
  },
});
