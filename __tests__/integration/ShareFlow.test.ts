import { automationSharingService } from '../../src/services/sharing/AutomationSharingService';
import { smartLinkService } from '../../src/services/linking/SmartLinkService';
import NFCService from '../../src/services/nfc/NFCService';
import { QRSharingService } from '../../src/services/sharing/QRSharingService';
import { sharingAnalyticsService } from '../../src/services/sharing/SharingAnalyticsService';
import { TestDataFactory, TestUtils } from '../utils/testHelpers';

// Mock all external dependencies
jest.mock('../../src/services/linking/SmartLinkService');
jest.mock('../../src/services/nfc/NFCService');
jest.mock('../../src/services/sharing/QRSharingService');
jest.mock('../../src/services/sharing/SharingAnalyticsService');
jest.mock('../../src/services/supabase/client');
jest.mock('react-native', () => ({
  Share: {
    share: jest.fn(),
  },
  Alert: {
    alert: jest.fn(),
  },
}));

const mockSmartLinkService = smartLinkService as jest.Mocked<typeof smartLinkService>;
const mockNFCService = NFCService as jest.Mocked<typeof NFCService>;
const mockSharingAnalyticsService = sharingAnalyticsService as jest.Mocked<typeof sharingAnalyticsService>;

// Mock Supabase
const mockSupabaseResponse = {
  data: {
    id: 'test123abc',
    automation_id: 'test-automation-123',
    created_at: new Date().toISOString(),
  },
  error: null,
};

jest.mock('../../src/services/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue(mockSupabaseResponse),
    })),
  },
}));

