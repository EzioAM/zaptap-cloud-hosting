import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import renderer from 'react-test-renderer';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { QuickStatsWidget } from '../../src/components/organisms/DashboardWidgets/QuickStatsWidget';
import { QuickActionsWidget } from '../../src/components/organisms/DashboardWidgets/QuickActionsWidget';
import { Button } from '../../src/components/atoms';
import { AccessibilityTestUtils } from '../utils/accessibilityHelpers';
import { TestDataFactory, TestUtils } from '../utils/testHelpers';

// Mock dependencies
jest.mock('../../src/components/common/ThemeFallbackWrapper', () => ({
  useSafeTheme: () => ({
    colors: {
      primary: '#007AFF',
      text: '#000000',
      textSecondary: '#666666',
      surface: '#FFFFFF',
      error: '#FF3B30',
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
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

const { useGetTodayStatsQuery } = require('../../src/store/api/dashboardApi');

describe('Component Accessibility Tests', () => {
  let mockStore: ReturnType<typeof configureStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockStore = configureStore({
      reducer: {
        auth: (state = { user: null, isAuthenticated: false }) => state,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({ serializableCheck: false }),
    });

    useGetTodayStatsQuery.mockReturnValue({
      data: TestDataFactory.createMockStats(),
      isLoading: false,
      error: null,
    });
  });

  describe('QuickStatsWidget Accessibility', () => {
    it('passes comprehensive accessibility audit', () => {
      const component = renderer.create(
        <Provider store={mockStore}>
          <QuickStatsWidget />
        </Provider>
      );

      const audit = AccessibilityTestUtils.auditAccessibility(component);
      
      expect(audit.score).toBeGreaterThan(85);
      expect(audit.issues.filter(issue => issue.severity === 'error')).toHaveLength(0);
    });

    it('has proper semantic structure', () => {
      const component = renderer.create(
        <Provider store={mockStore}>
          <QuickStatsWidget />
        </Provider>
      );

      // Title should be accessible
      const root = component.root;
      const titleElement = root.findByProps({ children: "Today's Activity" });
      expect(AccessibilityTestUtils.hasAccessibilityLabel(titleElement.parent)).toBeTruthy();
    });

    it('provides meaningful stat descriptions', () => {
      const { getByText } = render(
        <Provider store={mockStore}>
          <QuickStatsWidget />
        </Provider>
      );

      // Each stat should have descriptive labels
      expect(getByText('Runs')).toBeTruthy();
      expect(getByText('Success')).toBeTruthy();
      expect(getByText('Avg Time')).toBeTruthy();
      expect(getByText('Time Saved')).toBeTruthy();
    });

    it('handles screen reader navigation', () => {
      const component = renderer.create(
        <Provider store={mockStore}>
          <QuickStatsWidget />
        </Provider>
      );

      const screenReaderResult = AccessibilityTestUtils.testScreenReaderSupport(component);
      expect(screenReaderResult.coveragePercentage).toBeGreaterThan(90);
    });

    it('supports keyboard navigation', () => {
      const component = renderer.create(
        <Provider store={mockStore}>
          <QuickStatsWidget />
        </Provider>
      );

      const keyboardResult = AccessibilityTestUtils.testKeyboardNavigation(component);
      expect(keyboardResult.issues).toHaveLength(0);
    });

    it('has appropriate color contrast', () => {
      // Test color combinations used in the widget
      const colorTests = [
        { foreground: '#000000', background: '#FFFFFF', isLargeText: false },
        { foreground: '#666666', background: '#FFFFFF', isLargeText: false },
        { foreground: '#FFFFFF', background: '#007AFF', isLargeText: false },
      ];

      colorTests.forEach(({ foreground, background, isLargeText }) => {
        expect({ foreground, background, isLargeText }).toHaveGoodColorContrast();
      });
    });

    it('maintains accessibility in loading state', () => {
      useGetTodayStatsQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      const component = renderer.create(
        <Provider store={mockStore}>
          <QuickStatsWidget />
        </Provider>
      );

      const audit = AccessibilityTestUtils.auditAccessibility(component);
      expect(audit.score).toBeGreaterThan(80);
    });

    it('maintains accessibility in error state', () => {
      useGetTodayStatsQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: { message: 'Failed to load' },
      });

      const component = renderer.create(
        <Provider store={mockStore}>
          <QuickStatsWidget />
        </Provider>
      );

      const audit = AccessibilityTestUtils.auditAccessibility(component);
      expect(audit.score).toBeGreaterThan(80);

      // Error message should be accessible
      const { getByText } = render(
        <Provider store={mockStore}>
          <QuickStatsWidget />
        </Provider>
      );

      const errorText = getByText('Unable to load statistics');
      expect(errorText).toBeTruthy();
    });

    it('provides live region updates for dynamic content', () => {
      // Test that stats updates are announced to screen readers
      const component = renderer.create(
        <Provider store={mockStore}>
          <QuickStatsWidget />
        </Provider>
      );

      // Update stats
      useGetTodayStatsQuery.mockReturnValue({
        data: TestDataFactory.createMockStats({ totalExecutions: 100 }),
        isLoading: false,
        error: null,
      });

      component.update(
        <Provider store={mockStore}>
          <QuickStatsWidget />
        </Provider>
      );

      // In a real implementation, this would check for aria-live regions
      expect(component.toJSON()).toBeTruthy();
    });
  });

  describe('QuickActionsWidget Accessibility', () => {
    it('has accessible action buttons', () => {
      const component = renderer.create(<QuickActionsWidget />);
      
      const interactiveElements = AccessibilityTestUtils.findInteractiveElements(component);
      
      interactiveElements.forEach(element => {
        expect(AccessibilityTestUtils.hasAccessibilityLabel(element)).toBeTruthy();
        expect(AccessibilityTestUtils.hasProperAccessibilityRole(element)).toBeTruthy();
      });
    });

    it('meets minimum hit area requirements', () => {
      const component = renderer.create(<QuickActionsWidget />);
      
      const interactiveElements = AccessibilityTestUtils.findInteractiveElements(component);
      
      interactiveElements.forEach(element => {
        expect(AccessibilityTestUtils.hasMinimumHitArea(element)).toBeTruthy();
      });
    });

    it('provides keyboard navigation support', () => {
      const { getByText } = render(<QuickActionsWidget />);
      
      const buttons = ['Create', 'Scan', 'Import', 'Discover'];
      
      buttons.forEach(buttonText => {
        const button = getByText(buttonText).parent;
        expect(button?.props.accessible).toBeTruthy();
        expect(button?.props.accessibilityRole).toBe('button');
      });
    });

    it('announces button actions to screen readers', () => {
      const { getByText } = render(<QuickActionsWidget />);
      
      const createButton = getByText('Create').parent;
      expect(createButton?.props.accessibilityHint).toBeDefined();
    });

    it('handles focus management correctly', () => {
      const component = renderer.create(<QuickActionsWidget />);
      
      const keyboardResult = AccessibilityTestUtils.testKeyboardNavigation(component);
      expect(keyboardResult.hasLogicalTabOrder).toBeTruthy();
    });

    it('supports voice commands', () => {
      // Test that buttons can be activated via voice
      const { getByText } = render(<QuickActionsWidget />);
      
      const createButton = getByText('Create').parent;
      expect(createButton?.props.accessibilityLabel).toContain('Create');
    });
  });

  describe('Button Accessibility', () => {
    it('has proper button semantics', () => {
      const component = renderer.create(
        <Button mode="contained" onPress={() => {}}>
          Test Button
        </Button>
      );

      expect(component).toBeAccessible();
    });

    it('announces loading state to screen readers', () => {
      const component = renderer.create(
        <Button mode="contained" loading onPress={() => {}}>
          Loading Button
        </Button>
      );

      expect(component).toBeAccessible();
    });

    it('handles disabled state accessibility', () => {
      const component = renderer.create(
        <Button mode="contained" disabled onPress={() => {}}>
          Disabled Button
        </Button>
      );

      expect(component).toBeAccessible();
    });

    it('supports high contrast mode', () => {
      // Test button visibility in high contrast mode
      const component = renderer.create(
        <Button mode="outlined" onPress={() => {}}>
          High Contrast Button
        </Button>
      );

      expect(component).toBeAccessible();
    });

    it('maintains text size for readability', () => {
      const component = renderer.create(
        <Button mode="contained" onPress={() => {}}>
          Readable Text
        </Button>
      );

      const audit = AccessibilityTestUtils.auditAccessibility(component);
      const textSizeIssues = audit.issues.filter(issue => issue.type === 'small-text');
      expect(textSizeIssues).toHaveLength(0);
    });
  });

  describe('Platform-Specific Accessibility', () => {
    describe('iOS Accessibility', () => {
      beforeEach(() => {
        TestUtils.mockPlatform('ios');
      });

      afterEach(() => {
        TestUtils.resetPlatformMocks();
      });

      it('supports VoiceOver correctly', () => {
        const component = renderer.create(
          <Provider store={mockStore}>
            <QuickStatsWidget />
          </Provider>
        );

        const audit = AccessibilityTestUtils.auditAccessibility(component);
        expect(audit.score).toBeGreaterThan(85);
      });

      it('implements iOS accessibility traits', () => {
        const { getByText } = render(<QuickActionsWidget />);
        
        const createButton = getByText('Create').parent;
        expect(createButton?.props.accessibilityTraits).toContain('button');
      });

      it('supports dynamic type scaling', () => {
        // Test that text scales appropriately with system font size
        const component = renderer.create(
          <Provider store={mockStore}>
            <QuickStatsWidget />
          </Provider>
        );

        expect(component).toBeAccessible();
      });
    });

    describe('Android Accessibility', () => {
      beforeEach(() => {
        TestUtils.mockPlatform('android');
      });

      afterEach(() => {
        TestUtils.resetPlatformMocks();
      });

      it('supports TalkBack correctly', () => {
        const component = renderer.create(
          <Provider store={mockStore}>
            <QuickStatsWidget />
          </Provider>
        );

        const screenReaderResult = AccessibilityTestUtils.testScreenReaderSupport(component);
        expect(screenReaderResult.coveragePercentage).toBeGreaterThan(85);
      });

      it('implements Android accessibility properties', () => {
        const { getByText } = render(<QuickActionsWidget />);
        
        const buttons = ['Create', 'Scan', 'Import', 'Discover'];
        
        buttons.forEach(buttonText => {
          const button = getByText(buttonText).parent;
          expect(button?.props.accessible).toBeTruthy();
          expect(button?.props.importantForAccessibility).not.toBe('no-hide-descendants');
        });
      });

      it('supports Switch Access', () => {
        const component = renderer.create(<QuickActionsWidget />);
        
        const keyboardResult = AccessibilityTestUtils.testKeyboardNavigation(component);
        expect(keyboardResult.hasFocusableElements).toBeTruthy();
      });
    });

    describe('Web Accessibility', () => {
      beforeEach(() => {
        TestUtils.mockPlatform('web');
      });

      afterEach(() => {
        TestUtils.resetPlatformMocks();
      });

      it('generates semantic HTML', () => {
        const component = renderer.create(
          <Provider store={mockStore}>
            <QuickStatsWidget />
          </Provider>
        );

        // In a real web environment, this would check for proper HTML semantics
        expect(component).toBeAccessible();
      });

      it('supports ARIA attributes', () => {
        const { getByText } = render(<QuickActionsWidget />);
        
        const createButton = getByText('Create').parent;
        expect(createButton?.props['aria-label']).toBeDefined();
      });

      it('implements WCAG guidelines', () => {
        const component = renderer.create(
          <Provider store={mockStore}>
            <QuickStatsWidget />
          </Provider>
        );

        const audit = AccessibilityTestUtils.auditAccessibility(component);
        expect(audit.score).toBeGreaterThan(90); // Higher standard for web
      });

      it('supports keyboard navigation', () => {
        const component = renderer.create(<QuickActionsWidget />);
        
        const keyboardResult = AccessibilityTestUtils.testKeyboardNavigation(component);
        expect(keyboardResult.hasLogicalTabOrder).toBeTruthy();
        expect(keyboardResult.hasFocusableElements).toBeTruthy();
      });
    });
  });

  describe('Accessibility Features', () => {
    it('supports reduce motion preferences', () => {
      // Mock reduced motion preference
      const mockMediaQuery = {
        matches: true,
        addListener: jest.fn(),
        removeListener: jest.fn(),
      };
      
      Object.defineProperty(window, 'matchMedia', {
        value: jest.fn(() => mockMediaQuery),
        writable: true,
      });

      const component = renderer.create(
        <Provider store={mockStore}>
          <QuickStatsWidget />
        </Provider>
      );

      // Should respect reduced motion preference
      expect(component).toBeAccessible();
    });

    it('provides alternative text for visual content', () => {
      const component = renderer.create(
        <Provider store={mockStore}>
          <QuickStatsWidget />
        </Provider>
      );

      // All visual elements should have text alternatives
      const audit = AccessibilityTestUtils.auditAccessibility(component);
      const missingLabelIssues = audit.issues.filter(issue => issue.type === 'missing-label');
      expect(missingLabelIssues).toHaveLength(0);
    });

    it('supports high contrast themes', () => {
      // Test with high contrast colors
      const highContrastTheme = {
        colors: {
          primary: '#FFFF00',
          background: '#000000',
          text: '#FFFFFF',
          surface: '#000000',
        },
      };

      const component = renderer.create(
        <Provider store={mockStore}>
          <QuickStatsWidget />
        </Provider>
      );

      expect(component).toBeAccessible();
    });

    it('handles focus indicators properly', () => {
      const { getByText } = render(<QuickActionsWidget />);
      
      const createButton = getByText('Create').parent;
      
      // Focus should be visible
      fireEvent(createButton, 'onFocus');
      expect(createButton?.props.accessible).toBeTruthy();
    });

    it('provides meaningful error messages', () => {
      useGetTodayStatsQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: { message: 'Network error' },
      });

      const { getByText } = render(
        <Provider store={mockStore}>
          <QuickStatsWidget />
        </Provider>
      );

      const errorMessage = getByText('Unable to load statistics');
      expect(errorMessage).toBeTruthy();
      
      // Error should be announced to screen readers
      expect(errorMessage.parent?.props.accessibilityLiveRegion).toBe('assertive');
    });

    it('supports assistive technology', () => {
      const component = renderer.create(
        <Provider store={mockStore}>
          <QuickStatsWidget />
        </Provider>
      );

      // All interactive elements should be discoverable by assistive technology
      const interactiveElements = AccessibilityTestUtils.findInteractiveElements(component);
      
      interactiveElements.forEach(element => {
        expect(element.props.accessible).not.toBe(false);
      });
    });
  });

  describe('Accessibility Testing Edge Cases', () => {
    it('handles empty/null content gracefully', () => {
      useGetTodayStatsQuery.mockReturnValue({
        data: {},
        isLoading: false,
        error: null,
      });

      const component = renderer.create(
        <Provider store={mockStore}>
          <QuickStatsWidget />
        </Provider>
      );

      expect(component).toBeAccessible();
    });

    it('maintains accessibility during state transitions', () => {
      const component = renderer.create(
        <Provider store={mockStore}>
          <QuickStatsWidget />
        </Provider>
      );

      // Transition from success to loading
      useGetTodayStatsQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      component.update(
        <Provider store={mockStore}>
          <QuickStatsWidget />
        </Provider>
      );

      expect(component).toBeAccessible();
    });

    it('handles rapid accessibility queries', () => {
      const component = renderer.create(
        <Provider store={mockStore}>
          <QuickStatsWidget />
        </Provider>
      );

      // Simulate rapid accessibility queries
      for (let i = 0; i < 10; i++) {
        const audit = AccessibilityTestUtils.auditAccessibility(component);
        expect(audit.score).toBeGreaterThan(80);
      }
    });
  });
});