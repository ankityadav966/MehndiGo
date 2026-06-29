import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router, Link } from 'expo-router';
import { authService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, Phone, Lock, ShieldCheck, ArrowRight, CheckCircle2, ChevronLeft } from 'lucide-react-native';
import { getGlobalStyles } from '../../theme/globalStyles';
import { Colors } from '../../theme/colors';

export default function RegisterPage() {
  const { loginSuccess, theme } = useAuth();
  const styles = getGlobalStyles(theme);
  const colors = Colors[theme];

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "USER"
  });
  
  const [otp, setOtp] = useState("");

  const handleChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSendOtp = async () => {
    if (formData.password !== formData.confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    if (!formData.name || !formData.password) {
      Alert.alert("Error", "Name and Password are required");
      return;
    }
    if (!formData.phone && !formData.email) {
      Alert.alert("Error", "Please provide either Phone or Email");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: formData.role
      };
      const res = await authService.registerSendOtp(payload);
      Alert.alert("Success", res.message || "OTP sent successfully!");
      setStep(2);
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      Alert.alert("Required", "Please enter OTP");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        otp,
        email: formData.email,
        phone: formData.phone
      };
      const res = await authService.registerVerifyOtp(payload);
      await loginSuccess(res.data.token, res.data.user);
      Alert.alert("Success", "Registration Successful!");
      // AuthContext will handle navigation based on token/role
    } catch (err) {
      Alert.alert("Error", err.message || "Invalid OTP");
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
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join Mehndi Go and explore beautiful designs.</Text>
          </View>

          {step === 1 ? (
            <View>
              <Text style={styles.label}>Full Name</Text>
              <View style={{ position: 'relative', justifyContent: 'center', marginBottom: 12 }}>
                <View style={{ position: 'absolute', left: 12, zIndex: 1 }}><User size={20} color={colors.textSecondary} /></View>
                <TextInput style={[styles.input, { paddingLeft: 40, marginBottom: 0 }]} placeholder="Enter your full name" placeholderTextColor={colors.textSecondary} value={formData.name} onChangeText={(v) => handleChange('name', v)} />
              </View>

              <Text style={styles.label}>Email Address</Text>
              <View style={{ position: 'relative', justifyContent: 'center', marginBottom: 12 }}>
                <View style={{ position: 'absolute', left: 12, zIndex: 1 }}><Mail size={20} color={colors.textSecondary} /></View>
                <TextInput style={[styles.input, { paddingLeft: 40, marginBottom: 0 }]} placeholder="Enter your email" placeholderTextColor={colors.textSecondary} value={formData.email} onChangeText={(v) => handleChange('email', v)} autoCapitalize="none" keyboardType="email-address" />
              </View>

              <Text style={styles.label}>Mobile Number</Text>
              <View style={{ position: 'relative', justifyContent: 'center', marginBottom: 12 }}>
                <View style={{ position: 'absolute', left: 12, zIndex: 1 }}><Phone size={20} color={colors.textSecondary} /></View>
                <TextInput style={[styles.input, { paddingLeft: 40, marginBottom: 0 }]} placeholder="Enter your mobile number" placeholderTextColor={colors.textSecondary} value={formData.phone} onChangeText={(v) => handleChange('phone', v)} keyboardType="phone-pad" />
              </View>

              <Text style={styles.label}>Password</Text>
              <View style={{ position: 'relative', justifyContent: 'center', marginBottom: 12 }}>
                <View style={{ position: 'absolute', left: 12, zIndex: 1 }}><Lock size={20} color={colors.textSecondary} /></View>
                <TextInput style={[styles.input, { paddingLeft: 40, marginBottom: 0 }]} placeholder="Create a password" placeholderTextColor={colors.textSecondary} value={formData.password} onChangeText={(v) => handleChange('password', v)} secureTextEntry />
              </View>

              <Text style={styles.label}>Confirm Password</Text>
              <View style={{ position: 'relative', justifyContent: 'center', marginBottom: 16 }}>
                <View style={{ position: 'absolute', left: 12, zIndex: 1 }}><ShieldCheck size={20} color={colors.textSecondary} /></View>
                <TextInput style={[styles.input, { paddingLeft: 40, marginBottom: 0 }]} placeholder="Confirm your password" placeholderTextColor={colors.textSecondary} value={formData.confirmPassword} onChangeText={(v) => handleChange('confirmPassword', v)} secureTextEntry />
              </View>

              <Text style={styles.label}>Join As</Text>
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                <TouchableOpacity 
                  style={[styles.btnSecondary, { flex: 1, backgroundColor: formData.role === 'USER' ? colors.accent : colors.bgTertiary }]}
                  onPress={() => handleChange('role', 'USER')}
                >
                  <Text style={[styles.btnSecondaryText, { color: formData.role === 'USER' ? '#fff' : colors.textPrimary }]}>Customer</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.btnSecondary, { flex: 1, backgroundColor: formData.role === 'ARTIST' ? colors.accent : colors.bgTertiary }]}
                  onPress={() => handleChange('role', 'ARTIST')}
                >
                  <Text style={[styles.btnSecondaryText, { color: formData.role === 'ARTIST' ? '#fff' : colors.textPrimary }]}>Artist</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.btnPrimary} onPress={handleSendOtp} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.btnPrimaryText}>Continue</Text>
                    <ArrowRight size={20} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <CheckCircle2 size={48} color={colors.success} style={{ marginBottom: 12 }} />
                <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
                  We've sent an OTP to your {formData.phone ? "Mobile" : "Email"}.
                </Text>
              </View>

              <Text style={styles.label}>Enter OTP</Text>
              <TextInput
                style={[styles.input, { letterSpacing: 8, textAlign: 'center', fontSize: 20, fontWeight: '700' }]}
                placeholder="000000"
                placeholderTextColor={colors.textSecondary}
                value={otp}
                onChangeText={setOtp}
                maxLength={6}
                keyboardType="number-pad"
              />

              <TouchableOpacity style={[styles.btnPrimary, { marginTop: 16 }]} onPress={handleVerifyOtp} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Verify & Create Account</Text>}
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.btnSecondary, { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }]} onPress={() => setStep(1)} disabled={loading}>
                <ChevronLeft size={20} color={colors.textPrimary} />
                <Text style={styles.btnSecondaryText}>Back</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ marginTop: 24, alignItems: 'center' }}>
            <Text style={{ color: colors.textSecondary }}>
              Already have an account?{' '}
              <Link href="/login" asChild>
                <TouchableOpacity>
                  <Text style={{ color: colors.accent, fontWeight: '600' }}>Sign In</Text>
                </TouchableOpacity>
              </Link>
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
