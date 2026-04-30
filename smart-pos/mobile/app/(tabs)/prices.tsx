import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../src/context/AuthContext';
import { listenToVendorType } from '../../src/services/firebase';
import { listenToCustomPrices, updateItemPrice } from '../../src/services/prices';
import { Ionicons } from '@expo/vector-icons';

const VENDORS: Record<string, { name: string; items: string[]; color: string; bg: string }> = {
  food_truck: {
    name: 'Food Truck',
    items: ['sandwich', 'hot dog', 'pizza', 'cup', 'bottle', 'bowl', 'fork', 'knife', 'spoon'],
    color: '#FF6B6B', bg: '#FFF0F0'
  },
  produce_stand: {
    name: 'Produce Stand',
    items: ['apple', 'orange', 'banana', 'broccoli', 'carrot', 'bottle', 'bowl', 'potted plant'],
    color: '#06D6A0', bg: '#E8FFF9'
  },
  bakery: {
    name: 'Bakery',
    items: ['donut', 'cake', 'sandwich', 'cup', 'bottle', 'bowl', 'fork', 'knife', 'spoon'],
    color: '#FFB703', bg: '#FFFBEB'
  },
  kirana_store: {
    name: 'Kirana Store',
    items: ['bottle', 'cup', 'bowl', 'banana', 'apple', 'orange', 'carrot', 'broccoli', 'spoon', 'fork', 'knife', 'scissors', 'toothbrush', 'book', 'vase'],
    color: '#6C63FF', bg: '#F0EEFF'
  },
  cafeteria: {
    name: 'Cafeteria',
    items: ['cup', 'bottle', 'wine glass', 'bowl', 'sandwich', 'pizza', 'donut', 'cake', 'hot dog', 'fork', 'knife', 'spoon', 'banana', 'apple', 'orange'],
    color: '#FB8500', bg: '#FFF4E6'
  }
};

export default function PricesScreen() {
  const { pairedCameraId } = useAuth();
  const [vendorType, setVendorType] = useState('food_truck');
  const [customPrices, setCustomPrices] = useState<Record<string, number>>({});
  const [editingPrices, setEditingPrices] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!pairedCameraId) return;

    const unsubVendor = listenToVendorType(pairedCameraId, (type) => {
      setVendorType(type || 'food_truck');
    });

    const unsubPrices = listenToCustomPrices(pairedCameraId, (prices) => {
      setCustomPrices(prices);
      // Initialize editing state with current values
      const initialEditing: Record<string, string> = {};
      Object.keys(prices).forEach(key => {
        initialEditing[key] = prices[key].toString();
      });
      setEditingPrices(prev => ({ ...initialEditing, ...prev }));
    });

    return () => {
      unsubVendor();
      unsubPrices();
    };
  }, [pairedCameraId]);

  const handleSave = async (itemName: string) => {
    if (!pairedCameraId) return;
    const price = parseFloat(editingPrices[itemName]);
    if (isNaN(price) || price < 0) {
      Alert.alert('Invalid Price', 'Please enter a valid number.');
      return;
    }

    setSaving(itemName);
    try {
      await updateItemPrice(pairedCameraId, itemName, price);
      setSaving(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to update price.');
      setSaving(null);
    }
  };

  const vCfg = VENDORS[vendorType] || VENDORS.food_truck;

  if (!pairedCameraId) {
    return (
      <View style={s.container}>
        <Text style={s.emptyText}>Pair a camera to manage item prices.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <StatusBar style="dark" />
      <View style={s.header}>
        <Text style={s.title}>Item Prices</Text>
        <Text style={s.subtitle}>Set custom prices for your {vCfg.name} items</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {vCfg.items.map((item) => {
          const currentPrice = customPrices[item] || 0;
          const displayPrice = editingPrices[item] !== undefined ? editingPrices[item] : currentPrice.toString();
          const isSaving = saving === item;

          return (
            <View key={item} style={s.itemCard}>
              <View style={[s.iconBox, { backgroundColor: vCfg.bg }]}>
                <Ionicons name="pricetag" size={20} color={vCfg.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.itemName}>{item.replace(/_/g, ' ').toUpperCase()}</Text>
                <Text style={s.currentLabel}>Current: ₹{currentPrice}</Text>
              </View>
              <View style={s.inputContainer}>
                <Text style={s.currency}>₹</Text>
                <TextInput
                  style={s.input}
                  keyboardType="numeric"
                  value={displayPrice}
                  onChangeText={(text) => setEditingPrices({ ...editingPrices, [item]: text })}
                  placeholder="0"
                />
                <TouchableOpacity 
                  style={[s.saveBtn, { backgroundColor: vCfg.color }]} 
                  onPress={() => handleSave(item)}
                  disabled={isSaving}
                >
                  {isSaving ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="checkmark" size={20} color="#FFF" />}
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FC' },
  header: { padding: 24, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#1A1A2E' },
  subtitle: { fontSize: 14, color: '#8A8FAF', marginTop: 4 },
  scroll: { padding: 16, paddingBottom: 40 },
  itemCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    padding: 16, borderRadius: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
  },
  iconBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemName: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  currentLabel: { fontSize: 12, color: '#8A8FAF', marginTop: 2 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  currency: { fontSize: 16, fontWeight: '600', color: '#1A1A2E' },
  input: {
    width: 60, backgroundColor: '#F7F8FC', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 8, fontSize: 15, fontWeight: '600',
    color: '#1A1A2E', textAlign: 'center', borderWidth: 1, borderColor: '#EBEBF0'
  },
  saveBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  emptyText: { textAlign: 'center', marginTop: 100, color: '#8A8FAF', fontSize: 16 },
});
