import { CommonActions } from '@react-navigation/native';
import { EventLogger } from '../../utils/EventLogger';
import { navigationStateTracker } from './NavigationStateTracker';

export class NavigationHelper {
  private static navigationRef: any = null;

  static setNavigationRef(ref: any) {
    this.navigationRef = ref;
    // Also set it in the state tracker
    navigationStateTracker.setNavigationRef(ref);
  }

  static navigate(routeName: string, params?: any) {
    console.log('NavigationHelper.navigate called with:', routeName, params);
    try {
      // Map old route names to new ones
      const routeMapping: Record<string, string> = {
        // Tab mappings
        'Profile': 'ProfileTab',
        'ProfileScreen': 'ProfileTab',
        'Home': 'HomeTab',
        'HomeScreen': 'HomeTab',
        'Build': 'BuildTab',
        'BuildScreen': 'BuildTab',  // Add mapping for BuildScreen
        'Discover': 'DiscoverTab',
        'DiscoverScreen': 'DiscoverTab',
        'Library': 'LibraryTab',
        'LibraryScreen': 'LibraryTab',
        'MyAutomations': 'LibraryTab',
        
        // Auth mappings
        'Auth': 'SignIn',
        'Login': 'SignIn',
        'Register': 'SignUp',
        'Signup': 'SignUp',
      };

      const actualRoute = routeMapping[routeName] || routeName;
      
      // Validate params for specific routes
      if (actualRoute === 'AutomationDetails') {
        if (!params?.automationId || params.automationId === 'undefined' || params.automationId === 'null') {
          EventLogger.error('NavigationHelper', 'Invalid automation ID for AutomationDetails', new Error(`ID: ${params?.automationId}`));
          return false;
        }
      }

      if (this.navigationRef?.isReady()) {
        this.navigationRef.dispatch(
          CommonActions.navigate({
            name: actualRoute,
            params,
          })
        );
        EventLogger.debug('NavigationHelper', `Navigated to ${actualRoute}`, params);
        return true;
      }
      
      EventLogger.warn('NavigationHelper', 'Navigation ref not ready');
      return false;
    } catch (error) {
      EventLogger.error('NavigationHelper', 'Navigation error:', error as Error);
      return false;
    }
  }

  static goBack() {
    try {
      if (this.navigationRef?.isReady() && this.navigationRef.canGoBack()) {
        this.navigationRef.goBack();
        return true;
      }
      return false;
    } catch (error) {
      EventLogger.error('NavigationHelper', 'Go back error:', error as Error);
      return false;
    }
  }

  static reset(routes: any[]) {
    try {
      if (this.navigationRef?.isReady()) {
        this.navigationRef.dispatch(
          CommonActions.reset({
            index: 0,
            routes,
          })
        );
        return true;
      }
      return false;
    } catch (error) {
      EventLogger.error('NavigationHelper', 'Reset error:', error as Error);
      return false;
    }
  }

  static getRouteName(): string | null {
    try {
      if (this.navigationRef?.isReady()) {
        const state = this.navigationRef.getRootState();
        if (state) {
          return state.routes[state.index]?.name || null;
        }
      }
      return null;
    } catch (error) {
      EventLogger.error('NavigationHelper', 'Get route name error:', error as Error);
      return null;
    }
  }

  static navigateToTab(tabName: string) {
    const tabMapping: Record<string, string> = {
      'home': 'HomeTab',
      'build': 'BuildTab', 
      'discover': 'DiscoverTab',
      'library': 'LibraryTab',
      'profile': 'ProfileTab',
    };

    const actualTab = tabMapping[tabName.toLowerCase()] || tabName;
    return this.navigate(actualTab);
  }

  // New methods for state and params management
  static getCurrentRoute(): string | null {
    return navigationStateTracker.getCurrentRoute();
  }

  static getCurrentParams(): any {
    return navigationStateTracker.getCurrentParams();
  }

  static getPreviousRoute(): string | null {
    return navigationStateTracker.getPreviousRoute();
  }

  static getNavigationStack(): string[] {
    return navigationStateTracker.getNavigationStack();
  }

  static isRouteInStack(routeName: string): boolean {
    return navigationStateTracker.isRouteInStack(routeName);
  }

  static getRouteParams(routeName: string): any {
    return navigationStateTracker.getRouteParams(routeName);
  }

  static subscribeToStateChanges(id: string, callback: (state: any) => void) {
    navigationStateTracker.subscribe(id, callback);
  }

  static unsubscribeFromStateChanges(id: string) {
    navigationStateTracker.unsubscribe(id);
  }

  static clearNavigationState() {
    navigationStateTracker.clearState();
  }
}
