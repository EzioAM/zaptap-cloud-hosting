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
  TextInput,
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
import { useSafeTheme } from '../../components/common/ThemeFallbackWrapper';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { useCreateAutomationMutation } from '../../store/api/automationApi';
import { useOptimizedComponents } from '../../hooks/useOptimizedComponents';
import { ErrorState } from '../../components/states/ErrorState';
import { EmptyState } from '../../components/states/EmptyState';
import { ModernStepConfigRenderer } from '../../components/automation/ModernStepConfigRenderer';
import { EnhancedStepCard } from '../../components/automation/EnhancedStepCard';
import {
  AnimatedSectionHeader,
  PressableAnimated,
  FeedbackAnimation,
  LoadingPulse,
  StaggeredContainer,
} from '../../components/automation/AnimationHelpers';
import {
  StepCounterBadge,
  ConnectionLine,
  DropZoneIndicator,
} from '../../components/automation/DragDropHelpers';

// Enhanced gradient components
import { GradientHeader } from '../../components/shared/GradientHeader';
import { GradientCard } from '../../components/shared/GradientCard';
import { GradientButton } from '../../components/shared/GradientButton';
import { EmptyStateIllustration } from '../../components/shared/EmptyStateIllustration';

// Enhanced theme imports
import { gradients, glassEffects, getGlassStyle } from '../../theme/gradients';
import { typography, fontWeights, textShadows } from '../../theme/typography';

// Animation constants
import { ANIMATION_CONFIG } from '../../constants/animations';

// Haptics
import * as Haptics from 'expo-haptics';
import { v4 as uuidv4 } from 'uuid';

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

interface AutomationStep {
  id: string;
  type: string;
  title: string;
  icon: string;
  color: string;
  config?: any;
  enabled?: boolean;
}

const stepTypes = [
  // Communication
  { type: 'sms', title: 'Send SMS', icon: 'message-text', color: '#2196F3', category: 'Communication' },
  { type: 'email', title: 'Send Email', icon: 'email', color: '#4CAF50', category: 'Communication' },
  { type: 'notification', title: 'Show Notification', icon: 'bell', color: '#FF9800', category: 'Communication' },
  
  // Web & Data
  { type: 'webhook', title: 'Call Webhook', icon: 'webhook', color: '#9C27B0', category: 'Web & Data' },
  { type: 'http', title: 'HTTP Request', icon: 'api', color: '#3F51B5', category: 'Web & Data' },
  { type: 'json', title: 'Parse JSON', icon: 'code-json', color: '#00BCD4', category: 'Web & Data' },
  
  // Device & System
  { type: 'location', title: 'Get Location', icon: 'map-marker', color: '#F44336', category: 'Device & System' },
  { type: 'wifi', title: 'Control WiFi', icon: 'wifi', color: '#795548', category: 'Device & System' },
  { type: 'bluetooth', title: 'Control Bluetooth', icon: 'bluetooth', color: '#607D8B', category: 'Device & System' },
  { type: 'brightness', title: 'Set Brightness', icon: 'brightness-6', color: '#FFC107', category: 'Device & System' },
  { type: 'volume', title: 'Set Volume', icon: 'volume-high', color: '#E91E63', category: 'Device & System' },
  
  // Apps & Services
  { type: 'open-app', title: 'Open App', icon: 'application', color: '#009688', category: 'Apps & Services' },
  { type: 'shortcut', title: 'Run Shortcut', icon: 'play-circle', color: '#FF5722', category: 'Apps & Services' },
  
  // Control Flow
  { type: 'wait', title: 'Wait', icon: 'clock', color: '#9E9E9E', category: 'Control Flow' },
  { type: 'condition', title: 'If/Then', icon: 'source-branch', color: '#673AB7', category: 'Control Flow' },
  { type: 'loop', title: 'Repeat', icon: 'repeat', color: '#CDDC39', category: 'Control Flow' },
];

