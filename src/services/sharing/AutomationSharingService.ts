import { AutomationData } from '../../types';
import { smartLinkService } from '../linking/SmartLinkService';
import { Share } from 'react-native';
import { supabase } from '../supabase/client';
import { sharingAnalyticsService } from './SharingAnalyticsService';
import { EventLogger } from '../../utils/EventLogger';

export interface SharingOptions {
  includeQR?: boolean;
  includeNFC?: boolean;
  embedData?: boolean;
  emergency?: boolean;
  customMessage?: string;
  generatePublicLink?: boolean;
}

export interface SharingResult {
  success: boolean;
  shareUrl?: string;
  qrCode?: string;
  publicId?: string;
  error?: string;
}

export class AutomationSharingService {
  private static instance: AutomationSharingService;
  private static readonly SHARE_DOMAIN = 'https://www.zaptap.cloud'; // Your custom domain with www

  private constructor() {}

  static getInstance(): AutomationSharingService {
    if (!AutomationSharingService.instance) {
      AutomationSharingService.instance = new AutomationSharingService();
    }
    return AutomationSharingService.instance;
  }

  /**
   * Share automation via various methods (URL, QR, NFC, etc.)
   */
  async shareAutomation(
    automation: AutomationData,
    options: SharingOptions = {}
  ): Promise<SharingResult> {
    try {
      const {
        embedData = false,
        emergency = false,
        customMessage,
        generatePublicLink = false
      } = options;

      // Generate smart link
      const smartLink = smartLinkService.generateSmartLink(automation, {
        embedData,
        emergency
      });

      let shareUrl = smartLink.universalUrl;
      let publicId: string | undefined;

      // If requested, create a public shareable link
      if (generatePublicLink) {
        const publicLinkResult = await this.createPublicShareLink(automation);
        if (publicLinkResult.success && publicLinkResult.publicId) {
          shareUrl = `${AutomationSharingService.SHARE_DOMAIN}/share/${publicLinkResult.publicId}`;
          publicId = publicLinkResult.publicId;
        }
      }

      // Prepare share message
      const shareMessage = this.buildShareMessage(automation, shareUrl, customMessage);

      // Share using native share dialog
      const shareResult = await Share.share({
        message: shareMessage,
        url: shareUrl,
        title: `Check out this automation: ${automation.title}`,
      });

      // Track share event
      await sharingAnalyticsService.trackShareEvent({
        automationId: automation.id,
        shareId: publicId,
        method: 'link',
        sharedBy: automation.created_by || 'anonymous',
        metadata: {
          hasCustomMessage: !!customMessage,
          isPublicLink: !!publicId,
          hasEmbeddedData: embedData
        }
      });

      return {
        success: true,
        shareUrl,
        qrCode: smartLink.qrData,
        publicId,
      };

    } catch (error: any) {
      EventLogger.error('Automation', 'Failed to share automation:', error as Error);
      return {
        success: false,
        error: error.message || 'Failed to share automation',
      };
    }
  }

  /**
   * Share automation via URL only
   */
  async shareViaUrl(
    automation: AutomationData,
    options: SharingOptions = {}
  ): Promise<SharingResult> {
    try {
      const { embedData = false, emergency = false } = options;

      const smartLink = smartLinkService.generateSmartLink(automation, {
        embedData,
        emergency
      });

      return {
        success: true,
        shareUrl: smartLink.universalUrl,
        qrCode: smartLink.qrData,
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to generate share URL',
      };
    }
  }

  /**
   * Create a public shareable link with analytics
   */
  async createPublicShareLink(automation: AutomationData): Promise<SharingResult> {
    try {
      // Generate unique public ID
      const publicId = this.generatePublicId();

      // Store in database for public access
      EventLogger.debug('Automation', 'Creating public share with ID:', publicId);
      EventLogger.debug('Automation', 'Automation data:', automation);
      
      const { data, error } = await supabase
        .from('public_shares')
        .insert({
          id: publicId,
          automation_id: automation.id,
          automation_data: automation,
          created_by: automation.created_by,
          created_at: new Date().toISOString(),
          expires_at: this.getExpirationDate(30), // 30 days
          access_count: 0,
          is_active: true,
        })
        .select()
        .single();
      
      EventLogger.debug('Automation', 'Public share creation result:', { data, error });

      if (error) {
        throw new Error(`Failed to create public share: ${error.message}`);
      }

      return {
        success: true,
        shareUrl: `${AutomationSharingService.SHARE_DOMAIN}/share/${publicId}`,
        publicId,
      };

    } catch (error: any) {
      EventLogger.error('Automation', 'Failed to create public share link:', error as Error);
      return {
        success: false,
        error: error.message || 'Failed to create public share link',
      };
    }
  }

