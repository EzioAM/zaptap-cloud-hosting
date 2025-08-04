/**
 * Unified Theme Provider for ZapTap
 * Replaces the old ThemeContext with modern Material Design 3 system
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme, ThemeMode, getTheme } from '../theme';
import { createCompatibleTheme } from '../utils/themeCompatibility';

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  isSystemDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  initialMode?: ThemeMode;
}

export const UnifiedThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  initialMode = 'system' 
}) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>(initialMode);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const isSystemDark = systemColorScheme === 'dark';

  // Load theme preference on mount
  useEffect(() => {
    loadThemePreference();
  }, []);

  // Update status bar when theme changes
  useEffect(() => {
    const currentTheme = getCurrentTheme();
    StatusBar.setBarStyle(
      currentTheme.mode === 'light' ? 'dark-content' : 'light-content',
      true
    );
  }, [themeMode, systemColorScheme]);

  const loadThemePreference = async () => {
    try {
      const savedMode = await AsyncStorage.getItem('theme_preference');
      if (savedMode && ['light', 'dark', 'oled-dark', 'system'].includes(savedMode)) {
        setThemeModeState(savedMode as ThemeMode);
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveThemePreference = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem('theme_preference', mode);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    saveThemePreference(mode);
  }, []);

  const toggleTheme = useCallback(() => {
    const currentTheme = getCurrentTheme();
    let nextMode: ThemeMode;
    
    if (themeMode === 'system') {
      nextMode = isSystemDark ? 'light' : 'dark';
    } else {
      nextMode = currentTheme.mode === 'light' ? 'dark' : 'light';
    }
    
    setThemeMode(nextMode);
  }, [themeMode, isSystemDark, setThemeMode]);

  const getCurrentTheme = useCallback((): Theme => {
    if (themeMode === 'system') {
      return getTheme(isSystemDark ? 'dark' : 'light');
    }
    return getTheme(themeMode);
  }, [themeMode, isSystemDark]);

  // Provide default theme while loading to prevent render blocking
  const rawTheme = isLoaded ? getCurrentTheme() : getTheme('light');
  const theme = createCompatibleTheme(rawTheme);

  const contextValue: ThemeContextType = {
    theme,
    themeMode,
    setThemeMode,
    toggleTheme,
    isSystemDark,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useUnifiedTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useUnifiedTheme must be used within a UnifiedThemeProvider');
  }
  return context;
};

// Hook for theme-aware styling
export const useThemedStyles = <T extends Record<string, any>>(
  createStyles: (theme: Theme) => T
): T => {
  const { theme } = useUnifiedTheme();
  return React.useMemo(() => createStyles(theme), [theme, createStyles]);
};

// Accessibility-aware component wrapper
export interface ThemedComponentProps {
  children: React.ReactNode;
  accessibilityRole?: string;
  accessibilityLabel?: string;
  minimumTouchTarget?: boolean;
}

export const ThemedComponent: React.FC<ThemedComponentProps> = ({
  children,
  minimumTouchTarget = false,
  ...accessibilityProps
}) => {
  const { theme } = useUnifiedTheme();
  
  const style = minimumTouchTarget ? {
    minWidth: theme.constants.minTouchTarget,
    minHeight: theme.constants.minTouchTarget,
  } : undefined;

  return (
    <>{React.cloneElement(children as React.ReactElement, {
      style: [style, (children as React.ReactElement).props.style],
      ...accessibilityProps,
    })}</>
  );
};

// Export for backward compatibility (gradually replace old useTheme)
export const useTheme = useUnifiedTheme;