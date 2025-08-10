import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  Dimensions,
  FlatList,
  PanResponder,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import RNAnimated, { FadeInDown, Layout } from 'react-native-reanimated';
import { useSafeTheme } from '../../common/ThemeFallbackWrapper';
import { theme } from '../../../theme';
import { AutomationStep, StepType } from '../../../types';
import { StepCard } from './StepCard';
import { StepPalette } from './StepPalette';
import { StepConnector } from './StepConnector';
import { Button } from '../../atoms';
import { EmptyState } from '../../molecules';
import { useHaptic } from '../../../hooks/useHaptic';

interface VisualStepEditorProps {
  steps: AutomationStep[];
  onStepsChange: (steps: AutomationStep[]) => void;
  onStepEdit: (index: number) => void;
  onStepDelete: (index: number) => void;
  readonly?: boolean;
}

const { height: screenHeight } = Dimensions.get('window');

export const VisualStepEditor: React.FC<VisualStepEditorProps> = ({
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
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleMoveUp = useCallback((index: number) => {
    if (index > 0) {
      const newSteps = [...steps];
      [newSteps[index], newSteps[index - 1]] = [newSteps[index - 1], newSteps[index]];
      trigger('light');
      onStepsChange(newSteps);
    }
  }, [steps, onStepsChange, trigger]);

  const handleMoveDown = useCallback((index: number) => {
    if (index < steps.length - 1) {
      const newSteps = [...steps];
      [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
      trigger('light');
      onStepsChange(newSteps);
    }
  }, [steps, onStepsChange, trigger]);

  const handleAddStep = (stepType: StepType) => {
    const newStep: AutomationStep = {
      id: Date.now().toString(),
      type: stepType,
      config: {},
      order: steps.length,
    };
    
    trigger('light');
    onStepsChange([...steps, newStep]);
    setShowPalette(false);
    
    // Auto-edit the new step
    setTimeout(() => {
      onStepEdit(steps.length);
    }, 300);
  };

  const handleStepPress = (index: number) => {
    if (!readonly) {
      trigger('light');
      setSelectedStepIndex(index);
      onStepEdit(index);
    }
  };

  const handleStepLongPress = (index: number) => {
    if (!readonly) {
      trigger('medium');
      setSelectedStepIndex(index);
    }
  };

  const renderStep = ({ item, index }: { item: AutomationStep; index: number }) => {
    const isSelected = selectedStepIndex === index;
    const isDragging = draggedIndex === index;
    
    return (
      <RNAnimated.View
        entering={FadeInDown.delay(index * 50)}
        layout={Layout.springify()}
        style={[
          styles.stepContainer,
          isSelected && styles.selectedStep,
          isDragging && styles.draggingStep,
        ]}
      >
        {index > 0 && <StepConnector />}
        
        <View style={styles.stepRow}>
          {!readonly && (
            <View style={styles.dragHandle}>
              <TouchableOpacity
                onPress={() => handleMoveUp(index)}
                disabled={index === 0}
                style={[styles.moveButton, index === 0 && styles.moveButtonDisabled]}
              >
                <MaterialCommunityIcons 
                  name="chevron-up" 
                  size={20} 
                  color={index === 0 ? colors.text?.tertiary || '#999' : colors.text?.primary || '#000'} 
                />
              </TouchableOpacity>
              <MaterialCommunityIcons 
                name="drag" 
                size={20} 
                color={colors.text?.secondary || '#666'} 
              />
              <TouchableOpacity
                onPress={() => handleMoveDown(index)}
                disabled={index === steps.length - 1}
                style={[styles.moveButton, index === steps.length - 1 && styles.moveButtonDisabled]}
              >
                <MaterialCommunityIcons 
                  name="chevron-down" 
                  size={20} 
                  color={index === steps.length - 1 ? colors.text?.tertiary || '#999' : colors.text?.primary || '#000'} 
                />
              </TouchableOpacity>
            </View>
          )}
          
          <TouchableOpacity
            style={styles.stepCardWrapper}
            onPress={() => handleStepPress(index)}
            onLongPress={() => handleStepLongPress(index)}
            activeOpacity={0.7}
          >
            <StepCard
              step={item}
              index={index}
              isSelected={isSelected}
              onEdit={() => onStepEdit(index)}
              onDelete={() => {
                trigger('light');
                onStepDelete(index);
              }}
              readonly={readonly}
            />
          </TouchableOpacity>
        </View>
      </RNAnimated.View>
    );
  };

  if (steps.length === 0 && !readonly) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background?.primary || '#F5F5F5' }]}>
        <EmptyState
          icon="robot-confused"
          title="No Steps Yet"
          description="Add your first automation step to get started"
          action={
            <Button
              mode="primary"
              onPress={() => setShowPalette(true)}
              icon="plus"
              size="large"
            >
              Add First Step
            </Button>
          }
        />
        
        <StepPalette
          visible={showPalette}
          onClose={() => setShowPalette(false)}
          onSelectStep={handleAddStep}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background?.primary || '#F5F5F5' }]}>
      <FlatList
        data={steps}
        renderItem={renderStep}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          !readonly ? (
            <View style={styles.addButtonContainer}>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.brand?.primary || '#6200ee' }]}
                onPress={() => setShowPalette(true)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="plus" size={24} color="#FFFFFF" />
                <Text style={styles.addButtonText}>Add Step</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
      
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
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  stepContainer: {
    marginBottom: 12,
  },
  selectedStep: {
    transform: [{ scale: 1.02 }],
  },
  draggingStep: {
    opacity: 0.8,
    transform: [{ scale: 1.05 }],
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dragHandle: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moveButton: {
    padding: 4,
  },
  moveButtonDisabled: {
    opacity: 0.3,
  },
  stepCardWrapper: {
    flex: 1,
  },
  addButtonContainer: {
    marginTop: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default VisualStepEditor;