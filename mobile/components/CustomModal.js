import React, { useEffect, useRef, useState } from "react";
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
import Colors from "../constants/Colors";

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
  type = "info", // danger, warning, success, info
  loading = false,
  dismissible = true,
}) {
  const [slideAnim] = useState(() => new Animated.Value(SCREEN_HEIGHT));
  const [fadeAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

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

  // Icon mapping
  let iconName = "information-circle";
  let iconColor = Colors.info;
  let iconBg = Colors.info + "15";

  if (type === "danger") {
    iconName = "trash-bin";
    iconColor = Colors.error;
    iconBg = Colors.error + "15";
  } else if (type === "warning") {
    iconName = "warning";
    iconColor = Colors.warning;
    iconBg = Colors.warning + "15";
  } else if (type === "success") {
    iconName = "checkmark-circle";
    iconColor = Colors.success;
    iconBg = Colors.success + "15";
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop Tap dismissal */}
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
        </TouchableWithoutFeedback>

        {/* Modal Sheet container */}
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Top handle bar */}
          <View style={styles.handle} />

          {/* Close button */}
          {dismissible && !loading && (
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={22} color={Colors.textTertiary} />
            </TouchableOpacity>
          )}

          {/* Action type Icon */}
          <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
            <Ionicons name={iconName} size={30} color={iconColor} />
          </View>

          {/* Title */}
          {title ? <Text style={styles.title}>{title}</Text> : null}

          {/* Description */}
          {description ? (
            <Text style={styles.description}>{description}</Text>
          ) : null}

          {/* Action Row */}
          <View style={styles.btnRow}>
            {onCancel || onClose ? (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleCancel}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>{cancelText}</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[
                styles.confirmBtn,
                {
                  backgroundColor:
                    type === "danger"
                      ? Colors.error
                      : type === "warning"
                        ? Colors.warning
                        : Colors.primary,
                },
                loading && styles.disabledBtn,
              ]}
              onPress={handleConfirm}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Text style={styles.confirmBtnText}>{confirmText}</Text>
              )}
            </TouchableOpacity>
          </View>
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
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 36,
    alignItems: "center",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
    minHeight: 280,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  closeBtn: {
    position: "absolute",
    right: 20,
    top: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.inputBackground,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
    textAlign: "center",
    fontFamily: "Poppins",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    fontFamily: "Poppins",
    lineHeight: 20,
    marginBottom: 28,
    paddingHorizontal: 12,
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    justifyContent: "center",
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.white,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textSecondary,
    fontFamily: "Poppins",
  },
  confirmBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.white,
    fontFamily: "Poppins",
  },
  disabledBtn: {
    opacity: 0.7,
  },
});
