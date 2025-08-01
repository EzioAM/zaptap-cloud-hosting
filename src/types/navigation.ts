import { AutomationData } from '../types';

export type RootStackParamList = {
  Home: undefined;
  SignIn: undefined;
  SignUp: undefined;
  AutomationBuilder: {
    automation?: AutomationData;
  } | undefined;
  MyAutomations: undefined;
  Gallery: {
    category?: string;
  } | undefined;
  AutomationDetails: {
    automation: AutomationData;
  };
  Templates: undefined;
  LocationTriggers: undefined;
  Reviews: {
    automation: AutomationData;
  };
};