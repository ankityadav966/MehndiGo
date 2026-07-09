import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { authService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Mail, KeyRound, ShieldAlert } from 'lucide-react-native';
import { getGlobalStyles } from '../../theme/globalStyles';
import { Colors } from '../../theme/colors';

export default function SecretAdminLoginPage() {
  const { loginSuccess, theme } = useAuth();
  const styles = getGlobalStyles(theme);
  const colors = Colors[theme];

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendAdminOtp = async () => {
    if (!email || !password) {
      Alert.alert("Required", "Email and Password are both required");
      return;
    }

    setLoading(true);
    try {
      const res = await authService.adminSendOtp({ email, password });
      Alert.alert("Success", `Admin OTP Sent successfully: ${res.data?.otp || res.otp || ""} (For testing)`);
      setStep(2);
    } catch (err) {
      Alert.alert("Error", "Admin verification failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAdminOtp = async () => {
    if (!otp) {
      Alert.alert("Required", "OTP is required");
      return;
    }

    setLoading(true);
    try {
      const res = await authService.adminVerifyOtp({ email, otp });
      await loginSuccess(res.data.token, res.data.user);
      Alert.alert("Success", "Welcome, Administrator!");
      // AuthContext handles nav
    } catch (e) {
      Alert.alert("Error", "Verification failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}>
        <View style={[styles.glassPanel, { borderColor: colors.danger, borderWidth: 2 }]}>
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <ShieldAlert size={48} color={colors.danger} style={{ marginBottom: 16 }} />
            <Text style={[styles.title, { fontSize: 28 }]}>Secret Admin Gateway</Text>
            <Text style={styles.subtitle}>
              {step === 1 ? "Authorized Administrators Only" : "Enter Administrative OTP"}
            </Text>
          </View>

          {step === 1 ? (
            <View>
              <Text style={styles.label}>Admin Email Address</Text>
              <View style={{ position: 'relative', justifyContent: 'center', marginBottom: 16 }}>
                <View style={{ position: 'absolute', left: 12, zIndex: 1 }}>
                  <Mail size={20} color={colors.textSecondary} />
                </View>
                <TextInput
                  style={[styles.input, { paddingLeft: 40, marginBottom: 0 }]}
                  placeholder="name@example.com"
                  placeholderTextColor={colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <Text style={styles.label}>Admin Password</Text>
              <View style={{ position: 'relative', justifyContent: 'center', marginBottom: 16 }}>
                <View style={{ position: 'absolute', left: 12, zIndex: 1 }}>
                  <KeyRound size={20} color={colors.textSecondary} />
                </View>
                <TextInput
                  style={[styles.input, { paddingLeft: 40, marginBottom: 0 }]}
                  placeholder="Password"
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: colors.danger, marginTop: 16 }]} onPress={handleSendAdminOtp} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Send Admin OTP</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={styles.label}>Verification OTP</Text>
              <View style={{ position: 'relative', justifyContent: 'center' }}>
                <View style={{ position: 'absolute', left: 12, zIndex: 1 }}>
                  <KeyRound size={20} color={colors.textSecondary} />
                </View>
                <TextInput
                  style={[styles.input, { paddingLeft: 40, letterSpacing: 8, textAlign: 'center', fontSize: 20, fontWeight: '700' }]}
                  placeholder="123456"
                  placeholderTextColor={colors.textSecondary}
                  value={otp}
                  onChangeText={setOtp}
                  maxLength={6}
                  keyboardType="number-pad"
                />
              </View>

              <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: colors.danger, marginTop: 16 }]} onPress={handleVerifyAdminOtp} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Verify & Authorize</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
