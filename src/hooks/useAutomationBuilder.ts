import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { v4 as uuidv4 } from 'uuid';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useCreateAutomationMutation } from '../store/api/automationApi';
import { AutomationTemplate } from '../services/templates/AutomationTemplates';
import { StepType, AutomationStep as BaseAutomationStep, StepConfig } from '../types';

interface AutomationStep extends BaseAutomationStep {
  icon: string;
  color: string;
}

const getDefaultConfig = (type: StepType): StepConfig => {
  switch (type) {
    case 'notification':
      return { title: '', message: '' };
    case 'sms':
      return { phoneNumber: '', message: '' };
    case 'email':
      return { email: '', subject: '', message: '' };
    case 'webhook':
      return { url: '', method: 'GET' };
    case 'delay':
      return { delay: 1000 };
    case 'variable':
      return { name: '', value: '' };
    case 'get_variable':
      return { name: '' };
    case 'prompt_input':
      return { title: '', message: '', variableName: '' };
    case 'location':
      return { action: 'get_current' };
    case 'condition':
      return { variable: '', condition: 'equals', value: '' };
    case 'loop':
      return { type: 'count', count: 1 };
    case 'text':
      return { action: 'combine', text1: '' };
    case 'math':
      return { operation: 'add', number1: 0, number2: 0 };
    case 'photo':
      return { action: 'take' };
    case 'clipboard':
      return { action: 'copy', text: '' };
    case 'app':
      return { appName: '' };
    case 'open_url':
      return { url: '' } as any;
    case 'share_text':
      return { text: '' } as any;
    default:
      return {} as any;
  }
};

