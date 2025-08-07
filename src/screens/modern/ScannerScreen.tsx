import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Vibration,
  Dimensions,
  Platform,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Camera, CameraView } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeTheme } from '../../components/common/ThemeFallbackWrapper';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { qrService } from '../../services/qr/QRService';
import { nfcService } from '../../services/nfc/NFCService';
import {
  initializeScanning,
  startScanning,
  stopScanning,
  processScanData,
  selectIsScanning,
  selectScanType,
  selectNFCState,
  selectQRState,
  selectCurrentScan,
  selectIsProcessing,
} from '../../store/slices/scanSlice';
import type { AppDispatch, RootState } from '../../store';
import { EventLogger } from '../../utils/EventLogger';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface RecentScan {
  id: string;
  type: 'qr' | 'nfc';
  data: string;
  timestamp: Date;
  automationName?: string;
}

export default function ScannerScreen() {
  const theme = useSafeTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  
  // Redux selectors
  const isScanning = useSelector(selectIsScanning);
  const scanType = useSelector(selectScanType);
  const nfcState = useSelector(selectNFCState);
  const qrState = useSelector(selectQRState);
  const currentScan = useSelector(selectCurrentScan);
  const isProcessing = useSelector(selectIsProcessing);
  
  // Local state
  const [scanMode, setScanMode] = useState<'qr' | 'nfc'>('qr');
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [scanStartTime, setScanStartTime] = useState<number>(0);
  
  // Animation values
  const scanLineY = useSharedValue(0);
  const successScale = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  // Initialize scanning services on mount
  useEffect(() => {
    dispatch(initializeScanning());
    
    // Initialize QR service
    qrService.initialize();
    
    // Cleanup on unmount
    return () => {
      dispatch(stopScanning());
      qrService.cleanup();
      nfcService.cleanup();
    };
  }, [dispatch]);

  // Handle scan mode changes and permissions
  useEffect(() => {
    if (scanMode === 'qr' && !qrState.hasPermission) {
      // Request camera permission for QR scanning
      Camera.requestCameraPermissionsAsync()
        .then(({ status }) => {
          if (status !== 'granted') {
            Alert.alert(
              'Camera Permission Required',
              'Camera permission is needed to scan QR codes. Please grant permission in your device settings.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => {
                  // On iOS, this will open the Settings app
                  if (Platform.OS === 'ios') {
                    // Expo doesn't provide direct settings access, but users can go manually
                    Alert.alert('Settings', 'Please go to Settings > Privacy & Security > Camera and enable access for this app.');
                  }
                }}
              ]
            );
          }
        })
        .catch(error => {
          EventLogger.error('Scanner', 'Error requesting camera permission:', error);
          Alert.alert('Permission Error', 'Failed to request camera permission.');
        });
    } else if (scanMode === 'nfc' && !nfcState.isSupported) {
      Alert.alert(
        'NFC Not Supported',
        'NFC is not supported on this device. Please use QR code scanning instead.',
        [{ text: 'Switch to QR', onPress: () => setScanMode('qr') }]
      );
    } else if (scanMode === 'nfc' && nfcState.isSupported && !nfcState.isEnabled) {
      Alert.alert(
        'NFC Disabled',
        'NFC is disabled on your device. Please enable it in your device settings to use NFC scanning.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Switch to QR', onPress: () => setScanMode('qr') }
        ]
      );
    }
  }, [scanMode, qrState.hasPermission, nfcState.isSupported, nfcState.isEnabled]);

  // Scan line animation
  useEffect(() => {
    if (isScanning && scanMode === 'qr') {
      scanLineY.value = withRepeat(
        withTiming(250, { duration: 2000 }),
        -1,
        true
      );
    }
  }, [isScanning, scanMode]);

  // Pulse animation for NFC
  useEffect(() => {
    if (scanMode === 'nfc' && isScanning) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        false
      );
    }
  }, [scanMode, isScanning]);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineY.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: interpolate(pulseScale.value, [1, 1.2], [0.3, 0.1]),
  }));

  const successStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
    opacity: successScale.value,
  }));

  const handleBarCodeScanned = useCallback(({ data }: { data: string }) => {
    if (!isScanning || isProcessing) return;

    setScanStartTime(Date.now());
    dispatch(stopScanning());
    Vibration.vibrate(100);

    // Process the scanned data through Redux
    dispatch(processScanData({ type: 'qr', data }));
    
    // Also use QR service for additional processing
    qrService.handleCameraScanResult(
      data,
      (result) => {
        if (result.success && result.data?.metadata?.automationId) {
          const newScan: RecentScan = {
            id: Date.now().toString(),
            type: 'qr',
            data,
            timestamp: new Date(),
            automationName: result.data.metadata.title || 'Automation #' + result.data.metadata.automationId.slice(0, 6),
          };
          setRecentScans(prev => [newScan, ...prev.slice(0, 4)]);
          
          setShowSuccess(true);
          successScale.value = withSpring(1, {}, () => {
            successScale.value = withTiming(0, { duration: 500 });
          });
        }
      },
      scanStartTime
    );
  }, [isScanning, isProcessing, dispatch, scanStartTime]);

  const processScannedData = async (data: string, type: 'qr' | 'nfc') => {
    // This is now handled by Redux - keeping for backward compatibility with manual entry
    dispatch(processScanData({ type, data }));
  };

  // Handle successful scan from Redux state
  useEffect(() => {
    if (currentScan && currentScan.automation) {
      const newScan: RecentScan = {
        id: currentScan.id,
        type: currentScan.type,
        data: currentScan.data,
        timestamp: new Date(currentScan.timestamp),
        automationName: currentScan.automation.title || 'Automation #' + currentScan.automation.id.slice(0, 6),
      };
      setRecentScans(prev => [newScan, ...prev.slice(0, 4)]);
      
      setShowSuccess(true);
      successScale.value = withSpring(1, {}, () => {
        successScale.value = withTiming(0, { duration: 500 });
      });
      
      // Navigate to automation after delay
      setTimeout(() => {
        navigation.navigate('AutomationDetails' as never, { 
          automationId: currentScan.automation?.id 
        } as never);
      }, 1500);
    }
  }, [currentScan, navigation]);

  const resetScanner = () => {
    dispatch(startScanning(scanMode));
    setShowSuccess(false);
  };

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      setShowManualEntry(false);
      processScannedData(manualCode.trim(), 'qr');
      setManualCode('');
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        <MaterialCommunityIcons 
          name="arrow-left" 
          size={24} 
          color={theme.colors?.text || '#000'} 
        />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: theme.colors?.text || '#000' }]}>
        Scanner
      </Text>
      <TouchableOpacity
        onPress={() => setShowManualEntry(true)}
        style={styles.manualButton}
      >
        <MaterialCommunityIcons 
          name="keyboard" 
          size={24} 
          color={theme.colors?.text || '#000'} 
        />
      </TouchableOpacity>
    </View>
  );

  const renderModeSwitcher = () => (
    <View style={[styles.modeSwitcher, { backgroundColor: theme.colors?.surface || '#fff' }]}>
      <TouchableOpacity
        onPress={() => {
          setScanMode('qr');
          dispatch(stopScanning());
          dispatch(startScanning('qr'));
        }}
        style={[
          styles.modeButton,
          scanMode === 'qr' && { backgroundColor: theme.colors?.primary || '#6200ee' }
        ]}
      >
        <MaterialCommunityIcons 
          name="qrcode-scan" 
          size={20} 
          color={scanMode === 'qr' ? '#fff' : theme.colors?.text || '#000'} 
        />
        <Text style={[
          styles.modeButtonText,
          { color: scanMode === 'qr' ? '#fff' : theme.colors?.text || '#000' }
        ]}>
          QR Code
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        onPress={() => {
          setScanMode('nfc');
          dispatch(stopScanning());
          dispatch(startScanning('nfc'));
        }}
        style={[
          styles.modeButton,
          scanMode === 'nfc' && { backgroundColor: theme.colors?.primary || '#6200ee' }
        ]}
      >
        <MaterialCommunityIcons 
          name="nfc" 
          size={20} 
          color={scanMode === 'nfc' ? '#fff' : theme.colors?.text || '#000'} 
        />
        <Text style={[
          styles.modeButtonText,
          { color: scanMode === 'nfc' ? '#fff' : theme.colors?.text || '#000' }
        ]}>
          NFC Tag
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderQRScanner = () => (
    <View style={styles.scannerContainer}>
      {!qrState.hasPermission ? (
        <View style={styles.permissionContainer}>
          <MaterialCommunityIcons 
            name="camera-off" 
            size={64} 
            color={theme.colors?.textSecondary || '#999'} 
          />
          <Text style={[styles.permissionText, { color: theme.colors?.text || '#000' }]}>
            Camera permission is required
          </Text>
          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: theme.colors?.primary || '#6200ee' }]}
            onPress={() => Camera.requestCameraPermissionsAsync()}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            onBarcodeScanned={isScanning ? handleBarCodeScanned : undefined}
            barcodeScannerSettings={{
              barcodeTypes: ['qr', 'aztec', 'ean13', 'ean8', 'pdf417'],
            }}
          />
          
          {/* Scan overlay */}
          <View style={styles.overlay}>
            <View style={styles.scanArea}>
              {/* Corner markers */}
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              
              {/* Scan line */}
              {isScanning && (
                <Animated.View style={[styles.scanLine, scanLineStyle]}>
                  <LinearGradient
                    colors={[
                      'transparent',
                      theme.colors?.primary || '#6200ee',
                      'transparent'
                    ]}
                    style={styles.scanLineGradient}
                  />
                </Animated.View>
              )}
            </View>
          </View>

          {/* Success overlay */}
          {showSuccess && (
            <Animated.View style={[styles.successOverlay, successStyle]}>
              <MaterialCommunityIcons 
                name="check-circle" 
                size={80} 
                color="#4CAF50" 
              />
              <Text style={styles.successText}>Scanned Successfully!</Text>
            </Animated.View>
          )}
        </>
      )}
    </View>
  );

  const renderNFCScanner = () => (
    <View style={styles.nfcContainer}>
      <Animated.View style={[styles.nfcPulse, pulseStyle]} />
      <View style={[styles.nfcIcon, { backgroundColor: theme.colors?.primary || '#6200ee' }]}>
        <MaterialCommunityIcons name="nfc" size={64} color="#fff" />
      </View>
      <Text style={[styles.nfcTitle, { color: theme.colors?.text || '#000' }]}>
        Ready to Scan
      </Text>
      <Text style={[styles.nfcSubtitle, { color: theme.colors?.textSecondary || '#666' }]}>
        Hold your device near an NFC tag
      </Text>
      
      <TouchableOpacity
        style={[styles.nfcButton, { backgroundColor: theme.colors?.primary || '#6200ee' }]}
        onPress={() => {
          if (nfcState.isSupported) {
            if (nfcState.isEnabled) {
              // Start NFC scanning
              nfcService.startNFCReader((automationId, metadata) => {
                const data = `shortcuts-like://automation/${automationId}`;
                dispatch(processScanData({ type: 'nfc', data }));
              }).catch(error => {
                Alert.alert('NFC Error', error.message || 'Failed to start NFC scanning');
              });
            } else {
              Alert.alert('NFC Disabled', 'Please enable NFC in your device settings.');
            }
          } else {
            Alert.alert('NFC Not Supported', 'NFC is not supported on this device.');
          }
        }}
        disabled={!nfcState.isSupported || isProcessing}
      >
        <Text style={styles.nfcButtonText}>
          {isProcessing ? 'Processing...' : 
           nfcState.isListening ? 'Scanning...' : 'Start NFC Scan'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderRecentScans = () => (
    <View style={[styles.recentContainer, { backgroundColor: theme.colors?.surface || '#fff' }]}>
      <Text style={[styles.recentTitle, { color: theme.colors?.text || '#000' }]}>
        Recent Scans
      </Text>
      {recentScans.length === 0 ? (
        <Text style={[styles.recentEmpty, { color: theme.colors?.textSecondary || '#999' }]}>
          No recent scans
        </Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {recentScans.map(scan => (
            <TouchableOpacity
              key={scan.id}
              style={[styles.recentItem, { backgroundColor: theme.colors?.background || '#f5f5f5' }]}
              onPress={() => processScannedData(scan.data, scan.type)}
            >
              <MaterialCommunityIcons 
                name={scan.type === 'qr' ? 'qrcode' : 'nfc'} 
                size={24} 
                color={theme.colors?.primary || '#6200ee'} 
              />
              <Text style={[styles.recentItemText, { color: theme.colors?.text || '#000' }]}>
                {scan.automationName}
              </Text>
              <Text style={[styles.recentItemTime, { color: theme.colors?.textSecondary || '#999' }]}>
                {new Date(scan.timestamp).toLocaleTimeString()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors?.background || '#f5f5f5' }]}>
      {renderHeader()}
      {renderModeSwitcher()}
      
      <View style={styles.content}>
        {scanMode === 'qr' ? renderQRScanner() : renderNFCScanner()}
      </View>
      
      {renderRecentScans()}
      
      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={[styles.instructionText, { color: theme.colors?.textSecondary || '#666' }]}>
          {scanMode === 'qr' 
            ? 'Point your camera at a QR code'
            : 'Hold your device near an NFC tag'}
        </Text>
      </View>

      {/* Manual Entry Modal */}
      <Modal
        visible={showManualEntry}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowManualEntry(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors?.surface || '#fff' }]}>
            <Text style={[styles.modalTitle, { color: theme.colors?.text || '#000' }]}>
              Enter Code Manually
            </Text>
            <TextInput
              style={[styles.modalInput, { 
                color: theme.colors?.text || '#000',
                borderColor: theme.colors?.primary || '#6200ee'
              }]}
              placeholder="Paste automation URL or code"
              placeholderTextColor={theme.colors?.textSecondary || '#999'}
              value={manualCode}
              onChangeText={setManualCode}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#ccc' }]}
                onPress={() => setShowManualEntry(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors?.primary || '#6200ee' }]}
                onPress={handleManualSubmit}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  manualButton: {
    padding: 8,
  },
  modeSwitcher: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  modeButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  scannerContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  permissionButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#fff',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
  },
  scanLineGradient: {
    flex: 1,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  successText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4CAF50',
    marginTop: 16,
  },
  nfcContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nfcPulse: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#6200ee',
  },
  nfcIcon: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nfcTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 24,
  },
  nfcSubtitle: {
    fontSize: 16,
    marginTop: 8,
  },
  nfcButton: {
    marginTop: 32,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  nfcButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  recentContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  recentEmpty: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  recentItem: {
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
    minWidth: 100,
  },
  recentItemText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  recentItemTime: {
    fontSize: 10,
    marginTop: 2,
  },
  instructions: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    padding: 24,
    borderRadius: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  modalButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});