import type { AutomationData } from '../types';

export type RootStackParamList = {
  // Main app flow
  MainTabs: undefined;
  Home: undefined;
  
  // Modern Tab screens
  HomeTab: undefined;
  BuildTab: undefined;
  DiscoverTab: { category?: string } | undefined;
  LibraryTab: undefined;
  ProfileTab: undefined;
  
  // Auth screens
  SignIn: undefined;
  SignUp: undefined;
  ResetPassword: undefined;
  ChangePassword: undefined;
  
  // Automation screens
  AutomationBuilder: { 
    automationId?: string;
    automation?: AutomationData;
    readonly?: boolean;
    isTemplate?: boolean;
    showQRGenerator?: boolean;
  } | undefined;
  ModernAutomationBuilder: {
    automationId?: string;
    automation?: AutomationData;
    template?: AutomationData;
    mode?: 'create' | 'edit' | 'template';
    readonly?: boolean;
  } | undefined;
  MyAutomations: undefined;
  Gallery: undefined;
  AutomationDetails: { 
    automationId: string;
    fromGallery?: boolean;
  };
  Templates: undefined;
  Scanner: undefined;
  LocationTriggers: undefined;
  ExecutionHistory: undefined;
  Reviews: { 
    automationId: string;
    automation?: AutomationData;
  };
  EditAutomation: { automationId: string };
  
  // Profile & Settings
  Profile: undefined;
  Settings: undefined;
  EditProfile: undefined;
  Privacy: undefined;
  Help: undefined;
  Feedback: undefined;
  About: undefined;
  Terms: undefined;
  Docs: undefined;
  FAQ: undefined;
  
  // Developer screens
  DeveloperMenu: undefined;
  AutomationTest: undefined;
  ModernReviews: undefined;
  ModernComments: undefined;
  
  // Onboarding screens
  WelcomeScreen: undefined;
  OnboardingFlow: undefined;
  TutorialScreen: undefined;
  
  // Deep link screens
  AutomationExecution: { automationId: string };
  ShareAutomation: { automationId: string };
  EmergencyAutomation: { automationId: string };
  AuthCallback: { 
    access_token?: string;
    refresh_token?: string;
    error?: string;
  };
  
  // Additional Settings
  EmailPreferences: undefined;
  PrivacyPolicy: undefined;
  
  // Newly integrated screens (previously orphaned)
  Search: { query?: string; category?: string } | undefined;
  Analytics: undefined;
  AnalyticsDashboard: undefined;
  
  // Settings Screens
  NotificationSettings: undefined;
  SecuritySettings: undefined;
  EnhancedSettings: undefined;
  AdvancedSettings: undefined;
  TriggerSettings: undefined;
  IntegrationsSettings: undefined;
  
  // Profile Screens
  Premium: undefined;
  Notifications: undefined;
  Badges: undefined;
  Subscription: undefined;
  
  // Support Screens
  HelpCenter: undefined;
  ContactSupport: undefined;
  Tutorials: undefined;
  
  // IoT Screen
  IoTDashboard: undefined;
  
  // Community Screens
  Community: undefined;
  Trending: undefined;
  Challenges: undefined;
  Share: undefined;
  
  // Automation Screens
  AutomationCatalog: undefined;
  SmartSuggestions: undefined;
  AutomationEditor: { automationId?: string } | undefined;
  Scheduler: undefined;
  TriggerConfig: { automationId?: string } | undefined;
  ActionLibrary: undefined;
  GalleryFixed: undefined;
  
  // Integration Screens
  IntegrationHub: undefined;
  APIKeyManagement: undefined;
  WebhookManager: undefined;
  CloudSync: undefined;
  BackupRestore: undefined;
  
  // Analytics Screens
  AnalyticsDetail: { metricId?: string } | undefined;
  PerformanceMetrics: undefined;
  UsageStats: undefined;
  AutomationInsights: undefined;
  Reports: undefined;
  
  // NFC Screens
  NFCWriter: undefined;
  NFCReader: undefined;
  NFCManagement: undefined;
  
  // QR Screens
  QRGenerator: { automationId?: string } | undefined;
  QRManagement: undefined;
  
  // Deployment Screens
  DeploymentManager: undefined;
  AccessControl: { automationId?: string } | undefined;
  SharingSettings: { automationId?: string } | undefined;
  
  // Onboarding Screens
  OnboardingCustomization: undefined;
  FirstAutomationGuide: undefined;
  InteractiveTutorial: undefined;
};

// More specific navigation types
export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  ResetPassword: undefined;
  ChangePassword: undefined;
};

export type AutomationStackParamList = {
  AutomationList: undefined;
  AutomationBuilder: { 
    automationId?: string;
    automation?: AutomationData;
    readonly?: boolean;
    isTemplate?: boolean;
    showQRGenerator?: boolean;
  } | undefined;
  AutomationDetails: { 
    automationId: string;
    fromGallery?: boolean;
  };
  Templates: undefined;
  LocationTriggers: undefined;
  Reviews: { 
    automationId: string;
    automation?: AutomationData;
  };
};

// Type-safe navigation helpers
export type NavigationParams<T extends keyof RootStackParamList> = RootStackParamList[T];

// Utility types for route validation
export type RequiredParams<T> = T extends undefined ? never : T;
export type OptionalParams<T> = T extends undefined ? T : T | undefined;

// Navigation props types for screens
export type ScreenProps<T extends keyof RootStackParamList> = {
  navigation: any; // Import specific navigation type when needed
  route: {
    params: RootStackParamList[T];
  };
};