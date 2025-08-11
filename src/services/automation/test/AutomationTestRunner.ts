import { AutomationEngine } from '../AutomationEngine';
import { AutomationData, ExecutionResult } from '../../../types';
import * as Notifications from 'expo-notifications';
import * as SMS from 'expo-sms';
import * as Clipboard from 'expo-clipboard';
import * as Location from 'expo-location';
import { Linking } from 'react-native';
import * as Sharing from 'expo-sharing';

interface TestResult {
  stepType: string;
  status: 'success' | 'failed' | 'skipped';
  error?: string;
  capabilities?: {
    isAvailable: boolean;
    requiresPermission?: boolean;
    permissionGranted?: boolean;
  };
}

export class AutomationTestRunner {
  private engine: AutomationEngine;
  private results: TestResult[] = [];

  constructor() {
    this.engine = new AutomationEngine();
  }

  async runAllTests(): Promise<TestResult[]> {
    console.log('Starting automation step tests...');
    
    // Test each step type
    await this.testNotificationStep();
    await this.testSMSStep();
    await this.testEmailStep();
    await this.testWebhookStep();
    await this.testDelayStep();
    await this.testVariableStep();
    await this.testLocationStep();
    await this.testConditionStep();
    await this.testTextStep();
    await this.testMathStep();
    await this.testPhotoStep();
    await this.testClipboardStep();
    await this.testAppStep();
    await this.testLoopStep();
    await this.testOpenUrlStep();
    await this.testShareTextStep();
    await this.testPromptInputStep();
    await this.testGetVariableStep();

    return this.results;
  }

  private createTestAutomation(id: string, name: string, stepType: string, stepConfig: any): AutomationData {
    return {
      id: `test-${id}`,
      title: name,
      description: `Test ${stepType} step`,
      created_by: 'test-user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_public: false,
      category: 'test',
      tags: [],
      execution_count: 0,
      average_rating: 0,
      rating_count: 0,
      steps: [{
        id: 'step-1',
        type: stepType as any,
        title: `Test ${stepType}`,
        config: stepConfig,
        enabled: true
      }]
    };
  }

