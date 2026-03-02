import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, TouchableOpacity, Alert,
  RefreshControl, ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { deliveryAuthAPI } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import type { DeliveryOrder } from '@/type';

export default function DeliveryOrdersScreen() {
  const router = useRouter();
  const { user, isDeliveryMode } = useAuth();

  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [acceptingOrderId, setAcceptingOrderId] = useState<number | null>(null);

  const hasDeliveryRole = user?.roles?.includes('ROLE_DELIVERY') ?? false;
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollDelayRef = useRef(10000);

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);

    try {
      const data = await deliveryAuthAPI.getOrders();
      setOrders(data.filter((order) => order.status === 'PENDING'));
      pollDelayRef.current = 10000;
    } catch (error: any) {
      if (error?.status === 429) {
        pollDelayRef.current = Math.min(pollDelayRef.current * 2, 60000);
      }
      else {
        pollDelayRef.current = 15000;
      }
      // silently fail
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!hasDeliveryRole) {
      router.replace('/delivery-auth' as Href);
      return;
    }

    if (!isDeliveryMode) {
      router.replace('/(tabs)' as Href);
      return;
    }

    let isActive = true;
    const runPolling = async (silent = false) => {
      await fetchOrders(silent);
      if (!isActive) return;
      pollTimeoutRef.current = setTimeout(() => {
        runPolling(true);
      }, pollDelayRef.current);
    };

    runPolling();

    return () => {
      isActive = false;
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, [fetchOrders, hasDeliveryRole, isDeliveryMode, router]);

  const handleAcceptOrder = async (orderId: number) => {
    setAcceptingOrderId(orderId);
    try {
      await deliveryAuthAPI.acceptOrder(orderId);
      setOrders((prev) => prev.filter((order) => order.orderId !== orderId));
      Alert.alert('Order Accepted', 'The order is now assigned to you.');
    } catch (e: any) {
      Alert.alert('Could not accept order', e?.message ?? 'Please try again.');
    } finally {
      setAcceptingOrderId(null);
    }
  };

  const renderOrder: ListRenderItem<DeliveryOrder> = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.orderId}>Order #{item.orderId}</Text>
        <Text style={styles.total}>${item.totalPrice.toFixed(2)}</Text>
      </View>

      <Text style={styles.meta}>👤 {item.customerName}</Text>
      <Text style={styles.meta}>📏 {item.distance.toFixed(2)} km</Text>
      <Text style={styles.meta}>📍 {item.deliveryLocation?.address || 'No address provided'}</Text>

      <View style={styles.itemsWrap}>
        {item.items.map((orderItem, index) => (
          <Text key={`${item.orderId}-${orderItem.productName}-${index}`} style={styles.itemText}>
            • {orderItem.quantity}x {orderItem.productName} ({orderItem.size}) - ${orderItem.price.toFixed(2)}
          </Text>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.acceptButton, acceptingOrderId === item.orderId && { opacity: 0.65 }]}
        onPress={() => handleAcceptOrder(item.orderId)}
        disabled={acceptingOrderId === item.orderId}
      >
        {acceptingOrderId === item.orderId
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.acceptText}>Accept</Text>}
      </TouchableOpacity>
    </View>
  );

  if (!hasDeliveryRole || !isDeliveryMode) {
    return <SafeAreaView style={styles.wrapper} />;
  }

  return (
    <SafeAreaView style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>Pending Orders</Text>
        <Text style={styles.subtitle}>Auto refresh with rate-limit backoff</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#53b175" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.orderId)}
          renderItem={renderOrder}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                setIsRefreshing(true);
                fetchOrders(true);
              }}
              tintColor="#53b175"
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={styles.emptyText}>No pending orders right now</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  title: { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },
  subtitle: { color: '#888', fontSize: 13, marginTop: 2 },
  listContent: { padding: 16, paddingBottom: 28 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  orderId: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  total: { fontSize: 16, fontWeight: '800', color: '#53b175' },
  meta: { color: '#666', fontSize: 13, marginBottom: 4 },
  itemsWrap: { marginTop: 8, marginBottom: 14, gap: 4 },
  itemText: { color: '#444', fontSize: 13 },
  acceptButton: {
    backgroundColor: '#53b175', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  acceptText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyText: { color: '#aaa', fontSize: 16 },
});
