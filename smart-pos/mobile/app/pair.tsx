import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { pairCameraToUser, unpairCamera } from '../src/services/firebase';
import { useAuth } from '../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

export default function PairCameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const { pairedCameraId } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  const handleBarCodeScanned = async ({ type, data }: { type: string, data: string }) => {
    if (scanned) return;
    setScanned(true);

    // Basic validation to ensure it looks like a camera ID we generate
    if (data && data.startsWith('CAM_')) {
      try {
        await pairCameraToUser(data);
        Alert.alert('Success', `Paired with camera: ${data}`, [
          { text: 'OK', onPress: () => router.replace('/') }
        ]);
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to pair camera.');
        setScanned(false);
      }
    } else {
      Alert.alert('Invalid Code', 'Please scan a valid Camera Pairing QR code.', [
        { text: 'Try Again', onPress: () => setScanned(false) }
      ]);
    }
  };

  const handleUnpair = async () => {
    Alert.alert(
      'Unpair Camera',
      'Are you sure you want to disconnect this camera?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Unpair', 
          style: 'destructive',
          onPress: async () => {
            try {
              await unpairCamera();
              Alert.alert('Success', 'Camera unpaired successfully.');
            } catch (error: any) {
              Alert.alert('Error', 'Failed to unpair camera.');
            }
          }
        }
      ]
    );
  };

  if (!permission) {
    return <View style={s.container}><Text>Requesting camera permission...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={s.container}>
        <Text style={s.text}>No access to camera</Text>
        <TouchableOpacity style={s.btn} onPress={requestPermission}>
          <Text style={s.btnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <StatusBar style="light" />
      
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={28} color="#FFF" />
        </TouchableOpacity>
        <Text style={s.title}>Pair Camera</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={s.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
        />
        
        {/* Overlay with target box */}
        <View style={s.overlay}>
          {pairedCameraId ? (
            <View style={s.statusBanner}>
              <View style={s.statusDot} />
              <Text style={s.statusText}>Currently Paired: {pairedCameraId}</Text>
              <TouchableOpacity onPress={handleUnpair} style={s.unpairBtn}>
                <Ionicons name="close-circle" size={24} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.statusBannerEmpty}>
              <Text style={s.statusTextEmpty}>No Camera Paired</Text>
            </View>
          )}

          <View style={s.targetBox}>
            <View style={[s.corner, s.tl]} />
            <View style={[s.corner, s.tr]} />
            <View style={[s.corner, s.bl]} />
            <View style={[s.corner, s.br]} />
          </View>
          <Text style={s.instruction}>
            {pairedCameraId 
              ? "Scan a new QR code to switch cameras" 
              : "Scan the QR code displayed on your computer terminal"}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, zIndex: 10, position: 'absolute', top: 40, left: 0, right: 0
  },
  backBtn: { padding: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },
  title: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  cameraContainer: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetBox: {
    width: 250,
    height: 250,
    backgroundColor: 'transparent',
    borderWidth: 0,
    position: 'relative',
    marginBottom: 40,
  },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: '#06D6A0', borderWidth: 4 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 16 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 16 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 16 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 16 },
  instruction: {
    color: '#FFF', fontSize: 16, textAlign: 'center', paddingHorizontal: 40,
    fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.7)', paddingVertical: 12, borderRadius: 20,
    overflow: 'hidden'
  },
  statusBanner: {
    position: 'absolute', top: 120, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 25, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5
  },
  statusBannerEmpty: {
    position: 'absolute', top: 120, backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25, borderSize: 1, borderColor: 'rgba(255,255,255,0.3)'
  },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#06D6A0', marginRight: 10 },
  statusText: { color: '#1A1A2E', fontSize: 14, fontWeight: '700' },
  statusTextEmpty: { color: '#FFF', fontSize: 14, fontWeight: '600', opacity: 0.8 },
  unpairBtn: { marginLeft: 12, padding: 4 },
  text: { color: '#FFF', fontSize: 18, textAlign: 'center', marginBottom: 20 },
  btn: { backgroundColor: '#6C63FF', padding: 14, borderRadius: 12, marginHorizontal: 40 },
  btnText: { color: '#FFF', textAlign: 'center', fontSize: 16, fontWeight: '700' }
});
