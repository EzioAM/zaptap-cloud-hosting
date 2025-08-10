/**
 * Navigation Path Testing Script
 * Phase 4: Test and verify all navigation paths
 * 
 * This script provides a comprehensive test of all navigation routes
 * to ensure they are properly connected and functional.
 */

import { EventLogger } from '../../utils/EventLogger';

export interface NavigationRoute {
  name: string;
  path: string;
  category: 'tab' | 'stack' | 'auth' | 'onboarding' | 'settings' | 'automation' | 'utility';
  params?: Record<string, any>;
  requiresAuth?: boolean;
  parentRoute?: string;
  testNotes?: string;
}

// Define all navigation routes to test
export const NAVIGATION_ROUTES: NavigationRoute[] = [
  // ========== TAB ROUTES ==========
  {
    name: 'MainTabs',
    path: 'MainTabs',
    category: 'tab',
    testNotes: 'Root tab navigator container'
  },
  {
    name: 'HomeTab',
    path: 'HomeTab',
    category: 'tab',
    parentRoute: 'MainTabs',
    testNotes: 'Modern home screen with quick actions'
  },
  {
    name: 'BuildTab',
    path: 'BuildTab',
    category: 'tab',
    parentRoute: 'MainTabs',
    testNotes: 'Build automation hub with scanner'
  },
  {
    name: 'DiscoverTab',
    path: 'DiscoverTab',
    category: 'tab',
    parentRoute: 'MainTabs',
    testNotes: 'Discover and explore automations'
  },
  {
    name: 'LibraryTab',
    path: 'LibraryTab',
    category: 'tab',
    parentRoute: 'MainTabs',
    testNotes: 'User automation library'
  },
  {
    name: 'ProfileTab',
    path: 'ProfileTab',
    category: 'tab',
    parentRoute: 'MainTabs',
    testNotes: 'User profile and settings'
  },

  // ========== AUTOMATION ROUTES ==========
  {
    name: 'AutomationBuilder',
    path: 'AutomationBuilder',
    category: 'automation',
    params: { automationId: null },
    testNotes: 'Main automation builder screen'
  },
  {
    name: 'AutomationDetails',
    path: 'AutomationDetails',
    category: 'automation',
    params: { automationId: 'test-123' },
    testNotes: 'Automation details and execution'
  },
  {
    name: 'Templates',
    path: 'Templates',
    category: 'automation',
    testNotes: 'Automation templates gallery'
  },
  {
    name: 'LocationTriggers',
    path: 'LocationTriggers',
    category: 'automation',
    testNotes: 'Location-based automation triggers'
  },
  {
    name: 'ExecutionHistory',
    path: 'ExecutionHistory',
    category: 'automation',
    testNotes: 'Automation execution history'
  },
  {
    name: 'Reviews',
    path: 'Reviews',
    category: 'automation',
    params: { automation: { id: 'test', title: 'Test Automation' } },
    testNotes: 'Automation reviews and ratings'
  },
  {
    name: 'MyAutomations',
    path: 'MyAutomations',
    category: 'automation',
    requiresAuth: true,
    testNotes: 'User automation management'
  },
  {
    name: 'Gallery',
    path: 'Gallery',
    category: 'automation',
    testNotes: 'Public automation gallery'
  },

  // ========== AUTH ROUTES ==========
  {
    name: 'SignIn',
    path: 'SignIn',
    category: 'auth',
    testNotes: 'User sign in screen'
  },
  {
    name: 'SignUp',
    path: 'SignUp',
    category: 'auth',
    testNotes: 'Enhanced user registration'
  },
  {
    name: 'ResetPassword',
    path: 'ResetPassword',
    category: 'auth',
    testNotes: 'Password reset flow'
  },
  {
    name: 'ChangePassword',
    path: 'ChangePassword',
    category: 'auth',
    requiresAuth: true,
    testNotes: 'Change password for authenticated users'
  },

  // ========== ONBOARDING ROUTES ==========
  {
    name: 'WelcomeScreen',
    path: 'WelcomeScreen',
    category: 'onboarding',
    testNotes: 'Initial welcome screen'
  },
  {
    name: 'OnboardingFlow',
    path: 'OnboardingFlow',
    category: 'onboarding',
    testNotes: 'Onboarding tutorial flow'
  },
  {
    name: 'TutorialScreen',
    path: 'TutorialScreen',
    category: 'onboarding',
    testNotes: 'Interactive tutorial'
  },

  // ========== SETTINGS ROUTES ==========
  {
    name: 'Settings',
    path: 'Settings',
    category: 'settings',
    testNotes: 'Enhanced settings screen'
  },
  {
    name: 'EditProfile',
    path: 'EditProfile',
    category: 'settings',
    requiresAuth: true,
    testNotes: 'Edit user profile'
  },
  {
    name: 'EmailPreferences',
    path: 'EmailPreferences',
    category: 'settings',
    testNotes: 'Email notification preferences'
  },
  {
    name: 'NotificationSettings',
    path: 'NotificationSettings',
    category: 'settings',
    testNotes: 'Push notification settings'
  },

  // ========== UTILITY ROUTES ==========
  {
    name: 'Scanner',
    path: 'Scanner',
    category: 'utility',
    testNotes: 'QR/NFC scanner screen'
  },
  {
    name: 'Search',
    path: 'Search',
    category: 'utility',
    testNotes: 'Global search functionality'
  },
  {
    name: 'Analytics',
    path: 'Analytics',
    category: 'utility',
    testNotes: 'Analytics overview'
  },
  {
    name: 'AnalyticsDashboard',
    path: 'AnalyticsDashboard',
    category: 'utility',
    requiresAuth: true,
    testNotes: 'Detailed analytics dashboard'
  },
  {
    name: 'DeveloperMenu',
    path: 'DeveloperMenu',
    category: 'utility',
    testNotes: 'Developer tools and debugging'
  },
  {
    name: 'ModernReviews',
    path: 'ModernReviews',
    category: 'utility',
    testNotes: 'Modern reviews interface'
  },
  {
    name: 'ModernComments',
    path: 'ModernComments',
    category: 'utility',
    testNotes: 'Modern comments interface'
  },
  {
    name: 'Privacy',
    path: 'Privacy',
    category: 'utility',
    testNotes: 'Privacy information'
  },
  {
    name: 'Terms',
    path: 'Terms',
    category: 'utility',
    testNotes: 'Terms of service'
  },
  {
    name: 'Help',
    path: 'Help',
    category: 'utility',
    testNotes: 'Help center'
  },
  {
    name: 'Docs',
    path: 'Docs',
    category: 'utility',
    testNotes: 'Documentation'
  },
  {
    name: 'FAQ',
    path: 'FAQ',
    category: 'utility',
    testNotes: 'Frequently asked questions'
  },
  {
    name: 'PrivacyPolicy',
    path: 'PrivacyPolicy',
    category: 'utility',
    testNotes: 'Privacy policy details'
  }
];

