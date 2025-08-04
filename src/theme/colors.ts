/**
 * Color System with Light and Dark Mode Support
 */

import { tokens } from './tokens';

export interface ColorScheme {
  // Background colors
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
    elevated: string;
  };
  
  // Surface colors (cards, modals, etc.)
  surface: {
    primary: string;
    secondary: string;
    elevated: string;
  };
  
  // Text colors
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
    link: string;
  };
  
  // Border colors
  border: {
    light: string;
    medium: string;
    strong: string;
  };
  
  // Brand colors
  brand: {
    primary: string;
    primaryLight: string;
    primaryDark: string;
    secondary: string;
    accent: string;
  };
  
  // Semantic colors
  semantic: {
    success: string;
    successBackground: string;
    warning: string;
    warningBackground: string;
    error: string;
    errorBackground: string;
    info: string;
    infoBackground: string;
  };
  
  // Interactive states
  states: {
    hover: string;
    pressed: string;
    disabled: string;
    focus: string;
  };
  
  // Special purpose
  overlay: {
    light: string;
    medium: string;
    dark: string;
  };
}

export const lightColors: ColorScheme = {
  background: {
    primary: '#FFFFFF',
    secondary: tokens.colors.gray[50],
    tertiary: tokens.colors.gray[100],
    elevated: '#FFFFFF',
  },
  
  surface: {
    primary: '#FFFFFF',
    secondary: tokens.colors.gray[50],
    elevated: '#FFFFFF',
  },
  
  text: {
    primary: tokens.colors.gray[900],
    secondary: tokens.colors.gray[600],
    tertiary: tokens.colors.gray[400],
    inverse: '#FFFFFF',
    link: tokens.colors.brand[600],
  },
  
  border: {
    light: tokens.colors.gray[200],
    medium: tokens.colors.gray[300],
    strong: tokens.colors.gray[400],
  },
  
  brand: {
    primary: tokens.colors.brand[500],
    primaryLight: tokens.colors.brand[400],
    primaryDark: tokens.colors.brand[600],
    secondary: tokens.colors.secondary[500],
    accent: tokens.colors.accent[500],
  },
  
  semantic: {
    success: tokens.colors.success.main,
    successBackground: tokens.colors.accent[50],
    warning: tokens.colors.warning.main,
    warningBackground: '#FEF3C7',
    error: tokens.colors.error.main,
    errorBackground: '#FEE2E2',
    info: tokens.colors.info.main,
    infoBackground: '#DBEAFE',
  },
  
  states: {
    hover: 'rgba(0, 0, 0, 0.04)',
    pressed: 'rgba(0, 0, 0, 0.08)',
    disabled: 'rgba(0, 0, 0, 0.12)',
    focus: tokens.colors.brand[500] + '33', // 20% opacity
  },
  
  overlay: {
    light: 'rgba(0, 0, 0, 0.1)',
    medium: 'rgba(0, 0, 0, 0.4)',
    dark: 'rgba(0, 0, 0, 0.7)',
  },
};

export const darkColors: ColorScheme = {
  background: {
    primary: tokens.colors.gray[900],
    secondary: tokens.colors.gray[800],
    tertiary: tokens.colors.gray[700],
    elevated: '#1A1A1A',
  },
  
  surface: {
    primary: tokens.colors.gray[800],
    secondary: tokens.colors.gray[700],
    elevated: '#242424',
  },
  
  text: {
    primary: '#FFFFFF',
    secondary: tokens.colors.gray[300],
    tertiary: tokens.colors.gray[500],
    inverse: tokens.colors.gray[900],
    link: tokens.colors.brand[400],
  },
  
  border: {
    light: tokens.colors.gray[700],
    medium: tokens.colors.gray[600],
    strong: tokens.colors.gray[500],
  },
  
  brand: {
    primary: tokens.colors.brand[400],
    primaryLight: tokens.colors.brand[300],
    primaryDark: tokens.colors.brand[500],
    secondary: tokens.colors.secondary[400],
    accent: tokens.colors.accent[400],
  },
  
  semantic: {
    success: tokens.colors.success.light,
    successBackground: tokens.colors.success.dark + '22', // Low opacity
    warning: tokens.colors.warning.light,
    warningBackground: tokens.colors.warning.dark + '22',
    error: tokens.colors.error.light,
    errorBackground: tokens.colors.error.dark + '22',
    info: tokens.colors.info.light,
    infoBackground: tokens.colors.info.dark + '22',
  },
  
  states: {
    hover: 'rgba(255, 255, 255, 0.08)',
    pressed: 'rgba(255, 255, 255, 0.12)',
    disabled: 'rgba(255, 255, 255, 0.16)',
    focus: tokens.colors.brand[400] + '33', // 20% opacity
  },
  
  overlay: {
    light: 'rgba(0, 0, 0, 0.2)',
    medium: 'rgba(0, 0, 0, 0.5)',
    dark: 'rgba(0, 0, 0, 0.8)',
  },
};

// OLED optimized dark theme
export const oledDarkColors: ColorScheme = {
  ...darkColors,
  background: {
    primary: '#000000',
    secondary: '#0A0A0A',
    tertiary: '#141414',
    elevated: '#1A1A1A',
  },
  surface: {
    primary: '#0A0A0A',
    secondary: '#141414',
    elevated: '#1F1F1F',
  },
};

// Helper function to get colors based on theme
export const getColors = (theme: 'light' | 'dark' | 'oled-dark' = 'light'): ColorScheme => {
  switch (theme) {
    case 'dark':
      return darkColors;
    case 'oled-dark':
      return oledDarkColors;
    default:
      return lightColors;
  }
};