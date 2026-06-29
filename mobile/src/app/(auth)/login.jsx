import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router, Link } from 'expo-router';
import { authService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { User, KeyRound, ArrowRight, ChevronLeft } from 'lucide-react-native';
import { getGlobalStyles } from '../../theme/globalStyles';
import { Colors } from '../../theme/colors';

export default function LoginPage() {
  const { loginSuccess, theme } = useAuth();
  const styles = getGlobalStyles(theme);
  const colors = Colors[theme];

  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!identifier) {
      Alert.alert("Required", "Phone number or Email is required");
      return;
    }

    setLoading(true);
    try {
      const isEmail = identifier.includes("@");
      const payload = isEmail ? { email: identifier } : { phone: identifier };
      
      const res = await authService.login(payload);
      Alert.alert("Success", "OTP Sent successfully!");
      setStep(2);
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to send OTP. Account may not exist.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      Alert.alert("Required", "Verification code is required");
      return;
    }

    setLoading(true);
    try {
      const isEmail = identifier.includes("@");
      const payload = { otp, ...(isEmail ? { email: identifier } : { phone: identifier }) };
      
      const res = await authService.verifyOtp(payload);
      await loginSuccess(res.data.token, res.data.user);
      Alert.alert("Success", `Welcome back, ${res.data.user.name}!`);
      // Navigation is handled automatically by AuthContext based on role
    } catch (e) {
      Alert.alert("Error", e.message || "Invalid verification code");
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
        <View style={styles.glassPanel}>
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <Text style={styles.title}>Welcome <Text style={{ color: colors.accent }}>Back</Text></Text>
            <Text style={styles.subtitle}>
              {step === 1 ? "Sign in to your account" : "Enter the 6-digit verification code"}
            </Text>
          </View>

          {step === 1 ? (
            <View>
              <Text style={styles.label}>Email or Mobile Number</Text>
              <View style={{ position: 'relative', justifyContent: 'center' }}>
                <View style={{ position: 'absolute', left: 12, zIndex: 1 }}>
                  <User size={20} color={colors.textSecondary} />
                </View>
                <TextInput
                  style={[styles.input, { paddingLeft: 40 }]}
                  placeholder="Enter email or mobile"
                  placeholderTextColor={colors.textSecondary}
                  value={identifier}
                  onChangeText={setIdentifier}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <TouchableOpacity style={[styles.btnPrimary, { marginTop: 16 }]} onPress={handleSendOtp} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.btnPrimaryText}>Continue</Text>
                    <ArrowRight size={20} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={styles.label}>Enter 6-Digit OTP</Text>
              <View style={{ position: 'relative', justifyContent: 'center' }}>
                <View style={{ position: 'absolute', left: 12, zIndex: 1 }}>
                  <KeyRound size={20} color={colors.textSecondary} />
                </View>
                <TextInput
                  style={[styles.input, { paddingLeft: 40, letterSpacing: 8, textAlign: 'center', fontSize: 20, fontWeight: '700' }]}
                  placeholder="000000"
                  placeholderTextColor={colors.textSecondary}
                  value={otp}
                  onChangeText={setOtp}
                  maxLength={6}
                  keyboardType="number-pad"
                />
              </View>

              <TouchableOpacity style={[styles.btnPrimary, { marginTop: 16 }]} onPress={handleVerifyOtp} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Verify & Login</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={[styles.btnSecondary, { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }]} onPress={() => setStep(1)} disabled={loading}>
                <ChevronLeft size={20} color={colors.textPrimary} />
                <Text style={styles.btnSecondaryText}>Go Back</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ marginTop: 32, alignItems: 'center' }}>
            <Text style={{ color: colors.textSecondary }}>
              Don't have an account?{' '}
              <Link href="/register" asChild>
                <TouchableOpacity>
                  <Text style={{ color: colors.accent, fontWeight: '600' }}>Sign Up</Text>
                </TouchableOpacity>
              </Link>
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
