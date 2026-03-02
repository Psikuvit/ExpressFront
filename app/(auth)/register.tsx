import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { validateRegisterForm } from '@/utils/validation';

export default function RegisterScreen() {
  const { register } = useAuth();
  const router = useRouter();

  const [username,         setUsername]         = useState('');
  const [email,            setEmail]            = useState('');
  const [password,         setPassword]         = useState('');
  const [confirmPassword,  setConfirmPassword]  = useState('');
  const [isLoading,        setIsLoading]        = useState(false);
  const [showPassword,     setShowPassword]     = useState(false);

  const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error && typeof error === 'object' && 'message' in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) return message;
    }
    if (error instanceof Error && error.message.trim()) return error.message;
    return fallback;
  };

  const handleRegister = async () => {
    const error = validateRegisterForm(username, email, password, confirmPassword);
    if (error) return Alert.alert('Validation Error', error);

    setIsLoading(true);
    try {
      await register(username.trim(), email.trim(), password);
      // AuthGuard redirects to (tabs) automatically
    } catch (error: unknown) {
      Alert.alert('Registration Failed', getErrorMessage(error, 'Could not create account.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.wrapper} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Start ordering in minutes</Text>
        </View>

        <View style={styles.form}>
          <Field label="Username"  value={username}  onChangeText={setUsername}
            placeholder="at least 3 characters"   autoCapitalize="none" />
          <Field label="Email"     value={email}     onChangeText={setEmail}
            placeholder="you@example.com"          keyboardType="email-address" autoCapitalize="none" />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="at least 6 characters"
              placeholderTextColor="#aaa"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(v => !v)}>
              <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <Field label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword}
            placeholder="repeat your password" secureTextEntry={!showPassword} />

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Create Account</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="./login" asChild>
            <TouchableOpacity>
              <Text style={styles.link}>Sign in</Text>
            </TouchableOpacity>
          </Link>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label, value, onChangeText, placeholder, secureTextEntry, autoCapitalize, keyboardType,
}: {
  label: string; value: string; onChangeText: (t: string) => void;
  placeholder?: string; secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address';
}) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#aaa"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        keyboardType={keyboardType ?? 'default'}
        autoCorrect={false}
      />
    </>
  );
}

const styles = StyleSheet.create({
  wrapper:        { flex: 1, backgroundColor: '#fff' },
  container:      { flexGrow: 1, padding: 28, paddingTop: 60 },
  backButton:     { marginBottom: 24 },
  backText:       { color: '#53b175', fontSize: 15, fontWeight: '600' },
  header:         { marginBottom: 32 },
  title:          { fontSize: 28, fontWeight: '800', color: '#1a1a1a' },
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
  footer:         { flexDirection: 'row', justifyContent: 'center' },
  footerText:     { color: '#888', fontSize: 14 },
  link:           { color: '#53b175', fontSize: 14, fontWeight: '700' },
});
