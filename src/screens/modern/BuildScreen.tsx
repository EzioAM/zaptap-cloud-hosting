import React, { useState, useCallback, useEffect, useRef, memo } from 'react';
// Error Boundaries and Recovery
import { ScreenErrorBoundary, WidgetErrorBoundary } from '../../components/ErrorBoundaries';
import { EventLogger } from '../../utils/EventLogger';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput as RNTextInput,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Dimensions,
  Vibration,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { TextInput } from 'react-native-paper';
import { useSafeTheme } from '../../components/common/ThemeFallbackWrapper';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useCreateAutomationMutation } from '../../store/api/automationApi';
import { useOptimizedComponents } from '../../hooks/useOptimizedComponents';
import { ErrorState } from '../../components/states/ErrorState';
import { EmptyState } from '../../components/states/EmptyState';
import { ModernStepConfigRenderer } from '../../components/automation/ModernStepConfigRenderer';
import {
  AnimatedSectionHeader,
  PressableAnimated,
  FeedbackAnimation,
  LoadingPulse,
} from '../../components/automation/AnimationHelpers';

// Enhanced gradient components
import { GradientHeader } from '../../components/shared/GradientHeader';
import { EmptyStateIllustration } from '../../components/shared/EmptyStateIllustration';

// Enhanced theme imports
import { gradients, glassEffects, getGlassStyle } from '../../theme/gradients';
import { typography, fontWeights, textShadows } from '../../theme/typography';

// Animation constants
import { ANIMATION_CONFIG } from '../../constants/animations';

// Haptics
import * as Haptics from 'expo-haptics';
import { v4 as uuidv4 } from 'uuid';
import type { AutomationStep as AutomationStepType } from '../../types';

// Import the rich template service
import { AutomationTemplateService, AutomationTemplate } from '../../services/templates/AutomationTemplates';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Feature flags for progressive enhancement
const FEATURE_FLAGS = {
  ENHANCED_ANIMATIONS: Platform.OS !== 'web',
  HAPTIC_FEEDBACK: Platform.OS !== 'web',
  BLUR_EFFECTS: Platform.OS !== 'web',
  ADVANCED_GESTURES: Platform.OS !== 'web',
  GRADIENT_HEADERS: true,
  STAGGERED_ANIMATIONS: Platform.OS !== 'web',
};

// Local interface for build screen - simplified version
interface AutomationStep {
  id: string;
  type: string;
  title: string;
  icon: string;
  color: string;
  config?: any;
  enabled?: boolean;
}

// Enhanced step types with all available actions
const stepTypes = [
  // Communication & Notifications
  { type: 'sms', title: 'Send SMS', icon: 'message-text', color: '#2196F3', category: 'Communication' },
  { type: 'email', title: 'Send Email', icon: 'email', color: '#4CAF50', category: 'Communication' },
  { type: 'notification', title: 'Show Notification', icon: 'bell', color: '#FF9800', category: 'Communication' },
  
  // Input & Prompts
  { type: 'prompt_input', title: 'Ask for Input', icon: 'form-textbox', color: '#9C27B0', category: 'Input & Prompts' },
  { type: 'variable', title: 'Set Variable', icon: 'variable', color: '#795548', category: 'Input & Prompts' },
  
  // Web & Data
  { type: 'webhook', title: 'Call Webhook', icon: 'webhook', color: '#E91E63', category: 'Web & Data' },
  { type: 'http', title: 'HTTP Request', icon: 'api', color: '#3F51B5', category: 'Web & Data' },
  { type: 'json', title: 'Parse JSON', icon: 'code-json', color: '#00BCD4', category: 'Web & Data' },
  
  // Device & System
  { type: 'location', title: 'Get/Share Location', icon: 'map-marker', color: '#F44336', category: 'Device & System' },
  { type: 'wifi', title: 'Control WiFi', icon: 'wifi', color: '#607D8B', category: 'Device & System' },
  { type: 'bluetooth', title: 'Control Bluetooth', icon: 'bluetooth', color: '#795548', category: 'Device & System' },
  { type: 'brightness', title: 'Set Brightness', icon: 'brightness-6', color: '#FFC107', category: 'Device & System' },
  { type: 'volume', title: 'Set Volume', icon: 'volume-high', color: '#E91E63', category: 'Device & System' },
  
  // Apps & Services
  { type: 'open-app', title: 'Open App', icon: 'application', color: '#009688', category: 'Apps & Services' },
  { type: 'shortcut', title: 'Run Shortcut', icon: 'play-circle', color: '#FF5722', category: 'Apps & Services' },
  
  // Media & Content
  { type: 'photo', title: 'Take/Select Photo', icon: 'camera', color: '#E91E63', category: 'Media & Content' },
  { type: 'clipboard', title: 'Clipboard Actions', icon: 'clipboard', color: '#607D8B', category: 'Media & Content' },
  
  // Control Flow & Logic
  { type: 'wait', title: 'Wait/Delay', icon: 'clock', color: '#9E9E9E', category: 'Control Flow' },
  { type: 'delay', title: 'Timed Delay', icon: 'timer', color: '#795548', category: 'Control Flow' },
  { type: 'condition', title: 'If/Then Condition', icon: 'source-branch', color: '#673AB7', category: 'Control Flow' },
  { type: 'loop', title: 'Repeat Loop', icon: 'repeat', color: '#CDDC39', category: 'Control Flow' },
  
  // Math & Calculations
  { type: 'math', title: 'Math Operations', icon: 'calculator', color: '#FF5722', category: 'Math & Logic' },
];

