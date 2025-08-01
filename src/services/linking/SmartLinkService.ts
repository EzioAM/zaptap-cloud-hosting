import { AutomationData } from '../../types';

export interface SmartLinkOptions {
  webDomain?: string;
  appScheme?: string;
  embedData?: boolean;
  emergency?: boolean;
}

export interface SmartLinkResult {
  universalUrl: string;
  qrData: string;
  webFallbackUrl: string;
  appDeepLink: string;
  embedData?: AutomationData;
}

export class SmartLinkService {
  private webDomain: string;
  private appScheme: string;

  constructor(
    webDomain: string = 'https://zaptap.cloud',
    appScheme: string = 'zaptap'
  ) {
    this.webDomain = webDomain;
    this.appScheme = appScheme;
  }

  /**
   * Generates a smart link that automatically opens the app if installed,
   * otherwise redirects to web interface
   */
  generateSmartLink(
    automation: AutomationData,
    options: SmartLinkOptions = {}
  ): SmartLinkResult {
    const {
      webDomain = this.webDomain,
      appScheme = this.appScheme,
      embedData = false,
      emergency = false
    } = options;

    // Create deep link for app
    const appDeepLink = `${appScheme}://automation/${automation.id}`;

    // Create web fallback URL
    const webPath = emergency ? 'emergency' : 'run';
    const webFallbackUrl = `${webDomain}/${webPath}/${automation.id}`;

    // Universal link that checks for app first, then falls back to web
    const universalUrl = `${webDomain}/link/${automation.id}`;

    // For QR codes and NFC, we'll use the universal link
    let qrData = universalUrl;

    // For emergency scenarios, embed critical data in the URL
    if (emergency && embedData) {
      const emergencyData = this.extractEmergencyData(automation);
      const encodedData = encodeURIComponent(JSON.stringify(emergencyData));
      qrData = `${webDomain}/emergency/${automation.id}?data=${encodedData}`;
    }

    return {
      universalUrl,
      qrData,
      webFallbackUrl,
      appDeepLink,
      embedData: embedData ? automation : undefined,
    };
  }

  /**
   * Extracts emergency-relevant data from automation for embedding
   */
  private extractEmergencyData(automation: AutomationData): any {
    const emergencyData: any = {
      title: automation.title,
      description: automation.description,
      steps: [],
    };

    // Extract only essential steps that can work without the app
    automation.steps.forEach(step => {
      switch (step.type) {
        case 'sms':
          emergencyData.steps.push({
            type: 'sms',
            phoneNumber: step.config.phoneNumber,
            message: step.config.message,
          });
          break;
        case 'notification':
          emergencyData.steps.push({
            type: 'display',
            message: step.config.message || step.config.title,
          });
          break;
        case 'location':
          if (step.config.action === 'share_location') {
            emergencyData.steps.push({
              type: 'location',
              action: 'share',
              phoneNumber: step.config.phoneNumber,
              message: step.config.message,
            });
          }
          break;
        case 'app':
          if (step.config.appName.toLowerCase() === 'phone' || step.config.url?.includes('tel:')) {
            emergencyData.steps.push({
              type: 'call',
              phoneNumber: step.config.url?.replace('tel:', '') || step.config.phoneNumber,
            });
          }
          break;
      }
    });

    return emergencyData;
  }

  /**
   * Generates emergency-specific links for lost pet scenarios
   */
  generateEmergencyLink(automation: AutomationData): SmartLinkResult {
    return this.generateSmartLink(automation, {
      embedData: true,
      emergency: true,
    });
  }

  /**
   * Creates a sharing link for social media and messaging
   */
  generateSharingLink(automation: AutomationData, message?: string): string {
    const smartLink = this.generateSmartLink(automation);
    const shareText = message || 
      `Check out my automation "${automation.title}"! ${automation.description || ''}`;
    
    return `${shareText}\n\nTry it here: ${smartLink.universalUrl}`;
  }

