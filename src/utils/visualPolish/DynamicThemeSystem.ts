/**
 * Dynamic Theme System with Animated Transitions
 * Supports multiple themes with smooth transitions, seasonal themes, and time-based changes
 */

import { Animated, Appearance, AppState, Dimensions } from 'react-native';
import { AnimationSystem, SpringPresets, CustomEasing } from './AnimationSystem';
import { EventLogger } from '../EventLogger';

const { width: screenWidth } = Dimensions.get('window');

export interface ThemeColors {
  // Core colors
  primary: string;
  primaryVariant: string;
  secondary: string;
  secondaryVariant: string;
  
  // Background colors
  background: string;
  surface: string;
  surfaceVariant: string;
  
  // Content colors
  onPrimary: string;
  onSecondary: string;
  onBackground: string;
  onSurface: string;
  
  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Additional colors
  accent: string;
  disabled: string;
  placeholder: string;
  border: string;
  shadow: string;
  
  // Gradient colors
  gradientStart: string;
  gradientEnd: string;
}

export interface ThemeGradients {
  primary: string[];
  secondary: string[];
  accent: string[];
  background: string[];
  surface: string[];
  success: string[];
  warning: string[];
  error: string[];
  info: string[];
  mesh: string[];
}

export interface SeasonalTheme {
  colors: ThemeColors;
  gradients: ThemeGradients;
  animations: {
    particles?: boolean;
    backgroundEffects?: boolean;
    seasonalElements?: boolean;
  };
}

export type ThemeMode = 'light' | 'dark' | 'auto' | 'custom';
export type SeasonType = 'spring' | 'summer' | 'fall' | 'winter';

// Predefined Theme Configurations
const LightTheme: ThemeColors = {
  primary: '#007AFF',
  primaryVariant: '#0056CC',
  secondary: '#5AC8FA',
  secondaryVariant: '#32ADE6',
  background: '#FFFFFF',
  surface: '#F2F2F7',
  surfaceVariant: '#E5E5EA',
  onPrimary: '#FFFFFF',
  onSecondary: '#000000',
  onBackground: '#000000',
  onSurface: '#000000',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  info: '#007AFF',
  accent: '#AF52DE',
  disabled: '#C7C7CC',
  placeholder: '#8E8E93',
  border: '#C6C6C8',
  shadow: 'rgba(0, 0, 0, 0.1)',
  gradientStart: '#007AFF',
  gradientEnd: '#5AC8FA',
};

const DarkTheme: ThemeColors = {
  primary: '#0A84FF',
  primaryVariant: '#409CFF',
  secondary: '#64D2FF',
  secondaryVariant: '#32ADE6',
  background: '#000000',
  surface: '#1C1C1E',
  surfaceVariant: '#2C2C2E',
  onPrimary: '#000000',
  onSecondary: '#000000',
  onBackground: '#FFFFFF',
  onSurface: '#FFFFFF',
  success: '#30D158',
  warning: '#FF9F0A',
  error: '#FF453A',
  info: '#0A84FF',
  accent: '#BF5AF2',
  disabled: '#48484A',
  placeholder: '#8E8E93',
  border: '#38383A',
  shadow: 'rgba(0, 0, 0, 0.3)',
  gradientStart: '#0A84FF',
  gradientEnd: '#64D2FF',
};

