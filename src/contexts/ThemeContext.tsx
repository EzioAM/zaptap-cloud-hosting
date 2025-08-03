import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Theme {
  mode: ThemeMode;
  colors: {
    primary: string;
    primaryVariant: string;
    secondary: string;
    background: string;
    surface: string;
    surfaceVariant: string;
    error: string;
    text: string;
    textSecondary: string;
    border: string;
    divider: string;
    success: string;
    warning: string;
    info: string;
    // Navigation specific
    tabBarBackground: string;
    tabBarActive: string;
    tabBarInactive: string;
    // Card specific
    cardBackground: string;
    cardShadow: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    round: number;
  };
  typography: {
    h1: { fontSize: number; fontWeight: string };
    h2: { fontSize: number; fontWeight: string };
    h3: { fontSize: number; fontWeight: string };
    body: { fontSize: number; fontWeight: string };
    caption: { fontSize: number; fontWeight: string };
    button: { fontSize: number; fontWeight: string };
  };
}

const lightTheme: Theme = {
  mode: 'light',
  colors: {
    primary: '#6750A4',
    primaryVariant: '#7F67BE',
    secondary: '#625B71',
    background: '#FEF7FF',
    surface: '#FFFFFF',
    surfaceVariant: '#F5F0F7',
    error: '#BA1A1A',
    text: '#1D1B20',
    textSecondary: '#79747E',
    border: '#E7E0EC',
    divider: '#CAC4D0',
    success: '#4CAF50',
    warning: '#FF9800',
    info: '#2196F3',
    // Navigation
    tabBarBackground: '#FFFFFF',
    tabBarActive: '#6750A4',
    tabBarInactive: '#79747E',
    // Card
    cardBackground: '#FFFFFF',
    cardShadow: 'rgba(0, 0, 0, 0.1)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    round: 100,
  },
  typography: {
    h1: { fontSize: 32, fontWeight: '700' },
    h2: { fontSize: 24, fontWeight: '600' },
    h3: { fontSize: 20, fontWeight: '600' },
    body: { fontSize: 16, fontWeight: '400' },
    caption: { fontSize: 14, fontWeight: '400' },
    button: { fontSize: 16, fontWeight: '600' },
  },
};

const darkTheme: Theme = {
  ...lightTheme,
  mode: 'dark',
  colors: {
    primary: '#D0BCFF',
    primaryVariant: '#BBA6DF',
    secondary: '#CCC2DC',
    background: '#1D1B20',
    surface: '#2B2930',
    surfaceVariant: '#49454F',
    error: '#F2B8B5',
    text: '#E6E1E5',
    textSecondary: '#CAC4D0',
    border: '#49454F',
    divider: '#605D64',
    success: '#81C784',
    warning: '#FFB74D',
    info: '#64B5F6',
    // Navigation
    tabBarBackground: '#2B2930',
    tabBarActive: '#D0BCFF',
    tabBarInactive: '#938F99',
    // Card
    cardBackground: '#2B2930',
    cardShadow: 'rgba(0, 0, 0, 0.3)',
  },
};

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  
  useEffect(() => {
    loadThemeMode();
  }, []);

  const loadThemeMode = async () => {
    try {
      const savedMode = await AsyncStorage.getItem('themeMode');
      if (savedMode) {
        setThemeMode(savedMode as ThemeMode);
      }
    } catch (error) {
      console.error('Failed to load theme mode:', error);
    }
  };

  const saveThemeMode = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem('themeMode', mode);
      setThemeMode(mode);
    } catch (error) {
      console.error('Failed to save theme mode:', error);
    }
  };

  const toggleTheme = () => {
    const nextMode = themeMode === 'light' ? 'dark' : 'light';
    saveThemeMode(nextMode);
  };

  const getTheme = (): Theme => {
    if (themeMode === 'system') {
      return systemColorScheme === 'dark' ? darkTheme : lightTheme;
    }
    return themeMode === 'dark' ? darkTheme : lightTheme;
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: getTheme(),
        themeMode,
        setThemeMode: saveThemeMode,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};