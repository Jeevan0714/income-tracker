import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, Pressable
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { listenToVendorType, listenToOrders } from '../services/firebase';
import { useRouter } from 'expo-router';
import { ref, onValue } from 'firebase/database';
import { db } from '../services/firebase';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.78;

type DrawerContextType = {
  openDrawer: () => void;
  closeDrawer: () => void;
};

const DrawerContext = createContext<DrawerContextType>({
  openDrawer: () => {},
  closeDrawer: () => {},
});

export const useDrawer = () => useContext(DrawerContext);

const VENDOR: Record<string, { emoji: string; name: string; color: string; bg: string }> = {
  food_truck:    { emoji: '🌭', name: 'Food Truck',    color: '#FF6B6B', bg: '#FFF0F0' },
  produce_stand: { emoji: '🍎', name: 'Produce Stand', color: '#06D6A0', bg: '#E8FFF9' },
  bakery:        { emoji: '🍰', name: 'Bakery',        color: '#FFB703', bg: '#FFFBEB' },
  kirana_store:  { emoji: '🏪', name: 'Kirana Store',  color: '#6C63FF', bg: '#F0EEFF' },
  cafeteria:     { emoji: '☕', name: 'Cafeteria',     color: '#FB8500', bg: '#FFF4E6' },
};

