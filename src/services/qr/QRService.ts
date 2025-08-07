/**
 * QRService.ts
 * Core QR code service for generation and scanning
 * Provides comprehensive QR code functionality for automations and sharing
 */

import { Alert, Vibration } from 'react-native';
import { Camera, CameraType, FlashMode } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import { AutomationData } from '../../types';
import { smartLinkService } from '../linking/SmartLinkService';
import { automationSharingService } from '../sharing/AutomationSharingService';
import { sharingAnalyticsService } from '../sharing/SharingAnalyticsService';
import { securityService } from '../security/SecurityService';
import { EventLogger } from '../../utils/EventLogger';

export interface QRCodeData {
  type: 'automation' | 'share_link' | 'url' | 'text';
  data: string;
  metadata?: {
    automationId?: string;
    title?: string;
    creator?: string;
    timestamp?: string;
    isPublic?: boolean;
  };
}

export interface QRGenerationOptions {
  size?: number;
  backgroundColor?: string;
  color?: string;
  logo?: string;
  logoSize?: number;
  logoMargin?: number;
  logoBackgroundColor?: string;
  quietZone?: number;
}

export interface QRScanResult {
  success: boolean;
  data?: QRCodeData;
  rawData?: string;
  error?: string;
  scanTime?: number;
}

export interface QRScanOptions {
  timeout?: number;
  vibrate?: boolean;
  sound?: boolean;
  flashMode?: FlashMode;
  onScanProgress?: (scanned: boolean) => void;
}

