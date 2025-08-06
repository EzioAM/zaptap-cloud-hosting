// Initialize performance tracking BEFORE any imports
import { PerformanceMeasurement } from './src/utils/PerformanceMeasurement';

// Mark the very start of app loading
PerformanceMeasurement.mark('app_bootstrap_start');

import React, { Suspense, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

// Lazy load heavy dependencies to reduce initial bundle size
const SafeAreaProvider = React.lazy(() => 
  import('react-native-safe-area-context').then(module => ({ 
    default: module.SafeAreaProvider 
  }))
);

const ReduxProvider = React.lazy(() => 
  import('react-redux').then(module => ({ 
    default: module.Provider 
  }))
);

const PaperProvider = React.lazy(() => 
  import('react-native-paper').then(module => ({ 
    default: module.Provider 
  }))
);

// Defer loading of heavy modules until after first render
let servicesInitialized = false;
let servicesPromise: Promise<any> | null = null;

const initializeServices = () => {
  if (!servicesPromise) {
    servicesPromise = Promise.all([
      // Load store lazily
      import('./src/store').then(async module => {
        const { store } = await module.createLazyStore();
        return store;
      }),
      // Load navigation lazily
      import('./src/navigation/AppNavigator').then(module => ({ default: module.AppNavigator })),
      // Load context providers lazily
      import('./src/contexts/ThemeCompatibilityShim').then(module => ({ ThemeCompatibilityProvider: module.ThemeCompatibilityProvider })),
      import('./src/contexts/ConnectionContext').then(module => ({ ConnectionProvider: module.ConnectionProvider })),
      import('./src/components/auth/AuthInitializer').then(module => ({ AuthInitializer: module.AuthInitializer })),
      import('./src/contexts/AnalyticsContext').then(module => ({ AnalyticsProvider: module.AnalyticsProvider })),
      // Load monitoring services
      import('./src/services/monitoring/CrashReporter').then(module => ({ CrashReporter: module.CrashReporter })),
      import('./src/services/monitoring/PerformanceMonitor').then(module => ({ PerformanceMonitor: module.PerformanceMonitor })),
      // Load utilities
      import('./src/utils/errorInterceptor').then(module => ({ initializeErrorInterceptor: module.initializeErrorInterceptor })),
      import('./src/utils/EventLogger').then(module => ({ EventLogger: module.EventLogger })),
      // Load theme
      import('react-native-paper').then(module => ({ MD3LightTheme: module.MD3LightTheme })),
    ]).then((modules) => {
      PerformanceMeasurement.mark('services_loaded');
      return {
        store: modules[0],
        AppNavigator: modules[1].default,
        ThemeCompatibilityProvider: modules[2].ThemeCompatibilityProvider,
        ConnectionProvider: modules[3].ConnectionProvider,
        AuthInitializer: modules[4].AuthInitializer,
        AnalyticsProvider: modules[5].AnalyticsProvider,
        CrashReporter: modules[6].CrashReporter,
        PerformanceMonitor: modules[7].PerformanceMonitor,
        initializeErrorInterceptor: modules[8].initializeErrorInterceptor,
        EventLogger: modules[9].EventLogger,
        MD3LightTheme: modules[10].MD3LightTheme,
      };
    });
  }
  return servicesPromise;
};

// Initialize services in the background after first render
const initializeBackgroundServices = async () => {
  if (servicesInitialized) return;
  
  try {
    const services = await initializeServices();
    
    // Initialize error interceptor
    services.initializeErrorInterceptor();
    
    // Log successful initialization
    services.EventLogger.info('App', 'All services loaded successfully');
    
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
      initializeServices().then(services => {
        try {
          services.CrashReporter.reportFatalError(error, {
            error_boundary: true,
            context: 'App root level',
          });
        } catch (reportingError) {
          console.error('Failed to report error to crash reporter:', reportingError);
        }
      }).catch(() => {
        // Silently fail if services aren't ready
      });
    }
    
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 CRITICAL ERROR DETAILS:', error, errorInfo);
    
    // Try enhanced error reporting if services are loaded
    if (servicesInitialized) {
      initializeServices().then(services => {
        try {
          services.EventLogger.critical('App', 'Critical error in root component', error, {
            componentStack: errorInfo.componentStack,
            errorBoundary: 'EmergencyErrorBoundary',
          });
          
          services.CrashReporter.addBreadcrumb({
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
      }).catch(() => {
        // Silently fail if services aren't ready
      });
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

// Lightweight theme fallback for initial render
const lightweightTheme = {
  colors: {
    primary: '#6200ee',
    secondary: '#03dac6',
    background: '#ffffff',
    surface: '#ffffff',
    error: '#B00020',
    onPrimary: '#ffffff',
    onSecondary: '#000000',
    onBackground: '#000000',
    onSurface: '#000000',
    onError: '#ffffff',
  },
};

// Loading component for Suspense fallback
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#6200ee" />
    <Text style={styles.loadingText}>Loading...</Text>
  </View>
);

// Component for rendering the full app once services are loaded
const FullApp: React.FC<{ services: any }> = React.memo(({ services }) => {
  const {
    store,
    AppNavigator,
    ThemeCompatibilityProvider,
    ConnectionProvider,
    AuthInitializer,
    AnalyticsProvider,
    MD3LightTheme
  } = services;

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
    <Suspense fallback={<LoadingScreen />}>
      <SafeAreaProvider>
        <Suspense fallback={<LoadingScreen />}>
          <ReduxProvider store={store}>
            <Suspense fallback={<LoadingScreen />}>
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
                        <Suspense fallback={<LoadingScreen />}>
                          <AppNavigator />
                        </Suspense>
                      </AnalyticsProvider>
                    </ConnectionProvider>
                  </AuthInitializer>
                </ThemeCompatibilityProvider>
              </PaperProvider>
            </Suspense>
          </ReduxProvider>
        </Suspense>
      </SafeAreaProvider>
    </Suspense>
  );
});

let renderCount = 0;

export default function App() {
  const [services, setServices] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  
  renderCount++;
  if (renderCount === 1) {
    PerformanceMeasurement.mark('app_render_start');
    console.log('📱 App component rendering...');
  }

  // Initialize services after first render
  useEffect(() => {
    let mounted = true;
    
    const initializeApp = async () => {
      try {
        PerformanceMeasurement.mark('app_initialization_start');
        
        // Start background service initialization
        const servicesData = await initializeServices();
        
        if (!mounted) return;
        
        // Initialize error interceptor immediately
        servicesData.initializeErrorInterceptor();
        
        // Set services to trigger re-render with full app
        setServices(servicesData);
        setIsInitializing(false);
        
        PerformanceMeasurement.mark('app_initialization_complete');
        
        if (__DEV__) {
          console.log('✅ App initialization complete');
          
          // Get detailed performance report
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
        }
        
        // Now that EventLogger is available, properly initialize PerformanceMeasurement
        PerformanceMeasurement.initialize();
        
        // Log initialization
        servicesData.EventLogger.info('App', 'App component fully initialized', {
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

  // Early loading screen while services initialize
  if (isInitializing) {
    return (
      <EmergencyErrorBoundary>
        <LoadingScreen />
      </EmergencyErrorBoundary>
    );
  }

  // Render full app with services
  if (services) {
    return (
      <EmergencyErrorBoundary>
        <FullApp services={services} />
      </EmergencyErrorBoundary>
    );
  }

  // Fallback to basic loading if services failed to load
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