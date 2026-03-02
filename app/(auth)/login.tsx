import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView
} from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { validateLoginForm } from '@/utils/validation';

export default function LoginScreen() {
  const { login } = useAuth();

  const [username,     setUsername]     = useState('');
  const [password,     setPassword]     = useState('');
  const [isLoading,    setIsLoading]    = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    const error = validateLoginForm(username, password);
    if (error) return Alert.alert('Validation Error', error);

    setIsLoading(true);
    try {
      await login(username.trim(), password);
      // AuthGuard in _layout.tsx will redirect automatically
    } catch (e: any) {
      Alert.alert('Login Failed', e?.response?.data?.message ?? 'Invalid username or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.wrapper} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Courses Express</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your username"
            placeholderTextColor="#aaa"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Enter your password"
              placeholderTextColor="#aaa"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(v => !v)}>
              <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Sign In</Text>}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don&apos;t have an account? </Text>
          <Link href="./register" asChild>
            <TouchableOpacity>
              <Text style={styles.link}>Create account</Text>
            </TouchableOpacity>
          </Link>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper:        { flex: 1, backgroundColor: '#fff' },
  container:      { flexGrow: 1, justifyContent: 'center', padding: 28 },
  header:         { alignItems: 'center', marginBottom: 40 },
  logo:           { width: 64, height: 64, marginBottom: 12 },
  title:          { fontSize: 30, fontWeight: '800', color: '#1a1a1a', letterSpacing: -0.5 },
  subtitle:       { color: '#888', fontSize: 15, marginTop: 4 },
  form:           { marginBottom: 32 },
  label:          { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: '#f5f5f5', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#1a1a1a',
    marginBottom: 4, borderWidth: 1.5, borderColor: 'transparent',
  },
  passwordRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  eyeBtn:         { padding: 10 },
  eyeIcon:        { fontSize: 20 },
  button: {
    backgroundColor: '#53b175', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 24,
    shadowColor: '#53b175', shadowOpacity: 0.35, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
  hint:           { textAlign: 'center', color: '#aaa', fontSize: 12, marginTop: 12 },
  footer:         { flexDirection: 'row', justifyContent: 'center' },
  footerText:     { color: '#888', fontSize: 14 },
  link:           { color: '#53b175', fontSize: 14, fontWeight: '700' },
});
