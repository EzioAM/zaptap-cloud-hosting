import React from 'react';
import renderer from 'react-test-renderer';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';

import { QuickStatsWidget } from '../../src/components/organisms/DashboardWidgets/QuickStatsWidget';
import { QuickActionsWidget } from '../../src/components/organisms/DashboardWidgets/QuickActionsWidget';
import { Card } from '../../src/components/atoms';
import { Button } from '../../src/components/atoms';
import { Badge } from '../../src/components/atoms';
import { TestDataFactory, TestUtils } from '../utils/testHelpers';

// Mock dependencies
jest.mock('../../src/components/common/ThemeFallbackWrapper', () => ({
  useSafeTheme: () => ({
    colors: {
      primary: '#007AFF',
      secondary: '#5856D6',
      background: '#FFFFFF',
      surface: '#F8F8F8',
      text: '#000000',
      textSecondary: '#666666',
      error: '#FF3B30',
      success: '#34C759',
      warning: '#FF9500',
    },
  }),
}));

jest.mock('../../src/store/api/dashboardApi', () => ({
  useGetTodayStatsQuery: jest.fn(),
  dashboardApi: {
    reducer: (state = {}) => state,
    middleware: [],
  },
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

const { useGetTodayStatsQuery } = require('../../src/store/api/dashboardApi');

describe('Component Snapshots', () => {
  let mockStore: ReturnType<typeof configureStore>;

  beforeEach(() => {
    mockStore = configureStore({
      reducer: {
        auth: (state = { user: null, isAuthenticated: false }) => state,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({ serializableCheck: false }),
    });

    // Reset platform to iOS for consistent snapshots
    TestUtils.mockPlatform('ios');
  });

  afterEach(() => {
    TestUtils.resetPlatformMocks();
  });

  const createProviderWrapper = (component: React.ReactElement) => (
    <Provider store={mockStore}>
      <NavigationContainer>
        <PaperProvider>
          {component}
        </PaperProvider>
      </NavigationContainer>
    </Provider>
  );

  describe('Dashboard Widgets', () => {
    describe('QuickStatsWidget', () => {
      it('renders loading state correctly', () => {
        useGetTodayStatsQuery.mockReturnValue({
          data: undefined,
          isLoading: true,
          error: null,
        });

        const component = renderer.create(
          createProviderWrapper(<QuickStatsWidget />)
        );

        expect(component.toJSON()).toMatchSnapshot('QuickStatsWidget-loading');
      });

      it('renders success state with data', () => {
        const mockStats = TestDataFactory.createMockStats({
          totalExecutions: 42,
          successRate: 95,
          averageTime: 1.2,
          timeSaved: 120,
        });

        useGetTodayStatsQuery.mockReturnValue({
          data: mockStats,
          isLoading: false,
          error: null,
        });

        const component = renderer.create(
          createProviderWrapper(<QuickStatsWidget />)
        );

        expect(component.toJSON()).toMatchSnapshot('QuickStatsWidget-success');
      });

      it('renders error state correctly', () => {
        useGetTodayStatsQuery.mockReturnValue({
          data: null,
          isLoading: false,
          error: { message: 'Failed to fetch stats' },
        });

        const component = renderer.create(
          createProviderWrapper(<QuickStatsWidget />)
        );

        expect(component.toJSON()).toMatchSnapshot('QuickStatsWidget-error');
      });

      it('renders with zero values', () => {
        const zeroStats = TestDataFactory.createMockStats({
          totalExecutions: 0,
          successRate: 0,
          averageTime: 0,
          timeSaved: 0,
        });

        useGetTodayStatsQuery.mockReturnValue({
          data: zeroStats,
          isLoading: false,
          error: null,
        });

        const component = renderer.create(
          createProviderWrapper(<QuickStatsWidget />)
        );

        expect(component.toJSON()).toMatchSnapshot('QuickStatsWidget-zero-values');
      });

      it('renders with large numbers', () => {
        const largeStats = TestDataFactory.createMockStats({
          totalExecutions: 999999,
          successRate: 99.99,
          averageTime: 123.45,
          timeSaved: 86400,
        });

        useGetTodayStatsQuery.mockReturnValue({
          data: largeStats,
          isLoading: false,
          error: null,
        });

        const component = renderer.create(
          createProviderWrapper(<QuickStatsWidget />)
        );

        expect(component.toJSON()).toMatchSnapshot('QuickStatsWidget-large-numbers');
      });
    });

    describe('QuickActionsWidget', () => {
      it('renders all action buttons', () => {
        const component = renderer.create(
          createProviderWrapper(<QuickActionsWidget />)
        );

        expect(component.toJSON()).toMatchSnapshot('QuickActionsWidget-default');
      });

      it('renders with different gradients', () => {
        const component = renderer.create(
          createProviderWrapper(<QuickActionsWidget />)
        );

        expect(component.toJSON()).toMatchSnapshot('QuickActionsWidget-gradients');
      });
    });
  });

  describe('Atomic Components', () => {
    describe('Button', () => {
      it('renders primary button', () => {
        const component = renderer.create(
          createProviderWrapper(
            <Button mode="contained" onPress={() => {}}>
              Primary Button
            </Button>
          )
        );

        expect(component.toJSON()).toMatchSnapshot('Button-primary');
      });

      it('renders secondary button', () => {
        const component = renderer.create(
          createProviderWrapper(
            <Button mode="outlined" onPress={() => {}}>
              Secondary Button
            </Button>
          )
        );

        expect(component.toJSON()).toMatchSnapshot('Button-secondary');
      });

      it('renders disabled button', () => {
        const component = renderer.create(
          createProviderWrapper(
            <Button mode="contained" disabled onPress={() => {}}>
              Disabled Button
            </Button>
          )
        );

        expect(component.toJSON()).toMatchSnapshot('Button-disabled');
      });

      it('renders loading button', () => {
        const component = renderer.create(
          createProviderWrapper(
            <Button mode="contained" loading onPress={() => {}}>
              Loading Button
            </Button>
          )
        );

        expect(component.toJSON()).toMatchSnapshot('Button-loading');
      });

      it('renders button with icon', () => {
        const component = renderer.create(
          createProviderWrapper(
            <Button mode="contained" icon="plus" onPress={() => {}}>
              Button with Icon
            </Button>
          )
        );

        expect(component.toJSON()).toMatchSnapshot('Button-with-icon');
      });
    });

    describe('Card', () => {
      it('renders basic card', () => {
        const component = renderer.create(
          createProviderWrapper(
            <Card>
              <div>Card Content</div>
            </Card>
          )
        );

        expect(component.toJSON()).toMatchSnapshot('Card-basic');
      });

      it('renders elevated card', () => {
        const component = renderer.create(
          createProviderWrapper(
            <Card elevated>
              <div>Elevated Card Content</div>
            </Card>
          )
        );

        expect(component.toJSON()).toMatchSnapshot('Card-elevated');
      });

      it('renders card with custom style', () => {
        const component = renderer.create(
          createProviderWrapper(
            <Card style={{ backgroundColor: '#f0f0f0', borderRadius: 8 }}>
              <div>Custom Styled Card</div>
            </Card>
          )
        );

        expect(component.toJSON()).toMatchSnapshot('Card-custom-style');
      });
    });

    describe('Badge', () => {
      it('renders default badge', () => {
        const component = renderer.create(
          createProviderWrapper(
            <Badge>5</Badge>
          )
        );

        expect(component.toJSON()).toMatchSnapshot('Badge-default');
      });

      it('renders success badge', () => {
        const component = renderer.create(
          createProviderWrapper(
            <Badge variant="success">New</Badge>
          )
        );

        expect(component.toJSON()).toMatchSnapshot('Badge-success');
      });

      it('renders error badge', () => {
        const component = renderer.create(
          createProviderWrapper(
            <Badge variant="error">Error</Badge>
          )
        );

        expect(component.toJSON()).toMatchSnapshot('Badge-error');
      });

      it('renders warning badge', () => {
        const component = renderer.create(
          createProviderWrapper(
            <Badge variant="warning">Warning</Badge>
          )
        );

        expect(component.toJSON()).toMatchSnapshot('Badge-warning');
      });

      it('renders large badge', () => {
        const component = renderer.create(
          createProviderWrapper(
            <Badge size="large">99+</Badge>
          )
        );

        expect(component.toJSON()).toMatchSnapshot('Badge-large');
      });

      it('renders small badge', () => {
        const component = renderer.create(
          createProviderWrapper(
            <Badge size="small">1</Badge>
          )
        );

        expect(component.toJSON()).toMatchSnapshot('Badge-small');
      });
    });
  });

  describe('Platform-Specific Renderings', () => {
    describe('iOS Platform', () => {
      beforeEach(() => {
        TestUtils.mockPlatform('ios');
      });

      it('renders QuickStatsWidget with iOS styling', () => {
        useGetTodayStatsQuery.mockReturnValue({
          data: TestDataFactory.createMockStats(),
          isLoading: false,
          error: null,
        });

        const component = renderer.create(
          createProviderWrapper(<QuickStatsWidget />)
        );

        expect(component.toJSON()).toMatchSnapshot('QuickStatsWidget-ios');
      });

      it('renders QuickActionsWidget with iOS styling', () => {
        const component = renderer.create(
          createProviderWrapper(<QuickActionsWidget />)
        );

        expect(component.toJSON()).toMatchSnapshot('QuickActionsWidget-ios');
      });
    });

    describe('Android Platform', () => {
      beforeEach(() => {
        TestUtils.mockPlatform('android');
      });

      it('renders QuickStatsWidget with Android styling', () => {
        useGetTodayStatsQuery.mockReturnValue({
          data: TestDataFactory.createMockStats(),
          isLoading: false,
          error: null,
        });

        const component = renderer.create(
          createProviderWrapper(<QuickStatsWidget />)
        );

        expect(component.toJSON()).toMatchSnapshot('QuickStatsWidget-android');
      });

      it('renders QuickActionsWidget with Android styling', () => {
        const component = renderer.create(
          createProviderWrapper(<QuickActionsWidget />)
        );

        expect(component.toJSON()).toMatchSnapshot('QuickActionsWidget-android');
      });
    });

    describe('Web Platform', () => {
      beforeEach(() => {
        TestUtils.mockPlatform('web');
      });

      it('renders QuickStatsWidget with Web styling', () => {
        useGetTodayStatsQuery.mockReturnValue({
          data: TestDataFactory.createMockStats(),
          isLoading: false,
          error: null,
        });

        const component = renderer.create(
          createProviderWrapper(<QuickStatsWidget />)
        );

        expect(component.toJSON()).toMatchSnapshot('QuickStatsWidget-web');
      });

      it('renders QuickActionsWidget with Web styling', () => {
        const component = renderer.create(
          createProviderWrapper(<QuickActionsWidget />)
        );

        expect(component.toJSON()).toMatchSnapshot('QuickActionsWidget-web');
      });
    });
  });

  describe('Theme Variations', () => {
    const createThemedWrapper = (theme: any, component: React.ReactElement) => (
      <Provider store={mockStore}>
        <NavigationContainer>
          <PaperProvider theme={theme}>
            {component}
          </PaperProvider>
        </NavigationContainer>
      </Provider>
    );

    it('renders with light theme', () => {
      const lightTheme = {
        colors: {
          primary: '#007AFF',
          background: '#FFFFFF',
          surface: '#F8F8F8',
          text: '#000000',
        },
      };

      useGetTodayStatsQuery.mockReturnValue({
        data: TestDataFactory.createMockStats(),
        isLoading: false,
        error: null,
      });

      const component = renderer.create(
        createThemedWrapper(lightTheme, <QuickStatsWidget />)
      );

      expect(component.toJSON()).toMatchSnapshot('QuickStatsWidget-light-theme');
    });

    it('renders with dark theme', () => {
      const darkTheme = {
        colors: {
          primary: '#0A84FF',
          background: '#000000',
          surface: '#1C1C1E',
          text: '#FFFFFF',
        },
      };

      useGetTodayStatsQuery.mockReturnValue({
        data: TestDataFactory.createMockStats(),
        isLoading: false,
        error: null,
      });

      const component = renderer.create(
        createThemedWrapper(darkTheme, <QuickStatsWidget />)
      );

      expect(component.toJSON()).toMatchSnapshot('QuickStatsWidget-dark-theme');
    });
  });

  describe('Animation States', () => {
    it('captures animation initial state', () => {
      jest.useFakeTimers();

      useGetTodayStatsQuery.mockReturnValue({
        data: TestDataFactory.createMockStats(),
        isLoading: false,
        error: null,
      });

      const component = renderer.create(
        createProviderWrapper(<QuickStatsWidget />)
      );

      // Initial render before animations start
      expect(component.toJSON()).toMatchSnapshot('QuickStatsWidget-animation-initial');

      jest.useRealTimers();
    });

    it('captures animation mid-state', () => {
      jest.useFakeTimers();

      useGetTodayStatsQuery.mockReturnValue({
        data: TestDataFactory.createMockStats(),
        isLoading: false,
        error: null,
      });

      const component = renderer.create(
        createProviderWrapper(<QuickStatsWidget />)
      );

      // Advance timers to middle of animation
      jest.advanceTimersByTime(750); // Half of 1500ms animation

      expect(component.toJSON()).toMatchSnapshot('QuickStatsWidget-animation-mid');

      jest.useRealTimers();
    });

    it('captures animation complete state', () => {
      jest.useFakeTimers();

      useGetTodayStatsQuery.mockReturnValue({
        data: TestDataFactory.createMockStats(),
        isLoading: false,
        error: null,
      });

      const component = renderer.create(
        createProviderWrapper(<QuickStatsWidget />)
      );

      // Complete all animations
      jest.advanceTimersByTime(2000);

      expect(component.toJSON()).toMatchSnapshot('QuickStatsWidget-animation-complete');

      jest.useRealTimers();
    });
  });

  describe('Error Boundaries', () => {
    const ThrowingComponent = () => {
      throw new Error('Test error');
    };

    it('captures error boundary fallback UI', () => {
      // Mock console.error to prevent noise in test output
      const originalConsoleError = console.error;
      console.error = jest.fn();

      const ErrorBoundaryComponent = ({ children }: { children: React.ReactNode }) => {
        try {
          return <>{children}</>;
        } catch (error) {
          return <div>Something went wrong</div>;
        }
      };

      const component = renderer.create(
        createProviderWrapper(
          <ErrorBoundaryComponent>
            <ThrowingComponent />
          </ErrorBoundaryComponent>
        )
      );

      expect(component.toJSON()).toMatchSnapshot('ErrorBoundary-fallback');

      console.error = originalConsoleError;
    });
  });

  describe('Loading Skeletons', () => {
    it('renders loading skeleton variations', () => {
      useGetTodayStatsQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      const component = renderer.create(
        createProviderWrapper(<QuickStatsWidget />)
      );

      expect(component.toJSON()).toMatchSnapshot('LoadingSkeleton-stats-widget');
    });
  });

  describe('Empty States', () => {
    it('renders empty state when no data', () => {
      useGetTodayStatsQuery.mockReturnValue({
        data: {},
        isLoading: false,
        error: null,
      });

      const component = renderer.create(
        createProviderWrapper(<QuickStatsWidget />)
      );

      expect(component.toJSON()).toMatchSnapshot('QuickStatsWidget-empty-state');
    });
  });

  describe('Responsive Breakpoints', () => {
    it('renders mobile layout', () => {
      // Mock window dimensions for mobile
      const originalInnerWidth = window.innerWidth;
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375, // Mobile width
      });

      const component = renderer.create(
        createProviderWrapper(<QuickActionsWidget />)
      );

      expect(component.toJSON()).toMatchSnapshot('QuickActionsWidget-mobile');

      // Restore original width
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: originalInnerWidth,
      });
    });

    it('renders tablet layout', () => {
      const originalInnerWidth = window.innerWidth;
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768, // Tablet width
      });

      const component = renderer.create(
        createProviderWrapper(<QuickActionsWidget />)
      );

      expect(component.toJSON()).toMatchSnapshot('QuickActionsWidget-tablet');

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: originalInnerWidth,
      });
    });
  });
});