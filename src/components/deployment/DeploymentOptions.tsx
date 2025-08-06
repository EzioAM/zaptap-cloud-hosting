import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Portal,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { AutomationData } from '../../types';
import NFCService from '../../services/nfc/NFCService';
import { automationSharingService } from '../../services/sharing/AutomationSharingService';
import QRGenerator from '../qr/QRGenerator';
import { EventLogger } from '../../utils/EventLogger';

interface DeploymentOptionsProps {
  automation: AutomationData;
  onClose?: () => void;
}

const { width } = Dimensions.get('window');

export const DeploymentOptions: React.FC<DeploymentOptionsProps> = ({
  automation,
  onClose,
}) => {
  const [isNFCLoading, setIsNFCLoading] = useState(false);
  const [isShareLoading, setIsShareLoading] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  const handleNFCDeployment = async () => {
    try {
      setIsNFCLoading(true);
      
      const nfcService = NFCService;
      const success = await nfcService.writeAutomationToNFC(automation);
      
      if (success) {
        Alert.alert(
          'NFC Tag Written! 🎉',
          `Automation "${automation.title}" has been written to the NFC tag. Anyone can tap this tag to run your automation.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      EventLogger.error('DeploymentOptions', 'NFC deployment error:', error as Error);
      Alert.alert(
        'NFC Deployment Failed',
        error.message || 'Could not write to NFC tag. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsNFCLoading(false);
    }
  };

  const handleShareLinkDeployment = async () => {
    try {
      setIsShareLoading(true);
      
      // Create a public share link for consistent URL format
      const shareResult = await automationSharingService.createPublicShareLink(automation);
      
      if (shareResult.success && shareResult.shareUrl) {
        // Copy the share URL to clipboard
        await Clipboard.setStringAsync(shareResult.shareUrl);
        
        Alert.alert(
          'Share Link Ready! 🔗',
          `Share URL copied to clipboard:\n\n${shareResult.shareUrl}\n\nThis link will work for anyone, even without the app installed!`,
          [
            { text: 'OK' },
            {
              text: 'Share Now',
              onPress: () => {
                automationSharingService.shareAutomation(automation, {
                  generatePublicLink: true,
                  customMessage: `Check out this automation: "${automation.title}"`
                });
              }
            }
          ]
        );
      } else {
        throw new Error(shareResult.error || 'Failed to create share link');
      }
    } catch (error: any) {
      EventLogger.error('DeploymentOptions', 'Share deployment error:', error as Error);
      Alert.alert(
        'Share Link Failed',
        error.message || 'Could not create share link. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsShareLoading(false);
    }
  };

  const handleQRCodeDeployment = () => {
    setShowQRModal(true);
  };

  const renderDeploymentOption = (
    icon: string,
    title: string,
    description: string,
    onPress: () => void,
    isLoading: boolean = false,
    gradientColors: string[] = ['#8B5CF6', '#7C3AED']
  ) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={isLoading}
      style={styles.deploymentOption}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={gradientColors}
        style={styles.optionGradient}
      >
        <View style={styles.optionContent}>
          <View style={styles.optionIcon}>
            {isLoading ? (
              <ActivityIndicator size={32} color="white" />
            ) : (
              <MaterialCommunityIcons name={icon as any} size={32} color="white" />
            )}
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>{title}</Text>
            <Text style={styles.optionDescription}>{description}</Text>
          </View>
          <View style={styles.optionArrow}>
            <MaterialCommunityIcons name="chevron-right" size={24} color="rgba(255,255,255,0.7)" />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Card style={[styles.card, styles.glassCard]}>
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Deploy & Share</Text>
              <Text style={styles.subtitle}>
                Make your automation accessible to others
              </Text>
            </View>
            {onClose && (
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.automationInfo}>
            <Text style={styles.automationTitle}>{automation.title}</Text>
            <Text style={styles.automationMeta}>
              {automation.steps?.length || 0} steps • 
              {automation.is_public ? ' Public' : ' Private'}
            </Text>
          </View>

          <View style={styles.deploymentOptions}>
            {renderDeploymentOption(
              'nfc',
              'NFC Tag',
              'Write to NFC tag for tap-to-run',
              handleNFCDeployment,
              isNFCLoading,
              ['#4CAF50', '#2E7D32']
            )}

            {renderDeploymentOption(
              'qrcode',
              'QR Code',
              'Generate scannable QR code',
              handleQRCodeDeployment,
              false,
              ['#2196F3', '#1565C0']
            )}

            {renderDeploymentOption(
              'share-variant',
              'Share Link',
              'Create shareable web link',
              handleShareLinkDeployment,
              isShareLoading,
              ['#FF9800', '#F57C00']
            )}
          </View>

          <View style={styles.infoSection}>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="information" size={16} color="#8B5CF6" />
              <Text style={styles.infoText}>
                All deployment methods use the format: https://www.zaptap.cloud/share/{'{publicId}'}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="shield-check" size={16} color="#4CAF50" />
              <Text style={styles.infoText}>
                Links work even without the app installed
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* QR Generator Modal */}
      <Portal>
        <Modal
          visible={showQRModal}
          onDismiss={() => setShowQRModal(false)}
          style={styles.qrModal}
        >
          <QRGenerator
            automationId={automation.id}
            automationTitle={automation.title}
            automationDescription={automation.description || ''}
            creator={automation.created_by || 'Unknown'}
            automation={automation}
            onClose={() => setShowQRModal(false)}
          />
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  glassCard: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
    borderRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  closeButton: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  automationInfo: {
    padding: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  automationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  automationMeta: {
    fontSize: 14,
    color: '#666',
  },
  deploymentOptions: {
    gap: 12,
    marginBottom: 20,
  },
  deploymentOption: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  optionGradient: {
    padding: 16,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
  },
  optionArrow: {
    marginLeft: 12,
  },
  infoSection: {
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 12,
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  qrModal: {
    flex: 1,
    margin: 0,
  },
});

export default DeploymentOptions;