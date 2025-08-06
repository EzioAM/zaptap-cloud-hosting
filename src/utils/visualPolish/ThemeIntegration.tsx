/**
 * Theme Integration Layer
 * Bridges the new visual polish system with the existing theme system
 */

import React, { useEffect, useState, createContext, useContext } from 'react';
import { DynamicThemeSystem, ThemeColors, ThemeGradients } from './DynamicThemeSystem';
import { AccessibilityManager, useAccessibility } from './AccessibilityEnhancements';

// Import existing theme context
import { useTheme } from '../../contexts/ThemeCompatibilityShim';

// Enhanced Theme Context
interface EnhancedThemeContextType {
  // Existing theme properties
  colors: ThemeColors;
  gradients: ThemeGradients;
  
  // New visual polish features
  setThemeMode: (mode: 'light' | 'dark' | 'auto' | 'custom') => void;
  setSeason: (season: 'spring' | 'summer' | 'fall' | 'winter') => void;
  createCustomTheme: (colors: Partial<ThemeColors>) => ThemeColors;
  
  // Animation and accessibility
  shouldReduceMotion: boolean;
  shouldUseHighContrast: boolean;
  textSizeMultiplier: number;
  
  // Performance
  isSeasonalThemeActive: boolean;
}

const EnhancedThemeContext = createContext<EnhancedThemeContextType | null>(null);

// Enhanced Theme Provider
export const EnhancedThemeProvider: React.FC<{
  children: React.ReactNode;
  enableVisualPolish?: boolean;
}> = ({ children, enableVisualPolish = true }) => {
  const existingTheme = useTheme();
  const [dynamicTheme, setDynamicTheme] = useState<ThemeColors | null>(null);
  const [gradients, setGradients] = useState<ThemeGradients | null>(null);
  const { preferences } = useAccessibility();

  const themeSystem = DynamicThemeSystem.getInstance();

  useEffect(() => {
    if (!enableVisualPolish) {
      // Use existing theme system only
      return;
    }

    // Initialize dynamic theme system
    const updateTheme = (newTheme: ThemeColors) => {
      setDynamicTheme(newTheme);
      setGradients(themeSystem.getCurrentGradients());
    };

    // Listen for theme changes
    const unsubscribe = themeSystem.addListener(updateTheme);

    // Set initial theme
    updateTheme(themeSystem.getCurrentTheme());

    return unsubscribe;
  }, [enableVisualPolish]);

  const contextValue: EnhancedThemeContextType = {
    // Use dynamic theme if available, fallback to existing theme
    colors: dynamicTheme || existingTheme.colors,
    gradients: gradients || {
      primary: [existingTheme.colors.primary, existingTheme.colors.primary],
      secondary: [existingTheme.colors.secondary, existingTheme.colors.secondary],
      accent: [existingTheme.colors.accent, existingTheme.colors.accent],
      background: [existingTheme.colors.background, existingTheme.colors.surface],
      surface: [existingTheme.colors.surface, existingTheme.colors.surfaceVariant],
      success: [existingTheme.colors.success, existingTheme.colors.success],
      warning: [existingTheme.colors.warning, existingTheme.colors.warning],
      error: [existingTheme.colors.error, existingTheme.colors.error],
      info: [existingTheme.colors.info, existingTheme.colors.info],
      mesh: [existingTheme.colors.primary, existingTheme.colors.secondary],
    },

    // Visual polish methods
    setThemeMode: (mode) => {
      if (enableVisualPolish) {
        themeSystem.setTheme(mode);
      }
    },
    setSeason: (season) => {
      if (enableVisualPolish) {
        themeSystem.setSeason(season);
      }
    },
    createCustomTheme: (colors) => {
      if (enableVisualPolish) {
        return themeSystem.createCustomTheme(colors);
      }
      return { ...existingTheme.colors, ...colors };
    },

    // Accessibility
    shouldReduceMotion: preferences.reduceMotion,
    shouldUseHighContrast: preferences.highContrast,
    textSizeMultiplier: preferences.increasedTextSize ? 1.2 : 1,

    // Features
    isSeasonalThemeActive: enableVisualPolish ? themeSystem.isSeasonalThemeActive() : false,
  };

  return (
    <EnhancedThemeContext.Provider value={contextValue}>
      {children}
    </EnhancedThemeContext.Provider>
  );
};

// Enhanced useTheme hook
export const useEnhancedTheme = (): EnhancedThemeContextType => {
  const context = useContext(EnhancedThemeContext);
  if (!context) {
    throw new Error('useEnhancedTheme must be used within an EnhancedThemeProvider');
  }
  return context;
};

// Migration helper for existing components
export const migrateToEnhancedTheme = <T extends { theme?: any }>(
  Component: React.ComponentType<T>
): React.ComponentType<Omit<T, 'theme'>> => {
  return React.forwardRef<any, Omit<T, 'theme'>>((props, ref) => {
    const enhancedTheme = useEnhancedTheme();
    
    // Create compatible theme object for existing components
    const compatibleTheme = {
      colors: enhancedTheme.colors,
      // Add any other theme properties that existing components expect
      spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
      },
      typography: {
        fontSize: {
          xs: 12 * enhancedTheme.textSizeMultiplier,
          sm: 14 * enhancedTheme.textSizeMultiplier,
          md: 16 * enhancedTheme.textSizeMultiplier,
          lg: 18 * enhancedTheme.textSizeMultiplier,
          xl: 24 * enhancedTheme.textSizeMultiplier,
        },
      },
    };

    return (
      <Component
        ref={ref}
        {...(props as T)}
        theme={compatibleTheme}
      />
    );
  });
};

