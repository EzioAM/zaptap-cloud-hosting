/**
 * NFCManager.ts
 * Compatibility wrapper for NFCService to work with scanSlice
 * Provides a simplified interface for Redux async thunks
 */

import NFCService from './NFCService';
import { EventLogger } from '../../utils/EventLogger';

export class NFCManager {
  private static nfcService = NFCService;

  /**
   * Check if NFC is supported on this device
   */
  static async isSupported(): Promise<boolean> {
    try {
      return await this.nfcService.initialize();
    } catch (error) {
      EventLogger.error('NFCManager', 'Error checking NFC support:', error as Error);
      return false;
    }
  }

  /**
   * Check if NFC is enabled on this device
   */
  static async isEnabled(): Promise<boolean> {
    try {
      if (!this.nfcService.isNFCSupported()) {
        return false;
      }
      return await this.nfcService.checkNFCEnabled();
    } catch (error) {
      EventLogger.error('NFCManager', 'Error checking NFC enabled status:', error as Error);
      return false;
    }
  }

  /**
   * Start NFC tag discovery
   */
  static async startDiscovery(): Promise<void> {
    try {
      await this.nfcService.initialize();
      
      // Start NFC reader with a dummy callback - actual handling is done in components
      await this.nfcService.startNFCReader(() => {
        // No-op callback for compatibility
      });
      
      EventLogger.debug('NFCManager', 'NFC discovery started successfully');
    } catch (error) {
      EventLogger.error('NFCManager', 'Failed to start NFC discovery:', error as Error);
      throw error;
    }
  }

  /**
   * Stop NFC tag discovery
   */
  static async stopDiscovery(): Promise<void> {
    try {
      await this.nfcService.stopNFCReader();
      EventLogger.debug('NFCManager', 'NFC discovery stopped successfully');
    } catch (error) {
      EventLogger.error('NFCManager', 'Failed to stop NFC discovery:', error as Error);
      throw error;
    }
  }

  /**
   * Get the underlying NFC service instance
   */
  static getService(): typeof NFCService {
    return this.nfcService;
  }
}

export default NFCManager;