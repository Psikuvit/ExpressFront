import type { Cart, CartItem, Product } from '@/type';

export const addToCart = (cart: Cart, productId: number): Cart => ({
  ...cart,
  [productId]: (cart[productId] ?? 0) + 1,
});

export const removeFromCart = (cart: Cart, productId: number): Cart => {
  const updated = { ...cart };
  if ((updated[productId] ?? 0) > 1) updated[productId]--;
  else delete updated[productId];
  return updated;
};

export const cartToItems = (cart: Cart): CartItem[] =>
  Object.entries(cart).map(([productId, quantity]) => ({
    productId: Number(productId),
    quantity,
  }));

export const getCartCount = (cart: Cart): number =>
  Object.values(cart).reduce((sum, qty) => sum + qty, 0);

export const getCartTotal = (cart: Cart, products: Product[]): number =>
  Object.entries(cart).reduce((sum, [id, qty]) => {
    const product = products.find((p) => p.id === Number(id));
    return sum + (product?.price ?? 0) * qty;
  }, 0);