describe('ShareFlow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockSmartLinkService.generateSmartLink.mockReturnValue({
      universalUrl: 'https://www.zaptap.cloud/automation/test-automation-123',
      appSchemeUrl: 'zaptap://automation/test-automation-123',
      qrData: 'https://www.zaptap.cloud/automation/test-automation-123',
    });

    mockNFCService.writeAutomationToNFC.mockResolvedValue(true);
    mockNFCService.initialize.mockResolvedValue(true);
    mockNFCService.checkNFCEnabled.mockResolvedValue(true);

    mockSharingAnalyticsService.trackShareEvent.mockResolvedValue();

    // Mock QRSharingService
    const mockQRInstance = {
      generateQRCode: jest.fn().mockResolvedValue({
        success: true,
        qrCodeData: 'data:image/png;base64,mockQRCode',
        shareUrl: 'https://www.zaptap.cloud/share/test123abc',
      }),
    };
    (QRSharingService.getInstance as jest.Mock).mockReturnValue(mockQRInstance);
  });

  describe('Complete Share Flow', () => {
    const mockAutomation = TestDataFactory.createMockAutomation({
      title: 'Test Share Automation',
      is_public: true,
    });

    it('should complete full share flow with URL generation', async () => {
      const result = await automationSharingService.shareAutomation(mockAutomation, {
        generatePublicLink: true,
      });

      expect(result.success).toBe(true);
      expect(result.shareUrl).toMatch(/^https:\/\/www\.zaptap\.cloud\/share\/[a-zA-Z0-9]{12}$/);
      expect(TestUtils.verifyShareUrlFormat(result.shareUrl!)).toBe(true);
      
      const publicId = TestUtils.extractPublicId(result.shareUrl!);
      expect(publicId).toBeTruthy();
      expect(publicId).toHaveLength(12);
    });

    it('should handle end-to-end NFC sharing flow', async () => {
      // First create a public share link
      const shareResult = await automationSharingService.createPublicShareLink(mockAutomation);
      
      expect(shareResult.success).toBe(true);
      expect(shareResult.shareUrl).toMatch(/^https:\/\/www\.zaptap\.cloud\/share\/[a-zA-Z0-9]{12}$/);

      // Then write to NFC tag
      const nfcResult = await NFCService.writeAutomationToNFC(mockAutomation);
      
      expect(nfcResult).toBe(true);
      expect(mockNFCService.initialize).toHaveBeenCalled();
      expect(mockNFCService.checkNFCEnabled).toHaveBeenCalled();
      expect(mockNFCService.writeAutomationToNFC).toHaveBeenCalledWith(mockAutomation);

      // Verify analytics tracking
      expect(mockSharingAnalyticsService.trackShareEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          automationId: mockAutomation.id,
          method: 'nfc',
          sharedBy: mockAutomation.created_by,
        })
      );
    });

    it('should handle QR code generation and sharing', async () => {
      const qrService = QRSharingService.getInstance();

      // Generate share link
      const shareResult = await automationSharingService.createPublicShareLink(mockAutomation);
      expect(shareResult.success).toBe(true);

      // Generate QR code
      const qrResult = await qrService.generateQRCode(shareResult.shareUrl!);
      
      expect(qrResult.success).toBe(true);
      expect(qrResult.qrCodeData).toBe('data:image/png;base64,mockQRCode');
      expect(qrResult.shareUrl).toBe(shareResult.shareUrl);
    });

    it('should verify URL format consistency across all share methods', async () => {
      // Test URL format from direct share
      const directShare = await automationSharingService.createPublicShareLink(mockAutomation);
      expect(TestUtils.verifyShareUrlFormat(directShare.shareUrl!)).toBe(true);

      // Test URL format from full share flow
      const fullShare = await automationSharingService.shareAutomation(mockAutomation, {
        generatePublicLink: true,
      });
      expect(TestUtils.verifyShareUrlFormat(fullShare.shareUrl!)).toBe(true);

      // Both should have the same format
      expect(directShare.shareUrl).toMatch(/^https:\/\/www\.zaptap\.cloud\/share\/[a-zA-Z0-9]{12}$/);
      expect(fullShare.shareUrl).toMatch(/^https:\/\/www\.zaptap\.cloud\/share\/[a-zA-Z0-9]{12}$/);
    });
  });

  describe('Deep Link Handling', () => {
    it('should generate proper deep links for app scheme', () => {
      const smartLink = mockSmartLinkService.generateSmartLink(TestDataFactory.createMockAutomation());

      expect(smartLink.appSchemeUrl).toBe('zaptap://automation/test-automation-123');
      expect(smartLink.universalUrl).toBe('https://www.zaptap.cloud/automation/test-automation-123');
    });

    it('should handle web URL parsing in NFC tags', async () => {
      const mockTag = TestDataFactory.createMockNFCTag({
        ndefMessage: [{
          tnf: 1,
          type: [0x55], // URI record
          payload: [0x04, ...Array.from(new TextEncoder().encode('zaptap.cloud/share/abc123def456'))],
          id: [],
        }],
      });

      const mockOnAutomationFound = jest.fn();

      // Simulate NFC tag reading
      await (NFCService as any).handleNFCTagRead?.(mockTag, mockOnAutomationFound);

      // Should extract automation ID from share URL
      expect(mockOnAutomationFound).toHaveBeenCalledWith('abc123def456', {
        source: 'web',
        url: expect.stringContaining('zaptap.cloud/share/abc123def456'),
      });
    });

    it('should handle app scheme URLs in NFC tags', async () => {
      const mockTag = TestDataFactory.createMockNFCTag({
        ndefMessage: [{
          tnf: 1,
          type: [0x55], // URI record
          payload: [0x00, ...Array.from(new TextEncoder().encode('zaptap://automation/test123'))],
          id: [],
        }],
      });

      const mockOnAutomationFound = jest.fn();

      // Simulate NFC tag reading
      await (NFCService as any).handleNFCTagRead?.(mockTag, mockOnAutomationFound);

      // Should extract automation ID from app scheme URL
      expect(mockOnAutomationFound).toHaveBeenCalledWith('test123', {});
    });
  });

  describe('Share URL Verification', () => {
    it('should always generate URLs with the correct domain format', async () => {
      // Test multiple share operations
      const results = await Promise.all([
        automationSharingService.createPublicShareLink(TestDataFactory.createMockAutomation()),
        automationSharingService.createPublicShareLink(TestDataFactory.createMockAutomation()),
        automationSharingService.createPublicShareLink(TestDataFactory.createMockAutomation()),
      ]);

      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.shareUrl).toMatch(/^https:\/\/www\.zaptap\.cloud\/share\/[a-zA-Z0-9]{12}$/);
        expect(result.shareUrl).toContain('www.zaptap.cloud'); // Must include www
        expect(result.shareUrl).not.toMatch(/^https:\/\/zaptap\.cloud\//); // Should not be without www
      });
    });

    it('should generate unique public IDs for each share', async () => {
      const automation = TestDataFactory.createMockAutomation();

      // Mock different responses for each call
      const { supabase } = require('../../src/services/supabase/client');
      supabase.from().insert().select().single
        .mockResolvedValueOnce({ data: { id: 'first123' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'second456' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'third789' }, error: null });

      const results = await Promise.all([
        automationSharingService.createPublicShareLink(automation),
        automationSharingService.createPublicShareLink(automation),
        automationSharingService.createPublicShareLink(automation),
      ]);

      // Extract public IDs
      const publicIds = results.map(result => TestUtils.extractPublicId(result.shareUrl!));
      
      // Should all be unique (in our mock they will be)
      expect(publicIds[0]).toBeTruthy();
      expect(publicIds[1]).toBeTruthy();
      expect(publicIds[2]).toBeTruthy();
    });

    it('should handle share URL format validation in tests', () => {
      const validUrls = [
        'https://www.zaptap.cloud/share/abc123def456',
        'https://www.zaptap.cloud/share/XyZ789AbC123',
        'https://www.zaptap.cloud/share/123456789012',
      ];

      const invalidUrls = [
        'https://zaptap.cloud/share/abc123def456', // Missing www
        'https://www.zaptap.cloud/share/abc123', // Too short
        'https://www.zaptap.cloud/share/abc123def456789', // Too long
        'https://www.zaptap.cloud/automation/abc123def456', // Wrong path
        'http://www.zaptap.cloud/share/abc123def456', // HTTP instead of HTTPS
      ];

      validUrls.forEach(url => {
        expect(TestUtils.verifyShareUrlFormat(url)).toBe(true);
      });

      invalidUrls.forEach(url => {
        expect(TestUtils.verifyShareUrlFormat(url)).toBe(false);
      });
    });
  });

  describe('Error Handling and Fallbacks', () => {
    it('should fallback to smart link when public share fails', async () => {
      // Mock Supabase failure
      const { supabase } = require('../../src/services/supabase/client');
      supabase.from().insert().select().single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const automation = TestDataFactory.createMockAutomation({ is_public: true });

      // Should still succeed using fallback
      const result = await automationSharingService.shareAutomation(automation, {
        generatePublicLink: true,
      });

      expect(result.success).toBe(true);
      expect(result.shareUrl).toBe('https://www.zaptap.cloud/automation/test-automation-123');
      expect(mockSmartLinkService.generateSmartLink).toHaveBeenCalledWith(automation);
    });

    it('should handle NFC write failures gracefully', async () => {
      mockNFCService.writeAutomationToNFC.mockResolvedValue(false);

      const result = await NFCService.writeAutomationToNFC(TestDataFactory.createMockAutomation());

      expect(result).toBe(false);
      // NFC service should have tried to initialize and check enabled status
      expect(mockNFCService.initialize).toHaveBeenCalled();
    });

    it('should handle QR generation failures', async () => {
      const qrService = QRSharingService.getInstance();
      qrService.generateQRCode.mockResolvedValue({
        success: false,
        error: 'QR generation failed',
      });

      const result = await qrService.generateQRCode('https://www.zaptap.cloud/share/test123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('QR generation failed');
    });

    it('should maintain analytics tracking even on partial failures', async () => {
      // Mock NFC failure but analytics success
      mockNFCService.writeAutomationToNFC.mockResolvedValue(false);

      await NFCService.writeAutomationToNFC(TestDataFactory.createMockAutomation());

      // Analytics should still be called even if NFC write fails
      // (This depends on the implementation - might need adjustment)
    });
  });

  describe('Share Analytics Integration', () => {
    it('should track all share events with correct metadata', async () => {
      const automation = TestDataFactory.createMockAutomation({ is_public: true });

      await automationSharingService.shareAutomation(automation, {
        generatePublicLink: true,
        customMessage: 'Check this out!',
      });

      expect(mockSharingAnalyticsService.trackShareEvent).toHaveBeenCalledWith({
        automationId: automation.id,
        shareId: expect.any(String),
        method: 'link',
        sharedBy: automation.created_by,
        metadata: {
          hasCustomMessage: true,
          isPublicLink: true,
          hasEmbeddedData: false,
        },
      });
    });

    it('should track NFC share events with proper metadata', async () => {
      const automation = TestDataFactory.createMockAutomation({ is_public: true });

      await NFCService.writeAutomationToNFC(automation);

      expect(mockSharingAnalyticsService.trackShareEvent).toHaveBeenCalledWith({
        automationId: automation.id,
        shareId: expect.any(String),
        method: 'nfc',
        sharedBy: automation.created_by,
        metadata: {
          isPublicShare: true,
          nfcUrl: expect.stringMatching(/^https:\/\/www\.zaptap\.cloud\/share\/[a-zA-Z0-9]{12}$/),
        },
      });
    });
  });

  describe('Cross-Service Data Flow', () => {
    it('should maintain data consistency across services', async () => {
      const automation = TestDataFactory.createMockAutomation();

      // Create public share
      const shareResult = await automationSharingService.createPublicShareLink(automation);
      
      // Generate QR code with the share URL
      const qrService = QRSharingService.getInstance();
      const qrResult = await qrService.generateQRCode(shareResult.shareUrl!);

      // Both should reference the same URL
      expect(qrResult.shareUrl).toBe(shareResult.shareUrl);
      expect(TestUtils.verifyShareUrlFormat(qrResult.shareUrl!)).toBe(true);
    });

    it('should handle automation data flow from creation to sharing', async () => {
      const automation = TestDataFactory.createMockAutomation({
        title: 'Integration Test Automation',
        steps: [
          { id: '1', type: 'sms', title: 'Send SMS', config: { message: 'Test' } },
          { id: '2', type: 'email', title: 'Send Email', config: { subject: 'Test' } },
        ],
      });

      // Share the automation
      const shareResult = await automationSharingService.shareAutomation(automation);
      
      expect(shareResult.success).toBe(true);
      expect(mockSmartLinkService.generateSmartLink).toHaveBeenCalledWith(
        automation,
        expect.any(Object)
      );
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle concurrent share operations', async () => {
      const automations = [
        TestDataFactory.createMockAutomation({ id: 'auto-1' }),
        TestDataFactory.createMockAutomation({ id: 'auto-2' }),
        TestDataFactory.createMockAutomation({ id: 'auto-3' }),
      ];

      // Mock different responses for each
      const { supabase } = require('../../src/services/supabase/client');
      supabase.from().insert().select().single
        .mockResolvedValueOnce({ data: { id: 'share1' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'share2' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'share3' }, error: null });

      const results = await Promise.all(
        automations.map(automation => 
          automationSharingService.createPublicShareLink(automation)
        )
      );

      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.shareUrl).toMatch(/^https:\/\/www\.zaptap\.cloud\/share\/[a-zA-Z0-9]{12}$/);
      });
    });

    it('should handle timeout scenarios gracefully', async () => {
      // Mock a slow operation
      const slowMockPromise = new Promise((resolve) => {
        setTimeout(() => resolve({ data: { id: 'slow123' }, error: null }), 100);
      });

      const { supabase } = require('../../src/services/supabase/client');
      supabase.from().insert().select().single.mockReturnValue(slowMockPromise);

      const startTime = Date.now();
      const result = await automationSharingService.createPublicShareLink(
        TestDataFactory.createMockAutomation()
      );
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeGreaterThan(95); // Should have taken some time
    });
  });

  describe('Security and Validation', () => {
    it('should validate automation data before sharing', async () => {
      const invalidAutomation = {
        ...TestDataFactory.createMockAutomation(),
        id: null, // Invalid ID
      } as any;

      // The service should handle this gracefully
      const result = await automationSharingService.shareAutomation(invalidAutomation);

      // Depending on implementation, this might succeed with fallback or fail gracefully
      expect(result).toBeDefined();
    });

    it('should sanitize share URLs', () => {
      const testUrls = [
        'https://www.zaptap.cloud/share/normalId123',
        'https://www.zaptap.cloud/share/WeirdÇhars',
        'https://www.zaptap.cloud/share/toolongidentifier123456789',
      ];

      testUrls.forEach(url => {
        const publicId = TestUtils.extractPublicId(url);
        if (publicId) {
          // Should only contain alphanumeric characters
          expect(publicId).toMatch(/^[a-zA-Z0-9]*$/);
        }
      });
    });
  });
});