// Seasonal Themes
const SeasonalThemes: Record<SeasonType, SeasonalTheme> = {
  spring: {
    colors: {
      ...LightTheme,
      primary: '#32D74B',
      secondary: '#5AC8FA',
      accent: '#FF9500',
      gradientStart: '#32D74B',
      gradientEnd: '#5AC8FA',
    },
    gradients: {
      primary: ['#32D74B', '#5AC8FA'],
      secondary: ['#5AC8FA', '#AF52DE'],
      accent: ['#FF9500', '#FF3B30'],
      background: ['#F0FFF0', '#E6F7FF'],
      surface: ['#FFFFFF', '#F0FFF0'],
      success: ['#32D74B', '#30D158'],
      warning: ['#FF9500', '#FFCC02'],
      error: ['#FF3B30', '#FF6B6B'],
      info: ['#007AFF', '#5AC8FA'],
      mesh: ['#32D74B', '#5AC8FA', '#FF9500', '#AF52DE'],
    },
    animations: {
      particles: true,
      backgroundEffects: true,
      seasonalElements: true,
    },
  },
  summer: {
    colors: {
      ...LightTheme,
      primary: '#FF9500',
      secondary: '#FFCC02',
      accent: '#FF3B30',
      gradientStart: '#FF9500',
      gradientEnd: '#FFCC02',
    },
    gradients: {
      primary: ['#FF9500', '#FFCC02'],
      secondary: ['#FFCC02', '#FF3B30'],
      accent: ['#FF3B30', '#AF52DE'],
      background: ['#FFF8E1', '#FFECB3'],
      surface: ['#FFFFFF', '#FFF8E1'],
      success: ['#32D74B', '#30D158'],
      warning: ['#FF9500', '#FFCC02'],
      error: ['#FF3B30', '#FF6B6B'],
      info: ['#007AFF', '#5AC8FA'],
      mesh: ['#FF9500', '#FFCC02', '#FF3B30', '#AF52DE'],
    },
    animations: {
      particles: true,
      backgroundEffects: true,
      seasonalElements: true,
    },
  },
  fall: {
    colors: {
      ...LightTheme,
      primary: '#D2691E',
      secondary: '#CD853F',
      accent: '#FF6347',
      gradientStart: '#D2691E',
      gradientEnd: '#CD853F',
    },
    gradients: {
      primary: ['#D2691E', '#CD853F'],
      secondary: ['#CD853F', '#FF6347'],
      accent: ['#FF6347', '#B22222'],
      background: ['#FFF5EE', '#F4E4BC'],
      surface: ['#FFFFFF', '#FFF5EE'],
      success: ['#32D74B', '#30D158'],
      warning: ['#FF9500', '#FFCC02'],
      error: ['#FF3B30', '#FF6B6B'],
      info: ['#007AFF', '#5AC8FA'],
      mesh: ['#D2691E', '#CD853F', '#FF6347', '#B22222'],
    },
    animations: {
      particles: true,
      backgroundEffects: true,
      seasonalElements: true,
    },
  },
  winter: {
    colors: {
      ...DarkTheme,
      primary: '#87CEEB',
      secondary: '#B0E0E6',
      accent: '#4682B4',
      gradientStart: '#87CEEB',
      gradientEnd: '#B0E0E6',
    },
    gradients: {
      primary: ['#87CEEB', '#B0E0E6'],
      secondary: ['#B0E0E6', '#4682B4'],
      accent: ['#4682B4', '#2F4F4F'],
      background: ['#000080', '#191970'],
      surface: ['#1C1C1E', '#000080'],
      success: ['#32D74B', '#30D158'],
      warning: ['#FF9500', '#FFCC02'],
      error: ['#FF3B30', '#FF6B6B'],
      info: ['#007AFF', '#5AC8FA'],
      mesh: ['#87CEEB', '#B0E0E6', '#4682B4', '#2F4F4F'],
    },
    animations: {
      particles: true,
      backgroundEffects: true,
      seasonalElements: true,
    },
  },
};

export class DynamicThemeSystem {
  private static instance: DynamicThemeSystem;
  private currentTheme: ThemeColors = LightTheme;
  private currentMode: ThemeMode = 'auto';
  private currentSeason: SeasonType | null = null;
  private transitionProgress = new Animated.Value(1);
  private colorAnimations: Map<string, Animated.Value> = new Map();
  private listeners: Array<(theme: ThemeColors) => void> = [];
  private timeBasedTimer: NodeJS.Timeout | null = null;

  public static getInstance(): DynamicThemeSystem {
    if (!DynamicThemeSystem.instance) {
      DynamicThemeSystem.instance = new DynamicThemeSystem();
    }
    return DynamicThemeSystem.instance;
  }

  constructor() {
    this.initializeColorAnimations();
    this.setupSystemListeners();
    this.startTimeBasedThemes();
  }

  /**
   * Initialize animated values for all color properties
   */
  private initializeColorAnimations(): void {
    Object.keys(LightTheme).forEach(key => {
      this.colorAnimations.set(key, new Animated.Value(0));
    });
  }

