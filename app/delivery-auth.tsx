import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { deliveryAuthAPI } from '@/api/client';
import { useAuth } from '@/context/AuthContext';

export default function DeliveryAuthScreen() {
  const router = useRouter();
  const { user, updateUser, setDeliveryMode } = useAuth();

  const [age, setAge] = useState('');
  const [car, setCar] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): string | null => {
    const parsedAge = Number(age);
    if (!Number.isInteger(parsedAge) || parsedAge < 18) return 'Age must be a valid number (18+).';
    if (car.trim().length < 2) return 'Please enter your car model.';
    if (!whatsappNumber.trim()) return 'WhatsApp number is required.';
    return null;
  };

  const handleSubmit = async () => {
    const error = validateForm();
    if (error) {
      Alert.alert('Validation Error', error);
      return;
    }

    setIsLoading(true);
    try {
      await deliveryAuthAPI.register({
        age: Number(age),
        car: car.trim(),
        whatsappNumber: whatsappNumber.trim(),
      });

      const nextRoles = Array.from(new Set([...(user?.roles ?? []), 'ROLE_DELIVERY']));
      await updateUser({ roles: nextRoles });
      await setDeliveryMode(true);

      Alert.alert('Success', 'You are now registered as a delivery partner.');
      router.replace('/(tabs)/delivery' as Href);
    } catch (e: any) {
      Alert.alert('Registration Failed', e?.message ?? 'Could not complete delivery registration.');
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
          <Text style={styles.title}>Delivery Registration</Text>
          <Text style={styles.subtitle}>Join as a delivery partner</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Age</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your age"
            placeholderTextColor="#aaa"
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
          />

          <Text style={styles.label}>Car</Text>
          <TextInput
            style={styles.input}
            placeholder="Car model"
            placeholderTextColor="#aaa"
            value={car}
            onChangeText={setCar}
          />

          <Text style={styles.label}>WhatsApp Number</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. +1 555 123 4567"
            placeholderTextColor="#aaa"
            value={whatsappNumber}
            onChangeText={setWhatsappNumber}
            keyboardType="phone-pad"
          />

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Register as Delivery</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#fff' },
  container: { flexGrow: 1, padding: 28, paddingTop: 60 },
  backButton: { marginBottom: 24 },
  backText: { color: '#53b175', fontSize: 15, fontWeight: '600' },
  header: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '800', color: '#1a1a1a' },
  subtitle: { color: '#888', fontSize: 15, marginTop: 4 },
  form: { marginBottom: 32 },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: '#f5f5f5', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#1a1a1a',
    borderWidth: 1.5, borderColor: 'transparent',
  },
  button: {
    backgroundColor: '#53b175', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 24,
    shadowColor: '#53b175', shadowOpacity: 0.35, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
