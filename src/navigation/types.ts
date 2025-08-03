export type RootStackParamList = {
  // Main app flow
  MainTabs: undefined;
  Home: undefined;
  
  // Auth screens
  SignIn: undefined;
  SignUp: undefined;
  
  // Automation screens
  AutomationBuilder: { automationId?: string };
  MyAutomations: undefined;
  Gallery: undefined;
  AutomationDetails: { 
    automationId: string;
    fromGallery?: boolean;
  };
  Templates: undefined;
  LocationTriggers: undefined;
  Reviews: { automationId: string };
  
  // Profile & Settings
  Profile: undefined;
  Settings: undefined;
  
  // Developer screens
  DeveloperMenu: undefined;
  
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
  AutomationBuilder: { automationId?: string };
  AutomationDetails: { 
    automationId: string;
    fromGallery?: boolean;
  };
  Templates: undefined;
  LocationTriggers: undefined;
  Reviews: { automationId: string };
};