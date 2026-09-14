import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import Colors from "../constants/Colors";

export default function CustomCard({
  title,
  description,
  children,
  style,
  onPress,
  activeOpacity = 0.85,
}) {
  const CardContainer = onPress ? TouchableOpacity : View;

  return (
    <CardContainer
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={activeOpacity}
    >
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {description ? (
        <Text style={styles.description}>{description}</Text>
      ) : null}
      {children}
    </CardContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBackground || "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.04)",
    shadowColor: Colors.shadow || "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    marginBottom: 12,
  },
  title: {
    fontSize: 16.5,
    fontWeight: "600",
    color: Colors.text,
    fontFamily: "Poppins",
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "Poppins",
    lineHeight: 18,
    marginBottom: 10,
  },
});
