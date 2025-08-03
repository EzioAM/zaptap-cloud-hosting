import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Vibration,
  Animated,
} from 'react-native';
import {
  Appbar,
  Text,
  Button,
  Surface,
  ActivityIndicator,
} from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import NFCService from '../../services/nfc/NFCService';

interface NFCScannerProps {
  onScan: (automationId: string, metadata: any) => void;
  onClose: () => void;
}

const NFCScanner: React.FC<NFCScannerProps> = ({ onScan, onClose }) => {
  const [scanning, setScanning] = useState(false);
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let mounted = true;
    
    const initializeNFC = async () => {
      if (mounted) {
        await checkNFCSupport();
      }
    };
    
    initializeNFC();
    
    // Cleanup on unmount
    return () => {
      mounted = false;
      if (scanning) {
        stopScanning();
      }
    };
  }, []);

  useEffect(() => {
    if (scanning) {
      startPulseAnimation();
    } else {
      stopPulseAnimation();
    }
  }, [scanning]);

  const checkNFCSupport = async () => {
    try {
      const supported = await NFCService.initialize();
      setIsSupported(supported);
      
      if (supported) {
        startScanning();
      }
    } catch (error) {
      console.error('Error checking NFC support:', error);
      setIsSupported(false);
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  const startScanning = async () => {
    try {
      setScanning(true);
      
      await NFCService.startNFCReader((automationId: string, metadata: any) => {
        // Vibrate on successful scan
        Vibration.vibrate(200);
        
        setScanning(false);
        
        Alert.alert(
          'Automation Found! 🤖',
          `Title: ${metadata.title || 'Unknown'}\\nCreator: ${metadata.creator || 'Unknown'}\\n\\nDo you want to run this automation?`,
          [
            {
              text: 'Cancel',
              onPress: () => {
                stopScanning();
                startScanning(); // Restart scanning
              },
            },
            {
              text: 'Run Automation',
              onPress: () => {
                onScan(automationId, metadata);
              },
            },
          ]
        );
      });
      
    } catch (error) {
      console.error('Failed to start NFC scanning:', error);
      setScanning(false);
      Alert.alert('NFC Error', 'Failed to start NFC scanning');
    }
  };

  const stopScanning = async () => {
    try {
      await NFCService.stopNFCReader();
      setScanning(false);
    } catch (error) {
      console.error('Failed to stop NFC scanning:', error);
    }
  };

  const handleRetry = () => {
    if (scanning) {
      stopScanning();
    }
    setTimeout(() => {
      startScanning();
    }, 500);
  };

  if (isSupported === null) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={onClose} />
          <Appbar.Content title="NFC Scanner" />
        </Appbar.Header>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" />
          <Text style={styles.statusText}>Checking NFC support...</Text>
        </View>
      </View>
    );
  }

  if (!isSupported) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={onClose} />
          <Appbar.Content title="NFC Scanner" />
        </Appbar.Header>
        <View style={styles.centerContent}>
          <Icon name="nfc-variant-off" size={64} color="#999" />
          <Text style={styles.errorTitle}>NFC Not Supported</Text>
          <Text style={styles.errorText}>
            Your device does not support NFC functionality.
          </Text>
          <Button mode="contained" onPress={onClose} style={styles.button}>
            Close
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={onClose} />
        <Appbar.Content title="Scan NFC Tag" />
        {scanning && (
          <Appbar.Action
            icon="stop"
            onPress={stopScanning}
          />
        )}
      </Appbar.Header>

      <View style={styles.content}>
        <View style={styles.scanArea}>
          <Animated.View 
            style={[
              styles.nfcIcon, 
              { transform: [{ scale: pulseAnim }] }
            ]}
          >
            <Icon 
              name="nfc" 
              size={120} 
              color={scanning ? "#6200ee" : "#ccc"} 
            />
          </Animated.View>
          
          <Text style={styles.instruction}>
            {scanning 
              ? "Hold your device near an NFC tag to scan"
              : "Tap 'Start Scanning' to begin"
            }
          </Text>
          
          {scanning && (
            <Surface style={styles.statusCard} elevation={2}>
              <ActivityIndicator size="small" color="#6200ee" />
              <Text style={styles.statusText}>Scanning for NFC tags...</Text>
            </Surface>
          )}
        </View>

        <View style={styles.actions}>
          {!scanning ? (
            <Button
              mode="contained"
              onPress={startScanning}
              icon="nfc"
              style={styles.button}
            >
              Start Scanning
            </Button>
          ) : (
            <>
              <Button
                mode="outlined"
                onPress={stopScanning}
                icon="stop"
                style={styles.button}
              >
                Stop Scanning
              </Button>
              <Button
                mode="contained"
                onPress={handleRetry}
                icon="refresh"
                style={styles.button}
              >
                Restart
              </Button>
            </>
          )}
        </View>

        <Surface style={styles.infoCard} elevation={1}>
          <Icon name="information" size={24} color="#6200ee" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>How to use NFC</Text>
            <Text style={styles.infoText}>
              • Place your device close to an NFC tag{'\n'}
              • The tag should contain a Zaptap automation{'\n'}
              • Keep your device steady until scan completes{'\n'}
              • Make sure NFC is enabled in your device settings
            </Text>
          </View>
        </Surface>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nfcIcon: {
    marginBottom: 32,
  },
  instruction: {
    fontSize: 18,
    textAlign: 'center',
    color: '#333',
    marginBottom: 32,
    lineHeight: 24,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(98, 0, 238, 0.1)',
    marginBottom: 32,
  },
  statusText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#6200ee',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  button: {
    minWidth: 120,
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
});

export default NFCScanner;