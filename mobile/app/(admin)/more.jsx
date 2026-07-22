import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getGlobalStyles } from '../../theme/globalStyles';
import { Colors } from '../../theme/colors';
import { Award, Calendar, DollarSign, MessageSquare, Bell, LogOut, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';

export default function AdminMore() {
  const { logout, theme } = useAuth();
  const styles = getGlobalStyles(theme);
  const colors = Colors[theme];

  const menuItems = [
    { title: 'Artist Directory', icon: Award, route: '/(admin)/artists' },
    { title: 'Bookings Ledger', icon: Calendar, route: '/(admin)/bookings' },
    { title: 'Financial Ledger', icon: DollarSign, route: '/(admin)/ledger' },
    { title: 'Chat Monitor', icon: MessageSquare, route: '/(admin)/chats' },
    { title: 'System Alerts Broadcaster', icon: Bell, route: '/(admin)/notifications' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={[styles.title, { marginBottom: 24 }]}>Admin Tools</Text>

      <View style={styles.glassPanel}>
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <TouchableOpacity 
              key={index} 
              style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                paddingVertical: 16,
                borderBottomWidth: index === menuItems.length - 1 ? 0 : 1,
                borderBottomColor: colors.borderColor 
              }}
              onPress={() => router.push(item.route)}
            >
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSecondary, justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
                <Icon size={20} color={colors.accent} />
              </View>
              <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: colors.textPrimary }}>{item.title}</Text>
              <ChevronRight size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity 
        style={[styles.btnSecondary, { marginTop: 32, flexDirection: 'row', gap: 8 }]} 
        onPress={logout}
      >
        <LogOut size={20} color={colors.danger} />
        <Text style={[styles.btnSecondaryText, { color: colors.danger }]}>Logout Securely</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
