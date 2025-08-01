import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Card, Text, Button, ActivityIndicator } from 'react-native-paper';
import { safeNFCService } from '../../services/nfc/SafeNFCService';
import { PlatformUtils } from '../../utils/Platform';
import SafeIcon from '../common/SafeIcon';

interface SafeNFCScannerProps {
  onScan: (data: string) => void;
  onCancel: () => void;
}

/**
 * Safe NFC scanner that works in both native and Expo Go environments
 */
const SafeNFCScanner: React.FC<SafeNFCScannerProps> = ({ onScan, onCancel }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartScan = async () => {
    if (!PlatformUtils.isNFCSupported()) {
      // Show fallback options
      Alert.alert(
        'NFC Not Available',
        'NFC scanning is not available in this environment. Would you like to use an alternative method?',
        [
          { text: 'Cancel', onPress: onCancel },
          {
            text: 'Scan QR Code',
            onPress: () => {
              Alert.alert('QR Code Scanning', 'QR code scanning would be implemented here.');
              onCancel();
            }
          },
          {
            text: 'Enter Manually',
            onPress: () => {
              Alert.alert('Manual Entry', 'Manual URL entry would be implemented here.');
              onCancel();
            }
          }
        ]
      );
      return;
    }

    setIsScanning(true);
    setError(null);

    try {
      const success = await safeNFCService.start();
      if (!success) {
        setError('Failed to initialize NFC');
        setIsScanning(false);
        return;
      }

      const data = await safeNFCService.readNdef();
      if (data) {
        onScan(data);
      } else {
        setError('No data found on NFC tag');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsScanning(false);
      await safeNFCService.cancelTechnologyRequest();
    }
  };

  const renderContent = () => {
    if (!PlatformUtils.isNFCSupported()) {
      return (
        <View style={styles.fallbackContainer}>
          <SafeIcon name="nfc" size={48} color="#ccc" />
          <Text style={styles.fallbackTitle}>NFC Not Available</Text>
          <Text style={styles.fallbackDescription}>
            NFC scanning requires a development build. Use QR codes or manual entry instead.
          </Text>
          <View style={styles.fallbackActions}>
            <Button 
              mode="contained" 
              onPress={handleStartScan}
              style={styles.fallbackButton}
            >
              Show Alternatives
            </Button>
            <Button onPress={onCancel}>Cancel</Button>
          </View>
        </View>
      );
    }

    if (isScanning) {
      return (
        <View style={styles.scanningContainer}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text style={styles.scanningText}>Hold your device near an NFC tag</Text>
          <Text style={styles.scanningSubtext}>Scanning...</Text>
          <Button onPress={onCancel} style={styles.cancelButton}>
            Cancel
          </Button>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <SafeIcon name="alert-circle" size={48} color="#f44336" />
          <Text style={styles.errorTitle}>Scan Failed</Text>
          <Text style={styles.errorText}>{error}</Text>
          <View style={styles.errorActions}>
            <Button mode="contained" onPress={handleStartScan}>
              Try Again
            </Button>
            <Button onPress={onCancel}>Cancel</Button>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.readyContainer}>
        <SafeIcon name="nfc" size={64} color="#6200ee" />
        <Text style={styles.readyTitle}>NFC Scanner Ready</Text>
        <Text style={styles.readyDescription}>
          Tap the button below and hold your device near an NFC tag to scan it.
        </Text>
        <View style={styles.readyActions}>
          <Button 
            mode="contained" 
            onPress={handleStartScan}
            style={styles.scanButton}
            icon={() => <SafeIcon name="nfc" size={20} color="white" />}
          >
            Start Scanning
          </Button>
          <Button onPress={onCancel}>Cancel</Button>
        </View>
      </View>
    );
  };

  return (
    <Card style={styles.container}>
      <Card.Content>
        {renderContent()}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
  },
  fallbackContainer: {
    alignItems: 'center',
    padding: 20,
  },
  fallbackTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  fallbackDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  fallbackActions: {
    flexDirection: 'row',
    gap: 12,
  },
  fallbackButton: {
    marginRight: 8,
  },
  scanningContainer: {
    alignItems: 'center',
    padding: 20,
  },
  scanningText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 4,
    textAlign: 'center',
  },
  scanningSubtext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  cancelButton: {
    marginTop: 8,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
    color: '#f44336',
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 12,
  },
  readyContainer: {
    alignItems: 'center',
    padding: 20,
  },
  readyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  readyDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  readyActions: {
    flexDirection: 'row',
    gap: 12,
  },
  scanButton: {
    marginRight: 8,
  },
});

export default SafeNFCScanner;