import { useEffect, useState } from 'react';
import { navigationStateTracker } from '../services/navigation/NavigationStateTracker';
import { NavigationHelper } from '../services/navigation/NavigationHelper';

interface NavigationStateHook {
  currentRoute: string | null;
  currentParams: any;
  previousRoute: string | null;
  navigationStack: string[];
  navigate: (routeName: string, params?: any) => boolean;
  goBack: () => boolean;
  isRouteInStack: (routeName: string) => boolean;
}

/**
 * Hook to access navigation state and helper methods
 * Usage:
 * const { currentRoute, currentParams, navigate } = useNavigationState();
 */
export function useNavigationState(): NavigationStateHook {
  const [state, setState] = useState({
    currentRoute: navigationStateTracker.getCurrentRoute(),
    currentParams: navigationStateTracker.getCurrentParams(),
    previousRoute: navigationStateTracker.getPreviousRoute(),
    navigationStack: navigationStateTracker.getNavigationStack()
  });

  useEffect(() => {
    // Generate unique ID for this component
    const listenerId = `component-${Date.now()}-${Math.random()}`;

    // Subscribe to navigation state changes
    navigationStateTracker.subscribe(listenerId, (navState) => {
      setState({
        currentRoute: navState.currentRoute,
        currentParams: navState.currentParams,
        previousRoute: navState.previousRoute,
        navigationStack: navState.navigationStack
      });
    });

    // Cleanup on unmount
    return () => {
      navigationStateTracker.unsubscribe(listenerId);
    };
  }, []);

  return {
    currentRoute: state.currentRoute,
    currentParams: state.currentParams,
    previousRoute: state.previousRoute,
    navigationStack: state.navigationStack,
    navigate: NavigationHelper.navigate.bind(NavigationHelper),
    goBack: NavigationHelper.goBack.bind(NavigationHelper),
    isRouteInStack: (routeName: string) => NavigationHelper.isRouteInStack(routeName)
  };
}

/**
 * Hook to check if a specific route is active
 */
export function useIsRouteActive(routeName: string): boolean {
  const { currentRoute } = useNavigationState();
  return currentRoute === routeName;
}

/**
 * Hook to get params for a specific route
 */
export function useRouteParams<T = any>(routeName?: string): T | null {
  const { currentRoute, currentParams } = useNavigationState();
  
  // If no route specified, use current route
  if (!routeName) {
    return currentParams as T;
  }
  
  // If checking current route, return current params
  if (routeName === currentRoute) {
    return currentParams as T;
  }
  
  // Otherwise, try to get params for the specified route
  return NavigationHelper.getRouteParams(routeName) as T;
}