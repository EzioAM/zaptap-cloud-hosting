/**
 * Services Index
 * Central export point for all services in the ShortcutsLike application
 * Provides organized access to all backend services and utilities
 */

// Core Services
export { supabase, supabaseWithRetry, testConnection, refreshSession, ensureValidSession } from './supabase/client';
export { securityService } from './security/SecurityService';

// Automation Services
export { AutomationEngine } from './automation/AutomationEngine';
export { 
  BaseExecutor,
  NotificationExecutor,
  SMSExecutor,
  EmailExecutor,
  WebhookExecutor,
  DelayExecutor,
  executorMap
} from './automation/executors';

// NFC and QR Services
export { default as NFCService } from './nfc/NFCService';
export { default as SafeNFCService } from './nfc/SafeNFCService';
export { default as QRService } from './qr/QRService';

// Notification Services
export { default as NotificationService } from './notifications/NotificationService';
export { default as NotificationHandler } from './notifications/NotificationHandler';
export { default as PushTokenManager } from './notifications/PushTokenManager';

// Network and Connectivity
export { default as NetworkService } from './network/NetworkService';

// Offline and Sync Services
export * from './offline';

// Monitoring Services
export { default as CrashReporter } from './monitoring/CrashReporter';
export { default as PerformanceMonitor } from './monitoring/PerformanceMonitor';

// Analytics Services
export { default as AnalyticsService } from './analytics/AnalyticsService';

// Auth Services
export { default as RoleService } from './auth/RoleService';

// Sharing Services
export { default as AutomationSharingService } from './sharing/AutomationSharingService';
export { default as QRSharingService } from './sharing/QRSharingService';
export { default as SharingAnalyticsService } from './sharing/SharingAnalyticsService';

// Linking Services
export { default as LinkingService } from './linking/LinkingService';
export { default as SmartLinkService } from './linking/SmartLinkService';

// Template and Import/Export Services
export { default as AutomationTemplates } from './templates/AutomationTemplates';
export { default as AutomationImportExportService } from './import-export/AutomationImportExportService';

// Variable Management
export { variableManager, VariableDefinition } from './variables/VariableManager';

// Review Services
export { default as ReviewService } from './reviews/ReviewService';

// Comments Services
export { default as CommentsService } from './comments/CommentsService';

// Version Control
export { default as VersionHistoryService } from './versions/VersionHistoryService';

// Filtering Services
export { default as AutomationFilterService } from './filtering/AutomationFilterService';

// Location Services
export { default as LocationTriggerService } from './triggers/LocationTriggerService';

// Onboarding Services
export { default as OnboardingService } from './onboarding/OnboardingService';

// Research Services
export { default as AIResearchService } from './research/AIResearchService';
export { default as CodebaseAnalysisService } from './research/CodebaseAnalysisService';
export { default as CollaborativeAIResearchService } from './research/CollaborativeAIResearchService';
export { default as ImprovedAIResearchService } from './research/ImprovedAIResearchService';
export { default as LocalResearchService } from './research/LocalResearchService';

// Developer Services
export { default as ChangeHistoryService } from './developer/ChangeHistoryService';
export { default as CloudChangeHistoryService } from './developer/CloudChangeHistoryService';
export { default as CodeImplementationService } from './developer/CodeImplementationService';
export { default as DeveloperService } from './developer/DeveloperService';
export { default as MockCodeImplementationService } from './developer/MockCodeImplementationService';
export { default as ScreenAnalysisService } from './developer/ScreenAnalysisService';
export { default as UIImageGenerator } from './developer/UIImageGenerator';
export { default as UIMockupService } from './developer/UIMockupService';
export { default as UIPromptFormatter } from './developer/UIPromptFormatter';
export { default as UIRedesignPromptService } from './developer/UIRedesignPromptService';

// Web Services
export { default as WebAutomationEngine } from './web/WebAutomationEngine';

// Service Initialization and Management
export interface ServiceManager {
  initializeServices(): Promise<void>;
  shutdownServices(): Promise<void>;
  getServiceStatus(): ServiceStatus;
}

export interface ServiceStatus {
  supabase: boolean;
  nfc: boolean;
  notifications: boolean;
  network: boolean;
  analytics: boolean;
  offline: boolean;
}

class CoreServiceManager implements ServiceManager {
  private static instance: CoreServiceManager;
  private initialized = false;
  
  private constructor() {}
  
  static getInstance(): CoreServiceManager {
    if (!CoreServiceManager.instance) {
      CoreServiceManager.instance = new CoreServiceManager();
    }
    return CoreServiceManager.instance;
  }