  /**
   * Setup system appearance and state listeners
   */
  private setupSystemListeners(): void {
    // Listen to system appearance changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (this.currentMode === 'auto') {
        this.setTheme(colorScheme === 'dark' ? 'dark' : 'light', true);
      }
    });

    // Listen to app state changes for time-based themes
    AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        this.updateTimeBasedTheme();
      }
    });
  }

  /**
   * Start time-based theme updates
   */
  private startTimeBasedThemes(): void {
    this.updateTimeBasedTheme();
    
    // Update every hour
    this.timeBasedTimer = setInterval(() => {
      this.updateTimeBasedTheme();
    }, 60 * 60 * 1000);
  }

  /**
   * Update theme based on current time
   */
  private updateTimeBasedTheme(): void {
    const now = new Date();
    const hour = now.getHours();
    const month = now.getMonth();

    // Determine season
    let season: SeasonType;
    if (month >= 2 && month <= 4) season = 'spring';
    else if (month >= 5 && month <= 7) season = 'summer';
    else if (month >= 8 && month <= 10) season = 'fall';
    else season = 'winter';

    // Determine time-based theme adjustments
    let timeAdjustment = 0;
    if (hour >= 6 && hour < 12) {
      // Morning - brighter themes
      timeAdjustment = 0.1;
    } else if (hour >= 18 || hour < 6) {
      // Evening/Night - darker themes
      timeAdjustment = -0.2;
    }

    // Apply seasonal theme if enabled
    if (this.currentSeason !== season) {
      this.setSeason(season);
    }
  }

  /**
   * Set theme mode with smooth transition
   */
  setTheme(mode: ThemeMode, animate: boolean = true): void {
    this.currentMode = mode;
    
    let targetTheme: ThemeColors;
    
    switch (mode) {
      case 'dark':
        targetTheme = DarkTheme;
        break;
      case 'light':
        targetTheme = LightTheme;
        break;
      case 'auto':
        const systemScheme = Appearance.getColorScheme();
        targetTheme = systemScheme === 'dark' ? DarkTheme : LightTheme;
        break;
      default:
        targetTheme = this.currentTheme;
    }

    this.transitionToTheme(targetTheme, animate);
  }

  /**
   * Set seasonal theme
   */
  setSeason(season: SeasonType, animate: boolean = true): void {
    this.currentSeason = season;
    const seasonalTheme = SeasonalThemes[season];
    this.transitionToTheme(seasonalTheme.colors, animate);
  }

  /**
   * Create custom theme
   */
  createCustomTheme(colors: Partial<ThemeColors>): ThemeColors {
    return {
      ...this.currentTheme,
      ...colors,
    };
  }

  /**
   * Transition to new theme with animation
   */
  private transitionToTheme(newTheme: ThemeColors, animate: boolean = true): void {
    const oldTheme = this.currentTheme;
    
    if (!animate) {
      this.currentTheme = newTheme;
      this.notifyListeners();
      return;
    }

    // Create transition animation
    const transitionAnimation = AnimationSystem.createTiming(
      this.transitionProgress,
      0,
      {
        duration: 800,
        easing: CustomEasing.smooth,
      }
    );

    // Animate color transitions
    const colorTransitions: Animated.CompositeAnimation[] = [];
    
    Object.keys(newTheme).forEach(key => {
      const animatedValue = this.colorAnimations.get(key);
      if (animatedValue) {
        colorTransitions.push(
          AnimationSystem.createTiming(animatedValue, 1, {
            duration: 800,
            easing: CustomEasing.smooth,
          })
        );
      }
    });

    // Run animations in parallel
    AnimationSystem.createParallel([
      transitionAnimation,
      ...colorTransitions,
    ]).start(() => {
      // Update theme after animation completes
      this.currentTheme = newTheme;
      this.transitionProgress.setValue(1);
      this.colorAnimations.forEach(value => value.setValue(0));
      this.notifyListeners();
    });

    // Update theme immediately for immediate UI updates
    this.currentTheme = newTheme;
    this.notifyListeners();
  }

  /**
   * Get current theme
   */
  getCurrentTheme(): ThemeColors {
    return this.currentTheme;
  }

  /**
   * Get current gradients
   */
  getCurrentGradients(): ThemeGradients {
    if (this.currentSeason) {
      return SeasonalThemes[this.currentSeason].gradients;
    }

    return {
      primary: [this.currentTheme.primary, this.currentTheme.primaryVariant],
      secondary: [this.currentTheme.secondary, this.currentTheme.secondaryVariant],
      accent: [this.currentTheme.accent, this.currentTheme.primary],
      background: [this.currentTheme.background, this.currentTheme.surface],
      surface: [this.currentTheme.surface, this.currentTheme.surfaceVariant],
      success: [this.currentTheme.success, '#2ECC71'],
      warning: [this.currentTheme.warning, '#F39C12'],
      error: [this.currentTheme.error, '#E74C3C'],
      info: [this.currentTheme.info, '#3498DB'],
      mesh: [
        this.currentTheme.primary,
        this.currentTheme.secondary,
        this.currentTheme.accent,
        this.currentTheme.success,
      ],
    };
  }

  /**
   * Get animated color value
   */
  getAnimatedColor(colorKey: keyof ThemeColors): Animated.AnimatedInterpolation {
    const animatedValue = this.colorAnimations.get(colorKey);
    if (!animatedValue) {
      return new Animated.Value(0);
    }

    return animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [this.currentTheme[colorKey], this.currentTheme[colorKey]],
      extrapolate: 'clamp',
    });
  }

  /**
   * Add theme change listener
   */
  addListener(listener: (theme: ThemeColors) => void): () => void {
    this.listeners.push(listener);
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of theme change
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentTheme);
      } catch (error) {
        EventLogger.warn('DynamicThemeSystem', '[DynamicThemeSystem] Error in theme listener:', error);
      }
    });
  }

  /**
   * Get theme transition progress
   */
  getTransitionProgress(): Animated.Value {
    return this.transitionProgress;
  }

  /**
   * Check if seasonal themes are enabled
   */
  isSeasonalThemeActive(): boolean {
    return this.currentSeason !== null;
  }

  /**
   * Disable seasonal themes
   */
  disableSeasonalThemes(): void {
    this.currentSeason = null;
    this.setTheme(this.currentMode);
  }

  /**
   * Get theme for time of day
   */
  getTimeBasedAdjustment(): number {
    const hour = new Date().getHours();
    
    if (hour >= 6 && hour < 10) {
      return 0.1; // Morning brightness
    } else if (hour >= 10 && hour < 16) {
      return 0; // Day normal
    } else if (hour >= 16 && hour < 20) {
      return -0.05; // Evening slight dimming
    } else {
      return -0.2; // Night dimming
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.timeBasedTimer) {
      clearInterval(this.timeBasedTimer);
    }
    this.listeners.length = 0;
    this.colorAnimations.clear();
  }
}

export default DynamicThemeSystem;