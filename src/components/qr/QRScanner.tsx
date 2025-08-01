import React, { useState, useEffect } from 'react';
  import {
    View,
    StyleSheet,
    Alert,
    Linking,
    Vibration,
    Dimensions,
  } from 'react-native';
  import {
    Appbar,
    Text,
    Button,
    Surface,
    ActivityIndicator,
  } from 'react-native-paper';
  import { CameraView, Camera } from 'expo-camera';
  import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

  interface QRScannerProps {
    onScan: (automationId: string, metadata: any) => void;
    onClose: () => void;
  }

  const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
    const [scanning, setScanning] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);

    useEffect(() => {
      (async () => {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      })();
    }, []);

    const handleScan = (event: any) => {
      if (!scanning || processing) return;

      setScanning(false);
      setProcessing(true);

      // Vibrate on scan
      Vibration.vibrate(100);

      const scannedData = event.data;

      try {
        // Parse the deep link URL
        const url = new URL(scannedData);

        if ((url.protocol !== 'zaptap:' && url.protocol !== 'shortcuts-like:') || url.hostname !== 'automation') {
          throw new Error('Invalid QR code format');
        }

        const automationId = url.pathname.replace('/automation/', '');
        const params = Object.fromEntries(url.searchParams);

        Alert.alert(
          'Automation Found! 🤖',
          `Title: ${params.title || 'Unknown'}\nCreator: ${params.creator || 'Unknown'}\n\nDo you want to run this automation?`,
          [
            {
              text: 'Cancel',
              onPress: () => {
                setScanning(true);
                setProcessing(false);
              },
            },
            {
              text: 'Run Automation',
              onPress: () => {
                onScan(automationId, params);
                setProcessing(false);
              },
            },
          ]
        );

      } catch (error) {
        Alert.alert(
          'Invalid QR Code',
          'This QR code is not a valid Zaptap automation.',
          [
            {
              text: 'Try Again',
              onPress: () => {
                setScanning(true);
                setProcessing(false);
              },
            },
            {
              text: 'Cancel',
              onPress: onClose,
            },
          ]
        );
      }
    };

    const reactivateScanner = () => {
      setScanning(true);
      setProcessing(false);
    };

    if (hasPermission === null) {
      return (
        <View style={styles.container}>
          <Appbar.Header>
            <Appbar.BackAction onPress={onClose} />
            <Appbar.Content title="Scan QR Code" />
          </Appbar.Header>
          <View style={styles.permissionContainer}>
            <ActivityIndicator size="large" />
            <Text style={styles.permissionText}>Requesting camera permission...</Text>
          </View>
        </View>
      );
    }

    if (hasPermission === false) {
      return (
        <View style={styles.container}>
          <Appbar.Header>
            <Appbar.BackAction onPress={onClose} />
            <Appbar.Content title="Scan QR Code" />
          </Appbar.Header>
          <View style={styles.permissionContainer}>
            <Icon name="camera-off" size={64} color="#999" />
            <Text style={styles.permissionTitle}>Camera Permission Required</Text>
            <Text style={styles.permissionText}>
              Please allow camera access to scan QR codes
            </Text>
            <Button mode="contained" onPress={onClose} style={styles.scanButton}>
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
          <Appbar.Content title="Scan QR Code" />
        </Appbar.Header>

        <View style={styles.content}>
          <CameraView
            style={styles.camera}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
            onBarcodeScanned={scanning ? handleScan : undefined}
          />
          
          {/* Overlay content positioned absolutely */}
          <View style={styles.overlay}>
            <View style={styles.topContent}>
              <Text style={styles.instruction}>
                Position the QR code within the frame
              </Text>
            </View>

            <View style={styles.markerContainer}>
              <View style={styles.marker} />
            </View>

            <View style={styles.bottomContent}>
              {processing ? (
                <Surface style={styles.processingCard} elevation={2}>
                  <ActivityIndicator size="small" />
                  <Text style={styles.processingText}>Processing QR code...</Text>
                </Surface>
              ) : (
                <Surface style={styles.infoCard} elevation={2}>
                  <Icon name="qrcode-scan" size={24} color="#6200ee" />
                  <Text style={styles.infoText}>
                    Scan a Zaptap automation QR code
                  </Text>
                </Surface>
              )}

              {!scanning && !processing && (
                <Button
                  mode="contained"
                  onPress={reactivateScanner}
                  icon="qrcode-scan"
                  style={styles.scanButton}
                >
                  Scan Again
                </Button>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#000',
    },
    content: {
      flex: 1,
    },
    camera: {
      height: '100%',
    },
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1,
    },
    markerContainer: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: [{ translateX: -100 }, { translateY: -100 }],
    },
    marker: {
      width: 200,
      height: 200,
      borderColor: '#00ff00',
      borderWidth: 2,
      borderRadius: 10,
      backgroundColor: 'transparent',
    },
    permissionContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#fff',
      paddingHorizontal: 32,
    },
    permissionTitle: {
      fontSize: 24,
      fontWeight: '600',
      marginTop: 16,
      marginBottom: 8,
      textAlign: 'center',
      color: '#333',
    },
    permissionText: {
      fontSize: 16,
      textAlign: 'center',
      color: '#666',
      marginBottom: 24,
      lineHeight: 22,
    },
    topContent: {
      flex: 0.2,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'transparent',
    },
    instruction: {
      fontSize: 16,
      color: '#ffffff',
      textAlign: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
      padding: 16,
      borderRadius: 8,
      marginHorizontal: 32,
    },
    bottomContent: {
      flex: 0.3,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
      paddingBottom: 32,
    },
    infoCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      marginBottom: 16,
    },
    infoText: {
      flex: 1,
      marginLeft: 12,
      fontSize: 14,
      color: '#333',
    },
    processingCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      marginBottom: 16,
    },
    processingText: {
      marginLeft: 12,
      fontSize: 14,
      color: '#333',
    },
    scanButton: {
      minWidth: 150,
    },
  });

  export default QRScanner;