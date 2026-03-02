import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, RefreshControl, ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { deliveryAPI } from '@/api/client';
import type { DeliveryGuy } from '@/type';

export default function ExploreScreen() {
  const [drivers,     setDrivers]     = useState<DeliveryGuy[]>([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDrivers = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await deliveryAPI.getAll();
      setDrivers(data);
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => { fetchDrivers(); }, []);

  const renderDriver: ListRenderItem<DeliveryGuy> = ({ item }) => (
    <View style={styles.card}>
      <View style={[styles.avatar, { backgroundColor: item.available ? '#53b175' : '#ccc' }]}>
        <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
      </View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{item.name}</Text>
          <View style={[styles.statusBadge, item.available ? styles.statusAvailable : styles.statusBusy]}>
            <Text style={[styles.statusText, item.available ? styles.statusTextAvailable : styles.statusTextBusy]}>
              {item.available ? 'Available' : 'On delivery'}
            </Text>
          </View>
        </View>
        <Text style={styles.meta}>🚗 {item.car}</Text>
        <Text style={styles.meta}>📍 {item.nearestLocation.address || 'Location set'}</Text>
        {item.distanceFromUser > 0 && (
          <Text style={styles.distance}>{item.distanceFromUser.toFixed(1)} km away</Text>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>Delivery Drivers</Text>
        <Text style={styles.subtitle}>{drivers.filter(d => d.available).length} available now</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#53b175" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={drivers}
          keyExtractor={item => String(item.id)}
          renderItem={renderDriver}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => { setIsRefreshing(true); fetchDrivers(true); }}
              tintColor="#53b175"
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🏍️</Text>
              <Text style={styles.emptyText}>No drivers found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper:       { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  title:         { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },
  subtitle:      { color: '#888', fontSize: 13, marginTop: 2 },
  listContent:   { padding: 16 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  avatar: {
    width: 50, height: 50, borderRadius: 25,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  avatarText:    { color: '#fff', fontSize: 20, fontWeight: '800' },
  info:          { flex: 1 },
  nameRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  name:          { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  statusBadge:   { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  statusAvailable: { backgroundColor: '#e8f5e9' },
  statusBusy:    { backgroundColor: '#f5f5f5' },
  statusText:    { fontSize: 11, fontWeight: '700' },
  statusTextAvailable: { color: '#2e7d32' },
  statusTextBusy:      { color: '#999' },
  meta:          { color: '#888', fontSize: 13, marginBottom: 2 },
  distance:      { color: '#53b175', fontSize: 12, fontWeight: '600', marginTop: 4 },
  empty:         { alignItems: 'center', marginTop: 80 },
  emptyEmoji:    { fontSize: 56, marginBottom: 12 },
  emptyText:     { color: '#aaa', fontSize: 16 },
});
