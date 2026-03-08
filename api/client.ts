import { getToken, getRefreshToken, saveTokens, clearTokens } from '@/utils/storage';
import Constants from 'expo-constants';
import type {
  AuthResponse, LoginRequest, RegisterRequest,
  CalcRequest, CalcResponse, CheckoutRequest, OrderResponse,
  AppLocation, LocationResponse, DeliveryGuy,
  DeliveryRegistrationRequest, DeliveryProfile, DeliveryOrder,
} from '@/type';

const resolveBaseUrl = (): string => {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv;

  const fallback = 'http://localhost:8080';
  if (!__DEV__) return fallback;

  const expoConstants = Constants as unknown as {
    expoConfig?: { hostUri?: string };
    manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } };
    manifest?: { debuggerHost?: string };
  };

  const hostUri =
    expoConstants.expoConfig?.hostUri
    ?? expoConstants.manifest2?.extra?.expoGo?.debuggerHost
    ?? expoConstants.manifest?.debuggerHost;

  const host = hostUri?.split(':')[0];
  if (!host || host === 'localhost' || host === '127.0.0.1') return fallback;

  return `http://${host}:8080`;
};

export const BASE_URL = resolveBaseUrl();
export const APP_TOKEN = process.env.EXPO_PUBLIC_APP_TOKEN?.trim() || '';

export const isNetworkError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  return Boolean((error as { isNetworkError?: boolean }).isNetworkError);
};

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

let refreshPromise: Promise<void> | null = null;
let apiCallId = 0;

const SENSITIVE_KEYS = new Set(['password', 'token', 'refreshtoken', 'authorization', 'x-app-token']);
const SENSITIVE_PATHS = ['/api/auth/login', '/api/auth/signup', '/api/auth/refresh'];

const tryParseJson = (value: unknown) => {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); }
  catch { return value; }
};

const redact = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, val]) => {
        if (SENSITIVE_KEYS.has(key.toLowerCase())) return [key, '[REDACTED]'];
        return [key, redact(val)];
      })
    );
  }
  return value;
};

const sanitizeForLog = (path: string, payload: unknown) => {
  if (payload == null) return payload;
  const parsed = tryParseJson(payload);
  if (SENSITIVE_PATHS.some((sensitivePath) => path.startsWith(sensitivePath))) {
    return '[REDACTED]';
  }
  return redact(parsed);
};

const request = async <T>(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<T> => {
  const id = ++apiCallId;
  const method = (options.method ?? 'GET').toUpperCase();
  const startedAt = Date.now();
  const token = await getToken();
  const requestBody = sanitizeForLog(path, options.body);

  if (__DEV__) {
    console.log(`[API ${id}] → ${method} ${path}`, requestBody ?? null);
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(APP_TOKEN ? { 'X-App-Token': APP_TOKEN } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    const networkError = {
      message: `Cannot reach backend at ${BASE_URL}. Set EXPO_PUBLIC_API_URL to your LAN IP, e.g. http://192.168.x.x:8080`,
      isNetworkError: true,
    };
    if (__DEV__) {
      console.warn(`[API ${id}] ✕ ${method} ${path} network (${Date.now() - startedAt}ms)`, { ...networkError, cause: error });
    }
    throw networkError;
  }

  if (res.status === 401 && retry) {
    try {
      if (!refreshPromise) {
        refreshPromise = (async () => {
          const refreshToken = await getRefreshToken();
          if (!refreshToken) throw { message: 'No refresh token' };

          const refreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(APP_TOKEN ? { 'X-App-Token': APP_TOKEN } : {}),
            },
            body: JSON.stringify({ refreshToken }),
          });

          if (!refreshRes.ok) {
            const refreshError = await refreshRes.json().catch(() => ({ message: `HTTP ${refreshRes.status}` }));
            throw refreshError;
          }

          const data: AuthResponse = await refreshRes.json();
          await saveTokens(data.token, data.refreshToken);
        })();
      }

      await refreshPromise;
      return request<T>(path, options, false);
    } catch (error) {
      await clearTokens();
      if (__DEV__) {
        console.warn(`[API ${id}] ✕ ${method} ${path} refresh failed (${Date.now() - startedAt}ms)`, error);
      }
      throw error;
    } finally {
      refreshPromise = null;
    }
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    const safeErrorBody = sanitizeForLog(path, errorBody);
    if (__DEV__) {
      console.warn(`[API ${id}] ✕ ${method} ${path} ${res.status} (${Date.now() - startedAt}ms)`, safeErrorBody);
    }
    throw errorBody;
  }

  if (res.status === 204) {
    if (__DEV__) {
      console.log(`[API ${id}] ✓ ${method} ${path} 204 (${Date.now() - startedAt}ms)`);
    }
    return undefined as T;
  }

  const data = await res.json() as T;
  const safeData = sanitizeForLog(path, data);
  if (__DEV__) {
    console.log(`[API ${id}] ✓ ${method} ${path} ${res.status} (${Date.now() - startedAt}ms)`, safeData);
  }
  return data;
};

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authAPI = {
  login:    (data: LoginRequest)    => request<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data: RegisterRequest) => request<{ message: string }>('/api/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
  logout:   ()                      => request<void>('/api/auth/logout', { method: 'POST' }),
};

// ─── Checkout API ─────────────────────────────────────────────────────────────

export const checkoutAPI = {
  calculate:  (data: CalcRequest)     => request<CalcResponse>('/api/checkout/calc', { method: 'POST', body: JSON.stringify(data) }),
  placeOrder: (data: CheckoutRequest) => request<OrderResponse>('/api/checkout', { method: 'POST', body: JSON.stringify(data) }),
};

// ─── Delivery Guys API ────────────────────────────────────────────────────────

export const deliveryAPI = {
  getAll: (lat?: number, lng?: number) => {
    const query = lat != null && lng != null
      ? `?latitude=${lat}&longitude=${lng}`
      : '';
    return request<DeliveryGuy[]>(`/api/deliveryguys${query}`, { method: 'GET' });
  },
};

// ─── Location API ─────────────────────────────────────────────────────────────

export const locationAPI = {
  update: (data: AppLocation) => request<LocationResponse>('/api/location', { method: 'POST', body: JSON.stringify(data) }),
  get:    ()                  => request<LocationResponse>('/api/location', { method: 'GET' }),
};

// ─── Delivery API ─────────────────────────────────────────────────────────────

export const deliveryAuthAPI = {
  register:    (data: DeliveryRegistrationRequest) => request<DeliveryProfile>('/api/delivery/register', { method: 'POST', body: JSON.stringify(data) }),
  getMe:       ()                                  => request<DeliveryProfile>('/api/delivery/me', { method: 'GET' }),
  getOrders:   ()                                  => request<DeliveryOrder[]>('/api/delivery/orders', { method: 'GET' }),
  acceptOrder: (orderId: number)                   => request<DeliveryOrder>(`/api/delivery/orders/${orderId}/accept`, { method: 'POST' }),
};
