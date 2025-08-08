import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme as usePaperTheme } from 'react-native-paper';
import { EventLogger } from '../../utils/EventLogger';

// Safe theme hook that provides a fallback
export const useSafeTheme = () => {
  const paperTheme = usePaperTheme();
  
  try {
    // Try to use the UnifiedTheme if available
    const { useUnifiedTheme } = require('../../contexts/ThemeCompatibilityShim');
    const unifiedResult = useUnifiedTheme();
    
    if (unifiedResult && unifiedResult.theme) {
      return unifiedResult.theme;
    }
  } catch (error) {
    // Fall back to Paper theme
    EventLogger.debug('ThemeFallbackWrapper', '🎨 Using Paper theme fallback');
  }
  
  // Create a theme object that matches the expected structure
  return {
    mode: 'light',
    dark: false,
    colors: {
      brand: {
        primary: paperTheme.colors.primary,
        primaryLight: paperTheme.colors.primaryContainer || paperTheme.colors.primary,
        primaryDark: paperTheme.colors.primary,
        secondary: paperTheme.colors.secondary,
        accent: paperTheme.colors.tertiary || paperTheme.colors.secondary,
      },
      background: {
        primary: paperTheme.colors.background,
        secondary: paperTheme.colors.surface,
        tertiary: paperTheme.colors.surfaceVariant || paperTheme.colors.surface,
        elevated: paperTheme.colors.elevation?.level2 || paperTheme.colors.surface,
      },
      surface: {
        primary: paperTheme.colors.surface,
        secondary: paperTheme.colors.surfaceVariant || paperTheme.colors.surface,
        elevated: paperTheme.colors.elevation?.level1 || paperTheme.colors.surface,
      },
      text: {
        primary: paperTheme.colors.onBackground,
        secondary: paperTheme.colors.onSurfaceVariant || paperTheme.colors.onSurface,
        tertiary: paperTheme.colors.onSurfaceDisabled || paperTheme.colors.onSurface,
        inverse: paperTheme.colors.inverseSurface || '#FFFFFF',
        link: paperTheme.colors.primary,
      },
      border: {
        light: paperTheme.colors.outline || '#E0E0E0',
        medium: paperTheme.colors.outline || '#E0E0E0',
        strong: paperTheme.colors.outline || '#E0E0E0',
      },
      semantic: {
        error: paperTheme.colors.error,
        errorBackground: paperTheme.colors.errorContainer || paperTheme.colors.error,
        success: '#4CAF50',
        successBackground: '#E8F5E8',
        warning: '#FF9800',
        warningBackground: '#FFF3E0',
        info: '#2196F3',
        infoBackground: '#E3F2FD',
      },
      states: {
        hover: paperTheme.colors.primary,
        pressed: paperTheme.colors.primary,
        disabled: paperTheme.colors.onSurfaceDisabled || 'rgba(0,0,0,0.38)',
        focus: paperTheme.colors.primary,
      },
      overlay: {
        light: 'rgba(0,0,0,0.1)',
        medium: 'rgba(0,0,0,0.3)',
        dark: 'rgba(0,0,0,0.5)',
      },
      // Add any other color properties that components might expect
      primary: paperTheme.colors.primary,
      background: paperTheme.colors.background,
      surface: paperTheme.colors.surface,
      error: paperTheme.colors.error,
      text: paperTheme.colors.onBackground,
      textSecondary: paperTheme.colors.onSurfaceVariant || paperTheme.colors.onSurface,
      onSurface: paperTheme.colors.onSurface,
      onBackground: paperTheme.colors.onBackground,
      onPrimary: paperTheme.colors.onPrimary,
    },
    typography: {
      h1: { fontSize: 32, lineHeight: 40 },
      h2: { fontSize: 28, lineHeight: 36 },
      h3: { fontSize: 24, lineHeight: 32 },
      h4: { fontSize: 20, lineHeight: 28 },
      h5: { fontSize: 18, lineHeight: 24 },
      h6: { fontSize: 16, lineHeight: 20 },
      body1: { fontSize: 16, lineHeight: 24 },
      body2: { fontSize: 14, lineHeight: 20 },
      caption: { fontSize: 12, lineHeight: 16 },
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
      xxl: 48,
    },
    shadows: {
      none: {},
      sm: { 
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.18,
        shadowRadius: 1.0,
      },
      md: { 
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      lg: { 
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.30,
        shadowRadius: 4.65,
      },
      xl: { 
        elevation: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.37,
        shadowRadius: 7.49,
      },
    },
    constants: {
      borderWidth: 1,
      activeOpacity: 0.7,
      disabledOpacity: 0.5,
      headerHeight: 56,
      tabBarHeight: 56,
      floatingButtonSize: 56,
      minTouchTarget: 44,
    },
  };
};

// Error boundary specifically for theme-related errors
class ThemeErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    EventLogger.error('ThemeFallbackWrapper', '🎨 Theme Error:', error, errorInfo as Error);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Theme Error</Text>
            <Text style={styles.errorText}>
              Using fallback theme due to error:
              {'\n'}
              {this.state.error?.message || 'Unknown theme error'}
            </Text>
          </View>
        )
      );
    }

    return this.props.children;
  }
}

// Wrapper component that provides theme fallback
export const ThemeFallbackWrapper: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ children, fallback }) => {
  return (
    <ThemeErrorBoundary fallback={fallback}>
      {children}
    </ThemeErrorBoundary>
  );
};

// Hook for themed styles with fallback
export const useThemedStylesSafe = <T extends Record<string, any>>(
  createStyles: (theme: any) => T
): T => {
  const theme = useSafeTheme();
  return React.useMemo(() => createStyles(theme), [theme]);
};

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#ff0000',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
  },
});