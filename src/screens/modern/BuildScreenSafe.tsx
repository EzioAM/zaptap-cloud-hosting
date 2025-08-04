import React, { useState, useCallback, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
// import { useAutomationForm } from '../../hooks/useAutomationForm';
import { useOptimizedComponents } from '../../hooks/useOptimizedComponents';
import { ErrorState } from '../../components/states/ErrorState';
import { EmptyState } from '../../components/states/EmptyState';
import { ModernStepConfigRenderer } from '../../components/automation/ModernStepConfigRenderer';

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

export default function BuildScreenSafe() {
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
  
  const categories = ['All', 'Communication', 'Web & Data', 'Device & System', 'Apps & Services', 'Control Flow'];
  
  const filteredStepTypes = stepTypes.filter(step => 
    selectedCategory === 'All' || step.category === selectedCategory
  );

  const handleAddStep = (stepType: typeof stepTypes[0]) => {
    const newStep: AutomationStep = {
      id: Date.now().toString(),
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
    setSteps(steps.filter(s => s.id !== stepId));
  };

  const handleUpdateStep = (stepId: string, updates: Partial<AutomationStep>) => {
    setSteps(steps.map(s => s.id === stepId ? { ...s, ...updates } : s));
  };

  const handleOpenStepConfig = (step: AutomationStep) => {
    setSelectedStep(step);
    setStepConfig(step.config || {});
    setIsConfigModalVisible(true);
  };

  const handleConfigSave = () => {
    if (selectedStep) {
      handleUpdateStep(selectedStep.id, { config: stepConfig });
    }
    setIsConfigModalVisible(false);
    setStepConfig({});
  };

  const handleSaveAutomation = async () => {
    if (!automationName.trim()) {
      Alert.alert('Error', 'Please enter a name for your automation');
      return;
    }
    
    if (steps.length === 0) {
      Alert.alert('Error', 'Please add at least one step to your automation');
      return;
    }

    try {
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
      Alert.alert('Success', 'Automation created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to create automation. Please try again.');
    }
  };

  const renderStepItem = ({ item, drag, isActive }: RenderItemParams<AutomationStep>) => {
    return (
      <ScaleDecorator>
        <TouchableOpacity
          onPress={() => handleOpenStepConfig(item)}
          onLongPress={drag}
          disabled={isActive}
          style={[
            styles.stepItem,
            { backgroundColor: theme.colors?.surface || '#fff' },
            isActive && styles.stepItemActive,
          ]}
        >
          <View style={styles.stepItemLeft}>
            <View style={[styles.stepIcon, { backgroundColor: item.color }]}>
              <MaterialCommunityIcons 
                name={item.icon as any} 
                size={24} 
                color="white" 
              />
            </View>
            <View style={styles.stepInfo}>
              <Text style={[styles.stepTitle, { color: theme.colors?.text || '#000' }]}>
                {item.title}
              </Text>
              {item.config && Object.keys(item.config).length > 0 && (
                <Text style={[styles.stepConfigPreview, { color: theme.colors?.textSecondary || '#666' }]}>
                  Configured
                </Text>
              )}
            </View>
          </View>
          <View style={styles.stepItemRight}>
            <TouchableOpacity
              onPress={() => handleUpdateStep(item.id, { enabled: !item.enabled })}
              style={styles.stepToggle}
            >
              <MaterialCommunityIcons 
                name={item.enabled ? 'toggle-switch' : 'toggle-switch-off'} 
                size={32} 
                color={item.enabled ? theme.colors?.primary || '#2196F3' : '#ccc'} 
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDeleteStep(item.id)}
              style={styles.stepDelete}
            >
              <MaterialCommunityIcons 
                name="close-circle" 
                size={24} 
                color="#ff4444" 
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </ScaleDecorator>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors?.background || '#f5f5f5' }]}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: theme.colors?.text || '#000' }]}>
              Build Automation
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors?.textSecondary || '#666' }]}>
              Create powerful automations with simple steps
            </Text>
          </View>

          {/* Name & Description */}
          <View style={[styles.card, { backgroundColor: theme.colors?.surface || '#fff' }]}>
            <TextInput
              style={[styles.input, { color: theme.colors?.text || '#000' }]}
              placeholder="Automation Name"
              placeholderTextColor={theme.colors?.textSecondary || '#999'}
              value={automationName}
              onChangeText={setAutomationName}
            />
            <TextInput
              style={[styles.input, styles.textArea, { color: theme.colors?.text || '#000' }]}
              placeholder="Description (optional)"
              placeholderTextColor={theme.colors?.textSecondary || '#999'}
              value={automationDescription}
              onChangeText={setAutomationDescription}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Steps */}
          <View style={[styles.card, { backgroundColor: theme.colors?.surface || '#fff' }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: theme.colors?.text || '#000' }]}>
                Steps
              </Text>
              <TouchableOpacity
                onPress={() => setIsStepPickerVisible(true)}
                style={[styles.addButton, { backgroundColor: theme.colors?.primary || '#2196F3' }]}
              >
                <MaterialCommunityIcons name="plus" size={24} color="white" />
                <Text style={styles.addButtonText}>Add Step</Text>
              </TouchableOpacity>
            </View>

            {steps.length === 0 ? (
              <EmptyState
                icon="puzzle"
                title="No steps yet"
                description="Add steps to build your automation"
              />
            ) : (
              <DraggableFlatList
                data={steps}
                onDragEnd={({ data }) => setSteps(data)}
                keyExtractor={item => item.id}
                renderItem={renderStepItem}
                style={styles.stepsList}
              />
            )}
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={[styles.footer, { backgroundColor: theme.colors?.background || '#f5f5f5' }]}>
          <TouchableOpacity
            onPress={handleSaveAutomation}
            disabled={isSaving || !automationName.trim() || steps.length === 0}
            style={[
              styles.saveButton,
              { backgroundColor: theme.colors?.primary || '#2196F3' },
              (isSaving || !automationName.trim() || steps.length === 0) && styles.saveButtonDisabled
            ]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <MaterialCommunityIcons name="content-save" size={24} color="white" />
                <Text style={styles.saveButtonText}>Save Automation</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Step Picker Modal */}
      <Modal
        visible={isStepPickerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsStepPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors?.surface || '#fff' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors?.text || '#000' }]}>
                Choose Step Type
              </Text>
              <TouchableOpacity
                onPress={() => setIsStepPickerVisible(false)}
                style={styles.modalClose}
              >
                <MaterialCommunityIcons name="close" size={24} color={theme.colors?.text || '#000'} />
              </TouchableOpacity>
            </View>

            {/* Category Filter */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
            >
              {categories.map(category => (
                <TouchableOpacity
                  key={category}
                  onPress={() => setSelectedCategory(category)}
                  style={[
                    styles.categoryChip,
                    { backgroundColor: selectedCategory === category ? theme.colors?.primary || '#2196F3' : theme.colors?.surface || '#f0f0f0' }
                  ]}
                >
                  <Text style={[
                    styles.categoryChipText,
                    { color: selectedCategory === category ? 'white' : theme.colors?.text || '#000' }
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <FlatList
              data={filteredStepTypes}
              keyExtractor={item => item.type}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleAddStep(item)}
                  style={styles.stepTypeItem}
                >
                  <View style={[styles.stepTypeIcon, { backgroundColor: item.color }]}>
                    <MaterialCommunityIcons 
                      name={item.icon as any} 
                      size={24} 
                      color="white" 
                    />
                  </View>
                  <Text style={[styles.stepTypeTitle, { color: theme.colors?.text || '#000' }]}>
                    {item.title}
                  </Text>
                </TouchableOpacity>
              )}
              style={styles.stepTypesList}
            />
          </View>
        </View>
      </Modal>

      {/* Step Config Modal */}
      <Modal
        visible={isConfigModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsConfigModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors?.surface || '#fff' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors?.text || '#000' }]}>
                Configure {selectedStep?.title}
              </Text>
              <TouchableOpacity
                onPress={() => setIsConfigModalVisible(false)}
                style={styles.modalClose}
              >
                <MaterialCommunityIcons name="close" size={24} color={theme.colors?.text || '#000'} />
              </TouchableOpacity>
            </View>

            {selectedStep && (
              <View style={styles.configContainer}>
                <ModernStepConfigRenderer
                  step={selectedStep}
                  config={stepConfig}
                  onConfigChange={setStepConfig}
                />
                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: theme.colors?.primary || '#2196F3' }]}
                  onPress={handleConfigSave}
                >
                  <Text style={styles.saveButtonText}>Save Configuration</Text>
                </TouchableOpacity>
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
  header: {
    padding: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  card: {
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  stepsList: {
    maxHeight: 400,
  },
  stepItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  stepItemActive: {
    opacity: 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  stepItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stepIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  stepConfigPreview: {
    fontSize: 14,
    marginTop: 2,
  },
  stepItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepToggle: {
    marginRight: 8,
  },
  stepDelete: {
    padding: 4,
  },
  footer: {
    padding: 20,
    paddingBottom: 30,
  },
  saveButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalClose: {
    padding: 4,
  },
  categoryScroll: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  stepTypesList: {
    paddingHorizontal: 20,
  },
  stepTypeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  stepTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepTypeTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  configContainer: {
    padding: 20,
    alignItems: 'center',
  },
  configTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  configSubtitle: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
  },
  saveButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});