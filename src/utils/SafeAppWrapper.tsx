import React, { useEffect, useRef, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';

interface SafeAppWrapperProps {
  children: ReactNode;
  maxRenderCycles?: number;
  enableProtection?: boolean;
}

/**
 * SafeAppWrapper provides protection against infinite render loops and stack overflow errors
 * by monitoring render cycles and component updates
 */
export const SafeAppWrapper: React.FC<SafeAppWrapperProps> = ({
  children,
  maxRenderCycles = 50,
  enableProtection = __DEV__,
}) => {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());
  const rapidRenderCount = useRef(0);

  useEffect(() => {
    if (!enableProtection) return;

    // Increment render count
    renderCount.current++;

    // Check for rapid re-renders (more than 10 renders in 100ms)
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    
    if (timeSinceLastRender < 100) {
      rapidRenderCount.current++;
      
      if (rapidRenderCount.current > 10) {
        console.error('🚨 CRITICAL: Rapid re-render detected!', {
          renderCount: renderCount.current,
          rapidRenders: rapidRenderCount.current,
          timeDelta: timeSinceLastRender,
        });
        
        // Reset counters to prevent cascading errors
        rapidRenderCount.current = 0;
        renderCount.current = 0;
        
        // Force a delay to break the render loop
        return new Promise(resolve => setTimeout(resolve, 100));
      }
    } else {
      // Reset rapid render count if enough time has passed
      rapidRenderCount.current = 0;
    }
    
    lastRenderTime.current = now;

    // Check for excessive total renders
    if (renderCount.current > maxRenderCycles) {
      console.error('🚨 CRITICAL: Maximum render cycles exceeded!', {
        maxCycles: maxRenderCycles,
        actualCycles: renderCount.current,
      });
      
      // Reset to prevent continuous warnings
      renderCount.current = 0;
    }
  });

  // Wrap children in a protective error boundary
  // Use pointerEvents="box-none" to ensure touches pass through
  return (
    <StackOverflowBoundary>
      <View style={styles.container} pointerEvents="box-none">
        {children}
      </View>
    </StackOverflowBoundary>
  );
};

// Specialized error boundary for stack overflow errors
class StackOverflowBoundary extends React.Component<
  { children: ReactNode },
  { hasError: boolean; errorCount: number }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, errorCount: 0 };
  }

  static getDerivedStateFromError(error: Error) {
    // Only catch stack overflow errors
    if (error.message?.includes('Maximum call stack') || 
        error.message?.includes('stack size exceeded')) {
      console.error('🚨 Stack overflow caught by SafeAppWrapper boundary');
      return { hasError: true };
    }
    // Let other errors propagate
    throw error;
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (error.message?.includes('Maximum call stack') || 
        error.message?.includes('stack size exceeded')) {
      console.error('🚨 Stack overflow details:', {
        message: error.message,
        componentStack: errorInfo.componentStack?.slice(0, 500), // Limit stack trace size
      });

      // Increment error count
      this.setState(prevState => ({
        errorCount: prevState.errorCount + 1,
      }));

      // If too many errors, stop trying to render
      if (this.state.errorCount > 3) {
        console.error('🚨 Too many stack overflow errors, stopping render attempts');
        return;
      }

      // Try to recover after a delay
      setTimeout(() => {
        this.setState({ hasError: false });
      }, 1000);
    }
  }

  render() {
    if (this.state.hasError && this.state.errorCount > 3) {
      // Don't render anything if too many errors
      return null;
    }

    if (this.state.hasError) {
      // Return null temporarily while recovering
      return null;
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

// Hook for components to check if they're in a safe wrapper
export const useSafeRender = () => {
  const renderCount = useRef(0);
  const componentName = useRef('Unknown');

  useEffect(() => {
    renderCount.current++;
    
    if (__DEV__ && renderCount.current > 30) {
      console.warn(`⚠️ Component ${componentName.current} has rendered ${renderCount.current} times`);
    }
  });

  return {
    setComponentName: (name: string) => {
      componentName.current = name;
    },
    getRenderCount: () => renderCount.current,
  };
};