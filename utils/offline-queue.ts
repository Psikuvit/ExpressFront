import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppLocation } from '@/type';

const OFFLINE_QUEUE_KEY = 'offline_action_queue_v1';

export const OFFLINE_ACTION_TYPES = {
  ACCEPT_ORDER: 'ACCEPT_ORDER',
  LOCATION_UPDATE: 'LOCATION_UPDATE',
} as const;

export type OfflineActionType = typeof OFFLINE_ACTION_TYPES[keyof typeof OFFLINE_ACTION_TYPES];

export interface AcceptOrderAction {
  id: string;
  type: typeof OFFLINE_ACTION_TYPES.ACCEPT_ORDER;
  payload: { orderId: number };
  createdAt: number;
}

export interface LocationUpdateAction {
  id: string;
  type: typeof OFFLINE_ACTION_TYPES.LOCATION_UPDATE;
  payload: AppLocation;
  createdAt: number;
}

export type OfflineAction = AcceptOrderAction | LocationUpdateAction;

const safeParseQueue = (raw: string | null): OfflineAction[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as OfflineAction[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const getOfflineQueue = async (): Promise<OfflineAction[]> => {
  const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
  return safeParseQueue(raw);
};

const saveOfflineQueue = async (queue: OfflineAction[]): Promise<void> => {
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
};

export const enqueueOfflineAction = async (
  action: Omit<OfflineAction, 'id' | 'createdAt'>
): Promise<OfflineAction[]> => {
  const queue = await getOfflineQueue();
  const nextAction: OfflineAction = {
    ...action,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  } as OfflineAction;

  const nextQueue = [...queue, nextAction];
  await saveOfflineQueue(nextQueue);
  return nextQueue;
};

export const removeOfflineAction = async (actionId: string): Promise<void> => {
  const queue = await getOfflineQueue();
  const nextQueue = queue.filter((item) => item.id !== actionId);
  await saveOfflineQueue(nextQueue);
};
