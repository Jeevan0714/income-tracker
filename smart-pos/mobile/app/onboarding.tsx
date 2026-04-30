import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { setVendorType } from '../src/services/firebase';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';

const VENDORS = [
  { id: 'food_truck', icon: '🌭', name: 'Food Truck', color: '#FF6B6B', bg: '#FFF0F0',
    items: ['Hot Dog', 'Sandwich', 'Pizza', 'Cup', 'Bottle', 'Bowl'] },
  { id: 'produce_stand', icon: '🍎', name: 'Produce Stand', color: '#06D6A0', bg: '#E8FFF9',
    items: ['Apple', 'Orange', 'Banana', 'Broccoli', 'Carrot'] },
  { id: 'bakery', icon: '🍰', name: 'Bakery', color: '#FFB703', bg: '#FFFBEB',
    items: ['Donut', 'Cake', 'Sandwich', 'Cup', 'Bottle'] },
  { id: 'kirana_store', icon: '🏪', name: 'Kirana Store', color: '#6C63FF', bg: '#F0EEFF',
    items: ['Bottle', 'Cup', 'Banana', 'Apple', 'Scissors', 'Toothbrush', 'Book'] },
  { id: 'cafeteria', icon: '☕', name: 'Cafeteria', color: '#FB8500', bg: '#FFF4E6',
    items: ['Cup', 'Wine Glass', 'Sandwich', 'Pizza', 'Donut', 'Cake', 'Bowl'] },
];

export default function OnboardingScreen() {
  const { pairedCameraId } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleContinue = async () => {
    if (!selected || !pairedCameraId) return;
    setLoading(true);
    await setVendorType(pairedCameraId, selected);
    router.replace('/');
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>What type of{'\n'}vendor are you?</Text>
        <Text style={s.subtitle}>The AI camera will auto-detect only items relevant to your store.</Text>

        {VENDORS.map((v) => {
          const active = selected === v.id;
          return (
            <TouchableOpacity
              key={v.id}
              style={[s.card, active && { borderColor: v.color, borderWidth: 2, backgroundColor: v.bg }]}
              onPress={() => setSelected(v.id)}
              activeOpacity={0.75}
            >
              <View style={s.cardTop}>
                <View style={[s.iconBox, { backgroundColor: active ? v.color + '20' : '#F0F0F5' }]}>
                  <Text style={s.icon}>{v.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.cardName, active && { color: v.color }]}>{v.name}</Text>
                  <Text style={s.cardCount}>{v.items.length} AI-detectable items</Text>
                </View>
                {active && (
                  <View style={[s.check, { backgroundColor: v.color }]}>
                    <Text style={s.checkText}>✓</Text>
                  </View>
                )}
              </View>
              <View style={s.chips}>
                {v.items.map((item) => (
                  <View key={item} style={[s.chip, active && { backgroundColor: v.color + '18' }]}>
                    <Text style={[s.chipText, active && { color: v.color }]}>{item}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.btn, !selected && s.btnOff, selected && { backgroundColor: VENDORS.find(v => v.id === selected)?.color }]}
          onPress={handleContinue} disabled={!selected || loading} activeOpacity={0.85}
        >
          {loading ? <ActivityIndicator color="#fff" /> : (
            <Text style={s.btnText}>Continue to Dashboard →</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FC' },
  scroll: { padding: 20, paddingBottom: 110 },
  title: { fontSize: 28, fontWeight: '800', color: '#1A1A2E', letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#8A8FAF', lineHeight: 20, marginBottom: 28 },
  card: { backgroundColor: '#FFF', borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1.5, borderColor: '#EBEBF0', shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 3 }, shadowRadius: 10, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconBox: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  icon: { fontSize: 24 },
  cardName: { fontSize: 17, fontWeight: '700', color: '#1A1A2E' },
  cardCount: { fontSize: 12, color: '#8A8FAF', marginTop: 2 },
  check: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  checkText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: '#F0F0F5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  chipText: { color: '#8A8FAF', fontSize: 11, fontWeight: '600' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 36, backgroundColor: '#F7F8FC', borderTopWidth: 1, borderTopColor: '#EBEBF0' },
  btn: { backgroundColor: '#6C63FF', paddingVertical: 16, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 8 },
  btnOff: { opacity: 0.3 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
