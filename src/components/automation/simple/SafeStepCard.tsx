import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AutomationStep, StepType } from '../../../types';

interface SafeStepCardProps {
  step: AutomationStep;
  index: number;
  isActive?: boolean;
  isSelected?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  onDelete?: () => void;
  readonly?: boolean;
}

const stepIcons: Record<string, string> = {
  notification: 'bell',
  sms: 'message-text',
  email: 'email',
  webhook: 'webhook',
  delay: 'clock',
  variable: 'variable',
  get_variable: 'variable-box',
  prompt_input: 'comment-question',
  location: 'map-marker',
  condition: 'code-braces',
  loop: 'refresh',
  text: 'format-text',
  math: 'calculator',
  photo: 'camera',
  clipboard: 'content-paste',
  app: 'application',
};

const stepColors: Record<string, string> = {
  notification: '#6366F1',
  sms: '#10B981',
  email: '#3B82F6',
  webhook: '#8B5CF6',
  delay: '#F59E0B',
  variable: '#EC4899',
  get_variable: '#A855F7',
  prompt_input: '#06B6D4',
  location: '#EF4444',
  condition: '#F97316',
  loop: '#84CC16',
  text: '#059669',
  math: '#7C3AED',
  photo: '#DB2777',
  clipboard: '#2563EB',
  app: '#9333EA',
};

const stepLabels: Record<string, string> = {
  notification: 'Show Notification',
  sms: 'Send SMS',
  email: 'Send Email',
  webhook: 'Call Webhook',
  delay: 'Add Delay',
  variable: 'Set Variable',
  get_variable: 'Get Variable',
  prompt_input: 'Ask for Input',
  location: 'Location Services',
  condition: 'If Statement',
  loop: 'Repeat Actions',
  text: 'Text Processing',
  math: 'Calculate',
  photo: 'Take Photo',
  clipboard: 'Clipboard',
  app: 'Open App',
};

export const SafeStepCard: React.FC<SafeStepCardProps> = ({
  step,
  index,
  isActive = false,
  isSelected = false,
  onPress,
  onLongPress,
  onDelete,
  readonly = false,
}) => {
  const icon = stepIcons[step.type] || 'cog';
  const color = stepColors[step.type] || '#8B5CF6';
  const label = stepLabels[step.type] || 'Unknown Step';
  
  const getStepDescription = () => {
    const config = step.config || {};
    
    switch (step.type) {
      case 'notification':
        return config.message || 'Tap to configure';
      case 'sms':
        return config.phoneNumber ? `To: ${config.phoneNumber}` : 'Tap to configure';
      case 'email':
        return config.email ? `To: ${config.email}` : 'Tap to configure';
      case 'delay':
        const seconds = config.delay ? config.delay / 1000 : 1;
        return `Wait ${seconds} second${seconds !== 1 ? 's' : ''}`;
      case 'variable':
        return config.name && config.value
          ? `Set ${config.name} = "${config.value}"`
          : 'Tap to configure';
      case 'get_variable':
        return config.name 
          ? `Get variable: ${config.name}`
          : 'Tap to configure';
      case 'webhook':
        return config.url && config.method
          ? `${config.method.toUpperCase()} ${config.url}`
          : 'Tap to configure';
      default:
        return Object.keys(config).length > 0 ? 'Configured' : 'Tap to configure';
    }
  };
  
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={readonly && !onPress}
      style={[
        styles.container,
        isSelected && { borderColor: color, borderWidth: 2 },
        isActive && styles.activeCard,
      ]}
    >
      <View style={styles.content}>
        <View style={styles.leftSection}>
          <View style={[styles.stepNumber, { backgroundColor: color }]}>
            <Text style={styles.stepNumberText}>{index + 1}</Text>
          </View>
          
          <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
            <MaterialCommunityIcons
              name={icon as any}
              size={24}
              color={color}
            />
          </View>
          
          <View style={styles.stepInfo}>
            <Text style={styles.stepTitle} numberOfLines={1}>
              {label}
            </Text>
            <Text style={styles.stepDescription} numberOfLines={1}>
              {getStepDescription()}
            </Text>
          </View>
        </View>
        
        {!readonly && (
          <View style={styles.rightSection}>
            {step.enabled !== undefined && (
              <MaterialCommunityIcons
                name={step.enabled ? 'check-circle' : 'pause-circle'}
                size={20}
                color={step.enabled ? '#4CAF50' : '#FF9800'}
                style={styles.statusIcon}
              />
            )}
            
            {onDelete && (
              <TouchableOpacity
                onPress={onDelete}
                style={styles.deleteButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons
                  name="delete"
                  size={20}
                  color="#F44336"
                />
              </TouchableOpacity>
            )}
            
            <MaterialCommunityIcons
              name="drag"
              size={20}
              color="#999"
              style={styles.dragHandle}
            />
          </View>
        )}
      </View>
      
      {/* Connection line to next step */}
      <View style={styles.connectionContainer}>
        <View style={[styles.connectionLine, { backgroundColor: color + '40' }]} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  activeCard: {
    transform: [{ scale: 1.02 }],
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepInfo: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    marginRight: 8,
  },
  deleteButton: {
    padding: 4,
    marginRight: 8,
  },
  dragHandle: {
    marginLeft: 4,
  },
  connectionContainer: {
    alignItems: 'center',
    height: 16,
    justifyContent: 'center',
  },
  connectionLine: {
    width: 2,
    height: 8,
    borderRadius: 1,
  },
});
