import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { EventLogger } from '../../utils/EventLogger';
  import {
    View,
    StyleSheet,
    ScrollView,
    Alert,
    TextInput as RNTextInput,
    TouchableOpacity,
    Platform,
  } from 'react-native';
  import {
    Appbar,
    FAB,
    Text,
    Card,
    Button,
    Chip,
    List,
    IconButton,
    Portal,
    Modal,
    TextInput,
    SegmentedButtons,
  } from 'react-native-paper';
  import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
  import type { AutomationStep, StepType, AutomationData } from '../../types';
  import type { NativeStackScreenProps } from '@react-navigation/native-stack';
  import type { RootStackParamList } from '../../navigation/types';
  import { AutomationEngine } from '../../services/automation/AutomationEngine';
  import { useCreateAutomationMutation, useGetAutomationQuery } from '../../store/api/automationApi';
  import { supabase } from '../../services/supabase/client';
  import QRGenerator from '../../components/qr/QRGenerator';
  import QRScanner from '../../components/qr/QRScanner';
  import NFCScanner from '../../components/nfc/NFCScanner';
  import NFCWriter from '../../components/nfc/NFCWriter';
  import DraggableStepItem from '../../components/automation/DraggableStepItem';
  import { ShareAutomationModal } from '../../components/sharing/ShareAutomationModal';
  import { FullScreenModal } from '../../components/common/FullScreenModal';
  import StepConfigModal from '../../components/automation/StepConfigModal';
  import ModernStepConfigRenderer from '../../components/automation/ModernStepConfigRenderer';
  import { VisualStepEditor } from '../../components/organisms/StepEditor';
  import { SafeStepEditor } from '../../components/automation/simple/SafeStepEditor';
  import { useUnifiedTheme as useTheme } from '../../contexts/ThemeCompatibilityShim';

  type Props = NativeStackScreenProps<RootStackParamList, 'AutomationBuilder'>;

  const AutomationBuilderScreen: React.FC<Props> = ({ navigation, route }) => {
    const { theme: currentTheme } = useTheme();
    const colors = currentTheme.colors;
    const [steps, setSteps] = useState<AutomationStep[]>([]);
    const [automationTitle, setAutomationTitle] = useState('My Automation');
    const [isExecuting, setIsExecuting] = useState(false);
    const [showStepPicker, setShowStepPicker] = useState(false);
    const [showQRGenerator, setShowQRGenerator] = useState(false);
    const [showQRScanner, setShowQRScanner] = useState(false);
    const [showNFCScanner, setShowNFCScanner] = useState(false);
    const [showNFCWriter, setShowNFCWriter] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [savedAutomationId, setSavedAutomationId] = useState<string | null>(null);
    const [showStepConfig, setShowStepConfig] = useState(false);
    const [configStepIndex, setConfigStepIndex] = useState<number | null>(null);
    const [stepConfig, setStepConfig] = useState<Record<string, any>>({});
    const [isDragMode, setIsDragMode] = useState(false);
    const [isTemplatePreview, setIsTemplatePreview] = useState(false);
    const [useSafeEditor, setUseSafeEditor] = useState(false);
    const [templateLoadMessage, setTemplateLoadMessage] = useState<string | null>(null);

    const [createAutomation] = useCreateAutomationMutation();
    
    // Fetch automation data if automationId is provided
    const automationId = route?.params?.automationId;
    const { data: fetchedAutomation, isLoading: isLoadingAutomation } = useGetAutomationQuery(automationId, {
      skip: !automationId
    });

    // Handle route params for editing existing automation or showing QR generator
    // Fixed dependency array to prevent infinite loops
    useEffect(() => {
      const automation = route?.params?.automation || fetchedAutomation;
      const shouldShowQR = route?.params?.showQRGenerator;
      const isTemplate = route?.params?.isTemplate;
      
      if (automation) {
        EventLogger.debug('Automation', 'Loading automation into builder:', { 
          title: automation.title, 
          stepsCount: automation.steps?.length || 0,
          isTemplate 
        });
        
        setAutomationTitle(automation.title);
        
        // Ensure steps are properly structured
        const loadedSteps = (automation.steps || []).map((step: any) => ({
          id: step.id || `step_${Date.now()}_${Math.random()}`,
          type: step.type,
          title: step.title || step.type,
          enabled: step.enabled !== false,
          config: step.config || {},
        }));
        
        setSteps(loadedSteps);
        
        EventLogger.debug('Automation', 'Steps loaded:', { count: loadedSteps.length });
        
        // Show template load message if coming from templates
        if (!isTemplate && loadedSteps.length > 0 && automation.description?.includes('template')) {
          setTemplateLoadMessage(`Template loaded with ${loadedSteps.length} steps! Tap any step to configure.`);
          setTimeout(() => setTemplateLoadMessage(null), 5000);
        }
        
        // Only set saved ID if it's not a template preview
        if (!isTemplate && automation.id) {
          setSavedAutomationId(automation.id);
        }
        
        setIsTemplatePreview(!!isTemplate);
        
        if (shouldShowQR) {
          setShowQRGenerator(true);
        }
      }
      
      // Cleanup function to prevent state leaks
      return () => {
        if (route?.params?.isTemplate) {
          // Reset template-specific state when leaving
          setIsTemplatePreview(false);
        }
      };
    }, [
      route?.params?.automation?.id, // Only track ID to prevent deep comparison issues
      route?.params?.automation?.steps?.length, // Track steps length to detect changes
      route?.params?.showQRGenerator,
      route?.params?.isTemplate,
      fetchedAutomation?.id // Only track ID to prevent deep comparison issues
    ]);

    const availableSteps = useMemo(() => [
      // Communication
      { type: 'notification' as StepType, label: 'Show Notification', icon: 'bell', description: 'Display a system notification', category: 'Communication' },
      { type: 'sms' as StepType, label: 'Send SMS', icon: 'message-text', description: 'Send a text message', category: 'Communication' },
      { type: 'email' as StepType, label: 'Send Email', icon: 'email', description: 'Send an email', category: 'Communication' },
      { type: 'speak_text' as StepType, label: 'Speak Text', icon: 'text-to-speech', description: 'Convert text to speech', category: 'Communication' },
      
      // Web & Network
      { type: 'webhook' as StepType, label: 'Call Webhook', icon: 'webhook', description: 'Make HTTP request', category: 'Web & Network' },
      { type: 'http_request' as StepType, label: 'HTTP Request', icon: 'cloud-upload', description: 'Advanced HTTP request', category: 'Web & Network' },
      { type: 'wifi' as StepType, label: 'Toggle WiFi', icon: 'wifi', description: 'Turn WiFi on/off', category: 'Web & Network' },
      { type: 'bluetooth' as StepType, label: 'Toggle Bluetooth', icon: 'bluetooth', description: 'Turn Bluetooth on/off', category: 'Web & Network' },
      
      // Control Flow
      { type: 'delay' as StepType, label: 'Add Delay', icon: 'clock', description: 'Wait for specified time', category: 'Control Flow' },
      { type: 'condition' as StepType, label: 'If Condition', icon: 'help-rhombus', description: 'Conditional execution', category: 'Control Flow' },
      { type: 'variable' as StepType, label: 'Set Variable', icon: 'variable', description: 'Store a value', category: 'Control Flow' },
      { type: 'get_variable' as StepType, label: 'Get Variable', icon: 'variable-box', description: 'Retrieve a stored value', category: 'Control Flow' },
      { type: 'prompt_input' as StepType, label: 'Ask for Input', icon: 'comment-question', description: 'Prompt user for input', category: 'Control Flow' },
      { type: 'loop' as StepType, label: 'Repeat Actions', icon: 'refresh', description: 'Repeat a set of actions', category: 'Control Flow' },
      { type: 'script' as StepType, label: 'Run Script', icon: 'code-braces', description: 'Execute JavaScript', category: 'Control Flow' },
      
      // Device
      { type: 'location' as StepType, label: 'Get Location', icon: 'map-marker', description: 'Get current location', category: 'Device' },
      { type: 'clipboard' as StepType, label: 'Clipboard', icon: 'content-paste', description: 'Copy or paste text', category: 'Device' },
      { type: 'sound' as StepType, label: 'Play Sound', icon: 'volume-high', description: 'Play a sound effect', category: 'Device' },
      { type: 'vibration' as StepType, label: 'Vibrate', icon: 'vibrate', description: 'Vibrate the device', category: 'Device' },
      { type: 'flashlight' as StepType, label: 'Toggle Flashlight', icon: 'flashlight', description: 'Turn flashlight on/off', category: 'Device' },
      { type: 'brightness' as StepType, label: 'Set Brightness', icon: 'brightness-6', description: 'Adjust screen brightness', category: 'Device' },
      { type: 'photo' as StepType, label: 'Take Photo', icon: 'camera', description: 'Capture or select photos', category: 'Device' },
      
      // Apps & System
      { type: 'app' as StepType, label: 'Open App', icon: 'application', description: 'Launch another application', category: 'Apps & System' },
      { type: 'close_app' as StepType, label: 'Close App', icon: 'close-box', description: 'Close an application', category: 'Apps & System' },
      { type: 'share' as StepType, label: 'Share Content', icon: 'share-variant', description: 'Share via system dialog', category: 'Apps & System' },
      { type: 'shortcut' as StepType, label: 'Run Shortcut', icon: 'apple', description: 'Execute iOS Shortcut', category: 'Apps & System' },
      
      // Productivity
      { type: 'calendar' as StepType, label: 'Add Calendar Event', icon: 'calendar', description: 'Create calendar entry', category: 'Productivity' },
      { type: 'reminder' as StepType, label: 'Set Reminder', icon: 'reminder', description: 'Create a reminder', category: 'Productivity' },
      { type: 'contact' as StepType, label: 'Call Contact', icon: 'contacts', description: 'Call a contact', category: 'Productivity' },
      { type: 'translate' as StepType, label: 'Translate Text', icon: 'translate', description: 'Translate between languages', category: 'Productivity' },
      { type: 'text' as StepType, label: 'Text Processing', icon: 'format-text', description: 'Format, combine, or transform text', category: 'Productivity' },
      { type: 'math' as StepType, label: 'Calculate', icon: 'calculator', description: 'Perform mathematical calculations', category: 'Productivity' },
      
      // Data
      { type: 'weather' as StepType, label: 'Get Weather', icon: 'weather-partly-cloudy', description: 'Fetch weather data', category: 'Data' },
    ], []);

    const addStep = useCallback((stepType: StepType) => {
      const stepInfo = availableSteps.find(s => s.type === stepType);
      const newStep: AutomationStep = {
        id: `step_${Date.now()}`,
        type: stepType,
        title: stepInfo?.label || 'New Step',
        enabled: true,
        config: getDefaultConfig(stepType),
      };

      setSteps(prevSteps => {
        const newSteps = [...prevSteps, newStep];
        // Open configuration for the new step using setTimeout to avoid state conflicts
        setTimeout(() => openStepConfig(newSteps.length - 1), 100);
        return newSteps;
      });
      setShowStepPicker(false);
    }, []);

    const getDefaultConfig = (stepType: StepType): Record<string, any> => {
      switch (stepType) {
        case 'notification':
          return { message: 'Hello from automation!' };
        case 'delay':
          return { delay: 2000 };
        case 'variable':
          return { name: 'myVariable', value: 'Hello World' };
        case 'get_variable':
          return { name: 'myVariable', defaultValue: '' };
        case 'prompt_input':
          return { title: 'Input Required', message: 'Please enter a value:', defaultValue: '', variableName: 'userInput' };
        case 'sms':
          return { phoneNumber: '+1234567890', message: 'Test SMS from automation' };
        case 'email':
          return { email: 'test@example.com', subject: 'Test Email', message: 'Hello from automation!' };
        case 'webhook':
          return { url: 'https://httpbin.org/post', method: 'POST' };
        case 'location':
          return { action: 'get_current', showResult: true };
        case 'condition':
          return { condition: 'equals', variable: 'myVariable', value: 'test', trueActions: [], falseActions: [] };
        case 'loop':
          return { type: 'count', count: 3, actions: [] };
        case 'text':
          return { action: 'combine', text1: 'Hello', text2: 'World', separator: ' ' };
        case 'math':
          return { operation: 'add', number1: 10, number2: 5 };
        case 'photo':
          return { action: 'take', saveToAlbum: true };
        case 'clipboard':
          return { action: 'copy', text: 'Hello World' };
        case 'app':
          return { appName: 'Settings', url: '' };
        default:
          return {};
      }
    };

    const removeStep = useCallback((index: number) => {
      setSteps(prevSteps => prevSteps.filter((_, i) => i !== index));
      // Clear any open step config if we're removing the currently editing step
      if (configStepIndex === index) {
        setShowStepConfig(false);
        setConfigStepIndex(null);
        setStepConfig({});
      }
    }, [configStepIndex]);

    const toggleStep = useCallback((index: number) => {
      setSteps(prevSteps => {
        const updatedSteps = [...prevSteps];
        if (updatedSteps[index]) {
          updatedSteps[index].enabled = !updatedSteps[index].enabled;
        }
        return updatedSteps;
      });
    }, []);

    const reorderSteps = useCallback((fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      
      setSteps(prevSteps => {
        const updatedSteps = [...prevSteps];
        const [movedStep] = updatedSteps.splice(fromIndex, 1);
        updatedSteps.splice(toIndex, 0, movedStep);
        return updatedSteps;
      });
    }, []);

    const openStepConfig = (index: number) => {
      EventLogger.debug('Automation', 'Opening step config for index:', index, 'Step:', steps[index]);
      if (index >= 0 && index < steps.length && steps[index]) {
        setConfigStepIndex(index);
        setStepConfig({ ...steps[index].config || {} });
        setShowStepConfig(true);
        EventLogger.debug('Automation', 'Step config modal should be visible now');
      } else {
        EventLogger.debug('Automation', 'Invalid step index or step not found');
      }
    };

    const saveStepConfig = useCallback(() => {
      if (configStepIndex !== null) {
        setSteps(prevSteps => {
          const updatedSteps = [...prevSteps];
          if (updatedSteps[configStepIndex]) {
            updatedSteps[configStepIndex].config = { ...stepConfig };
          }
          return updatedSteps;
        });
      }
      setShowStepConfig(false);
      setConfigStepIndex(null);
      setStepConfig({});
    }, [configStepIndex, stepConfig]);

    const cancelStepConfig = useCallback(() => {
      setShowStepConfig(false);
      setConfigStepIndex(null);
      setStepConfig({});
    }, []);

    const executeAutomation = async () => {
      if (steps.length === 0) {
        Alert.alert('No Steps', 'Add some steps to test your automation.');
        return;
      }

      setIsExecuting(true);

      const automationData: AutomationData = {
        id: '',
        title: automationTitle,
        description: 'Created with Automation Builder',
        steps,
        created_by: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_public: false,
        category: 'Productivity',
        tags: ['custom', 'builder'],
        execution_count: 0,
        average_rating: 0,
        rating_count: 0,
      };

      try {
        // Save to Supabase first
        const savedAutomation = await createAutomation(automationData).unwrap();
        setSavedAutomationId(savedAutomation.id);

        // Execute the automation
        const engine = new AutomationEngine();
        const result = await engine.execute(savedAutomation);

        if (result.success) {
          Alert.alert(
            'Success! 🎉',
            `Automation saved to cloud and executed successfully!\n\n⏱️ Execution time: ${result.executionTime}ms\n✅ Steps completed: ${result.stepsCompleted}/${result.totalSteps}\n💾 Saved to your account`,
            [
              { text: 'OK' },
              { text: '🚀 Share Automation', onPress: () => setShowShareModal(true) },
              { text: '📱 Write to NFC', onPress: () => setShowNFCWriter(true) },
              { text: '📋 Generate QR Code', onPress: () => setShowQRGenerator(true) },
            ]
          );
        } else {
          Alert.alert('Execution Failed', result.error || 'Unknown error occurred');
        }
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to save automation');
      } finally {
        setIsExecuting(false);
      }
    };

    const handleQRScan = async (automationId: string, metadata: any) => {
      try {
        Alert.alert(
          'QR Scan Complete! 🎉',
          `Scanned automation: ${metadata.title}\nCreated by: ${metadata.creator}\n\nIn a full implementation, this would fetch and execute the automation.`
        );
        setShowQRScanner(false);
      } catch (error) {
        Alert.alert('Error', 'Failed to load scanned automation');
      }
    };

    const handleNFCScan = async (automationId: string, metadata: any) => {
      try {
        EventLogger.debug('Automation', 'NFC scan received:', { automationId, metadata });
        
        let automationData: AutomationData | null = null;
        
        // Check if this is a public share URL
        if (metadata?.source === 'web' && metadata?.url?.includes('/share/')) {
          EventLogger.debug('Automation', 'NFC tag contains public share link, fetching from public_shares');
          
          // This is a public share ID, not an automation ID
          const { data: shareData, error: shareError } = await supabase
            .from('public_shares')
            .select('*')
            .eq('id', automationId)
            .eq('is_active', true)
            .single();
          
          if (shareError || !shareData) {
            EventLogger.error('Automation', 'Failed to fetch public share:', shareError as Error);
            Alert.alert(
              'Share Link Invalid',
              'This shared automation link is invalid or has expired.'
            );
            setShowNFCScanner(false);
            return;
          }
          
          // Check if expired
          if (new Date(shareData.expires_at) < new Date()) {
            Alert.alert(
              'Share Link Expired',
              'This shared automation link has expired.'
            );
            setShowNFCScanner(false);
            return;
          }
          
          // Get automation data from the share
          automationData = shareData.automation_data;
          
          // Increment access count
          await supabase
            .from('public_shares')
            .update({ access_count: (shareData.access_count || 0) + 1 })
            .eq('id', automationId);
            
        } else {
          // Regular automation ID lookup
          const { data, error } = await supabase
            .from('automations')
            .select('*')
            .eq('id', automationId)
            .single();

          if (error) {
            EventLogger.error('Automation', 'Database error:', error as Error);
            Alert.alert(
              'Automation Not Found',
              `Could not find automation with ID: ${automationId}\n\nError: ${error.message}`
            );
            setShowNFCScanner(false);
            return;
          }

          if (!data) {
            Alert.alert(
              'Automation Not Found',
              'This automation may have been deleted or is no longer available.'
            );
            setShowNFCScanner(false);
            return;
          }
          
          automationData = data;
        }

        setShowNFCScanner(false);

        if (!automationData) {
          Alert.alert('Error', 'Failed to load automation data');
          return;
        }

        // Show confirmation to execute
        Alert.alert(
          'Execute Automation? 🚀',
          `Title: ${automationData.title}\nDescription: ${automationData.description || 'No description'}\nSteps: ${automationData.steps?.length || 0}\n\nDo you want to run this automation?`,
          [
            {
              text: 'Cancel',
              style: 'cancel'
            },
            {
              text: 'Execute',
              onPress: () => {
                // Execute in a separate function to avoid blocking the alert
                executeAutomationSafely(automationData);
              }
            }
          ]
        );

      } catch (error: any) {
        EventLogger.error('Automation', 'NFC scan error:', error as Error);
        Alert.alert('Error', `Failed to process NFC scan: ${error.message || 'Unknown error'}`);
        setShowNFCScanner(false);
      }
    };

    const executeAutomationSafely = async (automationData: AutomationData) => {
      try {
        EventLogger.debug('Automation', 'Starting safe automation execution...');
        
        // Execute the automation using AutomationEngine
        const engine = new AutomationEngine();
        EventLogger.debug('Automation', 'AutomationEngine created, executing...');
        
        const result = await engine.execute(automationData);
        EventLogger.debug('Automation', 'Execution completed, result:', result);
        
        // Wait a bit before showing the alert to prevent timing issues
        await new Promise(resolve => setTimeout(resolve, 200));
        
        if (result.success) {
          const executionTimeSeconds = result.executionTime ? Math.round(result.executionTime / 1000) : 0;
          Alert.alert(
            'Success! ✅',
            `Automation "${automationData.title}" completed successfully!\n\nSteps completed: ${result.stepsCompleted || 0}/${result.totalSteps || 0}\nExecution time: ${executionTimeSeconds}s`
          );
        } else {
          Alert.alert(
            'Execution Failed ❌',
            `Automation "${automationData.title}" failed to complete.\n\nError: ${result.error || 'Unknown error'}\nSteps completed: ${result.stepsCompleted || 0}/${result.totalSteps || 0}`
          );
        }
        
      } catch (execError: any) {
        EventLogger.error('Automation', 'Execution error:', execError as Error);
        Alert.alert(
          'Execution Error',
          `Failed to run automation: ${execError.message || 'Unknown error'}`
        );
      }
    };

    const getStepIcon = (stepType: StepType) => {
      const stepInfo = availableSteps.find(s => s.type === stepType);
      return stepInfo?.icon || 'cog';
    };

    const getStepTypeDisplayName = (stepType: StepType) => {
      const stepInfo = availableSteps.find(s => s.type === stepType);
      return stepInfo?.label || stepType;
    };

    const getStepDescription = (step: AutomationStep) => {
      if (!step.config) return 'Tap to configure';
      
      switch (step.type) {
        case 'notification':
          return step.config.message ? `"${step.config.message}"` : 'Show notification';
        case 'sms':
          return step.config.phoneNumber && step.config.message 
            ? `Send "${step.config.message}" to ${step.config.phoneNumber}`
            : 'Send SMS message';
        case 'email':
          return step.config.recipient && step.config.subject
            ? `Email "${step.config.subject}" to ${step.config.recipient}`
            : 'Send email';
        case 'delay':
          const seconds = step.config.delay ? step.config.delay / 1000 : 1;
          return `Wait ${seconds} second${seconds !== 1 ? 's' : ''}`;
        case 'variable':
          return step.config.name && step.config.value
            ? `Set ${step.config.name} = "${step.config.value}"`
            : 'Set variable';
        case 'get_variable':
          return step.config.name 
            ? `Get variable: ${step.config.name}`
            : 'Get variable';
        case 'text':
          return step.config.text 
            ? `Text: "${step.config.text}"`
            : 'Text action';
        case 'math':
          return step.config.expression 
            ? `Calculate: ${step.config.expression}`
            : 'Math calculation';
        case 'clipboard':
          return step.config.action === 'copy' 
            ? `Copy "${step.config.text || 'text'}" to clipboard`
            : step.config.action === 'paste' 
            ? 'Paste from clipboard'
            : 'Clipboard action';
        case 'open_url':
          return step.config.url 
            ? `Open ${step.config.url}`
            : 'Open URL';
        case 'location':
          return step.config.action === 'get_current'
            ? 'Get current location'
            : step.config.action === 'share_location'
            ? `Share location to ${step.config.phoneNumber || 'contact'}`
            : 'Location action';
        case 'app':
          return step.config.appName
            ? `Open ${step.config.appName}`
            : 'Open app';
        case 'webhook':
          return step.config.url && step.config.method
            ? `${step.config.method.toUpperCase()} ${step.config.url}`
            : 'HTTP request';
        default:
          return step.config.message || step.config.text || 'Tap to configure';
      }
    };

    const renderStepPicker = () => (
      <Portal>
        <Modal
          visible={showStepPicker}
          onDismiss={() => setShowStepPicker(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Step</Text>
            <ScrollView style={styles.stepList}>
              {availableSteps.map((stepType) => (
                <List.Item
                  key={stepType.type}
                  title={stepType.label}
                  description={stepType.description}
                  left={() => <Icon name={stepType.icon} size={24} color="#6200ee" />}
                  onPress={() => addStep(stepType.type)}
                  style={styles.stepListItem}
                />
              ))}
            </ScrollView>
            <Button onPress={() => setShowStepPicker(false)}>Cancel</Button>
          </View>
        </Modal>
      </Portal>
    );

    const renderStepConfigForm = () => {
      if (configStepIndex === null || !steps[configStepIndex]) return null;
      
      const step = steps[configStepIndex];
      
      switch (step.type) {
        case 'sms':
          return (
            <View style={styles.configForm}>
              <TextInput
                label="Phone Number"
                value={stepConfig.phoneNumber || ''}
                onChangeText={(text) => setStepConfig({ ...stepConfig, phoneNumber: text })}
                placeholder="+1234567890"
                keyboardType="phone-pad"
                style={styles.configInput}
              />
              <TextInput
                label="Message"
                value={stepConfig.message || ''}
                onChangeText={(text) => setStepConfig({ ...stepConfig, message: text })}
                placeholder="Enter your SMS message"
                multiline
                numberOfLines={3}
                style={styles.configInput}
              />
            </View>
          );
          
        case 'email':
          return (
            <View style={styles.configForm}>
              <TextInput
                label="Recipient Email"
                value={stepConfig.email || ''}
                onChangeText={(text) => setStepConfig({ ...stepConfig, email: text })}
                placeholder="recipient@example.com"
                keyboardType="email-address"
                style={styles.configInput}
              />
              <TextInput
                label="Subject"
                value={stepConfig.subject || ''}
                onChangeText={(text) => setStepConfig({ ...stepConfig, subject: text })}
                placeholder="Email subject"
                style={styles.configInput}
              />
              <TextInput
                label="Message"
                value={stepConfig.message || ''}
                onChangeText={(text) => setStepConfig({ ...stepConfig, message: text })}
                placeholder="Email body content"
                multiline
                numberOfLines={4}
                style={styles.configInput}
              />
            </View>
          );
          
        case 'webhook':
          return (
            <View style={styles.configForm}>
              <TextInput
                label="URL"
                value={stepConfig.url || ''}
                onChangeText={(text) => setStepConfig({ ...stepConfig, url: text })}
                placeholder="https://api.example.com/webhook"
                keyboardType="url"
                style={styles.configInput}
              />
              <Text style={styles.configLabel}>HTTP Method</Text>
              <SegmentedButtons
                value={stepConfig.method || 'POST'}
                onValueChange={(value) => setStepConfig({ ...stepConfig, method: value })}
                buttons={[
                  { value: 'GET', label: 'GET' },
                  { value: 'POST', label: 'POST' },
                  { value: 'PUT', label: 'PUT' },
                  { value: 'DELETE', label: 'DELETE' },
                ]}
                style={styles.configInput}
              />
              <TextInput
                label="Request Body (JSON)"
                value={stepConfig.body || ''}
                onChangeText={(text) => setStepConfig({ ...stepConfig, body: text })}
                placeholder='{"key": "value"}'
                multiline
                numberOfLines={3}
                style={styles.configInput}
              />
            </View>
          );
          
        case 'notification':
          return (
            <View style={styles.configForm}>
              <TextInput
                label="Title"
                value={stepConfig.title || ''}
                onChangeText={(text) => setStepConfig({ ...stepConfig, title: text })}
                placeholder="Notification title"
                style={styles.configInput}
              />
              <TextInput
                label="Message"
                value={stepConfig.message || ''}
                onChangeText={(text) => setStepConfig({ ...stepConfig, message: text })}
                placeholder="Notification message"
                multiline
                numberOfLines={3}
                style={styles.configInput}
              />
            </View>
          );
          
        case 'delay':
          return (
            <View style={styles.configForm}>
              <TextInput
                label="Delay (milliseconds)"
                value={String(stepConfig.delay || 1000)}
                onChangeText={(text) => setStepConfig({ ...stepConfig, delay: parseInt(text) || 1000 })}
                placeholder="1000"
                keyboardType="numeric"
                style={styles.configInput}
              />
              <Text style={styles.configHelper}>
                1000ms = 1 second, 5000ms = 5 seconds
              </Text>
            </View>
          );
          
        case 'variable':
          return (
            <View style={styles.configForm}>
              <TextInput
                label="Variable Name"
                value={stepConfig.name || ''}
                onChangeText={(text) => setStepConfig({ ...stepConfig, name: text })}
                placeholder="variableName"
                style={styles.configInput}
              />
              <TextInput
                label="Value"
                value={stepConfig.value || ''}
                onChangeText={(text) => setStepConfig({ ...stepConfig, value: text })}
                placeholder="Variable value"
                multiline
                numberOfLines={2}
                style={styles.configInput}
              />
              <Text style={styles.configHelper}>
                Stores a value that can be used in later steps. Reference this variable in other steps using {'{{'}<Text style={{fontStyle: 'italic'}}>variableName</Text>{'}}'}.
              </Text>
            </View>
          );

        case 'get_variable':
          return (
            <View style={styles.configForm}>
              <TextInput
                label="Variable Name"
                value={stepConfig.name || ''}
                onChangeText={(text) => setStepConfig({ ...stepConfig, name: text })}
                placeholder="variableName"
                style={styles.configInput}
              />
              <TextInput
                label="Default Value (optional)"
                value={stepConfig.defaultValue || ''}
                onChangeText={(text) => setStepConfig({ ...stepConfig, defaultValue: text })}
                placeholder="Default value if variable not found"
                style={styles.configInput}
              />
              <Text style={styles.configHelper}>
                Retrieves a previously stored variable value. If the variable doesn't exist, the default value will be used.
              </Text>
            </View>
          );

        case 'prompt_input':
          return (
            <View style={styles.configForm}>
              <TextInput
                label="Prompt Title"
                value={stepConfig.title || ''}
                onChangeText={(text) => setStepConfig({ ...stepConfig, title: text })}
                placeholder="Input Required"
                style={styles.configInput}
              />
              <TextInput
                label="Prompt Message"
                value={stepConfig.message || ''}
                onChangeText={(text) => setStepConfig({ ...stepConfig, message: text })}
                placeholder="Please enter a value:"
                multiline
                numberOfLines={2}
                style={styles.configInput}
              />
              <TextInput
                label="Variable Name"
                value={stepConfig.variableName || ''}
                onChangeText={(text) => setStepConfig({ ...stepConfig, variableName: text })}
                placeholder="userInput"
                style={styles.configInput}
              />
              <TextInput
                label="Default Value (optional)"
                value={stepConfig.defaultValue || ''}
                onChangeText={(text) => setStepConfig({ ...stepConfig, defaultValue: text })}
                placeholder="Default value"
                style={styles.configInput}
              />
              <Text style={styles.configHelper}>
                Shows a dialog to the user and stores their input in the specified variable. You can reference this variable in later steps using {'{{'}<Text style={{fontStyle: 'italic'}}>variableName</Text>{'}}'}.
              </Text>
            </View>
          );
          
        case 'location':
          return (
            <View style={styles.configForm}>
              <Text style={styles.configLabel}>Location Action</Text>
              <SegmentedButtons
                value={stepConfig.action || 'get_current'}
                onValueChange={(value) => setStepConfig({ ...stepConfig, action: value })}
                buttons={[
                  { value: 'get_current', label: 'Get Location' },
                  { value: 'share_location', label: 'Share Location' },
                  { value: 'open_maps', label: 'Open Maps' },
                ]}
                style={styles.configInput}
              />
              
              {stepConfig.action === 'get_current' && (
                <View style={styles.configSubSection}>
                  <Text style={styles.configLabel}>Show Result</Text>
                  <SegmentedButtons
                    value={stepConfig.showResult ? 'yes' : 'no'}
                    onValueChange={(value) => setStepConfig({ ...stepConfig, showResult: value === 'yes' })}
                    buttons={[
                      { value: 'yes', label: 'Yes' },
                      { value: 'no', label: 'No' },
                    ]}
                    style={styles.configInput}
                  />
                </View>
              )}
              
              {stepConfig.action === 'share_location' && (
                <View style={styles.configSubSection}>
                  <TextInput
                    label="Phone Number (optional)"
                    value={stepConfig.phoneNumber || ''}
                    onChangeText={(text) => setStepConfig({ ...stepConfig, phoneNumber: text })}
                    placeholder="+1234567890"
                    keyboardType="phone-pad"
                    style={styles.configInput}
                  />
                  <TextInput
                    label="Message"
                    value={stepConfig.message || 'My current location'}
                    onChangeText={(text) => setStepConfig({ ...stepConfig, message: text })}
                    placeholder="Location sharing message"
                    style={styles.configInput}
                  />
                </View>
              )}
              
              {stepConfig.action === 'open_maps' && (
                <View style={styles.configSubSection}>
                  <Text style={styles.configLabel}>Location Source</Text>
                  <SegmentedButtons
                    value={stepConfig.useCurrentLocation ? 'current' : 'custom'}
                    onValueChange={(value) => setStepConfig({ 
                      ...stepConfig, 
                      useCurrentLocation: value === 'current',
                      latitude: value === 'current' ? undefined : stepConfig.latitude,
                      longitude: value === 'current' ? undefined : stepConfig.longitude,
                    })}
                    buttons={[
                      { value: 'current', label: 'Current' },
                      { value: 'custom', label: 'Custom' },
                    ]}
                    style={styles.configInput}
                  />
                  
                  {!stepConfig.useCurrentLocation && (
                    <>
                      <TextInput
                        label="Latitude"
                        value={String(stepConfig.latitude || '')}
                        onChangeText={(text) => setStepConfig({ ...stepConfig, latitude: parseFloat(text) || 0 })}
                        placeholder="40.7128"
                        keyboardType="numeric"
                        style={styles.configInput}
                      />
                      <TextInput
                        label="Longitude"
                        value={String(stepConfig.longitude || '')}
                        onChangeText={(text) => setStepConfig({ ...stepConfig, longitude: parseFloat(text) || 0 })}
                        placeholder="-74.0060"
                        keyboardType="numeric"
                        style={styles.configInput}
                      />
                    </>
                  )}
                  
                  <TextInput
                    label="Location Label"
                    value={stepConfig.label || ''}
                    onChangeText={(text) => setStepConfig({ ...stepConfig, label: text })}
                    placeholder="My Location"
                    style={styles.configInput}
                  />
                </View>
              )}
            </View>
          );
          
        case 'condition':
          return (
            <View style={styles.configForm}>
              <TextInput
                label="Variable Name"
                value={stepConfig.variable || ''}
                onChangeText={(text) => setStepConfig({ ...stepConfig, variable: text })}
                placeholder="myVariable"
                style={styles.configInput}
              />
              <Text style={styles.configLabel}>Condition</Text>
              <SegmentedButtons
                value={stepConfig.condition || 'equals'}
                onValueChange={(value) => setStepConfig({ ...stepConfig, condition: value })}
                buttons={[
                  { value: 'equals', label: 'Equals' },
                  { value: 'contains', label: 'Contains' },
                  { value: 'greater', label: 'Greater' },
                  { value: 'less', label: 'Less' },
                ]}
                style={styles.configInput}
              />
              <TextInput
                label="Compare Value"
                value={stepConfig.value || ''}
                onChangeText={(text) => setStepConfig({ ...stepConfig, value: text })}
                placeholder="test"
                style={styles.configInput}
              />
            </View>
          );
          
        case 'loop':
          return (
            <View style={styles.configForm}>
              <Text style={styles.configLabel}>Loop Type</Text>
              <SegmentedButtons
                value={stepConfig.type || 'count'}
                onValueChange={(value) => setStepConfig({ ...stepConfig, type: value })}
                buttons={[
                  { value: 'count', label: 'Count' },
                  { value: 'while', label: 'While' },
                  { value: 'foreach', label: 'For Each' },
                ]}
                style={styles.configInput}
              />
              {stepConfig.type === 'count' && (
                <TextInput
                  label="Repeat Count"
                  value={String(stepConfig.count || 3)}
                  onChangeText={(text) => setStepConfig({ ...stepConfig, count: parseInt(text) || 3 })}
                  placeholder="3"
                  keyboardType="numeric"
                  style={styles.configInput}
                />
              )}
            </View>
          );
          
        case 'text':
          return (
            <View style={styles.configForm}>
              <Text style={styles.configLabel}>Text Action</Text>
              <SegmentedButtons
                value={stepConfig.action || 'combine'}
                onValueChange={(value) => setStepConfig({ ...stepConfig, action: value })}
                buttons={[
                  { value: 'combine', label: 'Combine' },
                  { value: 'replace', label: 'Replace' },
                  { value: 'format', label: 'Format' },
                ]}
                style={styles.configInput}
              />
              <TextInput
                label="Text 1"
                value={stepConfig.text1 || ''}
                onChangeText={(text) => setStepConfig({ ...stepConfig, text1: text })}
                placeholder="Hello"
                style={styles.configInput}
              />
              <TextInput
                label="Text 2"
                value={stepConfig.text2 || ''}
                onChangeText={(text) => setStepConfig({ ...stepConfig, text2: text })}
                placeholder="World"
                style={styles.configInput}
              />
            </View>
          );
          
        case 'math':
          return (
            <View style={styles.configForm}>
              <Text style={styles.configLabel}>Operation</Text>
              <SegmentedButtons
                value={stepConfig.operation || 'add'}
                onValueChange={(value) => setStepConfig({ ...stepConfig, operation: value })}
                buttons={[
                  { value: 'add', label: '+' },
                  { value: 'subtract', label: '-' },
                  { value: 'multiply', label: '×' },
                  { value: 'divide', label: '÷' },
                ]}
                style={styles.configInput}
              />
              <TextInput
                label="Number 1"
                value={String(stepConfig.number1 || 10)}
                onChangeText={(text) => setStepConfig({ ...stepConfig, number1: parseFloat(text) || 0 })}
                placeholder="10"
                keyboardType="numeric"
                style={styles.configInput}
              />
              <TextInput
                label="Number 2"
                value={String(stepConfig.number2 || 5)}
                onChangeText={(text) => setStepConfig({ ...stepConfig, number2: parseFloat(text) || 0 })}
                placeholder="5"
                keyboardType="numeric"
                style={styles.configInput}
              />
            </View>
          );
          
        case 'clipboard':
          return (
            <View style={styles.configForm}>
              <Text style={styles.configLabel}>Clipboard Action</Text>
              <SegmentedButtons
                value={stepConfig.action || 'copy'}
                onValueChange={(value) => setStepConfig({ ...stepConfig, action: value })}
                buttons={[
                  { value: 'copy', label: 'Copy' },
                  { value: 'paste', label: 'Paste' },
                ]}
                style={styles.configInput}
              />
              {stepConfig.action === 'copy' && (
                <TextInput
                  label="Text to Copy"
                  value={stepConfig.text || ''}
                  onChangeText={(text) => setStepConfig({ ...stepConfig, text: text })}
                  placeholder="Hello World"
                  multiline
                  numberOfLines={3}
                  style={styles.configInput}
                />
              )}
            </View>
          );
          
        case 'app':
          return (
            <View style={styles.configForm}>
              <TextInput
                label="App Name"
                value={stepConfig.appName || ''}
                onChangeText={(text) => setStepConfig({ ...stepConfig, appName: text })}
                placeholder="Settings"
                style={styles.configInput}
              />
              <TextInput
                label="URL Scheme (Optional)"
                value={stepConfig.url || ''}
                onChangeText={(text) => setStepConfig({ ...stepConfig, url: text })}
                placeholder="settings://"
                style={styles.configInput}
              />
            </View>
          );
          
        default:
          return (
            <Text style={styles.configMessage}>
              Configuration for {step.type} is not implemented yet.
            </Text>
          );
      }
    };

    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Automation Builder" />
          <Appbar.Action
            icon="nfc"
            onPress={() => setShowNFCScanner(true)}
          />
          <Appbar.Action
            icon="nfc-variant"
            onPress={() => {
              if (isTemplatePreview) {
                Alert.alert(
                  'Template Preview',
                  'This is a template preview. Please use the template to create your own automation first before writing to NFC.',
                  [
                    { text: 'OK' }
                  ]
                );
              } else if (!savedAutomationId) {
                Alert.alert(
                  'Save Required',
                  'Please save your automation before writing to NFC',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Save Now', onPress: executeAutomation }
                  ]
                );
              } else {
                setShowNFCWriter(true);
              }
            }}
          />
          <Appbar.Action
            icon="qrcode-scan"
            onPress={() => setShowQRScanner(true)}
          />
          {savedAutomationId && (
            <Appbar.Action
              icon="qrcode"
              onPress={() => setShowQRGenerator(true)}
            />
          )}
          <Appbar.Action
            icon={useSafeEditor ? "gesture-tap" : "gesture-swipe"}
            onPress={() => setUseSafeEditor(!useSafeEditor)}
          />
          <Appbar.Action
            icon="play"
            onPress={executeAutomation}
            disabled={isExecuting}
          />
        </Appbar.Header>

        {steps.length > 0 ? (
          <View style={styles.contentWithSteps}>
            <ScrollView style={styles.headerSection} showsVerticalScrollIndicator={false}>
              <Card style={styles.infoCard}>
                <Card.Content>
                  {isEditingTitle ? (
                    <TextInput
                      mode="outlined"
                      style={styles.titleInput}
                      value={automationTitle}
                      onChangeText={setAutomationTitle}
                      onBlur={() => setIsEditingTitle(false)}
                      autoFocus
                      placeholder="Automation Name"
                      theme={{ colors: { primary: colors.primary } }}
                    />
                  ) : (
                    <TouchableOpacity onPress={() => setIsEditingTitle(true)}>
                      <View style={styles.titleContainer}>
                        <Text style={styles.title}>{automationTitle || 'Tap to set name'}</Text>
                        <Icon name="pencil" size={16} color="#666" style={styles.editIcon} />
                      </View>
                    </TouchableOpacity>
                  )}
                  <View style={styles.meta}>
                    <Chip icon="layers" compact>{steps.length} steps</Chip>
                    <Chip icon="check-circle" compact>
                      {steps.filter(s => s.enabled).length} enabled
                    </Chip>
                    <Chip icon="clock" compact>
                      ~{steps.length * 0.5}s runtime
                    </Chip>
                  </View>
                </Card.Content>
              </Card>
              
              {/* Template Load Message */}
              {templateLoadMessage && (
                <Card style={[styles.infoCard, { backgroundColor: '#4CAF50' }]}>
                  <Card.Content>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Icon name="check-circle" size={20} color="white" style={{ marginRight: 8 }} />
                      <Text style={{ color: 'white', flex: 1 }}>{templateLoadMessage}</Text>
                    </View>
                  </Card.Content>
                </Card>
              )}
            </ScrollView>
            
            <View style={styles.stepEditorContainer}>
              {useSafeEditor ? (
                <SafeStepEditor
                  steps={steps}
                  onStepsChange={setSteps}
                  onStepEdit={openStepConfig}
                  onStepDelete={removeStep}
                  readonly={route?.params?.readonly}
                />
              ) : (
                <VisualStepEditor
                  steps={steps}
                  onStepsChange={setSteps}
                  onStepEdit={openStepConfig}
                  onStepDelete={removeStep}
                  readonly={route?.params?.readonly}
                />
              )}
            </View>
          </View>
        ) : (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Card style={styles.infoCard}>
              <Card.Content>
                {isEditingTitle ? (
                  <TextInput
                    mode="outlined"
                    style={styles.titleInput}
                    value={automationTitle}
                    onChangeText={setAutomationTitle}
                    onBlur={() => setIsEditingTitle(false)}
                    autoFocus
                    placeholder="Automation Name"
                    theme={{ colors: { primary: colors.primary } }}
                  />
                ) : (
                  <TouchableOpacity onPress={() => setIsEditingTitle(true)}>
                    <View style={styles.titleContainer}>
                      <Text style={styles.title}>{automationTitle || 'Tap to set name'}</Text>
                      <Icon name="pencil" size={16} color="#666" style={styles.editIcon} />
                    </View>
                  </TouchableOpacity>
                )}
                <View style={styles.meta}>
                  <Chip icon="layers" compact>{steps.length} steps</Chip>
                  <Chip icon="check-circle" compact>
                    {steps.filter(s => s.enabled).length} enabled
                  </Chip>
                  <Chip icon="clock" compact>
                    ~{steps.length * 0.5}s runtime
                  </Chip>
                </View>
              </Card.Content>
            </Card>
            
            <Card style={styles.emptyCard}>
              <Card.Content>
                <View style={styles.emptyState}>
                  <Icon name="robot" size={64} color="#ccc" />
                  <Text style={styles.emptyTitle}>No Steps Added</Text>
                  <Text style={styles.emptyDescription}>
                    Tap the + button to add your first automation step
                  </Text>
                  <Button
                    mode="contained"
                    onPress={() => setShowStepPicker(true)}
                    icon="plus"
                    style={styles.emptyButton}
                  >
                    Add First Step
                  </Button>
                </View>
              </Card.Content>
            </Card>
          </ScrollView>
        )}

        {renderStepPicker()}

        {/* Modern Step Configuration Modal */}
        <StepConfigModal
          visible={showStepConfig}
          stepType={configStepIndex !== null && configStepIndex < steps.length ? steps[configStepIndex].type : ''}
          stepTitle={configStepIndex !== null && configStepIndex < steps.length ? steps[configStepIndex].title : ''}
          stepConfig={stepConfig}
          onSave={(config) => {
            setStepConfig(config);
            saveStepConfig();
          }}
          onCancel={cancelStepConfig}
          renderConfigForm={() => {
            if (configStepIndex !== null && configStepIndex < steps.length && steps[configStepIndex]) {
              return (
                <ModernStepConfigRenderer
                  step={steps[configStepIndex]}
                  config={stepConfig}
                  onConfigChange={setStepConfig}
                />
              );
            }
            return null;
          }}
        />

        {/* QR Generator Modal */}
        <FullScreenModal
          visible={showQRGenerator}
          onDismiss={() => setShowQRGenerator(false)}
        >
          {savedAutomationId && (
            <QRGenerator
              automationId={savedAutomationId}
              automationTitle={automationTitle}
              automationDescription="Created with Automation Builder"
              creator="You"
              automation={{
                id: savedAutomationId,
                title: automationTitle,
                description: 'Created with Automation Builder',
                steps,
                created_by: '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                is_public: false,
                category: 'Productivity',
                tags: ['custom', 'builder'],
                execution_count: 0,
                average_rating: 0,
                rating_count: 0,
              }}
              onClose={() => setShowQRGenerator(false)}
            />
          )}
        </FullScreenModal>

        {/* QR Scanner Modal */}
        <FullScreenModal
          visible={showQRScanner}
          onDismiss={() => setShowQRScanner(false)}
        >
          <QRScanner
            onScan={handleQRScan}
            onClose={() => setShowQRScanner(false)}
          />
        </FullScreenModal>

        {/* NFC Scanner Modal */}
        <FullScreenModal
          visible={showNFCScanner}
          onDismiss={() => setShowNFCScanner(false)}
        >
          <NFCScanner
            onScan={handleNFCScan}
            onClose={() => setShowNFCScanner(false)}
          />
        </FullScreenModal>

        {/* NFC Writer Modal */}
        <FullScreenModal
          visible={showNFCWriter}
          onDismiss={() => setShowNFCWriter(false)}
        >
          {savedAutomationId ? (
            <NFCWriter
              automation={{
                id: savedAutomationId,
                title: automationTitle,
                description: 'Created with Automation Builder',
                steps,
                created_by: '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                is_public: false,
                category: 'Productivity',
                tags: ['custom', 'builder'],
                execution_count: 0,
                average_rating: 0,
                rating_count: 0,
              }}
              onSuccess={() => {
                setShowNFCWriter(false);
                Alert.alert(
                  'NFC Write Successful! 🎉',
                  'Your automation has been written to the NFC tag!'
                );
              }}
              onClose={() => setShowNFCWriter(false)}
            />
          ) : (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ fontSize: 18, marginBottom: 20 }}>
                Please save your automation first before writing to NFC
              </Text>
              <Button mode="contained" onPress={() => {
                setShowNFCWriter(false);
                executeAutomation();
              }}>
                Save Automation
              </Button>
            </View>
          )}
        </FullScreenModal>

        {/* Share Automation Modal */}
        {savedAutomationId && (
          <ShareAutomationModal
            visible={showShareModal}
            automation={{
              id: savedAutomationId,
              title: automationTitle,
              description: 'Created with Automation Builder',
              steps,
              created_by: '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              is_public: false,
              category: 'Productivity',
              tags: ['custom', 'builder'],
              execution_count: 0,
              average_rating: 0,
              rating_count: 0,
            }}
            onClose={() => setShowShareModal(false)}
          />
        )}
        
        {/* Floating Action Button for adding steps */}
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => setShowStepPicker(true)}
          label="Add Step"
        />
      </View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f5f5f5',
    },
    content: {
      flex: 1,
      padding: 16,
      paddingBottom: Platform.OS === 'ios' ? 100 : 90,
    },
    contentWithSteps: {
      flex: 1,
    },
    headerSection: {
      maxHeight: 150,
      padding: 16,
    },
    infoCard: {
      marginBottom: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: '600',
      textAlign: 'center',
    },
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    titleInput: {
    marginBottom: 12,
    textAlign: 'center',
    },
    editIcon: {
      marginLeft: 8,
    },
    meta: {
      flexDirection: 'row',
      justifyContent: 'center',
      flexWrap: 'wrap',
      gap: 8,
    },
    emptyCard: {
      marginTop: 32,
    },
    emptyState: {
      alignItems: 'center',
      padding: 32,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginTop: 16,
      marginBottom: 8,
    },
    emptyDescription: {
      fontSize: 14,
      color: '#666',
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 20,
    },
    emptyButton: {
      minWidth: 150,
    },
    stepCard: {
      marginBottom: 8,
    },
    stepHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    stepInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    stepText: {
      marginLeft: 12,
      flex: 1,
    },
    stepTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 2,
    },
    stepType: {
      fontSize: 14,
      color: '#666',
      marginBottom: 2,
    },
    stepConfig: {
      fontSize: 12,
      color: '#999',
      fontFamily: 'monospace',
    },
    disabledText: {
      color: '#999',
    },
    stepActions: {
      flexDirection: 'row',
    },
    fab: {
      position: 'absolute',
      margin: 16,
      right: 0,
      bottom: Platform.OS === 'ios' ? 90 : 80,
    },
    modalContainer: {
      backgroundColor: 'white',
      margin: 20,
      borderRadius: 12,
      maxHeight: '80%',
    },
    modalContent: {
      padding: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '600',
      marginBottom: 16,
      textAlign: 'center',
    },
    stepList: {
      maxHeight: 400,
    },
    stepListItem: {
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
    },
    bottomSpacer: {
      height: 80,
    },
    configForm: {
      marginBottom: 16,
    },
    configInput: {
      marginBottom: 12,
    },
    configLabel: {
      fontSize: 16,
      fontWeight: '500',
      marginBottom: 8,
      marginTop: 8,
      color: '#333',
    },
    configHelper: {
      fontSize: 12,
      color: '#666',
      fontStyle: 'italic',
      marginTop: -8,
      marginBottom: 8,
    },
    configMessage: {
      fontSize: 14,
      color: '#666',
      textAlign: 'center',
      padding: 20,
      fontStyle: 'italic',
    },
    configActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    configButton: {
      flex: 1,
    },
    configSubSection: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: '#eee',
    },
    stepEditorContainer: {
      flex: 1,
    },
    emptyCard: {
      marginTop: 32,
    },
    emptyState: {
      alignItems: 'center',
      padding: 32,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginTop: 16,
      marginBottom: 8,
    },
    emptyDescription: {
      fontSize: 14,
      color: '#666',
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 20,
    },
    emptyButton: {
      minWidth: 150,
    },
  });

  export default AutomationBuilderScreen;