  /**
   * Validates if a URL is a valid smart link
   */
  isSmartLink(url: string): boolean {
    return url.includes(this.webDomain) && 
           (url.includes('/automation/') || url.includes('/share/') || url.includes('/app/') || 
            url.includes('/link/') || url.includes('/run/') || url.includes('/emergency/'));
  }

  /**
   * Extracts automation ID from any smart link format
   */
  extractAutomationId(url: string): string | null {
    const patterns = [
      /\/link\/([^/?]+)/,
      /\/run\/([^/?]+)/,
      /\/emergency\/([^/?]+)/,
      /automation\/([^/?]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Generates web page HTML for standalone execution
   */
  generateWebExecutionPage(automation: AutomationData, baseUrl: string = this.webDomain): string {
    const emergencyData = this.extractEmergencyData(automation);
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${automation.title} - Zaptap</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 400px;
            width: 100%;
            overflow: hidden;
        }
        .header {
            background: #6200ee;
            color: white;
            padding: 24px;
            text-align: center;
        }
        .title { font-size: 24px; font-weight: bold; margin-bottom: 8px; }
        .description { opacity: 0.9; font-size: 14px; }
        .content { padding: 24px; }
        .step {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 16px;
            border-left: 4px solid #6200ee;
        }
        .step-type { 
            font-size: 12px; 
            color: #6200ee; 
            font-weight: 600; 
            text-transform: uppercase;
            margin-bottom: 8px;
        }
        .step-content { font-size: 16px; color: #333; }
        .action-btn {
            background: #6200ee;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
            margin-bottom: 12px;
            transition: background 0.2s;
        }
        .action-btn:hover { background: #5500cc; }
        .secondary-btn {
            background: #f0f0f0;
            color: #333;
            border: 2px solid #ddd;
        }
        .secondary-btn:hover { background: #e0e0e0; }
        .footer {
            text-align: center;
            padding: 16px;
            border-top: 1px solid #eee;
            font-size: 12px;
            color: #666;
        }
        .download-link { color: #6200ee; text-decoration: none; font-weight: 600; }
    </style>
    <script>
        // Embedded WebAutomationEngine for standalone execution
        ${this.getWebAutomationEngineScript()}
    </script>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="title">${automation.title}</div>
            ${automation.description ? `<div class="description">${automation.description}</div>` : ''}
        </div>
        
        <div class="content">
            <div id="steps">
                ${emergencyData.steps.map((step: any, index: number) => `
                    <div class="step">
                        <div class="step-type">${step.type}</div>
                        <div class="step-content">
                            ${this.generateStepHTML(step)}
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <button class="action-btn" onclick="executeAutomation()">
                🚀 Run Automation
            </button>
            
            <button class="action-btn secondary-btn" onclick="tryApp()">
                📱 Open in Zaptap App
            </button>
        </div>
        
        <div class="footer">
            Powered by <a href="${baseUrl}" class="download-link">Zaptap</a><br>
            <a href="${baseUrl}/download" class="download-link">Download the app</a> for full features
        </div>
    </div>

    <script>
        const automationData = ${JSON.stringify(emergencyData)};
        const fullAutomationData = ${JSON.stringify(automation)};
        
        // Check if automation can run in web
        const webCompatible = ${this.canExecuteInWeb(automation)};
        const incompatibleSteps = ${JSON.stringify(this.getIncompatibleSteps(automation))};
        
        let webEngine = null;
        
        function executeAutomation() {
            if (webCompatible && window.WebAutomationEngine) {
                executeWithWebEngine();
            } else {
                executeLegacySteps();
            }
        }
        
        async function executeWithWebEngine() {
            try {
                if (!webEngine) {
                    webEngine = new window.WebAutomationEngine();
                    await webEngine.requestPermissions();
                }
                
                const result = await webEngine.execute(fullAutomationData);
                
                if (result.success) {
                    showResults('✅ Automation completed successfully!', result.stepResults);
                } else {
                    showResults('⚠️ Automation completed with some errors', result.stepResults);
                }
                
                if (result.incompatibleSteps.length > 0) {
                    console.warn('Some steps were not compatible with web execution:', result.incompatibleSteps);
                }
            } catch (error) {
                console.error('Web engine execution failed:', error);
                showResults('❌ Automation failed: ' + error.message);
                executeLegacySteps();
            }
        }
        
        function showResults(message, stepResults = []) {
            const resultDiv = document.createElement('div');
            resultDiv.style.cssText = \`
                position: fixed; top: 20px; right: 20px; 
                background: white; border: 2px solid #6200ee; border-radius: 12px;
                padding: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                max-width: 300px; z-index: 1000; font-family: sans-serif;
            \`;
            
            resultDiv.innerHTML = \`
                <div style="font-weight: bold; margin-bottom: 8px;">\${message}</div>
                \${stepResults.length > 0 ? \`
                    <div style="font-size: 12px; color: #666;">
                        \${stepResults.filter(r => r.success).length}/\${stepResults.length} steps completed
                    </div>
                \` : ''}
                <button onclick="this.parentElement.remove()" style="
                    background: #6200ee; color: white; border: none; padding: 4px 8px;
                    border-radius: 4px; margin-top: 8px; cursor: pointer; font-size: 12px;
                ">Close</button>
            \`;
            
            document.body.appendChild(resultDiv);
            setTimeout(() => resultDiv.remove(), 5000);
        }
        
        function executeLegacySteps() {
            automationData.steps.forEach((step, index) => {
                setTimeout(() => executeStep(step), index * 1000);
            });
        }
        
        function executeStep(step) {
            switch (step.type) {
                case 'sms':
                    if (step.phoneNumber) {
                        window.open(\`sms:\${step.phoneNumber}?body=\${encodeURIComponent(step.message || '')}\`);
                    }
                    break;
                case 'call':
                    if (step.phoneNumber) {
                        window.open(\`tel:\${step.phoneNumber}\`);
                    }
                    break;
                case 'location':
                    if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(pos => {
                            const { latitude, longitude } = pos.coords;
                            const message = \`\${step.message || 'Location'}: https://maps.google.com/?q=\${latitude},\${longitude}\`;
                            if (step.phoneNumber) {
                                window.open(\`sms:\${step.phoneNumber}?body=\${encodeURIComponent(message)}\`);
                            } else {
                                alert(message);
                            }
                        });
                    }
                    break;
                case 'display':
                    alert(step.message);
                    break;
            }
        }
        
        function tryApp() {
            // Try to open the app first
            const appUrl = '${this.appScheme}://automation/${automation.id}';
            window.location.href = appUrl;
            
            // If app doesn't open within 2 seconds, redirect to app store
            setTimeout(() => {
                if (!document.hidden) {
                    window.open('${baseUrl}/download', '_blank');
                }
            }, 2000);
        }
        
        // Auto-try app on page load
        window.onload = function() {
            // Small delay to ensure page is fully loaded
            setTimeout(tryApp, 500);
        };
    </script>
</body>
</html>`;
  }

  private generateStepHTML(step: any): string {
    switch (step.type) {
      case 'sms':
        return `📱 Send SMS to ${step.phoneNumber}<br><em>"${step.message}"</em>`;
      case 'call':
        return `📞 Call ${step.phoneNumber}`;
      case 'location':
        return `📍 Share current location${step.phoneNumber ? ` to ${step.phoneNumber}` : ''}`;
      case 'display':
        return `💬 ${step.message}`;
      default:
        return step.message || 'Automation step';
    }
  }

  /**
   * Check if automation can run in web environment
   */
  private canExecuteInWeb(automation: AutomationData): boolean {
    const webCompatibleTypes = [
      'notification', 'sms', 'email', 'delay', 'variable', 'get_variable',
      'text', 'math', 'clipboard', 'open_url', 'location', 'app'
    ];

    return automation.steps.some(step => 
      step.enabled && webCompatibleTypes.includes(step.type)
    );
  }

  /**
   * Get steps that cannot run in web environment
   */
  private getIncompatibleSteps(automation: AutomationData): any[] {
    const webCompatibleTypes = [
      'notification', 'sms', 'email', 'delay', 'variable', 'get_variable',
      'text', 'math', 'clipboard', 'open_url', 'location', 'app'
    ];

    return automation.steps.filter(step => 
      step.enabled && !webCompatibleTypes.includes(step.type)
    );
  }

  /**
   * Returns minified WebAutomationEngine code for embedding
   */
  private getWebAutomationEngineScript(): string {
    return `
      // Minimal WebAutomationEngine for web execution
      class WebAutomationEngine {
        constructor() {
          this.variables = new Map();
          this.setupExecutors();
        }
        
        setupExecutors() {
          this.executors = {
            sms: (step) => {
              const { phoneNumber, message } = step.config;
              window.open(\`sms:\${phoneNumber}?body=\${encodeURIComponent(message || '')}\`);
              return { success: true, action: 'sms_opened' };
            },
            call: (step) => {
              const { phoneNumber } = step.config;
              window.open(\`tel:\${phoneNumber}\`);
              return { success: true, action: 'call_initiated' };
            },
            email: (step) => {
              const { recipient, subject, body } = step.config;
              const url = \`mailto:\${recipient}?subject=\${encodeURIComponent(subject || '')}&body=\${encodeURIComponent(body || '')}\`;
              window.open(url);
              return { success: true, action: 'email_opened' };
            },
            open_url: (step) => {
              const { url, openInNewTab = true } = step.config;
              if (openInNewTab) window.open(url, '_blank');
              else window.location.href = url;
              return { success: true, action: 'url_opened' };
            },
            notification: (step) => {
              const { title, message } = step.config;
              const text = \`\${title ? title + '\\n' : ''}\${message || ''}\`;
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(title || 'Automation', { body: message });
              } else {
                alert(text);
              }
              return { success: true, action: 'notification_shown' };
            },
            delay: async (step) => {
              const { duration = 1000 } = step.config;
              await new Promise(resolve => setTimeout(resolve, duration));
              return { success: true, action: 'delay_completed' };
            },
            text: async (step) => {
              const { text, action = 'display' } = step.config;
              if (action === 'copy' && navigator.clipboard) {
                await navigator.clipboard.writeText(text);
                return { success: true, action: 'text_copied' };
              } else {
                alert(text);
                return { success: true, action: 'text_displayed' };
              }
            },
            location: (step) => {
              return new Promise((resolve, reject) => {
                if (!navigator.geolocation) {
                  reject(new Error('Geolocation not supported'));
                  return;
                }
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    const { latitude, longitude } = position.coords;
                    const { action, phoneNumber, message } = step.config;
                    if (action === 'share_location' && phoneNumber) {
                      const locationMessage = \`\${message || 'My location'}: https://maps.google.com/?q=\${latitude},\${longitude}\`;
                      window.open(\`sms:\${phoneNumber}?body=\${encodeURIComponent(locationMessage)}\`);
                    }
                    resolve({ success: true, action: 'location_obtained', latitude, longitude });
                  },
                  (error) => reject(new Error(\`Location error: \${error.message}\`)),
                  { timeout: 10000, enableHighAccuracy: true }
                );
              });
            }
          };
        }
        
        async execute(automation) {
          const result = { success: true, stepResults: [], incompatibleSteps: [] };
          
          for (const step of automation.steps) {
            if (!step.enabled) continue;
            
            const executor = this.executors[step.type];
            if (!executor) {
              result.incompatibleSteps.push(step.type);
              result.stepResults.push({ stepId: step.id, success: false, error: 'Unsupported step type' });
              continue;
            }
            
            try {
              const stepResult = await executor(step);
              result.stepResults.push({ stepId: step.id, success: true, result: stepResult });
            } catch (error) {
              result.stepResults.push({ stepId: step.id, success: false, error: error.message });
              result.success = false;
            }
          }
          
          return result;
        }
        
        async requestPermissions() {
          if ('Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission();
          }
          return true;
        }
      }
      
      window.WebAutomationEngine = WebAutomationEngine;
    `;
  }
}

// Singleton instance
export const smartLinkService = new SmartLinkService();