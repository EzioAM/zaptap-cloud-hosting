import { AutomationData } from '../types';

export type RootStackParamList = {
  Home: undefined;
  SignIn: undefined;
  SignUp: undefined;
  AutomationBuilder: {
    automationId?: string;
  } | undefined;
  MyAutomations: undefined;
  Gallery: {
    category?: string;
  } | undefined;
  AutomationDetails: {
    automationId: string;
    fromGallery?: boolean;
  };
  Templates: undefined;
  LocationTriggers: undefined;
  Reviews: {
    automationId: string;
  };
  DeveloperMenu: undefined;
};