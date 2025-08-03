import { Share, Platform, Alert } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import { smartLinkService } from '../linking/SmartLinkService';
import { sharingAnalyticsService } from './SharingAnalyticsService';
import { AutomationData } from '../../types';

interface QRShareOptions {
  linkType?: 'smart' | 'emergency';
  customMessage?: string;
  onProgress?: (status: string) => void;
}

interface QRShareResult {
  success: boolean;
  method?: 'share' | 'save' | 'copy';
  error?: string;
}

class QRSharingService {
  private readonly QR_ALBUM_NAME = 'Shortcuts Like QR Codes';
  private captureCache: Map<string, string> = new Map();

  /**
   * Share a QR code for an automation
   */
  async shareQRCode(
    qrRef: any,
    automation: AutomationData,
    options: QRShareOptions = {}
  ): Promise<QRShareResult> {
    const { linkType = 'smart', customMessage, onProgress } = options;

    try {
      if (!qrRef) {
        throw new Error('QR code reference not available');
      }

      onProgress?.('Generating QR code...');

      // Capture QR code with caching
      const uri = await this.captureQRCode(qrRef, automation.id);

      const shareMessage = this.generateShareMessage(automation, linkType, customMessage);

      const shareOptions = {
        title: `${automation.title} - Automation QR Code`,
        message: shareMessage,
        url: Platform.OS === 'ios' ? uri : `file://${uri}`,
        subject: `${automation.title} - Automation QR Code`,
        failOnCancel: false,
      };

      onProgress?.('Sharing...');

      const result = await Share.share(shareOptions);

      if (result.action === Share.sharedAction) {
        // Track successful share
        await sharingAnalyticsService.trackShare(automation.id, 'qr', {
          method: 'native_share',
          linkType,
          success: true,
        });

        return { success: true, method: 'share' };
      } else if (result.action === Share.dismissedAction) {
        // User cancelled
        return { success: false, error: 'User cancelled' };
      }

      return { success: true, method: 'share' };
    } catch (error: any) {
      console.error('QR share error:', error);
      
      // Don't show error for user cancellation
      if (error.message?.includes('cancel')) {
        return { success: false, error: 'User cancelled' };
      }

      // Offer fallback options
      this.showFallbackOptions(qrRef, automation, error.message);
      
      return { success: false, error: error.message };
    } finally {
      onProgress?.('');
    }
  }


  /**
   * Save QR code to camera roll
   */
  async saveQRToCameraRoll(
    qrRef: any,
    automation: AutomationData,
    options: QRShareOptions = {}
  ): Promise<QRShareResult> {
    const { onProgress } = options;

    try {
      if (!qrRef) {
        throw new Error('QR code reference not available');
      }

      onProgress?.('Requesting permissions...');

      // Request permission
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to save QR code to your camera roll.',
          [{ text: 'OK' }]
        );
        return { success: false, error: 'Permission denied' };
      }

      onProgress?.('Saving QR code...');

      // Capture QR code
      const uri = await this.captureQRCode(qrRef, automation.id);

      // Save to camera roll
      const asset = await MediaLibrary.createAssetAsync(uri);
      await MediaLibrary.createAlbumAsync(this.QR_ALBUM_NAME, asset, false);

      // Track save
      await sharingAnalyticsService.trackShare(automation.id, 'qr', {
        method: 'save_to_camera_roll',
        success: true,
      });

      Alert.alert(
        'Saved! 📸',
        'QR code has been saved to your camera roll.',
        [
          { text: 'OK' },
          { 
            text: 'Share Now', 
            onPress: () => this.shareQRCode(qrRef, automation, options) 
          }
        ]
      );

      return { success: true, method: 'save' };
    } catch (error: any) {
      console.error('Save QR error:', error);
      Alert.alert(
        'Save Failed',
        'Could not save QR code. Please try again.',
        [{ text: 'OK' }]
      );
      return { success: false, error: error.message };
    } finally {
      onProgress?.('');
    }
  }

  /**
   * Capture QR code with caching
   */
  private async captureQRCode(qrRef: any, automationId: string): Promise<string> {
    // Check cache first
    const cacheKey = `qr_${automationId}_${Date.now()}`;
    const cached = this.captureCache.get(automationId);
    
    if (cached) {
      return cached;
    }

    // Capture new
    const uri = await captureRef(qrRef, {
      format: 'png',
      quality: 1.0,
      result: 'tmpfile',
    });

    // Cache for 5 minutes
    this.captureCache.set(automationId, uri);
    setTimeout(() => this.captureCache.delete(automationId), 5 * 60 * 1000);

    return uri;
  }


  /**
   * Generate share message based on link type
   */
  private generateShareMessage(
    automation: AutomationData,
    linkType: 'smart' | 'emergency',
    customMessage?: string
  ): string {
    const baseMessage = linkType === 'emergency'
      ? `🚨 EMERGENCY AUTOMATION: ${automation.title}\n\nScan this QR code to run this automation. Works even without the app installed!`
      : `Scan this QR code to run "${automation.title}" automation.\n\nWorks with or without the app!`;

    if (customMessage) {
      return `${customMessage}\n\n${baseMessage}`;
    }

    return `${baseMessage}\n\nCreated with Shortcuts Like`;
  }

  /**
   * Show fallback options when sharing fails
   */
  private showFallbackOptions(
    qrRef: any,
    automation: AutomationData,
    errorMessage: string
  ): void {
    Alert.alert(
      'Share Failed',
      'Could not share QR code. What would you like to do instead?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Save to Camera Roll', 
          onPress: () => this.saveQRToCameraRoll(qrRef, automation) 
        },
        { 
          text: 'Copy Link', 
          onPress: () => this.copyShareLink(automation) 
        },
        {
          text: 'Try Again',
          onPress: () => this.shareQRCode(qrRef, automation)
        }
      ]
    );
  }

  /**
   * Copy share link to clipboard
   */
  private async copyShareLink(automation: AutomationData): Promise<void> {
    try {
      const { Clipboard } = await import('expo-clipboard');
      const shareUrl = smartLinkService.generateSmartLink(automation).universalUrl;
      
      await Clipboard.setStringAsync(shareUrl);
      
      Alert.alert(
        'Link Copied! 📋',
        'The automation link has been copied to your clipboard.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Could not copy link');
    }
  }

  /**
   * Clear QR code cache
   */
  clearCache(): void {
    this.captureCache.clear();
  }
}

export const qrSharingService = new QRSharingService();