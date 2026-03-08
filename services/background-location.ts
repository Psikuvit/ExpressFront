import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { isNetworkError, locationAPI } from '@/api/client';
import {
  enqueueOfflineAction,
  OFFLINE_ACTION_TYPES,
} from '@/utils/offline-queue';

export const DELIVERY_LOCATION_TASK = 'delivery-location-background-task';

interface BackgroundLocationTaskData {
  locations?: Location.LocationObject[];
}

if (!TaskManager.isTaskDefined(DELIVERY_LOCATION_TASK)) {
  TaskManager.defineTask(DELIVERY_LOCATION_TASK, async ({ data, error }) => {
    if (error) return;

    const locationData = data as BackgroundLocationTaskData | undefined;
    const latest = locationData?.locations?.[locationData.locations.length - 1];
    if (!latest) return;

    const payload = {
      latitude: latest.coords.latitude,
      longitude: latest.coords.longitude,
      address: '',
    };

    try {
      await locationAPI.update(payload);
    } catch (taskError) {
      if (isNetworkError(taskError)) {
        await enqueueOfflineAction({
          type: OFFLINE_ACTION_TYPES.LOCATION_UPDATE,
          payload,
        });
      }
    }
  });
}

export const startBackgroundLocationTracking = async (): Promise<void> => {
  const foregroundPermission = await Location.requestForegroundPermissionsAsync();
  if (foregroundPermission.status !== 'granted') {
    throw new Error('Location permission is required for delivery tracking.');
  }

  const backgroundPermission = await Location.requestBackgroundPermissionsAsync();
  if (backgroundPermission.status !== 'granted') {
    throw new Error('Background location permission is required for delivery tracking.');
  }

  const started = await Location.hasStartedLocationUpdatesAsync(DELIVERY_LOCATION_TASK);
  if (started) return;

  await Location.startLocationUpdatesAsync(DELIVERY_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 15_000,
    distanceInterval: 30,
    pausesUpdatesAutomatically: false,
    foregroundService: {
      notificationTitle: 'Express delivery tracking active',
      notificationBody: 'Your location is being shared while in delivery mode.',
    },
    showsBackgroundLocationIndicator: true,
  });
};

export const stopBackgroundLocationTracking = async (): Promise<void> => {
  const started = await Location.hasStartedLocationUpdatesAsync(DELIVERY_LOCATION_TASK);
  if (!started) return;
  await Location.stopLocationUpdatesAsync(DELIVERY_LOCATION_TASK);
};
