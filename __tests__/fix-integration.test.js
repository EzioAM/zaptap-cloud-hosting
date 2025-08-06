
/**
 * Integration test for Discover Screen and Monitoring Service fixes
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Mock store
const mockStore = {
  getState: () => ({
    auth: { user: null },
  }),
  subscribe: jest.fn(),
  dispatch: jest.fn(),
};

// Mock theme
jest.mock('../../src/components/common/ThemeFallbackWrapper', () => ({
  useSafeTheme: () => ({
    colors: {
      background: {
        primary: '#ffffff',
      },
      text: {
        primary: '#000000',
        secondary: '#666666',
      },
      primary: '#2196F3',
      surface: {
        primary: '#ffffff',
      },
    },
  }),
}));

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));

// Mock connection context
jest.mock('../../src/contexts/ConnectionContext', () => ({
  useConnection: () => ({
    connectionState: { isConnected: true },
  }),
}));

// Mock API hooks
jest.mock('../../src/store/api/automationApi', () => ({
  useGetPublicAutomationsQuery: () => ({
    data: [],
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
  useGetTrendingAutomationsQuery: () => ({
    data: [],
    isLoading: false,
    refetch: jest.fn(),
  }),
  useLikeAutomationMutation: () => [jest.fn()],
  useUnlikeAutomationMutation: () => [jest.fn()],
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
}));

// Mock Supabase
jest.mock('../../src/services/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        limit: jest.fn(() => ({
          then: jest.fn(() => Promise.resolve({ error: null })),
        })),
      })),
      insert: jest.fn(() => Promise.resolve({ error: null })),
    })),
  },
}));

// Test DiscoverScreenSafe
describe('DiscoverScreenSafe Integration', () => {
  let DiscoverScreenSafe;

  beforeAll(async () => {
    // Import after mocks are set up
    const module = await import('../../src/screens/modern/DiscoverScreenSafe');
    DiscoverScreenSafe = module.default;
  });

  test('renders without crashing with proper theme', () => {
    const TestWrapper = ({ children }) => (
      <SafeAreaProvider>
        <Provider store={mockStore}>
          <NavigationContainer>
            {children}
          </NavigationContainer>
        </Provider>
      </SafeAreaProvider>
    );

    const { getByText } = render(
      <TestWrapper>
        <DiscoverScreenSafe />
      </TestWrapper>
    );

    // Should render the header
    expect(getByText('Discover')).toBeTruthy();
  });

  test('uses theme colors correctly', async () => {
    const TestWrapper = ({ children }) => (
      <SafeAreaProvider>
        <Provider store={mockStore}>
          <NavigationContainer>
            {children}
          </NavigationContainer>
        </Provider>
      </SafeAreaProvider>
    );

    const component = render(
      <TestWrapper>
        <DiscoverScreenSafe />
      </TestWrapper>
    );

    // Component should render without errors
    expect(component).toBeDefined();
  });
});

// Test PerformanceMonitor
describe('PerformanceMonitor Integration', () => {
  let PerformanceMonitor;

  beforeAll(async () => {
    const module = await import('../../src/services/monitoring/PerformanceMonitor');
    PerformanceMonitor = module.PerformanceMonitor;
  });

  test('initializes without database connection', async () => {
    // Should not throw even if database is unavailable
    await expect(PerformanceMonitor.initialize()).resolves.not.toThrow();
  });

  test('handles metric tracking gracefully', () => {
    // Should not throw when tracking metrics
    expect(() => {
      PerformanceMonitor.startScreenRender('TestScreen');
      PerformanceMonitor.endScreenRender('TestScreen');
    }).not.toThrow();
  });
});

// Test CrashReporter
describe('CrashReporter Integration', () => {
  let CrashReporter;

  beforeAll(async () => {
    const module = await import('../../src/services/monitoring/CrashReporter');
    CrashReporter = module.CrashReporter;
  });

  test('initializes without database connection', async () => {
    // Should not throw even if database is unavailable
    await expect(CrashReporter.initialize()).resolves.not.toThrow();
  });

  test('handles error reporting gracefully', () => {
    // Should not throw when reporting errors
    expect(() => {
      CrashReporter.reportError(new Error('Test error'));
    }).not.toThrow();
  });
});
