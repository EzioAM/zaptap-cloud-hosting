/**
 * Visual Polish Components - Main Export Index
 * Provides easy access to all visual polish components
 */

// Animation Components
export { AnimatedSplash } from './AnimatedSplash';
export { LoadingOverlay } from './LoadingOverlay';

// Transition Components
export {
  TransitionWrapper,
  FadeTransition,
  SlideTransition,
  ScaleTransition,
  FlipTransition,
  ModalTransition,
  StaggeredListTransition,
  ParallaxTransition,
  SwipeableTransition,
  BouncyTransition,
  MorphTransition,
} from './TransitionWrapper';

// Interactive Components
export {
  EasterEgg,
  ParticleExplosion,
  RainbowText,
  SecretMenu,
  TimeBasedEasterEgg,
  EASTER_EGG_CONFIGS,
} from './EasterEggSystem';

// Icon Components
export {
  AnimatedAppIcon,
  WidgetAppIcon,
} from './AnimatedAppIcon';

// Component Types
export interface PolishComponentProps {
  theme?: any;
  animated?: boolean;
  accessibilityOptimized?: boolean;
}

// Higher-order component for adding polish to any component
export const withVisualPolish = <T extends object>(
  WrappedComponent: React.ComponentType<T>,
  polishConfig?: {
    enableTransitions?: boolean;
    enableEffects?: boolean;
    respectAccessibility?: boolean;
  }
) => {
  const config = {
    enableTransitions: true,
    enableEffects: true,
    respectAccessibility: true,
    ...polishConfig,
  };

  return React.forwardRef<any, T & PolishComponentProps>((props, ref) => {
    const { theme, animated = true, accessibilityOptimized = true, ...otherProps } = props;

    // Apply accessibility optimizations if enabled
    const finalAnimated = accessibilityOptimized 
      ? animated && !useAccessibility().shouldReduceMotion
      : animated;

    return (
      <TransitionWrapper
        visible={true}
        type="fade"
        enableGesture={config.enableTransitions}
        animated={finalAnimated}
      >
        <WrappedComponent
          ref={ref}
          {...(otherProps as T)}
          animated={finalAnimated}
        />
      </TransitionWrapper>
    );
  });
};

// Utility Components
export const PolishProvider: React.FC<{
  children: React.ReactNode;
  config?: {
    enableSeasonalThemes?: boolean;
    enableAccessibilityOptimizations?: boolean;
    defaultTheme?: 'light' | 'dark' | 'auto';
  };
}> = ({ children, config }) => {
  const [isInitialized, setIsInitialized] = React.useState(false);

  React.useEffect(() => {
    const initializeSystem = async () => {
      try {
        const { initializeVisualPolish } = await import('../utils/visualPolish');
        await initializeVisualPolish(config);
        setIsInitialized(true);
      } catch (error) {
        EventLogger.error('index', 'Failed to initialize visual polish system:', error as Error);
        setIsInitialized(true); // Still render children even if initialization fails
      }
    };

    initializeSystem();
  }, []);

  if (!isInitialized) {
    return (
      <LoadingOverlay
        visible={true}
        message="Initializing visual polish..."
        variant="branded"
      />
    );
  }

  return <>{children}</>;
};

// Theme-aware styled component creator
export const createThemedComponent = <T extends object>(
  Component: React.ComponentType<T>,
  styleGenerator: (theme: any, gradients: any) => any
) => {
  return React.forwardRef<any, T>((props, ref) => {
    const { VisualPolishSystem } = require('../utils/visualPolish');
    const system = VisualPolishSystem.getInstance();
    const styles = system.createThemedStyles(styleGenerator);

    return (
      <Component
        ref={ref}
        {...props}
        style={[styles, (props as any).style]}
      />
    );
  });
};

// Performance monitoring component
export const PerformanceMonitor: React.FC<{
  visible?: boolean;
  onMetrics?: (metrics: any) => void;
}> = ({ visible = false, onMetrics }) => {
  const [metrics, setMetrics] = React.useState<any>(null);

  React.useEffect(() => {
    if (!visible) return;

    const interval = setInterval(async () => {
      try {
        const { VisualPolishSystem } = await import('../utils/visualPolish');
        const system = VisualPolishSystem.getInstance();
        const performanceMetrics = system.getPerformanceMetrics();
        
        setMetrics(performanceMetrics);
        onMetrics?.(performanceMetrics);
      } catch (error) {
        EventLogger.warn('index', 'Failed to get performance metrics:', error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [visible, onMetrics]);

  if (!visible || !metrics) return null;

  return (
    <View style={{
      position: 'absolute',
      top: 50,
      right: 10,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: 10,
      borderRadius: 5,
      zIndex: 9999,
    }}>
      <Text style={{ color: 'white', fontSize: 10 }}>
        FPS: {metrics.animations.fps}
      </Text>
      <Text style={{ color: 'white', fontSize: 10 }}>
        Drops: {metrics.animations.frameDrops}
      </Text>
      <Text style={{ color: 'white', fontSize: 10 }}>
        Efficiency: {metrics.animations.efficiency}%
      </Text>
    </View>
  );
};

// Accessibility indicator component
export const AccessibilityIndicator: React.FC<{
  visible?: boolean;
}> = ({ visible = false }) => {
  const { preferences } = useAccessibility();

  if (!visible) return null;

  return (
    <View style={{
      position: 'absolute',
      bottom: 50,
      left: 10,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: 8,
      borderRadius: 5,
      zIndex: 9999,
    }}>
      <Text style={{ color: 'white', fontSize: 10 }}>
        🎭 {preferences.reduceMotion ? 'Reduced Motion' : 'Full Motion'}
      </Text>
      {preferences.screenReader && (
        <Text style={{ color: 'white', fontSize: 10 }}>
          📖 Screen Reader Active
        </Text>
      )}
      {preferences.highContrast && (
        <Text style={{ color: 'white', fontSize: 10 }}>
          🔆 High Contrast
        </Text>
      )}
    </View>
  );
};

// Re-export core utilities for convenience
export { useAccessibility } from '../utils/visualPolish/AccessibilityEnhancements';

// Import React for components
import React, { View, Text } from 'react-native';
import { useAccessibility } from '../utils/visualPolish/AccessibilityEnhancements';
import { EventLogger } from '../../utils/EventLogger';