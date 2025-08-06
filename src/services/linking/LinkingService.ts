import { Linking } from 'react-native';
import { NavigationContainerRef } from '@react-navigation/native';
import { smartLinkService } from './SmartLinkService';
import { Logger } from '../../utils/Logger';
import { AutomationEngine } from '../automation/AutomationEngine';
import { Alert } from 'react-native';
import { supabase } from '../supabase/client';
import { AutomationData } from '../../types';

export interface DeepLinkData {
  type: 'automation' | 'share' | 'emergency';
  automationId?: string;
  action?: string;
  data?: any;
}

export class LinkingService {
  private logger: Logger;
  private navigationRef: NavigationContainerRef<any> | null = null;
  private automationEngine: AutomationEngine;
  private isInitialized: boolean = false;

  constructor() {
    this.logger = new Logger('LinkingService');
    this.automationEngine = new AutomationEngine();
  }

  /**
   * Initialize the linking service with navigation reference
   */
  initialize(navigationRef: NavigationContainerRef<any>) {
    this.navigationRef = navigationRef;
    this.isInitialized = true;
    this.setupLinkingListeners();
  }

  /**
   * Set up listeners for incoming links
   */
  private setupLinkingListeners() {
    // Handle initial URL if app was opened with a link
    Linking.getInitialURL().then(url => {
      if (url) {
        // Don't log Expo development URLs as deep links
        if (!url.includes('expo-development-client') && !url.startsWith('exp+zaptap://')) {
          this.logger.info('App opened with initial URL', { url });
        }
        this.handleIncomingLink(url);
      }
    });

    // Handle incoming links while app is running
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      // Don't log Expo development URLs as deep links
      if (!url.includes('expo-development-client') && !url.startsWith('exp+zaptap://')) {
        this.logger.info('Received deep link', { url });
      }
      this.handleIncomingLink(url);
    });

    return linkingSubscription;
  }

  /**
   * Parse and handle incoming deep links
   */
  private async handleIncomingLink(url: string) {
    try {
      if (!this.isInitialized || !this.navigationRef) {
        this.logger.warn('LinkingService not initialized, queuing link', { url });
        // Could queue the link for later processing
        return;
      }

      const linkData = this.parseDeepLink(url);
      if (!linkData) {
        // Don't warn for Expo development URLs
        if (!url.includes('expo-development-client') && !url.startsWith('exp+zaptap://')) {
          this.logger.warn('Invalid deep link format', { url });
        }
        return;
      }

      this.logger.info('Parsed deep link', { linkData });
      await this.processDeepLink(linkData);

    } catch (error) {
      this.logger.error('Failed to handle deep link', { url, error });
      Alert.alert(
        'Link Error',
        'There was an issue opening this link. Please try again.'
      );
    }
  }

  /**
   * Parse deep link URL into structured data
   */
  private parseDeepLink(url: string): DeepLinkData | null {
    try {
      // Ignore Expo development client URLs
      if (url.includes('expo-development-client') || url.startsWith('exp+zaptap://')) {
        this.logger.debug('Ignoring Expo development URL', { url });
        return null;
      }
      
      // Handle app scheme links (zaptap:// or legacy shortcuts-like://)
      if (url.startsWith('zaptap://') || url.startsWith('shortcuts-like://')) {
        return this.parseAppSchemeLink(url);
      }

      // Handle universal links (https://zaptap.app/...)
      if (smartLinkService.isSmartLink(url)) {
        return this.parseUniversalLink(url);
      }

      return null;
    } catch (error) {
      this.logger.error('Error parsing deep link', { url, error });
      return null;
    }
  }

  /**
   * Parse app scheme deep links
   */
  private parseAppSchemeLink(url: string): DeepLinkData | null {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);

    switch (pathParts[0]) {
      case 'automation':
        return {
          type: 'automation',
          automationId: pathParts[1],
          action: urlObj.searchParams.get('action') || 'run'
        };
      
      case 'share':
        return {
          type: 'share',
          automationId: pathParts[1],
          data: urlObj.searchParams.get('data') ? 
            JSON.parse(decodeURIComponent(urlObj.searchParams.get('data')!)) : undefined
        };
      
      case 'emergency':
        return {
          type: 'emergency',
          automationId: pathParts[1],
          data: urlObj.searchParams.get('data') ? 
            JSON.parse(decodeURIComponent(urlObj.searchParams.get('data')!)) : undefined
        };
      
      case 'reset-password':
        return {
          type: 'reset-password',
          data: {
            access_token: urlObj.searchParams.get('access_token'),
            refresh_token: urlObj.searchParams.get('refresh_token')
          }
        };
      
      default:
        return null;
    }
  }

  /**
   * Parse universal/smart links
   */
  private parseUniversalLink(url: string): DeepLinkData | null {
    const automationId = smartLinkService.extractAutomationId(url);
    if (!automationId) return null;

    // Determine type based on URL path
    if (url.includes('/emergency/')) {
      return {
        type: 'emergency',
        automationId,
        data: this.extractUrlData(url)
      };
    } else if (url.includes('/share/')) {
      return {
        type: 'share',
        automationId,
        data: this.extractUrlData(url)
      };
    } else {
      return {
        type: 'automation',
        automationId,
        action: 'run'
      };
    }
  }

  /**
   * Extract embedded data from URL parameters
   */
  private extractUrlData(url: string): any {
    try {
      const urlObj = new URL(url);
      const dataParam = urlObj.searchParams.get('data');
      return dataParam ? JSON.parse(decodeURIComponent(dataParam)) : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Process the parsed deep link data
   */
  private async processDeepLink(linkData: DeepLinkData) {
    switch (linkData.type) {
      case 'automation':
        await this.handleAutomationLink(linkData);
        break;
      
      case 'share':
        await this.handleShareLink(linkData);
        break;
      
      case 'emergency':
        await this.handleEmergencyLink(linkData);
        break;
      
      default:
        this.logger.warn('Unknown deep link type', { linkData });
    }
  }

  /**
   * Handle automation execution links
   */
  private async handleAutomationLink(linkData: DeepLinkData) {
    if (!linkData.automationId) {
      Alert.alert('Debug Info', 'No automation ID provided in link data');
      return;
    }

    try {
      // IMMEDIATE DEBUG ALERT
      Alert.alert(
        'NFC Debug Info',
        `Automation ID from NFC: ${linkData.automationId}\n\nChecking database...`,
        [{ text: 'OK' }]
      );

      // Validate UUID format first
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(linkData.automationId)) {
        // Skip database check for invalid IDs
        Alert.alert(
          'Invalid Automation ID',
          `The NFC tag contains an invalid automation ID format:\n\n${linkData.automationId}\n\nThis appears to be from an older version. Please write a new automation to this tag.`,
          [{ text: 'OK' }]
        );
        return;
      }

      // First, try to fetch the automation from database
      const automation = await this.fetchAutomation(linkData.automationId);
      
      if (!automation) {
        Alert.alert(
          'Automation Not Found - Debug',
          `Could not find automation with ID:\n${linkData.automationId}\n\nThis means either:\n1. The automation was deleted\n2. Wrong ID in NFC tag\n3. Database permission issue`,
          [{ text: 'OK' }]
        );
        return;
      }

      // Show confirmation dialog with automation details
      Alert.alert(
        'Run Automation',
        `${automation.title}\n\n${automation.description || 'No description'}\n\nThis automation has ${automation.steps?.length || 0} steps. Would you like to run it?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Run', 
            onPress: async () => {
              await this.executeAutomation(automation);
            }
          }
        ]
      );
    } catch (error) {
      this.logger.error('Failed to handle automation link', { error });
      Alert.alert(
        'Error',
        'There was an error loading this automation. Please check your connection and try again.'
      );
    }
  }

  /**
   * Fetch automation from database
   */
  private async fetchAutomation(automationId: string): Promise<AutomationData | null> {
    try {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(automationId)) {
        Alert.alert(
          'Invalid NFC Tag',
          `This NFC tag contains an old or invalid automation ID:\n\n${automationId}\n\nThis tag was likely created with an older version of the app. Please:\n\n1. Create a new automation\n2. Write it to this NFC tag again`,
          [
            { text: 'OK' },
            { 
              text: 'Go to My Automations', 
              onPress: () => {
                // Navigate to My Automations screen
                // Note: We don't have access to navigation here, so we'll just log
                this.logger.info('User requested navigation to My Automations');
              }
            }
          ]
        );
        return null;
      }

      // Check current auth status
      const { data: { session } } = await supabase.auth.getSession();
      
      // STEP 1: Show what's in the database
      const { data: allAutomations, error: listError } = await supabase
        .from('automations')
        .select('id, title, is_public, created_by')
        .limit(5);

      if (listError) {
        Alert.alert(
          'Database Error',
          `Cannot connect to database: ${listError.message}`,
          [{ text: 'OK' }]
        );
        return null;
      }

      // Show what automations exist with full IDs for debugging
      const automationList = allAutomations?.map(a => `• ${a.title}\n  ID: ${a.id}`).join('\n\n') || 'None found';
      
      Alert.alert(
        'Database Check',
        `Found ${allAutomations?.length || 0} automations:\n\n${automationList}\n\n--- LOOKING FOR ---\n${automationId}`,
        [
          { text: 'Copy Morning Routine ID', onPress: () => {
            // Find the Morning Routine automation
            const morningRoutine = allAutomations?.find(a => a.title.toLowerCase().includes('morning'));
            if (morningRoutine) {
              Alert.alert(
                'Morning Routine ID',
                `Copy this ID and use it to rewrite your NFC tag:\n\n${morningRoutine.id}`,
                [{ text: 'OK' }]
              );
            }
          }},
          { text: 'Continue' }
        ]
      );

      // STEP 2: Try to fetch the specific automation
      const { data, error } = await supabase
        .from('automations')
        .select('*')
        .eq('id', automationId);

      if (error) {
        Alert.alert(
          'Database Query Error',
          `Error querying automation ${automationId}:\n\n${error.message}\n\nCode: ${error.code}`,
          [{ text: 'OK' }]
        );
        return null;
      }

      if (!data || data.length === 0) {
        Alert.alert(
          'Automation Not Found',
          `The automation with ID ${automationId} was not found in the database.\n\nThis could mean:\n1. The automation was deleted\n2. It was never saved (template preview)\n3. The NFC tag contains an old ID`,
          [{ text: 'OK' }]
        );
        return null;
      }

      if (data.length > 1) {
        Alert.alert(
          'Multiple Automations Found',
          `Found ${data.length} automations with the same ID. This should not happen. Using the first one.`,
          [{ text: 'OK' }]
        );
      }

      const automation = data[0];

      Alert.alert(
        'Success!',
        `Found automation: ${automation.title}\nSteps: ${automation.steps?.length || 0}\nPublic: ${automation.is_public}`,
        [{ text: 'Continue' }]
      );

      return automation;
    } catch (error) {
      Alert.alert(
        'Exception Error',
        `Exception while fetching automation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        [{ text: 'OK' }]
      );
      return null;
    }
  }

  /**
   * Execute automation with proper error handling
   */
  private async executeAutomation(automation: AutomationData) {
    try {
      this.logger.info('Starting automation execution', { 
        automationId: automation.id,
        title: automation.title 
      });

      // Show loading state
      Alert.alert('🚀 Running Automation', 'Executing steps...', [], { cancelable: false });

      // Execute the automation
      const result = await this.automationEngine.execute(automation, {}, {
        onStepStart: (stepIndex, step) => {
          this.logger.info(`Executing step ${stepIndex + 1}: ${step.title}`);
        },
        onStepComplete: (stepIndex, result) => {
          this.logger.info(`Step ${stepIndex + 1} completed`, { result });
        },
        onStepError: (stepIndex, error) => {
          this.logger.error(`Step ${stepIndex + 1} failed`, { error });
        }
      });

      // Dismiss loading alert
      // Note: In React Native, we can't programmatically dismiss an alert,
      // so we'll show the result immediately

      if (result.success) {
        Alert.alert(
          '✅ Automation Complete',
          `"${automation.title}" executed successfully!\n\n` +
          `• Steps completed: ${result.stepsCompleted}/${result.totalSteps}\n` +
          `• Execution time: ${Math.round(result.executionTime / 1000 * 10) / 10}s`,
          [
            { text: 'View Details', onPress: () => {
              this.navigationRef?.navigate('AutomationDetails', {
                automationId: automation.id
              });
            }},
            { text: 'OK' }
          ]
        );
      } else {
        Alert.alert(
          '❌ Automation Failed',
          `"${automation.title}" failed to execute.\n\n` +
          `Error: ${result.error}\n` +
          `• Steps completed: ${result.stepsCompleted}/${result.totalSteps}`,
          [
            { text: 'View Details', onPress: () => {
              this.navigationRef?.navigate('AutomationDetails', {
                automationId: automation.id
              });
            }},
            { text: 'OK' }
          ]
        );
      }

    } catch (error) {
      this.logger.error('Failed to execute automation', { error });
      Alert.alert(
        '💥 Execution Error',
        `Failed to run "${automation.title}".\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`,
        [{ text: 'OK' }]
      );
    }
  }

  /**
   * Handle automation sharing links
   */
  private async handleShareLink(linkData: DeepLinkData) {
    if (!linkData.automationId) return;

    // Navigate to automation details for sharing/viewing
    this.navigationRef?.navigate('AutomationDetails', {
      automationId: linkData.automationId,
      mode: 'share'
    });
  }

  /**
   * Handle emergency automation links
   */
  private async handleEmergencyLink(linkData: DeepLinkData) {
    if (!linkData.automationId) return;

    try {
      Alert.alert(
        '🚨 Emergency Automation',
        'This appears to be an emergency automation. Would you like to run it immediately?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Run Now', 
            style: 'destructive',
            onPress: async () => {
              try {
                // Execute emergency automation immediately
                if (linkData.data) {
                  // Use embedded data for offline execution
                  await this.executeEmergencyData(linkData.data);
                } else {
                  // Fetch and execute from server
                  Alert.alert('Info', 'Would fetch and execute emergency automation');
                }
              } catch (error) {
                this.logger.error('Failed to execute emergency automation', { error });
                Alert.alert('Error', 'Failed to run emergency automation');
              }
            }
          }
        ]
      );
    } catch (error) {
      this.logger.error('Failed to handle emergency link', { error });
    }
  }

  /**
   * Execute emergency automation from embedded data
   */
  private async executeEmergencyData(emergencyData: any) {
    try {
      this.logger.info('Executing emergency automation', { emergencyData });
      
      // Convert emergency data back to automation format
      const mockAutomation = {
        id: 'emergency',
        title: emergencyData.title || 'Emergency Automation',
        description: emergencyData.description || '',
        steps: emergencyData.steps.map((step: any, index: number) => ({
          id: `emergency-step-${index}`,
          type: step.type,
          title: `Emergency ${step.type}`,
          enabled: true,
          config: step
        })),
        triggers: [],
        created_by: 'emergency',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_public: false,
        category: 'emergency',
        tags: ['emergency'],
        execution_count: 0,
        average_rating: 0,
        rating_count: 0
      };

      // Execute the emergency automation
      const result = await this.automationEngine.execute(mockAutomation);
      
      if (result.success) {
        Alert.alert('✅ Emergency Automation Complete', 'All emergency steps have been executed.');
      } else {
        Alert.alert('⚠️ Emergency Automation Failed', result.error || 'Unknown error occurred');
      }

    } catch (error) {
      this.logger.error('Failed to execute emergency data', { error });
      throw error;
    }
  }

  /**
   * Generate deep link for sharing
   */
  generateDeepLink(automationId: string, type: 'automation' | 'share' | 'emergency' = 'automation'): string {
    return `shortcuts-like://${type}/${automationId}`;
  }

  /**
   * Check if the app can handle a specific URL
   */
  async canHandleURL(url: string): Promise<boolean> {
    try {
      return await Linking.canOpenURL(url);
    } catch {
      return false;
    }
  }

  /**
   * Open URL in external browser or app
   */
  async openURL(url: string): Promise<boolean> {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error('Failed to open URL', { url, error });
      return false;
    }
  }
}

// Singleton instance
export const linkingService = new LinkingService();