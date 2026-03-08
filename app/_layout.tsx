import { useEffect } from 'react';
import { Stack, useRouter, useSegments, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { queryClient } from '@/lib/query-client';
import { useOfflineQueueProcessor } from '@/hooks/use-offline-queue-processor';
import {
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
} from '@/services/background-location';

// ─── Auth guard — redirects based on login state ──────────────────────────────
function AuthGuard() {
  const { user, isLoading } = useAuth();
  const segments  = useSegments();
  const router    = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = (segments[0] as string) === '(auth)';

    if (!user && !inAuthGroup) {
      // Not logged in → go to login
      router.replace('/(auth)/login' as Href);
    } else if (user && inAuthGroup) {
      // Logged in → go to tabs
      router.replace('/(tabs)' as Href);
    }
  }, [user, isLoading, segments, router]);

  return null;
}

function RuntimeEffects() {
  const { user, isDeliveryMode } = useAuth();
  useOfflineQueueProcessor();

  useEffect(() => {
    const hasDeliveryRole = user?.roles?.includes('ROLE_DELIVERY') ?? false;

    if (hasDeliveryRole && isDeliveryMode) {
      startBackgroundLocationTracking().catch(() => {});
      return;
    }

    stopBackgroundLocationTracking().catch(() => {});
  }, [isDeliveryMode, user?.roles]);

  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RuntimeEffects />
          <AuthGuard />
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)"           options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)"           options={{ headerShown: false }} />
            <Stack.Screen name="delivery-auth"    options={{ headerShown: false }} />
            <Stack.Screen name="checkout"         options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="order-confirm"    options={{ headerShown: false }} />
          </Stack>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
