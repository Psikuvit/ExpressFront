import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useAuth } from '@/context/AuthContext';
import { locationAPI } from '@/api/client';
import { addToCart, removeFromCart, getCartCount, getCartTotal, cartToItems } from '@/utils/cart';
import type { Product, Cart, AppLocation } from '@/type';

const PRODUCTS: Product[] = [
  { id: 1, name: 'Pizza Margherita', size: 'MEDIUM', price: 12.99, emoji: '🍕' },
  { id: 2, name: 'Burger Deluxe',    size: 'SMALL',  price: 8.99,  emoji: '🍔' },
  { id: 3, name: 'Family Meal Box',  size: 'BIG',    price: 29.99, emoji: '📦' },
  { id: 4, name: 'Salad Bowl',       size: 'SMALL',  price: 6.99,  emoji: '🥗' },
  { id: 5, name: 'Pasta Carbonara',  size: 'MEDIUM', price: 11.99, emoji: '🍝' },
];

const SIZE_COLORS: Record<string, string> = {
  SMALL:  '#e8f5e9',
  MEDIUM: '#fff3e0',
  BIG:    '#fce4ec',
};

export default function HomeScreen() {
  const { user } = useAuth();
  const router   = useRouter();

  const [cart,         setCart]         = useState<Cart>({});
  const [userLocation, setUserLocation] = useState<AppLocation | null>(null);

  useEffect(() => {
    if (!user?.token) return;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const payload: AppLocation = {
        latitude:  loc.coords.latitude,
        longitude: loc.coords.longitude,
        address:   '',
      };
      setUserLocation(payload);
      locationAPI.update(payload).catch(() => {
      });
    })();
  }, [user?.token]);

  const handleAdd    = useCallback((id: number) => setCart(c => addToCart(c, id)),    []);
  const handleRemove = useCallback((id: number) => setCart(c => removeFromCart(c, id)), []);

  const cartCount = getCartCount(cart);
  const cartTotal = getCartTotal(cart, PRODUCTS);

  const goCheckout = () => {
    router.push({
      pathname: '/checkout',
      params: {
        products: JSON.stringify(cartToItems(cart)),
        location: JSON.stringify(userLocation),
      },
    } as never);
  };

  const renderProduct: ListRenderItem<Product> = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.emoji}>{item.emoji}</Text>
      <View style={styles.cardInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <View style={styles.metaRow}>
          <View style={[styles.sizeBadge, { backgroundColor: SIZE_COLORS[item.size] }]}>
            <Text style={styles.sizeText}>{item.size}</Text>
          </View>
          <Text style={styles.price}>${item.price.toFixed(2)}</Text>
        </View>
      </View>
      <View style={styles.qtyControls}>
        {(cart[item.id] ?? 0) > 0 && (
          <>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => handleRemove(item.id)}>
              <Text style={styles.qtyBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.qtyCount}>{cart[item.id]}</Text>
          </>
        )}
        <TouchableOpacity style={[styles.qtyBtn, styles.qtyBtnAdd]} onPress={() => handleAdd(item.id)}>
          <Text style={[styles.qtyBtnText, { color: '#fff' }]}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.wrapper}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.username} 👋</Text>
          <Text style={styles.headerSub}>
            {userLocation ? '📍 Location detected' : '⏳ Getting location…'}
          </Text>
        </View>
        <View style={styles.cartIconWrap}>
          <Text style={styles.cartEmoji}>🛒</Text>
          {cartCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{cartCount}</Text>
            </View>
          )}
        </View>
      </View>

      <Text style={styles.sectionTitle}>Today&apos;s Menu</Text>

      <FlatList
        data={PRODUCTS}
        keyExtractor={item => String(item.id)}
        renderItem={renderProduct}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Checkout bar */}
      {cartCount > 0 && (
        <TouchableOpacity style={styles.checkoutBar} onPress={goCheckout} activeOpacity={0.9}>
          <Text style={styles.checkoutLeft}>🛒 {cartCount} item{cartCount > 1 ? 's' : ''}</Text>
          <Text style={styles.checkoutRight}>Checkout · ${cartTotal.toFixed(2)} →</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper:      { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  greeting:     { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },
  headerSub:    { color: '#888', fontSize: 12, marginTop: 2 },
  cartIconWrap: { position: 'relative' },
  cartEmoji:    { fontSize: 26 },
  badge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: '#53b175', borderRadius: 10,
    minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center',
  },
  badgeText:    { color: '#fff', fontSize: 10, fontWeight: '800' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', paddingHorizontal: 20, paddingVertical: 16 },
  listContent:  { paddingHorizontal: 16, paddingBottom: 100 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  emoji:        { fontSize: 38, marginRight: 14 },
  cardInfo:     { flex: 1 },
  productName:  { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 6 },
  metaRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sizeBadge:    { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  sizeText:     { fontSize: 11, fontWeight: '700', color: '#555' },
  price:        { fontSize: 15, fontWeight: '700', color: '#53b175' },
  qtyControls:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: {
    width: 34, height: 34, borderRadius: 17,
    borderWidth: 1.5, borderColor: '#e0e0e0',
    justifyContent: 'center', alignItems: 'center',
  },
  qtyBtnAdd:    { backgroundColor: '#53b175', borderColor: '#53b175' },
  qtyBtnText:   { fontSize: 20, fontWeight: '700', color: '#555', lineHeight: 22 },
  qtyCount:     { fontSize: 15, fontWeight: '800', minWidth: 20, textAlign: 'center' },
  checkoutBar: {
    position: 'absolute', bottom: 20, left: 16, right: 16,
    backgroundColor: '#53b175', borderRadius: 18,
    paddingVertical: 18, paddingHorizontal: 24,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#53b175', shadowOpacity: 0.45, shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 }, elevation: 10,
  },
  checkoutLeft:  { color: '#fff', fontSize: 15, fontWeight: '600' },
  checkoutRight: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
