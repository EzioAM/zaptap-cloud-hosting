import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { Card } from '../../atoms/Card';
import { IconButton } from '../../atoms/IconButton';
import { Badge } from '../../atoms/Badge';
import { useSafeTheme } from '../../common/ThemeFallbackWrapper';
import { theme } from '../../../theme';
import { AutomationStep, StepType } from '../../../types';
import { useHaptic } from '../../../hooks/useHaptic';

interface StepCardProps {
  step: AutomationStep;
  index: number;
  isActive?: boolean;
  isSelected?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  onDelete?: () => void;
  readonly?: boolean;
}

const stepIcons: Record<StepType, string> = {
  notification: 'bell',
  sms: 'message-text',
  email: 'email',
  webhook: 'webhook',
  delay: 'clock',
  variable: 'variable',
  script: 'code-braces',
  condition: 'help-rhombus',
  http_request: 'cloud-upload',
  location: 'map-marker',
  weather: 'weather-partly-cloudy',
  clipboard: 'clipboard-text',
  sound: 'volume-high',
  vibration: 'vibrate',
  flashlight: 'flashlight',
  brightness: 'brightness-6',
  wifi: 'wifi',
  bluetooth: 'bluetooth',
  share: 'share-variant',
  open_app: 'application',
  close_app: 'close-box',
  calendar: 'calendar',
  reminder: 'reminder',
  contact: 'contacts',
  speak_text: 'text-to-speech',
  translate: 'translate',
  shortcut: 'apple',
};

const stepColors: Record<StepType, string> = {
  notification: '#6366F1', // Indigo
  sms: '#10B981', // Emerald
  email: '#3B82F6', // Blue
  webhook: '#8B5CF6', // Purple
  delay: '#F59E0B', // Amber
  variable: '#EC4899', // Pink
  script: '#6B7280', // Gray
  condition: '#F97316', // Orange
  http_request: '#14B8A6', // Teal
  location: '#EF4444', // Red
  weather: '#06B6D4', // Cyan
  clipboard: '#84CC16', // Lime
  sound: '#A855F7', // Purple
  vibration: '#F43F5E', // Rose
  flashlight: '#FCD34D', // Yellow
  brightness: '#FBBF24', // Yellow
  wifi: '#2563EB', // Blue
  bluetooth: '#1E40AF', // Blue
  share: '#059669', // Green
  open_app: '#7C3AED', // Violet
  close_app: '#DC2626', // Red
  calendar: '#0891B2', // Cyan
  reminder: '#DB2777', // Pink
  contact: '#2563EB', // Blue
  speak_text: '#9333EA', // Purple
  translate: '#0EA5E9', // Sky
  shortcut: '#1F2937', // Gray
};

const stepLabels: Record<StepType, string> = {
  notification: 'Show Notification',
  sms: 'Send SMS',
  email: 'Send Email',
  webhook: 'Call Webhook',
  delay: 'Add Delay',
  variable: 'Set Variable',
  script: 'Run Script',
  condition: 'If Condition',
  http_request: 'HTTP Request',
  location: 'Get Location',
  weather: 'Get Weather',
  clipboard: 'Copy to Clipboard',
  sound: 'Play Sound',
  vibration: 'Vibrate',
  flashlight: 'Toggle Flashlight',
  brightness: 'Set Brightness',
  wifi: 'Toggle WiFi',
  bluetooth: 'Toggle Bluetooth',
  share: 'Share Content',
  open_app: 'Open App',
  close_app: 'Close App',
  calendar: 'Add Calendar Event',
  reminder: 'Set Reminder',
  contact: 'Call Contact',
  speak_text: 'Speak Text',
  translate: 'Translate Text',
  shortcut: 'Run Shortcut',
};

export const StepCard: React.FC<StepCardProps> = ({
  step,
  index,
  isActive = false,
  isSelected = false,
  onPress,
  onLongPress,
  onDelete,
  readonly = false,
}) => {
  const theme = useSafeTheme();
  const colors = theme.colors;
  const { trigger } = useHaptic();
  
  const icon = stepIcons[step.type] || 'help-circle';
  const color = stepColors[step.type] || colors?.brand?.primary || colors?.primary || '#8B5CF6';
  const label = stepLabels[step.type] || 'Unknown Step';
  
  const animatedStyle = useAnimatedStyle(() => {
    const scale = withSpring(isActive ? 1.05 : 1, {
      damping: 15,
      stiffness: 400,
    });
    
    const opacity = interpolate(
      scale,
      [1, 1.05],
      [1, 0.95]
    );
    
    return {
      transform: [{ scale }],
      opacity,
    };
  });
  
  const handleDelete = () => {
    trigger('warning');
    onDelete?.();
  };
  
  const getStepDescription = () => {
    const config = step.config || {};
    
    switch (step.type) {
      case 'notification':
        return config.message || 'No message set';
      case 'sms':
        return config.phoneNumber ? `To: ${config.phoneNumber}` : 'No recipient set';
      case 'email':
        return config.to ? `To: ${config.to}` : 'No recipient set';
      case 'delay':
        return config.duration ? `Wait ${config.duration}ms` : 'No duration set';
      case 'variable':
        return config.name ? `${config.name} = ${config.value}` : 'No variable set';
      case 'webhook':
        return config.url || 'No URL set';
      default:
        return Object.keys(config).length > 0 ? 'Configured' : 'Not configured';
    }
  };
  
  return (
    <Animated.View style={animatedStyle}>
      <Pressable onPress={onPress} onLongPress={onLongPress} disabled={readonly && !onPress}>
        <Card
          variant={isSelected ? 'outlined' : 'elevated'}
          elevation="sm"
          style={[
            styles.container,
            isSelected && { borderColor: color, borderWidth: 2 },
          ]}
        >
          <View style={styles.content}>
            <View style={styles.leftSection}>
              <View style={[styles.iconContainer, { backgroundColor: `${color || '#8B5CF6'}15` }]}>
                <MaterialCommunityIcons
                  name={icon as any}
                  size={24}
                  color={color}
                />
              </View>
              <View style={styles.stepInfo}>
                <View style={styles.headerRow}>
                  <Text style={[styles.stepLabel, { color: colors?.text?.primary || colors?.onSurface || '#333333' }]}>
                    {label}
                  </Text>
                  <Badge variant="info" size="small">
                    Step {index + 1}
                  </Badge>
                </View>
                <Text
                  style={[styles.stepDescription, { color: colors.text.secondary }]}
                  numberOfLines={1}
                >
                  {getStepDescription()}
                </Text>
              </View>
            </View>
            
            <View style={styles.rightSection}>
              {!readonly && (
                <>
                  <IconButton
                    icon="delete"
                    size="small"
                    onPress={handleDelete}
                    style={{ marginLeft: theme.spacing.xs }}
                  />
                  <MaterialCommunityIcons
                    name="drag"
                    size={20}
                    color={colors.text.tertiary}
                    style={styles.dragHandle}
                  />
                </>
              )}
              {readonly && (
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={colors.text.tertiary}
                />
              )}
            </View>
          </View>
        </Card>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.tokens.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  stepInfo: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  stepLabel: {
    ...theme.typography.bodyLarge,
    fontWeight: '600',
    marginRight: theme.spacing.sm,
  },
  stepDescription: {
    ...theme.typography.caption,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dragHandle: {
    marginLeft: theme.spacing.sm,
  },
});