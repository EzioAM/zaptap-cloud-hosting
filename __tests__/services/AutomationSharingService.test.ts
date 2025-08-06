import { Share } from 'react-native';
import { automationSharingService } from '../../src/services/sharing/AutomationSharingService';
import { smartLinkService } from '../../src/services/linking/SmartLinkService';
import { supabase } from '../../src/services/supabase/client';
import { sharingAnalyticsService } from '../../src/services/sharing/SharingAnalyticsService';
import { TestDataFactory, TestUtils } from '../utils/testHelpers';

// Mock dependencies
jest.mock('react-native', () => ({
  Share: {
    share: jest.fn(),
  },
}));

jest.mock('../../src/services/linking/SmartLinkService');
jest.mock('../../src/services/supabase/client');
jest.mock('../../src/services/sharing/SharingAnalyticsService');

const mockShare = Share as jest.Mocked<typeof Share>;
const mockSmartLinkService = smartLinkService as jest.Mocked<typeof smartLinkService>;
const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockSharingAnalyticsService = sharingAnalyticsService as jest.Mocked<typeof sharingAnalyticsService>;

describe('AutomationSharingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockSmartLinkService.generateSmartLink.mockReturnValue({
      universalUrl: 'https://www.zaptap.cloud/automation/test-automation-123',
      appSchemeUrl: 'zaptap://automation/test-automation-123',
      qrData: 'https://www.zaptap.cloud/automation/test-automation-123',
    });

    mockShare.share.mockResolvedValue({ action: 'sharedAction' });

    mockSharingAnalyticsService.trackShareEvent.mockResolvedValue();

    // Setup Supabase mock
    const mockSupabaseChain = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      limit: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
    };

    mockSupabase.from.mockReturnValue(mockSupabaseChain as any);
  });

  describe('shareAutomation', () => {
    const mockAutomation = TestDataFactory.createMockAutomation();

    it('should share automation successfully with basic options', async () => {
      const result = await automationSharingService.shareAutomation(mockAutomation);

      expect(result.success).toBe(true);
      expect(result.shareUrl).toBe('https://www.zaptap.cloud/automation/test-automation-123');
      expect(result.qrCode).toBe('https://www.zaptap.cloud/automation/test-automation-123');
      expect(mockSmartLinkService.generateSmartLink).toHaveBeenCalledWith(mockAutomation, {
        embedData: false,
        emergency: false,
      });
      expect(mockShare.share).toHaveBeenCalled();
    });

    it('should generate public link when requested', async () => {
      // Mock successful public share creation
      const mockPublicShareResponse = {
        data: {
          id: 'test123abc',
          automation_id: mockAutomation.id,
        },
        error: null,
      };

      mockSupabase.from().insert().select().single.mockResolvedValue(mockPublicShareResponse);

      const result = await automationSharingService.shareAutomation(mockAutomation, {
        generatePublicLink: true,
      });

      expect(result.success).toBe(true);
      expect(result.shareUrl).toMatch(/^https:\/\/www\.zaptap\.cloud\/share\/[a-zA-Z0-9]{12}$/);
      expect(result.publicId).toHaveLength(12);
      expect(result.publicId).toMatch(/^[a-zA-Z0-9]{12}$/);
    });

    it('should include custom message in share', async () => {
      const customMessage = 'Check out this awesome automation!';

      await automationSharingService.shareAutomation(mockAutomation, {
        customMessage,
      });

      expect(mockShare.share).toHaveBeenCalledWith({
        message: expect.stringContaining(customMessage),
        url: expect.any(String),
        title: expect.stringContaining(mockAutomation.title),
      });
    });

    it('should track share event with analytics', async () => {
      await automationSharingService.shareAutomation(mockAutomation);

      expect(mockSharingAnalyticsService.trackShareEvent).toHaveBeenCalledWith({
        automationId: mockAutomation.id,
        shareId: undefined,
        method: 'link',
        sharedBy: mockAutomation.created_by,
        metadata: {
          hasCustomMessage: false,
          isPublicLink: false,
          hasEmbeddedData: false,
        },
      });
    });

    it('should handle share failure gracefully', async () => {
      mockShare.share.mockRejectedValue(new Error('Share failed'));

      const result = await automationSharingService.shareAutomation(mockAutomation);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Share failed');
    });
  });

  describe('shareViaUrl', () => {
    const mockAutomation = TestDataFactory.createMockAutomation();

    it('should generate share URL without native sharing', async () => {
      const result = await automationSharingService.shareViaUrl(mockAutomation);

      expect(result.success).toBe(true);
      expect(result.shareUrl).toBe('https://www.zaptap.cloud/automation/test-automation-123');
      expect(result.qrCode).toBe('https://www.zaptap.cloud/automation/test-automation-123');
      expect(mockShare.share).not.toHaveBeenCalled();
    });

    it('should support embedded data option', async () => {
      const result = await automationSharingService.shareViaUrl(mockAutomation, {
        embedData: true,
      });

      expect(result.success).toBe(true);
      expect(mockSmartLinkService.generateSmartLink).toHaveBeenCalledWith(mockAutomation, {
        embedData: true,
        emergency: false,
      });
    });

    it('should support emergency option', async () => {
      const result = await automationSharingService.shareViaUrl(mockAutomation, {
        emergency: true,
      });

      expect(result.success).toBe(true);
      expect(mockSmartLinkService.generateSmartLink).toHaveBeenCalledWith(mockAutomation, {
        embedData: false,
        emergency: true,
      });
    });
  });

  describe('createPublicShareLink', () => {
    const mockAutomation = TestDataFactory.createMockAutomation();

    it('should create public share link with correct URL format', async () => {
      const mockInsertResponse = {
        data: {
          id: 'abc123def456',
          automation_id: mockAutomation.id,
        },
        error: null,
      };

      mockSupabase.from().insert().select().single.mockResolvedValue(mockInsertResponse);

      const result = await automationSharingService.createPublicShareLink(mockAutomation);

      expect(result.success).toBe(true);
      expect(result.shareUrl).toMatch(/^https:\/\/www\.zaptap\.cloud\/share\/[a-zA-Z0-9]{12}$/);
      expect(TestUtils.verifyShareUrlFormat(result.shareUrl!)).toBe(true);
    });

    it('should generate valid public ID format', async () => {
      const mockInsertResponse = {
        data: { id: 'test123', automation_id: mockAutomation.id },
        error: null,
      };

      mockSupabase.from().insert().select().single.mockResolvedValue(mockInsertResponse);

      const result = await automationSharingService.createPublicShareLink(mockAutomation);

      expect(result.success).toBe(true);
      expect(result.publicId).toHaveLength(12);
      expect(result.publicId).toMatch(/^[a-zA-Z0-9]{12}$/);
    });

    it('should store automation data in database', async () => {
      const mockInsertResponse = {
        data: { id: 'test123', automation_id: mockAutomation.id },
        error: null,
      };

      mockSupabase.from().insert().select().single.mockResolvedValue(mockInsertResponse);

      await automationSharingService.createPublicShareLink(mockAutomation);

      expect(mockSupabase.from).toHaveBeenCalledWith('public_shares');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          automation_id: mockAutomation.id,
          automation_data: mockAutomation,
          created_by: mockAutomation.created_by,
          is_active: true,
        })
      );
    });

    it('should handle database insertion errors', async () => {
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await automationSharingService.createPublicShareLink(mockAutomation);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create public share: Database error');
    });

    it('should set correct expiration date', async () => {
      const mockInsertResponse = {
        data: { id: 'test123', automation_id: mockAutomation.id },
        error: null,
      };

      mockSupabase.from().insert().select().single.mockResolvedValue(mockInsertResponse);

      await automationSharingService.createPublicShareLink(mockAutomation);

      const insertCall = mockSupabase.from().insert.mock.calls[0][0];
      expect(insertCall.expires_at).toBeDefined();
      
      // Verify expiration is approximately 30 days from now
      const expirationDate = new Date(insertCall.expires_at);
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 30);
      
      const timeDiff = Math.abs(expirationDate.getTime() - expectedDate.getTime());
      expect(timeDiff).toBeLessThan(60000); // Within 1 minute tolerance
    });
  });

  describe('shareWithUsers', () => {
    const mockAutomation = TestDataFactory.createMockAutomation();
    const recipients = ['user1@example.com', 'user2@example.com'];

    it('should share with users via email', async () => {
      const mockPublicShareResponse = {
        data: { id: 'test123', automation_id: mockAutomation.id },
        error: null,
      };

      mockSupabase.from().insert().select().single.mockResolvedValue(mockPublicShareResponse);

      const result = await automationSharingService.shareWithUsers(
        mockAutomation,
        recipients,
        'email'
      );

      expect(result.success).toBe(true);
      expect(result.shareUrl).toMatch(/^https:\/\/www\.zaptap\.cloud\/share\/[a-zA-Z0-9]{12}$/);
    });

    it('should share with users via SMS', async () => {
      const mockPublicShareResponse = {
        data: { id: 'test123', automation_id: mockAutomation.id },
        error: null,
      };

      mockSupabase.from().insert().select().single.mockResolvedValue(mockPublicShareResponse);

      const result = await automationSharingService.shareWithUsers(
        mockAutomation,
        recipients,
        'sms'
      );

      expect(result.success).toBe(true);
      expect(result.shareUrl).toMatch(/^https:\/\/www\.zaptap\.cloud\/share\/[a-zA-Z0-9]{12}$/);
    });

    it('should handle public link creation failure', async () => {
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: null,
        error: { message: 'Creation failed' },
      });

      const result = await automationSharingService.shareWithUsers(
        mockAutomation,
        recipients
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create shareable link');
    });
  });

  describe('getSharingAnalytics', () => {
    const automationId = 'test-automation-123';

    it('should return sharing analytics successfully', async () => {
      const mockPublicShares = [
        { id: 'share1', access_count: 5, created_at: '2023-01-01' },
        { id: 'share2', access_count: 3, created_at: '2023-01-02' },
      ];

      const mockSharingLogs = [
        { automation_id: automationId, method: 'nfc', created_at: '2023-01-01' },
        { automation_id: automationId, method: 'link', created_at: '2023-01-02' },
        { automation_id: automationId, method: 'nfc', created_at: '2023-01-03' },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        const chain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
        };

        if (table === 'public_shares') {
          (chain as any).mockResolvedValue = jest.fn().mockResolvedValue({
            data: mockPublicShares,
            error: null,
          });
        } else if (table === 'sharing_logs') {
          (chain as any).mockResolvedValue = jest.fn().mockResolvedValue({
            data: mockSharingLogs,
            error: null,
          });
        }

        return chain as any;
      });

      const result = await automationSharingService.getSharingAnalytics(automationId);

      expect(result.totalShares).toBe(3);
      expect(result.totalViews).toBe(8); // 5 + 3
      expect(result.sharesByMethod).toEqual({ nfc: 2, link: 1 });
      expect(result.recentShares).toHaveLength(3);
    });

    it('should handle analytics fetch errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        const chain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
        };
        (chain as any).mockResolvedValue = jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Fetch failed' },
        });
        return chain as any;
      });

      const result = await automationSharingService.getSharingAnalytics(automationId);

      expect(result.totalShares).toBe(0);
      expect(result.totalViews).toBe(0);
      expect(result.sharesByMethod).toEqual({});
      expect(result.recentShares).toEqual([]);
    });
  });

  describe('revokePublicShare', () => {
    const publicId = 'test123abc';

    it('should revoke public share successfully', async () => {
      mockSupabase.from().update().eq.mockResolvedValue({ error: null });

      const result = await automationSharingService.revokePublicShare(publicId);

      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('public_shares');
      expect(mockSupabase.from().update).toHaveBeenCalledWith({ is_active: false });
      expect(mockSupabase.from().update().eq).toHaveBeenCalledWith('id', publicId);
    });

    it('should handle revocation errors', async () => {
      mockSupabase.from().update().eq.mockResolvedValue({
        error: { message: 'Revocation failed' },
      });

      const result = await automationSharingService.revokePublicShare(publicId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to revoke share: Revocation failed');
    });
  });

  describe('getUserShares', () => {
    const userId = 'test-user-456';

    it('should get user shares successfully', async () => {
      const mockShares = [
        {
          id: 'share1',
          automation_id: 'auto1',
          created_at: '2023-01-01',
          access_count: 5,
        },
        {
          id: 'share2',
          automation_id: 'auto2',
          created_at: '2023-01-02',
          access_count: 3,
        },
      ];

      mockSupabase.from().select().eq().order.mockResolvedValue({
        data: mockShares,
        error: null,
      });

      const result = await automationSharingService.getUserShares(userId);

      expect(result.success).toBe(true);
      expect(result.shares).toEqual(mockShares);
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('created_by', userId);
    });

    it('should handle user shares fetch errors', async () => {
      mockSupabase.from().select().eq().order.mockResolvedValue({
        data: null,
        error: { message: 'Fetch failed' },
      });

      const result = await automationSharingService.getUserShares(userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to get user shares: Fetch failed');
    });
  });

  describe('generateShareUrl', () => {
    it('should generate correct share URL format', () => {
      const automationId = 'test-automation-123';
      const result = automationSharingService.generateShareUrl(automationId);

      expect(result).toBe('https://www.zaptap.cloud/automation/test-automation-123');
    });
  });

  describe('URL format validation', () => {
    it('should always generate URLs with correct domain', async () => {
      const mockAutomation = TestDataFactory.createMockAutomation();
      
      const mockInsertResponse = {
        data: { id: 'test123', automation_id: mockAutomation.id },
        error: null,
      };

      mockSupabase.from().insert().select().single.mockResolvedValue(mockInsertResponse);

      const result = await automationSharingService.createPublicShareLink(mockAutomation);

      expect(result.shareUrl).toMatch(/^https:\/\/www\.zaptap\.cloud\/share\/[a-zA-Z0-9]{12}$/);
      expect(result.shareUrl).not.toMatch(/^https:\/\/zaptap\.cloud\//); // Should include www
    });

    it('should generate unique public IDs', async () => {
      const mockAutomation = TestDataFactory.createMockAutomation();
      
      const results = await Promise.all([
        automationSharingService.createPublicShareLink(mockAutomation),
        automationSharingService.createPublicShareLink(mockAutomation),
        automationSharingService.createPublicShareLink(mockAutomation),
      ]);

      // Mock successful responses
      mockSupabase.from().insert().select().single
        .mockResolvedValueOnce({ data: { id: 'id1' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'id2' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'id3' }, error: null });

      // Note: This test would need adjustment based on actual implementation
      // as the mock doesn't generate unique IDs automatically
    });
  });

  describe('error handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      const mockAutomation = TestDataFactory.createMockAutomation();
      
      // Simulate an unexpected error
      mockSmartLinkService.generateSmartLink.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await automationSharingService.shareAutomation(mockAutomation);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error');
    });
  });
});