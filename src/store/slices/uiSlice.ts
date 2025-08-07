/**
 * uiSlice.ts
 * Redux slice for managing UI state and interactions
 * Features: navigation, modals, toasts, loading states, themes
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ThemeMode } from '../../types';

// UI state interfaces
export interface Modal {
  id: string;
  type: string;
  title?: string;
  content?: string;
  props?: Record<string, any>;
  persistent?: boolean;
  onConfirm?: string; // Action type to dispatch on confirm
  onCancel?: string; // Action type to dispatch on cancel
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onPress: string; // Action type to dispatch
  };
  persistent?: boolean;
}

export interface LoadingOverlay {
  id: string;
  message?: string;
  progress?: number;
  cancellable?: boolean;
  onCancel?: string; // Action type to dispatch on cancel
}

export interface UIState {
  // Theme and appearance
  theme: {
    mode: ThemeMode;
    isDarkMode: boolean;
    systemThemeDetected: boolean;
    customColors?: Record<string, string>;
  };
  
  // Navigation state
  navigation: {
    currentRoute: string | null;
    previousRoute: string | null;
    canGoBack: boolean;
    tabBarVisible: boolean;
    headerVisible: boolean;
  };
  
  // Modal management
  modals: Modal[];
  activeModalId: string | null;
  
  // Toast notifications
  toasts: Toast[];
  maxToasts: number;
  
  // Loading states
  globalLoading: boolean;
  loadingOverlays: LoadingOverlay[];
  
  // Screen-specific loading states
  screenLoading: Record<string, boolean>;
  
  // Form states
  forms: Record<string, {
    isDirty: boolean;
    isSubmitting: boolean;
    validationErrors: Record<string, string>;
    values: Record<string, any>;
  }>;
  
  // Keyboard state
  keyboard: {
    isVisible: boolean;
    height: number;
  };
  
  // Scroll states for screens
  scrollStates: Record<string, {
    scrollY: number;
    isScrolling: boolean;
    reachedTop: boolean;
    reachedBottom: boolean;
  }>;
  
  // Pull-to-refresh states
  refreshStates: Record<string, {
    isRefreshing: boolean;
    lastRefresh: string | null;
  }>;
  
  // Search states
  searchStates: Record<string, {
    query: string;
    isSearching: boolean;
    results: any[];
    filters: Record<string, any>;
  }>;
  
  // Selection states (for multi-select interfaces)
  selections: Record<string, {
    selectedItems: string[];
    isSelectionMode: boolean;
    selectAll: boolean;
  }>;
  
  // Onboarding and help
  onboarding: {
    isFirstLaunch: boolean;
    completedSteps: string[];
    currentStep: string | null;
    showHints: boolean;
  };
  
  // Accessibility settings
  accessibility: {
    reduceMotion: boolean;
    highContrast: boolean;
    fontSize: 'small' | 'medium' | 'large' | 'xlarge';
    voiceOverEnabled: boolean;
  };
  
  // Performance monitoring
  performance: {
    enableMetrics: boolean;
    slowFrameThreshold: number;
    trackNetworkRequests: boolean;
  };
}

// Initial state
const initialState: UIState = {
  theme: {
    mode: 'system',
    isDarkMode: false,
    systemThemeDetected: false,
  },
  navigation: {
    currentRoute: null,
    previousRoute: null,
    canGoBack: false,
    tabBarVisible: true,
    headerVisible: true,
  },
  modals: [],
  activeModalId: null,
  toasts: [],
  maxToasts: 3,
  globalLoading: false,
  loadingOverlays: [],
  screenLoading: {},
  forms: {},
  keyboard: {
    isVisible: false,
    height: 0,
  },
  scrollStates: {},
  refreshStates: {},
  searchStates: {},
  selections: {},
  onboarding: {
    isFirstLaunch: true,
    completedSteps: [],
    currentStep: null,
    showHints: true,
  },
  accessibility: {
    reduceMotion: false,
    highContrast: false,
    fontSize: 'medium',
    voiceOverEnabled: false,
  },
  performance: {
    enableMetrics: __DEV__,
    slowFrameThreshold: 16.67, // 60fps threshold
    trackNetworkRequests: __DEV__,
  },
};

// UI slice
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Theme management
    setThemeMode: (state, action: PayloadAction<ThemeMode>) => {
      state.theme.mode = action.payload;
    },
    
    setDarkMode: (state, action: PayloadAction<boolean>) => {
      state.theme.isDarkMode = action.payload;
    },
    
    setSystemThemeDetected: (state, action: PayloadAction<boolean>) => {
      state.theme.systemThemeDetected = action.payload;
    },
    
    setCustomColors: (state, action: PayloadAction<Record<string, string>>) => {
      state.theme.customColors = action.payload;
    },
    
    // Navigation management
    setCurrentRoute: (state, action: PayloadAction<string>) => {
      state.navigation.previousRoute = state.navigation.currentRoute;
      state.navigation.currentRoute = action.payload;
    },
    
    setCanGoBack: (state, action: PayloadAction<boolean>) => {
      state.navigation.canGoBack = action.payload;
    },
    
    setTabBarVisible: (state, action: PayloadAction<boolean>) => {
      state.navigation.tabBarVisible = action.payload;
    },
    
    setHeaderVisible: (state, action: PayloadAction<boolean>) => {
      state.navigation.headerVisible = action.payload;
    },
    
    // Modal management
    showModal: (state, action: PayloadAction<Omit<Modal, 'id'> & { id?: string }>) => {
      const modal: Modal = {
        id: action.payload.id || Date.now().toString(),
        ...action.payload,
      };
      state.modals.push(modal);
      state.activeModalId = modal.id;
    },
    
    hideModal: (state, action: PayloadAction<string | undefined>) => {
      const modalId = action.payload || state.activeModalId;
      if (modalId) {
        state.modals = state.modals.filter(m => m.id !== modalId);
        // Set active modal to the last remaining modal
        state.activeModalId = state.modals.length > 0 ? state.modals[state.modals.length - 1].id : null;
      }
    },
    
    hideAllModals: (state) => {
      state.modals = [];
      state.activeModalId = null;
    },
    
    // Toast management
    showToast: (state, action: PayloadAction<Omit<Toast, 'id'> & { id?: string }>) => {
      const toast: Toast = {
        id: action.payload.id || Date.now().toString(),
        duration: action.payload.duration || 4000,
        ...action.payload,
      };
      
      state.toasts.push(toast);
      
      // Limit number of toasts
      if (state.toasts.length > state.maxToasts) {
        state.toasts = state.toasts.slice(-state.maxToasts);
      }
    },
    
    hideToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter(t => t.id !== action.payload);
    },
    
    hideAllToasts: (state) => {
      state.toasts = [];
    },
    
    // Loading management
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.globalLoading = action.payload;
    },
    
    showLoadingOverlay: (state, action: PayloadAction<Omit<LoadingOverlay, 'id'> & { id?: string }>) => {
      const overlay: LoadingOverlay = {
        id: action.payload.id || Date.now().toString(),
        ...action.payload,
      };
      state.loadingOverlays.push(overlay);
    },
    
    hideLoadingOverlay: (state, action: PayloadAction<string>) => {
      state.loadingOverlays = state.loadingOverlays.filter(o => o.id !== action.payload);
    },
    
    updateLoadingOverlay: (state, action: PayloadAction<{ id: string; updates: Partial<LoadingOverlay> }>) => {
      const overlay = state.loadingOverlays.find(o => o.id === action.payload.id);
      if (overlay) {
        Object.assign(overlay, action.payload.updates);
      }
    },
    
    setScreenLoading: (state, action: PayloadAction<{ screen: string; isLoading: boolean }>) => {
      state.screenLoading[action.payload.screen] = action.payload.isLoading;
    },
    
    // Form management
    initializeForm: (state, action: PayloadAction<{ formId: string; initialValues?: Record<string, any> }>) => {
      state.forms[action.payload.formId] = {
        isDirty: false,
        isSubmitting: false,
        validationErrors: {},
        values: action.payload.initialValues || {},
      };
    },
    
    updateFormField: (state, action: PayloadAction<{ formId: string; field: string; value: any }>) => {
      const form = state.forms[action.payload.formId];
      if (form) {
        form.values[action.payload.field] = action.payload.value;
        form.isDirty = true;
      }
    },
    
    setFormSubmitting: (state, action: PayloadAction<{ formId: string; isSubmitting: boolean }>) => {
      const form = state.forms[action.payload.formId];
      if (form) {
        form.isSubmitting = action.payload.isSubmitting;
      }
    },
    
    setFormValidationErrors: (state, action: PayloadAction<{ formId: string; errors: Record<string, string> }>) => {
      const form = state.forms[action.payload.formId];
      if (form) {
        form.validationErrors = action.payload.errors;
      }
    },
    
    clearFormErrors: (state, action: PayloadAction<string>) => {
      const form = state.forms[action.payload];
      if (form) {
        form.validationErrors = {};
      }
    },
    
    resetForm: (state, action: PayloadAction<string>) => {
      delete state.forms[action.payload];
    },
    
    // Keyboard management
    setKeyboardVisible: (state, action: PayloadAction<{ isVisible: boolean; height?: number }>) => {
      state.keyboard.isVisible = action.payload.isVisible;
      if (action.payload.height !== undefined) {
        state.keyboard.height = action.payload.height;
      }
    },
    
    // Scroll state management
    updateScrollState: (state, action: PayloadAction<{ screen: string; updates: Partial<UIState['scrollStates'][string]> }>) => {
      const currentState = state.scrollStates[action.payload.screen] || {
        scrollY: 0,
        isScrolling: false,
        reachedTop: true,
        reachedBottom: false,
      };
      state.scrollStates[action.payload.screen] = { ...currentState, ...action.payload.updates };
    },
    
    // Refresh state management
    setRefreshState: (state, action: PayloadAction<{ screen: string; isRefreshing: boolean }>) => {
      const currentState = state.refreshStates[action.payload.screen] || { isRefreshing: false, lastRefresh: null };
      state.refreshStates[action.payload.screen] = {
        ...currentState,
        isRefreshing: action.payload.isRefreshing,
        lastRefresh: action.payload.isRefreshing ? null : new Date().toISOString(),
      };
    },
    
    // Search state management
    updateSearchState: (state, action: PayloadAction<{ screen: string; updates: Partial<UIState['searchStates'][string]> }>) => {
      const currentState = state.searchStates[action.payload.screen] || {
        query: '',
        isSearching: false,
        results: [],
        filters: {},
      };
      state.searchStates[action.payload.screen] = { ...currentState, ...action.payload.updates };
    },
    
    clearSearchState: (state, action: PayloadAction<string>) => {
      delete state.searchStates[action.payload];
    },
    
    // Selection state management
    updateSelectionState: (state, action: PayloadAction<{ screen: string; updates: Partial<UIState['selections'][string]> }>) => {
      const currentState = state.selections[action.payload.screen] || {
        selectedItems: [],
        isSelectionMode: false,
        selectAll: false,
      };
      state.selections[action.payload.screen] = { ...currentState, ...action.payload.updates };
    },
    
    clearSelectionState: (state, action: PayloadAction<string>) => {
      delete state.selections[action.payload];
    },
    
    // Onboarding management
    completeOnboardingStep: (state, action: PayloadAction<string>) => {
      if (!state.onboarding.completedSteps.includes(action.payload)) {
        state.onboarding.completedSteps.push(action.payload);
      }
    },
    
    setCurrentOnboardingStep: (state, action: PayloadAction<string | null>) => {
      state.onboarding.currentStep = action.payload;
    },
    
    setFirstLaunch: (state, action: PayloadAction<boolean>) => {
      state.onboarding.isFirstLaunch = action.payload;
    },
    
    setShowHints: (state, action: PayloadAction<boolean>) => {
      state.onboarding.showHints = action.payload;
    },
    
    // Accessibility management
    updateAccessibilitySettings: (state, action: PayloadAction<Partial<UIState['accessibility']>>) => {
      state.accessibility = { ...state.accessibility, ...action.payload };
    },
    
    // Performance management
    updatePerformanceSettings: (state, action: PayloadAction<Partial<UIState['performance']>>) => {
      state.performance = { ...state.performance, ...action.payload };
    },
    
    // Reset UI state
    resetUIState: () => {
      return initialState;
    },
  },
});

// Export actions
export const {
  setThemeMode,
  setDarkMode,
  setSystemThemeDetected,
  setCustomColors,
  setCurrentRoute,
  setCanGoBack,
  setTabBarVisible,
  setHeaderVisible,
  showModal,
  hideModal,
  hideAllModals,
  showToast,
  hideToast,
  hideAllToasts,
  setGlobalLoading,
  showLoadingOverlay,
  hideLoadingOverlay,
  updateLoadingOverlay,
  setScreenLoading,
  initializeForm,
  updateFormField,
  setFormSubmitting,
  setFormValidationErrors,
  clearFormErrors,
  resetForm,
  setKeyboardVisible,
  updateScrollState,
  setRefreshState,
  updateSearchState,
  clearSearchState,
  updateSelectionState,
  clearSelectionState,
  completeOnboardingStep,
  setCurrentOnboardingStep,
  setFirstLaunch,
  setShowHints,
  updateAccessibilitySettings,
  updatePerformanceSettings,
  resetUIState,
} = uiSlice.actions;

// Selectors
export const selectTheme = (state: { ui: UIState }) => state.ui.theme;
export const selectNavigation = (state: { ui: UIState }) => state.ui.navigation;
export const selectModals = (state: { ui: UIState }) => state.ui.modals;
export const selectActiveModal = (state: { ui: UIState }) => 
  state.ui.modals.find(m => m.id === state.ui.activeModalId) || null;
export const selectToasts = (state: { ui: UIState }) => state.ui.toasts;
export const selectGlobalLoading = (state: { ui: UIState }) => state.ui.globalLoading;
export const selectLoadingOverlays = (state: { ui: UIState }) => state.ui.loadingOverlays;
export const selectScreenLoading = (screen: string) => (state: { ui: UIState }) => 
  state.ui.screenLoading[screen] || false;
export const selectForm = (formId: string) => (state: { ui: UIState }) => 
  state.ui.forms[formId] || null;
export const selectKeyboard = (state: { ui: UIState }) => state.ui.keyboard;
export const selectScrollState = (screen: string) => (state: { ui: UIState }) => 
  state.ui.scrollStates[screen] || null;
export const selectRefreshState = (screen: string) => (state: { ui: UIState }) => 
  state.ui.refreshStates[screen] || null;
export const selectSearchState = (screen: string) => (state: { ui: UIState }) => 
  state.ui.searchStates[screen] || null;
export const selectSelectionState = (screen: string) => (state: { ui: UIState }) => 
  state.ui.selections[screen] || null;
export const selectOnboarding = (state: { ui: UIState }) => state.ui.onboarding;
export const selectAccessibility = (state: { ui: UIState }) => state.ui.accessibility;
export const selectPerformance = (state: { ui: UIState }) => state.ui.performance;

// Export reducer
export default uiSlice.reducer;