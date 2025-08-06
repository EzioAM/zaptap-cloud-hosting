import React, { Suspense, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';
import { PreloadManager } from './utils/lazyLoad';
import { EventLogger } from './utils/EventLogger';

// Lazy load heavy providers and components
const LazyPaperProvider = React.lazy(() => 
  import('react-native-paper').then(m => ({ default: m.Provider }))
);

const LazyGestureHandlerRootView = React.lazy(() => 
  import('react-native-gesture-handler').then(m => ({ default: m.GestureHandlerRootView }))
);

const LazyAppNavigator = React.lazy(() => 
  import('./navigation/AppNavigator').then(m => ({ default: m.AppNavigator }))
);

const LazyAuthInitializer = React.lazy(() => 
  import('./components/auth/AuthInitializer').then(m => ({ default: m.AuthInitializer }))
);

const LazyThemeCompatibilityShim = React.lazy(() => 
  import('./contexts/ThemeCompatibilityShim').then(m => ({ default: m.ThemeCompatibilityShim }))
);

// Loading component
const AppLoading: React.FC = () => (
  <View style={styles.loading}>
    <ActivityIndicator size="large" color="#8B5CF6" />
    <Text style={styles.loadingText}>Loading Zaptap...</Text>
  </View>
);

// Persistence loading component
const PersistLoading: React.FC = () => (
  <View style={styles.loading}>
    <ActivityIndicator size="large" color="#8B5CF6" />
    <Text style={styles.loadingText}>Restoring your data...</Text>
  </View>
);

export default function OptimizedApp() {
  useEffect(() => {
    // Start preloading critical screens after app loads
    const preloadTimer = setTimeout(() => {
      PreloadManager.preloadCriticalScreens().catch(error => {
        EventLogger.error('App', 'Failed to preload critical screens', error);
      });
    }, 2000); // Wait 2 seconds after app start

    // Cleanup
    return () => {
      clearTimeout(preloadTimer);
      PreloadManager.clearCache();
    };
  }, []);

  return (
    <Provider store={store}>
      <PersistGate loading={<PersistLoading />} persistor={persistor}>
        <Suspense fallback={<AppLoading />}>
          <LazyGestureHandlerRootView style={styles.container}>
            <LazyThemeCompatibilityShim>
              <LazyPaperProvider>
                <LazyAuthInitializer>
                  <LazyAppNavigator />
                </LazyAuthInitializer>
              </LazyPaperProvider>
            </LazyThemeCompatibilityShim>
          </LazyGestureHandlerRootView>
        </Suspense>
      </PersistGate>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#8B5CF6',
    fontWeight: '500',
  },
});