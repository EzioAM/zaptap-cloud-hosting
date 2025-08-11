import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  Dimensions,
  FlatList,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeTheme } from '../../common/ThemeFallbackWrapper';
import { AutomationStep, StepType } from '../../../types';

// Simple fallback components to avoid import issues
const SafeStepCard = ({ step, index, onEdit, onDelete, isSelected }: any) => {
  const theme = useSafeTheme();
  const colors = theme.colors;
  
  return (
    <TouchableOpacity 
      style={[styles.stepCard, { backgroundColor: colors.surface || '#fff', borderColor: isSelected ? '#6200ee' : '#e0e0e0' }]}
      onPress={onEdit}
    >
      <View style={styles.stepContent}>
        <MaterialCommunityIcons name="cog" size={24} color="#6200ee" />
        <View style={styles.stepInfo}>
          <Text style={[styles.stepTitle, { color: colors.onSurface || '#333' }]}>
            Step {index + 1}: {step.type}
          </Text>
          <Text style={[styles.stepDescription, { color: colors.onSurfaceVariant || '#666' }]}>
            {step.config?.message || step.config?.url || step.config?.phoneNumber || 'Tap to configure'}
          </Text>
        </View>
        <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
          <MaterialCommunityIcons name="delete" size={20} color="#f44336" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const SafeStepPalette = ({ visible, onClose, onSelectStep }: any) => {
  const theme = useSafeTheme();
  const colors = theme.colors;
  
  const stepTypes = [
    { type: 'notification', label: 'Show Notification', icon: 'bell' },
    { type: 'sms', label: 'Send SMS', icon: 'message' },
    { type: 'email', label: 'Send Email', icon: 'email' },
    { type: 'delay', label: 'Add Delay', icon: 'clock' },
    { type: 'variable', label: 'Set Variable', icon: 'variable' },
    { type: 'webhook', label: 'Call Webhook', icon: 'webhook' },
  ];
  
  if (!visible) return null;
  
  return (
    <View style={styles.overlay}>
      <View style={[styles.paletteContainer, { backgroundColor: colors.surface || '#fff' }]}>
        <View style={styles.paletteHeader}>
          <Text style={[styles.paletteTitle, { color: colors.onSurface || '#333' }]}>Add Step</Text>
          <TouchableOpacity onPress={onClose}>
            <MaterialCommunityIcons name="close" size={24} color={colors.onSurface || '#333'} />
          </TouchableOpacity>
        </View>
        <ScrollView>
          {stepTypes.map((step) => (
            <TouchableOpacity
              key={step.type}
              style={styles.stepOption}
              onPress={() => onSelectStep(step.type)}
            >
              <MaterialCommunityIcons name={step.icon as any} size={24} color="#6200ee" />
              <Text style={[styles.stepOptionText, { color: colors.onSurface || '#333' }]}>
                {step.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

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
  const [showPalette, setShowPalette] = useState(false);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);

  const handleMoveUp = useCallback((index: number) => {
    if (index > 0) {
      const newSteps = [...steps];
      [newSteps[index], newSteps[index - 1]] = [newSteps[index - 1], newSteps[index]];
      onStepsChange(newSteps);
    }
  }, [steps, onStepsChange]);

  const handleMoveDown = useCallback((index: number) => {
    if (index < steps.length - 1) {
      const newSteps = [...steps];
      [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
      onStepsChange(newSteps);
    }
  }, [steps, onStepsChange]);

  const handleAddStep = (stepType: StepType) => {
    const newStep: AutomationStep = {
      id: Date.now().toString(),
      type: stepType,
      config: {},
      enabled: true,
      title: `Step ${steps.length + 1}`,
    };
    
    onStepsChange([...steps, newStep]);
    setShowPalette(false);
    
    // Auto-edit the new step
    setTimeout(() => {
      onStepEdit(steps.length);
    }, 300);
  };

  const handleStepPress = (index: number) => {
    if (!readonly) {
      setSelectedStepIndex(index);
      onStepEdit(index);
    }
  };

  const handleStepDelete = (index: number) => {
    if (!readonly) {
      Alert.alert(
        'Delete Step',
        'Are you sure you want to delete this step?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => onStepDelete(index) }
        ]
      );
    }
  };

  const renderStep = ({ item, index }: { item: AutomationStep; index: number }) => {
    const isSelected = selectedStepIndex === index;
    
    return (
      <View key={item.id} style={styles.stepContainer}>
        <SafeStepCard
          step={item}
          index={index}
          isSelected={isSelected}
          onEdit={() => handleStepPress(index)}
          onDelete={() => handleStepDelete(index)}
        />
      </View>
    );
  };

  if (steps.length === 0 && !readonly) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background || '#F5F5F5' }]}>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="robot-confused" size={64} color="#ccc" />
          <Text style={[styles.emptyTitle, { color: colors.onBackground || '#333' }]}>
            No Steps Yet
          </Text>
          <Text style={[styles.emptyDescription, { color: colors.onBackground || '#666' }]}>
            Add your first automation step to get started
          </Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary || '#6200ee' }]}
            onPress={() => setShowPalette(true)}
          >
            <MaterialCommunityIcons name="plus" size={24} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add First Step</Text>
          </TouchableOpacity>
        </View>
        
        <SafeStepPalette
          visible={showPalette}
          onClose={() => setShowPalette(false)}
          onSelectStep={handleAddStep}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background || '#F5F5F5' }]}>
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {steps.map((step, index) => renderStep({ item: step, index }))}
        
        {!readonly && (
          <View style={styles.addButtonContainer}>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary || '#6200ee' }]}
              onPress={() => setShowPalette(true)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="plus" size={24} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add Step</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      
      <SafeStepPalette
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
  stepCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  stepContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepInfo: {
    flex: 1,
    marginLeft: 12,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
  deleteButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  addButtonContainer: {
    marginTop: 16,
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
  // SafeStepPalette styles
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  paletteContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    padding: 16,
  },
  paletteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  paletteTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  stepOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  stepOptionText: {
    fontSize: 16,
    marginLeft: 12,
  },
});

export default VisualStepEditor;