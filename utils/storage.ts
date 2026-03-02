import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { AuthResponse } from '@/type';

const KEYS = {
  TOKEN:         'auth_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  USER:          'auth_user',
  DELIVERY_MODE: 'delivery_mode',
} as const;

export const getToken = async (): Promise<string | null> => {
  try {
    const token = await SecureStore.getItemAsync(KEYS.TOKEN);
    if (token) return token;

    const legacyToken = await AsyncStorage.getItem(KEYS.TOKEN);
    if (!legacyToken) return null;

    await SecureStore.setItemAsync(KEYS.TOKEN, legacyToken);
    await AsyncStorage.removeItem(KEYS.TOKEN);
    return legacyToken;
  }
  catch { return null; }
};

export const getRefreshToken = async (): Promise<string | null> => {
  try {
    const refreshToken = await SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
    if (refreshToken) return refreshToken;

    const legacyRefreshToken = await AsyncStorage.getItem(KEYS.REFRESH_TOKEN);
    if (!legacyRefreshToken) return null;

    await SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, legacyRefreshToken);
    await AsyncStorage.removeItem(KEYS.REFRESH_TOKEN);
    return legacyRefreshToken;
  }
  catch { return null; }
};

export const saveTokens = async (token: string, refreshToken: string): Promise<void> => {
  await Promise.all([
    SecureStore.setItemAsync(KEYS.TOKEN, token),
    SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refreshToken),
  ]);
};

export const clearTokens = async (): Promise<void> => {
  await Promise.all([
    SecureStore.deleteItemAsync(KEYS.TOKEN),
    SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN),
    AsyncStorage.removeItem(KEYS.TOKEN),
    AsyncStorage.removeItem(KEYS.REFRESH_TOKEN),
    AsyncStorage.removeItem(KEYS.USER),
    AsyncStorage.removeItem(KEYS.DELIVERY_MODE),
  ]);
};

export const saveUser = async (user: AuthResponse): Promise<void> => {
  await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
};

export const getUser = async (): Promise<AuthResponse | null> => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.USER);
    return raw ? (JSON.parse(raw) as AuthResponse) : null;
  } catch { return null; }
};

export const setDeliveryModeStorage = async (enabled: boolean): Promise<void> => {
  await AsyncStorage.setItem(KEYS.DELIVERY_MODE, JSON.stringify(enabled));
};

export const getDeliveryModeStorage = async (): Promise<boolean> => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.DELIVERY_MODE);
    return raw ? JSON.parse(raw) === true : false;
  } catch {
    return false;
  }
};