const templates = [
  {
    id: 'morning',
    name: 'Morning Routine',
    icon: 'weather-sunny',
    color: '#FFC107',
    description: 'Start your day right',
    gradient: ['#FFC107', '#FFB300'],
    steps: [
      { type: 'wifi', title: 'Turn On WiFi', icon: 'wifi', color: '#795548', config: { enabled: true } },
      { type: 'brightness', title: 'Set Brightness', icon: 'brightness-6', color: '#FFC107', config: { level: 80 } },
      { type: 'notification', title: 'Good Morning', icon: 'bell', color: '#FF9800', config: { message: 'Have a great day!' } },
    ],
  },
  {
    id: 'meeting',
    name: 'Meeting Mode',
    icon: 'briefcase',
    color: '#9C27B0',
    description: 'Silence distractions',
    gradient: ['#9C27B0', '#8E24AA'],
    steps: [
      { type: 'volume', title: 'Silent Mode', icon: 'volume-high', color: '#E91E63', config: { level: 0 } },
      { type: 'notification', title: 'In Meeting', icon: 'bell', color: '#FF9800', config: { message: 'In a meeting' } },
    ],
  },
  {
    id: 'bedtime',
    name: 'Bedtime',
    icon: 'weather-night',
    color: '#3F51B5',
    description: 'Wind down for sleep',
    gradient: ['#3F51B5', '#303F9F'],
    steps: [
      { type: 'brightness', title: 'Dim Screen', icon: 'brightness-6', color: '#FFC107', config: { level: 20 } },
      { type: 'wifi', title: 'Turn Off WiFi', icon: 'wifi', color: '#795548', config: { enabled: false } },
    ],
  },
  {
    id: 'workout',
    name: 'Workout',
    icon: 'run',
    color: '#4CAF50',
    description: 'Get pumped up',
    gradient: ['#4CAF50', '#388E3C'],
    steps: [
      { type: 'volume', title: 'Max Volume', icon: 'volume-high', color: '#E91E63', config: { level: 100 } },
      { type: 'open-app', title: 'Open Music', icon: 'application', color: '#009688', config: { app: 'music' } },
    ],
  },
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
  const [draggedStepIndex, setDraggedStepIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  
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

  const handleUseTemplate = useCallback((template: any) => {
    try {
      triggerHaptic('medium');
      
      const templateSteps = template.steps.map((stepData: any) => ({
        id: uuidv4(),
        type: stepData.type,
        title: stepData.title,
        icon: stepData.icon,
        color: stepData.color,
        config: stepData.config || {},
        enabled: true,
      }));

      setSteps(templateSteps);
      setAutomationName(template.name);
      setAutomationDescription(template.description);
      showFeedback('success', `Applied ${template.name} template`);
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

  // Filter step types based on search and category
  const filteredStepTypes = stepTypes.filter(stepType => {
    const matchesSearch = stepType.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         stepType.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || stepType.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = ['All', ...Array.from(new Set(stepTypes.map(step => step.category)))];

  const renderStepCard = useCallback(({ item, index, drag, isActive }: RenderItemParams<AutomationStep>) => {
    return (
      <ScaleDecorator>
        <EnhancedStepCard
          step={item}
          index={index}
          onConfigure={() => handleConfigureStep(item)}
          onDelete={() => handleDeleteStep(item.id)}
          onToggle={() => handleUpdateStep(item.id, { enabled: !item.enabled })}
          onDrag={drag}
          isActive={isActive}
          theme={theme}
          showConnectionLine={index < steps.length - 1}
        />
      </ScaleDecorator>
    );
  }, [handleConfigureStep, handleDeleteStep, handleUpdateStep, steps.length, theme]);

  const renderStepType = useCallback(({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.stepTypeItem}
      onPress={() => handleAddStep(item)}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={[`${item.color}15`, `${item.color}05`]}
        style={styles.stepTypeItemGradient}
      >
        <View style={[styles.stepTypeIcon, { backgroundColor: item.color }]}>
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
      </LinearGradient>
    </TouchableOpacity>
  ), [handleAddStep, theme]);

  const renderTemplate = useCallback(({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.templateCard}
      onPress={() => handleUseTemplate(item)}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={item.gradient}
        style={styles.templateGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.templateHeader}>
          <MaterialCommunityIcons name={item.icon as any} size={32} color="white" />
          <View style={styles.templateStepCount}>
            <Text style={styles.templateStepCountText}>
              {item.steps.length} steps
            </Text>
          </View>
        </View>
        <Text style={styles.templateName}>{item.name}</Text>
        <Text style={styles.templateDescription}>{item.description}</Text>
      </LinearGradient>
    </TouchableOpacity>
  ), [handleUseTemplate]);

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
          automationStepsCount: automationSteps.length,
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
            <View style={styles.headerRight} />
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
              style={[styles.input, { 
                color: theme.colors.onSurface,
                borderColor: theme.colors.outline 
              }]}
              placeholder="Automation Name"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={automationName}
              onChangeText={setAutomationName}
            />
            <TextInput
              style={[styles.textArea, { 
                color: theme.colors.onSurface,
                borderColor: theme.colors.outline 
              }]}
              placeholder="Description (optional)"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={automationDescription}
              onChangeText={setAutomationDescription}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Templates Section */}
        {steps.length === 0 && (
          <View style={styles.section}>
            <AnimatedSectionHeader title="Quick Templates" />
            <FlatList
              data={templates}
              renderItem={renderTemplate}
              keyExtractor={item => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.templatesList}
            />
          </View>
        )}

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

          {steps.length === 0 ? (
            <EmptyState
              icon="puzzle"
              title="No Steps Yet"
              description="Add your first step to get started"
              action={{
                label: "Add Step",
                onPress: () => setIsStepPickerVisible(true),
              }}
            />
          ) : (
            <View style={styles.stepsContainer}>
              {FEATURE_FLAGS.STAGGERED_ANIMATIONS ? (
                <StaggeredContainer delay={100}>
                  <DraggableFlatList
                    data={steps}
                    renderItem={renderStepCard}
                    keyExtractor={item => item.id}
                    onDragEnd={({ data }) => handleReorderSteps(data)}
                    activationDistance={20}
                  />
                </StaggeredContainer>
              ) : (
                <DraggableFlatList
                  data={steps}
                  renderItem={renderStepCard}
                  keyExtractor={item => item.id}
                  onDragEnd={({ data }) => handleReorderSteps(data)}
                  activationDistance={20}
                />
              )}
            </View>
          )}
        </View>

        {/* Stats */}
        {steps.length > 0 && stepStats && (
          <View style={styles.statsSection}>
            <Text style={[styles.statsText, { color: theme.colors.onSurfaceVariant }]}>
              {stepStats.total} steps • {stepStats.enabled} enabled • {stepStats.configured} configured
            </Text>
          </View>
        )}
      </ScrollView>

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

            <GradientButton
              title={isSaving ? 'Saving...' : 'Save'}
              onPress={handleSaveAutomation}
              disabled={isSaving || !automationName.trim()}
              loading={isSaving}
              style={styles.saveButton}
            />
          </View>
        </View>
      )}

      {/* Step Picker Modal */}
      <Modal
        visible={isStepPickerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalOverlay}>
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
              <TextInput
                style={[styles.searchInput, { color: theme.colors.onSurface }]}
                placeholder="Search steps..."
                placeholderTextColor={theme.colors.onSurfaceVariant}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Categories */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
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

            {/* Step Types List */}
            <FlatList
              data={filteredStepTypes}
              renderItem={renderStepType}
              keyExtractor={item => item.type}
              style={styles.stepTypesList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      {/* Step Config Modal */}
      <Modal
        visible={isConfigModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalOverlay}>
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
                <GradientButton
                  title="Save Configuration"
                  onPress={handleSaveStepConfig}
                />
              </View>
            </View>
          </View>
        </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
  },
  input: {
    fontSize: 16,
    paddingVertical: 16,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  textArea: {
    fontSize: 16,
    paddingVertical: 16,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    textAlignVertical: 'top',
    minHeight: 60,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  templatesList: {
    paddingLeft: 20,
  },
  templateCard: {
    width: 200,
    height: 140,
    marginRight: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  templateGradient: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  templateName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 12,
  },
  templateStepCount: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  templateStepCountText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  stepsContainer: {
    marginTop: 8,
  },
  statsSection: {
    marginHorizontal: 20,
    alignItems: 'center',
  },
  statsText: {
    fontSize: 12,
  },
  footer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 92, 246, 0.1)',
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
    maxHeight: '85%',
    overflow: 'hidden',
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
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  categoryScroll: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  stepTypesList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepTypeItem: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  stepTypeItemGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
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
});

export default BuildScreen;