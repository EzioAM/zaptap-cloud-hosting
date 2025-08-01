import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Chip, IconButton } from 'react-native-paper';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
  withSpring,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AutomationStep } from '../../types';

interface DraggableStepItemProps {
  step: AutomationStep;
  index: number;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
  onToggle: (index: number) => void;
  onReorder: (from: number, to: number) => void;
  isDragEnabled: boolean;
  totalSteps: number;
}

const DraggableStepItem: React.FC<DraggableStepItemProps> = ({
  step,
  index,
  onEdit,
  onRemove,
  onToggle,
  onReorder,
  isDragEnabled,
  totalSteps,
}) => {
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const isDragging = useSharedValue(false);

  const gestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      if (!isDragEnabled) return;
      isDragging.value = true;
      scale.value = withSpring(1.05);
      opacity.value = withSpring(0.9);
    },
    onActive: (event) => {
      if (!isDragEnabled) return;
      translateY.value = event.translationY;
    },
    onEnd: (event) => {
      if (!isDragEnabled) return;
      
      const STEP_HEIGHT = 120; // Approximate height of each step card
      const moveDistance = Math.round(event.translationY / STEP_HEIGHT);
      const newIndex = Math.max(0, Math.min(totalSteps - 1, index + moveDistance));
      
      if (newIndex !== index && Math.abs(moveDistance) >= 0.5) {
        runOnJS(onReorder)(index, newIndex);
      }
      
      // Reset animation values
      translateY.value = withSpring(0);
      scale.value = withSpring(1);
      opacity.value = withSpring(1);
      isDragging.value = false;
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
    zIndex: isDragging.value ? 999 : 1,
  }));

  const getStepIcon = (stepType: string) => {
    const iconMap: Record<string, string> = {
      notification: 'bell',
      sms: 'message-text',
      email: 'email',
      webhook: 'webhook',
      delay: 'clock',
      variable: 'variable',
      get_variable: 'variable-box',
      prompt_input: 'comment-question',
      clipboard: 'content-paste',
      open_url: 'open-in-new',
      share_text: 'share',
      location: 'map-marker',
      condition: 'code-braces',
      loop: 'refresh',
      text: 'format-text',
      math: 'calculator',
      photo: 'camera',
      app: 'application',
    };
    return iconMap[stepType] || 'cog';
  };

  const getStepTypeDisplay = (stepType: string) => {
    const typeMap: Record<string, string> = {
      notification: 'Notification',
      sms: 'SMS',
      email: 'Email', 
      webhook: 'Webhook',
      delay: 'Delay',
      variable: 'Set Variable',
      get_variable: 'Get Variable',
      prompt_input: 'Ask for Input',
      clipboard: 'Clipboard',
      open_url: 'Open URL',
      share_text: 'Share Text',
      location: 'Location',
      condition: 'If Statement',
      loop: 'Loop',
      text: 'Text',
      math: 'Math',
      photo: 'Photo',
      app: 'Open App',
    };
    return typeMap[stepType] || stepType;
  };

  const formatConfigSummary = (config: Record<string, any>, stepType: string) => {
    switch (stepType) {
      case 'notification':
        return config.message ? `"${config.message.substring(0, 30)}${config.message.length > 30 ? '...' : ''}"` : 'No message';
      case 'sms':
        return config.phoneNumber ? `To: ${config.phoneNumber}` : 'No phone number';
      case 'email':
        return config.email ? `To: ${config.email}` : 'No email';
      case 'delay':
        return `${config.delay || 1000}ms`;
      case 'variable':
        return config.name ? `${config.name} = "${config.value || ''}"` : 'No variable name';
      case 'get_variable':
        return config.name ? `Get: ${config.name}` : 'No variable name';
      case 'prompt_input':
        return config.variableName ? `Store in: ${config.variableName}` : 'No variable name';
      case 'webhook':
        return config.url ? `${config.method || 'POST'} ${config.url.substring(0, 30)}${config.url.length > 30 ? '...' : ''}` : 'No URL';
      case 'location':
        return config.action ? `Action: ${config.action}` : 'Get current location';
      case 'condition':
        return config.variable ? `If ${config.variable} ${config.condition || 'equals'} ${config.value || ''}` : 'No condition set';
      case 'loop':
        return config.type === 'count' ? `Repeat ${config.count || 3} times` : 'Repeat actions';
      case 'text':
        return config.action ? `${config.action}: ${config.text1 || ''}` : 'Text processing';
      case 'math':
        return config.operation ? `${config.number1 || 0} ${config.operation} ${config.number2 || 0}` : 'Math operation';
      case 'clipboard':
        return config.action === 'copy' ? `Copy: "${config.text || ''}"` : 'Paste from clipboard';
      case 'app':
        return config.appName ? `Open: ${config.appName}` : 'No app specified';
      default:
        return 'Step configured';
    }
  };

  return (
    <PanGestureHandler onGestureEvent={gestureHandler} enabled={isDragEnabled}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <Card style={[styles.stepCard, !step.enabled && styles.disabledCard]}>
          <Card.Content>
            <View style={styles.stepHeader}>
              <View style={styles.stepIndicator}>
                <Text style={styles.stepNumber}>{index + 1}</Text>
              </View>
              
              <View style={styles.stepInfo}>
                <View style={styles.stepTitleRow}>
                  <Icon 
                    name={getStepIcon(step.type)} 
                    size={20} 
                    color={step.enabled ? '#6200ee' : '#999'} 
                  />
                  <View style={styles.stepText}>
                    <Text style={[styles.stepTitle, !step.enabled && styles.disabledText]}>
                      {step.title}
                    </Text>
                    <Text style={[styles.stepType, !step.enabled && styles.disabledText]}>
                      {getStepTypeDisplay(step.type)}
                    </Text>
                  </View>
                </View>
                
                <Text style={[styles.stepConfig, !step.enabled && styles.disabledText]}>
                  {formatConfigSummary(step.config, step.type)}
                </Text>
              </View>

              <View style={styles.stepActions}>
                {isDragEnabled && (
                  <View style={styles.dragHandle}>
                    <Icon name="drag-horizontal" size={20} color="#999" />
                  </View>
                )}
                <IconButton
                  icon={step.enabled ? 'pause' : 'play'}
                  size={18}
                  onPress={() => onToggle(index)}
                  iconColor={step.enabled ? '#FF9800' : '#4CAF50'}
                />
                <IconButton
                  icon="pencil"
                  size={18}
                  onPress={() => onEdit(index)}
                  iconColor="#2196F3"
                />
                <IconButton
                  icon="delete"
                  size={18}
                  onPress={() => onRemove(index)}
                  iconColor="#F44336"
                />
              </View>
            </View>
          </Card.Content>
        </Card>
      </Animated.View>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  stepCard: {
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  disabledCard: {
    backgroundColor: '#f5f5f5',
    opacity: 0.7,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumber: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  stepInfo: {
    flex: 1,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepText: {
    marginLeft: 8,
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  stepType: {
    fontSize: 13,
    color: '#6200ee',
    fontWeight: '500',
  },
  stepConfig: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    marginTop: 4,
    lineHeight: 16,
  },
  disabledText: {
    color: '#999',
  },
  stepActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dragHandle: {
    padding: 8,
    marginRight: -4,
  },
});

export default DraggableStepItem;