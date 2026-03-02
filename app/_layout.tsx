import { useEffect } from 'react';
import { Stack, useRouter, useSegments, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/context/AuthContext';

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

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
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
    </SafeAreaProvider>
  );
}
