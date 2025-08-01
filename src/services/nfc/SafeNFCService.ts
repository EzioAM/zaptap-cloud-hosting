import { Alert } from 'react-native';
import { PlatformUtils } from '../../utils/Platform';
import { Logger } from '../../utils/Logger';

// Conditionally import NFC manager
let NfcManager: any = null;
let Ndef: any = null;

try {
  if (PlatformUtils.areNativeModulesAvailable()) {
    const nfcModule = require('react-native-nfc-manager');
    NfcManager = nfcModule.default || nfcModule;
    Ndef = nfcModule.Ndef;
  }
} catch (error) {
  console.log('NFC Manager not available, using fallback functionality');
}

/**
 * Safe NFC service that provides fallbacks when NFC is not available
 */
export class SafeNFCService {
  private logger: Logger;
  private isNFCAvailable: boolean;

  constructor() {
    this.logger = new Logger('SafeNFCService');
    this.isNFCAvailable = PlatformUtils.isNFCSupported();
  }

  async isSupported(): Promise<boolean> {
    if (!this.isNFCAvailable || !NfcManager) {
      return false;
    }

    try {
      return await NfcManager.isSupported();
    } catch (error) {
      this.logger.warn('NFC support check failed', { error });
      return false;
    }
  }

  async isEnabled(): Promise<boolean> {
    if (!this.isNFCAvailable || !NfcManager) {
      return false;
    }

    try {
      return await NfcManager.isEnabled();
    } catch (error) {
      this.logger.warn('NFC enabled check failed', { error });
      return false;
    }
  }

  async start(): Promise<boolean> {
    if (!this.isNFCAvailable || !NfcManager) {
      this.showNFCUnavailableAlert();
      return false;
    }

    try {
      await NfcManager.start();
      return true;
    } catch (error) {
      this.logger.error('NFC start failed', { error });
      Alert.alert('NFC Error', 'Failed to initialize NFC. Please check your device settings.');
      return false;
    }
  }

  async writeNdef(data: string): Promise<boolean> {
    if (!this.isNFCAvailable || !NfcManager || !Ndef) {
      this.showNFCUnavailableAlert();
      return false;
    }

    try {
      const bytes = Ndef.encodeMessage([Ndef.textRecord(data)]);
      await NfcManager.requestTechnology(NfcManager.NfcTech.Ndef);
      await NfcManager.writeNdefMessage(bytes);
      await NfcManager.cancelTechnologyRequest();
      
      return true;
    } catch (error) {
      this.logger.error('NFC write failed', { error });
      Alert.alert('NFC Write Failed', 'Unable to write to NFC tag. Please try again.');
      return false;
    }
  }

  async readNdef(): Promise<string | null> {
    if (!this.isNFCAvailable || !NfcManager || !Ndef) {
      this.showNFCUnavailableAlert();
      return null;
    }

    try {
      await NfcManager.requestTechnology(NfcManager.NfcTech.Ndef);
      const ndefMessage = await NfcManager.getNdefMessage();
      await NfcManager.cancelTechnologyRequest();

      if (ndefMessage && ndefMessage.length > 0) {
        const record = ndefMessage[0];
        return Ndef.text.decodePayload(record.payload);
      }
      
      return null;
    } catch (error) {
      this.logger.error('NFC read failed', { error });
      Alert.alert('NFC Read Failed', 'Unable to read NFC tag. Please try again.');
      return null;
    }
  }

  async cancelTechnologyRequest(): Promise<void> {
    if (!this.isNFCAvailable || !NfcManager) {
      return;
    }

    try {
      await NfcManager.cancelTechnologyRequest();
    } catch (error) {
      this.logger.warn('NFC cancel request failed', { error });
    }
  }

  private showNFCUnavailableAlert(): void {
    Alert.alert(
      'NFC Not Available',
      'NFC functionality is not available in this environment. To use NFC features, please create a development build of the app.',
      [
        { text: 'OK' },
        {
          text: 'Learn More',
          onPress: () => {
            // Could open documentation about development builds
            Alert.alert(
              'Development Build Required',
              'NFC requires native modules that are not available in Expo Go. You need to create a development build to use this feature.\n\nAlternatively, you can use QR codes for automation sharing.'
            );
          }
        }
      ]
    );
  }

  // Fallback methods for when NFC is not available
  async shareViaQR(data: string): Promise<boolean> {
    Alert.alert(
      'Share via QR Code',
      'NFC is not available. You can share this automation using a QR code instead.',
      [
        { text: 'Cancel' },
        {
          text: 'Generate QR',
          onPress: () => {
            // This would trigger QR code generation
            this.logger.info('QR code sharing requested', { data });
          }
        }
      ]
    );
    return true;
  }

  async scanQRInstead(): Promise<string | null> {
    Alert.alert(
      'Scan QR Code',
      'NFC scanning is not available. You can scan a QR code instead.',
      [
        { text: 'Cancel' },
        {
          text: 'Scan QR',
          onPress: () => {
            // This would trigger QR code scanning
            this.logger.info('QR code scanning requested');
          }
        }
      ]
    );
    return null;
  }

  // Check if we should show fallback options
  shouldShowFallbacks(): boolean {
    return !this.isNFCAvailable;
  }

  // Get user-friendly status message
  getStatusMessage(): string {
    if (!this.isNFCAvailable) {
      return 'NFC not available in this environment. Use QR codes instead.';
    }
    return 'NFC is available and ready to use.';
  }
}

// Export singleton instance
export const safeNFCService = new SafeNFCService();