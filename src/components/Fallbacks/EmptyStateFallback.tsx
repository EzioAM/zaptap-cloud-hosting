import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { EventLogger } from '../../utils/EventLogger';

export interface EmptyStateFallbackProps {
  title?: string;
  message?: string;
  icon?: string;
  iconSize?: number;
  illustration?: any; // Image source
  primaryAction?: {
    text: string;
    onPress: () => void;
    icon?: string;
  };
  secondaryAction?: {
    text: string;
    onPress: () => void;
    icon?: string;
  };
  style?: ViewStyle;
  variant?: 'default' | 'search' | 'create' | 'error' | 'offline';
}

export const EmptyStateFallback: React.FC<EmptyStateFallbackProps> = ({
  title,
  message,
  icon,
  iconSize = 80,
  illustration,
  primaryAction,
  secondaryAction,
  style,
  variant = 'default',
}) => {
  // Get variant-specific defaults
  const getVariantDefaults = () => {
    switch (variant) {
      case 'search':
        return {
          title: 'No Results Found',
          message: 'Try adjusting your search terms or filters.',
          icon: 'magnify',
        };
      case 'create':
        return {
          title: 'Nothing Here Yet',
          message: 'Get started by creating your first item.',
          icon: 'plus-circle-outline',
        };
      case 'error':
        return {
          title: 'Unable to Load',
          message: 'Something went wrong while loading the content.',
          icon: 'alert-circle-outline',
        };
      case 'offline':
        return {
          title: 'You\'re Offline',
          message: 'This content requires an internet connection.',
          icon: 'wifi-off',
        };
      default:
        return {
          title: 'Nothing to Show',
          message: 'There\'s no content available right now.',
          icon: 'inbox-outline',
        };
    }
  };

  const defaults = getVariantDefaults();
  const finalTitle = title || defaults.title;
  const finalMessage = message || defaults.message;
  const finalIcon = icon || defaults.icon;

  const handlePrimaryAction = () => {
    if (primaryAction) {
      EventLogger.userAction('empty_state_primary_action', variant, {
        title: finalTitle,
        actionText: primaryAction.text,
      });
      primaryAction.onPress();
    }
  };

  const handleSecondaryAction = () => {
    if (secondaryAction) {
      EventLogger.userAction('empty_state_secondary_action', variant, {
        title: finalTitle,
        actionText: secondaryAction.text,
      });
      secondaryAction.onPress();
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'error':
        return '#ff5252';
      case 'offline':
        return '#ff9800';
      case 'create':
        return '#4caf50';
      case 'search':
        return '#2196f3';
      default:
        return '#9e9e9e';
    }
  };

  return (
    <View style={[styles.container, style]}>
      {illustration ? (
        <Image source={illustration} style={styles.illustration} resizeMode="contain" />
      ) : (
        <MaterialCommunityIcons 
          name={finalIcon as any} 
          size={iconSize} 
          color={getIconColor()} 
          style={styles.icon}
        />
      )}
      
      <Text style={styles.title}>{finalTitle}</Text>
      <Text style={styles.message}>{finalMessage}</Text>
      
      {(primaryAction || secondaryAction) && (
        <View style={styles.actions}>
          {primaryAction && (
            <TouchableOpacity 
              style={[styles.button, styles.primaryButton]} 
              onPress={handlePrimaryAction}
            >
              {primaryAction.icon && (
                <MaterialCommunityIcons 
                  name={primaryAction.icon as any} 
                  size={16} 
                  color="#fff" 
                />
              )}
              <Text style={styles.primaryButtonText}>{primaryAction.text}</Text>
            </TouchableOpacity>
          )}
          
          {secondaryAction && (
            <TouchableOpacity 
              style={[styles.button, styles.secondaryButton]} 
              onPress={handleSecondaryAction}
            >
              {secondaryAction.icon && (
                <MaterialCommunityIcons 
                  name={secondaryAction.icon as any} 
                  size={16} 
                  color="#6200ee" 
                />
              )}
              <Text style={styles.secondaryButtonText}>{secondaryAction.text}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f5f5f5',
  },
  illustration: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    maxWidth: 300,
  },
  actions: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    maxWidth: 300,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  primaryButton: {
    backgroundColor: '#6200ee',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#6200ee',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButtonText: {
    color: '#6200ee',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default EmptyStateFallback;