  /**
   * Share automation with specific users via email/SMS
   */
  async shareWithUsers(
    automation: AutomationData,
    recipients: string[],
    method: 'email' | 'sms' = 'email',
    customMessage?: string
  ): Promise<SharingResult> {
    try {
      // Create public share link first
      const publicShareResult = await this.createPublicShareLink(automation);
      
      if (!publicShareResult.success || !publicShareResult.shareUrl) {
        throw new Error('Failed to create shareable link');
      }

      // Prepare message for recipients
      const message = customMessage || this.buildShareMessage(
        automation,
        publicShareResult.shareUrl,
        `Hey! I created this automation and thought you might find it useful.`
      );

      // Log sharing activity
      await this.logSharingActivity(automation.id, recipients, method);

      // Note: In a full implementation, you would integrate with email/SMS services here
      // For now, we'll copy the share link and message to clipboard
      const fullMessage = `${message}\n\nRecipients (${method}): ${recipients.join(', ')}`;

      return {
        success: true,
        shareUrl: publicShareResult.shareUrl,
        publicId: publicShareResult.publicId,
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to share with users',
      };
    }
  }

  /**
   * Get sharing analytics for an automation
   */
  async getSharingAnalytics(automationId: string): Promise<{
    totalShares: number;
    totalViews: number;
    sharesByMethod: Record<string, number>;
    recentShares: any[];
  }> {
    try {
      // Get public shares
      const { data: publicShares, error: sharesError } = await supabase
        .from('public_shares')
        .select('id, access_count, created_at')
        .eq('automation_id', automationId);

      if (sharesError) throw sharesError;

      // Get sharing activity logs
      const { data: sharingLogs, error: logsError } = await supabase
        .from('sharing_logs')
        .select('*')
        .eq('automation_id', automationId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (logsError) throw logsError;

      // Calculate analytics
      const totalShares = sharingLogs?.length || 0;
      const totalViews = (publicShares || []).reduce((sum, share) => sum + (share.access_count || 0), 0);
      
      const sharesByMethod = (sharingLogs || []).reduce((acc, log) => {
        acc[log.method] = (acc[log.method] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalShares,
        totalViews,
        sharesByMethod,
        recentShares: sharingLogs || [],
      };

    } catch (error) {
      EventLogger.error('Automation', 'Failed to get sharing analytics:', error as Error);
      return {
        totalShares: 0,
        totalViews: 0,
        sharesByMethod: {},
        recentShares: [],
      };
    }
  }

  /**
   * Revoke a public share link
   */
  async revokePublicShare(publicId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('public_shares')
        .update({ is_active: false })
        .eq('id', publicId);

      if (error) {
        throw new Error(`Failed to revoke share: ${error.message}`);
      }

      return { success: true };

    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to revoke public share',
      };
    }
  }

  /**
   * List all public shares for a user
   */
  async getUserShares(userId: string): Promise<{
    success: boolean;
    shares?: any[];
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('public_shares')
        .select(`
          id,
          automation_id,
          automation_data,
          created_at,
          expires_at,
          access_count,
          is_active
        `)
        .eq('created_by', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to get user shares: ${error.message}`);
      }

      return {
        success: true,
        shares: data || [],
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get user shares',
      };
    }
  }

  /**
   * Generate a simple share URL for an automation
   */
  generateShareUrl(automationId: string): string {
    return `${AutomationSharingService.SHARE_DOMAIN}/automation/${automationId}`;
  }

  // Private helper methods

  private buildShareMessage(
    automation: AutomationData,
    shareUrl: string,
    customMessage?: string
  ): string {
    const defaultMessage = `🚀 Check out this awesome automation: "${automation.title}"`;
    const description = automation.description ? `\n\n📝 ${automation.description}` : '';
    const stepCount = automation.steps?.length || 0;
    const stepInfo = `\n\n⚡ ${stepCount} automation step${stepCount !== 1 ? 's' : ''}`;
    const usage = '\n\n📱 Tap the link to run it instantly (works with or without the app!)';
    
    return `${customMessage || defaultMessage}${description}${stepInfo}${usage}\n\n🔗 ${shareUrl}`;
  }

  private generatePublicId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private getExpirationDate(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
  }

  private async logSharingActivity(
    automationId: string,
    recipients: string[],
    method: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('sharing_logs')
        .insert({
          automation_id: automationId,
          method,
          recipients,
          shared_at: new Date().toISOString(),
        });

      if (error) {
        EventLogger.error('Automation', 'Failed to log sharing activity:', error as Error);
      }
    } catch (error) {
      EventLogger.error('Automation', 'Failed to log sharing activity:', error as Error);
    }
  }
}

export const automationSharingService = AutomationSharingService.getInstance();