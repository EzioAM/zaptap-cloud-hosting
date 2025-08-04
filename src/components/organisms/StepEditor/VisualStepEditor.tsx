import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  Dimensions,
} from 'react-native';
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { useTheme } from '../../../contexts/ThemeContext';
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
  const { theme: currentTheme } = useTheme();
  const colors = theme.getColors(currentTheme);
  const { trigger } = useHaptic();
  const [showPalette, setShowPalette] = useState(false);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);

  const handleDragEnd = ({ data }: { data: AutomationStep[] }) => {
    trigger('light');
    onStepsChange(data);
  };

  const handleAddStep = (stepType: StepType) => {
    const newStep: AutomationStep = {
      id: Date.now().toString(),
      type: stepType,
      config: {},
      order: steps.length,
    };
    
    trigger('success');
    onStepsChange([...steps, newStep]);
    setShowPalette(false);
    
    // Auto-open config for new step
    setTimeout(() => {
      onStepEdit(steps.length);
    }, 300);
  };

  const renderStep = useCallback(
    ({ item, index, drag, isActive }: RenderItemParams<AutomationStep>) => {
      return (
        <ScaleDecorator activeScale={1.05}>
          <View>
            <StepCard
              step={item}
              index={index}
              isActive={isActive}
              isSelected={selectedStepIndex === index}
              onPress={() => {
                setSelectedStepIndex(index);
                onStepEdit(index);
              }}
              onLongPress={readonly ? undefined : drag}
              onDelete={() => onStepDelete(index)}
              readonly={readonly}
            />
            {index < steps.length - 1 && (
              <StepConnector
                isActive={isActive}
                color={colors.brand.primary}
              />
            )}
          </View>
        </ScaleDecorator>
      );
    },
    [selectedStepIndex, onStepEdit, onStepDelete, readonly, colors]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
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
            <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
              Automation Steps
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.text.secondary }]}>
              {readonly ? 'Viewing' : 'Drag to reorder'} • {steps.length} step{steps.length !== 1 ? 's' : ''}
            </Text>
          </View>
          
          <DraggableFlatList
            data={steps}
            onDragEnd={handleDragEnd}
            keyExtractor={(item) => item.id}
            renderItem={renderStep}
            containerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            animationConfig={{
              damping: 15,
              stiffness: 200,
            }}
          />
        </>
      )}
      
      {!readonly && steps.length > 0 && (
        <Animated.View
          layout={Layout.springify()}
          style={[styles.addButtonContainer, { borderTopColor: colors.border.light }]}
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
  listContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  addButtonContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
  },
});