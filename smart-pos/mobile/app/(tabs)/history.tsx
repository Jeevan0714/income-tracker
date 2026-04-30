import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { listenToOrders } from '../../src/services/firebase';
import { useDrawer } from '../../src/components/GlobalDrawer';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useAuth } from '../../src/context/AuthContext';

export default function HistoryScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const { openDrawer } = useDrawer();
  const { pairedCameraId } = useAuth();
  const router = useRouter();

  useEffect(() => { 
    if (!pairedCameraId) {
      setOrders([]);
      return;
    }
    const unsub = listenToOrders(pairedCameraId, setOrders); 
    return () => unsub && unsub();
  }, [pairedCameraId]);

  if (!pairedCameraId) {
    return (
      <SafeAreaView style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar style="dark" />
        <View style={s.topBarAbsolute}>
          <TouchableOpacity style={s.hamburger} onPress={openDrawer}>
            <Ionicons name="menu-outline" size={30} color="#1A1A2E" />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={() => router.push('/pair')}>
            <Ionicons name="camera-outline" size={28} color="#1A1A2E" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => router.push('/pair')} style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 60, marginBottom: 20 }}>📷</Text>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#1A1A2E', marginBottom: 10 }}>No Camera Paired</Text>
          <Text style={{ fontSize: 16, color: '#8A8FAF', textAlign: 'center', marginHorizontal: 40, marginBottom: 30 }}>
            Tap the camera or open the menu to connect.
          </Text>
          <View style={[s.btn, { paddingHorizontal: 40 }]}>
            <Text style={s.btnText}>Pair Camera Now</Text>
          </View>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const todayOrders = orders.filter(o => new Date(o.timestamp).toDateString() === new Date().toDateString());
  const todayRevenue = todayOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);

  const fmt = (ts: number) => new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const fmtDate = (ts: number) => new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  const ORDER_COLORS = ['#FF6B6B', '#06D6A0', '#FFB703', '#6C63FF', '#FB8500'];

  return (
    <SafeAreaView style={s.container}>
      <StatusBar style="dark" />
      
      {/* Top Bar */}
      <View style={s.topBar}>
        <TouchableOpacity style={s.hamburger} onPress={openDrawer}>
          <Ionicons name="menu-outline" size={30} color="#6C63FF" />
        </TouchableOpacity>
        <Text style={s.topBarTitle}>Order History</Text>
        <TouchableOpacity onPress={() => router.push('/pair')} style={{ padding: 6 }}>
          <Ionicons name="camera-outline" size={26} color="#6C63FF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <Text style={s.subtitle}>Your complete sales record</Text>

        {/* Today Summary */}
        <View style={s.summaryRow}>
          <View style={[s.summaryCard, { backgroundColor: '#FFF0F0' }]}>
            <Text style={s.summaryEmoji}>💰</Text>
            <Text style={[s.summaryValue, { color: '#FF6B6B' }]}>₹{todayRevenue}</Text>
            <Text style={s.summaryLabel}>Today's Revenue</Text>
          </View>
          <View style={[s.summaryCard, { backgroundColor: '#F0EEFF' }]}>
            <Text style={s.summaryEmoji}>📦</Text>
            <Text style={[s.summaryValue, { color: '#6C63FF' }]}>{todayOrders.length}</Text>
            <Text style={s.summaryLabel}>Orders Today</Text>
          </View>
          <View style={[s.summaryCard, { backgroundColor: '#E8FFF9' }]}>
            <Text style={s.summaryEmoji}>🛍️</Text>
            <Text style={[s.summaryValue, { color: '#06D6A0' }]}>{orders.length}</Text>
            <Text style={s.summaryLabel}>All Orders</Text>
          </View>
        </View>

        {orders.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>🧾</Text>
            <Text style={s.emptyTitle}>No orders yet</Text>
            <Text style={s.emptyHint}>Complete your first sale and it will appear here!</Text>
          </View>
        ) : (
          <>
            <Text style={s.sectionTitle}>Recent Orders</Text>
            {orders.map((order, idx) => {
              const color = ORDER_COLORS[idx % ORDER_COLORS.length];
              const isOpen = expanded === order.id;
              return (
                <TouchableOpacity
                  key={order.id}
                  style={[s.orderCard, isOpen && { borderColor: color + '60', borderWidth: 1.5 }]}
                  onPress={() => setExpanded(isOpen ? null : order.id)}
                  activeOpacity={0.75}
                >
                  <View style={s.orderHeader}>
                    <View style={[s.orderBadge, { backgroundColor: color + '18' }]}>
                      <Text style={[s.orderBadgeText, { color }]}>#{orders.length - idx}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={s.orderTotal}>₹{order.total}</Text>
                      <Text style={s.orderMeta}>
                        {order.items?.length || 0} items  ·  {fmtDate(order.timestamp)}  ·  {fmt(order.timestamp)}
                      </Text>
                    </View>
                    <View style={[s.arrowBox, { backgroundColor: color + '15' }]}>
                      <Text style={[s.arrow, { color }]}>{isOpen ? '▲' : '▼'}</Text>
                    </View>
                  </View>

                  {isOpen && order.items && (
                    <View style={[s.itemList, { borderTopColor: color + '30' }]}>
                      {order.items.map((item: any, i: number) => (
                        <View key={i} style={s.itemRow}>
                          <Text style={item.type === 'vision' ? '👁️' : '📦'}>{/* Icon handled by Text emoji or symbol */}</Text>
                          <Text style={s.itemIcon}>{item.type === 'vision' ? '👁️' : '📦'}</Text>
                          <Text style={s.itemName}>{item.name}</Text>
                          <Text style={[s.itemPrice, { color }]}>₹{item.price}</Text>
                        </View>
                      ))}
                      <View style={[s.totalRow, { backgroundColor: color + '10' }]}>
                        <Text style={[s.totalLabel, { color }]}>Total</Text>
                        <Text style={[s.totalVal, { color }]}>₹{order.total}</Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FC' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#F7F8FC',
  },
  hamburger: { padding: 6, justifyContent: 'center' },
  topBarTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A2E', letterSpacing: -0.5 },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '800', color: '#1A1A2E', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#8A8FAF', marginTop: 4, marginBottom: 24, paddingLeft: 6 },

  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  summaryCard: { flex: 1, borderRadius: 18, padding: 14, alignItems: 'center' },
  summaryEmoji: { fontSize: 24, marginBottom: 6 },
  summaryValue: { fontSize: 20, fontWeight: '900' },
  summaryLabel: { color: '#8A8FAF', fontSize: 10, fontWeight: '600', marginTop: 4, textAlign: 'center' },

  empty: { alignItems: 'center', marginTop: 60 },
  emptyEmoji: { fontSize: 52, marginBottom: 14 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  emptyHint: { color: '#8A8FAF', fontSize: 14, textAlign: 'center', lineHeight: 20 },

  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A2E', marginBottom: 14 },

  orderCard: {
    backgroundColor: '#FFF', borderRadius: 18, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  orderHeader: { flexDirection: 'row', alignItems: 'center' },
  orderBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, minWidth: 44, alignItems: 'center' },
  orderBadgeText: { fontSize: 14, fontWeight: '800' },
  orderTotal: { fontSize: 18, fontWeight: '800', color: '#1A1A2E' },
  orderMeta: { fontSize: 11, color: '#8A8FAF', marginTop: 2 },
  arrowBox: { borderRadius: 10, padding: 8 },
  arrow: { fontSize: 11, fontWeight: '700' },

  itemList: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, gap: 10 },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemIcon: { fontSize: 14, marginRight: 10 },
  itemName: { flex: 1, color: '#444', fontSize: 14 },
  itemPrice: { fontSize: 14, fontWeight: '700' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderRadius: 10, padding: 10, marginTop: 6 },
  totalLabel: { fontSize: 14, fontWeight: '700' },
  totalVal: { fontSize: 14, fontWeight: '900' },
  topBarAbsolute: { position: 'absolute', top: 50, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
  btn: { backgroundColor: '#6C63FF', paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
