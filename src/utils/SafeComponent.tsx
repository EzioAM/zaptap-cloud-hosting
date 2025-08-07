/**
 * Safe Component Wrapper
 * Protects components from stack overflow errors
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { hasCircularReference } from './circularReferenceDetector';

/**
 * Error boundary specifically for stack overflow protection
 */
class StackOverflowBoundary extends React.Component<
  { children: React.ReactNode; componentName?: string },
  { hasError: boolean; errorCount: number }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, errorCount: 0 };
  }

  static getDerivedStateFromError(error: any) {
    const errorMessage = error?.toString() || '';
    if (errorMessage.includes('Maximum call stack size exceeded')) {
      console.error(`[SafeComponent] Stack overflow caught in ${this.props?.componentName || 'component'}`);
      return { hasError: true };
    }
    return null;
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorMessage = error?.toString() || '';
    if (errorMessage.includes('Maximum call stack size exceeded')) {
      console.error(`[SafeComponent] Stack overflow details:`, {
        component: this.props.componentName,
        error: error.message,
        componentStack: errorInfo.componentStack?.split('\n').slice(0, 5).join('\n')
      });
      
      this.setState(prev => ({ errorCount: prev.errorCount + 1 }));
      
      // If we get too many errors, stop trying
      if (this.state.errorCount > 3) {
        console.error('[SafeComponent] Too many stack overflow errors, stopping recovery attempts');
      }
    }
  }

  render() {
    if (this.state.hasError && this.state.errorCount <= 3) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Component Error: Stack Overflow Protected
          </Text>
          <Text style={styles.errorDetail}>
            {this.props.componentName || 'Component'} prevented from crashing
          </Text>
        </View>
      );
    }
    
    if (this.state.errorCount > 3) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Component Disabled</Text>
          <Text style={styles.errorDetail}>Too many errors</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap components with stack overflow protection
 */
export function withStackOverflowProtection<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
): React.ComponentType<P> {
  const displayName = componentName || Component.displayName || Component.name || 'Component';
  
  const SafeComponent = React.memo((props: P) => {
    // Check props for circular references
    React.useEffect(() => {
      if (__DEV__ && props && hasCircularReference(props)) {
        console.warn(`[SafeComponent] Circular reference detected in props for ${displayName}`);
      }
    }, [props]);
    
    // Monitor render count
    const renderCountRef = React.useRef(0);
    renderCountRef.current += 1;
    
    if (__DEV__ && renderCountRef.current > 100) {
      console.warn(`[SafeComponent] High render count (${renderCountRef.current}) for ${displayName}`);
    }
    
    return (
      <StackOverflowBoundary componentName={displayName}>
        <Component {...props} />
      </StackOverflowBoundary>
    );
  });
  
  SafeComponent.displayName = `SafeComponent(${displayName})`;
  
  return SafeComponent;
}

/**
 * Hook to check if current component might cause stack overflow
 */
export function useStackOverflowCheck(componentName: string) {
  const renderCount = React.useRef(0);
  const lastProps = React.useRef<any>(null);
  
  React.useEffect(() => {
    renderCount.current += 1;
    
    if (renderCount.current > 50) {
      console.warn(`[useStackOverflowCheck] High render count for ${componentName}: ${renderCount.current}`);
    }
    
    // Reset count periodically
    const timer = setTimeout(() => {
      renderCount.current = 0;
    }, 1000);
    
    return () => clearTimeout(timer);
  });
  
  return {
    checkProps: (props: any) => {
      if (hasCircularReference(props)) {
        console.error(`[useStackOverflowCheck] Circular reference in props for ${componentName}`);
        return false;
      }
      
      // Check if props are changing too rapidly
      if (lastProps.current && JSON.stringify(props) !== JSON.stringify(lastProps.current)) {
        const now = Date.now();
        if (lastProps.current._timestamp && now - lastProps.current._timestamp < 10) {
          console.warn(`[useStackOverflowCheck] Rapid prop changes in ${componentName}`);
        }
      }
      
      lastProps.current = { ...props, _timestamp: Date.now() };
      return true;
    },
    renderCount: renderCount.current
  };
}

/**
 * Safe memo wrapper that checks for circular references
 */
export function safeMemo<P extends object>(
  Component: React.ComponentType<P>,
  propsAreEqual?: (prevProps: P, nextProps: P) => boolean
): React.ComponentType<P> {
  const SafeMemoComponent = React.memo(Component, (prevProps, nextProps) => {
    // Check for circular references
    if (hasCircularReference(nextProps)) {
      console.warn('[safeMemo] Circular reference in new props, blocking update');
      return true; // Props are "equal" to prevent update
    }
    
    if (propsAreEqual) {
      try {
        return propsAreEqual(prevProps, nextProps);
      } catch (error) {
        console.error('[safeMemo] Error in props comparison:', error);
        return true; // Block update on error
      }
    }
    
    return false; // Use default comparison
  });
  
  return SafeMemoComponent;
}

const styles = StyleSheet.create({
  errorContainer: {
    padding: 20,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    margin: 10,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  errorText: {
    color: '#c62828',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  errorDetail: {
    color: '#d32f2f',
    fontSize: 14,
  },
});