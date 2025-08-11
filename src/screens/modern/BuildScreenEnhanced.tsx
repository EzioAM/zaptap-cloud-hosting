import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  PanGestureHandler,
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
import { Alert } from 'react-native';
import { useOptimizedComponents } from '../../hooks/useOptimizedComponents';
import { ModernStepConfigRenderer } from '../../components/automation/ModernStepConfigRenderer';
import * as Haptics from 'expo-haptics';
import { v4 as uuidv4 } from 'uuid';

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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
  { type: 'facetime', title: 'FaceTime Call', icon: 'video', color: '#34C759', category: 'Communication' },
  { type: 'call', title: 'Phone Call', icon: 'phone', color: '#007AFF', category: 'Communication' },
  { type: 'share_text', title: 'Share Text', icon: 'share-variant', color: '#00BCD4', category: 'Communication' },
  
  // Web & Data
  { type: 'webhook', title: 'Call Webhook', icon: 'webhook', color: '#9C27B0', category: 'Web & Data' },
  { type: 'http_request', title: 'HTTP Request', icon: 'api', color: '#3F51B5', category: 'Web & Data' },
  { type: 'json_parser', title: 'Parse JSON', icon: 'code-json', color: '#00BCD4', category: 'Web & Data' },
  { type: 'variable', title: 'Set Variable', icon: 'variable', color: '#673AB7', category: 'Web & Data' },
  { type: 'get_variable', title: 'Get Variable', icon: 'variable-box', color: '#9C27B0', category: 'Web & Data' },
  
  // Device & System
  { type: 'location', title: 'Get Location', icon: 'map-marker', color: '#F44336', category: 'Device & System' },
  { type: 'photo', title: 'Camera/Photo', icon: 'camera', color: '#FF9800', category: 'Device & System' },
  { type: 'clipboard', title: 'Clipboard', icon: 'content-copy', color: '#9E9E9E', category: 'Device & System' },
  { type: 'qr_code', title: 'QR Code', icon: 'qrcode', color: '#212121', category: 'Device & System' },
  { type: 'wifi', title: 'Control WiFi', icon: 'wifi', color: '#795548', category: 'Device & System' },
  { type: 'bluetooth', title: 'Control Bluetooth', icon: 'bluetooth', color: '#607D8B', category: 'Device & System' },
  { type: 'brightness', title: 'Set Brightness', icon: 'brightness-6', color: '#FFC107', category: 'Device & System' },
  { type: 'volume', title: 'Set Volume', icon: 'volume-high', color: '#E91E63', category: 'Device & System' },
  
  // Text & Media
  { type: 'text', title: 'Text Operations', icon: 'format-text', color: '#009688', category: 'Text & Media' },
  { type: 'math', title: 'Math Operations', icon: 'calculator', color: '#FFC107', category: 'Text & Media' },
  { type: 'text_to_speech', title: 'Text to Speech', icon: 'volume-high', color: '#8BC34A', category: 'Text & Media' },
  { type: 'prompt_input', title: 'Prompt Input', icon: 'form-textbox', color: '#00BCD4', category: 'Text & Media' },
  { type: 'menu_selection', title: 'Menu Selection', icon: 'format-list-bulleted', color: '#4CAF50', category: 'Text & Media' },
  
  // Files & Storage
  { type: 'file', title: 'File Operations', icon: 'file', color: '#4CAF50', category: 'Files & Storage' },
  { type: 'cloud_storage', title: 'Cloud Storage', icon: 'cloud-upload', color: '#2196F3', category: 'Files & Storage' },
  
  // Apps & Services
  { type: 'app', title: 'Open App', icon: 'application', color: '#3F51B5', category: 'Apps & Services' },
  { type: 'open_url', title: 'Open URL', icon: 'open-in-new', color: '#2196F3', category: 'Apps & Services' },
  { type: 'external_automation', title: 'Run Automation', icon: 'play-circle', color: '#E91E63', category: 'Apps & Services' },
  
  // Control Flow
  { type: 'delay', title: 'Delay', icon: 'timer-sand', color: '#607D8B', category: 'Control Flow' },
  { type: 'condition', title: 'If/Then', icon: 'source-branch', color: '#673AB7', category: 'Control Flow' },
  { type: 'loop', title: 'Repeat', icon: 'repeat', color: '#CDDC39', category: 'Control Flow' },
  { type: 'group', title: 'Group Actions', icon: 'group', color: '#3F51B5', category: 'Control Flow' },
  { type: 'random', title: 'Random', icon: 'dice-multiple', color: '#FF6B6B', category: 'Control Flow' },
];

