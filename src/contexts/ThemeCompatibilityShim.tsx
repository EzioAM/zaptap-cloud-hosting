/**
 * ThemeCompatibilityShim - Unified theme provider
 * Provides compatibility between different theme systems
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// Extended color palette
const extendedColors = {
  light: {
    brand: {
      primary: '#6200ee',
      secondary: '#03dac6',
      tertiary: '#bb86fc',
    },
    text: {
      primary: '#000000',
      secondary: '#333333',
      tertiary: '#666666',
      disabled: '#999999',
      inverse: '#ffffff',
    },
    surface: {
      primary: '#ffffff',
      secondary: '#f5f5f5',
      tertiary: '#eeeeee',
    },
    background: {
      primary: '#ffffff',
      secondary: '#fafafa',
    },
    overlay: {
      light: 'rgba(0,0,0,0.1)',
      medium: 'rgba(0,0,0,0.3)',
      dark: 'rgba(0,0,0,0.5)',
    },
    status: {
      success: '#4caf50',
      warning: '#ff9800',
      error: '#f44336',
      info: '#2196f3',
    },
  },
  dark: {
    brand: {
      primary: '#bb86fc',
      secondary: '#03dac6',
      tertiary: '#6200ee',
    },
    text: {
      primary: '#ffffff',
      secondary: '#e0e0e0',
      tertiary: '#b0b0b0',
      disabled: '#808080',
      inverse: '#000000',
    },
    surface: {
      primary: '#121212',
      secondary: '#1e1e1e',
      tertiary: '#2a2a2a',
    },
    background: {
      primary: '#000000',
      secondary: '#0a0a0a',
    },
    overlay: {
      light: 'rgba(255,255,255,0.1)',
      medium: 'rgba(255,255,255,0.3)',
      dark: 'rgba(255,255,255,0.5)',
    },
    status: {
      success: '#66bb6a',
      warning: '#ffa726',
      error: '#ef5350',
      info: '#42a5f5',
    },
  },
};

interface UnifiedTheme {
  dark: boolean;
  colors: typeof extendedColors.light;
  paperTheme: typeof MD3LightTheme;
  mode: 'light' | 'dark';
}

interface ThemeContextType {
  theme: UnifiedTheme;
  toggleTheme?: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: {
    dark: false,
    colors: extendedColors.light,
    paperTheme: MD3LightTheme,
    mode: 'light',
  },
});

export const useUnifiedTheme = () => useContext(ThemeContext);

interface ThemeCompatibilityProviderProps {
  children: React.ReactNode;
  forceTheme?: 'light' | 'dark';
}

export const ThemeCompatibilityProvider: React.FC<ThemeCompatibilityProviderProps> = ({
  children,
  forceTheme,
}) => {
  const systemColorScheme = useColorScheme();
  const colorScheme = forceTheme || systemColorScheme || 'light';
  const isDark = colorScheme === 'dark';

  const theme = useMemo<UnifiedTheme>(() => {
    const colors = isDark ? extendedColors.dark : extendedColors.light;
    const paperTheme = isDark ? MD3DarkTheme : MD3LightTheme;

    // Merge Paper theme with our extended colors
    const mergedPaperTheme = {
      ...paperTheme,
      colors: {
        ...paperTheme.colors,
        primary: colors.brand.primary,
        secondary: colors.brand.secondary,
        tertiary: colors.brand.tertiary,
        surface: colors.surface.primary,
        background: colors.background.primary,
        error: colors.status.error,
        onSurface: colors.text.primary,
        onBackground: colors.text.primary,
      },
    };

    return {
      dark: isDark,
      colors,
      paperTheme: mergedPaperTheme,
      mode: isDark ? 'dark' : 'light',
    };
  }, [isDark]);

  const value: ThemeContextType = {
    theme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Helper hooks for common theme access patterns
export const useThemeColors = () => {
  const { theme } = useUnifiedTheme();
  return theme.colors;
};

export const useThemeMode = () => {
  const { theme } = useUnifiedTheme();
  return theme.mode;
};

export const usePaperTheme = () => {
  const { theme } = useUnifiedTheme();
  return theme.paperTheme;
};

export default ThemeContext;