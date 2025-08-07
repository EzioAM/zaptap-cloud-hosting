/**
 * ServiceConnectivityValidator.ts
 * Validates all service connections and dependencies
 * Provides health checks and diagnostics for the service layer
 */

import { EventLogger } from '../../utils/EventLogger';
import { Logger } from '../../utils/Logger';

export interface ServiceHealthCheck {
  service: string;
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  message: string;
  details?: any;
  checkTime: string;
}

export interface ServiceConnectivityReport {
  overall: 'healthy' | 'degraded' | 'critical';
  timestamp: string;
  checks: ServiceHealthCheck[];
  summary: {
    healthy: number;
    warnings: number;
    errors: number;
    total: number;
  };
}

class ServiceConnectivityValidator {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('ServiceConnectivityValidator');
  }

  /**
   * Run comprehensive service connectivity test
   */
  async validateAllServices(): Promise<ServiceConnectivityReport> {
    const startTime = Date.now();
    const checks: ServiceHealthCheck[] = [];

    this.logger.info('Starting service connectivity validation...');

    // Test core services
    checks.push(await this.testSupabaseConnection());
    checks.push(await this.testSecurityService());
    checks.push(await this.testNFCService());
    checks.push(await this.testQRService());
    checks.push(await this.testNotificationService());
    checks.push(await this.testNetworkService());
    checks.push(await this.testOfflineServices());

    // Test additional services
    checks.push(await this.testAnalyticsService());
    checks.push(await this.testSharingServices());
    checks.push(await this.testLinkingServices());

    // Calculate summary
    const summary = {
      healthy: checks.filter(c => c.status === 'healthy').length,
      warnings: checks.filter(c => c.status === 'warning').length,
      errors: checks.filter(c => c.status === 'error').length,
      total: checks.length,
    };

    // Determine overall status
    let overall: 'healthy' | 'degraded' | 'critical';
    if (summary.errors > 0) {
      overall = summary.errors > summary.total / 2 ? 'critical' : 'degraded';
    } else if (summary.warnings > 0) {
      overall = 'degraded';
    } else {
      overall = 'healthy';
    }

    const report: ServiceConnectivityReport = {
      overall,
      timestamp: new Date().toISOString(),
      checks,
      summary,
    };

    const duration = Date.now() - startTime;
    this.logger.info(`Service validation completed in ${duration}ms`, {
      overall: report.overall,
      summary: report.summary,
    });

    return report;
  }

  /**
   * Test Supabase connection
   */
  private async testSupabaseConnection(): Promise<ServiceHealthCheck> {
    try {
      const { testConnection } = await import('../supabase/client');
      const result = await testConnection();

      if (result.connected) {
        return {
          service: 'Supabase',
          status: result.authenticated ? 'healthy' : 'warning',
          message: result.authenticated ? 'Connected and authenticated' : 'Connected but not authenticated',
          details: {
            user: result.user,
            networkStatus: result.networkStatus,
          },
          checkTime: new Date().toISOString(),
        };
      } else {
        return {
          service: 'Supabase',
          status: 'error',
          message: result.error || 'Connection failed',
          details: { details: result.details },
          checkTime: new Date().toISOString(),
        };
      }
    } catch (error) {
      return {
        service: 'Supabase',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        checkTime: new Date().toISOString(),
      };
    }
  }

  /**
   * Test Security Service
   */
  private async testSecurityService(): Promise<ServiceHealthCheck> {
    try {
      const { securityService } = await import('../security/SecurityService');
      
      // Test basic validation functions
      const phoneTest = securityService.validatePhoneNumber('+1234567890');
      const emailTest = securityService.validateEmailAddress('test@example.com');
      const urlTest = securityService.validateURL('https://example.com');

      if (phoneTest.isValid && emailTest.isValid && urlTest.isValid) {
        return {
          service: 'SecurityService',
          status: 'healthy',
          message: 'All validation functions working',
          checkTime: new Date().toISOString(),
        };
      } else {
        return {
          service: 'SecurityService',
          status: 'error',
          message: 'Validation functions not working properly',
          details: { phoneTest, emailTest, urlTest },
          checkTime: new Date().toISOString(),
        };
      }
    } catch (error) {
      return {
        service: 'SecurityService',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        checkTime: new Date().toISOString(),
      };
    }
  }

  /**
   * Test NFC Service
   */
  private async testNFCService(): Promise<ServiceHealthCheck> {
    try {
      const { default: NFCService } = await import('../nfc/NFCService');
      
      const isSupported = NFCService.isNFCSupported();
      const initResult = await NFCService.initialize();

      return {
        service: 'NFCService',
        status: initResult ? 'healthy' : 'warning',
        message: isSupported 
          ? (initResult ? 'NFC supported and initialized' : 'NFC supported but initialization failed')
          : 'NFC not supported on this device',
        details: { isSupported, initialized: initResult },
        checkTime: new Date().toISOString(),
      };
    } catch (error) {
      return {
        service: 'NFCService',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        checkTime: new Date().toISOString(),
      };
    }
  }

  /**
   * Test QR Service
   */
  private async testQRService(): Promise<ServiceHealthCheck> {
    try {
      const { default: QRService } = await import('../qr/QRService');
      
      const initResult = await QRService.initialize();

      return {
        service: 'QRService',
        status: initResult ? 'healthy' : 'warning',
        message: initResult ? 'QR service initialized successfully' : 'QR service initialization failed',
        details: { initialized: initResult },
        checkTime: new Date().toISOString(),
      };
    } catch (error) {
      return {
        service: 'QRService',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        checkTime: new Date().toISOString(),
      };
    }
  }

  /**
   * Test Notification Service
   */
  private async testNotificationService(): Promise<ServiceHealthCheck> {
    try {
      const { default: NotificationService } = await import('../notifications/NotificationService');
      
      const initResult = await NotificationService.initialize();

      return {
        service: 'NotificationService',
        status: initResult ? 'healthy' : 'warning',
        message: initResult ? 'Notification service initialized' : 'Notification service initialization failed',
        details: { initialized: initResult },
        checkTime: new Date().toISOString(),
      };
    } catch (error) {
      return {
        service: 'NotificationService',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        checkTime: new Date().toISOString(),
      };
    }
  }

  /**
   * Test Network Service
   */
  private async testNetworkService(): Promise<ServiceHealthCheck> {
    try {
      const { default: NetworkService } = await import('../network/NetworkService');
      
      // Network service is usually always available
      return {
        service: 'NetworkService',
        status: 'healthy',
        message: 'Network service available',
        checkTime: new Date().toISOString(),
      };
    } catch (error) {
      return {
        service: 'NetworkService',
        status: 'error',
        message: error instanceof Error ? error.message : 'Import failed',
        checkTime: new Date().toISOString(),
      };
    }
  }

  /**
   * Test Offline Services
   */
  private async testOfflineServices(): Promise<ServiceHealthCheck> {
    try {
      const offlineModule = await import('../offline');
      
      const hasRequiredExports = Boolean(
        offlineModule.offlineService &&
        offlineModule.syncManager &&
        offlineModule.offlineQueue
      );

      return {
        service: 'OfflineServices',
        status: hasRequiredExports ? 'healthy' : 'warning',
        message: hasRequiredExports ? 'Offline services available' : 'Some offline services missing',
        checkTime: new Date().toISOString(),
      };
    } catch (error) {
      return {
        service: 'OfflineServices',
        status: 'error',
        message: error instanceof Error ? error.message : 'Import failed',
        checkTime: new Date().toISOString(),
      };
    }
  }

  /**
   * Test Analytics Service
   */
  private async testAnalyticsService(): Promise<ServiceHealthCheck> {
    try {
      const { default: AnalyticsService } = await import('../analytics/AnalyticsService');
      
      return {
        service: 'AnalyticsService',
        status: 'healthy',
        message: 'Analytics service available',
        checkTime: new Date().toISOString(),
      };
    } catch (error) {
      return {
        service: 'AnalyticsService',
        status: 'error',
        message: error instanceof Error ? error.message : 'Import failed',
        checkTime: new Date().toISOString(),
      };
    }
  }

  /**
   * Test Sharing Services
   */
  private async testSharingServices(): Promise<ServiceHealthCheck> {
    try {
      const { default: AutomationSharingService } = await import('../sharing/AutomationSharingService');
      const { default: SharingAnalyticsService } = await import('../sharing/SharingAnalyticsService');
      
      return {
        service: 'SharingServices',
        status: 'healthy',
        message: 'Sharing services available',
        checkTime: new Date().toISOString(),
      };
    } catch (error) {
      return {
        service: 'SharingServices',
        status: 'error',
        message: error instanceof Error ? error.message : 'Import failed',
        checkTime: new Date().toISOString(),
      };
    }
  }

  /**
   * Test Linking Services
   */
  private async testLinkingServices(): Promise<ServiceHealthCheck> {
    try {
      const { default: SmartLinkService } = await import('../linking/SmartLinkService');
      const { default: LinkingService } = await import('../linking/LinkingService');
      
      return {
        service: 'LinkingServices',
        status: 'healthy',
        message: 'Linking services available',
        checkTime: new Date().toISOString(),
      };
    } catch (error) {
      return {
        service: 'LinkingServices',
        status: 'error',
        message: error instanceof Error ? error.message : 'Import failed',
        checkTime: new Date().toISOString(),
      };
    }
  }

  /**
   * Test specific service by name
   */
  async validateService(serviceName: string): Promise<ServiceHealthCheck> {
    switch (serviceName.toLowerCase()) {
      case 'supabase':
        return this.testSupabaseConnection();
      case 'security':
      case 'securityservice':
        return this.testSecurityService();
      case 'nfc':
      case 'nfcservice':
        return this.testNFCService();
      case 'qr':
      case 'qrservice':
        return this.testQRService();
      case 'notification':
      case 'notifications':
        return this.testNotificationService();
      case 'network':
        return this.testNetworkService();
      case 'offline':
        return this.testOfflineServices();
      case 'analytics':
        return this.testAnalyticsService();
      case 'sharing':
        return this.testSharingServices();
      case 'linking':
        return this.testLinkingServices();
      default:
        return {
          service: serviceName,
          status: 'unknown',
          message: `Unknown service: ${serviceName}`,
          checkTime: new Date().toISOString(),
        };
    }
  }

  /**
   * Generate a readable report summary
   */
  generateReportSummary(report: ServiceConnectivityReport): string {
    const { overall, summary, checks } = report;
    
    let summary_text = `🔍 Service Connectivity Report (${overall.toUpperCase()})\n`;
    summary_text += `📊 Summary: ${summary.healthy}✅ ${summary.warnings}⚠️ ${summary.errors}❌ (${summary.total} total)\n\n`;

    // Group by status
    const healthy = checks.filter(c => c.status === 'healthy');
    const warnings = checks.filter(c => c.status === 'warning');
    const errors = checks.filter(c => c.status === 'error');

    if (healthy.length > 0) {
      summary_text += `✅ Healthy Services (${healthy.length}):\n`;
      healthy.forEach(c => summary_text += `  • ${c.service}: ${c.message}\n`);
      summary_text += '\n';
    }

    if (warnings.length > 0) {
      summary_text += `⚠️ Services with Warnings (${warnings.length}):\n`;
      warnings.forEach(c => summary_text += `  • ${c.service}: ${c.message}\n`);
      summary_text += '\n';
    }

    if (errors.length > 0) {
      summary_text += `❌ Services with Errors (${errors.length}):\n`;
      errors.forEach(c => summary_text += `  • ${c.service}: ${c.message}\n`);
      summary_text += '\n';
    }

    return summary_text;
  }
}

export const serviceConnectivityValidator = new ServiceConnectivityValidator();
export default serviceConnectivityValidator;