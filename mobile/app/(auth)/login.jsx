import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { authService } from '../../services/auth';
import { useAuth } from '../../context/AuthContext';
import { Mail, KeyRound, Lock, ArrowRight, ChevronLeft, CheckCircle2 } from 'lucide-react-native';
import { getGlobalStyles } from '../../theme/globalStyles';
import { Colors } from '../../theme/colors';

export default function LoginPage() {
  const { loginSuccess, theme } = useAuth();
  const styles = getGlobalStyles(theme);
  const colors = Colors[theme];

  // Steps: LOGIN, VERIFY_EMAIL_OTP, FORGOT_PASSWORD, VERIFY_FP_OTP, RESET_PASSWORD
  const [step, setStep] = useState("LOGIN"); 
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [otp, setOtp] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if ((step === "VERIFY_EMAIL_OTP" || step === "VERIFY_FP_OTP") && timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    }
  }, [step, timeLeft]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Required", "Email and password are required");
      return;
    }

    setLoading(true);
    try {
      const res = await authService.login({ email, password });
      const data = res.data || res;
      await loginSuccess(data.token, data.user);
      Alert.alert("Success", "Welcome back!");
      // Navigation handled by AuthContext
    } catch (err) {
      if (err.message && err.message.includes("Email Not Verified")) {
        Alert.alert("Notice", err.message);
        setStep("VERIFY_EMAIL_OTP");
        setTimeLeft(300);
      } else {
        Alert.alert("Error", err.message || "Invalid credentials");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!otp) {
      Alert.alert("Required", "Please enter OTP");
      return;
    }

    setLoading(true);
    try {
      const res = await authService.verifyEmailOtp({ email, otp });
      const data = res.data || res;
      await loginSuccess(data.token, data.user);
      Alert.alert("Success", "Email verified successfully! Welcome!");
    } catch (err) {
      Alert.alert("Error", err.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert("Required", "Please enter your email");
      return;
    }

    setLoading(true);
    try {
      await authService.forgotPassword({ email });
      Alert.alert("Success", "Password reset OTP sent to your email");
      setStep("VERIFY_FP_OTP");
      setTimeLeft(300);
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyFpOtp = async () => {
    if (!otp) {
      Alert.alert("Required", "Please enter OTP");
      return;
    }

    setLoading(true);
    try {
      await authService.verifyForgotPasswordOtp({ email, otp });
      Alert.alert("Success", "OTP Verified. Please reset your password.");
      setStep("RESET_PASSWORD");
    } catch (err) {
      Alert.alert("Error", err.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword) {
      Alert.alert("Required", "Please enter a new password");
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword({ email, password: newPassword });
      Alert.alert("Success", "Password reset successfully! You can now login.");
      setStep("LOGIN");
      setPassword("");
      setNewPassword("");
      setOtp("");
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (timeLeft > 0) return;
    setLoading(true);
    try {
      await authService.resendOtp({ email });
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
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <Text style={styles.title}>Mehndi <Text style={{ color: colors.accent }}>Go</Text></Text>
            <Text style={styles.subtitle}>
              {step === "LOGIN" && "Sign in to your account"}
              {step === "VERIFY_EMAIL_OTP" && "Verify your email address"}
              {step === "FORGOT_PASSWORD" && "Reset your password"}
              {step === "VERIFY_FP_OTP" && "Enter password reset code"}
              {step === "RESET_PASSWORD" && "Create a new password"}
            </Text>
          </View>

          {step === "LOGIN" && (
            <View>
              <Text style={styles.label}>Email Address</Text>
              <View style={{ position: 'relative', justifyContent: 'center', marginBottom: 16 }}>
                <View style={{ position: 'absolute', left: 12, zIndex: 1 }}>
                  <Mail size={20} color={colors.textSecondary} />
                </View>
                <TextInput
                  style={[styles.input, { paddingLeft: 40, marginBottom: 0 }]}
                  placeholder="Enter email"
                  placeholderTextColor={colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={styles.label}>Password</Text>
                <TouchableOpacity onPress={() => setStep("FORGOT_PASSWORD")}>
                  <Text style={{ color: colors.accent, fontSize: 12 }}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>
              <View style={{ position: 'relative', justifyContent: 'center' }}>
                <View style={{ position: 'absolute', left: 12, zIndex: 1 }}>
                  <Lock size={20} color={colors.textSecondary} />
                </View>
                <TextInput
                  style={[styles.input, { paddingLeft: 40 }]}
                  placeholder="Enter password"
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity style={[styles.btnPrimary, { marginTop: 16 }]} onPress={handleLogin} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.btnPrimaryText}>Sign In</Text>
                  </View>
                )}
              </TouchableOpacity>
              
              <View style={{ marginTop: 24, alignItems: 'center' }}>
                <Text style={{ color: colors.textSecondary }}>
                  Don't have an account?{' '}
                  <Link href="/register" asChild>
                    <TouchableOpacity>
                      <Text style={{ color: colors.accent, fontWeight: '600' }}>Register</Text>
                    </TouchableOpacity>
                  </Link>
                </Text>
              </View>
            </View>
          )}

          {(step === "VERIFY_EMAIL_OTP" || step === "VERIFY_FP_OTP") && (
            <View>
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <CheckCircle2 size={48} color={colors.success} style={{ marginBottom: 12 }} />
                <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
                  Code sent to {email}
                </Text>
              </View>
              
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
              
              <View style={{ alignItems: 'center', marginVertical: 8 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Time remaining: {formatTime(timeLeft)}</Text>
              </View>

              <TouchableOpacity style={[styles.btnPrimary, { marginTop: 8 }]} onPress={step === "VERIFY_EMAIL_OTP" ? handleVerifyEmailOtp : handleVerifyFpOtp} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Verify Code</Text>}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.btnSecondary, { marginTop: 12, opacity: timeLeft > 0 ? 0.5 : 1 }]} 
                onPress={handleResendOtp} 
                disabled={loading || timeLeft > 0}
              >
                <Text style={styles.btnSecondaryText}>Resend OTP</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.btnSecondary, { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }]} onPress={() => setStep("LOGIN")} disabled={loading}>
                <ChevronLeft size={20} color={colors.textPrimary} />
                <Text style={styles.btnSecondaryText}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === "FORGOT_PASSWORD" && (
            <View>
              <Text style={styles.label}>Registered Email</Text>
              <View style={{ position: 'relative', justifyContent: 'center' }}>
                <View style={{ position: 'absolute', left: 12, zIndex: 1 }}>
                  <Mail size={20} color={colors.textSecondary} />
                </View>
                <TextInput
                  style={[styles.input, { paddingLeft: 40 }]}
                  placeholder="Enter your email"
                  placeholderTextColor={colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
              
              <TouchableOpacity style={[styles.btnPrimary, { marginTop: 16 }]} onPress={handleForgotPassword} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Send Reset Code</Text>}
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.btnSecondary, { marginTop: 12 }]} onPress={() => setStep("LOGIN")} disabled={loading}>
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {step === "RESET_PASSWORD" && (
            <View>
              <Text style={styles.label}>New Password</Text>
              <View style={{ position: 'relative', justifyContent: 'center' }}>
                <View style={{ position: 'absolute', left: 12, zIndex: 1 }}>
                  <Lock size={20} color={colors.textSecondary} />
                </View>
                <TextInput
                  style={[styles.input, { paddingLeft: 40 }]}
                  placeholder="Enter new password"
                  placeholderTextColor={colors.textSecondary}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />
              </View>
              
              <TouchableOpacity style={[styles.btnPrimary, { marginTop: 16 }]} onPress={handleResetPassword} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Reset Password</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
