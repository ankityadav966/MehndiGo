import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import { useAuth } from "../../context/AuthContext";

export default function SecurityPrivacyScreen({ navigation }) {
  const { isDarkMode } = useAuth();

  // Color Tokens based on Theme Mode
  const currentBgColor = isDarkMode ? "#0A0A0A" : Colors.background;
  const currentCardBg = isDarkMode ? "#18181B" : Colors.white;
  const currentTextColor = isDarkMode ? "#FFFFFF" : Colors.text;
  const currentSecTextColor = isDarkMode ? "#A1A1AA" : Colors.textSecondary;
  const currentBorderColor = isDarkMode ? "#27272A" : Colors.border;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentBgColor }]}>
      {/* Top Header Bar */}
      <View style={[styles.header, { backgroundColor: currentCardBg, borderBottomColor: currentBorderColor }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={currentTextColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTextColor }]}>Security & Privacy</Text>
        <View style={styles.secureHeaderBadge}>
          <Ionicons name="shield-checkmark" size={13} color="#10B981" />
          <Text style={styles.secureBadgeText}>Verified</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        <Text style={[styles.sectionHeading, { color: currentSecTextColor }]}>POLICIES & AGREEMENTS</Text>

        <View style={[styles.groupCard, { backgroundColor: currentCardBg, borderColor: currentBorderColor }]}>
          {/* Privacy Policy */}
          <TouchableOpacity
            style={[styles.rowItem, { borderBottomColor: currentBorderColor }]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("PrivacyPolicy")}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconWrap, { backgroundColor: "#FFF0F4" }]}>
                <Ionicons name="document-text-outline" size={20} color={Colors.primary || "#9C1344"} />
              </View>
              <View style={styles.rowTextGroup}>
                <Text style={[styles.rowTitle, { color: currentTextColor }]}>Privacy Policy</Text>
                <Text style={[styles.rowSub, { color: currentSecTextColor }]}>Read how we collect, protect and process your data</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
          </TouchableOpacity>

          {/* Terms & Conditions */}
          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("TermsConditions")}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconWrap, { backgroundColor: "#EEF2FF" }]}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#4F46E5" />
              </View>
              <View style={styles.rowTextGroup}>
                <Text style={[styles.rowTitle, { color: currentTextColor }]}>Terms & Conditions</Text>
                <Text style={[styles.rowSub, { color: currentSecTextColor }]}>Platform guidelines, service rules & terms of use</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Footer Info */}
        <Text style={[styles.footerText, { color: currentSecTextColor }]}>
          MehndiGo Version 1.0.3 • All Rights Reserved
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  secureHeaderBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EAFBF4",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  secureBadgeText: {
    fontSize: 11,
    color: "#10B981",
    fontWeight: "700",
    marginLeft: 4,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 50,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },
  groupCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 22,
    overflow: "hidden",
  },
  rowItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  rowTextGroup: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 3,
  },
  rowSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  footerText: {
    textAlign: "center",
    fontSize: 11,
    marginTop: 20,
  },
});
