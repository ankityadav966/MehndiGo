import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getGlobalStyles } from '../../theme/globalStyles';
import { Colors } from '../../theme/colors';
import { authService, artistService } from '../../services/api';
import { Save, LogOut } from 'lucide-react-native';

export default function UserProfile() {
  const { user, logout, theme } = useAuth();
  const styles = getGlobalStyles(theme);
  const colors = Colors[theme];

  const [profile, setProfile] = useState({ name: "", email: "", gender: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profileRes = await authService.getProfile?.() || { data: { name: user?.name || "", email: user?.email || "", gender: "" } };
        setProfile(profileRes.data || { name: "", email: "", gender: "" });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await authService.updateProfile?.(profile);
      Alert.alert("Success", "Profile updated successfully!");
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={[styles.title, { marginBottom: 24 }]}>Profile Information</Text>

        <View style={styles.glassPanel}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={profile.name}
            onChangeText={(v) => setProfile({ ...profile, name: v })}
          />

          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            value={profile.email}
            onChangeText={(v) => setProfile({ ...profile, email: v })}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Gender</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
            {['MALE', 'FEMALE', 'OTHER'].map(g => (
              <TouchableOpacity
                key={g}
                style={[
                  styles.btnSecondary, 
                  { flex: 1, backgroundColor: profile.gender === g ? colors.accent : colors.bgTertiary }
                ]}
                onPress={() => setProfile({ ...profile, gender: g })}
              >
                <Text style={[
                  styles.btnSecondaryText, 
                  { color: profile.gender === g ? '#fff' : colors.textPrimary }
                ]}>
                  {g.charAt(0) + g.slice(1).toLowerCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={[styles.btnPrimary, { flexDirection: 'row', gap: 8 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : (
              <>
                <Save size={20} color="#fff" />
                <Text style={styles.btnPrimaryText}>Save Preferences</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.btnSecondary, { marginTop: 24, flexDirection: 'row', gap: 8 }]} onPress={logout}>
          <LogOut size={20} color={colors.danger} />
          <Text style={[styles.btnSecondaryText, { color: colors.danger }]}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
