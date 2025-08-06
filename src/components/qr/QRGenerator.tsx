import React, { useState, useRef } from 'react';
import { EventLogger } from '../../utils/EventLogger';
  import {
    View,
    StyleSheet,
    Dimensions,
    Alert,
    Share,
    Platform,
  } from 'react-native';
  import {
    Card,
    Button,
    Text,
    Chip,
    Surface,
    SegmentedButtons,
  } from 'react-native-paper';
  import QRCode from 'react-native-qrcode-svg';
  import { captureRef } from 'react-native-view-shot';
  import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
  import { smartLinkService } from '../../services/linking/SmartLinkService';
  import * as Clipboard from 'expo-clipboard';
  import * as MediaLibrary from 'expo-media-library';

  interface QRGeneratorProps {
    automationId: string;
    automationTitle: string;
    automationDescription?: string;
    creator: string;
    onClose: () => void;
    automation?: any; // Full automation data for emergency links
    isEmergency?: boolean;
  }

  const { width } = Dimensions.get('window');
  const QR_SIZE = Math.min(width - 100, 250);

  const QRGenerator: React.FC<QRGeneratorProps> = ({
    automationId,
    automationTitle,
    automationDescription,
    creator,
    onClose,
    automation,
    isEmergency = false,
  }) => {
    const [qrSize, setQrSize] = useState<string>('medium');
    const [errorLevel, setErrorLevel] = useState<string>('M');
    const [linkType, setLinkType] = useState<string>(isEmergency ? 'emergency' : 'smart');
    const [isSharing, setIsSharing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const qrRef = useRef<View>(null);

    const sizeMap = {
      small: QR_SIZE - 50,
      medium: QR_SIZE,
      large: QR_SIZE + 50,
    };

    const currentSize = sizeMap[qrSize as keyof typeof sizeMap];

    // Generate smart links using the service
    const automationData = automation || {
      id: automationId,
      title: automationTitle,
      description: automationDescription || '',
      steps: [],
      created_by: creator,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_public: true,
      category: 'shared',
      tags: [],
      execution_count: 0,
      average_rating: 0,
      rating_count: 0,
    };

    const smartLink = linkType === 'emergency' 
      ? smartLinkService.generateEmergencyLink(automationData)
      : smartLinkService.generateSmartLink(automationData);

    const qrUrl = smartLink.qrData;

    const shareQR = async () => {
      try {
        if (!qrRef.current) {
          Alert.alert('Error', 'QR code not ready. Please try again.');
          return;
        }

        setIsSharing(true);

        const uri = await captureRef(qrRef.current, {
          format: 'png',
          quality: 1.0,
          result: 'tmpfile', // Use temp file for better reliability
        });

        const shareMessage = linkType === 'emergency' 
          ? `🚨 EMERGENCY AUTOMATION: ${automationTitle}\n\nScan this QR code to run this automation. Works even without the app installed!\n\nCreated by: ${creator}`
          : `Scan this QR code to run "${automationTitle}" automation.\n\nWorks with or without the app!\n\nCreated by: ${creator}`;

        const shareOptions = {
          title: `${automationTitle} - Automation QR Code`,
          message: shareMessage,
          url: Platform.OS === 'ios' ? uri : `file://${uri}`,
          subject: `${automationTitle} - Automation QR Code`, // For email sharing
          failOnCancel: false, // Don't throw error if user cancels
        };

        const result = await Share.share(shareOptions);

        if (result.action === Share.sharedAction) {
          if (result.activityType) {
            // Shared via activity type (iOS)
            EventLogger.debug('QRCode', 'Shared via', result.activityType);
          } else {
            // Shared (Android)
            EventLogger.debug('QRCode', 'QR code shared successfully');
          }
        } else if (result.action === Share.dismissedAction) {
          // Dismissed (iOS) or cancelled (Android)
          EventLogger.debug('QRCode', 'Share dismissed');
        }
      } catch (error: any) {
        EventLogger.error('QRCode', 'Share error:', error as Error);
        
        // Provide more specific error messages
        if (error.code === 'ENOENT') {
          Alert.alert(
            'Share Failed',
            'Could not generate QR code image. Please try again.',
            [{ text: 'OK' }]
          );
        } else if (error.message?.includes('cancel')) {
          // User cancelled, no need to show error
          return;
        } else {
          Alert.alert(
            'Share Failed',
            'Could not share QR code. Try saving to camera roll instead.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Save to Camera Roll', onPress: saveQRToCameraRoll },
              { text: 'Copy Link', onPress: copyLink }
            ]
          );
        }
      } finally {
        setIsSharing(false);
      }
    };


    const saveQRToCameraRoll = async () => {
      try {
        if (!qrRef.current) {
          Alert.alert('Error', 'QR code not ready. Please try again.');
          return;
        }

        setIsSaving(true);

        // Request permission
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Please allow access to save QR code to your camera roll.',
            [{ text: 'OK' }]
          );
          return;
        }

        // Capture QR code
        const uri = await captureRef(qrRef.current, {
          format: 'png',
          quality: 1.0,
          result: 'tmpfile',
        });

        // Save to camera roll
        const asset = await MediaLibrary.createAssetAsync(uri);
        await MediaLibrary.createAlbumAsync('Shortcuts Like QR Codes', asset, false);

        Alert.alert(
          'Saved! 📸',
          'QR code has been saved to your camera roll.',
          [
            { text: 'OK' },
            { text: 'Share Now', onPress: shareQR }
          ]
        );
      } catch (error: any) {
        EventLogger.error('QRCode', 'Save error:', error as Error);
        Alert.alert(
          'Save Failed',
          'Could not save QR code. Please try again.',
          [{ text: 'OK' }]
        );
      } finally {
        setIsSaving(false);
      }
    };

    const copyLink = async () => {
      try {
        await Clipboard.setStringAsync(smartLink.universalUrl);
        Alert.alert(
          'Link Copied!',
          `Smart link copied to clipboard.\n\n${smartLink.universalUrl}`,
          [
            { text: 'Close' },
            { text: 'Share Link', onPress: () => shareLink() }
          ]
        );
      } catch (error) {
        Alert.alert('Error', 'Could not copy link');
      }
    };

    const shareLink = async () => {
      try {
        const shareMessage = smartLinkService.generateSharingLink(automationData);
        await Share.share({
          title: automationTitle,
          message: shareMessage,
        });
      } catch (error) {
        Alert.alert('Share Failed', 'Could not share link');
      }
    };

    return (
      <View style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.header}>
              <Text style={styles.title}>Share Automation</Text>
              <Button onPress={onClose} mode="text" compact>
                Close
              </Button>
            </View>

            <View style={styles.automationInfo}>
              <Text style={styles.automationTitle}>{automationTitle}</Text>
              {automationDescription && (
                <Text style={styles.automationDescription}>{automationDescription}</Text>
              )}
              <View style={styles.meta}>
                <Chip icon="account" compact>{creator}</Chip>
                <Chip icon="qrcode" compact>QR Code</Chip>
              </View>
            </View>

            <View style={styles.qrContainer} ref={qrRef}>
              <Surface style={styles.qrSurface} elevation={4}>
                <QRCode
                  value={qrUrl}
                  size={currentSize}
                  backgroundColor="#ffffff"
                  color="#000000"
                  ecl={errorLevel as any}
                  quietZone={15}
                />
              </Surface>
            </View>

            <View style={styles.controls}>
              <Text style={styles.controlLabel}>Link Type</Text>
              <SegmentedButtons
                value={linkType}
                onValueChange={setLinkType}
                buttons={[
                  { value: 'smart', label: '🔗 Smart Link' },
                  { value: 'emergency', label: '🚨 Emergency' },
                ]}
                style={styles.segmentedButtons}
              />

              <Text style={styles.controlLabel}>Size</Text>
              <SegmentedButtons
                value={qrSize}
                onValueChange={setQrSize}
                buttons={[
                  { value: 'small', label: 'Small' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'large', label: 'Large' },
                ]}
                style={styles.segmentedButtons}
              />

              <Text style={styles.controlLabel}>Error Correction</Text>
              <SegmentedButtons
                value={errorLevel}
                onValueChange={setErrorLevel}
                buttons={[
                  { value: 'L', label: 'Low' },
                  { value: 'M', label: 'Med' },
                  { value: 'Q', label: 'High' },
                  { value: 'H', label: 'Max' },
                ]}
                style={styles.segmentedButtons}
              />
            </View>

            <View style={styles.actions}>
              <Button
                mode="contained"
                onPress={shareQR}
                icon="share"
                style={styles.actionButton}
                loading={isSharing}
                disabled={isSharing || isSaving}
              >
                {isSharing ? 'Sharing...' : 'Share QR Code'}
              </Button>
              <Button
                mode="outlined"
                onPress={saveQRToCameraRoll}
                icon="content-save"
                style={styles.actionButton}
                loading={isSaving}
                disabled={isSharing || isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Image'}
              </Button>
            </View>
            
            <View style={styles.secondaryActions}>
              <Button
                mode="text"
                onPress={copyLink}
                icon="link"
                compact
              >
                Copy Link
              </Button>
            </View>

            <View style={styles.info}>
              <Icon name="information" size={16} color="#666" />
              <Text style={styles.infoText}>
                {linkType === 'emergency' 
                  ? '🚨 Emergency QR codes work even without the app installed!' 
                  : '📱 Smart QR codes auto-open the app if installed, or redirect to web'
                }
              </Text>
            </View>
          </Card.Content>
        </Card>
      </View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
    },
    card: {
      maxHeight: '90%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: '600',
    },
    automationInfo: {
      alignItems: 'center',
      marginBottom: 20,
    },
    automationTitle: {
      fontSize: 18,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: 8,
    },
    automationDescription: {
      fontSize: 14,
      color: '#666',
      textAlign: 'center',
      marginBottom: 12,
    },
    meta: {
      flexDirection: 'row',
      gap: 8,
    },
    qrContainer: {
      alignItems: 'center',
      marginBottom: 20,
    },
    qrSurface: {
      padding: 20,
      borderRadius: 12,
      backgroundColor: '#ffffff',
    },
    controls: {
      marginBottom: 20,
    },
    controlLabel: {
      fontSize: 16,
      fontWeight: '500',
      marginBottom: 8,
      marginTop: 12,
    },
    segmentedButtons: {
      marginBottom: 8,
    },
    actions: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    actionButton: {
      flex: 1,
    },
    secondaryActions: {
      alignItems: 'center',
      marginBottom: 16,
    },
    info: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      backgroundColor: '#f5f5f5',
      borderRadius: 8,
    },
    infoText: {
      flex: 1,
      marginLeft: 8,
      fontSize: 14,
      color: '#666',
    },
  });

  export default QRGenerator;