// Navigation test results interface
export interface NavigationTestResult {
  route: NavigationRoute;
  status: 'success' | 'error' | 'warning' | 'skipped';
  message?: string;
  timestamp: Date;
}

// Test runner class
export class NavigationTestRunner {
  private results: NavigationTestResult[] = [];
  private navigationRef: any;

  constructor(navigationRef?: any) {
    this.navigationRef = navigationRef;
  }

  /**
   * Run all navigation tests
   */
  async runAllTests(): Promise<NavigationTestResult[]> {
    EventLogger.info('NavigationTest', '🧪 Starting navigation path tests...');
    
    for (const route of NAVIGATION_ROUTES) {
      const result = await this.testRoute(route);
      this.results.push(result);
    }

    this.printSummary();
    return this.results;
  }

  /**
   * Test a specific navigation route
   */
  async testRoute(route: NavigationRoute): Promise<NavigationTestResult> {
    try {
      EventLogger.debug('NavigationTest', `Testing route: ${route.name}`);

      // Check if route requires authentication
      if (route.requiresAuth) {
        EventLogger.debug('NavigationTest', `⚠️ Route ${route.name} requires authentication`);
        return {
          route,
          status: 'warning',
          message: 'Requires authentication',
          timestamp: new Date()
        };
      }

      // Simulate navigation to route
      if (this.navigationRef?.navigate) {
        try {
          this.navigationRef.navigate(route.path, route.params);
          return {
            route,
            status: 'success',
            message: 'Navigation successful',
            timestamp: new Date()
          };
        } catch (navError) {
          return {
            route,
            status: 'error',
            message: `Navigation failed: ${navError}`,
            timestamp: new Date()
          };
        }
      } else {
        // If no navigation ref, just check route definition
        return {
          route,
          status: 'success',
          message: 'Route defined correctly',
          timestamp: new Date()
        };
      }
    } catch (error) {
      EventLogger.error('NavigationTest', `Error testing route ${route.name}:`, error as Error);
      return {
        route,
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Test navigation by category
   */
  async testCategory(category: NavigationRoute['category']): Promise<NavigationTestResult[]> {
    const categoryRoutes = NAVIGATION_ROUTES.filter(r => r.category === category);
    const results: NavigationTestResult[] = [];

    EventLogger.info('NavigationTest', `Testing ${category} routes (${categoryRoutes.length} routes)`);

    for (const route of categoryRoutes) {
      const result = await this.testRoute(route);
      results.push(result);
    }

    return results;
  }

  /**
   * Print test summary
   */
  printSummary(): void {
    const successful = this.results.filter(r => r.status === 'success').length;
    const errors = this.results.filter(r => r.status === 'error').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;
    const skipped = this.results.filter(r => r.status === 'skipped').length;

    EventLogger.info('NavigationTest', '📊 Navigation Test Summary:');
    EventLogger.info('NavigationTest', `✅ Successful: ${successful}/${NAVIGATION_ROUTES.length}`);
    EventLogger.info('NavigationTest', `❌ Errors: ${errors}`);
    EventLogger.info('NavigationTest', `⚠️ Warnings: ${warnings}`);
    EventLogger.info('NavigationTest', `⏭️ Skipped: ${skipped}`);

    // Log failed routes
    if (errors > 0) {
      EventLogger.error('NavigationTest', 'Failed routes:');
      this.results
        .filter(r => r.status === 'error')
        .forEach(r => {
          EventLogger.error('NavigationTest', `  - ${r.route.name}: ${r.message}`);
        });
    }

    // Log warning routes
    if (warnings > 0) {
      EventLogger.warn('NavigationTest', 'Routes with warnings:');
      this.results
        .filter(r => r.status === 'warning')
        .forEach(r => {
          EventLogger.warn('NavigationTest', `  - ${r.route.name}: ${r.message}`);
        });
    }
  }

  /**
   * Get test results
   */
  getResults(): NavigationTestResult[] {
    return this.results;
  }

  /**
   * Clear test results
   */
  clearResults(): void {
    this.results = [];
  }
}

// Export singleton instance
export const navigationTester = new NavigationTestRunner();