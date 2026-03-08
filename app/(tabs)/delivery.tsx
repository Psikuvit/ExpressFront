import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, TouchableOpacity, Alert, Platform,
  RefreshControl, ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { deliveryAuthAPI, isNetworkError } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import type { DeliveryOrder } from '@/type';
import {
  enqueueOfflineAction,
  OFFLINE_ACTION_TYPES,
} from '@/utils/offline-queue';

const DELIVERY_ORDERS_QUERY_KEY = ['delivery', 'pending-orders'];

const fetchPendingOrders = async (): Promise<DeliveryOrder[]> => {
  const data = await deliveryAuthAPI.getOrders();
  return data.filter((order) => order.status === 'PENDING');
};

type DriverPosition = { latitude: number; longitude: number };

export default function DeliveryOrdersScreen() {
  const router = useRouter();
  const { user, isDeliveryMode } = useAuth();
  const queryClient = useQueryClient();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingOrderIds, setPendingOrderIds] = useState<number[]>([]);
  const [driverPosition, setDriverPosition] = useState<DriverPosition | null>(null);

  const hasDeliveryRole = user?.roles?.includes('ROLE_DELIVERY') ?? false;

  useEffect(() => {
    if (!hasDeliveryRole) {
      router.replace('/delivery-auth' as Href);
      return;
    }

    if (!isDeliveryMode) {
      router.replace('/(tabs)' as Href);
      return;
    }
  }, [hasDeliveryRole, isDeliveryMode, router]);

  useEffect(() => {
    if (!hasDeliveryRole || !isDeliveryMode) return;

    let isMounted = true;
    let watcher: Location.LocationSubscription | null = null;

    (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') return;

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (isMounted) {
        setDriverPosition({
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        });
      }

      watcher = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10_000,
          distanceInterval: 20,
        },
        (next) => {
          setDriverPosition({
            latitude: next.coords.latitude,
            longitude: next.coords.longitude,
          });
        }
      );
    })();

    return () => {
      isMounted = false;
      watcher?.remove();
    };
  }, [hasDeliveryRole, isDeliveryMode]);

  const {
    data: orders = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: DELIVERY_ORDERS_QUERY_KEY,
    queryFn: fetchPendingOrders,
    enabled: hasDeliveryRole && isDeliveryMode,
    refetchInterval: 5_000,
  });

  const acceptOrderMutation = useMutation({
    mutationFn: (orderId: number) => deliveryAuthAPI.acceptOrder(orderId),
    onMutate: async (orderId) => {
      await queryClient.cancelQueries({ queryKey: DELIVERY_ORDERS_QUERY_KEY });
      const previousOrders = queryClient.getQueryData<DeliveryOrder[]>(DELIVERY_ORDERS_QUERY_KEY) ?? [];

      queryClient.setQueryData<DeliveryOrder[]>(
        DELIVERY_ORDERS_QUERY_KEY,
        previousOrders.filter((order) => order.orderId !== orderId)
      );

      return { previousOrders };
    },
    onError: async (error, orderId, context) => {
      if (isNetworkError(error)) {
        await enqueueOfflineAction({
          type: OFFLINE_ACTION_TYPES.ACCEPT_ORDER,
          payload: { orderId },
        });
        Alert.alert('Offline', 'Order acceptance queued and will sync automatically when online.');
        return;
      }

      if (context?.previousOrders) {
        queryClient.setQueryData(DELIVERY_ORDERS_QUERY_KEY, context.previousOrders);
      }

      Alert.alert('Could not accept order', (error as { message?: string })?.message ?? 'Please try again.');
    },
    onSuccess: () => {
      Alert.alert('Order Accepted', 'The order is now assigned to you.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: DELIVERY_ORDERS_QUERY_KEY }).catch(() => {});
    },
  });

  const handleAcceptOrder = (orderId: number) => {
    if (pendingOrderIds.includes(orderId)) return;

    setPendingOrderIds((prev) => [...prev, orderId]);
    acceptOrderMutation.mutate(orderId, {
      onSettled: () => {
        setPendingOrderIds((prev) => prev.filter((id) => id !== orderId));
      },
    });
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const renderOrder: ListRenderItem<DeliveryOrder> = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.orderId}>Order #{item.orderId}</Text>
        <Text style={styles.total}>${item.totalPrice.toFixed(2)}</Text>
      </View>

      <Text style={styles.meta}>👤 {item.customerName}</Text>
      <Text style={styles.meta}>📏 {item.distance.toFixed(2)} km</Text>
      <Text style={styles.meta}>⏱️ ETA ~{Math.max(3, Math.round((item.distance / 25) * 60))} min</Text>
      <Text style={styles.meta}>📍 {item.deliveryLocation?.address || 'No address provided'}</Text>

      {Platform.OS !== 'web' && driverPosition ? (
        <RoutePreview
          driverPosition={driverPosition}
          destination={{
            latitude: item.deliveryLocation.latitude,
            longitude: item.deliveryLocation.longitude,
          }}
        />
      ) : null}

      <View style={styles.itemsWrap}>
        {item.items.map((orderItem, index) => (
          <Text key={`${item.orderId}-${orderItem.productName}-${index}`} style={styles.itemText}>
            • {orderItem.quantity}x {orderItem.productName} ({orderItem.size}) - ${orderItem.price.toFixed(2)}
          </Text>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.acceptButton, pendingOrderIds.includes(item.orderId) && { opacity: 0.65 }]}
        onPress={() => handleAcceptOrder(item.orderId)}
        disabled={pendingOrderIds.includes(item.orderId)}
      >
        {pendingOrderIds.includes(item.orderId)
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
        <Text style={styles.subtitle}>Optimistic updates + offline retry queue</Text>
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
              onRefresh={onRefresh}
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

function RoutePreview({
  driverPosition,
  destination,
}: {
  driverPosition: { latitude: number; longitude: number };
  destination: { latitude: number; longitude: number };
}) {
  const region = useMemo(() => {
    const latitude = (driverPosition.latitude + destination.latitude) / 2;
    const longitude = (driverPosition.longitude + destination.longitude) / 2;
    const latitudeDelta = Math.max(Math.abs(driverPosition.latitude - destination.latitude) * 2, 0.01);
    const longitudeDelta = Math.max(Math.abs(driverPosition.longitude - destination.longitude) * 2, 0.01);

    return {
      latitude,
      longitude,
      latitudeDelta,
      longitudeDelta,
    };
  }, [destination.latitude, destination.longitude, driverPosition.latitude, driverPosition.longitude]);

  return (
    <View style={styles.mapWrap}>
      <MapView style={styles.map} initialRegion={region} scrollEnabled={false} zoomEnabled={false}>
        <Marker coordinate={driverPosition} title="You" pinColor="#2563eb" />
        <Marker coordinate={destination} title="Drop-off" pinColor="#53b175" />
        <Polyline coordinates={[driverPosition, destination]} strokeColor="#2563eb" strokeWidth={4} />
      </MapView>
    </View>
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
  mapWrap: {
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eef2ff',
  },
  map: { width: '100%', height: 150 },
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
