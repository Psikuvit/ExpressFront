import { useCallback, useEffect, useRef } from 'react';
import * as Network from 'expo-network';
import { deliveryAuthAPI, isNetworkError, locationAPI } from '@/api/client';
import {
  OFFLINE_ACTION_TYPES,
  getOfflineQueue,
  removeOfflineAction,
  type OfflineAction,
} from '@/utils/offline-queue';

const shouldDropAction = (error: unknown): boolean => !isNetworkError(error);

export const useOfflineQueueProcessor = () => {
  const isProcessingRef = useRef(false);

  const processAction = useCallback(async (action: OfflineAction): Promise<boolean> => {
    try {
      if (action.type === OFFLINE_ACTION_TYPES.ACCEPT_ORDER) {
        await deliveryAuthAPI.acceptOrder(action.payload.orderId);
      } else {
        await locationAPI.update(action.payload);
      }

      await removeOfflineAction(action.id);
      return true;
    } catch (error) {
      if (shouldDropAction(error)) {
        await removeOfflineAction(action.id);
        return true;
      }
      return false;
    }
  }, []);

  const flushQueue = useCallback(async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      const state = await Network.getNetworkStateAsync();
      if (!state.isConnected || !state.isInternetReachable) return;

      const queue = await getOfflineQueue();
      for (const action of queue) {
        const canContinue = await processAction(action);
        if (!canContinue) break;
      }
    } finally {
      isProcessingRef.current = false;
    }
  }, [processAction]);

  useEffect(() => {
    flushQueue();

    const subscription = Network.addNetworkStateListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        flushQueue();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [flushQueue]);
};