// Enhanced template definitions with gradient mappings
const templates = [
  {
    id: 'morning',
    name: 'Morning Routine',
    icon: 'weather-sunny',
    gradientKey: 'sunset',
    description: 'Start your day right with automated morning tasks',
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
    gradientKey: 'cosmic',
    description: 'Silence distractions and focus on what matters',
    steps: [
      { type: 'volume', title: 'Silent Mode', icon: 'volume-high', color: '#E91E63', config: { level: 0 } },
      { type: 'notification', title: 'In Meeting', icon: 'bell', color: '#FF9800', config: { message: 'In a meeting' } },
    ],
  },
  {
    id: 'bedtime',
    name: 'Bedtime',
    icon: 'weather-night',
    gradientKey: 'dark',
    description: 'Wind down for sleep with calming automations',
    steps: [
      { type: 'brightness', title: 'Dim Screen', icon: 'brightness-6', color: '#FFC107', config: { level: 20 } },
      { type: 'wifi', title: 'Turn Off WiFi', icon: 'wifi', color: '#795548', config: { enabled: false } },
    ],
  },
  {
    id: 'workout',
    name: 'Workout',
    icon: 'run',
    gradientKey: 'fire',
    description: 'Get pumped up with energy-boosting settings',
    steps: [
      { type: 'volume', title: 'Max Volume', icon: 'volume-high', color: '#E91E63', config: { level: 100 } },
      { type: 'app', title: 'Open Music', icon: 'application', color: '#009688', config: { appId: 'com.apple.Music' } },
    ],
  },
];

const categoryGradients = {
  'All': 'primary',
  'Communication': 'ocean',
  'Web & Data': 'aurora',
  'Device & System': 'forest',
  'Text & Media': 'warm',
  'Files & Storage': 'cool',
  'Apps & Services': 'sunset',
  'Control Flow': 'cosmic',
} as const;

