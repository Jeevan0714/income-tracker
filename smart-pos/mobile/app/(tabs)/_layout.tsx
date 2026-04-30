import { Tabs } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { HapticTab } from '@/components/haptic-tab';
import { Ionicons } from '@expo/vector-icons';
import { listenToScans } from '../../src/services/firebase';
import { GlobalDrawer } from '../../src/components/GlobalDrawer';
import { useAuth } from '../../src/context/AuthContext';

function BadgeIcon({ count, color, name }: { count: number; color: string; name: any }) {
  return (
    <View>
      <Ionicons size={24} name={name} color={color} />
      {count > 0 && (
        <View style={{
          position: 'absolute', top: -5, right: -10,
          backgroundColor: '#FF6B6B', borderRadius: 9,
          minWidth: 18, height: 18, justifyContent: 'center',
          alignItems: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#FFF'
        }}>
          <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '900' }}>{count}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabLayout() {
  const { pairedCameraId } = useAuth();
  const [scanCount, setScanCount] = useState(0);

  useEffect(() => {
    if (!pairedCameraId) {
      setScanCount(0);
      return;
    }
    const unsub = listenToScans(pairedCameraId, (d) => setScanCount(d.length));
    return () => unsub();
  }, [pairedCameraId]);

  return (
    <GlobalDrawer>
      <Tabs screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: '#6C63FF',
        tabBarInactiveTintColor: '#B0B0C0',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#EBEBF0',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}>
        <Tabs.Screen name="index" options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <BadgeIcon count={scanCount} color={color} name="grid-outline" />,
        }} />
        <Tabs.Screen name="history" options={{
          title: 'History',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="time-outline" color={color} />,
        }} />
        <Tabs.Screen name="prices" options={{
          title: 'Prices',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="pricetag-outline" color={color} />,
        }} />
        <Tabs.Screen name="settings" options={{ href: null }} />
        <Tabs.Screen name="explore" options={{ href: null }} />
      </Tabs>
    </GlobalDrawer>
  );
}
