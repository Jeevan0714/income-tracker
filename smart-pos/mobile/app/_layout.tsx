import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { listenToVendorType } from '../src/services/firebase';

const LightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#F7F8FC',
    card: '#FFFFFF',
    text: '#1A1A2E',
    border: '#EBEBF0',
    primary: '#6C63FF',
  },
};

function RootLayoutNav() {
  const { user, pairedCameraId, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [vendorType, setVendorTypeState] = useState<string | null>(null);
  const [vendorLoading, setVendorLoading] = useState(true);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      setVendorTypeState(null);
      setVendorLoading(false);
      return;
    }

    setVendorLoading(true);
    const unsub = listenToVendorType(pairedCameraId || '', (type) => {
      setVendorTypeState(type || null);
      setVendorLoading(false);
    });
    return () => unsub();
  }, [user, loading, pairedCameraId]);

  useEffect(() => {
    if (loading || vendorLoading) return;

    const isOnboarding = segments[0] === 'onboarding';
    const isLogin = segments[0] === 'login';

    if (!user) {
      if (!isLogin) router.replace('/login');
    } else if (!vendorType || vendorType === '') {
      if (!isOnboarding) router.replace('/onboarding');
    } else {
      // If we have a vendorType, only redirect to '/' if we are on login
      // If we are on onboarding, we let the user stay there to switch roles
      if (isLogin) router.replace('/');
    }
  }, [user, loading, vendorType, vendorLoading, segments]);

  return (
    <ThemeProvider value={LightTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
