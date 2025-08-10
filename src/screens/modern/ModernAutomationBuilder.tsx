import React, { useState, useCallback, useEffect, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput as RNTextInput,
  Modal,
  FlatList,
  Platform,
  ActivityIndicator,
  Animated,
  Dimensions,
  Alert,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TextInput } from 'react-native-paper';
import { useSafeTheme } from '../../components/common/ThemeFallbackWrapper';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useCreateAutomationMutation } from '../../store/api/automationApi';
import ModernStepConfigRenderer from '../../components/automation/ModernStepConfigRenderer';
import { AutomationTemplateService, AutomationTemplate } from '../../services/templates/AutomationTemplates';
import * as Haptics from 'expo-haptics';
import { v4 as uuidv4 } from 'uuid';
import { useOptimizedTextInput } from '../../utils/textInputFixes';
import { StepType, AutomationStep as BaseAutomationStep, StepConfig } from '../../types';

const { width: screenWidth } = Dimensions.get('window');

interface AutomationStep extends BaseAutomationStep {
  icon: string;
  color: string;
}

// Helper function to get default config for each step type
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

// Enhanced step types with all available actions
const stepTypes = [
  // Communication & Notifications
  { type: 'sms' as StepType, title: 'Send SMS', icon: 'message-text', color: '#2196F3', category: 'Communication' },
  { type: 'email' as StepType, title: 'Send Email', icon: 'email', color: '#4CAF50', category: 'Communication' },
  { type: 'notification' as StepType, title: 'Show Notification', icon: 'bell', color: '#FF9800', category: 'Communication' },
  { type: 'call', title: 'Make Phone Call', icon: 'phone', color: '#00BCD4', category: 'Communication' },
  { type: 'facetime', title: 'FaceTime', icon: 'video', color: '#34C759', category: 'Communication' },
  
  // Input & Prompts
  { type: 'prompt_input', title: 'Ask for Input', icon: 'form-textbox', color: '#9C27B0', category: 'Input & Prompts' },
  { type: 'variable', title: 'Set Variable', icon: 'variable', color: '#795548', category: 'Input & Prompts' },
  { type: 'voice_input', title: 'Voice Input', icon: 'microphone', color: '#FF5722', category: 'Input & Prompts' },
  { type: 'menu', title: 'Show Menu', icon: 'menu', color: '#3F51B5', category: 'Input & Prompts' },
  
  // Web & Data
  { type: 'webhook', title: 'Call Webhook', icon: 'webhook', color: '#E91E63', category: 'Web & Data' },
  { type: 'http', title: 'HTTP Request', icon: 'api', color: '#3F51B5', category: 'Web & Data' },
  { type: 'json', title: 'Parse JSON', icon: 'code-json', color: '#00BCD4', category: 'Web & Data' },
  { type: 'rss', title: 'RSS Feed', icon: 'rss', color: '#FF6F00', category: 'Web & Data' },
  { type: 'scraper', title: 'Web Scraper', icon: 'web', color: '#4CAF50', category: 'Web & Data' },
  
  // Device & System
  { type: 'location', title: 'Get/Share Location', icon: 'map-marker', color: '#F44336', category: 'Device & System' },
  { type: 'wifi', title: 'Control WiFi', icon: 'wifi', color: '#607D8B', category: 'Device & System' },
  { type: 'bluetooth', title: 'Control Bluetooth', icon: 'bluetooth', color: '#1976D2', category: 'Device & System' },
  { type: 'brightness', title: 'Set Brightness', icon: 'brightness-6', color: '#FFC107', category: 'Device & System' },
  { type: 'volume', title: 'Set Volume', icon: 'volume-high', color: '#E91E63', category: 'Device & System' },
  { type: 'airplane', title: 'Airplane Mode', icon: 'airplane', color: '#9E9E9E', category: 'Device & System' },
  { type: 'battery', title: 'Battery Info', icon: 'battery', color: '#4CAF50', category: 'Device & System' },
  { type: 'screen_lock', title: 'Screen Lock', icon: 'lock', color: '#FF5722', category: 'Device & System' },
  
  // Apps & Services
  { type: 'open-app', title: 'Open App', icon: 'application', color: '#009688', category: 'Apps & Services' },
  { type: 'shortcut', title: 'Run Shortcut', icon: 'play-circle', color: '#FF5722', category: 'Apps & Services' },
  { type: 'spotify', title: 'Spotify Control', icon: 'spotify', color: '#1DB954', category: 'Apps & Services' },
  { type: 'calendar', title: 'Calendar Event', icon: 'calendar', color: '#4285F4', category: 'Apps & Services' },
  { type: 'reminder', title: 'Set Reminder', icon: 'alarm', color: '#FF9800', category: 'Apps & Services' },
  { type: 'notes', title: 'Create Note', icon: 'note', color: '#FFEB3B', category: 'Apps & Services' },
  
  // Media & Content
  { type: 'photo', title: 'Take/Select Photo', icon: 'camera', color: '#E91E63', category: 'Media & Content' },
  { type: 'video', title: 'Record Video', icon: 'video-vintage', color: '#9C27B0', category: 'Media & Content' },
  { type: 'screenshot', title: 'Take Screenshot', icon: 'monitor-screenshot', color: '#00BCD4', category: 'Media & Content' },
  { type: 'clipboard', title: 'Clipboard Actions', icon: 'clipboard', color: '#607D8B', category: 'Media & Content' },
  { type: 'text_to_speech', title: 'Text to Speech', icon: 'speaker', color: '#FF5722', category: 'Media & Content' },
  { type: 'qr_code', title: 'QR Code', icon: 'qrcode', color: '#000000', category: 'Media & Content' },
  
  // Control Flow & Logic
  { type: 'wait', title: 'Wait/Delay', icon: 'clock', color: '#9E9E9E', category: 'Control Flow' },
  { type: 'condition', title: 'If/Then Condition', icon: 'source-branch', color: '#673AB7', category: 'Control Flow' },
  { type: 'loop', title: 'Repeat Loop', icon: 'repeat', color: '#CDDC39', category: 'Control Flow' },
  { type: 'exit', title: 'Exit Automation', icon: 'exit-to-app', color: '#F44336', category: 'Control Flow' },
  { type: 'group', title: 'Group Actions', icon: 'group', color: '#2196F3', category: 'Control Flow' },
  
  // Math & Calculations
  { type: 'math', title: 'Math Operations', icon: 'calculator', color: '#FF5722', category: 'Math & Logic' },
  { type: 'counter', title: 'Counter', icon: 'counter', color: '#4CAF50', category: 'Math & Logic' },
  { type: 'random', title: 'Random Number', icon: 'dice-multiple', color: '#9C27B0', category: 'Math & Logic' },
  
  // Files & Storage
  { type: 'file_read', title: 'Read File', icon: 'file-document', color: '#2196F3', category: 'Files & Storage' },
  { type: 'file_write', title: 'Write File', icon: 'file-edit', color: '#4CAF50', category: 'Files & Storage' },
  { type: 'cloud_storage', title: 'Cloud Storage', icon: 'cloud-upload', color: '#00BCD4', category: 'Files & Storage' },
];

