/**
 * Analytics Configuration
 * Centralized configuration for all analytics and monitoring services
 */

export const ANALYTICS_CONFIG = {
  // Environment settings
  enabled: !__DEV__, // Disable in development by default
  debugMode: __DEV__,
  environment: __DEV__ ? 'development' : 'production',
  
  // Session management
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  sessionIdKey: 'zaptap_session_id',
  userIdKey: 'zaptap_user_id',
  
  // Event batching and performance
  batchSize: 20, // Events per batch
  flushInterval: 10000, // 10 seconds
  maxRetries: 3,
  retryDelay: 1000, // Initial retry delay in ms
  maxOfflineEvents: 1000, // Maximum events to store offline
  
  // Feature flags
  features: {
    trackScreens: true,
    trackCrashes: true,
    trackPerformance: true,
    trackNetwork: true,
    trackUserProperties: true,
    trackAutomationEvents: true,
    trackShareEvents: true,
    trackNFCEvents: true,
    trackQREvents: true,
    trackOnboarding: true,
  },
  
  // Privacy and compliance
  privacy: {
    anonymizeIp: true,
    respectDoNotTrack: true,
    requireConsent: true,
    gdprCompliant: true,
    ccpaCompliant: true,
    dataRetentionDays: 365,
    allowPersonalizedAds: false,
  },
  
  // Performance monitoring
  performance: {
    sampleRate: 0.1, // 10% of sessions
    trackFPS: true,
    trackMemory: true,
    trackNetworkLatency: true,
    trackAppLaunchTime: true,
    trackScreenRenderTime: true,
    slowThresholdMs: 2000, // API calls slower than this are flagged
  },
  
  // Error monitoring
  errors: {
    enabled: true,
    captureConsoleErrors: true,
    captureUnhandledPromiseRejections: true,
    maxBreadcrumbs: 100,
    beforeSend: null, // Function to filter/modify errors before sending
    sampleRate: 1.0, // Capture all errors in production
  },
  
  // Share URL tracking
  sharing: {
    trackShareCreation: true,
    trackShareViews: true,
    trackShareClicks: true,
    baseUrl: 'https://www.zaptap.cloud/share',
    utmSource: 'zaptap_app',
    utmMedium: 'mobile_share',
  },
  
  // Event sampling (to reduce data volume)
  sampling: {
    screenViews: 1.0, // Track all screen views
    automationExecutions: 1.0, // Track all automation executions
    apiCalls: 0.1, // Track 10% of API calls
    buttonClicks: 0.5, // Track 50% of button clicks
    scrollEvents: 0.1, // Track 10% of scroll events
  },
} as const;

/**
 * Event types that should be tracked
 */
export const ANALYTICS_EVENTS = {
  // App lifecycle
  APP_OPENED: 'app_opened',
  APP_BACKGROUNDED: 'app_backgrounded',
  APP_FOREGROUNDED: 'app_foregrounded',
  APP_CRASHED: 'app_crashed',
  
  // User lifecycle
  USER_REGISTERED: 'user_registered',
  USER_LOGGED_IN: 'user_logged_in',
  USER_LOGGED_OUT: 'user_logged_out',
  USER_PROFILE_UPDATED: 'user_profile_updated',
  
  // Onboarding
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_STEP_COMPLETED: 'onboarding_step_completed',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  ONBOARDING_SKIPPED: 'onboarding_skipped',
  
  // Automation events
  AUTOMATION_CREATED: 'automation_created',
  AUTOMATION_EDITED: 'automation_edited',
  AUTOMATION_DELETED: 'automation_deleted',
  AUTOMATION_EXECUTED: 'automation_executed',
  AUTOMATION_EXECUTION_FAILED: 'automation_execution_failed',
  AUTOMATION_SHARED: 'automation_shared',
  AUTOMATION_IMPORTED: 'automation_imported',
  AUTOMATION_DUPLICATED: 'automation_duplicated',
  AUTOMATION_PUBLISHED: 'automation_published',
  AUTOMATION_UNPUBLISHED: 'automation_unpublished',
  
  // Deployment events
  NFC_TAG_WRITTEN: 'nfc_tag_written',
  NFC_TAG_READ: 'nfc_tag_read',
  NFC_WRITE_FAILED: 'nfc_write_failed',
  QR_CODE_GENERATED: 'qr_code_generated',
  QR_CODE_SCANNED: 'qr_code_scanned',
  SHARE_LINK_CREATED: 'share_link_created',
  SHARE_LINK_CLICKED: 'share_link_clicked',
  DEPLOYMENT_EXECUTED: 'deployment_executed',
  
  // Navigation and screens
  SCREEN_VIEWED: 'screen_viewed',
  SCREEN_RENDER_TIME: 'screen_render_time',
  TAB_SWITCHED: 'tab_switched',
  DEEP_LINK_OPENED: 'deep_link_opened',
  
  // User interaction
  BUTTON_PRESSED: 'button_pressed',
  FEATURE_USED: 'feature_used',
  SEARCH_PERFORMED: 'search_performed',
  FILTER_APPLIED: 'filter_applied',
  
  // Content interaction
  AUTOMATION_LIKED: 'automation_liked',
  AUTOMATION_UNLIKED: 'automation_unliked',
  COMMENT_POSTED: 'comment_posted',
  REVIEW_SUBMITTED: 'review_submitted',
  
  // Offline/sync events
  OFFLINE_MODE_ENTERED: 'offline_mode_entered',
  OFFLINE_MODE_EXITED: 'offline_mode_exited',
  SYNC_STARTED: 'sync_started',
  SYNC_COMPLETED: 'sync_completed',
  SYNC_FAILED: 'sync_failed',
  
  // Performance events
  API_RESPONSE_TIME: 'api_response_time',
  MEMORY_WARNING: 'memory_warning',
  LOW_BATTERY: 'low_battery',
  NETWORK_ERROR: 'network_error',
  
  // Error events
  ERROR_OCCURRED: 'error_occurred',
  CRASH_DETECTED: 'crash_detected',
  NETWORK_TIMEOUT: 'network_timeout',
  
  // Revenue/premium events (for future use)
  PREMIUM_FEATURE_VIEWED: 'premium_feature_viewed',
  PREMIUM_UPGRADE_PROMPTED: 'premium_upgrade_prompted',
  PREMIUM_PURCHASED: 'premium_purchased',
} as const;

