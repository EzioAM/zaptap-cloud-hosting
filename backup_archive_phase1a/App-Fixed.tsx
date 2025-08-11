// Import crypto polyfill FIRST to support UUID generation in React Native
import 'react-native-get-random-values';

// Initialize performance tracking BEFORE any imports
import { PerformanceMeasurement } from './src/utils/PerformanceMeasurement';

// Mark the very start of app loading
PerformanceMeasurement.mark('app_bootstrap_start');

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as ReduxProvider } from 'react-redux';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';

// Direct imports instead of lazy loading for React 19 compatibility
import { AppNavigator } from './src/navigation/AppNavigator';
import { ThemeCompatibilityProvider } from './src/contexts/ThemeCompatibilityShim';
import { ConnectionProvider } from './src/contexts/ConnectionContext';
import { AuthInitializer } from './src/components/auth/AuthInitializer';
import { AnalyticsProvider } from './src/contexts/AnalyticsContext';
import { CrashReporter } from './src/services/monitoring/CrashReporter';
import { PerformanceMonitor } from './src/services/monitoring/PerformanceMonitor';
import { initializeErrorInterceptor } from './src/utils/errorInterceptor';
import { EventLogger } from './src/utils/EventLogger';
import { PerformanceAnalyzer } from './src/utils/PerformanceAnalyzer';
import { PerformanceOptimizer } from './src/utils/PerformanceOptimizer';

// Initialize services directly for React 19 compatibility
let servicesInitialized = false;
let storePromise: Promise<any> | null = null;

const initializeStore = async () => {
  if (!storePromise) {
    storePromise = import('./src/store').then(async module => {
      const { createLazyStore } = module;
      const { store } = await createLazyStore();
      return store;
    });
  }
  return storePromise;
};

// Initialize services in the background after first render
const initializeBackgroundServices = async () => {
  if (servicesInitialized) return;
  
  try {
    // Initialize error interceptor
    initializeErrorInterceptor();
    
    // Log successful initialization
    EventLogger.info('App', 'All services loaded successfully');
    
    servicesInitialized = true;
    
    if (__DEV__) {
      console.log('✅ All services loaded successfully');
      const currentLaunchTime = PerformanceMeasurement.getAppLaunchTime();
      console.log(`📊 Current launch time: ${currentLaunchTime}ms`);
    }
  } catch (error) {
    console.error('❌ Failed to initialize background services:', error);
  }
};

