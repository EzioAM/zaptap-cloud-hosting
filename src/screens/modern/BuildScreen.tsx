import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { useCreateAutomationMutation } from '../../store/api/automationApi';
import { Alert } from 'react-native';

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
  { type: 'scrape', title: 'Scrape Web Page', icon: 'web', color: '#00BCD4', category: 'Web & Data' },
  
  // Control Flow
  { type: 'delay', title: 'Wait/Delay', icon: 'timer-sand', color: '#607D8B', category: 'Control Flow' },
  { type: 'condition', title: 'If/Then', icon: 'code-braces', color: '#795548', category: 'Control Flow' },
  { type: 'loop', title: 'Repeat/Loop', icon: 'repeat', color: '#FF5722', category: 'Control Flow' },
  
  // Variables & Data
  { type: 'variable', title: 'Set Variable', icon: 'variable', color: '#E91E63', category: 'Variables' },
  { type: 'get_variable', title: 'Get Variable', icon: 'variable-box', color: '#E91E63', category: 'Variables' },
  { type: 'prompt_input', title: 'Ask for Input', icon: 'form-textbox', color: '#9C27B0', category: 'Variables' },
  
  // System
  { type: 'clipboard', title: 'Copy to Clipboard', icon: 'content-copy', color: '#009688', category: 'System' },
  { type: 'open_url', title: 'Open URL', icon: 'open-in-new', color: '#FF6B6B', category: 'System' },
  { type: 'share_text', title: 'Share Text', icon: 'share-variant', color: '#673AB7', category: 'System' },
  
  // Location
  { type: 'location', title: 'Location', icon: 'map-marker', color: '#4CAF50', category: 'Location' },
  
  // Advanced
  { type: 'text', title: 'Text Operations', icon: 'format-text', color: '#FFC107', category: 'Advanced' },
  { type: 'math', title: 'Math Operations', icon: 'calculator', color: '#03A9F4', category: 'Advanced' },
  { type: 'photo', title: 'Take/Select Photo', icon: 'camera', color: '#8BC34A', category: 'Advanced' },
  { type: 'app', title: 'Open App', icon: 'application', color: '#FF5722', category: 'Advanced' },
];

const BuildScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { user } = useSelector((state: RootState) => state.auth);
  const [automationName, setAutomationName] = useState('');
  const [steps, setSteps] = useState<AutomationStep[]>([]);
  const [isAddStepModalVisible, setIsAddStepModalVisible] = useState(false);
  const [editingStep, setEditingStep] = useState<AutomationStep | null>(null);
  const [createAutomation, { isLoading }] = useCreateAutomationMutation();

  const styles = createStyles(theme);

  const getStepCategories = () => {
    const categories = new Map<string, typeof stepTypes>();
    
    stepTypes.forEach((step) => {
      const category = step.category || 'Other';
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(step);
    });
    
    return Array.from(categories.entries()).map(([name, steps]) => ({
      name,
      steps,
    }));
  };

  const addStep = (stepType: typeof stepTypes[0]) => {
    const newStep: AutomationStep = {
      id: Date.now().toString(),
      type: stepType.type,
      title: stepType.title,
      icon: stepType.icon,
      color: stepType.color,
    };
    setSteps([...steps, newStep]);
    setIsAddStepModalVisible(false);
  };

  const handleTestRun = () => {
    if (!automationName || steps.length === 0) {
      Alert.alert('Error', 'Please add at least one step to test');
      return;
    }

    // Create temporary automation for testing
    const testAutomation = {
      id: 'test-' + Date.now(),
      title: automationName || 'Test Automation',
      description: 'Test run',
      created_by: user?.id || 'anonymous',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_public: false,
      category: 'Productivity',
      tags: ['test'],
      execution_count: 0,
      average_rating: 0,
      rating_count: 0,
      steps: steps.map((step, index) => ({
        id: step.id,
        type: step.type,
        title: step.title,
        config: step.config || {},
        enabled: step.enabled !== false,
      })),
    };

    // Navigate to test screen
    navigation.navigate('AutomationTest' as never, { automation: testAutomation } as never);
  };

  const handleSave = async () => {
    if (!automationName || steps.length === 0) {
      Alert.alert('Error', 'Please enter a name and add at least one step');
      return;
    }

    if (!user) {
      Alert.alert('Authentication Required', 'Please log in to save automations');
      navigation.navigate('SignIn' as never);
      return;
    }

    try {
      console.log('Starting save automation...');
      console.log('User:', user);
      console.log('Automation name:', automationName);
      console.log('Steps:', steps);

      const automationData = {
        title: automationName,
        description: `Created with ${steps.length} steps`,
        category: 'Productivity',
        steps: steps.map((step, index) => ({
          id: step.id,
          type: step.type,
          title: step.title,
          config: step.config || {},
          enabled: step.enabled !== false,
        })),
        tags: ['custom', 'builder'],
        is_public: false,
      };

      console.log('Automation data to save:', JSON.stringify(automationData, null, 2));

      const result = await createAutomation(automationData).unwrap();
      console.log('Save result:', result);
      
      Alert.alert(
        'Success',
        'Automation created successfully!',
        [
          {
            text: 'View Details',
            onPress: () => navigation.navigate('AutomationDetails' as never, { automationId: result.id } as never),
          },
          {
            text: 'Advanced Edit',
            onPress: () => navigation.navigate('AutomationBuilder' as never, { automationId: result.id } as never),
          },
          {
            text: 'OK',
            style: 'cancel',
          },
        ],
      );
      
      // Reset form
      setAutomationName('');
      setSteps([]);
    } catch (error: any) {
      console.error('Failed to create automation:', error);
      const errorMessage = error?.message || error?.error || 'Failed to create automation';
      Alert.alert('Error', errorMessage);
    }
  };

  const removeStep = (stepId: string) => {
    setSteps(steps.filter(step => step.id !== stepId));
  };

  const duplicateStep = (step: AutomationStep) => {
    const newStep: AutomationStep = {
      ...step,
      id: Date.now().toString(),
      config: { ...step.config },
    };
    const stepIndex = steps.findIndex(s => s.id === step.id);
    const newSteps = [...steps];
    newSteps.splice(stepIndex + 1, 0, newStep);
    setSteps(newSteps);
  };

  const renderStep = ({ item, drag, isActive }: RenderItemParams<AutomationStep>) => {
    return (
      <ScaleDecorator>
        <TouchableOpacity
          style={[
            styles.stepCard,
            { backgroundColor: theme.colors.surface },
            isActive && styles.draggingCard,
          ]}
          onLongPress={drag}
          onPress={() => setEditingStep(item)}
          activeOpacity={0.7}
        >
          <View style={styles.stepHandle}>
            <MaterialCommunityIcons
              name="drag"
              size={24}
              color={theme.colors.textSecondary}
            />
          </View>
          <View
            style={[
              styles.stepIcon,
              { backgroundColor: `${item.color}20` },
            ]}
          >
            <MaterialCommunityIcons
              name={item.icon as any}
              size={20}
              color={item.color}
            />
          </View>
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
              {item.title}
            </Text>
            <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
              Tap to configure
            </Text>
          </View>
          <View style={styles.stepActions}>
            <TouchableOpacity
              onPress={() => duplicateStep(item)}
              style={styles.actionButton}
            >
              <MaterialCommunityIcons
                name="content-copy"
                size={18}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => removeStep(item.id)}
              style={styles.actionButton}
            >
              <MaterialCommunityIcons
                name="close-circle"
                size={20}
                color={theme.colors.error}
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </ScaleDecorator>
    );
  };

  const renderStepType = ({ item }: { item: typeof stepTypes[0] }) => (
    <TouchableOpacity
      style={[styles.stepTypeCard, { backgroundColor: theme.colors.surface }]}
      onPress={() => addStep(item)}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.stepTypeIcon,
          { backgroundColor: `${item.color}20` },
        ]}
      >
        <MaterialCommunityIcons
          name={item.icon as any}
          size={24}
          color={item.color}
        />
      </View>
      <Text style={[styles.stepTypeTitle, { color: theme.colors.text }]}>
        {item.title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            accessibilityLabel="Go back"
            accessibilityHint="Return to previous screen"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Build Automation
          </Text>
          <TouchableOpacity
            style={[
              styles.saveButton,
              { opacity: automationName && steps.length > 0 ? 1 : 0.5 },
            ]}
            disabled={!automationName || steps.length === 0 || isLoading}
            onPress={handleSave}
          >
            <Text style={[styles.saveButtonText, { color: theme.colors.primary }]}>
              Save
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Automation Name Input */}
          <View style={styles.nameSection}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
              Automation Name
            </Text>
            <TextInput
              style={[
                styles.nameInput,
                {
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder="Enter automation name"
              placeholderTextColor={theme.colors.textSecondary}
              value={automationName}
              onChangeText={setAutomationName}
            />
          </View>

          {/* Steps Section */}
          <View style={styles.stepsSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Steps
            </Text>
            {steps.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: theme.colors.surface }]}>
                <MaterialCommunityIcons
                  name="robot-outline"
                  size={48}
                  color={theme.colors.textSecondary}
                />
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  No steps added yet
                </Text>
                <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
                  Add your first step to get started
                </Text>
              </View>
            ) : (
              <DraggableFlatList
                data={steps}
                renderItem={renderStep}
                keyExtractor={(item) => item.id}
                onDragEnd={({ data }) => setSteps(data)}
                scrollEnabled={false}
              />
            )}
          </View>

          {/* Add Step Button */}
          <TouchableOpacity
            style={[styles.addStepButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => setIsAddStepModalVisible(true)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="plus" size={24} color="#FFFFFF" />
            <Text style={styles.addStepText}>Add Step</Text>
          </TouchableOpacity>

          {/* Advanced Builder Link */}
          <TouchableOpacity
            style={styles.advancedBuilderLink}
            onPress={() => navigation.navigate('AutomationBuilder' as never)}
          >
            <MaterialCommunityIcons 
              name="code-tags" 
              size={20} 
              color={theme.colors.primary} 
            />
            <Text style={[styles.advancedBuilderText, { color: theme.colors.primary }]}>
              Need more features? Use Advanced Builder
            </Text>
          </TouchableOpacity>

          {/* Test Run Button */}
          {steps.length > 0 && (
            <TouchableOpacity
              style={[styles.testButton, { borderColor: theme.colors.primary }]}
              activeOpacity={0.7}
              onPress={handleTestRun}
            >
              <MaterialCommunityIcons
                name="play-circle-outline"
                size={20}
                color={theme.colors.primary}
              />
              <Text style={[styles.testButtonText, { color: theme.colors.primary }]}>
                Test Run
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Add Step Modal */}
      <Modal
        visible={isAddStepModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsAddStepModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Choose Step Type
              </Text>
              <TouchableOpacity onPress={() => setIsAddStepModalVisible(false)}>
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={theme.colors.text}
                />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {getStepCategories().map((category) => (
                <View key={category.name} style={styles.categorySection}>
                  <Text style={[styles.categoryTitle, { color: theme.colors.textSecondary }]}>
                    {category.name}
                  </Text>
                  <View style={styles.categoryGrid}>
                    {category.steps.map((stepType) => (
                      <TouchableOpacity
                        key={stepType.type}
                        style={[styles.stepTypeCard, { backgroundColor: theme.colors.surface }]}
                        onPress={() => addStep(stepType)}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.stepTypeIcon,
                            { backgroundColor: `${stepType.color}20` },
                          ]}
                        >
                          <MaterialCommunityIcons
                            name={stepType.icon as any}
                            size={24}
                            color={stepType.color}
                          />
                        </View>
                        <Text style={[styles.stepTypeTitle, { color: theme.colors.text }]}>
                          {stepType.title}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Step Configuration Modal */}
      <Modal
        visible={editingStep !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditingStep(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Configure {editingStep?.title}
              </Text>
              <TouchableOpacity onPress={() => setEditingStep(null)}>
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={theme.colors.text}
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.configContent}>
              {editingStep?.type === 'sms' && (
                <>
                  <Text style={[styles.configLabel, { color: theme.colors.text }]}>
                    Phone Number
                  </Text>
                  <TextInput
                    style={[styles.configInput, { 
                      backgroundColor: theme.colors.background,
                      color: theme.colors.text,
                    }]}
                    placeholder="+1234567890"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={editingStep.config?.phoneNumber || ''}
                    onChangeText={(text) => {
                      const updatedSteps = steps.map(step =>
                        step.id === editingStep.id
                          ? { ...step, config: { ...step.config, phoneNumber: text } }
                          : step
                      );
                      setSteps(updatedSteps);
                      setEditingStep({ ...editingStep, config: { ...editingStep.config, phoneNumber: text } });
                    }}
                  />
                  <Text style={[styles.configLabel, { color: theme.colors.text }]}>
                    Message
                  </Text>
                  <TextInput
                    style={[styles.configInput, styles.configTextArea, { 
                      backgroundColor: theme.colors.background,
                      color: theme.colors.text,
                    }]}
                    placeholder="Enter message"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={editingStep.config?.message || ''}
                    multiline
                    numberOfLines={4}
                    onChangeText={(text) => {
                      const updatedSteps = steps.map(step =>
                        step.id === editingStep.id
                          ? { ...step, config: { ...step.config, message: text } }
                          : step
                      );
                      setSteps(updatedSteps);
                      setEditingStep({ ...editingStep, config: { ...editingStep.config, message: text } });
                    }}
                  />
                </>
              )}

              {editingStep?.type === 'email' && (
                <>
                  <Text style={[styles.configLabel, { color: theme.colors.text }]}>
                    To Email
                  </Text>
                  <TextInput
                    style={[styles.configInput, { 
                      backgroundColor: theme.colors.background,
                      color: theme.colors.text,
                    }]}
                    placeholder="email@example.com"
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="email-address"
                    value={editingStep.config?.to || ''}
                    onChangeText={(text) => {
                      const updatedSteps = steps.map(step =>
                        step.id === editingStep.id
                          ? { ...step, config: { ...step.config, to: text } }
                          : step
                      );
                      setSteps(updatedSteps);
                      setEditingStep({ ...editingStep, config: { ...editingStep.config, to: text } });
                    }}
                  />
                  <Text style={[styles.configLabel, { color: theme.colors.text }]}>
                    Subject
                  </Text>
                  <TextInput
                    style={[styles.configInput, { 
                      backgroundColor: theme.colors.background,
                      color: theme.colors.text,
                    }]}
                    placeholder="Email subject"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={editingStep.config?.subject || ''}
                    onChangeText={(text) => {
                      const updatedSteps = steps.map(step =>
                        step.id === editingStep.id
                          ? { ...step, config: { ...step.config, subject: text } }
                          : step
                      );
                      setSteps(updatedSteps);
                      setEditingStep({ ...editingStep, config: { ...editingStep.config, subject: text } });
                    }}
                  />
                </>
              )}

              {editingStep?.type === 'webhook' && (
                <>
                  <Text style={[styles.configLabel, { color: theme.colors.text }]}>
                    URL
                  </Text>
                  <TextInput
                    style={[styles.configInput, { 
                      backgroundColor: theme.colors.background,
                      color: theme.colors.text,
                    }]}
                    placeholder="https://example.com/webhook"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={editingStep.config?.url || ''}
                    onChangeText={(text) => {
                      const updatedSteps = steps.map(step =>
                        step.id === editingStep.id
                          ? { ...step, config: { ...step.config, url: text } }
                          : step
                      );
                      setSteps(updatedSteps);
                      setEditingStep({ ...editingStep, config: { ...editingStep.config, url: text } });
                    }}
                  />
                </>
              )}

              {editingStep?.type === 'delay' && (
                <>
                  <Text style={[styles.configLabel, { color: theme.colors.text }]}>
                    Delay Duration (seconds)
                  </Text>
                  <TextInput
                    style={[styles.configInput, { 
                      backgroundColor: theme.colors.background,
                      color: theme.colors.text,
                    }]}
                    placeholder="60"
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="numeric"
                    value={editingStep.config?.delay?.toString() || editingStep.config?.duration?.toString() || ''}
                    onChangeText={(text) => {
                      const delay = parseInt(text) * 1000 || 0; // Convert to milliseconds
                      const updatedSteps = steps.map(step =>
                        step.id === editingStep.id
                          ? { ...step, config: { ...step.config, delay } }
                          : step
                      );
                      setSteps(updatedSteps);
                      setEditingStep({ ...editingStep, config: { ...editingStep.config, delay } });
                    }}
                  />
                </>
              )}

              {editingStep?.type === 'notification' && (
                <>
                  <Text style={[styles.configLabel, { color: theme.colors.text }]}>
                    Notification Message
                  </Text>
                  <TextInput
                    style={[styles.configInput, styles.configTextArea, { 
                      backgroundColor: theme.colors.background,
                      color: theme.colors.text,
                    }]}
                    placeholder="Enter notification message"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={editingStep.config?.message || ''}
                    multiline
                    numberOfLines={3}
                    onChangeText={(text) => {
                      const updatedSteps = steps.map(step =>
                        step.id === editingStep.id
                          ? { ...step, config: { ...step.config, message: text } }
                          : step
                      );
                      setSteps(updatedSteps);
                      setEditingStep({ ...editingStep, config: { ...editingStep.config, message: text } });
                    }}
                  />
                </>
              )}

              {editingStep?.type === 'variable' && (
                <>
                  <Text style={[styles.configLabel, { color: theme.colors.text }]}>
                    Variable Name
                  </Text>
                  <TextInput
                    style={[styles.configInput, { 
                      backgroundColor: theme.colors.background,
                      color: theme.colors.text,
                    }]}
                    placeholder="myVariable"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={editingStep.config?.name || ''}
                    onChangeText={(text) => {
                      const updatedSteps = steps.map(step =>
                        step.id === editingStep.id
                          ? { ...step, config: { ...step.config, name: text } }
                          : step
                      );
                      setSteps(updatedSteps);
                      setEditingStep({ ...editingStep, config: { ...editingStep.config, name: text } });
                    }}
                  />
                  <Text style={[styles.configLabel, { color: theme.colors.text }]}>
                    Variable Value
                  </Text>
                  <TextInput
                    style={[styles.configInput, { 
                      backgroundColor: theme.colors.background,
                      color: theme.colors.text,
                    }]}
                    placeholder="Value or {{otherVariable}}"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={editingStep.config?.value || ''}
                    onChangeText={(text) => {
                      const updatedSteps = steps.map(step =>
                        step.id === editingStep.id
                          ? { ...step, config: { ...step.config, value: text } }
                          : step
                      );
                      setSteps(updatedSteps);
                      setEditingStep({ ...editingStep, config: { ...editingStep.config, value: text } });
                    }}
                  />
                </>
              )}

              {editingStep?.type === 'clipboard' && (
                <>
                  <Text style={[styles.configLabel, { color: theme.colors.text }]}>
                    Text to Copy
                  </Text>
                  <TextInput
                    style={[styles.configInput, styles.configTextArea, { 
                      backgroundColor: theme.colors.background,
                      color: theme.colors.text,
                    }]}
                    placeholder="Enter text to copy to clipboard"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={editingStep.config?.text || ''}
                    multiline
                    numberOfLines={3}
                    onChangeText={(text) => {
                      const updatedSteps = steps.map(step =>
                        step.id === editingStep.id
                          ? { ...step, config: { ...step.config, text, action: 'copy' } }
                          : step
                      );
                      setSteps(updatedSteps);
                      setEditingStep({ ...editingStep, config: { ...editingStep.config, text, action: 'copy' } });
                    }}
                  />
                </>
              )}

              <TouchableOpacity
                style={[styles.doneButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => setEditingStep(null)}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    keyboardAvoid: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: theme.typography.h3.fontSize,
      fontWeight: theme.typography.h3.fontWeight,
    },
    saveButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    saveButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    scrollContent: {
      padding: theme.spacing.lg,
    },
    nameSection: {
      marginBottom: theme.spacing.xl,
    },
    label: {
      fontSize: 14,
      marginBottom: theme.spacing.sm,
    },
    nameInput: {
      height: 56,
      borderRadius: theme.borderRadius.lg,
      paddingHorizontal: theme.spacing.md,
      fontSize: 16,
      borderWidth: 1,
    },
    stepsSection: {
      marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
      fontSize: theme.typography.h3.fontSize,
      fontWeight: theme.typography.h3.fontWeight,
      marginBottom: theme.spacing.md,
    },
    emptyState: {
      padding: theme.spacing.xl,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 16,
      fontWeight: '600',
      marginTop: theme.spacing.md,
    },
    emptySubtext: {
      fontSize: 14,
      marginTop: theme.spacing.xs,
    },
    stepCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      marginBottom: theme.spacing.sm,
      shadowColor: theme.colors.cardShadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 1,
    },
    draggingCard: {
      opacity: 0.9,
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 5,
    },
    stepHandle: {
      marginRight: theme.spacing.sm,
    },
    stepIcon: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.md,
    },
    stepContent: {
      flex: 1,
    },
    stepTitle: {
      fontSize: 16,
      fontWeight: '600',
    },
    stepSubtitle: {
      fontSize: 13,
      marginTop: 2,
    },
    deleteButton: {
      padding: theme.spacing.sm,
    },
    stepActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    actionButton: {
      padding: theme.spacing.xs,
    },
    addStepButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      marginBottom: theme.spacing.md,
    },
    addStepText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
      marginLeft: theme.spacing.sm,
    },
    advancedBuilderLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    advancedBuilderText: {
      fontSize: 14,
      fontWeight: '500',
      marginLeft: theme.spacing.sm,
    },
    testButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1.5,
    },
    testButtonText: {
      fontSize: 16,
      fontWeight: '600',
      marginLeft: theme.spacing.sm,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      borderTopLeftRadius: theme.borderRadius.xl,
      borderTopRightRadius: theme.borderRadius.xl,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
      maxHeight: '70%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
    },
    modalTitle: {
      fontSize: theme.typography.h3.fontSize,
      fontWeight: theme.typography.h3.fontWeight,
    },
    stepTypeList: {
      paddingHorizontal: theme.spacing.lg,
    },
    stepTypeRow: {
      justifyContent: 'space-between',
    },
    stepTypeCard: {
      flex: 0.48,
      padding: theme.spacing.lg,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
      shadowColor: theme.colors.cardShadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 1,
    },
    stepTypeIcon: {
      width: 56,
      height: 56,
      borderRadius: theme.borderRadius.lg,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    stepTypeTitle: {
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
    },
    configContent: {
      padding: theme.spacing.lg,
    },
    configLabel: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
    configInput: {
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      fontSize: 16,
    },
    configTextArea: {
      minHeight: 100,
      textAlignVertical: 'top',
    },
    methodContainer: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
    methodButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
    },
    methodText: {
      fontSize: 14,
      fontWeight: '600',
    },
    doneButton: {
      marginTop: theme.spacing.xl,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
    },
    doneButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    categorySection: {
      marginBottom: theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
    },
    categoryTitle: {
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: theme.spacing.sm,
    },
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
  });

export default BuildScreen;