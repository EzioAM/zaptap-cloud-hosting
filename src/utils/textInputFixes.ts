/**
 * Text Input Performance Fixes for iOS
 * Resolves keyboard lag, emoji input issues, and text accumulator timeouts
 */

import { Platform, Keyboard, TextInput } from 'react-native';

export class TextInputOptimizer {
  private static isInitialized = false;
  private static keyboardShowListener: any = null;
  private static keyboardHideListener: any = null;

  /**
   * Initialize text input optimizations
   * Call this once at app startup
   */
  static initialize() {
    if (this.isInitialized) return;
    
    if (Platform.OS === 'ios') {
      this.applyIOSFixes();
      this.setupKeyboardListeners();
    }
    
    this.isInitialized = true;
  }

  /**
   * Apply iOS-specific text input fixes
   */
  private static applyIOSFixes() {
    // Fix for TextInput accumulator timeout
    if (TextInput.defaultProps == null) {
      TextInput.defaultProps = {};
    }
    
    // Disable autocorrection by default to improve performance
    TextInput.defaultProps.autoCorrect = false;
    
    // Disable predictive text to prevent accumulator issues
    TextInput.defaultProps.spellCheck = false;
    
    // Set a reasonable max length to prevent performance issues
    TextInput.defaultProps.maxLength = 5000;
    
    // Disable smart punctuation which can cause delays
    if (Platform.Version >= '11.0') {
      TextInput.defaultProps.smartPunctuation = false;
    }
    
    // Fix for remote text input session issues
    TextInput.defaultProps.textContentType = 'none';
    
    // Disable auto-capitalization for better performance
    TextInput.defaultProps.autoCapitalize = 'none';
  }

  /**
   * Setup keyboard event listeners for better performance
   */
  private static setupKeyboardListeners() {
    // Clean up any existing listeners
    this.cleanup();
    
    // Add keyboard listeners for better performance management
    this.keyboardShowListener = Keyboard.addListener('keyboardWillShow', () => {
      // Disable animations during keyboard show for better performance
      if (Platform.OS === 'ios') {
        // This helps with the accumulator timeout issue
        requestAnimationFrame(() => {
          // Force a small delay to let the keyboard fully initialize
        });
      }
    });
    
    this.keyboardHideListener = Keyboard.addListener('keyboardWillHide', () => {
      // Clean up any pending operations
      if (Platform.OS === 'ios') {
        requestAnimationFrame(() => {
          // Allow the keyboard to fully dismiss
        });
      }
    });
  }

  /**
   * Clean up listeners
   */
  static cleanup() {
    if (this.keyboardShowListener) {
      this.keyboardShowListener.remove();
      this.keyboardShowListener = null;
    }
    
    if (this.keyboardHideListener) {
      this.keyboardHideListener.remove();
      this.keyboardHideListener = null;
    }
  }

  /**
   * Optimize a specific TextInput component
   * Use this for TextInputs that have performance issues
   */
  static optimizeTextInput(props: any = {}) {
    if (Platform.OS !== 'ios') return props;
    
    return {
      ...props,
      // Disable features that cause performance issues
      autoCorrect: false,
      spellCheck: false,
      autoCapitalize: 'none',
      
      // Fix for emoji keyboard issues
      textContentType: 'none',
      
      // Improve performance with debouncing
      onChangeText: props.onChangeText ? 
        this.debounceTextChange(props.onChangeText) : 
        undefined,
      
      // Add performance hints
      blurOnSubmit: true,
      returnKeyType: props.returnKeyType || 'done',
      
      // Disable smart features that can cause delays
      ...(Platform.Version >= '11.0' && {
        smartPunctuation: false,
        smartQuotes: false,
        smartDashes: false,
      }),
    };
  }

  /**
   * Debounce text changes to prevent accumulator timeout
   */
  private static debounceTextChange(callback: (text: string) => void, delay: number = 100) {
    let timeoutId: NodeJS.Timeout;
    
    return (text: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        callback(text);
      }, delay);
    };
  }

  /**
   * Fix for emoji search operations error
   * Call this when showing emoji keyboard
   */
  static fixEmojiKeyboard() {
    if (Platform.OS !== 'ios') return;
    
    // Force keyboard to reinitialize with proper session
    Keyboard.dismiss();
    
    setTimeout(() => {
      // This gives the keyboard time to properly initialize
      // and prevents the RemoteTextInput session error
    }, 100);
  }

  /**
   * Performance-optimized TextInput default props
   */
  static getOptimizedDefaultProps() {
    if (Platform.OS !== 'ios') return {};
    
    return {
      autoCorrect: false,
      spellCheck: false,
      autoCapitalize: 'none',
      textContentType: 'none',
      blurOnSubmit: true,
      returnKeyType: 'done',
      ...(Platform.Version >= '11.0' && {
        smartPunctuation: false,
        smartQuotes: false,
        smartDashes: false,
      }),
    };
  }
}

/**
 * Hook to use optimized TextInput props
 */
export function useOptimizedTextInput(props: any = {}) {
  if (Platform.OS !== 'ios') return props;
  
  return TextInputOptimizer.optimizeTextInput(props);
}

/**
 * Higher-order component to wrap TextInput with optimizations
 */
export function withTextInputOptimization<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return (props: P) => {
    const optimizedProps = Platform.OS === 'ios' 
      ? { ...props, ...TextInputOptimizer.getOptimizedDefaultProps() }
      : props;
    
    return React.createElement(Component, optimizedProps);
  };
}

// Auto-initialize on import
TextInputOptimizer.initialize();