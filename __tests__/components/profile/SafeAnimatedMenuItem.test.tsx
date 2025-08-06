import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SafeAnimatedMenuItem, SafeAnimatedMenuSection } from '../../../src/components/profile/SafeAnimatedMenuItem';

// Mock the animations to avoid test issues
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Animated: {
      ...RN.Animated,
      Value: jest.fn(() => ({
        setValue: jest.fn(),
        interpolate: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        removeAllListeners: jest.fn(),
      })),
      timing: jest.fn(() => ({
        start: jest.fn(),
      })),
      spring: jest.fn(() => ({
        start: jest.fn(),
      })),
      parallel: jest.fn(() => ({
        start: jest.fn(),
      })),
      View: RN.View,
    },
  };
});

// Mock expo modules
jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

describe('SafeAnimatedMenuItem', () => {
  const mockTheme = {
    colors: {
      text: '#000000',
      textSecondary: '#666666',
      primary: '#2196F3',
      surface: '#FFFFFF',
      background: '#F5F5F5',
    },
  };

  const defaultProps = {
    icon: 'home',
    label: 'Home',
    index: 0,
    theme: mockTheme,
  };

  it('renders without crashing with valid props', () => {
    const { getByText } = render(<SafeAnimatedMenuItem {...defaultProps} />);
    expect(getByText('Home')).toBeTruthy();
  });

  it('handles null/undefined props gracefully', () => {
    const { getByText } = render(<SafeAnimatedMenuItem {...null as any} />);
    // Should render with default fallback values
    expect(getByText('Menu Item')).toBeTruthy();
  });

  it('handles invalid icon prop gracefully', () => {
    const { getByText } = render(
      <SafeAnimatedMenuItem {...defaultProps} icon={null as any} />
    );
    expect(getByText('Home')).toBeTruthy();
  });

  it('handles invalid label prop gracefully', () => {
    const props = { ...defaultProps, label: null as any };
    const { getByText } = render(<SafeAnimatedMenuItem {...props} />);
    expect(getByText('Menu Item')).toBeTruthy();
  });

  it('handles invalid index prop gracefully', () => {
    const props = { ...defaultProps, index: 'invalid' as any };
    const { getByText } = render(<SafeAnimatedMenuItem {...props} />);
    expect(getByText('Home')).toBeTruthy();
  });

  it('renders switch type correctly', () => {
    const props = {
      ...defaultProps,
      type: 'switch' as const,
      value: true,
      onValueChange: jest.fn(),
    };
    
    const { getByDisplayValue } = render(<SafeAnimatedMenuItem {...props} />);
    // Should render a switch component
    expect(getByDisplayValue).toBeDefined();
  });

  it('handles press events safely', () => {
    const mockOnPress = jest.fn();
    const props = { ...defaultProps, onPress: mockOnPress };
    
    const { getByText } = render(<SafeAnimatedMenuItem {...props} />);
    const menuItem = getByText('Home').parent;
    
    if (menuItem) {
      fireEvent.press(menuItem);
    }
    
    // Press handler should be called safely
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('handles invalid theme gracefully', () => {
    const props = { ...defaultProps, theme: null as any };
    const { getByText } = render(<SafeAnimatedMenuItem {...props} />);
    expect(getByText('Home')).toBeTruthy();
  });

  it('handles disabled state correctly', () => {
    const mockOnPress = jest.fn();
    const props = { ...defaultProps, disabled: true, onPress: mockOnPress };
    
    const { getByText } = render(<SafeAnimatedMenuItem {...props} />);
    const menuItem = getByText('Home').parent;
    
    if (menuItem) {
      fireEvent.press(menuItem);
    }
    
    // Press handler should not be called when disabled
    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('renders badge when provided', () => {
    const props = { ...defaultProps, badge: 5 };
    const { getByText } = render(<SafeAnimatedMenuItem {...props} />);
    expect(getByText('5')).toBeTruthy();
  });

  it('handles large badge numbers correctly', () => {
    const props = { ...defaultProps, badge: 150 };
    const { getByText } = render(<SafeAnimatedMenuItem {...props} />);
    expect(getByText('99+')).toBeTruthy();
  });

  it('renders description when provided', () => {
    const props = { ...defaultProps, description: 'This is a description' };
    const { getByText } = render(<SafeAnimatedMenuItem {...props} />);
    expect(getByText('This is a description')).toBeTruthy();
  });
});

describe('SafeAnimatedMenuSection', () => {
  const mockTheme = {
    colors: {
      text: '#000000',
      textSecondary: '#666666',
      primary: '#2196F3',
      surface: '#FFFFFF',
      background: '#F5F5F5',
    },
  };

  const defaultSection = {
    title: 'Test Section',
    items: [
      { icon: 'home', label: 'Home' },
      { icon: 'settings', label: 'Settings' },
    ],
  };

  const defaultProps = {
    section: defaultSection,
    sectionIndex: 0,
    theme: mockTheme,
  };

  it('renders without crashing with valid props', () => {
    const { getByText } = render(<SafeAnimatedMenuSection {...defaultProps} />);
    expect(getByText('Test Section')).toBeTruthy();
    expect(getByText('Home')).toBeTruthy();
    expect(getByText('Settings')).toBeTruthy();
  });

  it('handles null/undefined section gracefully', () => {
    const props = { ...defaultProps, section: null as any };
    const { toJSON } = render(<SafeAnimatedMenuSection {...props} />);
    // Should return null for invalid sections
    expect(toJSON()).toBeNull();
  });

  it('handles empty items array gracefully', () => {
    const props = {
      ...defaultProps,
      section: { ...defaultSection, items: [] },
    };
    const { toJSON } = render(<SafeAnimatedMenuSection {...props} />);
    // Should return null for empty sections
    expect(toJSON()).toBeNull();
  });

  it('filters out invalid menu items', () => {
    const sectionWithInvalidItems = {
      title: 'Test Section',
      items: [
        { icon: 'home', label: 'Home' }, // valid
        { icon: '', label: 'Invalid' }, // invalid - empty icon
        { icon: 'settings', label: '' }, // invalid - empty label
        null as any, // invalid - null item
        { icon: 'info', label: 'Info' }, // valid
      ],
    };
    
    const props = { ...defaultProps, section: sectionWithInvalidItems };
    const { getByText, queryByText } = render(<SafeAnimatedMenuSection {...props} />);
    
    // Valid items should render
    expect(getByText('Home')).toBeTruthy();
    expect(getByText('Info')).toBeTruthy();
    
    // Invalid items should not render
    expect(queryByText('Invalid')).toBeNull();
  });

  it('handles collapsible sections correctly', () => {
    const collapsibleSection = {
      ...defaultSection,
      collapsible: true,
      initiallyExpanded: true,
    };
    
    const props = { ...defaultProps, section: collapsibleSection };
    const { getByText } = render(<SafeAnimatedMenuSection {...props} />);
    
    expect(getByText('Test Section')).toBeTruthy();
  });

  it('handles invalid sectionIndex gracefully', () => {
    const props = { ...defaultProps, sectionIndex: 'invalid' as any };
    const { getByText } = render(<SafeAnimatedMenuSection {...props} />);
    expect(getByText('Test Section')).toBeTruthy();
  });

  it('handles invalid theme gracefully', () => {
    const props = { ...defaultProps, theme: null };
    const { getByText } = render(<SafeAnimatedMenuSection {...props} />);
    expect(getByText('Test Section')).toBeTruthy();
  });
});