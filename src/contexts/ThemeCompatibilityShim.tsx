/**
 * Temporary theme compatibility shim to fix app crashes
 * This provides a minimal theme context that components can use
 */

import React, { createContext, useContext } from 'react';
import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { useColorScheme } from 'react-native';

// Minimal theme structure to prevent crashes
const createMinimalTheme = (isDark: boolean) => {
  const baseTheme = isDark ? MD3DarkTheme : MD3LightTheme;
  
  return {
    mode: isDark ? 'dark' : 'light',
    colors: {
      ...baseTheme.colors,
      brand: {
        primary: baseTheme.colors.primary,
        primaryLight: baseTheme.colors.primaryContainer,
        primaryDark: baseTheme.colors.primary,
        secondary: baseTheme.colors.secondary,
        accent: baseTheme.colors.tertiary,
      },
      background: {
        primary: baseTheme.colors.background,
        secondary: baseTheme.colors.surface,
        tertiary: baseTheme.colors.surfaceVariant,
        elevated: baseTheme.colors.elevation.level2,
      },
      surface: {
        primary: baseTheme.colors.surface,
        secondary: baseTheme.colors.surfaceVariant,
        elevated: baseTheme.colors.elevation.level1,
      },
      text: {
        primary: baseTheme.colors.onBackground,
        secondary: baseTheme.colors.onSurfaceVariant,
        tertiary: baseTheme.colors.onSurfaceDisabled,
        inverse: baseTheme.colors.inverseSurface,
        link: baseTheme.colors.primary,
      },
      border: {
        light: baseTheme.colors.outline,
        medium: baseTheme.colors.outline,
        strong: baseTheme.colors.outline,
      },
      semantic: {
        error: baseTheme.colors.error,
        errorBackground: baseTheme.colors.errorContainer,
        success: '#4CAF50',
        successBackground: '#E8F5E8',
        warning: '#FF9800',
        warningBackground: '#FFF3E0',
        info: '#2196F3',
        infoBackground: '#E3F2FD',
      },
      states: {
        hover: baseTheme.colors.primary,
        pressed: baseTheme.colors.primary,
        disabled: baseTheme.colors.onSurfaceDisabled,
        focus: baseTheme.colors.primary,
      },
      overlay: {
        light: 'rgba(0,0,0,0.1)',
        medium: 'rgba(0,0,0,0.3)',
        dark: 'rgba(0,0,0,0.5)',
      },
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
      sm: { elevation: 2 },
      md: { elevation: 4 },
      lg: { elevation: 8 },
    },
    animation: {
      spring: { type: 'spring', damping: 15, stiffness: 100, mass: 1 },
      smooth: { type: 'timing', duration: 300 },
      quick: { type: 'timing', duration: 150 },
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
    accessibility: {
      minTouchTarget: 44,
      focusOutlineWidth: 2,
      contrastRatios: {
        normal: 4.5,
        large: 3.0,
        graphical: 3.0,
      },
    },
    tokens: {},
    getColors: (mode?: 'light' | 'dark' | 'oled-dark') => {
      // Return the current theme colors
      return baseTheme.colors;
    },
  };
};

interface ThemeContextType {
  theme: any;
  themeMode: 'light' | 'dark' | 'system';
  setThemeMode: (mode: any) => void;
  toggleTheme: () => void;
  isSystemDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeCompatibilityProvider: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const theme = createMinimalTheme(isDark);
  
  const contextValue: ThemeContextType = {
    theme,
    themeMode: 'system',
    setThemeMode: () => {},
    toggleTheme: () => {},
    isSystemDark: isDark,
  };
  
  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
});

// Export compatibility hooks that match the UnifiedThemeProvider interface
export const useUnifiedTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    // Return a fallback theme to prevent crashes
    return {
      theme: createMinimalTheme(false),
      themeMode: 'light' as const,
      setThemeMode: () => {},
      toggleTheme: () => {},
      isSystemDark: false,
    };
  }
  return context;
};

export const useTheme = useUnifiedTheme;

export const useThemedStyles = <T extends Record<string, any>>(
  createStyles: (theme: any) => T
): T => {
  const { theme } = useUnifiedTheme();
  return React.useMemo(() => createStyles(theme), [theme, createStyles]);
};

// Provide UnifiedThemeProvider as an alias to maintain compatibility
export const UnifiedThemeProvider = ThemeCompatibilityProvider;