// Theme-aware styled component creator
export const createThemeAwareStyles = (
  styleGenerator: (
    colors: ThemeColors,
    gradients: ThemeGradients,
    accessibility: {
      shouldReduceMotion: boolean;
      shouldUseHighContrast: boolean;
      textSizeMultiplier: number;
    }
  ) => any
) => {
  return () => {
    const theme = useEnhancedTheme();
    const accessibilityManager = AccessibilityManager.getInstance();
    
    const baseStyles = styleGenerator(
      theme.colors,
      theme.gradients,
      {
        shouldReduceMotion: theme.shouldReduceMotion,
        shouldUseHighContrast: theme.shouldUseHighContrast,
        textSizeMultiplier: theme.textSizeMultiplier,
      }
    );

    return accessibilityManager.getAccessibleStyles(baseStyles);
  };
};

// Example integration with existing HomeScreen
export const EnhancedHomeScreenExample: React.FC = () => {
  const theme = useEnhancedTheme();
  const styles = createThemeAwareStyles((colors, gradients, a11y) => ({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      // High contrast support
      ...(a11y.shouldUseHighContrast && {
        borderWidth: 2,
        borderColor: colors.primary,
      }),
    },
    title: {
      fontSize: 24 * a11y.textSizeMultiplier,
      color: colors.onBackground,
      fontWeight: 'bold',
      marginBottom: 16,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      // Add gradient background if supported
      background: `linear-gradient(135deg, ${gradients.surface[0]}, ${gradients.surface[1]})`,
    },
  }))();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enhanced Home Screen</Text>
      
      {/* Seasonal theme indicator */}
      {theme.isSeasonalThemeActive && (
        <View style={[styles.card, { backgroundColor: theme.colors.accent }]}>
          <Text style={{ color: theme.colors.onBackground }}>
            🌸 Seasonal theme active!
          </Text>
        </View>
      )}

      {/* Accessibility status */}
      <View style={styles.card}>
        <Text style={{ color: theme.colors.onSurface }}>
          Motion: {theme.shouldReduceMotion ? 'Reduced' : 'Full'}
        </Text>
        <Text style={{ color: theme.colors.onSurface }}>
          Text Size: {Math.round(theme.textSizeMultiplier * 100)}%
        </Text>
        <Text style={{ color: theme.colors.onSurface }}>
          High Contrast: {theme.shouldUseHighContrast ? 'Yes' : 'No'}
        </Text>
      </View>

      {/* Theme controls */}
      <View style={styles.card}>
        <Text style={{ color: theme.colors.onSurface, marginBottom: 8 }}>
          Quick Theme Actions:
        </Text>
        
        <TouchableOpacity
          onPress={() => theme.setThemeMode('dark')}
          style={{
            backgroundColor: theme.colors.primary,
            padding: 8,
            borderRadius: 6,
            marginBottom: 4,
          }}
        >
          <Text style={{ color: theme.colors.onPrimary }}>Dark Mode</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => theme.setSeason('spring')}
          style={{
            backgroundColor: theme.colors.secondary,
            padding: 8,
            borderRadius: 6,
            marginBottom: 4,
          }}
        >
          <Text style={{ color: theme.colors.onSecondary }}>Spring Theme</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Export migration utilities
export const ThemeIntegrationUtils = {
  // Convert existing color values to new format
  migrateColorScheme: (existingColors: any): Partial<ThemeColors> => ({
    primary: existingColors.primary || '#007AFF',
    primaryVariant: existingColors.primaryDark || existingColors.primary || '#0056CC',
    secondary: existingColors.secondary || '#5AC8FA',
    secondaryVariant: existingColors.secondaryDark || existingColors.secondary || '#32ADE6',
    background: existingColors.background || '#FFFFFF',
    surface: existingColors.surface || existingColors.card || '#F2F2F7',
    surfaceVariant: existingColors.surfaceVariant || existingColors.border || '#E5E5EA',
    onPrimary: existingColors.onPrimary || '#FFFFFF',
    onSecondary: existingColors.onSecondary || '#000000',
    onBackground: existingColors.onBackground || existingColors.text || '#000000',
    onSurface: existingColors.onSurface || existingColors.text || '#000000',
    success: existingColors.success || existingColors.positive || '#34C759',
    warning: existingColors.warning || '#FF9500',
    error: existingColors.error || existingColors.negative || '#FF3B30',
    info: existingColors.info || existingColors.primary || '#007AFF',
    accent: existingColors.accent || existingColors.primary || '#AF52DE',
    disabled: existingColors.disabled || '#C7C7CC',
    placeholder: existingColors.placeholder || '#8E8E93',
    border: existingColors.border || '#C6C6C8',
    shadow: existingColors.shadow || 'rgba(0, 0, 0, 0.1)',
    gradientStart: existingColors.primary || '#007AFF',
    gradientEnd: existingColors.secondary || '#5AC8FA',
  }),

  // Check compatibility with existing theme structure
  isCompatibleTheme: (theme: any): boolean => {
    return (
      theme &&
      theme.colors &&
      typeof theme.colors.primary === 'string' &&
      typeof theme.colors.background === 'string'
    );
  },
};

export default EnhancedThemeProvider;