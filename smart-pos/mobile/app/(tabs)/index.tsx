import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { listenToScans, listenToInventory } from '../../src/services/firebase';

export default function DashboardScreen() {
  const [scans, setScans] = useState<any[]>([]);
  const [totalSales, setTotalSales] = useState(0);
  const [inventory, setInventory] = useState<any>({});

  useEffect(() => {
    listenToScans((data) => {
      setScans(data);
      // Calculate total sales
      const total = data.reduce((sum: number, item: any) => sum + (Number(item.price) || 0), 0);
      setTotalSales(total);
    });

    listenToInventory((data) => {
      setInventory(data);
    });
  }, []);
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Smart POS</Text>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        {/* Sales Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>TODAY'S SALES</Text>
          <Text style={styles.salesAmount}>₹{totalSales}</Text>
          <Text style={styles.salesSubtext}>+14% from yesterday</Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.card, styles.statCard, { marginRight: 8 }]}>
            <Text style={styles.cardLabel}>ITEMS</Text>
            <Text style={styles.statValue}>{scans.length}</Text>
          </View>
          <View style={[styles.card, styles.statCard, { marginLeft: 8 }]}>
            <Text style={styles.cardLabel}>FRESH GOODS</Text>
            <Text style={styles.statValue}>75%</Text>
          </View>
        </View>

        {/* Inventory Warnings */}
        {Object.keys(inventory).length === 0 && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>💡 Tip: Add items to /inventory in Firebase to see live stock warnings!</Text>
          </View>
        )}
        
        {Object.keys(inventory).map(key => {
          if (inventory[key] <= 5) {
            return (
              <View key={key} style={styles.warningBanner}>
                <Text style={styles.warningText}>⚠️ Low Stock: {key.replace(/_/g, ' ')} ({inventory[key]} left)</Text>
              </View>
            );
          }
          return null;
        })}

        {/* Recent Scans */}
        <Text style={styles.sectionTitle}>Recent Scans</Text>
        {scans.map((scan) => (
          <View key={scan.id} style={styles.scanRow}>
            <View style={styles.scanIconPlaceholder}>
              <Text style={styles.scanIconText}>{scan.type === 'vision' ? '👁️' : '🛒'}</Text>
            </View>
            <View style={styles.scanInfo}>
              <Text style={styles.scanName}>{scan.name}</Text>
              <Text style={styles.scanTime}>{scan.time}</Text>
            </View>
            <Text style={styles.scanPrice}>₹{scan.price}</Text>
          </View>
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090E', // Super dark premium background
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 45, 85, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 45, 85, 0.3)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF2D55',
    marginRight: 6,
  },
  liveText: {
    color: '#FF2D55',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: '#15151E',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#22222E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  cardLabel: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
  },
  salesAmount: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1,
  },
  salesSubtext: {
    color: '#00FF88', // Neon green for positive
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    marginBottom: 0,
    padding: 20,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },
  warningBanner: {
    backgroundColor: 'rgba(255, 159, 10, 0.15)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 159, 10, 0.3)',
    marginBottom: 30,
  },
  warningText: {
    color: '#FF9F0A',
    fontWeight: '600',
    fontSize: 14,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  scanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#15151E',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#22222E',
  },
  scanIconPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#22222E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  scanIconText: {
    fontSize: 20,
  },
  scanInfo: {
    flex: 1,
  },
  scanName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  scanTime: {
    color: '#8E8E93',
    fontSize: 13,
  },
  scanPrice: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
