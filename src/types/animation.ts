/**
 * Animation type definitions to prevent onScroll type mismatches
 */

import { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

// Proper type for scroll event handlers
export type ScrollEventHandler = (event: NativeSyntheticEvent<NativeScrollEvent>) => void;

// Type guard to ensure onScroll receives proper function
export type OnScrollProp = ScrollEventHandler | undefined;

// Helper type to prevent Animated.event objects being passed to onScroll
export type SafeScrollProps = {
  onScroll?: OnScrollProp;
  scrollEventThrottle?: number;
};

// Type assertion helper for scroll handlers
export const assertScrollHandler = (handler: any): handler is ScrollEventHandler => {
  return typeof handler === 'function';
};

// Development-time warning for incorrect onScroll usage
export const validateOnScrollProp = (onScrollProp: any): OnScrollProp => {
  if (__DEV__ && onScrollProp != null) {
    if (typeof onScrollProp !== 'function') {
      console.error(
        'onScroll prop must be a function or undefined, not an object. ' +
        'If you are using Animated.event, make sure to wrap it properly or use it as a listener.'
      );
      return undefined;
    }
  }
  return onScrollProp;
};

// Enhanced scroll handler type that includes proper event typing
export interface EnhancedScrollHandler {
  (event: NativeSyntheticEvent<NativeScrollEvent>): void;
}

// Animation-aware scroll handler factory
export type ScrollHandlerFactory = (enabled: boolean) => EnhancedScrollHandler | undefined;

// Safe scroll handler creation utility
export const createSafeScrollHandler = (
  enabled: boolean,
  handler: (offsetY: number, event: NativeSyntheticEvent<NativeScrollEvent>) => void
): EnhancedScrollHandler | undefined => {
  if (!enabled) return undefined;
  
  return (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    handler(offsetY, event);
  };
};