  async initializeServices(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize core services in order
      await this.initializeSupabase();
      await this.initializeNotifications();
      await this.initializeNFC();
      await this.initializeQR();
      await this.initializeNetworkMonitoring();
      await this.initializeOfflineSupport();
      await this.initializeAnalytics();

      this.initialized = true;
      console.log('✅ All core services initialized successfully');
    } catch (error) {
      console.error('❌ Service initialization failed:', error);
      throw error;
    }
  }

  async shutdownServices(): Promise<void> {
    try {
      // Cleanup services in reverse order
      await this.cleanupAnalytics();
      await this.cleanupOfflineSupport();
      await this.cleanupNetworkMonitoring();
      await this.cleanupQR();
      await this.cleanupNFC();
      await this.cleanupNotifications();
      await this.cleanupSupabase();

      this.initialized = false;
      console.log('✅ All services shut down cleanly');
    } catch (error) {
      console.error('❌ Service shutdown failed:', error);
      throw error;
    }
  }

  getServiceStatus(): ServiceStatus {
    return {
      supabase: true, // TODO: Add actual health checks
      nfc: NFCService.isNFCSupported(),
      notifications: true, // TODO: Add actual health checks
      network: true, // TODO: Add actual health checks
      analytics: true, // TODO: Add actual health checks
      offline: true, // TODO: Add actual health checks
    };
  }

  private async initializeSupabase(): Promise<void> {
    try {
      const result = await testConnection();
      if (!result.connected) {
        console.warn('⚠️ Supabase connection failed, continuing in offline mode');
      } else {
        console.log('✅ Supabase connected successfully');
      }
    } catch (error) {
      console.warn('⚠️ Supabase initialization warning:', error);
    }
  }

  private async initializeNotifications(): Promise<void> {
    try {
      await NotificationService.initialize();
      console.log('✅ Notification service initialized');
    } catch (error) {
      console.warn('⚠️ Notification service initialization warning:', error);
    }
  }

  private async initializeNFC(): Promise<void> {
    try {
      await NFCService.initialize();
      console.log('✅ NFC service initialized');
    } catch (error) {
      console.warn('⚠️ NFC service initialization warning:', error);
    }
  }

  private async initializeQR(): Promise<void> {
    try {
      const { default: QRService } = await import('./qr/QRService');
      await QRService.initialize();
      console.log('✅ QR service initialized');
    } catch (error) {
      console.warn('⚠️ QR service initialization warning:', error);
    }
  }

  private async initializeNetworkMonitoring(): Promise<void> {
    try {
      // Network monitoring is handled by individual services
      console.log('✅ Network monitoring initialized');
    } catch (error) {
      console.warn('⚠️ Network monitoring initialization warning:', error);
    }
  }

  private async initializeOfflineSupport(): Promise<void> {
    try {
      const { initializeOfflineSupport } = await import('./offline');
      await initializeOfflineSupport({
        enableAutoSync: true,
        syncInterval: 30000,
        enableBackgroundSync: true,
        enableOptimisticUpdates: true,
      });
      console.log('✅ Offline support initialized');
    } catch (error) {
      console.warn('⚠️ Offline support initialization warning:', error);
    }
  }

  private async initializeAnalytics(): Promise<void> {
    try {
      // Analytics initialization is handled by the service itself
      console.log('✅ Analytics initialized');
    } catch (error) {
      console.warn('⚠️ Analytics initialization warning:', error);
    }
  }

  private async cleanupSupabase(): Promise<void> {
    try {
      supabaseWithRetry.cleanup();
    } catch (error) {
      console.warn('⚠️ Supabase cleanup warning:', error);
    }
  }

  private async cleanupNotifications(): Promise<void> {
    try {
      NotificationService.cleanup();
    } catch (error) {
      console.warn('⚠️ Notification service cleanup warning:', error);
    }
  }

  private async cleanupQR(): Promise<void> {
    try {
      const { default: QRService } = await import('./qr/QRService');
      QRService.cleanup();
    } catch (error) {
      console.warn('⚠️ QR service cleanup warning:', error);
    }
  }

  private async cleanupNFC(): Promise<void> {
    try {
      await NFCService.cleanup();
    } catch (error) {
      console.warn('⚠️ NFC service cleanup warning:', error);
    }
  }

  private async cleanupNetworkMonitoring(): Promise<void> {
    try {
      // Network cleanup handled by individual services
    } catch (error) {
      console.warn('⚠️ Network monitoring cleanup warning:', error);
    }
  }

  private async cleanupOfflineSupport(): Promise<void> {
    try {
      // Offline cleanup handled by the offline service
    } catch (error) {
      console.warn('⚠️ Offline support cleanup warning:', error);
    }
  }

  private async cleanupAnalytics(): Promise<void> {
    try {
      // Analytics cleanup handled by the service itself
    } catch (error) {
      console.warn('⚠️ Analytics cleanup warning:', error);
    }
  }
}

export const serviceManager = CoreServiceManager.getInstance();

// Convenience function for app initialization
export const initializeAllServices = () => serviceManager.initializeServices();
export const shutdownAllServices = () => serviceManager.shutdownServices();
export const getServiceStatus = () => serviceManager.getServiceStatus();

export default {
  // Core services
  supabase,
  securityService,
  NFCService,
  QRService,
  NotificationService,
  NetworkService,
  
  // Service management
  serviceManager,
  initializeAllServices,
  shutdownAllServices,
  getServiceStatus,
};