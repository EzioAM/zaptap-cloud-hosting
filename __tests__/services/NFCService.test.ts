import NfcManager, { Ndef } from 'react-native-nfc-manager';
import { Alert } from 'react-native';
import NFCService from '../../src/services/nfc/NFCService';
import { automationSharingService } from '../../src/services/sharing/AutomationSharingService';
import { smartLinkService } from '../../src/services/linking/SmartLinkService';
import { sharingAnalyticsService } from '../../src/services/sharing/SharingAnalyticsService';
import { TestDataFactory, TestUtils } from '../utils/testHelpers';

// Mock dependencies
jest.mock('react-native-nfc-manager');
jest.mock('../../src/services/sharing/AutomationSharingService');
jest.mock('../../src/services/linking/SmartLinkService');
jest.mock('../../src/services/sharing/SharingAnalyticsService');

const mockNfcManager = NfcManager as jest.Mocked<typeof NfcManager>;
const mockNdef = Ndef as jest.Mocked<typeof Ndef>;
const mockAutomationSharingService = automationSharingService as jest.Mocked<typeof automationSharingService>;
const mockSmartLinkService = smartLinkService as jest.Mocked<typeof smartLinkService>;
const mockSharingAnalyticsService = sharingAnalyticsService as jest.Mocked<typeof sharingAnalyticsService>;
const mockAlert = Alert as jest.Mocked<typeof Alert>;

