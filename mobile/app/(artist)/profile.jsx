import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getGlobalStyles } from '../../theme/globalStyles';
import { Colors } from '../../theme/colors';
import { artistService } from '../../services/api';
import { Save, LogOut } from 'lucide-react-native';

export default function ArtistProfile() {
  const { user, logout, theme } = useAuth();
  const styles = getGlobalStyles(theme);
  const colors = Colors[theme];

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    bio: "",
    experience_years: "1",
    location: "",
    city: "",
    state: "",
    pincode: ""
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profRes = await artistService.getMyDetails();
        if (profRes.data) {
          setProfile({
            bio: profRes.data.bio || "",
            experience_years: profRes.data.experience_years?.toString() || "1",
            location: profRes.data.location || "",
            city: profRes.data.city || "",
            state: profRes.data.state || "",
            pincode: profRes.data.pincode || ""
          });
        }
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
      await artistService.updateArtistProfile({
        ...profile,
        experience_years: parseInt(profile.experience_years)
      });
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
        <Text style={[styles.title, { marginBottom: 24 }]}>Professional Profile</Text>

        <View style={styles.glassPanel}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            multiline
            value={profile.bio}
            onChangeText={(v) => setProfile({ ...profile, bio: v })}
            placeholder="Describe your specialization..."
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={styles.label}>Years of Experience</Text>
          <TextInput
            style={styles.input}
            value={profile.experience_years}
            onChangeText={(v) => setProfile({ ...profile, experience_years: v })}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Address / Area</Text>
          <TextInput
            style={styles.input}
            value={profile.location}
            onChangeText={(v) => setProfile({ ...profile, location: v })}
          />

          <View style={{ flexDirection: 'row', gap: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                value={profile.city}
                onChangeText={(v) => setProfile({ ...profile, city: v })}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>State</Text>
              <TextInput
                style={styles.input}
                value={profile.state}
                onChangeText={(v) => setProfile({ ...profile, state: v })}
              />
            </View>
          </View>

          <Text style={styles.label}>Pincode</Text>
          <TextInput
            style={styles.input}
            value={profile.pincode}
            onChangeText={(v) => setProfile({ ...profile, pincode: v })}
            keyboardType="numeric"
          />

          <TouchableOpacity style={[styles.btnPrimary, { flexDirection: 'row', gap: 8, marginTop: 12 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : (
              <>
                <Save size={20} color="#fff" />
                <Text style={styles.btnPrimaryText}>Save Profile</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.btnSecondary, { marginTop: 24, flexDirection: 'row', gap: 8 }]} onPress={logout}>
          <LogOut size={20} color={colors.danger} />
          <Text style={[styles.btnSecondaryText, { color: colors.danger }]}>Logout</Text>
        </TouchableOpacity>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