/**
 * Screen names for consistent tracking
 */
export const SCREEN_NAMES = {
  HOME: 'Home',
  DISCOVER: 'Discover',
  BUILD: 'Build',
  LIBRARY: 'Library',
  PROFILE: 'Profile',
  
  // Auth screens
  SIGN_IN: 'SignIn',
  SIGN_UP: 'SignUp',
  FORGOT_PASSWORD: 'ForgotPassword',
  
  // Onboarding
  WELCOME: 'Welcome',
  ONBOARDING: 'Onboarding',
  TUTORIAL: 'Tutorial',
  
  // Automation screens
  AUTOMATION_BUILDER: 'AutomationBuilder',
  AUTOMATION_DETAILS: 'AutomationDetails',
  MY_AUTOMATIONS: 'MyAutomations',
  AUTOMATION_GALLERY: 'AutomationGallery',
  
  // Other screens
  SETTINGS: 'Settings',
  ANALYTICS_DASHBOARD: 'AnalyticsDashboard',
  SCANNER: 'Scanner',
  NFC_WRITER: 'NFCWriter',
  QR_GENERATOR: 'QRGenerator',
  REVIEWS: 'Reviews',
  COMMENTS: 'Comments',
  
  // Developer screens
  DEVELOPER_MENU: 'DeveloperMenu',
  PERFORMANCE_MONITOR: 'PerformanceMonitor',
  DATABASE_INSPECTOR: 'DatabaseInspector',
} as const;

/**
 * User properties that can be tracked
 */
export const USER_PROPERTIES = {
  USER_ID: 'user_id',
  EMAIL: 'email',
  DISPLAY_NAME: 'display_name',
  CREATED_AT: 'created_at',
  LAST_LOGIN: 'last_login',
  TOTAL_AUTOMATIONS: 'total_automations',
  TOTAL_EXECUTIONS: 'total_executions',
  FAVORITE_FEATURES: 'favorite_features',
  DEVICE_TYPE: 'device_type',
  OS_VERSION: 'os_version',
  APP_VERSION: 'app_version',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  PREMIUM_USER: 'premium_user',
} as const;

/**
 * Default event properties that are added to all events
 */
export const DEFAULT_EVENT_PROPERTIES = {
  app_version: '1.0.0', // Will be overridden with actual version
  platform: 'mobile',
  source: 'zaptap_app',
} as const;

/**
 * Environment-specific configurations
 */
export const ENV_CONFIGS = {
  development: {
    ...ANALYTICS_CONFIG,
    enabled: false, // Disable analytics in development
    debugMode: true,
    errors: {
      ...ANALYTICS_CONFIG.errors,
      sampleRate: 1.0, // Capture all errors in development
    },
  },
  staging: {
    ...ANALYTICS_CONFIG,
    enabled: true,
    performance: {
      ...ANALYTICS_CONFIG.performance,
      sampleRate: 0.5, // Higher sampling in staging
    },
  },
  production: {
    ...ANALYTICS_CONFIG,
    enabled: true,
    debugMode: false,
  },
} as const;

/**
 * Get configuration for current environment
 */
export const getAnalyticsConfig = () => {
  const env = __DEV__ ? 'development' : 'production';
  return ENV_CONFIGS[env];
};

/**
 * Validation functions
 */
export const isValidEventName = (eventName: string): boolean => {
  return Object.values(ANALYTICS_EVENTS).includes(eventName as any);
};

export const isValidScreenName = (screenName: string): boolean => {
  return Object.values(SCREEN_NAMES).includes(screenName as any);
};

export const sanitizeEventProperties = (properties: Record<string, any>): Record<string, any> => {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(properties)) {
    // Remove any potentially sensitive data
    if (key.toLowerCase().includes('password') || 
        key.toLowerCase().includes('token') ||
        key.toLowerCase().includes('secret')) {
      continue;
    }
    
    // Ensure values are serializable
    if (typeof value === 'object' && value !== null) {
      try {
        sanitized[key] = JSON.parse(JSON.stringify(value));
      } catch {
        sanitized[key] = String(value);
      }
    } else if (typeof value === 'function') {
      sanitized[key] = '[Function]';
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};