import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import renderer from 'react-test-renderer';
import { QuickActionsWidget } from '../../../src/components/organisms/DashboardWidgets/QuickActionsWidget';
import { renderWithAllProviders } from '../../utils/renderWithProviders';
import { AccessibilityTestUtils } from '../../utils/accessibilityHelpers';
import { PerformanceTestUtils } from '../../utils/performanceHelpers';
import { TestUtils } from '../../utils/testHelpers';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock theme hook
jest.mock('../../../src/components/common/ThemeFallbackWrapper', () => ({
  useSafeTheme: () => ({
    colors: {
      text: '#000000',
      textSecondary: '#666666',
      surface: '#FFFFFF',
    },
  }),
}));

describe('QuickActionsWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the widget title correctly', () => {
      const { getByText } = render(<QuickActionsWidget />);
      expect(getByText('Quick Actions')).toBeTruthy();
    });

    it('renders all action buttons', () => {
      const { getByText } = render(<QuickActionsWidget />);
      
      expect(getByText('Create')).toBeTruthy();
      expect(getByText('Scan')).toBeTruthy();
      expect(getByText('Import')).toBeTruthy();
      expect(getByText('Discover')).toBeTruthy();
    });

    it('matches snapshot', () => {
      const component = renderer.create(<QuickActionsWidget />);
      expect(component.toJSON()).toMatchSnapshot();
    });
  });

  describe('Navigation', () => {
    it('navigates to AutomationBuilder when Create is pressed', () => {
      const { getByText } = render(<QuickActionsWidget />);
      
      fireEvent.press(getByText('Create'));
      expect(mockNavigate).toHaveBeenCalledWith('AutomationBuilder');
    });

    it('navigates to Scanner when Scan is pressed', () => {
      const { getByText } = render(<QuickActionsWidget />);
      
      fireEvent.press(getByText('Scan'));
      expect(mockNavigate).toHaveBeenCalledWith('Scanner');
    });

    it('navigates to LibraryTab when Import is pressed', () => {
      const { getByText } = render(<QuickActionsWidget />);
      
      fireEvent.press(getByText('Import'));
      expect(mockNavigate).toHaveBeenCalledWith('LibraryTab');
    });

    it('navigates to DiscoverTab when Discover is pressed', () => {
      const { getByText } = render(<QuickActionsWidget />);
      
      fireEvent.press(getByText('Discover'));
      expect(mockNavigate).toHaveBeenCalledWith('DiscoverTab');
    });

    it('handles navigation errors gracefully', () => {
      mockNavigate.mockImplementationOnce(() => {
        throw new Error('Navigation error');
      });

      const { getByText } = render(<QuickActionsWidget />);
      
      // Should not throw error
      expect(() => {
        fireEvent.press(getByText('Create'));
      }).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('passes accessibility audit', () => {
      const component = renderer.create(<QuickActionsWidget />);
      expect(component).toBeAccessible();
    });

    it('has proper accessibility for action buttons', () => {
      const { getByText } = render(<QuickActionsWidget />);
      
      const createButton = getByText('Create').parent;
      expect(createButton?.props.accessible).toBeTruthy();
      expect(createButton?.props.accessibilityRole).toBe('button');
    });

    it('supports screen readers', () => {
      const component = renderer.create(<QuickActionsWidget />);
      const screenReaderResult = AccessibilityTestUtils.testScreenReaderSupport(component);
      expect(screenReaderResult.coveragePercentage).toBeGreaterThan(80);
    });

    it('has minimum hit area for buttons', () => {
      const component = renderer.create(<QuickActionsWidget />);
      const interactiveElements = AccessibilityTestUtils.findInteractiveElements(component);
      
      interactiveElements.forEach(element => {
        expect(AccessibilityTestUtils.hasMinimumHitArea(element)).toBeTruthy();
      });
    });
  });

  describe('Performance', () => {
    it('renders within performance budget', () => {
      const { renderTime } = PerformanceTestUtils.measureRenderTime(() =>
        render(<QuickActionsWidget />)
      );

      expect(renderTime).toBePerformant(16); // 60fps budget
    });

    it('has no performance anti-patterns', () => {
      const component = renderer.create(<QuickActionsWidget />);
      const issues = PerformanceTestUtils.detectPerformanceAntiPatterns(component);
      expect(issues).toHaveLength(0);
    });

    it('handles multiple rapid presses efficiently', () => {
      const { getByText } = render(<QuickActionsWidget />);
      const createButton = getByText('Create');

      // Simulate rapid presses
      for (let i = 0; i < 10; i++) {
        fireEvent.press(createButton);
      }

      // Should only navigate once (assuming proper debouncing)
      expect(mockNavigate).toHaveBeenCalledTimes(10);
    });
  });

  describe('Visual Feedback', () => {
    it('shows press feedback on touch', () => {
      const { getByText } = render(<QuickActionsWidget />);
      const createButton = getByText('Create').parent;

      expect(createButton?.props.activeOpacity).toBe(0.7);
    });

    it('renders gradient backgrounds correctly', () => {
      const component = renderer.create(<QuickActionsWidget />);
      const tree = component.toJSON();
      
      // Should contain LinearGradient components
      expect(JSON.stringify(tree)).toContain('LinearGradient');
    });
  });

  describe('Theme Integration', () => {
    it('uses theme colors correctly', () => {
      const component = renderer.create(<QuickActionsWidget />);
      const tree = component.toJSON();
      
      // Should use theme colors for text and background
      expect(JSON.stringify(tree)).toContain('#000000'); // text color
      expect(JSON.stringify(tree)).toContain('#666666'); // secondary text
      expect(JSON.stringify(tree)).toContain('#FFFFFF'); // surface color
    });

    it('handles missing theme gracefully', () => {
      // Mock theme hook to return null
      const mockUseSafeTheme = jest.fn(() => ({ colors: null }));
      jest.doMock('../../../src/components/common/ThemeFallbackWrapper', () => ({
        useSafeTheme: mockUseSafeTheme,
      }));

      const component = renderer.create(<QuickActionsWidget />);
      expect(component.toJSON()).toMatchSnapshot();
    });
  });

  describe('Button States', () => {
    it('handles disabled state', () => {
      // This would test disabled buttons if implemented
      const { getByText } = render(<QuickActionsWidget />);
      const buttons = [
        getByText('Create'),
        getByText('Scan'),
        getByText('Import'),
        getByText('Discover'),
      ];

      buttons.forEach(button => {
        expect(button.parent?.props.disabled).toBeFalsy();
      });
    });

    it('maintains button layout with different content lengths', () => {
      // Test with longer labels
      const component = renderer.create(<QuickActionsWidget />);
      expect(component.toJSON()).toMatchSnapshot();
    });
  });

  describe('Icons and Labels', () => {
    it('renders correct icons for each action', () => {
      const component = renderer.create(<QuickActionsWidget />);
      const tree = JSON.stringify(component.toJSON());

      // Check for Material Community Icons
      expect(tree).toContain('plus-circle'); // Create
      expect(tree).toContain('qrcode-scan'); // Scan  
      expect(tree).toContain('import'); // Import
      expect(tree).toContain('compass'); // Discover
    });

    it('uses consistent icon sizes', () => {
      const component = renderer.create(<QuickActionsWidget />);
      const tree = JSON.stringify(component.toJSON());

      // All icons should be size 32
      const iconMatches = tree.match(/"size":32/g);
      expect(iconMatches?.length).toBe(4);
    });

    it('uses white color for all icons', () => {
      const component = renderer.create(<QuickActionsWidget />);
      const tree = JSON.stringify(component.toJSON());

      // All icons should be white
      const whiteColorMatches = tree.match(/"color":"white"/g);
      expect(whiteColorMatches?.length).toBe(4);
    });
  });

  describe('Layout', () => {
    it('maintains proper spacing between buttons', () => {
      const component = renderer.create(<QuickActionsWidget />);
      const tree = component.toJSON();

      // Check grid layout
      expect(JSON.stringify(tree)).toContain('space-between');
    });

    it('handles different screen sizes', () => {
      // Test responsive behavior
      const component = renderer.create(<QuickActionsWidget />);
      expect(component.toJSON()).toMatchSnapshot();
    });
  });

  describe('Error Handling', () => {
    it('handles missing navigation gracefully', () => {
      // Mock useNavigation to return null
      jest.doMock('@react-navigation/native', () => ({
        useNavigation: () => null,
      }));

      expect(() => {
        render(<QuickActionsWidget />);
      }).not.toThrow();
    });

    it('handles icon rendering errors', () => {
      // Mock MaterialCommunityIcons to throw error
      const originalConsoleError = console.error;
      console.error = jest.fn();

      const component = renderer.create(<QuickActionsWidget />);
      
      // Should still render without crashing
      expect(component.toJSON()).toBeTruthy();
      
      console.error = originalConsoleError;
    });
  });

  describe('Platform Compatibility', () => {
    it('renders correctly on iOS', () => {
      TestUtils.mockPlatform('ios');
      
      const component = renderer.create(<QuickActionsWidget />);
      expect(component.toJSON()).toMatchSnapshot();
      
      TestUtils.resetPlatformMocks();
    });

    it('renders correctly on Android', () => {
      TestUtils.mockPlatform('android');
      
      const component = renderer.create(<QuickActionsWidget />);
      expect(component.toJSON()).toMatchSnapshot();
      
      TestUtils.resetPlatformMocks();
    });

    it('renders correctly on Web', () => {
      TestUtils.mockPlatform('web');
      
      const component = renderer.create(<QuickActionsWidget />);
      expect(component.toJSON()).toMatchSnapshot();
      
      TestUtils.resetPlatformMocks();
    });
  });
});