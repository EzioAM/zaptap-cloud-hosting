/**
 * Themed Input Component
 * Material Design 3 compliant input with full accessibility support
 */

import React, { useState, forwardRef } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeTheme } from '../common/ThemeFallbackWrapper';
import { useOptimizedTextInput } from '../../utils/textInputFixes';

export interface ThemedInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  helperText?: string;
  errorText?: string;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  containerStyle?: any;
  inputStyle?: any;
  showPassword?: boolean;
  required?: boolean;
}

export const ThemedInput = forwardRef<TextInput, ThemedInputProps>(({
  label,
  helperText,
  errorText,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  inputStyle,
  showPassword = false,
  required = false,
  secureTextEntry,
  ...textInputProps
}, ref) => {
  const theme = useSafeTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(!secureTextEntry);

  const hasError = Boolean(errorText);
  
  const handleFocus = () => {
    setIsFocused(true);
    textInputProps.onFocus && textInputProps.onFocus({} as any);
  };

  const handleBlur = () => {
    setIsFocused(false);
    textInputProps.onBlur && textInputProps.onBlur({} as any);
  };

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  // Apply iOS text input optimizations
  const optimizedProps = useOptimizedTextInput({
    ...textInputProps,
    onFocus: handleFocus,
    onBlur: handleBlur,
    secureTextEntry: showPassword ? !isPasswordVisible : secureTextEntry,
  });

  const getInputStyles = () => {
    const baseStyles = {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: hasError ? theme.colors.error : theme.colors.outline,
      borderRadius: 8,
      paddingHorizontal: leftIcon ? 40 : 16,
      paddingVertical: 12,
      fontSize: 16,
      color: theme.colors.onSurface,
      paddingRight: rightIcon || (showPassword && secureTextEntry) ? 40 : 16,
    };
    const focusStyles = isFocused ? {
      borderColor: hasError ? theme.colors.error : theme.colors.primary,
      borderWidth: 2,
    } : {};

    return [baseStyles, focusStyles, inputStyle];
  };

  const renderLabel = () => {
    if (!label) return null;

    return (
      <Text style={[
        { 
          fontSize: 14,
          fontWeight: '500',
          color: hasError ? theme.colors.error : theme.colors.onSurfaceVariant,
          marginBottom: 4,
        }
      ]}>
        {label}
        {required && (
          <Text style={{ color: theme.colors.error }}> *</Text>
        )}
      </Text>
    );
  };

  const renderHelperText = () => {
    const text = errorText || helperText;
    if (!text) return null;

    return (
      <Text style={[
        {
          fontSize: 12,
          color: hasError ? theme.colors.error : theme.colors.onSurfaceVariant,
          marginTop: 4,
        }
      ]}>
        {text}
      </Text>
    );
  };

  const renderLeftIcon = () => {
    if (!leftIcon) return null;

    return (
      <MaterialCommunityIcons
        name={leftIcon as any}
        size={20}
        color={theme.colors.onSurfaceVariant || theme.colors.onSurface}
        style={styles.leftIcon}
      />
    );
  };

  const renderRightIcon = () => {
    if (showPassword && secureTextEntry) {
      return (
        <TouchableOpacity
          onPress={togglePasswordVisibility}
          style={styles.rightIconContainer}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
        >
          <MaterialCommunityIcons
            name={isPasswordVisible ? 'eye-off' : 'eye'}
            size={20}
            color={theme.colors.onSurfaceVariant || theme.colors.onSurface}
          />
        </TouchableOpacity>
      );
    }

    if (!rightIcon) return null;

    const IconComponent = onRightIconPress ? TouchableOpacity : View;

    return (
      <IconComponent
        onPress={onRightIconPress}
        style={styles.rightIconContainer}
        hitSlop={onRightIconPress ? { top: 10, bottom: 10, left: 10, right: 10 } : undefined}
        accessibilityRole={onRightIconPress ? 'button' : undefined}
      >
        <MaterialCommunityIcons
          name={rightIcon as any}
          size={20}
          color={theme.colors.onSurfaceVariant || theme.colors.onSurface}
        />
      </IconComponent>
    );
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {renderLabel()}
      
      <View style={styles.inputContainer}>
        {renderLeftIcon()}
        
        <TextInput
          ref={ref}
          style={[getInputStyles(), styles.input]}
          placeholderTextColor={theme.colors.onSurfaceVariant || theme.colors.onSurface}
          accessibilityLabel={label}
          accessibilityHint={helperText}
          accessibilityRequired={required}
          {...optimizedProps}
        />
        
        {renderRightIcon()}
      </View>
      
      {renderHelperText()}
    </View>
  );
});

ThemedInput.displayName = 'ThemedInput';

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  input: {
    flex: 1,
  },
  leftIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  rightIconContainer: {
    position: 'absolute',
    right: 12,
    zIndex: 1,
    padding: 4,
  },
});