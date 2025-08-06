/**
import { EventLogger } from '../EventLogger';
 * Visual Polish System - Main Integration Layer
 * Exports all visual polish components and utilities for easy consumption
 */

// Core Animation System
export {
  AnimationSystem,
  SpringPresets,
  CustomEasing,
} from './AnimationSystem';

// Page Transitions
export {
  PageTransitionOrchestrator,
  TransitionType,
  TransitionConfig,
} from './PageTransitionOrchestrator';

// Dynamic Theme System
export {
  DynamicThemeSystem,
  ThemeColors,
  ThemeGradients,
  SeasonalTheme,
  ThemeMode,
  SeasonType,
} from './DynamicThemeSystem';

// Premium Effects
export {
  PremiumEffectsController,
  GlassmorphismEffect,
  MeshGradientEffect,
  NeumorphismEffect,
  Transform3DEffect,
  ParticleEffect,
  EffectPresets,
  GlassmorphismConfig,
  MeshGradientConfig,
  NeumorphismConfig,
  Transform3DConfig,
  ParticleConfig,
} from './PremiumEffects';

// Motion Design System
export {
  MotionDesignSystem,
  MotionTokens,
  MotionCategories,
  GestureVelocityMatcher,
  InterruptibleAnimationManager,
  PhysicsScrollEnhancer,
} from './MotionDesignSystem';

// Accessibility
export {
  AccessibilityManager,
  AccessibilityPreferences,
  AccessibleMotionConfigs,
  useAccessibility,
} from './AccessibilityEnhancements';

// Main Visual Polish Controller
export class VisualPolishSystem {
  private static instance: VisualPolishSystem;
  private animationSystem: typeof AnimationSystem;
  private transitionOrchestrator: typeof PageTransitionOrchestrator;
  private themeSystem: DynamicThemeSystem;
  private premiumEffects: PremiumEffectsController;
  private motionSystem: MotionDesignSystem;
  private accessibilityManager: AccessibilityManager;
  private isInitialized: boolean = false;

  public static getInstance(): VisualPolishSystem {
    if (!VisualPolishSystem.instance) {
      VisualPolishSystem.instance = new VisualPolishSystem();
    }
    return VisualPolishSystem.instance;
  }

  private constructor() {
    this.animationSystem = AnimationSystem;
    this.transitionOrchestrator = PageTransitionOrchestrator;
    this.themeSystem = DynamicThemeSystem.getInstance();
    this.premiumEffects = new PremiumEffectsController();
    this.motionSystem = MotionDesignSystem.getInstance();
    this.accessibilityManager = AccessibilityManager.getInstance();
  }

  /**
   * Initialize the visual polish system
   */
  async initialize(config?: {
    enableSeasonalThemes?: boolean;
    enableAccessibilityOptimizations?: boolean;
    defaultTheme?: ThemeMode;
    performanceMode?: boolean;
  }): Promise<void> {
    if (this.isInitialized) {
      EventLogger.warn('index', '[VisualPolishSystem] Already initialized');
      return;
    }

    try {
      const finalConfig = {
        enableSeasonalThemes: true,
        enableAccessibilityOptimizations: true,
        defaultTheme: 'auto' as ThemeMode,
        performanceMode: false,
        ...config,
      };

      // Initialize theme system
      this.themeSystem.setTheme(finalConfig.defaultTheme);

      // Enable seasonal themes if requested
      if (finalConfig.enableSeasonalThemes) {
        // Auto-detect season and apply
        const month = new Date().getMonth();
        let season: SeasonType;
        if (month >= 2 && month <= 4) season = 'spring';
        else if (month >= 5 && month <= 7) season = 'summer';
        else if (month >= 8 && month <= 10) season = 'fall';
        else season = 'winter';
        
        this.themeSystem.setSeason(season);
      }

      // Initialize accessibility optimizations
      if (finalConfig.enableAccessibilityOptimizations) {
        // Accessibility manager initializes itself
        EventLogger.debug('index', '[VisualPolishSystem] Accessibility optimizations enabled');
      }

      this.isInitialized = true;
      EventLogger.debug('index', '[VisualPolishSystem] Initialized successfully');
    } catch (error) {
      EventLogger.error('index', '[VisualPolishSystem] Initialization failed:', error as Error);
      throw error;
    }
  }

