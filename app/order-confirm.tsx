import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import type { OrderResponse } from '@/type';

export default function OrderConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ order: string }>();
  const order: OrderResponse = JSON.parse(params.order ?? '{}');
  const guy = order.assignedDeliveryGuy;

  return (
    <SafeAreaView style={styles.wrapper}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Success */}
        <View style={styles.successHeader}>
          <Text style={styles.successEmoji}>🎉</Text>
          <Text style={styles.successTitle}>Order Placed!</Text>
          <Text style={styles.orderId}>Order #{order.orderId}</Text>
        </View>

        {/* Driver */}
        {guy && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🏍️ Your Driver</Text>
            <View style={styles.driverRow}>
              <View style={styles.driverAvatar}>
                <Text style={styles.driverAvatarText}>{guy.name.charAt(0)}</Text>
              </View>
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{guy.name}</Text>
                <Text style={styles.driverMeta}>🚗 {guy.car}</Text>
                <Text style={styles.driverMeta}>📍 {guy.distanceFromUser.toFixed(1)} km away</Text>
              </View>
            </View>
            <View style={styles.whatsappBadge}>
              <Text style={styles.whatsappText}>✅ WhatsApp notification sent to driver</Text>
            </View>
          </View>
        )}

        {/* Order items */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📦 Order Details</Text>
          {order.items?.map(item => (
            <View key={item.productId} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.productName}</Text>
              <Text style={styles.itemQty}>×{item.quantity}</Text>
              <Text style={styles.itemPrice}>${(item.basePrice * item.quantity).toFixed(2)}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.itemRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${order.totalPrice?.toFixed(2)}</Text>
          </View>
          <Text style={styles.distanceNote}>📏 Distance: {order.distance?.toFixed(1)} km</Text>
        </View>

        {/* Status timeline */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📋 Status</Text>
          <Step emoji="✅" label="Order confirmed"                done />
          <Step emoji="👨‍💼" label="Driver assigned"               done />
          <Step emoji="📱" label="Driver notified via WhatsApp"  done />
          <Step emoji="🚗" label="Driver on the way"             active />
          <Step emoji="📦" label="Delivered"                     />
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={() => router.replace('/(tabs)')} activeOpacity={0.85}>
          <Text style={styles.buttonText}>Back to Menu</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Step({ emoji, label, done, active }: {
  emoji: string; label: string; done?: boolean; active?: boolean;
}) {
  return (
    <View style={step.row}>
      <View style={[step.dot, done && step.dotDone, active && step.dotActive]}>
        <Text style={step.emoji}>{done || active ? emoji : '○'}</Text>
      </View>
      <Text style={[step.label, (done || active) && step.labelDone]}>{label}</Text>
    </View>
  );
}

const step = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  dot: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  dotDone:   { backgroundColor: '#e8f5e9' },
  dotActive: { backgroundColor: '#fff3e0' },
  emoji:     { fontSize: 16 },
  label:     { color: '#aaa', fontSize: 14 },
  labelDone: { color: '#1a1a1a', fontWeight: '600' },
});

const styles = StyleSheet.create({
  wrapper:       { flex: 1, backgroundColor: '#f8f9fa' },
  container:     { padding: 24, paddingBottom: 20 },
  successHeader: { alignItems: 'center', marginBottom: 28, marginTop: 12 },
  successEmoji:  { fontSize: 72, marginBottom: 10 },
  successTitle:  { fontSize: 28, fontWeight: '800', color: '#1a1a1a' },
  orderId:       { color: '#888', marginTop: 4, fontSize: 14 },
  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardTitle:     { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', marginBottom: 16, letterSpacing: 0.5 },
  driverRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  driverAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#53b175', justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  driverAvatarText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  driverInfo:    { flex: 1 },
  driverName:    { fontSize: 17, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  driverMeta:    { color: '#888', fontSize: 13, marginBottom: 2 },
  whatsappBadge: { backgroundColor: '#e8f5e9', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  whatsappText:  { color: '#2e7d32', fontSize: 13, fontWeight: '600' },
  itemRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  itemName:      { flex: 1, color: '#1a1a1a', fontSize: 14 },
  itemQty:       { color: '#888', fontSize: 14, marginHorizontal: 8 },
  itemPrice:     { color: '#1a1a1a', fontWeight: '600', fontSize: 14 },
  divider:       { height: 1, backgroundColor: '#f0f0f0', marginVertical: 10 },
  totalLabel:    { flex: 1, fontWeight: '800', fontSize: 16, color: '#1a1a1a' },
  totalValue:    { fontWeight: '800', fontSize: 18, color: '#53b175' },
  distanceNote:  { color: '#aaa', fontSize: 12, marginTop: 8 },
  footer:        { padding: 16, paddingBottom: 24 },
  button: {
    backgroundColor: '#53b175', borderRadius: 16, paddingVertical: 18, alignItems: 'center',
    shadowColor: '#53b175', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 8,
  },
  buttonText:    { color: '#fff', fontSize: 17, fontWeight: '800' },
});
