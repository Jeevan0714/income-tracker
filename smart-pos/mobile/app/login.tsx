import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../src/services/firebase';
import { StatusBar } from 'expo-status-bar';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) return;
    if (password.length < 6) { Alert.alert('Too short', 'Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      if (isSignUp) await createUserWithEmailAndPassword(auth, email.trim(), password);
      else await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (error: any) {
      let msg = error.message;
      if (msg.includes('email-already-in-use')) msg = 'Email already registered. Try logging in.';
      else if (msg.includes('invalid-email')) msg = 'Invalid email address.';
      else if (msg.includes('wrong-password') || msg.includes('invalid-credential')) msg = 'Incorrect email or password.';
      else if (msg.includes('user-not-found')) msg = 'No account found. Try creating one.';
      Alert.alert('Error', msg);
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) { Alert.alert('Enter Email', 'Please enter your email address first.'); return; }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert('Email Sent ✓', 'Check your inbox for the password reset link.');
    } catch (error: any) {
      Alert.alert('Error', error.message.includes('user-not-found') ? 'No account found with this email.' : error.message);
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="dark" />

      {/* Top decorative circles */}
      <View style={[s.circle, { top: -60, right: -60, backgroundColor: '#FF6B6B20', width: 200, height: 200, borderRadius: 100 }]} />
      <View style={[s.circle, { top: 40, left: -80, backgroundColor: '#6C63FF15', width: 160, height: 160, borderRadius: 80 }]} />

      <View style={s.inner}>
        {/* Logo */}
        <View style={s.logoRow}>
          <View style={s.logoBox}>
            <Text style={s.logoEmoji}>⚡</Text>
          </View>
          <Text style={s.logoText}>SmartPOS</Text>
        </View>

        <Text style={s.headline}>{isSignUp ? 'Create Account' : 'Welcome Back'}</Text>
        <Text style={s.sub}>{isSignUp ? 'Set up your vendor account to get started.' : 'Sign in to your vendor dashboard.'}</Text>

        <View style={s.form}>
          <View style={s.inputWrap}>
            <Text style={s.inputIcon}>✉️</Text>
            <TextInput
              style={s.input} placeholder="Email address" placeholderTextColor="#B0B0C0"
              keyboardType="email-address" autoCapitalize="none"
              value={email} onChangeText={setEmail}
            />
          </View>
          <View style={s.inputWrap}>
            <Text style={s.inputIcon}>🔒</Text>
            <TextInput
              style={s.input} placeholder="Password" placeholderTextColor="#B0B0C0"
              secureTextEntry value={password} onChangeText={setPassword}
            />
          </View>

          {!isSignUp && (
            <TouchableOpacity onPress={handleForgotPassword} style={s.forgotRow}>
              <Text style={s.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[s.btn, (!email || !password) && s.btnDisabled]}
            onPress={handleAuth} disabled={!email || !password || loading} activeOpacity={0.85}
          >
            {loading ? <ActivityIndicator color="#fff" size="small" /> : (
              <Text style={s.btnText}>{isSignUp ? '🚀  Create Account' : '→  Login'}</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={s.toggleRow}>
          <Text style={s.toggleText}>{isSignUp ? 'Already have an account? ' : "Don't have an account? "}</Text>
          <Text style={s.toggleLink}>{isSignUp ? 'Login' : 'Sign Up'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FC' },
  circle: { position: 'absolute' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 36 },
  logoBox: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#FFB703', justifyContent: 'center', alignItems: 'center', marginRight: 10, shadowColor: '#FFB703', shadowOpacity: 0.4, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 6 },
  logoEmoji: { fontSize: 22 },
  logoText: { fontSize: 24, fontWeight: '900', color: '#1A1A2E', letterSpacing: -0.5 },
  headline: { fontSize: 28, fontWeight: '800', color: '#1A1A2E', marginBottom: 8, letterSpacing: -0.5 },
  sub: { fontSize: 14, color: '#8A8FAF', marginBottom: 32, lineHeight: 20 },
  form: { gap: 14 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 14, paddingHorizontal: 14, borderWidth: 1.5, borderColor: '#EBEBF0', shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2 },
  inputIcon: { fontSize: 16, marginRight: 10 },
  input: { flex: 1, paddingVertical: 15, fontSize: 15, color: '#1A1A2E' },
  btn: { backgroundColor: '#6C63FF', paddingVertical: 15, borderRadius: 14, alignItems: 'center', shadowColor: '#6C63FF', shadowOpacity: 0.35, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 8 },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  toggleRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  toggleText: { color: '#8A8FAF', fontSize: 13 },
  toggleLink: { color: '#6C63FF', fontSize: 13, fontWeight: '700' },
  forgotRow: { alignSelf: 'flex-end', marginTop: -4 },
  forgotText: { color: '#FF6B6B', fontSize: 13, fontWeight: '600' },
});
