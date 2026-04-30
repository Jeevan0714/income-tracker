import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Dimensions, TextInput, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { listenToScans, listenToInventory, completeOrder, listenToVendorType } from '../../src/services/firebase';
import { useAuth } from '../../src/context/AuthContext';
import { listenToOrders } from '../../src/services/firebase';
import { ref, onValue, set } from 'firebase/database';
import { db } from '../../src/services/firebase';
import { useDrawer } from '../../src/components/GlobalDrawer';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const VENDOR_CONFIG: Record<string, { emoji: string; name: string; color: string; bg: string; margin: number }> = {
  food_truck:    { emoji: '🌭', name: 'Food Truck',    color: '#FF6B6B', bg: '#FFF0F0', margin: 0.40 },
  produce_stand: { emoji: '🍎', name: 'Produce Stand', color: '#06D6A0', bg: '#E8FFF9', margin: 0.25 },
  bakery:        { emoji: '🍰', name: 'Bakery',        color: '#FFB703', bg: '#FFFBEB', margin: 0.35 },
  kirana_store:  { emoji: '🏪', name: 'Kirana Store',  color: '#6C63FF', bg: '#F0EEFF', margin: 0.15 },
  cafeteria:     { emoji: '☕', name: 'Cafeteria',     color: '#FB8500', bg: '#FFF4E6', margin: 0.30 },
};

