import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { authService } from '../../services/auth';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, Lock, ShieldCheck, ArrowRight, CheckCircle2, ChevronLeft } from 'lucide-react-native';
import { getGlobalStyles } from '../../theme/globalStyles';
import { Colors } from '../../theme/colors';

export default function RegisterPage() {
  const { loginSuccess, theme } = useAuth();
  const styles = getGlobalStyles(theme);
  const colors = Colors[theme];

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "USER"
  });
  
  const [otp, setOtp] = useState("");
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes timer
  
  useEffect(() => {
    if (step === 2 && timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    }
  }, [step, timeLeft]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleRegister = async () => {
    if (formData.password !== formData.confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    if (!formData.fullName || !formData.email || !formData.password) {
      Alert.alert("Error", "All fields are required");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        role: formData.role
      };
      const res = await authService.register(payload);
      Alert.alert("Success", res.message || "OTP sent successfully!");
      setStep(2);
      setTimeLeft(300);
    } catch (err) {
      Alert.alert("Error", err.message || "Registration failed");
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
        email: formData.email
      };
      const res = await authService.verifyEmailOtp(payload);
      const data = res.data || res;
      await loginSuccess(data.token, data.user);
      Alert.alert("Success", "Registration Successful!");
      // AuthContext will handle navigation based on token/role
    } catch (err) {
      Alert.alert("Error", err.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };
  
  const handleResendOtp = async () => {
    if (timeLeft > 0) return;
    setLoading(true);
    try {
      await authService.resendOtp({ email: formData.email });
      Alert.alert("Success", "OTP resent to your email");
      setTimeLeft(300);
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to resend OTP");
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
                <TextInput style={[styles.input, { paddingLeft: 40, marginBottom: 0 }]} placeholder="Enter your full name" placeholderTextColor={colors.textSecondary} value={formData.fullName} onChangeText={(v) => handleChange('fullName', v)} />
              </View>

              <Text style={styles.label}>Email Address</Text>
              <View style={{ position: 'relative', justifyContent: 'center', marginBottom: 12 }}>
                <View style={{ position: 'absolute', left: 12, zIndex: 1 }}><Mail size={20} color={colors.textSecondary} /></View>
                <TextInput style={[styles.input, { paddingLeft: 40, marginBottom: 0 }]} placeholder="Enter your email" placeholderTextColor={colors.textSecondary} value={formData.email} onChangeText={(v) => handleChange('email', v)} autoCapitalize="none" keyboardType="email-address" />
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

              <TouchableOpacity style={styles.btnPrimary} onPress={handleRegister} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.btnPrimaryText}>Register</Text>
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
                  We've sent an OTP to {formData.email}.
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
              
              <View style={{ alignItems: 'center', marginVertical: 8 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Time remaining: {formatTime(timeLeft)}</Text>
              </View>

              <TouchableOpacity style={[styles.btnPrimary, { marginTop: 8 }]} onPress={handleVerifyOtp} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Verify & Create Account</Text>}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.btnSecondary, { marginTop: 12, opacity: timeLeft > 0 ? 0.5 : 1 }]} 
                onPress={handleResendOtp} 
                disabled={loading || timeLeft > 0}
              >
                <Text style={styles.btnSecondaryText}>Resend OTP</Text>
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
