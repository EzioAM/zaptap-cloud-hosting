import { AutomationData } from '../types';

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
  
  // Automation screens
  AutomationBuilder: { 
    automationId?: string;
    automation?: AutomationData;
    readonly?: boolean;
    isTemplate?: boolean;
    showQRGenerator?: boolean;
  } | undefined;
  MyAutomations: undefined;
  Gallery: undefined;
  AutomationDetails: { 
    automationId: string;
    fromGallery?: boolean;
  };
  Templates: undefined;
  LocationTriggers: undefined;
  Reviews: { automationId: string };
  EditAutomation: { automationId: string };
  
  // Profile & Settings
  Profile: undefined;
  Settings: undefined;
  EditProfile: undefined;
  Privacy: undefined;
  Help: undefined;
  Feedback: undefined;
  About: undefined;
  
  // Developer screens
  DeveloperMenu: undefined;
  ModernReviews: undefined;
  ModernComments: undefined;
  
  // Onboarding screens
  WelcomeScreen: undefined;
  TutorialScreen: undefined;
};

// You can add more specific navigation types here if needed
export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
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
  Reviews: { automationId: string };
};