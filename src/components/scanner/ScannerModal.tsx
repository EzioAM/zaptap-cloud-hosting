import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  Appbar,
  Text,
  Card,
  SegmentedButtons,
} from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { FullScreenModal } from '../common/FullScreenModal';
import QRScanner from '../qr/QRScanner';
import NFCScanner from '../nfc/NFCScanner';

interface ScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScan?: (automationId: string, metadata: any) => void;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({
  visible,
  onClose,
  onScan,
}) => {
  const [scannerType, setScannerType] = useState<'qr' | 'nfc' | null>(null);

  const handleScan = (automationId: string, metadata: any) => {
    onScan?.(automationId, metadata);
    onClose();
  };

  const handleClose = () => {
    setScannerType(null);
    onClose();
  };

  const renderScannerSelection = () => (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={handleClose} />
        <Appbar.Content title="Scanner" />
      </Appbar.Header>
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Icon name="scan-helper" size={64} color="#6366F1" />
          <Text style={styles.headerTitle}>Choose Scanner Type</Text>
          <Text style={styles.headerSubtitle}>
            Select how you want to scan for automations
          </Text>
        </View>

        <View style={styles.options}>
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => setScannerType('qr')}
            activeOpacity={0.7}
          >
            <Card style={styles.card}>
              <Card.Content style={styles.cardContent}>
                <Icon name="qrcode-scan" size={48} color="#6366F1" />
                <Text style={styles.cardTitle}>QR Code Scanner</Text>
                <Text style={styles.cardDescription}>
                  Scan QR codes to discover and run automations shared by others
                </Text>
                <View style={styles.cardFeatures}>
                  <Text style={styles.featureText}>• Camera required</Text>
                  <Text style={styles.featureText}>• Works with shared links</Text>
                  <Text style={styles.featureText}>• Instant recognition</Text>
                </View>
              </Card.Content>
            </Card>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => setScannerType('nfc')}
            activeOpacity={0.7}
          >
            <Card style={styles.card}>
              <Card.Content style={styles.cardContent}>
                <Icon name="nfc" size={48} color="#EC4899" />
                <Text style={styles.cardTitle}>NFC Tag Scanner</Text>
                <Text style={styles.cardDescription}>
                  Touch NFC tags to instantly run automations with tap-to-execute
                </Text>
                <View style={styles.cardFeatures}>
                  <Text style={styles.featureText}>• NFC enabled device</Text>
                  <Text style={styles.featureText}>• Physical tags</Text>
                  <Text style={styles.featureText}>• Fastest execution</Text>
                </View>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        </View>

        <View style={styles.segmentedContainer}>
          <Text style={styles.segmentedLabel}>Quick Select:</Text>
          <SegmentedButtons
            value=""
            onValueChange={(value) => setScannerType(value as 'qr' | 'nfc')}
            buttons={[
              {
                value: 'qr',
                label: 'QR Code',
                icon: 'qrcode-scan',
              },
              {
                value: 'nfc',
                label: 'NFC Tag',
                icon: 'nfc',
              },
            ]}
            style={styles.segmentedButtons}
          />
        </View>
      </View>
    </View>
  );

  if (!visible) return null;

  return (
    <FullScreenModal visible={visible} onDismiss={handleClose}>
      {!scannerType && renderScannerSelection()}
      
      {scannerType === 'qr' && (
        <QRScanner
          onScan={handleScan}
          onClose={() => setScannerType(null)}
        />
      )}
      
      {scannerType === 'nfc' && (
        <NFCScanner
          onScan={handleScan}
          onClose={() => setScannerType(null)}
        />
      )}
    </FullScreenModal>
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
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  options: {
    gap: 16,
    marginBottom: 32,
  },
  optionCard: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.1)',
  },
  cardContent: {
    alignItems: 'center',
    padding: 24,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  cardFeatures: {
    alignItems: 'flex-start',
    width: '100%',
  },
  featureText: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  segmentedContainer: {
    alignItems: 'center',
  },
  segmentedLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 12,
  },
  segmentedButtons: {
    minWidth: 250,
  },
});

export default ScannerModal;