const BuildScreen: React.FC = memo(() => {
  const theme = useSafeTheme();
  const navigation = useNavigation();
  const { user } = useSelector((state: RootState) => state.auth);
  const [createAutomation, { isLoading: isSaving }] = useCreateAutomationMutation();
  
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
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'warning'; message: string; visible: boolean }>({ 
    type: 'success', 
    message: '', 
    visible: false 
  });
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState('all');
  
  // Animation refs
  const headerAnimValue = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const testProgressWidth = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Use optimized components for step management
  const { stepStats, stepValidation } = useOptimizedComponents({
    steps,
    onStepUpdate: (index, updates) => {
      const step = steps[index];
      if (step) {
        handleUpdateStep(step.id, updates);
      }
    },
    onStepRemove: (index) => {
      const step = steps[index];
      if (step) {
        handleDeleteStep(step.id);
      }
    },
    onStepToggle: (index) => {
      const step = steps[index];
      if (step) {
        handleUpdateStep(step.id, { enabled: !step.enabled });
      }
    },
  });
  
  // Entry animation effect
  useEffect(() => {
    if (FEATURE_FLAGS.ENHANCED_ANIMATIONS) {
      Animated.timing(headerAnimValue, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    } else {
      headerAnimValue.setValue(1);
    }
  }, [headerAnimValue]);

  // Haptic feedback helper
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (FEATURE_FLAGS.HAPTIC_FEEDBACK) {
      try {
        switch (type) {
          case 'light':
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            break;
          case 'medium':
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            break;
          case 'heavy':
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            break;
        }
      } catch (error) {
        // Haptics not supported, continue silently
      }
    }
  }, []);

  const showFeedback = useCallback((type: 'success' | 'error' | 'warning', message: string) => {
    setFeedback({ type, message, visible: true });
    setTimeout(() => setFeedback(prev => ({ ...prev, visible: false })), 3000);
  }, []);

  const handleAddStep = useCallback((stepType: any) => {
    try {
      triggerHaptic('medium');
      
      const newStep: AutomationStep = {
        id: uuidv4(),
        type: stepType.type,
        title: stepType.title,
        icon: stepType.icon,
        color: stepType.color,
        config: {},
        enabled: true,
      };

      setSteps(prev => [...prev, newStep]);
      setIsStepPickerVisible(false);
      showFeedback('success', `Added ${stepType.title} step`);
    } catch (error) {
      EventLogger.error('UI', 'Error adding step:', error as Error);
      showFeedback('error', 'Failed to add step');
    }
  }, [triggerHaptic, showFeedback]);

  const handleUpdateStep = useCallback((stepId: string, updates: Partial<AutomationStep>) => {
    try {
      setSteps(prev => prev.map(step => 
        step.id === stepId ? { ...step, ...updates } : step
      ));
      
      if (updates.enabled !== undefined) {
        triggerHaptic('light');
        showFeedback('success', updates.enabled ? 'Step enabled' : 'Step disabled');
      }
    } catch (error) {
      EventLogger.error('UI', 'Error updating step:', error as Error);
      showFeedback('error', 'Failed to update step');
    }
  }, [triggerHaptic, showFeedback]);

  const handleDeleteStep = useCallback((stepId: string) => {
    try {
      triggerHaptic('heavy');
      
      setSteps(prev => prev.filter(step => step.id !== stepId));
      showFeedback('success', 'Step removed');
    } catch (error) {
      EventLogger.error('UI', 'Error deleting step:', error as Error);
      showFeedback('error', 'Failed to remove step');
    }
  }, [triggerHaptic, showFeedback]);

  const handleConfigureStep = useCallback((step: AutomationStep) => {
    try {
      setSelectedStep(step);
      setStepConfig(step.config || {});
      setIsConfigModalVisible(true);
      triggerHaptic('light');
    } catch (error) {
      EventLogger.error('UI', 'Error opening step config:', error as Error);
      showFeedback('error', 'Failed to open step configuration');
    }
  }, [triggerHaptic, showFeedback]);

  const handleSaveStepConfig = useCallback(() => {
    try {
      if (!selectedStep) return;

      handleUpdateStep(selectedStep.id, { config: stepConfig });
      setIsConfigModalVisible(false);
      setSelectedStep(null);
      setStepConfig({});
      showFeedback('success', 'Step configuration saved');
    } catch (error) {
      EventLogger.error('UI', 'Error saving step config:', error as Error);
      showFeedback('error', 'Failed to save configuration');
    }
  }, [selectedStep, stepConfig, handleUpdateStep, showFeedback]);

  const handleUseTemplate = useCallback((template: AutomationTemplate) => {
    try {
      triggerHaptic('medium');
      
      const templateSteps = template.steps.map((stepData: any) => ({
        id: uuidv4(),
        type: stepData.type,
        title: stepData.title,
        icon: stepData.icon || 'cog',
        color: stepData.color || '#8B5CF6',
        config: stepData.config || {},
        enabled: stepData.enabled !== false,
      }));

      setSteps(templateSteps);
      setAutomationName(template.title);
      setAutomationDescription(template.description);
      showFeedback('success', `Applied ${template.title} template`);
    } catch (error) {
      EventLogger.error('UI', 'Error applying template:', error as Error);
      showFeedback('error', 'Failed to apply template');
    }
  }, [triggerHaptic, showFeedback]);

  const handleTestAutomation = useCallback(async () => {
    if (steps.length === 0) {
      showFeedback('warning', 'Add some steps first');
      return;
    }

    try {
      triggerHaptic('medium');
      setIsTesting(true);
      setTestProgress(0);
      
      // Animate progress bar
      if (FEATURE_FLAGS.ENHANCED_ANIMATIONS) {
        Animated.timing(testProgressWidth, {
          toValue: screenWidth - 40,
          duration: 2000,
          useNativeDriver: false,
        }).start();
      }

      // Simulate testing steps
      for (let i = 0; i < steps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setTestProgress((i + 1) / steps.length);
      }

      showFeedback('success', 'Test completed successfully!');
      triggerHaptic('heavy');
    } catch (error) {
      EventLogger.error('UI', 'Error testing automation:', error as Error);
      showFeedback('error', 'Test failed');
    } finally {
      setIsTesting(false);
      testProgressWidth.setValue(0);
    }
  }, [steps, triggerHaptic, showFeedback, testProgressWidth]);

  const handleSaveAutomation = useCallback(async () => {
    if (!automationName.trim()) {
      showFeedback('warning', 'Please enter an automation name');
      return;
    }

    if (steps.length === 0) {
      showFeedback('warning', 'Add some steps first');
      return;
    }

    try {
      triggerHaptic('heavy');
      
      const automationData = {
        name: automationName.trim(),
        description: automationDescription.trim(),
        steps: steps.map(({ id, ...step }) => step),
        user_id: user?.id,
        is_public: false,
        created_at: new Date().toISOString(),
      };

      await createAutomation(automationData).unwrap();
      
      showFeedback('success', 'Automation saved successfully!');
      
      // Reset form
      setSteps([]);
      setAutomationName('');
      setAutomationDescription('');
      
      // Navigate back or to automations list
      navigation.goBack();
    } catch (error) {
      EventLogger.error('UI', 'Error saving automation:', error as Error);
      showFeedback('error', 'Failed to save automation');
    }
  }, [automationName, automationDescription, steps, user?.id, createAutomation, triggerHaptic, showFeedback, navigation]);

  const handleReorderSteps = useCallback((data: AutomationStep[]) => {
    try {
      setSteps(data);
      triggerHaptic('light');
    } catch (error) {
      EventLogger.error('UI', 'Error reordering steps:', error as Error);
      showFeedback('error', 'Failed to reorder steps');
    }
  }, [triggerHaptic, showFeedback]);

  // Get filtered templates from the service
  const getFilteredTemplates = useCallback(() => {
    let templates = AutomationTemplateService.getAllTemplates();
    
    if (selectedTemplateCategory === 'popular') {
      templates = AutomationTemplateService.getPopularTemplates();
    } else if (selectedTemplateCategory !== 'all') {
      templates = AutomationTemplateService.getTemplatesByCategory(selectedTemplateCategory);
    }
    
    return templates.slice(0, 6); // Show first 6 for a 2x3 grid
  }, [selectedTemplateCategory]);

  // Filter step types based on search and category
  const filteredStepTypes = stepTypes.filter(stepType => {
    const matchesSearch = stepType.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         stepType.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || stepType.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = ['All', ...Array.from(new Set(stepTypes.map(step => step.category)))];
  const templateCategories = ['all', 'popular', ...AutomationTemplateService.getCategories().map(c => c.id)];

  const renderStepCard = useCallback(({ item, index, drag, isActive }: { item: AutomationStep; index: number; drag: () => void; isActive: boolean }) => {
    return (
      <View style={[styles.stepCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.stepCardContent}>
          {/* Step number */}
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>{index + 1}</Text>
          </View>
          
          {/* Step icon */}
          <View style={[styles.stepIconContainer, { backgroundColor: item.color }]}>
            <MaterialCommunityIcons 
              name={item.icon as any} 
              size={24} 
              color="white" 
            />
          </View>
          
          {/* Step info */}
          <View style={styles.stepInfo}>
            <Text style={[styles.stepTitle, { color: theme.colors.onSurface }]}>
              {item.title}
            </Text>
            <Text style={[styles.stepType, { color: theme.colors.onSurfaceVariant }]}>
              {item.type}
            </Text>
          </View>
          
          {/* Step controls */}
          <View style={styles.stepControls}>
            <TouchableOpacity
              onPress={() => handleUpdateStep(item.id, { enabled: !item.enabled })}
              style={styles.toggleButton}
            >
              <MaterialCommunityIcons
                name={item.enabled ? 'toggle-switch' : 'toggle-switch-off'}
                size={24}
                color={item.enabled ? item.color : '#ccc'}
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => handleConfigureStep(item)}
              style={styles.configButton}
            >
              <MaterialCommunityIcons 
                name="cog" 
                size={20} 
                color={theme.colors.onSurfaceVariant} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => handleDeleteStep(item.id)}
              style={styles.deleteButton}
            >
              <MaterialCommunityIcons 
                name="delete" 
                size={20} 
                color="#F44336" 
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={drag}
              style={styles.dragHandle}
            >
              <MaterialCommunityIcons 
                name="drag" 
                size={20} 
                color={theme.colors.onSurfaceVariant} 
              />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Connection line */}
        {index < steps.length - 1 && (
          <View style={styles.connectionLine}>
            <View style={[styles.connectionDot, { backgroundColor: item.color }]} />
            <View style={[styles.connectionLineSegment, { backgroundColor: item.color + '40' }]} />
          </View>
        )}
      </View>
    );
  }, [handleConfigureStep, handleDeleteStep, handleUpdateStep, steps.length, theme]);

  const renderStepType = useCallback(({ item }: { item: any }) => {
    // Ensure gradient colors are safe
    const safeGradientColors = [`${item.color || '#8B5CF6'}15`, `${item.color || '#8B5CF6'}05`];
    
    return (
      <TouchableOpacity
        style={styles.stepTypeItem}
        onPress={() => {
          handleAddStep(item);
          triggerHaptic('medium');
        }}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={safeGradientColors}
          style={styles.stepTypeItemGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={[styles.stepTypeIcon, { backgroundColor: item.color || '#8B5CF6' }]}>
            <MaterialCommunityIcons name={item.icon as any} size={24} color="white" />
          </View>
          <View style={styles.stepTypeInfo}>
            <Text style={[styles.stepTypeTitle, { color: theme.colors.onSurface }]}>
              {item.title}
            </Text>
            <Text style={[styles.stepTypeCategory, { color: theme.colors.onSurfaceVariant }]}>
              {item.category}
            </Text>
          </View>
          <MaterialCommunityIcons 
            name="chevron-right" 
            size={20} 
            color={theme.colors.onSurfaceVariant}
            style={{ opacity: 0.5 }}
          />
        </LinearGradient>
      </TouchableOpacity>
    );
  }, [handleAddStep, triggerHaptic, theme]);

  const renderTemplate = useCallback(({ item }: { item: AutomationTemplate }) => {
    // Create gradient from template color
    const baseColor = item.color || '#8B5CF6';
    const safeGradient = [baseColor, `${baseColor}CC`];
      
    return (
      <TouchableOpacity
        style={styles.templateCard}
        onPress={() => handleUseTemplate(item)}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={safeGradient}
          style={styles.templateGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.templateHeader}>
            <MaterialCommunityIcons name={item.icon as any} size={32} color="white" />
            <View style={styles.templateStepCount}>
              <Text style={styles.templateStepCountText}>
                {item.steps?.length || 0} steps
              </Text>
            </View>
          </View>
          <Text style={styles.templateName}>{item.title}</Text>
          <Text style={styles.templateDescription} numberOfLines={2}>
            {item.description}
          </Text>
          <View style={styles.templateMeta}>
            <Text style={styles.templateTime}>{item.estimatedTime}</Text>
            {item.isPopular && (
              <MaterialCommunityIcons name="star" size={16} color="#FFD700" />
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }, [handleUseTemplate]);

  const renderTemplateCategoryChip = useCallback((category: string) => {
    const isSelected = selectedTemplateCategory === category;
    const displayName = category === 'all' ? 'All' : 
                       category === 'popular' ? 'Popular' :
                       category === 'productivity' ? 'Productivity' :
                       category === 'emergency' ? 'Emergency' :
                       AutomationTemplateService.getCategories().find(c => c.id === category)?.name || category;
    
    const iconName = category === 'all' ? 'view-grid' :
                    category === 'popular' ? 'star' :
                    category === 'productivity' ? 'briefcase' :
                    category === 'emergency' ? 'alert' :
                    'folder';
    
    return (
      <TouchableOpacity
        key={category}
        style={[
          styles.templateCategoryChip,
          {
            backgroundColor: isSelected ? theme.colors.primary : theme.colors.surfaceVariant,
          }
        ]}
        onPress={() => setSelectedTemplateCategory(category)}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons 
          name={iconName as any} 
          size={16} 
          color={isSelected ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
          style={{ marginRight: 6 }}
        />
        <Text
          style={[
            styles.templateCategoryChipText,
            {
              color: isSelected ? theme.colors.onPrimary : theme.colors.onSurfaceVariant,
            }
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {displayName}
        </Text>
      </TouchableOpacity>
    );
  }, [selectedTemplateCategory, theme]);

  // Authentication check - disabled for demo
  // if (!user) {
  //   return (
  //     <ErrorState
  //       title="Authentication Required"
  //       description="Please sign in to create automations"
  //       action={{
  //         label: "Sign In",
  //         onPress: () => navigation.navigate('Auth' as never),
  //       }}
  //     />
  //   );
  // }

  return (
    <ScreenErrorBoundary 
      screenName="Automation Builder"
      onError={(error, errorInfo) => {
        EventLogger.error('BuildScreen', 'Screen-level error caught', error, {
          componentStack: errorInfo.componentStack,
          userId: user?.id,
          automationStepsCount: steps.length,
        });
      }}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Animated Header */}
      <Animated.View 
        style={[
          styles.header,
          FEATURE_FLAGS.GRADIENT_HEADERS && {
            opacity: headerAnimValue,
            transform: [{ translateY: Animated.multiply(headerAnimValue, -20) }],
          }
        ]}
      >
        {FEATURE_FLAGS.GRADIENT_HEADERS ? (
          <GradientHeader title="Build Automation" />
        ) : (
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => navigation.goBack()}
            >
              <MaterialCommunityIcons 
                name="arrow-left" 
                size={24} 
                color={theme.colors.onSurface} 
              />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
              Build Automation
            </Text>
            <TouchableOpacity 
              style={styles.headerAction} 
              onPress={() => navigation.navigate('TemplatesScreen' as never)}
            >
              <MaterialCommunityIcons 
                name="template" 
                size={24} 
                color={theme.colors.onSurface} 
              />
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      {/* Feedback Toast */}
      {feedback.visible && (
        <FeedbackAnimation
          type={feedback.type}
          message={feedback.message}
          visible={feedback.visible}
        />
      )}

      {/* Main Content - Use different containers based on content */}
      {steps.length > 0 ? (
        <View style={styles.contentWithSteps}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContentWithSteps}
            showsVerticalScrollIndicator={false}
            onScroll={FEATURE_FLAGS.ENHANCED_ANIMATIONS ? (event: any) => {
              scrollY.setValue(event.nativeEvent.contentOffset.y);
            } : undefined}
          >
            {/* Automation Info */}
            <View style={styles.section}>
              <AnimatedSectionHeader title="Automation Details" />
              <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <TextInput
                mode="outlined"
                label="Automation Name"
                style={styles.input}
                placeholder="Enter automation name"
                value={automationName}
                onChangeText={setAutomationName}
                theme={{ colors: { primary: theme.colors.primary } }}
                />
                <TextInput
                  mode="outlined"
                  label="Description (optional)"
                  style={styles.textArea}
                  placeholder="Enter automation description"
                  value={automationDescription}
                  onChangeText={setAutomationDescription}
                  multiline
                  numberOfLines={3}
                  theme={{ colors: { primary: theme.colors.primary } }}
                />
              </View>
            </View>
          </ScrollView>
          
          {/* Steps Section - Outside ScrollView */}
          <View style={styles.stepsSection}>
            <View style={styles.sectionHeader}>
              <AnimatedSectionHeader title="Steps" />
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => setIsStepPickerVisible(true)}
              >
                <MaterialCommunityIcons name="plus" size={24} color={theme.colors.onPrimary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.stepsContainer}>
              <FlatList
                data={steps}
                renderItem={({ item, index }) => renderStepCard({ item, index, drag: () => {}, isActive: false })}
                keyExtractor={item => item.id}
                style={styles.stepsList}
                contentContainerStyle={styles.stepsListContent}
              />
            </View>
            
            {/* Stats */}
            {stepStats && (
              <View style={styles.statsSection}>
                <Text style={[styles.statsText, { color: theme.colors.onSurfaceVariant }]}>
                  {stepStats.total} steps • {stepStats.enabled} enabled • {stepStats.configured} configured
                </Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={FEATURE_FLAGS.ENHANCED_ANIMATIONS ? (event: any) => {
            scrollY.setValue(event.nativeEvent.contentOffset.y);
          } : undefined}
        >
          {/* Automation Info */}
          <View style={styles.section}>
            <AnimatedSectionHeader title="Automation Details" />
            <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              <TextInput
                mode="outlined"
                label="Automation Name"
                style={styles.input}
                placeholder="Enter automation name"
                value={automationName}
                onChangeText={setAutomationName}
                theme={{ colors: { primary: theme.colors.primary } }}
              />
              <TextInput
                mode="outlined"
                label="Description (optional)"
                style={styles.textArea}
                placeholder="Enter automation description"
                value={automationDescription}
                onChangeText={setAutomationDescription}
                multiline
                numberOfLines={3}
                theme={{ colors: { primary: theme.colors.primary } }}
              />
            </View>
          </View>

          {/* Quick Templates Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <AnimatedSectionHeader title="Quick Templates" />
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => navigation.navigate('TemplatesScreen' as never)}
              >
                <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>View All</Text>
                <MaterialCommunityIcons 
                  name="chevron-right" 
                  size={16} 
                  color={theme.colors.primary} 
                />
              </TouchableOpacity>
            </View>
            
            {/* Template Category Filter */}
            <View style={{ height: 60, marginBottom: 16, overflow: 'visible' }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ flex: 1 }}
                contentContainerStyle={styles.templateCategoryScrollContent}
                alwaysBounceHorizontal={false}
                bounces={false}
              >
                {templateCategories.slice(0, 5).map(renderTemplateCategoryChip)}
              </ScrollView>
            </View>
            
            <View style={styles.templatesGrid}>
              {getFilteredTemplates().map((template) => (
                <View key={template.id} style={styles.templateGridItem}>
                  {renderTemplate({ item: template })}
                </View>
              ))}
            </View>
          </View>

          {/* Steps Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <AnimatedSectionHeader title="Steps" />
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => setIsStepPickerVisible(true)}
              >
                <MaterialCommunityIcons name="plus" size={24} color={theme.colors.onPrimary} />
              </TouchableOpacity>
            </View>

            <EmptyState
              icon="puzzle"
              title="No Steps Yet"
              description="Add your first step to get started or choose from a template above"
              action={{
                label: "Add Step",
                onPress: () => setIsStepPickerVisible(true),
              }}
            />
          </View>
        </ScrollView>
      )}

      {/* Footer */}
      {steps.length > 0 && (
        <View style={[styles.footer, { backgroundColor: theme.colors.surface }]}>
          {isTesting && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { backgroundColor: theme.colors.surfaceVariant }]}>
                {FEATURE_FLAGS.ENHANCED_ANIMATIONS ? (
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: theme.colors.primary,
                        width: testProgressWidth,
                      }
                    ]}
                  />
                ) : (
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: theme.colors.primary,
                        width: `${testProgress * 100}%`,
                      }
                    ]}
                  />
                )}
              </View>
              <Text style={[styles.progressText, { color: theme.colors.onSurface }]}>
                Testing... {Math.round(testProgress * 100)}%
              </Text>
            </View>
          )}

          <View style={styles.footerButtons}>
            <TouchableOpacity
              style={[
                styles.testButton,
                { 
                  borderColor: theme.colors.primary,
                  backgroundColor: 'transparent'
                },
                isTesting && styles.testButtonDisabled,
              ]}
              onPress={handleTestAutomation}
              disabled={isTesting}
              activeOpacity={0.8}
            >
              {isTesting ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <MaterialCommunityIcons 
                  name="play" 
                  size={20} 
                  color={theme.colors.primary} 
                />
              )}
              <Text style={[styles.testButtonText, { color: theme.colors.primary }]}>
                {isTesting ? 'Testing...' : 'Test'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleSaveAutomation}
              disabled={isSaving || !automationName.trim()}
            >
              <Text style={[styles.saveButtonText, { color: 'white' }]}>
                {isSaving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Step Picker Modal */}
      <Modal
        visible={isStepPickerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsStepPickerVisible(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {FEATURE_FLAGS.BLUR_EFFECTS ? (
            <BlurView intensity={20} style={StyleSheet.absoluteFill} />
          ) : null}
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
                Add Step
              </Text>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setIsStepPickerVisible(false)}
              >
                <MaterialCommunityIcons 
                  name="close" 
                  size={24} 
                  color={theme.colors.onSurface} 
                />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={[styles.searchContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
              <MaterialCommunityIcons 
                name="magnify" 
                size={20} 
                color={theme.colors.onSurfaceVariant} 
              />
              <RNTextInput
                style={[styles.searchInput, { color: theme.colors.onSurface }]}
                placeholder="Search steps..."
                placeholderTextColor={theme.colors.onSurfaceVariant}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  style={styles.clearSearchButton}
                >
                  <MaterialCommunityIcons 
                    name="close-circle" 
                    size={18} 
                    color={theme.colors.onSurfaceVariant} 
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Categories */}
            <View style={{ height: 60, marginBottom: 20, overflow: 'visible' }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ flex: 1 }}
                contentContainerStyle={styles.categoryScrollContent}
              >
              {categories.map(category => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: selectedCategory === category 
                        ? theme.colors.primary 
                        : theme.colors.surfaceVariant,
                    }
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      {
                        color: selectedCategory === category 
                          ? theme.colors.onPrimary 
                          : theme.colors.onSurfaceVariant,
                      }
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
              </ScrollView>
            </View>

            {/* Step count indicator */}
            <View style={styles.stepCountContainer}>
              <Text style={[styles.stepCountText, { color: theme.colors.onSurfaceVariant }]}>
                {filteredStepTypes.length} {filteredStepTypes.length === 1 ? 'step' : 'steps'} available
              </Text>
            </View>

            {/* Step Types List */}
            <View style={styles.stepTypesContainer}>
              {filteredStepTypes.length > 0 ? (
                <FlatList
                  data={filteredStepTypes}
                  renderItem={renderStepType}
                  keyExtractor={item => item.type}
                  style={styles.stepTypesList}
                  contentContainerStyle={styles.stepTypesListContent}
                  showsVerticalScrollIndicator={false}
                  ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                  initialNumToRender={10}
                  maxToRenderPerBatch={10}
                  windowSize={10}
                />
              ) : (
                <View style={styles.noResultsContainer}>
                  <MaterialCommunityIcons 
                    name="magnify-close" 
                    size={48} 
                    color={theme.colors.onSurfaceVariant}
                    style={{ opacity: 0.5 }}
                  />
                  <Text style={[styles.noResultsText, { color: theme.colors.onSurfaceVariant }]}>
                    No steps found matching "{searchQuery}"
                  </Text>
                  <TouchableOpacity
                    style={[styles.clearSearchButton2, { backgroundColor: theme.colors.primary }]}
                    onPress={() => {
                      setSearchQuery('');
                      setSelectedCategory('All');
                    }}
                  >
                    <Text style={{ color: theme.colors.onPrimary, fontWeight: '600' }}>
                      Clear Search
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Step Config Modal */}
      <Modal
        visible={isConfigModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsConfigModalVisible(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {FEATURE_FLAGS.BLUR_EFFECTS ? (
            <BlurView intensity={20} style={StyleSheet.absoluteFill} />
          ) : null}
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <View style={styles.configHeaderInfo}>
                {selectedStep && (
                  <View style={[styles.configStepIcon, { backgroundColor: selectedStep.color }]}>
                    <MaterialCommunityIcons 
                      name={selectedStep.icon as any} 
                      size={20} 
                      color="white" 
                    />
                  </View>
                )}
                <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
                  {selectedStep?.title || 'Configure Step'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setIsConfigModalVisible(false)}
              >
                <MaterialCommunityIcons 
                  name="close" 
                  size={24} 
                  color={theme.colors.onSurface} 
                />
              </TouchableOpacity>
            </View>

            <View style={styles.configContainer}>
              {selectedStep && (
                <ModernStepConfigRenderer
                  step={selectedStep}
                  config={stepConfig}
                  onConfigChange={setStepConfig}
                  theme={theme}
                />
              )}
              <View style={styles.configSaveWrapper}>
                <TouchableOpacity
                  style={[styles.configSaveButton, { backgroundColor: theme.colors.primary }]}
                  onPress={handleSaveStepConfig}
                >
                  <Text style={[styles.configSaveButtonText, { color: 'white' }]}>
                    Save Configuration
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      </SafeAreaView>
    </ScreenErrorBoundary>
  );
});

BuildScreen.displayName = 'BuildScreen';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerAction: {
    padding: 8,
    marginRight: -8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  // New styles for layout with steps
  contentWithSteps: {
    flex: 1,
  },
  scrollContentWithSteps: {
    paddingBottom: 16,
  },
  stepsSection: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  stepsList: {
    flex: 1,
  },
  stepsListContent: {
    paddingBottom: 20,
  },
  section: {
    marginHorizontal: 24,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  card: {
    borderRadius: 20,
    padding: 24,
    marginTop: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  input: {
    marginBottom: 20,
  },
  textArea: {
    textAlignVertical: 'top',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Template styles
  templateCategoryScrollContent: {
    paddingLeft: 24,
    paddingRight: 16,
    alignItems: 'center',
    height: 60,
    paddingVertical: 8,
  },
  templateCategoryChip: {
    paddingHorizontal: 18,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  templateCategoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 16,
  },
  templatesList: {
    paddingLeft: 24,
    paddingRight: 8,
  },
  templatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  templateGridItem: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  templateCard: {
    width: '100%',
    height: 180,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  templateGradient: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  templateName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 6,
    marginTop: 12,
    letterSpacing: 0.3,
  },
  templateDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 12,
    lineHeight: 18,
  },
  templateStepCount: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  templateStepCountText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  templateMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  templateTime: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  stepsContainer: {
    marginTop: 8,
  },
  // Step card styles
  stepCard: {
    borderRadius: 16,
    marginHorizontal: 4,
    marginVertical: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  stepCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepIconContainer: {
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
  },
  stepType: {
    fontSize: 12,
    marginTop: 2,
    opacity: 0.7,
  },
  stepControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleButton: {
    padding: 4,
    marginRight: 8,
  },
  configButton: {
    padding: 8,
    marginRight: 4,
  },
  deleteButton: {
    padding: 8,
    marginRight: 4,
  },
  dragHandle: {
    padding: 8,
  },
  connectionLine: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  connectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 2,
  },
  connectionLineSegment: {
    width: 2,
    height: 12,
  },
  statsSection: {
    marginHorizontal: 20,
    alignItems: 'center',
  },
  statsText: {
    fontSize: 12,
  },
  footer: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 92, 246, 0.1)',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  testButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: 'transparent',
    gap: 8,
  },
  testButtonDisabled: {
    opacity: 0.5,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    height: '85%',
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  configHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  configStepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalClose: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  categoryScrollContent: {
    paddingHorizontal: 24,
    alignItems: 'center',
    paddingVertical: 8,
    height: 60,
  },
  categoryChip: {
    paddingHorizontal: 18,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 16,
  },
  stepTypesContainer: {
    flex: 1,
  },
  stepTypesList: {
    flex: 1,
  },
  stepTypesListContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  noResultsText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  clearSearchButton: {
    padding: 4,
  },
  clearSearchButton2: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  stepCountContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  stepCountText: {
    fontSize: 12,
    fontWeight: '500',
  },
  stepTypeItem: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  stepTypeItemGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  stepTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepTypeInfo: {
    flex: 1,
  },
  stepTypeTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  stepTypeCategory: {
    fontSize: 12,
    marginTop: 2,
    opacity: 0.7,
  },
  configContainer: {
    flex: 1,
    padding: 20,
  },
  configSaveWrapper: {
    marginTop: 20,
  },
  configSaveButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  configSaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BuildScreen;