export default function BuildScreenEnhanced() {
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

  // Animation refs
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const springAnim = useRef(new Animated.Value(0)).current;
  const nameInputFocus = useRef(new Animated.Value(0)).current;
  const descInputFocus = useRef(new Animated.Value(0)).current;
  const progressRing = useRef(new Animated.Value(0)).current;
  const abortControllerRef = useRef<AbortController | null>(null);

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

  useEffect(() => {
    // Entry animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: ANIMATION_CONFIG.ENTRY_ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.spring(springAnim, {
        toValue: 1,
        tension: ANIMATION_CONFIG.SPRING_TENSION,
        friction: ANIMATION_CONFIG.SPRING_FRICTION,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Animation cleanup
  useEffect(() => {
    return () => {
      // Cancel any running test
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // Stop all animations on unmount
      scrollY.stopAnimation();
      fadeAnim.stopAnimation();
      springAnim.stopAnimation();
      nameInputFocus.stopAnimation();
      descInputFocus.stopAnimation();
      progressRing.stopAnimation();
    };
  }, [scrollY, fadeAnim, springAnim, nameInputFocus, descInputFocus, progressRing]);

  const categories = ['All', 'Communication', 'Web & Data', 'Device & System', 'Apps & Services', 'Control Flow'];
  
  const filteredStepTypes = stepTypes.filter(step => 
    selectedCategory === 'All' || step.category === selectedCategory
  );

  const handleAddStep = (stepType: typeof stepTypes[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newStep: AutomationStep = {
      id: uuidv4(),
      type: stepType.type,
      title: stepType.title,
      icon: stepType.icon,
      color: stepType.color,
      config: {},
      enabled: true,
    };
    setSteps([...steps, newStep]);
    setIsStepPickerVisible(false);
    handleOpenStepConfig(newStep);
  };

  const handleDeleteStep = (stepId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSteps(steps.filter(s => s.id !== stepId));
  };

  const handleUpdateStep = (stepId: string, updates: Partial<AutomationStep>) => {
    setSteps(steps.map(s => s.id === stepId ? { ...s, ...updates } : s));
  };

  const handleOpenStepConfig = (step: AutomationStep) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedStep(step);
    setStepConfig(step.config || {});
    setIsConfigModalVisible(true);
  };

  const handleConfigSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (selectedStep) {
      handleUpdateStep(selectedStep.id, { config: stepConfig });
    }
    setIsConfigModalVisible(false);
    setStepConfig({});
  };

  const handleTestAutomation = async () => {
    // Cancel any existing test
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    if (steps.length === 0) {
      Alert.alert('Error', 'Please add at least one step to test');
      return;
    }

    setIsTesting(true);
    setTestProgress(0);
    
    // Start progress animation with abort check
    Animated.timing(progressRing, {
      toValue: 1,
      duration: steps.length * ANIMATION_CONFIG.STEP_EXECUTION_DURATION_PER_STEP,
      useNativeDriver: true,
    }).start();

    try {
      for (let i = 0; i < steps.length; i++) {
        if (signal.aborted) break;
        if (!steps[i].enabled) continue;
        
        setTestProgress(((i + 1) / steps.length) * 100);
        
        // Check for abort before delay
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(resolve, ANIMATION_CONFIG.STEP_EXECUTION_DELAY);
          signal.addEventListener('abort', () => {
            clearTimeout(timeout);
            reject(new Error('Test aborted'));
          });
        });
        
        if (!signal.aborted) {
          Alert.alert(
            'Step Executed',
            `${steps[i].title} completed successfully`,
            [{ text: 'Continue' }],
            { cancelable: false }
          );
        }
      }

      if (!signal.aborted) {
        Alert.alert('Test Complete', 'All steps executed successfully!');
      }
    } catch (error: any) {
      if (error.message !== 'Test aborted') {
        Alert.alert('Test Error', 'An error occurred during testing');
      }
    } finally {
      setIsTesting(false);
      setTestProgress(0);
      progressRing.setValue(0);
    }
  };

  const handleSaveAutomation = async () => {
    if (!automationName.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Please enter a name for your automation');
      return;
    }
    
    if (steps.length === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Please add at least one step to your automation');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const automationData = {
        name: automationName,
        description: automationDescription,
        is_active: true,
        steps: steps.map((step, index) => ({
          step_type: step.type,
          step_order: index + 1,
          config: step.config,
          is_enabled: step.enabled ?? true,
        })),
      };

      await createAutomation(automationData).unwrap();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Automation created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to create automation. Please try again.');
    }
  };

  const handleInputFocus = (inputType: 'name' | 'desc') => {
    const anim = inputType === 'name' ? nameInputFocus : descInputFocus;
    Animated.spring(anim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: false,
    }).start();
  };

  const handleInputBlur = (inputType: 'name' | 'desc') => {
    const anim = inputType === 'name' ? nameInputFocus : descInputFocus;
    Animated.spring(anim, {
      toValue: 0,
      tension: 100,
      friction: 8,
      useNativeDriver: false,
    }).start();
  };

  const renderStepItem = ({ item, drag, isActive }: RenderItemParams<AutomationStep>) => {
    return (
      <ScaleDecorator>
        <Animated.View
          style={[
            styles.stepItemContainer,
            isActive && styles.stepItemActive,
          ]}
        >
          <LinearGradient
            colors={
              isActive 
                ? (theme.dark ? ['rgba(99, 102, 241, 0.3)', 'rgba(139, 92, 246, 0.3)'] : ['rgba(99, 102, 241, 0.15)', 'rgba(139, 92, 246, 0.15)'])
                : (theme.dark ? ['rgba(40, 40, 40, 0.9)', 'rgba(30, 30, 30, 0.9)'] : ['rgba(255, 255, 255, 0.95)', 'rgba(245, 245, 245, 0.95)'])
            }
            style={styles.stepItemGradient}
          >
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handleOpenStepConfig(item);
              }}
              onLongPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                drag();
              }}
              disabled={isActive}
              style={[
                styles.stepItem,
                { backgroundColor: theme.colors?.surface || 'rgba(255, 255, 255, 0.1)' },
                isActive && styles.stepItemActiveStyle,
              ]}
            >
              <View style={styles.stepItemLeft}>
                <LinearGradient
                  colors={[item.color, item.color + '80']}
                  style={styles.stepIcon}
                >
                  <MaterialCommunityIcons 
                    name={item.icon as any} 
                    size={24} 
                    color="white" 
                  />
                </LinearGradient>
                <View style={styles.stepInfo}>
                  <Text style={[styles.stepTitle, { color: theme.colors?.onSurface || '#FFFFFF' }]}>
                    {item.title}
                  </Text>
                  {item.config && Object.keys(item.config).length > 0 && (
                    <View style={styles.configBadge}>
                      <MaterialCommunityIcons name="cog" size={12} color={theme.colors?.onSurfaceVariant || '#B0B0B0'} />
                      <Text style={[styles.stepConfigPreview, { color: theme.colors?.onSurfaceVariant || '#B0B0B0' }]}>
                        Configured
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.stepItemRight}>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    handleUpdateStep(item.id, { enabled: !item.enabled });
                  }}
                  style={styles.stepToggle}
                >
                  <MaterialCommunityIcons 
                    name={item.enabled ? 'toggle-switch' : 'toggle-switch-off'} 
                    size={32} 
                    color={item.enabled ? '#4CAF50' : '#ccc'} 
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    handleDeleteStep(item.id);
                  }}
                  style={styles.stepDelete}
                >
                  <LinearGradient
                    colors={['#FF6B6B', '#FF5252']}
                    style={styles.deleteButton}
                  >
                    <MaterialCommunityIcons 
                      name="close" 
                      size={16} 
                      color="white" 
                    />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </ScaleDecorator>
    );
  };

  const renderCategoryChip = (category: string, index: number) => {
    const isSelected = selectedCategory === category;
    const gradientKey = categoryGradients[category as keyof typeof categoryGradients] || 'primary';

    return (
      <TouchableOpacity
        key={category}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setSelectedCategory(category);
        }}
        style={styles.categoryChipContainer}
      >
        {isSelected ? (
          <LinearGradient
            colors={gradients[gradientKey].colors}
            start={gradients[gradientKey].start}
            end={gradients[gradientKey].end}
            style={styles.categoryChip}
          >
            <Text style={[styles.categoryChipText, styles.categoryChipTextActive]}>
              {category}
            </Text>
          </LinearGradient>
        ) : (
          <View style={[styles.categoryChip, styles.categoryChipInactive]}>
            <Text style={[styles.categoryChipText, { color: theme.colors?.onSurface || '#FFFFFF' }]}>
              {category}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors?.background || '#1A1A1A' }]}>
      <GradientHeader
        title="Build Automation"
        subtitle="Create powerful automations with simple steps"
        gradientKey="primary"
        showBack={true}
        scrollOffset={scrollY}
        animated={true}
      />

      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
        >
          {/* Templates Section */}
          <Animated.View 
            style={[
              styles.templatesSection,
              {
                opacity: fadeAnim,
                transform: [{ scale: springAnim }],
              },
            ]}
          >
            <Text style={[styles.templatesTitle, { color: theme.colors?.onSurface || '#FFFFFF' }]}>
              Quick Start Templates
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templatesScroll}>
              {templates.map((template, index) => (
                <GradientCard
                  key={template.id}
                  title={template.name}
                  subtitle={`${template.steps.length} steps`}
                  description={template.description}
                  icon={template.icon}
                  gradientKey={template.gradientKey as keyof typeof gradients}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setAutomationName(template.name);
                    setAutomationDescription(template.description);
                    setSteps(template.steps.map((step, stepIndex) => ({
                      ...step,
                      id: uuidv4(),
                      enabled: true,
                    })));
                  }}
                  delay={index * 100}
                  style={styles.templateCard}
                  elevated={true}
                />
              ))}
            </ScrollView>
          </Animated.View>

          {/* Name & Description */}
          <Animated.View style={[styles.inputSection, { opacity: fadeAnim }]}>
            <View style={[styles.glassCard, getGlassStyle(theme.dark ? 'dark' : 'light')]}>
              <View style={styles.inputContainer}>
                <Animated.View
                  style={[
                    styles.inputWrapper,
                    {
                      borderColor: nameInputFocus.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['#e0e0e0', gradients.primary.colors[0]],
                      }),
                      borderWidth: nameInputFocus.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 2],
                      }),
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.input, { color: theme.colors?.onSurface || '#FFFFFF' }]}
                    placeholder="Automation Name"
                    placeholderTextColor={theme.colors?.onSurfaceVariant || '#B0B0B0'}
                    value={automationName}
                    onChangeText={setAutomationName}
                    onFocus={() => handleInputFocus('name')}
                    onBlur={() => handleInputBlur('name')}
                  />
                  <Animated.View
                    style={[
                      styles.inputAccent,
                      {
                        opacity: nameInputFocus,
                        transform: [
                          {
                            scaleX: nameInputFocus,
                          },
                        ],
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={gradients.primary.colors}
                      start={gradients.primary.start}
                      end={gradients.primary.end}
                      style={StyleSheet.absoluteFillObject}
                    />
                  </Animated.View>
                </Animated.View>

                <Animated.View
                  style={[
                    styles.inputWrapper,
                    styles.textAreaWrapper,
                    {
                      borderColor: descInputFocus.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['#e0e0e0', gradients.primary.colors[0]],
                      }),
                      borderWidth: descInputFocus.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 2],
                      }),
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.input, styles.textArea, { color: theme.colors?.onSurface || '#FFFFFF' }]}
                    placeholder="Description (optional)"
                    placeholderTextColor={theme.colors?.onSurfaceVariant || '#B0B0B0'}
                    value={automationDescription}
                    onChangeText={setAutomationDescription}
                    multiline
                    numberOfLines={3}
                    onFocus={() => handleInputFocus('desc')}
                    onBlur={() => handleInputBlur('desc')}
                  />
                  <Animated.View
                    style={[
                      styles.inputAccent,
                      {
                        opacity: descInputFocus,
                        transform: [
                          {
                            scaleX: descInputFocus,
                          },
                        ],
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={gradients.primary.colors}
                      start={gradients.primary.start}
                      end={gradients.primary.end}
                      style={StyleSheet.absoluteFillObject}
                    />
                  </Animated.View>
                </Animated.View>
              </View>
            </View>
          </Animated.View>

          {/* Steps Section */}
          <Animated.View style={[styles.stepsSection, { opacity: fadeAnim }]}>
            <View style={[styles.glassCard, getGlassStyle(theme.dark ? 'dark' : 'light')]}>
              <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                  <Text style={[styles.cardTitle, { color: theme.colors?.onSurface || '#FFFFFF' }]}>
                    Steps
                  </Text>
                  {steps.length > 0 && (
                    <View style={styles.stepsBadge}>
                      <LinearGradient
                        colors={gradients.success.colors}
                        style={styles.stepsBadgeGradient}
                      >
                        <Text style={styles.stepsBadgeText}>{steps.length}</Text>
                      </LinearGradient>
                    </View>
                  )}
                </View>
                <GradientButton
                  title="Add Step"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setIsStepPickerVisible(true);
                  }}
                  gradientKey="primary"
                  icon="plus"
                  size="small"
                  style={styles.addStepButton}
                />
              </View>

              {steps.length === 0 ? (
                <EmptyStateIllustration
                  type="empty"
                  title="No steps yet"
                  subtitle="Add steps to build your automation workflow"
                  actionLabel="Add First Step"
                  onAction={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setIsStepPickerVisible(true);
                  }}
                  gradientKey="primary"
                  animated={true}
                />
              ) : (
                <DraggableFlatList
                  data={steps}
                  onDragEnd={({ data }) => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSteps(data);
                  }}
                  keyExtractor={item => item.id}
                  renderItem={renderStepItem}
                  style={styles.stepsList}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </View>
          </Animated.View>
        </Animated.ScrollView>

        {/* Enhanced Footer */}
        <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
          <View style={styles.footerContent}>
            <View style={styles.footerButtons}>
              <GradientButton
                title={isTesting ? `Testing... ${Math.round(testProgress)}%` : "Test"}
                onPress={handleTestAutomation}
                gradientKey="aurora"
                icon={isTesting ? undefined : "play-circle"}
                variant="outlined"
                disabled={isTesting || steps.length === 0}
                loading={isTesting}
                size="medium"
                style={styles.testButton}
              />
              
              <GradientButton
                title="Save"
                onPress={handleSaveAutomation}
                gradientKey="success"
                icon={isSaving ? undefined : "content-save"}
                disabled={isSaving || !automationName.trim() || steps.length === 0}
                loading={isSaving}
                size="medium"
                style={styles.saveButton}
              />
            </View>
            
            {steps.length > 0 && (
              <View style={styles.statsBar}>
                <LinearGradient
                  colors={['rgba(99, 102, 241, 0.1)', 'rgba(139, 92, 246, 0.1)']}
                  style={styles.statsBarGradient}
                >
                  <Text style={[styles.statsText, { color: theme.colors?.onSurfaceVariant || '#B0B0B0' }]}>
                    {steps.length} step{steps.length !== 1 ? 's' : ''} • 
                    ~{steps.length * 2}s execution time
                  </Text>
                </LinearGradient>
              </View>
            )}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* Enhanced Step Picker Modal */}
      <Modal
        visible={isStepPickerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsStepPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFillObject} />
          <View style={[styles.modalContent, { backgroundColor: theme.dark ? 'rgba(20, 20, 20, 0.98)' : 'rgba(255, 255, 255, 0.98)' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors?.onSurface || '#FFFFFF' }]}>
                Choose Step Type
              </Text>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIsStepPickerVisible(false);
                }}
                style={styles.modalClose}
              >
                <LinearGradient
                  colors={theme.dark ? ['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.2)'] : ['rgba(0, 0, 0, 0.2)', 'rgba(0, 0, 0, 0.1)']}
                  style={styles.closeButton}
                >
                  <MaterialCommunityIcons name="close" size={20} color={theme.dark ? 'white' : 'black'} />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Enhanced Category Filter */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
              contentContainerStyle={styles.categoryScrollContent}
            >
              {categories.map((category, index) => renderCategoryChip(category, index))}
            </ScrollView>

            <FlatList
              data={filteredStepTypes}
              keyExtractor={item => item.type}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    handleAddStep(item);
                  }}
                  style={styles.stepTypeItem}
                >
                  <LinearGradient
                    colors={theme.dark ? ['rgba(40, 40, 40, 0.9)', 'rgba(30, 30, 30, 0.9)'] : ['rgba(255, 255, 255, 0.9)', 'rgba(245, 245, 245, 0.9)']}
                    style={styles.stepTypeItemGradient}
                  >
                    <LinearGradient
                      colors={[item.color, item.color + '80']}
                      style={styles.stepTypeIcon}
                    >
                      <MaterialCommunityIcons 
                        name={item.icon as any} 
                        size={24} 
                        color="white" 
                      />
                    </LinearGradient>
                    <Text style={[styles.stepTypeTitle, { color: theme.dark ? '#FFFFFF' : '#1A1A1A' }]}>
                      {item.title}
                    </Text>
                    <MaterialCommunityIcons 
                      name="chevron-right" 
                      size={20} 
                      color={theme.dark ? '#B0B0B0' : '#666666'} 
                    />
                  </LinearGradient>
                </TouchableOpacity>
              )}
              style={styles.stepTypesList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      {/* Enhanced Step Config Modal */}
      <Modal
        visible={isConfigModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsConfigModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFillObject} />
          <View style={[styles.modalContent, { backgroundColor: theme.dark ? 'rgba(20, 20, 20, 0.98)' : 'rgba(255, 255, 255, 0.98)' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors?.onSurface || '#FFFFFF' }]}>
                Configure {selectedStep?.title}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIsConfigModalVisible(false);
                }}
                style={styles.modalClose}
              >
                <LinearGradient
                  colors={theme.dark ? ['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.2)'] : ['rgba(0, 0, 0, 0.2)', 'rgba(0, 0, 0, 0.1)']}
                  style={styles.closeButton}
                >
                  <MaterialCommunityIcons name="close" size={20} color={theme.dark ? 'white' : 'black'} />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {selectedStep && (
              <View style={styles.configContainer}>
                <ModernStepConfigRenderer
                  step={selectedStep}
                  config={stepConfig}
                  onConfigChange={setStepConfig}
                />
                <GradientButton
                  title="Save Configuration"
                  onPress={handleConfigSave}
                  gradientKey="success"
                  icon="check"
                  size="medium"
                  style={styles.saveConfigButton}
                />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  templatesSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  templatesTitle: {
    ...typography.headlineSmall,
    fontWeight: fontWeights.bold,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  templatesScroll: {
    flexDirection: 'row',
  },
  templateCard: {
    width: 280,
    marginRight: 16,
    marginHorizontal: 0,
  },
  inputSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  glassCard: {
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 24,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  inputContainer: {
    padding: 24,
  },
  inputWrapper: {
    position: 'relative',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  textAreaWrapper: {
    marginBottom: 0,
  },
  input: {
    ...typography.bodyLarge,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  stepsSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    ...typography.headlineSmall,
    fontWeight: fontWeights.bold,
  },
  stepsBadge: {
    marginLeft: 12,
  },
  stepsBadgeGradient: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  stepsBadgeText: {
    ...typography.labelSmall,
    color: '#FFFFFF',
    fontWeight: fontWeights.bold,
  },
  addStepButton: {
    minWidth: 120,
    marginHorizontal: 0,
    marginVertical: 0,
  },
  stepsList: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    maxHeight: 400,
  },
  stepItemContainer: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  stepItemGradient: {
    borderRadius: 16,
  },
  stepItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  stepItemActive: {
    transform: [{ scale: 1.02 }],
  },
  stepItemActiveStyle: {
    ...Platform.select({
      ios: {
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  stepItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stepIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  stepInfo: {
    flex: 1,
  },
  stepTitle: {
    ...typography.titleMedium,
    fontWeight: fontWeights.semibold,
    marginBottom: 4,
  },
  configBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepConfigPreview: {
    ...typography.bodySmall,
    marginLeft: 4,
  },
  stepItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepToggle: {
    marginRight: 12,
    padding: 4,
  },
  stepDelete: {
    padding: 4,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  footerContent: {
    paddingHorizontal: 16,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  testButton: {
    flex: 1,
    marginHorizontal: 0,
  },
  saveButton: {
    flex: 1,
    marginHorizontal: 0,
  },
  statsBar: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  statsBarGradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  statsText: {
    ...typography.bodySmall,
    fontWeight: fontWeights.medium,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    maxHeight: screenHeight * 0.8,
    minHeight: screenHeight * 0.5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  modalTitle: {
    ...typography.headlineSmall,
    fontWeight: fontWeights.bold,
  },
  modalClose: {
    padding: 4,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryScroll: {
    paddingVertical: 8,
  },
  categoryScrollContent: {
    paddingHorizontal: 24,
    gap: 8,
  },
  categoryChipContainer: {
    marginRight: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  categoryChipInactive: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  categoryChipText: {
    ...typography.labelMedium,
    fontWeight: fontWeights.semibold,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  stepTypesList: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
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
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepTypeTitle: {
    ...typography.titleMedium,
    fontWeight: fontWeights.medium,
    flex: 1,
  },
  configContainer: {
    flex: 1,
    padding: 24,
  },
  saveConfigButton: {
    marginTop: 24,
    marginHorizontal: 0,
  },
});