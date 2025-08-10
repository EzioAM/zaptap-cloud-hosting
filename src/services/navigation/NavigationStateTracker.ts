import { NavigationState } from '@react-navigation/native';
import { EventLogger } from '../../utils/EventLogger';

interface NavigationStateInfo {
  currentRoute: string | null;
  currentParams: any;
  previousRoute: string | null;
  previousParams: any;
  navigationStack: string[];
  timestamp: number;
}

class NavigationStateTracker {
  private static instance: NavigationStateTracker;
  private currentState: NavigationStateInfo = {
    currentRoute: null,
    currentParams: null,
    previousRoute: null,
    previousParams: null,
    navigationStack: [],
    timestamp: Date.now()
  };
  
  private listeners: Map<string, (state: NavigationStateInfo) => void> = new Map();
  private navigationRef: any = null;

  private constructor() {}

  static getInstance(): NavigationStateTracker {
    if (!NavigationStateTracker.instance) {
      NavigationStateTracker.instance = new NavigationStateTracker();
    }
    return NavigationStateTracker.instance;
  }

  setNavigationRef(ref: any) {
    this.navigationRef = ref;
    EventLogger.debug('NavigationStateTracker', 'Navigation ref set');
  }

  /**
   * Get the current active route name from nested navigation state
   */
  private getActiveRouteName(state: NavigationState | undefined): string | null {
    if (!state) return null;

    const route = state.routes[state.index];
    
    // If this route has nested state, recurse
    if (route.state) {
      return this.getActiveRouteName(route.state as NavigationState);
    }
    
    return route.name;
  }

  /**
   * Get the current active route params from nested navigation state
   */
  private getActiveRouteParams(state: NavigationState | undefined): any {
    if (!state) return null;

    const route = state.routes[state.index];
    
    // If this route has nested state, recurse
    if (route.state) {
      return this.getActiveRouteParams(route.state as NavigationState);
    }
    
    return route.params || null;
  }

  /**
   * Build a stack of all route names in the navigation hierarchy
   */
  private buildNavigationStack(state: NavigationState | undefined, stack: string[] = []): string[] {
    if (!state) return stack;

    const route = state.routes[state.index];
    stack.push(route.name);
    
    // If this route has nested state, recurse
    if (route.state) {
      return this.buildNavigationStack(route.state as NavigationState, stack);
    }
    
    return stack;
  }

  /**
   * Update the navigation state based on the current navigation container state
   */
  updateState(state: NavigationState | undefined) {
    if (!state) {
      EventLogger.warn('NavigationStateTracker', 'No navigation state provided');
      return;
    }

    const newRoute = this.getActiveRouteName(state);
    const newParams = this.getActiveRouteParams(state);
    const newStack = this.buildNavigationStack(state);

    // Store previous state
    const previousState = { ...this.currentState };

    // Update current state
    this.currentState = {
      currentRoute: newRoute,
      currentParams: newParams,
      previousRoute: previousState.currentRoute,
      previousParams: previousState.currentParams,
      navigationStack: newStack,
      timestamp: Date.now()
    };

    // Log the state change
    if (newRoute !== previousState.currentRoute) {
      EventLogger.info('NavigationStateTracker', 'Route changed', {
        from: previousState.currentRoute,
        to: newRoute,
        params: newParams,
        stack: newStack
      });
    }

    // Notify all listeners
    this.notifyListeners();
  }

  /**
   * Get the current navigation state info
   */
  getCurrentState(): NavigationStateInfo {
    return { ...this.currentState };
  }

  /**
   * Get the current route name
   */
  getCurrentRoute(): string | null {
    return this.currentState.currentRoute;
  }

  /**
   * Get the current route params
   */
  getCurrentParams(): any {
    return this.currentState.currentParams;
  }

  /**
   * Get the previous route name
   */
  getPreviousRoute(): string | null {
    return this.currentState.previousRoute;
  }

  /**
   * Get the navigation stack
   */
  getNavigationStack(): string[] {
    return [...this.currentState.navigationStack];
  }

  /**
   * Check if a specific route is in the stack
   */
  isRouteInStack(routeName: string): boolean {
    return this.currentState.navigationStack.includes(routeName);
  }

  /**
   * Subscribe to navigation state changes
   */
  subscribe(id: string, callback: (state: NavigationStateInfo) => void) {
    this.listeners.set(id, callback);
    // Immediately call with current state
    callback(this.getCurrentState());
  }

  /**
   * Unsubscribe from navigation state changes
   */
  unsubscribe(id: string) {
    this.listeners.delete(id);
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners() {
    const currentState = this.getCurrentState();
    this.listeners.forEach(callback => {
      try {
        callback(currentState);
      } catch (error) {
        EventLogger.error('NavigationStateTracker', 'Error in listener callback', error as Error);
      }
    });
  }

  /**
   * Get route params by route name from the current navigation state
   */
  getRouteParams(routeName: string): any {
    if (!this.navigationRef?.isReady()) return null;

    try {
      const state = this.navigationRef.getRootState();
      return this.findRouteParams(state, routeName);
    } catch (error) {
      EventLogger.error('NavigationStateTracker', 'Error getting route params', error as Error);
      return null;
    }
  }

  /**
   * Recursively find route params by route name
   */
  private findRouteParams(state: NavigationState | undefined, routeName: string): any {
    if (!state) return null;

    for (const route of state.routes) {
      if (route.name === routeName) {
        return route.params || null;
      }
      
      // Check nested states
      if (route.state) {
        const params = this.findRouteParams(route.state as NavigationState, routeName);
        if (params !== null) return params;
      }
    }

    return null;
  }

  /**
   * Clear the navigation state (useful for logout/reset scenarios)
   */
  clearState() {
    this.currentState = {
      currentRoute: null,
      currentParams: null,
      previousRoute: null,
      previousParams: null,
      navigationStack: [],
      timestamp: Date.now()
    };
    this.notifyListeners();
  }
}

export const navigationStateTracker = NavigationStateTracker.getInstance();