class QRService {
  private static instance: QRService;
  private isInitialized: boolean = false;
  private isScanningActive: boolean = false;
  private scanTimeout: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): QRService {
    if (!QRService.instance) {
      QRService.instance = new QRService();
    }
    return QRService.instance;
  }

  /**
   * Initialize QR service
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    try {
      // Check camera permissions
      const { status } = await Camera.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        EventLogger.warn('QR', 'Camera permission not granted');
        // Continue initialization - scanning will show permission prompt
      }

      this.isInitialized = true;
      EventLogger.debug('QR', 'QR service initialized successfully');
      return true;

    } catch (error) {
      EventLogger.error('QR', 'Failed to initialize QR service:', error as Error);
      this.isInitialized = true; // Continue anyway
      return false;
    }
  }

  /**
   * Generate QR code data for an automation
   */
  generateQRData(automation: AutomationData, usePublicLink: boolean = false): QRCodeData {
    try {
      let qrData: string;
      let isPublic = false;

      if (automation.is_public && usePublicLink) {
        // For public automations, try to create a public share link
        const publicLink = automationSharingService.generatePublicShareUrl(automation.id);
        if (publicLink) {
          qrData = publicLink;
          isPublic = true;
          EventLogger.debug('QR', 'Generated public share QR data:', publicLink);
        } else {
          // Fallback to smart link
          const smartLink = smartLinkService.generateSmartLink(automation);
          qrData = smartLink.universalUrl;
          EventLogger.debug('QR', 'Generated smart link QR data as fallback:', qrData);
        }
      } else {
        // Generate smart link for private automations or when not using public links
        const smartLink = smartLinkService.generateSmartLink(automation);
        qrData = smartLink.universalUrl;
        EventLogger.debug('QR', 'Generated smart link QR data:', qrData);
      }

      return {
        type: isPublic ? 'share_link' : 'automation',
        data: qrData,
        metadata: {
          automationId: automation.id,
          title: automation.title,
          creator: automation.created_by || 'unknown',
          timestamp: new Date().toISOString(),
          isPublic: isPublic,
        },
      };

    } catch (error) {
      EventLogger.error('QR', 'Failed to generate QR data:', error as Error);
      throw new Error('Failed to generate QR code data');
    }
  }

  /**
   * Generate QR code SVG component
   */
  generateQRCode(
    data: string | QRCodeData, 
    options: QRGenerationOptions = {}
  ): any {
    const {
      size = 200,
      backgroundColor = 'white',
      color = 'black',
      logo,
      logoSize = 50,
      logoMargin = 5,
      logoBackgroundColor = 'white',
      quietZone = 10,
    } = options;

    const qrString = typeof data === 'string' ? data : data.data;

    // Validate QR data size
    if (qrString.length > 4296) {
      throw new Error('QR code data too large (max 4296 characters)');
    }

    // Basic security validation
    const validation = securityService.validateURL(qrString, true);
    if (!validation.isValid && !qrString.startsWith('zaptap://') && !qrString.startsWith('shortcuts-like://')) {
      EventLogger.warn('QR', 'QR code contains potentially unsafe URL:', validation.errors);
    }

    // Return the QR code configuration instead of JSX component
    return {
      value: qrString,
      size,
      backgroundColor,
      color,
      logo: logo ? { uri: logo } : undefined,
      logoSize,
      logoMargin,
      logoBackgroundColor,
      quietZone,
    };
  }

  /**
   * Scan QR code from camera
   */
  async startQRScanner(
    onScanResult: (result: QRScanResult) => void,
    options: QRScanOptions = {}
  ): Promise<void> {
    const {
      timeout = 30000, // 30 seconds default timeout
      vibrate = true,
      onScanProgress,
    } = options;

    if (this.isScanningActive) {
      EventLogger.warn('QR', 'QR scanning is already active');
      return;
    }

    try {
      // Request camera permissions
      const { status } = await Camera.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        onScanResult({
          success: false,
          error: 'Camera permission not granted',
        });
        return;
      }

      this.isScanningActive = true;
      const scanStartTime = Date.now();

      // Set up timeout
      if (timeout > 0) {
        this.scanTimeout = setTimeout(() => {
          this.stopQRScanner();
          onScanResult({
            success: false,
            error: 'Scan timeout',
            scanTime: Date.now() - scanStartTime,
          });
        }, timeout);
      }

      // Note: The actual camera scanning would be handled by the component
      // This service provides the scan result processing
      EventLogger.debug('QR', 'QR scanner started');

    } catch (error) {
      this.isScanningActive = false;
      EventLogger.error('QR', 'Failed to start QR scanner:', error as Error);
      onScanResult({
        success: false,
        error: error instanceof Error ? error.message : 'Scanner initialization failed',
      });
    }
  }

  /**
   * Process scanned QR code data
   */
  async processScannedData(
    scannedData: string,
    scanStartTime: number,
    vibrate: boolean = true
  ): Promise<QRScanResult> {
    try {
      if (vibrate) {
        Vibration.vibrate(100);
      }

      const scanTime = Date.now() - scanStartTime;
      
      // Enhanced security validation
      if (scannedData.length > 5000) {
        EventLogger.warn('QR', 'Scanned QR data exceeds maximum length');
        return {
          success: false,
          error: 'QR code data is too large',
          scanTime,
        };
      }

      // Check for dangerous patterns
      const dangerousPatterns = [
        /javascript:/i,
        /data:.*base64/i,
        /file:/i,
        /<script/i,
        /onclick/i,
        /onerror/i,
        /onload/i,
      ];

      if (dangerousPatterns.some(pattern => pattern.test(scannedData))) {
        EventLogger.warn('QR', 'Scanned QR contains potentially dangerous content');
        return {
          success: false,
          error: 'QR code contains unsafe content',
          scanTime,
        };
      }

      // Security validation through security service
      const validation = securityService.sanitizeTextInput(scannedData, 5000);
      if (!validation.isValid) {
        EventLogger.warn('QR', 'Scanned QR contains invalid data:', validation.errors);
        return {
          success: false,
          error: 'Invalid QR code data: ' + validation.errors?.join(', '),
          scanTime,
        };
      }

      const sanitizedData = validation.sanitizedInput || scannedData;
      
      // Additional URL validation for web links
      if (sanitizedData.startsWith('http')) {
        try {
          const url = new URL(sanitizedData);
          
          // Ensure valid protocols
          if (url.protocol !== 'https:' && url.protocol !== 'http:') {
            return {
              success: false,
              error: 'Unsupported URL protocol',
              scanTime,
            };
          }
          
          // Check for local addresses (basic SSRF prevention)
          const hostname = url.hostname.toLowerCase();
          const isLocalAddress = [
            'localhost', '127.0.0.1', '::1'
          ].includes(hostname) || 
          /^10\./.test(hostname) ||
          /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
          /^192\.168\./.test(hostname);

          if (isLocalAddress) {
            return {
              success: false,
              error: 'Local addresses are not allowed for security reasons',
              scanTime,
            };
          }
          
        } catch (urlError) {
          return {
            success: false,
            error: 'Invalid URL format',
            scanTime,
          };
        }
      }
      
      // Parse the scanned data
      const qrData = this.parseQRData(sanitizedData);

      EventLogger.debug('QR', 'QR code scanned successfully:', {
        type: qrData.type,
        hasMetadata: !!qrData.metadata,
        scanTime,
      });

      // Track scan event
      if (qrData.metadata?.automationId) {
        sharingAnalyticsService.trackShareEvent({
          automationId: qrData.metadata.automationId,
          method: 'qr_scan',
          sharedBy: 'scanner',
          metadata: {
            scanTime,
            qrType: qrData.type,
          }
        });
      }

      return {
        success: true,
        data: qrData,
        rawData: sanitizedData,
        scanTime,
      };

    } catch (error) {
      EventLogger.error('QR', 'Failed to process scanned QR data:', error as Error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process QR data',
        rawData: scannedData,
        scanTime: Date.now() - scanStartTime,
      };
    }
  }

  /**
   * Parse QR code data and determine type
   */
  private parseQRData(data: string): QRCodeData {
    // Check for app scheme URLs first
    if (data.startsWith('zaptap://') || data.startsWith('shortcuts-like://')) {
      return this.parseAppSchemeURL(data);
    }

    // Check for web URLs
    if (data.startsWith('http://') || data.startsWith('https://')) {
      return this.parseWebURL(data);
    }

    // Plain text or other data
    return {
      type: 'text',
      data: data,
    };
  }

  /**
   * Parse app scheme URL from QR code
   */
  private parseAppSchemeURL(url: string): QRCodeData {
    try {
      const parsedUrl = new URL(url);
      
      // Check for automation URLs
      if (parsedUrl.pathname.startsWith('/automation/')) {
        const automationId = parsedUrl.pathname.replace('/automation/', '');
        const title = parsedUrl.searchParams.get('title');
        const creator = parsedUrl.searchParams.get('creator');
        
        return {
          type: 'automation',
          data: url,
          metadata: {
            automationId,
            title: title || undefined,
            creator: creator || undefined,
            timestamp: new Date().toISOString(),
          },
        };
      }

      // Generic app URL
      return {
        type: 'url',
        data: url,
      };

    } catch (error) {
      EventLogger.warn('QR', 'Failed to parse app scheme URL:', error);
      return {
        type: 'text',
        data: url,
      };
    }
  }

  /**
   * Parse web URL from QR code
   */
  private parseWebURL(url: string): QRCodeData {
    try {
      const parsedUrl = new URL(url);
      
      // Check for known automation domains
      const validHostnames = [
        'zaptap.cloud', 'www.zaptap.cloud',
        'zaptap.app', 'www.zaptap.app',
        'shortcutslike.app', 'www.shortcutslike.app'
      ];

      if (validHostnames.includes(parsedUrl.hostname)) {
        // Check for automation paths
        const automationMatch = parsedUrl.pathname.match(/\/(automation|share|link|run)\/([^/?]+)/);
        if (automationMatch) {
          const [, pathType, automationId] = automationMatch;
          
          return {
            type: pathType === 'share' ? 'share_link' : 'automation',
            data: url,
            metadata: {
              automationId,
              timestamp: new Date().toISOString(),
              isPublic: pathType === 'share',
            },
          };
        }
      }

      // Generic web URL
      return {
        type: 'url',
        data: url,
      };

    } catch (error) {
      EventLogger.warn('QR', 'Failed to parse web URL:', error);
      return {
        type: 'text',
        data: url,
      };
    }
  }

  /**
   * Stop QR code scanner
   */
  stopQRScanner(): void {
    this.isScanningActive = false;
    
    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
      this.scanTimeout = null;
    }

    EventLogger.debug('QR', 'QR scanner stopped');
  }

  /**
   * Check if scanner is currently active
   */
  isScannerActive(): boolean {
    return this.isScanningActive;
  }

  /**
   * Handle camera scan result (for use with CameraView component)
   */
  handleCameraScanResult = (
    data: string,
    onScanResult: (result: QRScanResult) => void,
    scanStartTime: number,
    options: QRScanOptions = {}
  ): void => {
    if (!this.isScanningActive) {
      return;
    }

    // Stop scanning immediately to prevent multiple scans
    this.stopQRScanner();

    // Process the scanned data
    this.processScannedData(data, scanStartTime, options.vibrate)
      .then(onScanResult)
      .catch(error => {
        EventLogger.error('QR', 'Failed to handle camera scan result:', error as Error);
        onScanResult({
          success: false,
          error: 'Failed to process scanned data',
          rawData: data,
          scanTime: Date.now() - scanStartTime,
        });
      });
  };

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopQRScanner();
    this.isInitialized = false;
    EventLogger.debug('QR', 'QR service cleaned up');
  }
}

export const qrService = QRService.getInstance();
export default qrService;