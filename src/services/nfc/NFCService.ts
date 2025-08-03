import NfcManager, { 
  NfcTech, 
  Ndef, 
  NfcEvents, 
  TagEvent,
  NdefRecord 
} from 'react-native-nfc-manager';
import { Alert, Platform } from 'react-native';
import { AutomationData } from '../../types';
import { smartLinkService } from '../linking/SmartLinkService';
import { automationSharingService } from '../sharing/AutomationSharingService';
import { sharingAnalyticsService } from '../sharing/SharingAnalyticsService';

export interface NFCPayload {
  automationId: string;
  title: string;
  creator: string;
  timestamp: string;
}

export class NFCService {
  private static instance: NFCService;
  private isInitialized: boolean = false;
  private isSupported: boolean = false;

  private constructor() {}

  static getInstance(): NFCService {
    if (!NFCService.instance) {
      NFCService.instance = new NFCService();
    }
    return NFCService.instance;
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return this.isSupported;
    }

    try {
      // Check if NFC Manager is available
      if (!NfcManager) {
        console.log('NFC Manager not available');
        this.isSupported = false;
        this.isInitialized = true;
        return false;
      }

      // Initialize NFC Manager
      const supported = await NfcManager.isSupported();
      
      if (!supported) {
        console.log('NFC is not supported on this device');
        this.isSupported = false;
        this.isInitialized = true;
        return false;
      }

      await NfcManager.start();
      this.isSupported = true;
      this.isInitialized = true;
      
      console.log('NFC initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize NFC:', error);
      this.isSupported = false;
      this.isInitialized = true;
      return false;
    }
  }

  async checkNFCEnabled(): Promise<boolean> {
    try {
      if (!this.isSupported) {
        return false;
      }

      const enabled = await NfcManager.isEnabled();
      if (!enabled) {
        Alert.alert(
          'NFC Disabled',
          'NFC is disabled on your device. Please enable it in your device settings to use NFC features.',
          [
            { text: 'Cancel' },
            { 
              text: 'Open Settings', 
              onPress: () => NfcManager.goToNfcSetting() 
            }
          ]
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking NFC status:', error);
      return false;
    }
  }

  async writeAutomationToNFC(automation: AutomationData): Promise<boolean> {
    try {
      if (!await this.initialize()) {
        Alert.alert('NFC Not Available', 'NFC is not supported on this device');
        return false;
      }

      if (!await this.checkNFCEnabled()) {
        return false;
      }

      let smartUrl: string;
      
      // For public automations, create a public share link
      if (automation.is_public) {
        console.log('Creating public share link for NFC tag');
        const shareResult = await automationSharingService.createPublicShareLink(automation);
        
        if (shareResult.success && shareResult.shareUrl) {
          smartUrl = shareResult.shareUrl;
          console.log('Using public share URL for NFC:', smartUrl);
        } else {
          // Fallback to regular smart link
          const smartLink = smartLinkService.generateSmartLink(automation);
          smartUrl = smartLink.universalUrl;
          console.warn('Failed to create public share, using regular link:', smartUrl);
        }
      } else {
        // For private automations, use regular smart link
        const smartLink = smartLinkService.generateSmartLink(automation);
        smartUrl = smartLink.universalUrl;
        console.log('Using regular smart link for private automation:', smartUrl);
      }

      // Create NDEF records for better app detection
      // Primary: Web URL that triggers app if installed (Android App Links / iOS Universal Links)
      // Secondary: App scheme URL as fallback
      // Tertiary: Metadata about the automation
      const records = [];
      
      // Primary record: HTTPS URL (triggers app if installed via App Links/Universal Links)
      records.push(Ndef.uriRecord(smartUrl));
      
      // Add Android Application Record (AAR) to ensure app opens on Android
      if (Platform.OS === 'android') {
        // AAR helps Android know which app should handle this NFC tag
        const aarRecord = {
          tnf: 4, // TNF_EXTERNAL_TYPE
          type: Array.from(new TextEncoder().encode('android.com:pkg')),
          payload: Array.from(new TextEncoder().encode('com.zaptap.app')),
          id: []
        };
        records.push(aarRecord);
      }
      
      // Add descriptive text records
      records.push(Ndef.textRecord(`Zaptap: ${automation.title}`));
      records.push(Ndef.textRecord(`${automation.steps?.length || 0} steps | Tap to run`));
      
      const bytes = Ndef.encodeMessage(records);

      if (!bytes) {
        throw new Error('Failed to encode NFC message');
      }

      // Request NFC tag write
      await NfcManager.requestTechnology(NfcTech.Ndef);
      
      // Check if tag is writable
      const tag = await NfcManager.getTag();
      if (!tag) {
        throw new Error('No NFC tag detected');
      }

      // Write to tag
      await NfcManager.ndefHandler.writeNdefMessage(bytes);
      
      // Track NFC share event
      let shareId: string | undefined;
      if (automation.is_public && smartUrl.includes('/share/')) {
        // Extract share ID from URL
        const match = smartUrl.match(/\/share\/([^/?]+)/);
        shareId = match ? match[1] : undefined;
      }
      
      await sharingAnalyticsService.trackShareEvent({
        automationId: automation.id,
        shareId,
        method: 'nfc',
        sharedBy: automation.created_by || 'anonymous',
        metadata: {
          isPublicShare: !!shareId,
          nfcUrl: smartUrl
        }
      });
      
      Alert.alert(
        'NFC Write Successful! 🎉',
        `Automation "${automation.title}" has been written to the NFC tag.\n\n📱 Works with the app installed\n🌐 Also works without the app!\n\nAnyone can tap this tag to run your automation.`
      );

      return true;

    } catch (error: any) {
      console.error('NFC write error:', error);
      
      let errorMessage = 'Failed to write to NFC tag';
      if (error.message?.includes('cancelled')) {
        errorMessage = 'NFC write was cancelled';
      } else if (error.message?.includes('not writable')) {
        errorMessage = 'This NFC tag is not writable';
      } else if (error.message?.includes('No NFC tag')) {
        errorMessage = 'No NFC tag detected. Please place a tag near your device';
      }

      Alert.alert('NFC Write Failed', errorMessage);
      return false;
    } finally {
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (error) {
        console.log('Error cancelling NFC request:', error);
      }
    }
  }

  async startNFCReader(onAutomationFound: (automationId: string, metadata: any) => void): Promise<void> {
    try {
      if (!await this.initialize()) {
        Alert.alert('NFC Not Available', 'NFC is not supported on this device');
        return;
      }

      if (!await this.checkNFCEnabled()) {
        return;
      }

      // Register listener for NFC tag discovery
      const cleanupListener = NfcManager.setEventListener(NfcEvents.DiscoverTag, (tag: TagEvent) => {
        console.log('NFC tag discovered:', tag);
        this.handleNFCTagRead(tag, onAutomationFound);
      });

      // Start NFC scanning
      await NfcManager.registerTagEvent();

      return cleanupListener;

    } catch (error) {
      console.error('Failed to start NFC reader:', error);
      Alert.alert('NFC Error', 'Failed to start NFC reading');
    }
  }

  private async handleNFCTagRead(tag: TagEvent, onAutomationFound: (automationId: string, metadata: any) => void): Promise<void> {
    try {
      console.log('Parsing NFC tag with', tag.ndefMessage?.length, 'records');
      
      // Parse NDEF messages from the tag
      if (tag.ndefMessage && tag.ndefMessage.length > 0) {
        for (let i = 0; i < tag.ndefMessage.length; i++) {
          const record = tag.ndefMessage[i];
          console.log(`Record ${i}:`, {
            type: record.type,
            tnf: record.tnf,
            payloadLength: record.payload?.length
          });
          
          const payload = this.parseNDEFRecord(record);
          console.log(`Parsed payload ${i}:`, payload);
          
          if (payload) {
            // Check for app scheme URLs
            if (payload.startsWith('zaptap://automation/') || payload.startsWith('shortcuts-like://automation/')) {
              try {
                const url = new URL(payload);
                const automationId = url.pathname.replace('/automation/', '');
                const params = Object.fromEntries(url.searchParams);
                
                console.log('Found automation in NFC tag:', { automationId, params });
                
                // Stop scanning and callback
                await this.stopNFCReader();
                onAutomationFound(automationId, params);
                return;
              } catch (urlError) {
                console.error('Error parsing app scheme URL:', urlError);
              }
            }
            
            // Check for web URLs that might contain automation links
            if (payload.startsWith('http')) {
              try {
                const url = new URL(payload);
                console.log('Found web URL:', url.href);
                
                // Check if it's a zaptap.cloud, zaptap.app or shortcutslike.app link (with or without www)
                const validHostnames = ['zaptap.cloud', 'www.zaptap.cloud', 'zaptap.app', 'www.zaptap.app', 'shortcutslike.app', 'www.shortcutslike.app'];
                if (validHostnames.includes(url.hostname) && 
                    (url.pathname.includes('/automation/') || url.pathname.includes('/share/') || url.pathname.includes('/link/') || url.pathname.includes('/run/'))) {
                  
                  // Extract automation ID from web URL
                  const match = url.pathname.match(/\/(automation|share|link|run)\/([^/?]+)/);
                  if (match) {
                    const automationId = match[2];
                    console.log('Found automation in web URL:', automationId);
                    
                    // Stop scanning and callback
                    await this.stopNFCReader();
                    onAutomationFound(automationId, { source: 'web', url: payload });
                    return;
                  }
                }
              } catch (urlError) {
                console.error('Error parsing web URL:', urlError);
              }
            }
          }
        }
      }

      console.log('No valid automation found in NFC tag');
      Alert.alert(
        'Invalid NFC Tag',
        'This NFC tag does not contain a Zaptap automation.'
      );

    } catch (error) {
      console.error('Error parsing NFC tag:', error);
      Alert.alert('NFC Read Error', 'Failed to read NFC tag data');
    }
  }

  private parseNDEFRecord(record: NdefRecord): string | null {
    try {
      if (!record.type || !record.payload) {
        return null;
      }

      const typeArray = Array.from(record.type);
      const payloadArray = Array.from(record.payload);
      
      console.log('Parsing record type:', typeArray, 'payload length:', payloadArray.length);

      // Handle URI records (TNF = 1, type = 'U')
      if (record.tnf === 1 && typeArray.length === 1 && typeArray[0] === 0x55) {
        console.log('Found URI record');
        
        if (payloadArray.length === 0) return null;
        
        // First byte is URI identifier code
        const uriIdentifier = payloadArray[0];
        const uriData = payloadArray.slice(1);
        
        // Convert bytes to string
        let uriString = String.fromCharCode(...uriData);
        
        // Add prefix based on URI identifier
        const uriPrefixes = [
          '', // 0x00
          'http://www.', // 0x01
          'https://www.', // 0x02
          'http://', // 0x03
          'https://', // 0x04
          'tel:', // 0x05
          'mailto:', // 0x06
          'ftp://anonymous:anonymous@', // 0x07
          'ftp://ftp.', // 0x08
          'ftps://', // 0x09
          'sftp://', // 0x0A
          'smb://', // 0x0B
          'nfs://', // 0x0C
          'ftp://', // 0x0D
          'dav://', // 0x0E
          'news:', // 0x0F
          'telnet://', // 0x10
          'imap:', // 0x11
          'rtsp://', // 0x12
          'urn:', // 0x13
          'pop:', // 0x14
          'sip:', // 0x15
          'sips:', // 0x16
          'tftp:', // 0x17
          'btspp://', // 0x18
          'btl2cap://', // 0x19
          'btgoep://', // 0x1A
          'tcpobex://', // 0x1B
          'irdaobex://', // 0x1C
          'file://', // 0x1D
          'urn:epc:id:', // 0x1E
          'urn:epc:tag:', // 0x1F
          'urn:epc:pat:', // 0x20
          'urn:epc:raw:', // 0x21
          'urn:epc:', // 0x22
          'urn:nfc:', // 0x23
        ];
        
        if (uriIdentifier < uriPrefixes.length) {
          uriString = uriPrefixes[uriIdentifier] + uriString;
        }
        
        console.log('Parsed URI:', uriString);
        return uriString;
      }
      
      // Handle text records (TNF = 1, type = 'T')
      if (record.tnf === 1 && typeArray.length === 1 && typeArray[0] === 0x54) {
        console.log('Found text record');
        
        if (payloadArray.length === 0) return null;
        
        const statusByte = payloadArray[0];
        const languageCodeLength = statusByte & 0x3F;
        const isUTF16 = (statusByte & 0x80) !== 0;
        
        if (payloadArray.length < 1 + languageCodeLength) return null;
        
        const textData = payloadArray.slice(1 + languageCodeLength);
        
        if (isUTF16) {
          // Handle UTF-16 (pairs of bytes)
          const textString = String.fromCharCode(...textData);
          console.log('Parsed UTF-16 text:', textString);
          return textString;
        } else {
          // Handle UTF-8
          const textString = String.fromCharCode(...textData);
          console.log('Parsed UTF-8 text:', textString);
          return textString;
        }
      }
      
      // Handle well-known types
      if (record.tnf === 1) {
        const typeString = String.fromCharCode(...typeArray);
        console.log('Well-known type:', typeString);
        
        // Try to parse as raw text if other methods fail
        const rawText = String.fromCharCode(...payloadArray);
        console.log('Raw payload as text:', rawText);
        
        // Check if it looks like a URL
        if (rawText.includes('http') || rawText.includes('zaptap') || rawText.includes('shortcuts-like')) {
          return rawText;
        }
      }
      
    } catch (error) {
      console.error('Error parsing NDEF record:', error);
    }
    return null;
  }

  async stopNFCReader(): Promise<void> {
    try {
      await NfcManager.unregisterTagEvent();
      NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
    } catch (error) {
      console.error('Error stopping NFC reader:', error);
    }
  }

  async cleanup(): Promise<void> {
    try {
      await this.stopNFCReader();
      await NfcManager.cancelTechnologyRequest();
    } catch (error) {
      console.error('Error during NFC cleanup:', error);
    }
  }

  isNFCSupported(): boolean {
    return this.isSupported;
  }
}

export default NFCService.getInstance();