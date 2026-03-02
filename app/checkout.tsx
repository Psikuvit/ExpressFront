import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { checkoutAPI } from '@/api/client';
import type { CartItem, AppLocation, CalcResponse } from '@/type';

export default function CheckoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ products: string; location: string }>();

  const products: CartItem[] = useMemo(() => JSON.parse(params.products ?? '[]'), [params.products]);
  const location: AppLocation | null = useMemo(
    () => (params.location ? JSON.parse(params.location) : null),
    [params.location]
  );

  const [estimate,  setEstimate]  = useState<CalcResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlacing, setIsPlacing] = useState(false);

  useEffect(() => {
    checkoutAPI
      .calculate({
        products,
        userLocation: {
          latitude:  location?.latitude  ?? 0,
          longitude: location?.longitude ?? 0,
        },
      })
      .then(setEstimate)
      .catch(() => Alert.alert('Error', 'Could not calculate price.'))
      .finally(() => setIsLoading(false));
  }, [products, location]);

  const placeOrder = async () => {
    setIsPlacing(true);
    try {
      const data = await checkoutAPI.placeOrder({
        products,
        deliveryLocation: {
          latitude:  location?.latitude  ?? 0,
          longitude: location?.longitude ?? 0,
          address:   location?.address   ?? '',
        },
      });
      router.replace({ pathname: '/order-confirm', params: { order: JSON.stringify(data) } } as never);
    } catch (e: any) {
      Alert.alert('Order Failed', e?.response?.data?.message ?? 'Something went wrong.');
    } finally {
      setIsPlacing(false);
    }
  };

  return (
    <SafeAreaView style={styles.wrapper}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Order Summary</Text>

        {/* Location */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📍 Delivery Location</Text>
          <Text style={styles.locationText}>
            {location?.address || (location
              ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
              : 'Location not detected')}
          </Text>
        </View>

        {/* Price breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💰 Price Breakdown</Text>
          {isLoading ? (
            <ActivityIndicator color="#53b175" style={{ marginVertical: 20 }} />
          ) : estimate ? (
            <>
              <PriceRow label="Base Price"                                value={`$${estimate.basePrice.toFixed(2)}`} />
              <PriceRow label="Size Fee"                                  value={`$${estimate.sizeFee.toFixed(2)}`} />
              <PriceRow label={`Distance Fee (${estimate.distance.toFixed(1)} km)`} value={`$${estimate.distanceFee.toFixed(2)}`} />
              <View style={styles.divider} />
              <PriceRow label="Total" value={`$${estimate.totalPrice.toFixed(2)}`} isTotal />
            </>
          ) : (
            <Text style={styles.errorText}>Could not load price estimate</Text>
          )}
        </View>

        {/* Note */}
        <View style={styles.noteCard}>
          <Text style={styles.noteText}>
            📱 Your driver will receive a WhatsApp notification with your order details automatically.
          </Text>
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, (isPlacing || isLoading) && styles.buttonDisabled]}
          onPress={placeOrder}
          disabled={isPlacing || isLoading}
          activeOpacity={0.85}
        >
          {isPlacing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.buttonText}>Place Order</Text>
              {estimate && <Text style={styles.buttonSub}>${estimate.totalPrice.toFixed(2)}</Text>}
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function PriceRow({ label, value, isTotal }: { label: string; value: string; isTotal?: boolean }) {
  return (
    <View style={priceRow.row}>
      <Text style={[priceRow.label, isTotal && priceRow.totalLabel]}>{label}</Text>
      <Text style={[priceRow.value, isTotal && priceRow.totalValue]}>{value}</Text>
    </View>
  );
}

const priceRow = StyleSheet.create({
  row:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  label:      { color: '#666', fontSize: 14 },
  value:      { color: '#1a1a1a', fontWeight: '600', fontSize: 14 },
  totalLabel: { color: '#1a1a1a', fontWeight: '800', fontSize: 16 },
  totalValue: { color: '#53b175', fontWeight: '800', fontSize: 18 },
});

const styles = StyleSheet.create({
  wrapper:       { flex: 1, backgroundColor: '#f8f9fa' },
  container:     { padding: 24, paddingBottom: 40 },
  backButton:    { marginBottom: 16 },
  backText:      { color: '#53b175', fontSize: 15, fontWeight: '600' },
  title:         { fontSize: 26, fontWeight: '800', color: '#1a1a1a', marginBottom: 24 },
  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardTitle:     { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', marginBottom: 14, letterSpacing: 0.5 },
  locationText:  { color: '#1a1a1a', fontSize: 15 },
  divider:       { height: 1, backgroundColor: '#f0f0f0', marginVertical: 12 },
  errorText:     { color: '#aaa', textAlign: 'center', paddingVertical: 12 },
  noteCard: {
    backgroundColor: '#fff8f5', borderRadius: 14, padding: 16,
    borderLeftWidth: 3, borderLeftColor: '#53b175',
  },
  noteText:      { color: '#777', fontSize: 13, lineHeight: 20 },
  footer:        { padding: 16, paddingBottom: 24, backgroundColor: '#f8f9fa' },
  button: {
    backgroundColor: '#53b175', borderRadius: 16, paddingVertical: 18,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 12,
    shadowColor: '#53b175', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText:    { color: '#fff', fontSize: 17, fontWeight: '800' },
  buttonSub:     { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '600' },
});