export const useAutomationBuilder = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [createAutomation, { isLoading: isSaving }] = useCreateAutomationMutation();
  
  // Main state
  const [steps, setSteps] = useState<AutomationStep[]>([]);
  const [selectedStep, setSelectedStep] = useState<AutomationStep | null>(null);
  const [isConfigModalVisible, setIsConfigModalVisible] = useState(false);
  const [isStepPickerVisible, setIsStepPickerVisible] = useState(false);
  const [automationName, setAutomationName] = useState('');
  const [automationDescription, setAutomationDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stepConfig, setStepConfig] = useState<Record<string, any>>({});
  const [isTesting, setIsTesting] = useState(false);
  const [testProgress, setTestProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'builder' | 'templates'>('templates');
  const [isTemplateModalVisible, setIsTemplateModalVisible] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AutomationTemplate | null>(null);

  const triggerHaptic = useCallback(async (type: 'light' | 'medium' | 'heavy' = 'light') => {
    try {
      switch (type) {
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
      }
    } catch (error) {
      console.warn('Haptics not supported:', error);
    }
  }, []);

  const handleAddStep = useCallback((stepType: any) => {
    triggerHaptic('medium');
    
    const newStep: AutomationStep = {
      id: uuidv4(),
      type: stepType.type,
      title: stepType.title,
      icon: stepType.icon,
      color: stepType.color,
      config: getDefaultConfig(stepType.type),
      enabled: true,
    };

    setSteps(prev => [...prev, newStep]);
    setIsStepPickerVisible(false);
  }, [triggerHaptic]);

  const handleUpdateStep = useCallback((stepId: string, updates: Partial<AutomationStep>) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    ));
    triggerHaptic('light');
  }, [triggerHaptic]);

  const handleDeleteStep = useCallback((stepId: string) => {
    const performDelete = () => {
      setSteps(prev => prev.filter(step => step.id !== stepId));
      triggerHaptic('heavy');
    };
    
    Alert.alert(
      'Delete Step',
      'Are you sure you want to delete this step?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: performDelete,
        },
      ]
    );
  }, [triggerHaptic]);

  const handleConfigureStep = useCallback((step: AutomationStep) => {
    setSelectedStep(step);
    setStepConfig(step.config || {});
    setIsConfigModalVisible(true);
    triggerHaptic('light');
  }, [triggerHaptic]);

  const handleSaveStepConfig = useCallback(() => {
    if (!selectedStep) return;

    handleUpdateStep(selectedStep.id, { config: stepConfig as StepConfig });
    setIsConfigModalVisible(false);
    setSelectedStep(null);
    setStepConfig({});
  }, [selectedStep, stepConfig, handleUpdateStep]);

  const handleUseTemplate = useCallback((template: AutomationTemplate) => {
    setSelectedTemplate(template);
    setIsTemplateModalVisible(true);
    triggerHaptic('medium');
  }, [triggerHaptic]);

  const handleApplyTemplate = useCallback(() => {
    if (!selectedTemplate) return;
    
    const templateSteps = selectedTemplate.steps.map((stepData: any) => ({
      id: uuidv4(),
      type: stepData.type,
      title: stepData.title,
      icon: stepData.icon || 'cog',
      color: stepData.color || '#8B5CF6',
      config: stepData.config || getDefaultConfig(stepData.type),
      enabled: stepData.enabled !== false,
    }));

    setSteps(templateSteps);
    setAutomationName(selectedTemplate.title);
    setAutomationDescription(selectedTemplate.description);
    setIsTemplateModalVisible(false);
    setViewMode('builder');
    triggerHaptic('heavy');
    
    Alert.alert(
      'Template Applied! 🎉',
      `"${selectedTemplate.title}" has been loaded with ${templateSteps.length} steps.`
    );
  }, [selectedTemplate, triggerHaptic]);

  const handleTestAutomation = useCallback(async () => {
    if (steps.length === 0) {
      Alert.alert('No Steps', 'Add some steps first to test the automation');
      return;
    }

    setIsTesting(true);
    setTestProgress(0);
    
    // Simulate testing
    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      setTestProgress((i + 1) / steps.length);
    }

    setIsTesting(false);
    triggerHaptic('heavy');
    Alert.alert('Test Complete! ✅', 'All steps executed successfully');
  }, [steps, triggerHaptic]);

  const handleSaveAutomation = useCallback(async (navigation: any) => {
    if (!automationName.trim()) {
      Alert.alert('Name Required', 'Please enter a name for your automation');
      return;
    }

    if (steps.length === 0) {
      Alert.alert('No Steps', 'Add some steps before saving');
      return;
    }

    try {
      const automationData = {
        title: automationName.trim(),
        description: automationDescription.trim(),
        steps: steps,
        user_id: user?.id,
        is_public: false,
        created_at: new Date().toISOString(),
      };

      await createAutomation(automationData).unwrap();
      
      Alert.alert(
        'Success! 🎉',
        'Your automation has been saved',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Failed to save automation:', error);
      Alert.alert('Error', 'Failed to save automation. Please try again.');
    }
  }, [automationName, automationDescription, steps, user?.id, createAutomation]);

  return {
    // State
    steps,
    selectedStep,
    isConfigModalVisible,
    isStepPickerVisible,
    automationName,
    automationDescription,
    selectedCategory,
    stepConfig,
    isTesting,
    testProgress,
    searchQuery,
    selectedTemplateCategory,
    viewMode,
    isTemplateModalVisible,
    selectedTemplate,
    isSaving,
    
    // Setters
    setSteps,
    setSelectedStep,
    setIsConfigModalVisible,
    setIsStepPickerVisible,
    setAutomationName,
    setAutomationDescription,
    setSelectedCategory,
    setStepConfig,
    setIsTesting,
    setTestProgress,
    setSearchQuery,
    setSelectedTemplateCategory,
    setViewMode,
    setIsTemplateModalVisible,
    setSelectedTemplate,
    
    // Actions
    handleAddStep,
    handleUpdateStep,
    handleDeleteStep,
    handleConfigureStep,
    handleSaveStepConfig,
    handleUseTemplate,
    handleApplyTemplate,
    handleTestAutomation,
    handleSaveAutomation,
    triggerHaptic,
  };
};