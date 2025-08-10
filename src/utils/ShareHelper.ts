/**
 * ShareHelper - Centralized sharing utility for consistent sharing across the app
 * 
 * This helper ensures all components use the same sharing logic with smartLinkService
 */

import { Share, Alert } from 'react-native';
import { AutomationData } from '../types';
import { smartLinkService } from '../services/linking/SmartLinkService';
import { automationSharingService } from '../services/sharing/AutomationSharingService';
import { EventLogger } from './EventLogger';

export interface ShareOptions {
  customMessage?: string;
  generatePublicLink?: boolean;
  embedData?: boolean;
  showShareModal?: boolean;
}

export class ShareHelper {
  /**
   * Share an automation using the native share dialog
   * This is the primary method that should be used across the app
   */
  static async shareAutomation(
    automation: AutomationData | any, // Accept any automation-like object
    options: ShareOptions = {}
  ): Promise<boolean> {
    try {
      // Ensure we have a valid automation object
      if (!automation || !automation.id) {
        Alert.alert('Share Error', 'Invalid automation data');
        return false;
      }

      // Convert to proper AutomationData if needed
      const automationData: AutomationData = {
        id: automation.id,
        title: automation.title || 'Untitled Automation',
        description: automation.description || '',
        steps: automation.steps || [],
        created_by: automation.created_by || automation.createdBy || '',
        is_public: automation.is_public !== undefined ? automation.is_public : automation.isPublic,
        category: automation.category || 'other',
        tags: automation.tags || [],
        ...automation
      };

      if (options.showShareModal) {
        // If a share modal is requested, let the component handle it
        return true;
      }

      // Use smartLinkService for consistent link generation
      const smartLink = smartLinkService.generateSmartLink(automationData, {
        embedData: options.embedData || false,
      });
      
      const shareMessage = options.customMessage || 
        smartLinkService.generateSharingLink(automationData);

      const shareResult = await Share.share({
        message: shareMessage,
        title: automationData.title,
        url: smartLink.universalUrl,
      });

      if (shareResult.action === Share.sharedAction) {
        EventLogger.debug('ShareHelper', 'Automation shared successfully', {
          automationId: automationData.id,
          title: automationData.title
        });
        return true;
      }

      return false;
    } catch (error) {
      EventLogger.error('ShareHelper', 'Failed to share automation:', error as Error);
      Alert.alert('Share Error', 'Unable to share this automation. Please try again.');
      return false;
    }
  }

  /**
   * Share with advanced options using the sharing service
   */
  static async shareWithService(
    automation: AutomationData | any,
    options: ShareOptions = {}
  ): Promise<boolean> {
    try {
      const result = await automationSharingService.shareAutomation(automation, {
        customMessage: options.customMessage,
        generatePublicLink: options.generatePublicLink || false,
        embedData: options.embedData || false,
      });

      return result.success;
    } catch (error) {
      EventLogger.error('ShareHelper', 'Service share failed:', error as Error);
      return false;
    }
  }

  /**
   * Generate a shareable URL without showing the share dialog
   */
  static async getShareUrl(
    automation: AutomationData | any,
    options: { embedData?: boolean } = {}
  ): Promise<string | null> {
    try {
      const smartLink = smartLinkService.generateSmartLink(automation, {
        embedData: options.embedData || false,
      });
      
      return smartLink.universalUrl;
    } catch (error) {
      EventLogger.error('ShareHelper', 'Failed to generate share URL:', error as Error);
      return null;
    }
  }
}

// Export as default for easier imports
export default ShareHelper;