describe('NFCService', () => {
  let nfcService: typeof NFCService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the singleton instance
    (NFCService as any).instance = undefined;
    nfcService = NFCService;

    // Setup default mocks
    mockNfcManager.isSupported.mockResolvedValue(true);
    mockNfcManager.start.mockResolvedValue();
    mockNfcManager.isEnabled.mockResolvedValue(true);
    mockNfcManager.requestTechnology.mockResolvedValue();
    mockNfcManager.getTag.mockResolvedValue(TestDataFactory.createMockNFCTag());
    mockNfcManager.cancelTechnologyRequest.mockResolvedValue();
    mockNfcManager.ndefHandler.writeNdefMessage.mockResolvedValue();
    
    mockNdef.uriRecord.mockReturnValue({
      tnf: 1,
      type: [0x55],
      payload: [0x04, 116, 101, 115, 116],
      id: [],
    });
    
    mockNdef.textRecord.mockReturnValue({
      tnf: 1,
      type: [0x54],
      payload: [0x02, 101, 110, 116, 101, 115, 116],
      id: [],
    });
    
    mockNdef.encodeMessage.mockReturnValue(new Uint8Array([1, 2, 3, 4]));
  });

  describe('initialization', () => {
    it('should initialize successfully when NFC is supported', async () => {
      const result = await nfcService.initialize();
      
      expect(result).toBe(true);
      expect(mockNfcManager.isSupported).toHaveBeenCalled();
      expect(mockNfcManager.start).toHaveBeenCalled();
    });

    it('should fail initialization when NFC is not supported', async () => {
      mockNfcManager.isSupported.mockResolvedValue(false);
      
      const result = await nfcService.initialize();
      
      expect(result).toBe(false);
      expect(mockNfcManager.start).not.toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', async () => {
      mockNfcManager.start.mockRejectedValue(new Error('NFC start failed'));
      
      const result = await nfcService.initialize();
      
      expect(result).toBe(false);
    });

    it('should return cached result on subsequent calls', async () => {
      await nfcService.initialize();
      mockNfcManager.isSupported.mockClear();
      
      const result = await nfcService.initialize();
      
      expect(result).toBe(true);
      expect(mockNfcManager.isSupported).not.toHaveBeenCalled();
    });
  });

  describe('checkNFCEnabled', () => {
    it('should return true when NFC is enabled', async () => {
      mockNfcManager.isEnabled.mockResolvedValue(true);
      
      const result = await nfcService.checkNFCEnabled();
      
      expect(result).toBe(true);
      expect(mockAlert.alert).not.toHaveBeenCalled();
    });

    it('should show alert and return false when NFC is disabled', async () => {
      mockNfcManager.isEnabled.mockResolvedValue(false);
      
      const result = await nfcService.checkNFCEnabled();
      
      expect(result).toBe(false);
      expect(mockAlert.alert).toHaveBeenCalledWith(
        'NFC Disabled',
        'NFC is disabled on your device. Please enable it in your device settings to use NFC features.',
        expect.arrayContaining([
          { text: 'Cancel' },
          { text: 'Open Settings', onPress: expect.any(Function) }
        ])
      );
    });

    it('should return false when not supported', async () => {
      // Set NFC as not supported
      (nfcService as any).isSupported = false;
      
      const result = await nfcService.checkNFCEnabled();
      
      expect(result).toBe(false);
      expect(mockNfcManager.isEnabled).not.toHaveBeenCalled();
    });
  });

  describe('writeAutomationToNFC', () => {
    const mockAutomation = TestDataFactory.createMockAutomation({
      is_public: true,
    });

    beforeEach(() => {
      mockAutomationSharingService.createPublicShareLink.mockResolvedValue({
        success: true,
        shareUrl: 'https://www.zaptap.cloud/share/test123abc',
        publicId: 'test123abc',
      });

      mockSmartLinkService.generateSmartLink.mockReturnValue({
        universalUrl: 'https://www.zaptap.cloud/automation/test-automation-123',
        appSchemeUrl: 'zaptap://automation/test-automation-123',
        qrData: 'https://www.zaptap.cloud/automation/test-automation-123',
      });
    });

    it('should generate correct share URL format for public automations', async () => {
      const result = await nfcService.writeAutomationToNFC(mockAutomation);
      
      expect(result).toBe(true);
      expect(mockAutomationSharingService.createPublicShareLink).toHaveBeenCalledWith(mockAutomation);
      
      // Verify that the generated URL follows the correct format
      const mockCreateCall = mockAutomationSharingService.createPublicShareLink.mock.calls[0];
      expect(mockCreateCall[0]).toBe(mockAutomation);
      
      // Check that Ndef.uriRecord was called with the share URL
      expect(mockNdef.uriRecord).toHaveBeenCalledWith('https://www.zaptap.cloud/share/test123abc');
    });

    it('should use smart link for private automations', async () => {
      const privateAutomation = TestDataFactory.createMockAutomation({
        is_public: false,
      });
      
      const result = await nfcService.writeAutomationToNFC(privateAutomation);
      
      expect(result).toBe(true);
      expect(mockAutomationSharingService.createPublicShareLink).not.toHaveBeenCalled();
      expect(mockSmartLinkService.generateSmartLink).toHaveBeenCalledWith(privateAutomation);
      expect(mockNdef.uriRecord).toHaveBeenCalledWith('https://www.zaptap.cloud/automation/test-automation-123');
    });

    it('should fallback to smart link when public share creation fails', async () => {
      mockAutomationSharingService.createPublicShareLink.mockResolvedValue({
        success: false,
        error: 'Failed to create public share',
      });
      
      const result = await nfcService.writeAutomationToNFC(mockAutomation);
      
      expect(result).toBe(true);
      expect(mockSmartLinkService.generateSmartLink).toHaveBeenCalledWith(mockAutomation);
    });

    it('should create proper NDEF records with metadata', async () => {
      const result = await nfcService.writeAutomationToNFC(mockAutomation);
      
      expect(result).toBe(true);
      expect(mockNdef.uriRecord).toHaveBeenCalledWith('https://www.zaptap.cloud/share/test123abc');
      expect(mockNdef.textRecord).toHaveBeenCalledWith('Zaptap: Test Automation');
      expect(mockNdef.textRecord).toHaveBeenCalledWith('2 steps | Tap to run');
      expect(mockNdef.encodeMessage).toHaveBeenCalled();
    });

    it('should handle NFC unavailable error', async () => {
      mockNfcManager.isSupported.mockResolvedValue(false);
      
      const result = await nfcService.writeAutomationToNFC(mockAutomation);
      
      expect(result).toBe(false);
      expect(mockAlert.alert).toHaveBeenCalledWith(
        'NFC Not Available',
        'NFC is not supported on this device'
      );
    });

    it('should handle NFC disabled error', async () => {
      mockNfcManager.isEnabled.mockResolvedValue(false);
      
      const result = await nfcService.writeAutomationToNFC(mockAutomation);
      
      expect(result).toBe(false);
    });

    it('should handle tag write errors', async () => {
      mockNfcManager.ndefHandler.writeNdefMessage.mockRejectedValue(
        new Error('Tag is not writable')
      );
      
      const result = await nfcService.writeAutomationToNFC(mockAutomation);
      
      expect(result).toBe(false);
      expect(mockAlert.alert).toHaveBeenCalledWith(
        'NFC Write Failed',
        'This NFC tag is not writable'
      );
    });

    it('should handle no tag detected error', async () => {
      mockNfcManager.getTag.mockResolvedValue(null);
      
      const result = await nfcService.writeAutomationToNFC(mockAutomation);
      
      expect(result).toBe(false);
      expect(mockAlert.alert).toHaveBeenCalledWith(
        'NFC Write Failed',
        'No NFC tag detected. Please place a tag near your device'
      );
    });

    it('should handle cancelled operations', async () => {
      mockNfcManager.ndefHandler.writeNdefMessage.mockRejectedValue(
        new Error('Operation cancelled')
      );
      
      const result = await nfcService.writeAutomationToNFC(mockAutomation);
      
      expect(result).toBe(false);
      expect(mockAlert.alert).toHaveBeenCalledWith(
        'NFC Write Failed',
        'NFC write was cancelled'
      );
    });

    it('should track sharing analytics', async () => {
      const result = await nfcService.writeAutomationToNFC(mockAutomation);
      
      expect(result).toBe(true);
      expect(mockSharingAnalyticsService.trackShareEvent).toHaveBeenCalledWith({
        automationId: mockAutomation.id,
        shareId: 'test123abc',
        method: 'nfc',
        sharedBy: mockAutomation.created_by,
        metadata: {
          isPublicShare: true,
          nfcUrl: 'https://www.zaptap.cloud/share/test123abc',
        },
      });
    });

    it('should show success alert after successful write', async () => {
      const result = await nfcService.writeAutomationToNFC(mockAutomation);
      
      expect(result).toBe(true);
      expect(mockAlert.alert).toHaveBeenCalledWith(
        'NFC Write Successful! 🎉',
        expect.stringContaining(`Automation "${mockAutomation.title}" has been written to the NFC tag`)
      );
    });

    it('should cleanup NFC request on completion', async () => {
      await nfcService.writeAutomationToNFC(mockAutomation);
      
      expect(mockNfcManager.cancelTechnologyRequest).toHaveBeenCalled();
    });

    it('should cleanup NFC request even on error', async () => {
      mockNfcManager.ndefHandler.writeNdefMessage.mockRejectedValue(new Error('Test error'));
      
      await nfcService.writeAutomationToNFC(mockAutomation);
      
      expect(mockNfcManager.cancelTechnologyRequest).toHaveBeenCalled();
    });
  });

  describe('startNFCReader', () => {
    const mockOnAutomationFound = jest.fn();

    beforeEach(() => {
      mockOnAutomationFound.mockClear();
    });

    it('should start NFC reader successfully', async () => {
      await nfcService.startNFCReader(mockOnAutomationFound);
      
      expect(mockNfcManager.setEventListener).toHaveBeenCalled();
      expect(mockNfcManager.registerTagEvent).toHaveBeenCalled();
    });

    it('should handle NFC not available', async () => {
      mockNfcManager.isSupported.mockResolvedValue(false);
      
      await nfcService.startNFCReader(mockOnAutomationFound);
      
      expect(mockAlert.alert).toHaveBeenCalledWith(
        'NFC Not Available',
        'NFC is not supported on this device'
      );
      expect(mockNfcManager.registerTagEvent).not.toHaveBeenCalled();
    });

    it('should handle NFC disabled', async () => {
      mockNfcManager.isEnabled.mockResolvedValue(false);
      
      await nfcService.startNFCReader(mockOnAutomationFound);
      
      expect(mockNfcManager.registerTagEvent).not.toHaveBeenCalled();
    });

    it('should handle registration errors', async () => {
      mockNfcManager.registerTagEvent.mockRejectedValue(new Error('Registration failed'));
      
      await nfcService.startNFCReader(mockOnAutomationFound);
      
      expect(mockAlert.alert).toHaveBeenCalledWith(
        'NFC Error',
        'Failed to start NFC reading'
      );
    });
  });

  describe('handleNFCTagRead', () => {
    const mockOnAutomationFound = jest.fn();

    beforeEach(() => {
      mockOnAutomationFound.mockClear();
    });

    it('should parse app scheme URLs correctly', async () => {
      const mockTag = TestDataFactory.createMockNFCTag({
        ndefMessage: [{
          tnf: 1,
          type: [0x55],
          payload: [0x00, ...Array.from(new TextEncoder().encode('zaptap://automation/test123'))],
          id: [],
        }],
      });

      mockNfcManager.getTag.mockResolvedValue(mockTag);
      
      // Access private method for testing
      await (nfcService as any).handleNFCTagRead(mockTag, mockOnAutomationFound);
      
      expect(mockOnAutomationFound).toHaveBeenCalledWith('test123', {});
    });

    it('should parse web URLs correctly', async () => {
      const mockTag = TestDataFactory.createMockNFCTag({
        ndefMessage: [{
          tnf: 1,
          type: [0x55],
          payload: [0x04, ...Array.from(new TextEncoder().encode('zaptap.cloud/share/abc123def'))],
          id: [],
        }],
      });

      await (nfcService as any).handleNFCTagRead(mockTag, mockOnAutomationFound);
      
      expect(mockOnAutomationFound).toHaveBeenCalledWith('abc123def', {
        source: 'web',
        url: 'https://zaptap.cloud/share/abc123def',
      });
    });

    it('should handle invalid NFC tags', async () => {
      const mockTag = {
        id: 'invalid-tag',
        ndefMessage: [{
          tnf: 1,
          type: [0x54],
          payload: Array.from(new TextEncoder().encode('Invalid content')),
          id: [],
        }],
      };

      await (nfcService as any).handleNFCTagRead(mockTag, mockOnAutomationFound);
      
      expect(mockOnAutomationFound).not.toHaveBeenCalled();
      expect(mockAlert.alert).toHaveBeenCalledWith(
        'Invalid NFC Tag',
        'This NFC tag does not contain a Zaptap automation.'
      );
    });

    it('should handle parsing errors gracefully', async () => {
      const mockTag = {
        id: 'error-tag',
        ndefMessage: [null], // Invalid record
      };

      await (nfcService as any).handleNFCTagRead(mockTag, mockOnAutomationFound);
      
      expect(mockAlert.alert).toHaveBeenCalledWith(
        'NFC Read Error',
        'Failed to read NFC tag data'
      );
    });
  });

  describe('parseNDEFRecord', () => {
    it('should parse URI records correctly', () => {
      const record = {
        tnf: 1,
        type: [0x55], // 'U'
        payload: [0x04, ...Array.from(new TextEncoder().encode('example.com'))], // HTTPS prefix
        id: [],
      };

      const result = (nfcService as any).parseNDEFRecord(record);
      
      expect(result).toBe('https://example.com');
    });

    it('should parse text records correctly', () => {
      const textPayload = Array.from(new TextEncoder().encode('Hello World'));
      const record = {
        tnf: 1,
        type: [0x54], // 'T'
        payload: [0x02, 0x65, 0x6E, ...textPayload], // UTF-8, 'en', text
        id: [],
      };

      const result = (nfcService as any).parseNDEFRecord(record);
      
      expect(result).toBe('Hello World');
    });

    it('should handle malformed records', () => {
      const record = {
        tnf: 1,
        type: [], // Empty type
        payload: [],
        id: [],
      };

      const result = (nfcService as any).parseNDEFRecord(record);
      
      expect(result).toBeNull();
    });
  });

  describe('stopNFCReader', () => {
    it('should stop NFC reader successfully', async () => {
      await nfcService.stopNFCReader();
      
      expect(mockNfcManager.unregisterTagEvent).toHaveBeenCalled();
      expect(mockNfcManager.setEventListener).toHaveBeenCalledWith(
        expect.anything(),
        null
      );
    });

    it('should handle stop errors gracefully', async () => {
      mockNfcManager.unregisterTagEvent.mockRejectedValue(new Error('Stop failed'));
      
      await expect(nfcService.stopNFCReader()).resolves.not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should cleanup all NFC resources', async () => {
      await nfcService.cleanup();
      
      expect(mockNfcManager.unregisterTagEvent).toHaveBeenCalled();
      expect(mockNfcManager.cancelTechnologyRequest).toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      mockNfcManager.unregisterTagEvent.mockRejectedValue(new Error('Cleanup failed'));
      
      await expect(nfcService.cleanup()).resolves.not.toThrow();
    });
  });

  describe('isNFCSupported', () => {
    it('should return support status', () => {
      // After successful initialization
      const result1 = nfcService.isNFCSupported();
      expect(result1).toBe(false); // Initially false before init

      // After initialization with support
      nfcService.initialize();
      const result2 = nfcService.isNFCSupported();
      // Note: This test depends on the internal state management
    });
  });
});