export default function DashboardScreen() {
  const [scans, setScans]           = useState<any[]>([]);
  const [totalSales, setTotalSales] = useState(0);
  const [inventory, setInventory]   = useState<any>({});
  const [vendorType, setVendorType] = useState('food_truck');
  const [isProcessing, setIsProcessing] = useState(false);
  const [receipt, setReceipt]       = useState<any>(null);
  const [orderCount, setOrderCount] = useState(0);
  const [cameraOnline, setCameraOnline] = useState(false);
  
  const [dailyGoal, setDailyGoal] = useState(1000);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [tempGoal, setTempGoal] = useState('1000');

  const { user, pairedCameraId } = useAuth();
  const { openDrawer } = useDrawer();
  const router = useRouter();

  const vCfg = VENDOR_CONFIG[vendorType] || VENDOR_CONFIG.food_truck;

  useEffect(() => {
    if (!pairedCameraId) {
      setScans([]); setTotalSales(0); setOrderCount(0); setCameraOnline(false);
      return;
    }
    const unsubScans = listenToScans(pairedCameraId, (data) => setScans(data));
    const unsubInv = listenToInventory(pairedCameraId, (data) => setInventory(data));
    const unsubVendor = listenToVendorType(pairedCameraId, (t) => setVendorType(t || 'food_truck'));
    const unsubOrders = listenToOrders(pairedCameraId, (orders) => {
      setOrderCount(orders.length);
      const today = new Date().toDateString();
      const revenue = orders
        .filter(o => new Date(o.timestamp).toDateString() === today)
        .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      setTotalSales(revenue);
    });
    const goalRef = ref(db, `cameras/${pairedCameraId}/settings/daily_goal`);
    const unsubGoal = onValue(goalRef, (snap) => {
      const val = snap.val();
      if (val) { setDailyGoal(val); setTempGoal(val.toString()); }
    });
    const hbRef = ref(db, `cameras/${pairedCameraId}/heartbeat`);
    const unsubHb = onValue(hbRef, (snap) => {
      const ts = snap.val();
      setCameraOnline(!!ts && Date.now() - ts < 12000);
    });
    return () => { unsubScans(); unsubInv(); unsubVendor(); unsubOrders(); unsubGoal(); unsubHb(); };
  }, [pairedCameraId]);

  const handleSaveGoal = async () => {
    const val = parseInt(tempGoal);
    if (isNaN(val) || val <= 0) { Alert.alert('Invalid Goal', 'Please enter a valid amount.'); return; }
    if (pairedCameraId) {
      await set(ref(db, `cameras/${pairedCameraId}/settings/daily_goal`), val);
      setShowGoalModal(false);
    }
  };

  const estimatedProfit = totalSales * vCfg.margin;
  const progress = Math.min(totalSales / dailyGoal, 1);
  const progressColor = progress >= 0.8 ? '#06D6A0' : '#FFB703';

  if (!pairedCameraId) {
    return (
      <View style={[s.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar style="dark" />
        <View style={s.topBarAbsolute}>
          <TouchableOpacity style={s.hamburger} onPress={openDrawer}><Ionicons name="menu-outline" size={30} color="#1A1A2E" /></TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={() => router.push('/pair')}><Ionicons name="camera-outline" size={28} color="#1A1A2E" /></TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => router.push('/pair')} style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 60, marginBottom: 20 }}>📷</Text>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#1A1A2E' }}>No Camera Paired</Text>
          <Text style={{ fontSize: 16, color: '#8A8FAF', textAlign: 'center', marginHorizontal: 40, marginTop: 10 }}>Connect vision node to track performance.</Text>
          <View style={[s.btnLarge, { backgroundColor: '#6C63FF', marginTop: 30 }]}><Text style={s.btnLargeText}>Pair Camera Now</Text></View>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar style="dark" />
      <SafeAreaView style={s.container}>
        <View style={s.topBar}>
          <TouchableOpacity style={s.hamburger} onPress={openDrawer}><Ionicons name="menu-outline" size={30} color={vCfg.color} /></TouchableOpacity>
          <Text style={s.topBarTitle}>Dashboard</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => router.push('/pair')}><Ionicons name="camera-outline" size={26} color={vCfg.color} /></TouchableOpacity>
            <View style={[s.livePill, { backgroundColor: cameraOnline ? '#E8FFF9' : '#FFF0F0' }]}>
              <View style={[s.liveDot, { backgroundColor: cameraOnline ? '#06D6A0' : '#FF6B6B' }]} />
              <Text style={[s.liveText, { color: cameraOnline ? '#06D6A0' : '#FF6B6B' }]}>{cameraOnline ? 'LIVE' : 'OFFLINE'}</Text>
            </View>
          </View>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={[s.perfCard, { shadowColor: vCfg.color }]}>
            <View style={s.perfHeader}>
              <View><Text style={s.perfLabel}>PERFORMANCE HUB</Text><Text style={s.perfVendor}>{vCfg.emoji} {vCfg.name}</Text></View>
              <TouchableOpacity style={s.perfTargetBtn} onPress={() => setShowGoalModal(true)}><Ionicons name="settings-outline" size={16} color="#FFF" /></TouchableOpacity>
            </View>
            <View style={s.perfMain}>
               <View style={s.perfMetric}><Text style={s.perfMetricLabel}>Sales</Text><Text style={s.perfMetricVal}>₹{totalSales}</Text></View>
               <View style={s.perfDivider} />
               <View style={s.perfMetric}><Text style={s.perfMetricLabel}>Profit ({Math.round(vCfg.margin*100)}%)</Text><Text style={[s.perfMetricVal, { color: '#06D6A0' }]}>₹{Math.round(estimatedProfit)}</Text></View>
            </View>
            <View style={s.perfGoalWrap}>
              <View style={s.goalHeader}><Text style={s.goalText}>Daily Target Progress</Text><Text style={[s.goalPercent, { color: progressColor }]}>{Math.round(progress * 100)}%</Text></View>
              <View style={s.progressBarBg}><View style={[s.progressBarFill, { width: `${progress * 100}%`, backgroundColor: progressColor }]} /></View>
              <Text style={s.goalRemaining}>{totalSales >= dailyGoal ? "🎉 Target Achieved!" : `₹${dailyGoal - totalSales} left to goal`}</Text>
            </View>
          </View>

          <View style={s.statsRow}>
            <View style={s.statCard}><Ionicons name="cart-outline" size={20} color="#6C63FF" /><Text style={[s.statVal, { color: '#6C63FF' }]}>{orderCount}</Text><Text style={s.statLabel}>Orders</Text></View>
            <View style={s.statCard}><Ionicons name="cube-outline" size={20} color={vCfg.color} /><Text style={[s.statVal, { color: vCfg.color }]}>{scans.length}</Text><Text style={s.statLabel}>Items</Text></View>
            <View style={s.statCard}><Ionicons name="pulse-outline" size={20} color="#FF6B6B" /><Text style={[s.statVal, { color: '#FF6B6B' }]}>{cameraOnline ? 'On' : 'Off'}</Text><Text style={s.statLabel}>Status</Text></View>
          </View>

          {scans.length === 0 ? (
            <View style={[s.emptyCard, { backgroundColor: vCfg.bg }]}><Text style={s.emptyEmoji}>{vCfg.emoji}</Text><Text style={[s.emptyTitle, { color: vCfg.color }]}>Vision Ready!</Text></View>
          ) : (
            <View>{scans.map((scan) => (
                <View key={scan.id} style={s.scanRow}>
                  <View style={[s.scanIconBox, { backgroundColor: vCfg.bg }]}><Text style={s.scanIcon}>{scan.type === 'vision' ? '👁️' : '📦'}</Text></View>
                  <View style={{ flex: 1 }}><Text style={s.scanName}>{scan.name}</Text><Text style={s.scanMeta}>{scan.time}</Text></View>
                  <View style={[s.pricePill, { backgroundColor: vCfg.bg }]}><Text style={[s.priceText, { color: vCfg.color }]}>₹{scan.price}</Text></View>
                </View>
            ))}</View>
          )}
        </ScrollView>

        {scans.length > 0 && (
          <TouchableOpacity style={[s.fab, { backgroundColor: vCfg.color }]} activeOpacity={0.85} onPress={async () => {
              if (!pairedCameraId) return;
              setIsProcessing(true);
              const subtotal = scans.reduce((s, i) => s + (Number(i.price) || 0), 0);
              await completeOrder(pairedCameraId, scans, subtotal);
              setIsProcessing(false); setReceipt({ items: scans, total: subtotal, num: orderCount + 1 });
            }}>
            <Text style={s.fabText}>{isProcessing ? '⏳ Processing...' : `✅  Complete Order  ·  ₹${scans.reduce((s, i) => s + (Number(i.price) || 0), 0)}`}</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>

      <Modal visible={showGoalModal} transparent animationType="fade">
        <View style={s.modalOverlay}><View style={s.goalModal}><Text style={s.goalModalTitle}>Daily Sales Target</Text><View style={s.goalInputWrap}><Text style={s.goalCurrency}>₹</Text><TextInput style={s.goalInput} value={tempGoal} onChangeText={setTempGoal} keyboardType="numeric" autoFocus /></View>
            <View style={s.modalBtns}><TouchableOpacity style={s.cancelBtn} onPress={() => setShowGoalModal(false)}><Text style={s.cancelBtnText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={[s.saveBtn, { backgroundColor: vCfg.color }]} onPress={handleSaveGoal}><Text style={s.saveBtnText}>Set Target</Text></TouchableOpacity></View>
        </View></View>
      </Modal>

      <Modal visible={!!receipt} transparent animationType="slide">
        <View style={s.modalOverlay}><View style={s.modalCard}><Text style={s.receiptEmoji}>🎉</Text><Text style={s.receiptTitle}>Order Complete!</Text>
            {receipt?.items?.map((item, i) => (<View key={i} style={s.receiptRow}><Text style={s.receiptItem}>{item.name}</Text><Text style={[s.receiptPrice, { color: vCfg.color }]}>₹{item.price}</Text></View>))}
            <View style={s.receiptDivider} /><View style={s.receiptRow}><Text style={s.receiptTotalLabel}>Total Paid</Text><Text style={[s.receiptTotalVal, { color: vCfg.color }]}>₹{receipt?.total}</Text></View>
            <TouchableOpacity style={[s.newOrderBtn, { backgroundColor: vCfg.color }]} onPress={() => setReceipt(null)}><Text style={s.newOrderBtnText}>Start New Order →</Text></TouchableOpacity>
        </View></View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F8FC' },
  container: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#F7F8FC' },
  topBarTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A2E' },
  livePill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  liveDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  liveText: { fontSize: 11, fontWeight: '700' },
  scroll: { padding: 16, paddingBottom: 110 },
  perfCard: { backgroundColor: '#1A1A2E', borderRadius: 28, padding: 24, marginBottom: 20, elevation: 12 },
  perfHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  perfLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  perfVendor: { color: '#FFF', fontSize: 18, fontWeight: '800', marginTop: 4 },
  perfTargetBtn: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 8, borderRadius: 12 },
  perfMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  perfMetric: { flex: 1 },
  perfMetricLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600', marginBottom: 6 },
  perfMetricVal: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  perfDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 20 },
  perfGoalWrap: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 16 },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  goalText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  goalPercent: { fontSize: 16, fontWeight: '900' },
  progressBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  goalRemaining: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '600', marginTop: 10, textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 20, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#EBEBF0' },
  statVal: { fontSize: 18, fontWeight: '800', marginTop: 8 },
  statLabel: { color: '#8A8FAF', fontSize: 10, fontWeight: '600', marginTop: 2 },
  scanRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 14, borderRadius: 18, marginBottom: 10, elevation: 2 },
  scanIconBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  scanName: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  scanMeta: { fontSize: 11, color: '#8A8FAF' },
  pricePill: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  priceText: { fontSize: 14, fontWeight: '800' },
  fab: { position: 'absolute', bottom: 24, left: 16, right: 16, paddingVertical: 16, borderRadius: 20, alignItems: 'center', elevation: 8 },
  fabText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: '#00000066', justifyContent: 'center', alignItems: 'center', padding: 24 },
  goalModal: { backgroundColor: '#FFF', width: '100%', borderRadius: 32, padding: 28 },
  goalModalTitle: { fontSize: 24, fontWeight: '800', color: '#1A1A2E', textAlign: 'center', marginBottom: 20 },
  goalInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F8FC', borderRadius: 20, paddingHorizontal: 24, paddingVertical: 18 },
  goalCurrency: { fontSize: 28, fontWeight: '700', color: '#1A1A2E', marginRight: 10 },
  goalInput: { flex: 1, fontSize: 28, fontWeight: '800' },
  modalBtns: { flexDirection: 'row', gap: 16, marginTop: 32 },
  cancelBtn: { flex: 1, paddingVertical: 16, alignItems: 'center' },
  cancelBtnText: { color: '#8A8FAF', fontSize: 16, fontWeight: '600' },
  saveBtn: { flex: 2, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  modalCard: { backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 32, position: 'absolute', bottom: 0, width: Dimensions.get('window').width },
  receiptEmoji: { fontSize: 44, textAlign: 'center', marginBottom: 12 },
  receiptTitle: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 20 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  receiptDivider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 16 },
  receiptTotalLabel: { fontSize: 18, fontWeight: '800' },
  receiptTotalVal: { fontSize: 18, fontWeight: '900' },
  newOrderBtn: { paddingVertical: 18, borderRadius: 18, alignItems: 'center', marginTop: 24 },
  newOrderBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  topBarAbsolute: { position: 'absolute', top: 50, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
  btnLarge: { paddingVertical: 16, paddingHorizontal: 40, borderRadius: 18, alignItems: 'center' },
  btnLargeText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});