// Emergency Error Boundary with Analytics Integration
class EmergencyErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    console.error('🚨 ERROR BOUNDARY CAUGHT:', error);
    
    // Try to report error if services are loaded
    if (servicesInitialized) {
      try {
        CrashReporter.reportFatalError(error, {
          error_boundary: true,
          context: 'App root level',
        });
      } catch (reportingError) {
        console.error('Failed to report error to crash reporter:', reportingError);
      }
    }
    
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 CRITICAL ERROR DETAILS:', error, errorInfo);
    
    // Try enhanced error reporting if services are loaded
    if (servicesInitialized) {
      try {
        EventLogger.critical('App', 'Critical error in root component', error, {
          componentStack: errorInfo.componentStack,
          errorBoundary: 'EmergencyErrorBoundary',
        });
        
        CrashReporter.addBreadcrumb({
          category: 'error',
          message: 'React Error Boundary triggered',
          level: 'error',
          data: {
            errorName: error.name,
            errorMessage: error.message,
            componentStack: errorInfo.componentStack,
          },
        });
      } catch (reportingError) {
        console.error('Failed to add error breadcrumb:', reportingError);
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>🚨 CRITICAL ERROR</Text>
          <Text style={styles.errorText}>
            {this.state.error?.toString() || 'Unknown error'}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// Loading component
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#6200ee" />
    <Text style={styles.loadingText}>Loading...</Text>
  </View>
);

// Component for rendering the full app once services are loaded
const FullApp: React.FC<{ store: any }> = React.memo(({ store }) => {
  // Create full theme with Material Design 3
  const paperTheme = {
    ...MD3LightTheme,
    colors: {
      ...MD3LightTheme.colors,
      primary: '#6200ee',
      secondary: '#03dac6',
      background: '#ffffff',
      surface: '#ffffff',
      error: '#B00020',
    },
  };

  return (
    <SafeAreaProvider>
      <ReduxProvider store={store}>
        <PaperProvider theme={paperTheme}>
          <ThemeCompatibilityProvider>
            <AuthInitializer>
              <ConnectionProvider>
                <AnalyticsProvider
                  config={{
                    environment: __DEV__ ? 'development' : 'production',
                    debugMode: __DEV__,
                    enableCrashReporting: true,
                    enablePerformanceMonitoring: true,
                  }}
                >
                  <AppNavigator />
                </AnalyticsProvider>
              </ConnectionProvider>
            </AuthInitializer>
          </ThemeCompatibilityProvider>
        </PaperProvider>
      </ReduxProvider>
    </SafeAreaProvider>
  );
});

let renderCount = 0;

export default function App() {
  const [store, setStore] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  
  renderCount++;
  if (renderCount === 1) {
    PerformanceMeasurement.mark('app_render_start');
    console.log('📱 App component rendering...');
  }

  // Initialize store after first render
  useEffect(() => {
    let mounted = true;
    
    const initializeApp = async () => {
      try {
        PerformanceMeasurement.mark('app_initialization_start');
        
        // Initialize store
        const storeInstance = await initializeStore();
        
        if (!mounted) return;
        
        // Initialize performance optimization
        try {
          PerformanceAnalyzer.initialize();
          PerformanceOptimizer.initialize({
            enableAutoOptimization: false, // Disable auto-optimization for stability
            targetLaunchTime: 2500,
            targetFPS: 50,
            maxMemoryUsage: 200,
          });
        } catch (perfError) {
          console.warn('Performance optimization failed to initialize:', perfError);
        }
        
        // Set store to trigger re-render with full app
        setStore(storeInstance);
        setIsInitializing(false);
        
        PerformanceMeasurement.mark('app_initialization_complete');
        
        if (__DEV__) {
          console.log('✅ App initialization complete');
          
          // Get detailed performance report
          try {
            const report = PerformanceMeasurement.getDetailedReport();
            
            console.group('🚀 Performance Optimization Report');
            console.log(`📊 Total Launch Time: ${report.totalLaunchTime}ms`);
            console.log(`🎯 Target: ${report.benchmarks.target}ms`);
            console.log(`📈 Status: ${report.benchmarks.status.toUpperCase()}`);
            
            if (report.benchmarks.improvement > 0) {
              console.log(`✅ SUCCESS! Improved by ${report.benchmarks.improvement}ms`);
            } else {
              console.log(`⚠️ Still ${Math.abs(report.benchmarks.improvement)}ms over target`);
            }
            
            console.log('\n📊 Phase Breakdown:');
            report.breakdown.forEach(phase => {
              console.log(`  ${phase.phase}: ${phase.duration}ms (${phase.percentage}%)`);
            });
            
            console.groupEnd();
            
            // Generate and log performance analysis
            const perfReport = PerformanceAnalyzer.generateReport();
            console.group('🔍 Performance Analysis');
            console.log(`Overall Health: ${perfReport.analysis.overallHealth}`);
            console.log(`Error Boundary Overhead: ${perfReport.metrics.errorBoundaryOverhead}ms`);
            console.log(`Animation Smoothness: ${perfReport.metrics.animationSmoothnessScore}/100`);
            if (perfReport.bottlenecks.length > 0) {
              console.log('Bottlenecks:', perfReport.bottlenecks.map(b => b.component).join(', '));
            }
            console.groupEnd();
          } catch (reportError) {
            console.warn('Performance reporting failed:', reportError);
          }
        }
        
        // Initialize background services
        initializeBackgroundServices();
        
        // Log initialization
        EventLogger.info('App', 'App component fully initialized', {
          environment: __DEV__ ? 'development' : 'production',
          platform: 'mobile',
          launch_time: PerformanceMeasurement.getAppLaunchTime(),
        });
        
      } catch (error) {
        console.error('❌ Failed to initialize app:', error);
        if (!mounted) return;
        
        // Still allow the app to render with basic functionality
        setIsInitializing(false);
      }
    };
    
    // Use a small delay to ensure first render completes
    const timeoutId = setTimeout(initializeApp, 16); // Next frame
    
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  // Early loading screen while store initializes
  if (isInitializing) {
    return (
      <EmergencyErrorBoundary>
        <LoadingScreen />
      </EmergencyErrorBoundary>
    );
  }

  // Render full app with store
  if (store) {
    return (
      <EmergencyErrorBoundary>
        <FullApp store={store} />
      </EmergencyErrorBoundary>
    );
  }

  // Fallback to basic loading if store failed to load
  return (
    <EmergencyErrorBoundary>
      <LoadingScreen />
    </EmergencyErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6200ee',
  },
});