export function GlobalDrawer({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [vendorType, setVendorTypeState] = useState('food_truck');
  const [orderCount, setOrderCount] = useState(0);
  const [cameraOnline, setCameraOnline] = useState(false);
  
  const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  
  const { user, pairedCameraId, logout } = useAuth();
  const router = useRouter();

  const vCfg = VENDOR[vendorType] || VENDOR.food_truck;

  useEffect(() => {
    if (!pairedCameraId) {
      setCameraOnline(false);
      return;
    }
    const unsubVendor = listenToVendorType(pairedCameraId, (t) => setVendorTypeState(t || 'food_truck'));
    const unsubOrders = listenToOrders(pairedCameraId, (orders) => setOrderCount(orders.length));
    
    const hbRef = ref(db, `cameras/${pairedCameraId}/heartbeat`);
    const unsubHb = onValue(hbRef, (snap) => {
      const ts = snap.val();
      setCameraOnline(!!ts && Date.now() - ts < 12000);
    });
    
    return () => {
      unsubVendor();
      unsubOrders();
      unsubHb();
    };
  }, [pairedCameraId]);

  const openDrawer = () => {
    setDrawerOpen(true);
    Animated.parallel([
      Animated.spring(drawerAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
      Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.spring(drawerAnim, { toValue: -DRAWER_WIDTH, useNativeDriver: true, tension: 65, friction: 11 }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setDrawerOpen(false));
  };

  const switchStore = async () => {
    closeDrawer();
    router.replace('/onboarding');
  };

  const initial = user?.email?.[0]?.toUpperCase() || '?';

  return (
    <DrawerContext.Provider value={{ openDrawer, closeDrawer }}>
      <View style={{ flex: 1 }}>
        {children}

        {/* Drawer Overlay */}
        {drawerOpen && (
          <Animated.View style={[s.overlay, { opacity: overlayAnim }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
          </Animated.View>
        )}

        {/* Drawer Panel */}
        <Animated.View style={[s.drawer, { transform: [{ translateX: drawerAnim }] }]}>
          <View style={[s.drawerHeader, { backgroundColor: vCfg.color }]}>
            <TouchableOpacity style={s.closeBtn} onPress={closeDrawer}>
              <Ionicons name="close-outline" size={28} color="#FFF" />
            </TouchableOpacity>
            
            <View style={s.drawerAvatar}>
              <Text style={[s.drawerAvatarText, { color: vCfg.color }]}>{initial}</Text>
            </View>
            <Text style={s.drawerEmail} numberOfLines={1}>{user?.email}</Text>
            <View style={s.drawerBadge}>
              <Text style={s.drawerBadgeText}>{vCfg.emoji}  {vCfg.name}</Text>
            </View>
          </View>

          <View style={s.drawerStats}>
            <View style={s.drawerStatBox}>
              <Text style={[s.drawerStatVal, { color: vCfg.color }]}>{orderCount}</Text>
              <Text style={s.drawerStatLabel}>Total Orders</Text>
            </View>
          </View>

          <View style={s.drawerMenu}>
            <DrawerItem icon="📊" label="Dashboard" onPress={() => { router.push('/'); closeDrawer(); }} />
            <DrawerItem icon="🧾" label="Order History" onPress={() => { router.push('/history'); closeDrawer(); }} />
            <DrawerItem icon="🏷️" label="Manage Prices" onPress={() => { router.push('/prices'); closeDrawer(); }} />
            <DrawerItem icon="🔄" label="Switch Store Type" onPress={switchStore} color={vCfg.color} />
            <DrawerItem icon="📷" label="Pair Camera" onPress={() => { router.push('/pair'); closeDrawer(); }} color="#06D6A0" />
            <DrawerItem icon="🚪" label="Logout" onPress={() => { logout(); closeDrawer(); }} color="#FF453A" />
          </View>

          <View style={[s.cameraStatus, { backgroundColor: cameraOnline ? '#E8FFF9' : '#FFF0F0' }]}>
            <View style={[s.cameraDot, { backgroundColor: cameraOnline ? '#06D6A0' : '#FF6B6B' }]} />
            <View>
              <Text style={[s.cameraText, { color: cameraOnline ? '#06D6A0' : '#FF6B6B' }]}>
                {cameraOnline ? 'Camera Online' : 'Camera Offline'}
              </Text>
              {pairedCameraId && (
                <Text style={s.cameraIdText}>{pairedCameraId}</Text>
              )}
            </View>
          </View>
        </Animated.View>
      </View>
    </DrawerContext.Provider>
  );
}

function DrawerItem({ icon, label, onPress, color = '#1A1A2E' }: any) {
  return (
    <TouchableOpacity style={s.drawerItem} onPress={onPress}>
      <Text style={s.drawerItemIcon}>{icon}</Text>
      <Text style={[s.drawerItemLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#00000055', zIndex: 100 },
  drawer: {
    position: 'absolute', top: 0, left: 0, bottom: 0,
    width: DRAWER_WIDTH, backgroundColor: '#FFF',
    zIndex: 200, shadowColor: '#000', shadowOpacity: 0.15,
    shadowOffset: { width: 4, height: 0 }, shadowRadius: 20, elevation: 20,
  },
  drawerHeader: { padding: 24, paddingTop: 56, position: 'relative' },
  closeBtn: { position: 'absolute', top: 50, right: 16, padding: 4 },
  drawerAvatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  drawerAvatarText: { fontSize: 22, fontWeight: '800' },
  drawerEmail: { color: '#FFF', fontSize: 14, fontWeight: '500', opacity: 0.9 },
  drawerBadge: { backgroundColor: 'rgba(255,255,255,0.25)', alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
  drawerBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  drawerStats: { flexDirection: 'row', padding: 16 },
  drawerStatBox: { flex: 1, backgroundColor: '#F7F8FC', borderRadius: 12, padding: 14, alignItems: 'center' },
  drawerStatVal: { fontSize: 22, fontWeight: '800' },
  drawerStatLabel: { color: '#8A8FAF', fontSize: 11, marginTop: 2 },
  drawerMenu: { paddingHorizontal: 12, flex: 1 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 4 },
  drawerItemIcon: { fontSize: 20, marginRight: 14 },
  drawerItemLabel: { fontSize: 15, fontWeight: '600' },
  cameraStatus: { flexDirection: 'row', alignItems: 'center', margin: 16, padding: 12, borderRadius: 12 },
  cameraDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  cameraText: { fontSize: 13, fontWeight: '600' },
  cameraIdText: { fontSize: 10, color: '#8A8FAF', fontWeight: '500', marginTop: 1 },
});
