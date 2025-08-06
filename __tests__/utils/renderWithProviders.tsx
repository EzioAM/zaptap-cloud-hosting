import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { configureStore, PreloadedState } from '@reduxjs/toolkit';
import { RootState } from '../../src/store';
import { authSlice } from '../../src/store/slices/authSlice';
import { automationApi } from '../../src/store/api/automationApi';
import { TestUtils } from './testHelpers';

// Create a custom render function with all providers
interface CustomRenderOptions extends Omit<RenderOptions, 'queries'> {
  preloadedState?: PreloadedState<RootState>;
  store?: ReturnType<typeof configureStore>;
  navigationInitialState?: any;
  withNavigation?: boolean;
  withRedux?: boolean;
  withTheme?: boolean;
  withSafeArea?: boolean;
}

/**
 * Create a test store with minimal configuration
 */
function createTestStore(preloadedState?: PreloadedState<RootState>) {
  return configureStore({
    reducer: {
      auth: authSlice.reducer,
      automationApi: automationApi.reducer,
    },
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }).concat(automationApi.middleware),
  });
}

/**
 * Custom render with Redux provider only
 */
export function renderWithRedux(
  ui: ReactElement,
  {
    preloadedState,
    store = createTestStore(preloadedState),
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children?: ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  }

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

/**
 * Custom render with Navigation container
 */
export function renderWithNavigation(
  ui: ReactElement,
  {
    navigationInitialState,
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children?: ReactNode }) {
    return (
      <NavigationContainer initialState={navigationInitialState}>
        {children}
      </NavigationContainer>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

/**
 * Custom render with Theme provider
 */
export function renderWithTheme(
  ui: ReactElement,
  renderOptions: CustomRenderOptions = {}
) {
  const theme = {
    colors: {
      primary: '#007AFF',
      secondary: '#5856D6',
      background: '#FFFFFF',
      surface: '#F8F8F8',
      text: '#000000',
      error: '#FF3B30',
      success: '#34C759',
      warning: '#FF9500',
    },
  };

  function Wrapper({ children }: { children?: ReactNode }) {
    return <PaperProvider theme={theme}>{children}</PaperProvider>;
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

/**
 * Custom render with SafeArea provider
 */
export function renderWithSafeArea(
  ui: ReactElement,
  renderOptions: CustomRenderOptions = {}
) {
  const initialSafeAreaInsets = {
    top: 44,
    left: 0,
    right: 0,
    bottom: 34,
  };

  function Wrapper({ children }: { children?: ReactNode }) {
    return (
      <SafeAreaProvider initialSafeAreaInsets={initialSafeAreaInsets}>
        {children}
      </SafeAreaProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

/**
 * Custom render with all providers
 */
export function renderWithAllProviders(
  ui: ReactElement,
  {
    preloadedState,
    store = createTestStore(preloadedState),
    navigationInitialState,
    withNavigation = true,
    withRedux = true,
    withTheme = true,
    withSafeArea = true,
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  const theme = {
    colors: {
      primary: '#007AFF',
      secondary: '#5856D6',
      background: '#FFFFFF',
      surface: '#F8F8F8',
      text: '#000000',
      error: '#FF3B30',
      success: '#34C759',
      warning: '#FF9500',
    },
  };

  const initialSafeAreaInsets = {
    top: 44,
    left: 0,
    right: 0,
    bottom: 34,
  };

  function AllProvidersWrapper({ children }: { children?: ReactNode }) {
    let wrappedChildren = children;

    // Wrap with Redux provider
    if (withRedux) {
      wrappedChildren = <Provider store={store}>{wrappedChildren}</Provider>;
    }

    // Wrap with Navigation container
    if (withNavigation) {
      wrappedChildren = (
        <NavigationContainer initialState={navigationInitialState}>
          {wrappedChildren}
        </NavigationContainer>
      );
    }

    // Wrap with Theme provider
    if (withTheme) {
      wrappedChildren = <PaperProvider theme={theme}>{wrappedChildren}</PaperProvider>;
    }

    // Wrap with SafeArea provider
    if (withSafeArea) {
      wrappedChildren = (
        <SafeAreaProvider initialSafeAreaInsets={initialSafeAreaInsets}>
          {wrappedChildren}
        </SafeAreaProvider>
      );
    }

    return <>{wrappedChildren}</>;
  }

  return {
    store,
    ...render(ui, { wrapper: AllProvidersWrapper, ...renderOptions }),
  };
}

/**
 * Utility to create mock navigation props
 */
export function createMockNavigationProps(overrides: any = {}) {
  return {
    navigation: {
      navigate: jest.fn(),
      goBack: jest.fn(),
      setOptions: jest.fn(),
      addListener: jest.fn(() => jest.fn()),
      removeListener: jest.fn(),
      dispatch: jest.fn(),
      canGoBack: jest.fn().mockReturnValue(true),
      isFocused: jest.fn().mockReturnValue(true),
      ...overrides.navigation,
    },
    route: {
      params: {},
      ...overrides.route,
    },
  };
}

/**
 * Utility to create mock theme props
 */
export function createMockTheme(overrides: any = {}) {
  return {
    colors: {
      primary: '#007AFF',
      secondary: '#5856D6',
      background: '#FFFFFF',
      surface: '#F8F8F8',
      text: '#000000',
      error: '#FF3B30',
      success: '#34C759',
      warning: '#FF9500',
      ...overrides.colors,
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
      ...overrides.spacing,
    },
    ...overrides,
  };
}

/**
 * Helper to wait for React Testing Library queries
 */
export async function waitForElement(
  queryFn: () => any,
  timeout: number = 5000
): Promise<any> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const element = queryFn();
      if (element) {
        return element;
      }
    } catch (error) {
      // Continue trying
    }
    
    await TestUtils.waitFor(100);
  }
  
  throw new Error(`Element not found within ${timeout}ms timeout`);
}

// Re-export testing library utilities
export {
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react-native';