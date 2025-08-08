import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { useSafeTheme } from '../../common/ThemeFallbackWrapper';
import { theme } from '../../../theme';
import { AutomationStep, StepType } from '../../../types';
import { SafeStepCard } from './SafeStepCard';
import { StepPalette } from '../../organisms/StepEditor/StepPalette';
import { Button } from '../../atoms';
import { EmptyState } from '../../molecules';
import { useHaptic } from '../../../hooks/useHaptic';

interface SafeStepEditorProps {
  steps: AutomationStep[];
  onStepsChange: (steps: AutomationStep[]) => void;
  onStepEdit: (index: number) => void;
  onStepDelete: (index: number) => void;
  readonly?: boolean;
}

const { height: screenHeight } = Dimensions.get('window');

export const SafeStepEditor: React.FC<SafeStepEditorProps> = ({
  steps,
  onStepsChange,
  onStepEdit,
  onStepDelete,
  readonly = false,
}) => {
  const currentTheme = useSafeTheme();
  const colors = currentTheme.colors;
  const { trigger } = useHaptic();
  const [showPalette, setShowPalette] = useState(false);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);

  const handleAddStep = (stepType: StepType) => {
    const stepLabels: Record<StepType, string> = {
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
      open_url: 'Open URL',
      share_text: 'Share Text',
    };

    const newStep: AutomationStep = {
      id: Date.now().toString(),
      type: stepType,
      title: stepLabels[stepType] || 'New Step',
      config: {},
      enabled: true,
    };
    
    trigger('success');
    onStepsChange([...steps, newStep]);
    setShowPalette(false);
    
    // Auto-open config for new step
    setTimeout(() => {
      onStepEdit(steps.length);
    }, 300);
  };

  const moveStepUp = (index: number) => {
    if (index === 0) return;
    
    const newSteps = [...steps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[index - 1];
    newSteps[index - 1] = temp;
    
    trigger('light');
    onStepsChange(newSteps);
  };

  const moveStepDown = (index: number) => {
    if (index === steps.length - 1) return;
    
    const newSteps = [...steps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[index + 1];
    newSteps[index + 1] = temp;
    
    trigger('light');
    onStepsChange(newSteps);
  };

  const renderStep = useCallback(
    (step: AutomationStep, index: number) => {
      return (
        <Animated.View
          key={`step-${step.id}`}
          entering={FadeInDown.delay(index * 100)}
          layout={Layout.springify()}
          style={styles.stepContainer}
        >
          <View style={styles.stepRow}>
            <View style={styles.stepCardContainer}>
              <SafeStepCard
                step={step}
                index={index}
                isSelected={selectedStepIndex === index}
                onPress={() => {
                  setSelectedStepIndex(index);
                  onStepEdit(index);
                }}
                onDelete={() => onStepDelete(index)}
                readonly={readonly}
              />
            </View>
            
            {!readonly && (
              <View style={styles.stepControls}>
                <TouchableOpacity
                  onPress={() => moveStepUp(index)}
                  disabled={index === 0}
                  style={[
                    styles.controlButton,
                    index === 0 && styles.controlButtonDisabled
                  ]}
                >
                  <MaterialCommunityIcons
                    name="chevron-up"
                    size={20}
                    color={index === 0 ? '#ccc' : colors?.primary || '#8B5CF6'}
                  />
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={() => moveStepDown(index)}
                  disabled={index === steps.length - 1}
                  style={[
                    styles.controlButton,
                    index === steps.length - 1 && styles.controlButtonDisabled
                  ]}
                >
                  <MaterialCommunityIcons
                    name="chevron-down"
                    size={20}
                    color={index === steps.length - 1 ? '#ccc' : colors?.primary || '#8B5CF6'}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Animated.View>
      );
    },
    [selectedStepIndex, onStepEdit, onStepDelete, readonly, colors, steps.length]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors?.background || '#f5f5f5' }]}>
      {steps.length === 0 ? (
        <EmptyState
          type="no-automations"
          title="No Steps Yet"
          subtitle="Add your first automation step to get started"
          actionLabel={!readonly ? "Add First Step" : undefined}
          onAction={!readonly ? () => setShowPalette(true) : undefined}
        />
      ) : (
        <>
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors?.text || '#000' }]}>
              Automation Steps
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors?.textSecondary || '#666' }]}>
              {readonly ? 'Viewing' : 'Use arrows to reorder'} • {steps.length} step{steps.length !== 1 ? 's' : ''}
            </Text>
          </View>
          
          <View style={styles.stepsContainer}>
            {steps.map((step, index) => renderStep(step, index))}
          </View>
        </>
      )}
      
      {!readonly && steps.length > 0 && (
        <Animated.View
          layout={Layout.springify()}
          style={[styles.addButtonContainer, { borderTopColor: colors?.border || '#e0e0e0' }]}
        >
          <Button
            variant="outline"
            label="Add Step"
            icon="plus"
            onPress={() => setShowPalette(true)}
            fullWidth
          />
        </Animated.View>
      )}
      
      <StepPalette
        visible={showPalette}
        onClose={() => setShowPalette(false)}
        onSelectStep={handleAddStep}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  headerTitle: {
    ...theme.typography.titleLarge,
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    ...theme.typography.caption,
  },
  stepsContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  stepContainer: {
    marginBottom: theme.spacing.sm,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCardContainer: {
    flex: 1,
  },
  stepControls: {
    marginLeft: theme.spacing.sm,
    justifyContent: 'center',
  },
  controlButton: {
    padding: theme.spacing.xs,
    borderRadius: theme.tokens.borderRadius.sm,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    marginVertical: 2,
  },
  controlButtonDisabled: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  addButtonContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
  },
});
