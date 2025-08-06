import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventLogger } from './EventLogger';

/**
 * OnboardingManager - Manages user onboarding state and progress
 * Handles onboarding completion tracking, progress persistence, and reset functionality
 */

export interface OnboardingProgress {
  isCompleted: boolean;
  currentStep: number;
  totalSteps: number;
  hasSeenWelcome: boolean;
  hasSeenFeatures: boolean;
  hasSeenPermissions: boolean;
  hasSeenTutorial: boolean;
  completedAt?: string;
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: 'welcome' | 'features' | 'permissions' | 'tutorial' | 'ready';
  isOptional?: boolean;
}

const ONBOARDING_STORAGE_KEY = 'user_onboarding_state';
const ONBOARDING_PROGRESS_KEY = 'user_onboarding_progress';

export class OnboardingManager {
  private static instance: OnboardingManager;

  private constructor() {}

  public static getInstance(): OnboardingManager {
    if (!OnboardingManager.instance) {
      OnboardingManager.instance = new OnboardingManager();
    }
    return OnboardingManager.instance;
  }

  /**
   * Check if user has completed onboarding
   */
  public async hasCompletedOnboarding(): Promise<boolean> {
    try {
      const completed = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
      return completed === 'true';
    } catch (error) {
      EventLogger.error('Onboarding', 'Error checking onboarding completion:', error as Error);
      return false;
    }
  }

  /**
   * Mark onboarding as completed
   */
  public async markOnboardingCompleted(): Promise<void> {
    try {
      const progress: OnboardingProgress = {
        isCompleted: true,
        currentStep: 5,
        totalSteps: 5,
        hasSeenWelcome: true,
        hasSeenFeatures: true,
        hasSeenPermissions: true,
        hasSeenTutorial: true,
        completedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
      await AsyncStorage.setItem(ONBOARDING_PROGRESS_KEY, JSON.stringify(progress));
    } catch (error) {
      EventLogger.error('Onboarding', 'Error marking onboarding as completed:', error as Error);
    }
  }

  /**
   * Get current onboarding progress
   */
  public async getProgress(): Promise<OnboardingProgress> {
    try {
      const progressString = await AsyncStorage.getItem(ONBOARDING_PROGRESS_KEY);
      if (progressString) {
        return JSON.parse(progressString);
      }
    } catch (error) {
      EventLogger.error('Onboarding', 'Error getting onboarding progress:', error as Error);
    }

    // Return default progress
    return {
      isCompleted: false,
      currentStep: 0,
      totalSteps: 5,
      hasSeenWelcome: false,
      hasSeenFeatures: false,
      hasSeenPermissions: false,
      hasSeenTutorial: false,
    };
  }

  /**
   * Update onboarding progress
   */
  public async updateProgress(updates: Partial<OnboardingProgress>): Promise<void> {
    try {
      const currentProgress = await this.getProgress();
      const updatedProgress = { ...currentProgress, ...updates };
      
      await AsyncStorage.setItem(ONBOARDING_PROGRESS_KEY, JSON.stringify(updatedProgress));
    } catch (error) {
      EventLogger.error('Onboarding', 'Error updating onboarding progress:', error as Error);
    }
  }

  /**
   * Skip onboarding (mark as completed without going through steps)
   */
  public async skipOnboarding(): Promise<void> {
    await this.markOnboardingCompleted();
  }

  /**
   * Reset onboarding (useful for testing or re-onboarding)
   */
  public async resetOnboarding(): Promise<void> {
    try {
      await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
      await AsyncStorage.removeItem(ONBOARDING_PROGRESS_KEY);
    } catch (error) {
      EventLogger.error('Onboarding', 'Error resetting onboarding:', error as Error);
    }
  }

  /**
   * Check if specific onboarding step was completed
   */
  public async hasCompletedStep(step: keyof OnboardingProgress): Promise<boolean> {
    try {
      const progress = await this.getProgress();
      return Boolean(progress[step]);
    } catch (error) {
      EventLogger.error('Onboarding', 'Error checking step completion for ${step}:', error as Error);
      return false;
    }
  }

  /**
   * Mark specific step as completed
   */
  public async markStepCompleted(step: keyof OnboardingProgress): Promise<void> {
    const updates: Partial<OnboardingProgress> = {
      [step]: true,
    };

    // Update current step counter
    const progress = await this.getProgress();
    const stepMap = {
      hasSeenWelcome: 1,
      hasSeenFeatures: 2,
      hasSeenPermissions: 3,
      hasSeenTutorial: 4,
    };

    const stepNumber = stepMap[step as keyof typeof stepMap];
    if (stepNumber && stepNumber > progress.currentStep) {
      updates.currentStep = stepNumber;
    }

    await this.updateProgress(updates);
  }

  /**
   * Get predefined onboarding steps
   */
  public getOnboardingSteps(): OnboardingStep[] {
    return [
      {
        id: 'welcome',
        title: 'Welcome to ShortcutsLike',
        description: 'Automate your world with powerful workflows',
        icon: 'hand-wave',
        type: 'welcome',
      },
      {
        id: 'features',
        title: 'Powerful Features',
        description: 'Create, share, and deploy automations anywhere',
        icon: 'feature-search',
        type: 'features',
      },
      {
        id: 'permissions',
        title: 'Setup Permissions',
        description: 'Enable features for the best experience',
        icon: 'shield-check',
        type: 'permissions',
      },
      {
        id: 'tutorial',
        title: 'Quick Tutorial',
        description: 'Learn how to create your first automation',
        icon: 'school',
        type: 'tutorial',
      },
      {
        id: 'ready',
        title: 'You\'re All Set!',
        description: 'Start automating your world',
        icon: 'rocket-launch',
        type: 'ready',
      },
    ];
  }

  /**
   * Check if should show onboarding based on user state
   */
  public async shouldShowOnboarding(): Promise<boolean> {
    const isCompleted = await this.hasCompletedOnboarding();
    return !isCompleted;
  }

  /**
   * Get onboarding analytics data
   */
  public async getOnboardingAnalytics(): Promise<{
    isCompleted: boolean;
    completionRate: number;
    timeToComplete?: number;
    stepsCompleted: number;
    stepsSkipped: number;
  }> {
    const progress = await this.getProgress();
    
    const stepsCompleted = [
      progress.hasSeenWelcome,
      progress.hasSeenFeatures,
      progress.hasSeenPermissions,
      progress.hasSeenTutorial,
    ].filter(Boolean).length;

    const completionRate = (stepsCompleted / 4) * 100;

    return {
      isCompleted: progress.isCompleted,
      completionRate,
      stepsCompleted,
      stepsSkipped: 4 - stepsCompleted,
    };
  }
}

// Export singleton instance
export const onboardingManager = OnboardingManager.getInstance();