import React, { lazy, Suspense, ComponentType, ReactNode, useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { EventLogger } from './EventLogger';

// Loading states for different component types
interface LoadingFallbackProps {
  type?: 'screen' | 'widget' | 'modal' | 'component';
  message?: string;
}

const LoadingFallback: React.FC<LoadingFallbackProps> = ({ 
  type = 'component', 
  message 
}) => {
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    // Show message after 1 second if still loading
    const timer = setTimeout(() => setShowMessage(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={[styles.container, styles[type]]}>
      <ActivityIndicator size="large" color="#8B5CF6" />
      {showMessage && message && (
        <Text style={styles.message}>{message}</Text>
      )}
    </View>
  );
};

// Error boundary for lazy components
class LazyErrorBoundary extends React.Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    EventLogger.error('LazyLoad', 'Component failed to load', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <View style={styles.error}>
          <Text style={styles.errorText}>Failed to load component</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

// Lazy load wrapper with preloading support
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: {
    fallback?: ReactNode;
    errorFallback?: ReactNode;
    preload?: boolean;
    type?: 'screen' | 'widget' | 'modal' | 'component';
    name?: string;
  } = {}
) {
  const LazyComponent = lazy(importFn);
  
  // Preload component if requested
  if (options.preload) {
    importFn().catch(error => {
      EventLogger.error('LazyLoad', `Failed to preload ${options.name || 'component'}`, error);
    });
  }

  return React.forwardRef<any, React.ComponentProps<T>>((props, ref) => (
    <LazyErrorBoundary fallback={options.errorFallback}>
      <Suspense 
        fallback={
          options.fallback || 
          <LoadingFallback 
            type={options.type} 
            message={`Loading ${options.name || 'component'}...`}
          />
        }
      >
        <LazyComponent {...props} ref={ref} />
      </Suspense>
    </LazyErrorBoundary>
  ));
}

// Lazy load screens with navigation integration
export function lazyScreen(
  importFn: () => Promise<{ default: ComponentType<any> }>,
  screenName?: string
) {
  return createLazyComponent(importFn, {
    type: 'screen',
    name: screenName,
    fallback: (
      <View style={styles.screen}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.screenLoadingText}>
          Loading {screenName || 'screen'}...
        </Text>
      </View>
    ),
  });
}

// Lazy load widgets for dashboard
export function lazyWidget(
  importFn: () => Promise<{ default: ComponentType<any> }>,
  widgetName?: string
) {
  return createLazyComponent(importFn, {
    type: 'widget',
    name: widgetName,
    preload: false, // Widgets load on demand
  });
}

// Lazy load modals
export function lazyModal(
  importFn: () => Promise<{ default: ComponentType<any> }>,
  modalName?: string
) {
  return createLazyComponent(importFn, {
    type: 'modal',
    name: modalName,
    preload: true, // Preload modals for better UX
  });
}

// Preload manager for critical paths
export class PreloadManager {
  private static preloadQueue: Map<string, Promise<any>> = new Map();
  
  static preloadComponent(
    name: string,
    importFn: () => Promise<any>
  ): Promise<void> {
    if (!this.preloadQueue.has(name)) {
      const promise = importFn()
        .then(() => {
          EventLogger.debug('LazyLoad', `Preloaded: ${name}`);
        })
        .catch(error => {
          EventLogger.error('LazyLoad', `Failed to preload: ${name}`, error);
          this.preloadQueue.delete(name);
        });
      
      this.preloadQueue.set(name, promise);
    }
    
    return this.preloadQueue.get(name)!;
  }
  
  static async preloadCriticalScreens() {
    const criticalScreens = [
      { name: 'HomeScreen', import: () => import('../screens/HomeScreen') },
      { name: 'MyAutomations', import: () => import('../screens/automation/MyAutomationsScreen') },
    ];
    
    await Promise.all(
      criticalScreens.map(screen => 
        this.preloadComponent(screen.name, screen.import)
      )
    );
  }
  
  static clearCache() {
    this.preloadQueue.clear();
  }
}

// Dynamic import helper with error handling
export async function dynamicImport<T>(
  importFn: () => Promise<T>,
  fallback?: T
): Promise<T> {
  try {
    return await importFn();
  } catch (error) {
    EventLogger.error('LazyLoad', 'Dynamic import failed', error as Error);
    if (fallback) {
      return fallback;
    }
    throw error;
  }
}

// Bundle splitting helper for feature modules
export function splitBundle(
  featureName: string,
  importFn: () => Promise<any>
) {
  return {
    load: () => {
      EventLogger.debug('LazyLoad', `Loading feature bundle: ${featureName}`);
      return importFn();
    },
    preload: () => {
      return PreloadManager.preloadComponent(featureName, importFn);
    },
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  widget: {
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  component: {
    minHeight: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  screenLoadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#8B5CF6',
  },
  error: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF6B6B',
    textAlign: 'center',
  },
});

export { LoadingFallback };