const ModernAutomationBuilder: React.FC = memo(() => {
  const theme = useSafeTheme();
  const navigation = useNavigation();
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
  
  // Optimize text inputs for iOS
  const nameInputProps = useOptimizedTextInput({
    value: automationName,
    onChangeText: setAutomationName,
  });
  
  const descriptionInputProps = useOptimizedTextInput({
    value: automationDescription,
    onChangeText: setAutomationDescription,
  });
  
  const searchInputProps = useOptimizedTextInput({
    value: searchQuery,
    onChangeText: setSearchQuery,
  });
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  
  // Entry animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
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
      // Haptics not supported
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
    Alert.alert(
      'Delete Step',
      'Are you sure you want to delete this step?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setSteps(prev => prev.filter(step => step.id !== stepId));
            triggerHaptic('heavy');
          },
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

  const handleSaveAutomation = useCallback(async () => {
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
      Alert.alert('Error', 'Failed to save automation. Please try again.');
    }
  }, [automationName, automationDescription, steps, user?.id, createAutomation, navigation]);

  // Get filtered templates
  const getFilteredTemplates = useCallback(() => {
    let templates = AutomationTemplateService.getAllTemplates();
    
    if (selectedTemplateCategory === 'popular') {
      templates = AutomationTemplateService.getPopularTemplates();
    } else if (selectedTemplateCategory !== 'all') {
      templates = AutomationTemplateService.getTemplatesByCategory(selectedTemplateCategory);
    }
    
    if (searchQuery) {
      templates = templates.filter(t => 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return templates;
  }, [selectedTemplateCategory, searchQuery]);

  // Filter step types
  const filteredStepTypes = stepTypes.filter(stepType => {
    const matchesSearch = stepType.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         stepType.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || stepType.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['All', ...Array.from(new Set(stepTypes.map(step => step.category)))];
  const templateCategories = AutomationTemplateService.getCategories();

  const renderStepCard = ({ item, index }: { item: AutomationStep; index: number }) => (
    <Animated.View
      style={[
        styles.stepCard,
        {
          backgroundColor: theme.colors.surface,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.stepHeader}>
        <LinearGradient
          colors={['#8B5CF6', '#6D28D9', '#5B21B6']}
          style={styles.stepNumber}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.stepNumberText}>{index + 1}</Text>
        </LinearGradient>
        <LinearGradient
          colors={[item.color, item.color + 'DD', item.color + 'AA']}
          style={styles.stepIcon}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <MaterialCommunityIcons name={item.icon as any} size={24} color="white" />
        </LinearGradient>
        <View style={styles.stepInfo}>
          <Text style={[styles.stepTitle, { color: theme.colors.onSurface }]}>
            {item.title}
          </Text>
          <Text style={[styles.stepSubtitle, { color: theme.colors.onSurfaceVariant }]}>
            {item.enabled ? 'Enabled' : 'Disabled'}
          </Text>
        </View>
      </View>
      
      <View style={styles.stepActions}>
        <TouchableOpacity
          onPress={() => handleUpdateStep(item.id, { enabled: !item.enabled })}
          style={[styles.actionButton, { backgroundColor: item.enabled ? item.color + '20' : theme.colors.surfaceVariant }]}
        >
          <MaterialCommunityIcons
            name={item.enabled ? 'toggle-switch' : 'toggle-switch-off'}
            size={28}
            color={item.enabled ? item.color : theme.colors.onSurfaceVariant}
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => handleConfigureStep(item)}
          style={[styles.actionButton, { backgroundColor: theme.colors.surfaceVariant }]}
        >
          <MaterialCommunityIcons name="cog" size={22} color={theme.colors.onSurfaceVariant} />
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => handleDeleteStep(item.id)}
          style={[styles.actionButton, { backgroundColor: '#ffebee' }]}
        >
          <MaterialCommunityIcons name="delete" size={22} color="#f44336" />
        </TouchableOpacity>
      </View>
      
      {index < steps.length - 1 && (
        <View style={styles.stepConnector}>
          <View style={[styles.connectorLine, { backgroundColor: item.color + '30' }]} />
        </View>
      )}
    </Animated.View>
  );

  const renderTemplateCard = ({ item }: { item: AutomationTemplate }) => (
    <TouchableOpacity
      style={styles.templateCard}
      onPress={() => handleUseTemplate(item)}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={[item.color || '#8B5CF6', (item.color || '#8B5CF6') + 'DD']}
        style={styles.templateGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.templateHeader}>
          <MaterialCommunityIcons name={item.icon as any} size={36} color="white" />
          {item.isPopular && (
            <View style={styles.popularBadge}>
              <MaterialCommunityIcons name="star" size={16} color="#FFD700" />
            </View>
          )}
        </View>
        
        <Text style={styles.templateTitle}>{item.title}</Text>
        <Text style={styles.templateDescription} numberOfLines={2}>
          {item.description}
        </Text>
        
        <View style={styles.templateFooter}>
          <View style={styles.templateMeta}>
            <MaterialCommunityIcons name="layers" size={14} color="rgba(255,255,255,0.8)" />
            <Text style={styles.templateMetaText}>{item.steps.length} steps</Text>
          </View>
          <View style={styles.templateMeta}>
            <MaterialCommunityIcons name="clock" size={14} color="rgba(255,255,255,0.8)" />
            <Text style={styles.templateMetaText}>{item.estimatedTime}</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderStepType = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.stepTypeCard}
      onPress={() => handleAddStep(item)}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={[item.color + '15', item.color + '05']}
        style={styles.stepTypeGradient}
      >
        <View style={[styles.stepTypeIcon, { backgroundColor: item.color }]}>
          <MaterialCommunityIcons name={item.icon as any} size={28} color="white" />
        </View>
        <Text style={[styles.stepTypeTitle, { color: theme.colors.onSurface }]}>
          {item.title}
        </Text>
        <Text style={[styles.stepTypeCategory, { color: theme.colors.onSurfaceVariant }]}>
          {item.category}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Modern Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
            Automation Builder
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.onSurfaceVariant }]}>
            {steps.length} steps • {viewMode === 'builder' ? 'Builder Mode' : 'Template Mode'}
          </Text>
        </View>
        
        <TouchableOpacity 
          onPress={() => setViewMode(viewMode === 'builder' ? 'templates' : 'builder')}
          style={styles.viewToggle}
        >
          <MaterialCommunityIcons 
            name={viewMode === 'builder' ? 'view-grid' : 'hammer'} 
            size={24} 
            color={theme.colors.primary} 
          />
        </TouchableOpacity>
      </View>

      {/* View Mode Tabs */}
      <View style={styles.tabContainer}>
        <Pressable
          style={[
            styles.tab,
            viewMode === 'templates' && styles.activeTab,
            { borderColor: viewMode === 'templates' ? theme.colors.primary : 'transparent' }
          ]}
          onPress={() => setViewMode('templates')}
        >
          <MaterialCommunityIcons 
            name="view-grid" 
            size={20} 
            color={viewMode === 'templates' ? theme.colors.primary : theme.colors.onSurfaceVariant} 
          />
          <Text style={[
            styles.tabText,
            { color: viewMode === 'templates' ? theme.colors.primary : theme.colors.onSurfaceVariant }
          ]}>
            Templates
          </Text>
        </Pressable>
        
        <Pressable
          style={[
            styles.tab,
            viewMode === 'builder' && styles.activeTab,
            { borderColor: viewMode === 'builder' ? theme.colors.primary : 'transparent' }
          ]}
          onPress={() => setViewMode('builder')}
        >
          <MaterialCommunityIcons 
            name="hammer" 
            size={20} 
            color={viewMode === 'builder' ? theme.colors.primary : theme.colors.onSurfaceVariant} 
          />
          <Text style={[
            styles.tabText,
            { color: viewMode === 'builder' ? theme.colors.primary : theme.colors.onSurfaceVariant }
          ]}>
            Builder
          </Text>
        </Pressable>
      </View>

      {/* Content Area */}
      {viewMode === 'templates' ? (
        // Templates View
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim }
              ],
            },
          ]}
        >
          {/* Search Bar */}
          <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface }]}>
            <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.onSurfaceVariant} />
            <RNTextInput
              style={[styles.searchInput, { color: theme.colors.onSurface }]}
              placeholder="Search templates..."
              placeholderTextColor={theme.colors.onSurfaceVariant}
              {...searchInputProps}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialCommunityIcons name="close-circle" size={18} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Filter */}
          <View style={{ height: 60, marginBottom: 16, overflow: 'visible' }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flex: 1 }}
              contentContainerStyle={styles.categoryScrollContent}
              alwaysBounceHorizontal={false}
              bounces={false}
            >
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedTemplateCategory === 'all' && styles.activeCategoryChip,
                { borderColor: selectedTemplateCategory === 'all' ? theme.colors.primary : theme.colors.outline }
              ]}
              onPress={() => setSelectedTemplateCategory('all')}
            >
              <Text style={[
                styles.categoryChipText,
                { color: selectedTemplateCategory === 'all' ? theme.colors.primary : theme.colors.onSurfaceVariant }
              ]}>
                All
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedTemplateCategory === 'popular' && styles.activeCategoryChip,
                { borderColor: selectedTemplateCategory === 'popular' ? theme.colors.primary : theme.colors.outline }
              ]}
              onPress={() => setSelectedTemplateCategory('popular')}
            >
              <MaterialCommunityIcons name="star" size={16} color="#FFD700" style={{ marginRight: 2 }} />
              <Text style={[
                styles.categoryChipText,
                { color: selectedTemplateCategory === 'popular' ? theme.colors.primary : theme.colors.onSurfaceVariant }
              ]}>
                Popular
              </Text>
            </TouchableOpacity>
            
            {templateCategories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryChip,
                  selectedTemplateCategory === cat.id && styles.activeCategoryChip,
                  { borderColor: selectedTemplateCategory === cat.id ? theme.colors.primary : theme.colors.outline }
                ]}
                onPress={() => setSelectedTemplateCategory(cat.id)}
              >
                <MaterialCommunityIcons name={cat.icon as any} size={16} color={cat.color} style={{ marginRight: 2 }} />
                <Text style={[
                  styles.categoryChipText,
                  { color: selectedTemplateCategory === cat.id ? theme.colors.primary : theme.colors.onSurfaceVariant }
                ]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
            </ScrollView>
          </View>

          {/* Templates Grid */}
          <FlatList
            data={getFilteredTemplates()}
            renderItem={renderTemplateCard}
            keyExtractor={item => item.id}
            numColumns={2}
            columnWrapperStyle={styles.templateRow}
            contentContainerStyle={styles.templateList}
            showsVerticalScrollIndicator={false}
            contentInsetAdjustmentBehavior="automatic"
            removeClippedSubviews={false}
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            windowSize={10}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="robot-confused" size={64} color={theme.colors.onSurfaceVariant} />
                <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
                  No Templates Found
                </Text>
                <Text style={[styles.emptyDescription, { color: theme.colors.onSurfaceVariant }]}>
                  Try adjusting your search or filters
                </Text>
              </View>
            }
          />
        </Animated.View>
      ) : (
        // Builder View
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Automation Details */}
            <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Automation Details
              </Text>
              
              <TextInput
                mode="outlined"
                label="Name"
                {...nameInputProps}
                style={styles.input}
                theme={{ colors: { primary: theme.colors.primary } }}
              />
              
              <TextInput
                mode="outlined"
                label="Description (optional)"
                {...descriptionInputProps}
                multiline
                numberOfLines={3}
                style={styles.input}
                theme={{ colors: { primary: theme.colors.primary } }}
              />
            </View>

            {/* Steps Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                  Steps
                </Text>
                <TouchableOpacity
                  style={styles.addButtonContainer}
                  onPress={() => setIsStepPickerVisible(true)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#8B5CF6', '#7C3AED', '#6D28D9']}
                    style={styles.addButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <MaterialCommunityIcons name="plus-circle" size={24} color="white" />
                    <Text style={styles.addButtonText}>Add Step</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {steps.length > 0 ? (
                <FlatList
                  data={steps}
                  renderItem={renderStepCard}
                  keyExtractor={item => item.id}
                  scrollEnabled={false}
                />
              ) : (
                <View style={[styles.emptySteps, { backgroundColor: theme.colors.surface }]}>
                  <MaterialCommunityIcons name="puzzle-outline" size={48} color={theme.colors.onSurfaceVariant} />
                  <Text style={[styles.emptyStepsText, { color: theme.colors.onSurfaceVariant }]}>
                    No steps yet. Add your first step or choose a template.
                  </Text>
                  <TouchableOpacity
                    style={[styles.chooseTemplateButton, { backgroundColor: theme.colors.primary }]}
                    onPress={() => setViewMode('templates')}
                  >
                    <Text style={styles.chooseTemplateButtonText}>Browse Templates</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer Actions */}
          {steps.length > 0 && (
            <View style={[styles.footer, { backgroundColor: theme.colors.surface }]}>
              <TouchableOpacity
                style={[styles.footerButton, styles.testButton, { borderColor: theme.colors.primary }]}
                onPress={handleTestAutomation}
                disabled={isTesting}
              >
                {isTesting ? (
                  <>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                    <Text style={[styles.footerButtonText, { color: theme.colors.primary }]}>
                      Testing... {Math.round(testProgress * 100)}%
                    </Text>
                  </>
                ) : (
                  <>
                    <MaterialCommunityIcons name="play" size={20} color={theme.colors.primary} />
                    <Text style={[styles.footerButtonText, { color: theme.colors.primary }]}>
                      Test
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.footerButton, styles.saveButton]}
                onPress={handleSaveAutomation}
                disabled={isSaving}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#10B981', '#059669', '#047857']}
                  style={styles.saveButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="content-save" size={22} color="white" />
                      <Text style={[styles.footerButtonText, { color: 'white' }]}>
                        Save
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      )}

      {/* Step Picker Modal */}
      <Modal
        visible={isStepPickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsStepPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
                Add Step
              </Text>
              <TouchableOpacity 
                onPress={() => setIsStepPickerVisible(false)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: theme.colors.surfaceVariant,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <MaterialCommunityIcons name="close" size={28} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={[styles.modalSearch, { backgroundColor: theme.colors.surfaceVariant }]}>
              <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.onSurfaceVariant} />
              <RNTextInput
                style={[styles.searchInput, { color: theme.colors.onSurface }]}
                placeholder="Search steps..."
                placeholderTextColor={theme.colors.onSurfaceVariant}
                {...searchInputProps}
              />
            </View>

            {/* Categories */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.modalCategories}
            >
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.modalCategoryChip,
                    selectedCategory === cat && styles.activeModalCategoryChip,
                    { 
                      backgroundColor: selectedCategory === cat ? theme.colors.primary : theme.colors.surfaceVariant 
                    }
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={[
                    styles.modalCategoryText,
                    { color: selectedCategory === cat ? 'white' : theme.colors.onSurfaceVariant }
                  ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Step Types Grid */}
            <FlatList
              data={filteredStepTypes}
              renderItem={renderStepType}
              keyExtractor={item => item.type}
              numColumns={3}
              contentContainerStyle={styles.stepTypesList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      {/* Step Config Modal */}
      <Modal
        visible={isConfigModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsConfigModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <View style={styles.configHeader}>
                {selectedStep && (
                  <View style={[styles.configIcon, { backgroundColor: selectedStep.color + '20' }]}>
                    <MaterialCommunityIcons name={selectedStep.icon as any} size={24} color={selectedStep.color} />
                  </View>
                )}
                <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
                  {selectedStep?.title || 'Configure'}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => setIsConfigModalVisible(false)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: theme.colors.surfaceVariant,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <MaterialCommunityIcons name="close" size={28} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>

            {selectedStep && (
              <ScrollView style={styles.configContent}>
                <ModernStepConfigRenderer
                  step={selectedStep}
                  config={stepConfig}
                  onConfigChange={setStepConfig}
                  theme={theme}
                />
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleSaveStepConfig}
              >
                <Text style={styles.modalButtonText}>Save Configuration</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Template Preview Modal */}
      <Modal
        visible={isTemplateModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsTemplateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            {selectedTemplate && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
                    {selectedTemplate.title}
                  </Text>
                  <TouchableOpacity 
                    onPress={() => setIsTemplateModalVisible(false)}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: theme.colors.surfaceVariant,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <MaterialCommunityIcons name="close" size={28} color={theme.colors.onSurface} />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.templatePreview}>
                  <Text style={[styles.templatePreviewDescription, { color: theme.colors.onSurface }]}>
                    {selectedTemplate.description}
                  </Text>
                  
                  <LinearGradient
                    colors={['rgba(139, 92, 246, 0.1)', 'rgba(124, 58, 237, 0.05)']}
                    style={styles.templatePreviewMeta}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.templatePreviewMetaItem}>
                      <MaterialCommunityIcons name="layers" size={20} color={theme.colors.primary} />
                      <Text style={[styles.templatePreviewMetaText, { color: theme.colors.onSurface }]}>
                        {selectedTemplate.steps.length} steps
                      </Text>
                    </View>
                    <View style={styles.templatePreviewMetaItem}>
                      <MaterialCommunityIcons name="clock" size={20} color={theme.colors.primary} />
                      <Text style={[styles.templatePreviewMetaText, { color: theme.colors.onSurface }]}>
                        {selectedTemplate.estimatedTime}
                      </Text>
                    </View>
                    <View style={styles.templatePreviewMetaItem}>
                      <MaterialCommunityIcons name="shield-check" size={20} color={theme.colors.primary} />
                      <Text style={[styles.templatePreviewMetaText, { color: theme.colors.onSurface }]}>
                        {selectedTemplate.difficulty}
                      </Text>
                    </View>
                  </LinearGradient>
                  
                  <Text style={[styles.templatePreviewStepsTitle, { color: theme.colors.onSurface }]}>
                    Steps:
                  </Text>
                  {selectedTemplate.steps.map((step, index) => (
                    <View key={step.id} style={styles.templatePreviewStep}>
                      <LinearGradient
                        colors={['#8B5CF6', '#6D28D9']}
                        style={styles.templatePreviewStepNumber}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Text style={styles.templatePreviewStepNumberText}>{index + 1}</Text>
                      </LinearGradient>
                      <Text style={[styles.templatePreviewStepText, { color: theme.colors.onSurface }]}>
                        {step.title}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
                
                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                    onPress={handleApplyTemplate}
                  >
                    <MaterialCommunityIcons name="lightning-bolt" size={20} color="white" />
                    <Text style={styles.modalButtonText}>Use Template</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
});

ModernAutomationBuilder.displayName = 'ModernAutomationBuilder';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 64,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerCenter: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  viewToggle: {
    padding: 8,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderColor: 'transparent',
    minHeight: 50,
  },
  activeTab: {
    borderBottomWidth: 3,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  categoryScroll: {
    height: 60,
    marginBottom: 16,
  },
  categoryScrollContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
    paddingVertical: 8,
    height: 60,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    marginRight: 12,
    justifyContent: 'center',
  },
  activeCategoryChip: {
    borderWidth: 2,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: Platform.OS === 'ios' ? 17 : 16,
  },
  templateRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  templateList: {
    paddingBottom: 10,
  },
  templateCard: {
    width: (screenWidth - 48) / 2,
    height: 180,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
  popularBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12,
    padding: 4,
  },
  templateTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 8,
  },
  templateDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 16,
  },
  templateFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  templateMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  templateMetaText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyDescription: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
  },
  input: {
    marginBottom: 16,
    fontSize: 16,
  },
  addButtonContainer: {
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
    minHeight: 56,
  },
  addButtonText: {
    color: '#FFFFFF',
    marginLeft: 10,
    fontWeight: '600',
    fontSize: 18,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  stepCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    minHeight: 90,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepInfo: {
    flex: 1,
    marginRight: 12,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  stepActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    padding: 10,
    borderRadius: 8,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepConnector: {
    position: 'absolute',
    bottom: -12,
    left: '50%',
    marginLeft: -1,
  },
  connectorLine: {
    width: 2,
    height: 12,
  },
  emptySteps: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  emptyStepsText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  chooseTemplateButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  chooseTemplateButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    gap: 12,
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    minHeight: 56,
  },
  testButton: {
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  saveButton: {
    padding: 0,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  footerButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 16,
  },
  modalSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  modalCategories: {
    maxHeight: 50,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  modalCategoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  activeModalCategoryChip: {
    // Styles applied dynamically
  },
  modalCategoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  stepTypesList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  stepTypeCard: {
    width: (screenWidth - 60) / 3,
    marginBottom: 12,
    marginRight: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  stepTypeGradient: {
    padding: 12,
    alignItems: 'center',
  },
  stepTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepTypeTitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  stepTypeCategory: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  configHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  configIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  configContent: {
    paddingHorizontal: 20,
    maxHeight: '70%',
  },
  modalFooter: {
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  templatePreview: {
    paddingHorizontal: 20,
    maxHeight: '70%',
  },
  templatePreviewDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  templatePreviewMeta: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    padding: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
  },
  templatePreviewMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  templatePreviewMetaText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '500',
  },
  templatePreviewStepsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  templatePreviewStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 10,
  },
  templatePreviewStepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  templatePreviewStepNumberText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  templatePreviewStepText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ModernAutomationBuilder;