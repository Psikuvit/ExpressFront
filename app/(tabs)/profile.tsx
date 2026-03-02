import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { locationAPI } from '@/api/client';
import type { AppLocation } from '@/type';

export default function ProfileScreen() {
  const { user, logout, isDeliveryMode, setDeliveryMode } = useAuth();
  const router = useRouter();
  const [location,        setLocation]        = useState<AppLocation | null>(null);
  const [isLoadingLoc,    setIsLoadingLoc]    = useState(true);
  const [isLoggingOut,    setIsLoggingOut]    = useState(false);
  const hasDeliveryRole = user?.roles?.includes('ROLE_DELIVERY') ?? false;

  useEffect(() => {
    locationAPI.get()
      .then(data => setLocation(data.location))
      .catch(() => {})
      .finally(() => setIsLoadingLoc(false));
  }, []);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => { setIsLoggingOut(true); await logout(); },
      },
    ]);
  };

  const handleSwitchMode = async () => {
    if (!hasDeliveryRole) {
      router.push('/delivery-auth' as Href);
      return;
    }

    if (isDeliveryMode) {
      await setDeliveryMode(false);
      router.push('/(tabs)' as Href);
      return;
    }

    await setDeliveryMode(true);
    router.push('/(tabs)/delivery' as Href);
  };

  return (
    <SafeAreaView style={styles.wrapper}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* Avatar */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.username?.charAt(0).toUpperCase() ?? '?'}</Text>
          </View>
          <Text style={styles.username}>{user?.username}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.roles?.[0]?.replace('ROLE_', '') ?? 'USER'}</Text>
          </View>
        </View>

        {/* Account info */}
        <Card title="Account Info">
          <Row label="User ID"  value={String(user?.id ?? '—')} />
          <Row label="Username" value={user?.username ?? '—'} />
          <Row label="Email"    value={user?.email    ?? '—'} />
        </Card>

        <Card title="Mode">
          <Text style={styles.modeHint}>
            {hasDeliveryRole
              ? 'You can switch between client and delivery views.'
              : 'Register as a delivery partner to access delivery orders.'}
          </Text>
          <TouchableOpacity style={styles.modeButton} onPress={handleSwitchMode} activeOpacity={0.85}>
            <Text style={styles.modeButtonText}>
              {isDeliveryMode ? 'Switch to Client Mode' : 'Switch to Delivery Mode'}
            </Text>
          </TouchableOpacity>
        </Card>

        {/* Location */}
        <Card title="📍 Last Known Location">
          {isLoadingLoc ? (
            <ActivityIndicator color="#53b175" />
          ) : location ? (
            <>
              <Row label="Latitude"  value={location.latitude.toFixed(6)} />
              <Row label="Longitude" value={location.longitude.toFixed(6)} />
              {location.address ? <Row label="Address" value={location.address} /> : null}
            </>
          ) : (
            <Text style={styles.noLocation}>No location data yet. Open the menu tab to share your location.</Text>
          )}
        </Card>

        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutButton, isLoggingOut && { opacity: 0.6 }]}
          onPress={handleLogout}
          disabled={isLoggingOut}
          activeOpacity={0.85}
        >
          {isLoggingOut
            ? <ActivityIndicator color="#FF3B30" />
            : <Text style={styles.logoutText}>Sign Out</Text>}
        </TouchableOpacity>

        <Text style={styles.version}>Express Delivery v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={cardStyles.card}>
      <Text style={cardStyles.title}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={rowStyles.value}>{value}</Text>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  title: { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', marginBottom: 14, letterSpacing: 0.5 },
});

const rowStyles = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  label: { color: '#888', fontSize: 14 },
  value: { color: '#1a1a1a', fontWeight: '600', fontSize: 14, maxWidth: '60%', textAlign: 'right' },
});

const styles = StyleSheet.create({
  wrapper:       { flex: 1, backgroundColor: '#f8f9fa' },
  container:     { padding: 24, paddingBottom: 40 },
  profileHeader: { alignItems: 'center', marginBottom: 28, marginTop: 8 },
  avatar: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: '#53b175', justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#53b175', shadowOpacity: 0.3, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  avatarText:    { color: '#fff', fontSize: 36, fontWeight: '800' },
  username:      { fontSize: 22, fontWeight: '800', color: '#1a1a1a' },
  email:         { color: '#888', fontSize: 14, marginTop: 2 },
  roleBadge:     { backgroundColor: '#fff3e0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
  roleText:      { color: '#f59e0b', fontWeight: '700', fontSize: 12 },
  noLocation:    { color: '#aaa', fontSize: 14, textAlign: 'center', paddingVertical: 8 },
  modeHint:      { color: '#888', fontSize: 13, marginBottom: 12 },
  modeButton: {
    backgroundColor: '#53b175', borderRadius: 12, paddingVertical: 12,
    alignItems: 'center',
  },
  modeButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  logoutButton:  { borderWidth: 1.5, borderColor: '#FF3B30', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  logoutText:    { color: '#FF3B30', fontWeight: '700', fontSize: 16 },
  version:       { textAlign: 'center', color: '#ccc', fontSize: 12, marginTop: 24 },
});