  private async testNotificationStep() {
    const stepType = 'notification';
    try {
      const { status } = await Notifications.getPermissionsAsync();
      const isAvailable = status === 'granted';
      
      if (!isAvailable) {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        if (newStatus !== 'granted') {
          this.results.push({
            stepType,
            status: 'skipped',
            capabilities: {
              isAvailable: false,
              requiresPermission: true,
              permissionGranted: false
            }
          });
          return;
        }
      }

      const automation = this.createTestAutomation('notification', 'Test Notification', 'notification', {
        title: 'Test Title',
        body: 'Test notification body',
        badge: 1
      });

      const result = await this.engine.execute(automation);
      
      this.results.push({
        stepType,
        status: result.success ? 'success' : 'failed',
        capabilities: {
          isAvailable: true,
          requiresPermission: true,
          permissionGranted: true
        }
      });
    } catch (error) {
      this.results.push({
        stepType,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async testSMSStep() {
    const stepType = 'sms';
    try {
      const isAvailable = await SMS.isAvailableAsync();
      
      this.results.push({
        stepType,
        status: isAvailable ? 'success' : 'skipped',
        capabilities: {
          isAvailable,
          requiresPermission: false
        }
      });
    } catch (error) {
      this.results.push({
        stepType,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async testEmailStep() {
    const stepType = 'email';
    try {
      // Try to dynamically import MailComposer
      let isAvailable = false;
      try {
        const MailComposer = await import('expo-mail-composer').catch(() => null);
        if (MailComposer) {
          isAvailable = await MailComposer.isAvailableAsync();
        }
      } catch (e) {
        console.debug('Mail Composer module not available');
      }
      
      // Even if MailComposer isn't available, we can still use mailto: URLs
      if (!isAvailable) {
        // Check if mailto URL scheme is available as fallback
        const mailtoUrl = 'mailto:test@example.com';
        isAvailable = await Linking.canOpenURL(mailtoUrl);
      }
      
      this.results.push({
        stepType,
        status: isAvailable ? 'success' : 'skipped',
        capabilities: {
          isAvailable,
          requiresPermission: false
        }
      });
    } catch (error) {
      this.results.push({
        stepType,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async testWebhookStep() {
    const stepType = 'webhook';
    try {
      const automation = this.createTestAutomation('webhook', 'Test Webhook', 'webhook', {
        url: 'https://httpbin.org/post',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          test: 'data'
        }
      });

      const result = await this.engine.execute(automation);
      
      this.results.push({
        stepType,
        status: result.success ? 'success' : 'failed',
        capabilities: {
          isAvailable: true,
          requiresPermission: false
        }
      });
    } catch (error) {
      this.results.push({
        stepType,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async testDelayStep() {
    const stepType = 'delay';
    try {
      const automation = this.createTestAutomation('delay', 'Test Delay', 'delay', {
        delay: 100 // 100ms delay for testing
      });

      const result = await this.engine.execute(automation);
      
      this.results.push({
        stepType,
        status: result.success ? 'success' : 'failed',
        capabilities: {
          isAvailable: true,
          requiresPermission: false
        }
      });
    } catch (error) {
      this.results.push({
        stepType,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async testVariableStep() {
    const stepType = 'variable';
    try {
      const automation = this.createTestAutomation('variable', 'Test Variable', 'variable', {
        name: 'testVar',
        value: 'testValue'
      });

      const result = await this.engine.execute(automation);
      
      this.results.push({
        stepType,
        status: result.success ? 'success' : 'failed',
        capabilities: {
          isAvailable: true,
          requiresPermission: false
        }
      });
    } catch (error) {
      this.results.push({
        stepType,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async testLocationStep() {
    const stepType = 'location';
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      const isAvailable = status === 'granted';
      
      this.results.push({
        stepType,
        status: isAvailable ? 'success' : 'skipped',
        capabilities: {
          isAvailable,
          requiresPermission: true,
          permissionGranted: isAvailable
        }
      });
    } catch (error) {
      this.results.push({
        stepType,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async testConditionStep() {
    const stepType = 'condition';
    try {
      const automation = this.createTestAutomation('condition', 'Test Condition', 'condition', {
        type: 'equals',
        value1: '10',
        value2: '10'
      });

      const result = await this.engine.execute(automation);
      
      this.results.push({
        stepType,
        status: result.success ? 'success' : 'failed',
        capabilities: {
          isAvailable: true,
          requiresPermission: false
        }
      });
    } catch (error) {
      this.results.push({
        stepType,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async testTextStep() {
    const stepType = 'text';
    try {
      const automation = this.createTestAutomation('text', 'Test Text', 'text', {
        operation: 'uppercase',
        text: 'test'
      });

      const result = await this.engine.execute(automation);
      
      this.results.push({
        stepType,
        status: result.success ? 'success' : 'failed',
        capabilities: {
          isAvailable: true,
          requiresPermission: false
        }
      });
    } catch (error) {
      this.results.push({
        stepType,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async testMathStep() {
    const stepType = 'math';
    try {
      const automation = this.createTestAutomation('math', 'Test Math', 'math', {
        operation: 'add',
        value1: '10',
        value2: '20'
      });

      const result = await this.engine.execute(automation);
      
      this.results.push({
        stepType,
        status: result.success ? 'success' : 'failed',
        capabilities: {
          isAvailable: true,
          requiresPermission: false
        }
      });
    } catch (error) {
      this.results.push({
        stepType,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async testPhotoStep() {
    const stepType = 'photo';
    // Photo step requires user interaction, so we just check availability
    this.results.push({
      stepType,
      status: 'skipped',
      capabilities: {
        isAvailable: true,
        requiresPermission: true,
        permissionGranted: false
      }
    });
  }

  private async testClipboardStep() {
    const stepType = 'clipboard';
    try {
      const automation = this.createTestAutomation('clipboard', 'Test Clipboard', 'clipboard', {
        action: 'set',
        text: 'Test clipboard text'
      });

      const result = await this.engine.execute(automation);
      
      this.results.push({
        stepType,
        status: result.success ? 'success' : 'failed',
        capabilities: {
          isAvailable: true,
          requiresPermission: false
        }
      });
    } catch (error) {
      this.results.push({
        stepType,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async testAppStep() {
    const stepType = 'app';
    try {
      const automation = this.createTestAutomation('app', 'Test App', 'app', {
        appScheme: 'https://www.google.com'
      });

      const result = await this.engine.execute(automation);
      
      this.results.push({
        stepType,
        status: result.success ? 'success' : 'failed',
        capabilities: {
          isAvailable: true,
          requiresPermission: false
        }
      });
    } catch (error) {
      this.results.push({
        stepType,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async testLoopStep() {
    const stepType = 'loop';
    try {
      const automation = this.createTestAutomation('loop', 'Test Loop', 'loop', {
        type: 'count',
        count: '3'
      });

      const result = await this.engine.execute(automation);
      
      this.results.push({
        stepType,
        status: result.success ? 'success' : 'failed',
        capabilities: {
          isAvailable: true,
          requiresPermission: false
        }
      });
    } catch (error) {
      this.results.push({
        stepType,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async testOpenUrlStep() {
    const stepType = 'open_url';
    try {
      const automation = this.createTestAutomation('open-url', 'Test Open URL', 'open_url', {
        url: 'https://www.google.com'
      });

      const result = await this.engine.execute(automation);
      
      this.results.push({
        stepType,
        status: result.success ? 'success' : 'failed',
        capabilities: {
          isAvailable: true,
          requiresPermission: false
        }
      });
    } catch (error) {
      this.results.push({
        stepType,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async testShareTextStep() {
    const stepType = 'share_text';
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      
      this.results.push({
        stepType,
        status: isAvailable ? 'success' : 'skipped',
        capabilities: {
          isAvailable,
          requiresPermission: false
        }
      });
    } catch (error) {
      this.results.push({
        stepType,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async testPromptInputStep() {
    const stepType = 'prompt_input';
    // Prompt input requires user interaction, so we just mark as available
    this.results.push({
      stepType,
      status: 'skipped',
      capabilities: {
        isAvailable: true,
        requiresPermission: false
      }
    });
  }

  private async testGetVariableStep() {
    const stepType = 'get_variable';
    try {
      const automation: AutomationData = {
        id: 'test-get-variable',
        title: 'Test Get Variable',
        description: 'Test get variable step',
        created_by: 'test-user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_public: false,
        category: 'test',
        tags: [],
        execution_count: 0,
        average_rating: 0,
        rating_count: 0,
        steps: [
          {
            id: 'step-1',
            type: 'variable',
            title: 'Set Variable',
            config: {
              name: 'myVar',
              value: 'myValue'
            },
            enabled: true
          },
          {
            id: 'step-2',
            type: 'get_variable',
            title: 'Get Variable',
            config: {
              name: 'myVar'
            },
            enabled: true
          }
        ]
      };

      const result = await this.engine.execute(automation);
      
      this.results.push({
        stepType,
        status: result.success ? 'success' : 'failed',
        capabilities: {
          isAvailable: true,
          requiresPermission: false
        }
      });
    } catch (error) {
      this.results.push({
        stepType,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  formatResults(): string {
    let output = 'Automation Step Test Results\n';
    output += '============================\n\n';
    
    const successful = this.results.filter(r => r.status === 'success').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const skipped = this.results.filter(r => r.status === 'skipped').length;
    
    output += `Summary: ${successful} successful, ${failed} failed, ${skipped} skipped\n\n`;
    
    output += 'Detailed Results:\n';
    output += '-----------------\n';
    
    for (const result of this.results) {
      const statusEmoji = result.status === 'success' ? '✅' : 
                          result.status === 'failed' ? '❌' : '⏭️';
      
      output += `${statusEmoji} ${result.stepType}: ${result.status}\n`;
      
      if (result.capabilities) {
        output += `   Available: ${result.capabilities.isAvailable}\n`;
        if (result.capabilities.requiresPermission) {
          output += `   Permission Required: Yes\n`;
          output += `   Permission Granted: ${result.capabilities.permissionGranted || 'N/A'}\n`;
        }
      }
      
      if (result.error) {
        output += `   Error: ${result.error}\n`;
      }
      
      output += '\n';
    }
    
    return output;
  }
}