  /**
   * Get the animation system
   */
  getAnimationSystem(): typeof AnimationSystem {
    return this.animationSystem;
  }

  /**
   * Get the transition orchestrator
   */
  getTransitionOrchestrator(): typeof PageTransitionOrchestrator {
    return this.transitionOrchestrator;
  }

  /**
   * Get the theme system
   */
  getThemeSystem(): DynamicThemeSystem {
    return this.themeSystem;
  }

  /**
   * Get the premium effects controller
   */
  getPremiumEffects(): PremiumEffectsController {
    return this.premiumEffects;
  }

  /**
   * Get the motion design system
   */
  getMotionSystem(): MotionDesignSystem {
    return this.motionSystem;
  }

  /**
   * Get the accessibility manager
   */
  getAccessibilityManager(): AccessibilityManager {
    return this.accessibilityManager;
  }

  /**
   * Quick access to current theme
   */
  getCurrentTheme(): ThemeColors {
    return this.themeSystem.getCurrentTheme();
  }

  /**
   * Quick access to current gradients
   */
  getCurrentGradients(): ThemeGradients {
    return this.themeSystem.getCurrentGradients();
  }

  /**
   * Get accessibility preferences
   */
  getAccessibilityPreferences(): AccessibilityPreferences {
    return this.accessibilityManager.getPreferences();
  }

  /**
   * Create an accessible animation that respects user preferences
   */
  createAccessibleAnimation(
    value: Animated.Value,
    toValue: number,
    config?: {
      duration?: number;
      easing?: (value: number) => number;
      category?: keyof typeof MotionCategories;
    }
  ): Animated.CompositeAnimation {
    const category = config?.category || 'interactions';
    return this.motionSystem.createAdaptiveAnimation(value, toValue, category);
  }

  /**
   * Create a theme-aware styled component
   */
  createThemedStyles(styleGenerator: (theme: ThemeColors, gradients: ThemeGradients) => any): any {
    const theme = this.getCurrentTheme();
    const gradients = this.getCurrentGradients();
    const baseStyles = styleGenerator(theme, gradients);
    
    return this.accessibilityManager.getAccessibleStyles(baseStyles);
  }

  /**
   * Performance monitoring
   */
  getPerformanceMetrics(): {
    animations: { fps: number; frameDrops: number; efficiency: number };
    theme: { transitionsActive: boolean };
    accessibility: { optimizationsEnabled: boolean };
  } {
    return {
      animations: this.animationSystem.getPerformanceMetrics(),
      theme: {
        transitionsActive: this.themeSystem.isSeasonalThemeActive(),
      },
      accessibility: {
        optimizationsEnabled: this.accessibilityManager.getPreferences().reduceMotion,
      },
    };
  }

  /**
   * Cleanup and dispose of resources
   */
  dispose(): void {
    try {
      this.premiumEffects.dispose();
      this.motionSystem.dispose();
      this.themeSystem.dispose();
      this.accessibilityManager.dispose();
      this.transitionOrchestrator.clearAllTransitions();
      
      this.isInitialized = false;
      EventLogger.debug('index', '[VisualPolishSystem] Disposed successfully');
    } catch (error) {
      EventLogger.error('index', '[VisualPolishSystem] Disposal failed:', error as Error);
    }
  }
}

// Convenience function for quick initialization
export const initializeVisualPolish = async (config?: Parameters<VisualPolishSystem['initialize']>[0]): Promise<VisualPolishSystem> => {
  const system = VisualPolishSystem.getInstance();
  await system.initialize(config);
  return system;
};

// Default export
export default VisualPolishSystem;