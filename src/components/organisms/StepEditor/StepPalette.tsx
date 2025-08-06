import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Modal } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeTheme } from '../../common/ThemeFallbackWrapper';
import { theme } from '../../../theme';
import { StepType } from '../../../types';
import { Card } from '../../atoms/Card';
import { useHaptic } from '../../../hooks/useHaptic';

interface StepPaletteProps {
  visible: boolean;
  onClose: () => void;
  onSelectStep: (stepType: StepType) => void;
  recentSteps?: StepType[];
}

const { height: screenHeight } = Dimensions.get('window');

interface StepOption {
  type: StepType;
  label: string;
  icon: string;
  description: string;
  category: string;
}

const stepOptions: StepOption[] = [
  // Communication
  { type: 'notification', label: 'Show Notification', icon: 'bell', description: 'Display a system notification', category: 'Communication' },
  { type: 'sms', label: 'Send SMS', icon: 'message-text', description: 'Send a text message', category: 'Communication' },
  { type: 'email', label: 'Send Email', icon: 'email', description: 'Send an email', category: 'Communication' },
  { type: 'speak_text', label: 'Speak Text', icon: 'text-to-speech', description: 'Convert text to speech', category: 'Communication' },
  
  // Web & Network
  { type: 'webhook', label: 'Call Webhook', icon: 'webhook', description: 'Make HTTP request', category: 'Web & Network' },
  { type: 'http_request', label: 'HTTP Request', icon: 'cloud-upload', description: 'Advanced HTTP request', category: 'Web & Network' },
  { type: 'wifi', label: 'Toggle WiFi', icon: 'wifi', description: 'Turn WiFi on/off', category: 'Web & Network' },
  { type: 'bluetooth', label: 'Toggle Bluetooth', icon: 'bluetooth', description: 'Turn Bluetooth on/off', category: 'Web & Network' },
  
  // Control Flow
  { type: 'delay', label: 'Add Delay', icon: 'clock', description: 'Wait for specified time', category: 'Control Flow' },
  { type: 'condition', label: 'If Condition', icon: 'help-rhombus', description: 'Conditional execution', category: 'Control Flow' },
  { type: 'variable', label: 'Set Variable', icon: 'variable', description: 'Store a value', category: 'Control Flow' },
  { type: 'script', label: 'Run Script', icon: 'code-braces', description: 'Execute JavaScript', category: 'Control Flow' },
  
  // Device
  { type: 'location', label: 'Get Location', icon: 'map-marker', description: 'Get current location', category: 'Device' },
  { type: 'clipboard', label: 'Copy to Clipboard', icon: 'clipboard-text', description: 'Copy text to clipboard', category: 'Device' },
  { type: 'sound', label: 'Play Sound', icon: 'volume-high', description: 'Play a sound effect', category: 'Device' },
  { type: 'vibration', label: 'Vibrate', icon: 'vibrate', description: 'Vibrate the device', category: 'Device' },
  { type: 'flashlight', label: 'Toggle Flashlight', icon: 'flashlight', description: 'Turn flashlight on/off', category: 'Device' },
  { type: 'brightness', label: 'Set Brightness', icon: 'brightness-6', description: 'Adjust screen brightness', category: 'Device' },
  
  // Apps & System
  { type: 'open_app', label: 'Open App', icon: 'application', description: 'Launch an application', category: 'Apps & System' },
  { type: 'close_app', label: 'Close App', icon: 'close-box', description: 'Close an application', category: 'Apps & System' },
  { type: 'share', label: 'Share Content', icon: 'share-variant', description: 'Share via system dialog', category: 'Apps & System' },
  { type: 'shortcut', label: 'Run Shortcut', icon: 'apple', description: 'Execute iOS Shortcut', category: 'Apps & System' },
  
  // Productivity
  { type: 'calendar', label: 'Add Calendar Event', icon: 'calendar', description: 'Create calendar entry', category: 'Productivity' },
  { type: 'reminder', label: 'Set Reminder', icon: 'reminder', description: 'Create a reminder', category: 'Productivity' },
  { type: 'contact', label: 'Call Contact', icon: 'contacts', description: 'Call a contact', category: 'Productivity' },
  { type: 'translate', label: 'Translate Text', icon: 'translate', description: 'Translate between languages', category: 'Productivity' },
  
  // Data
  { type: 'weather', label: 'Get Weather', icon: 'weather-partly-cloudy', description: 'Fetch weather data', category: 'Data' },
];

const categories = [...new Set(stepOptions.map(opt => opt.category))];

export const StepPalette: React.FC<StepPaletteProps> = ({
  visible,
  onClose,
  onSelectStep,
  recentSteps = [],
}) => {
  const theme = useSafeTheme();
  const colors = theme.colors;
  const { trigger } = useHaptic();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const filteredSteps = useMemo(() => {
    let filtered = stepOptions;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        step =>
          step.label.toLowerCase().includes(query) ||
          step.description.toLowerCase().includes(query) ||
          step.category.toLowerCase().includes(query)
      );
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(step => step.category === selectedCategory);
    }
    
    return filtered;
  }, [searchQuery, selectedCategory]);
  
  const recentStepOptions = recentSteps
    .map(type => stepOptions.find(opt => opt.type === type))
    .filter(Boolean) as StepOption[];
  
  const handleSelectStep = (stepType: StepType) => {
    trigger('light');
    onSelectStep(stepType);
  };
  
  const renderStepOption = (step: StepOption, index: number) => (
    <Animated.View
      key={step.type}
      entering={FadeInDown.delay(index * 30).springify()}
    >
      <TouchableOpacity
        onPress={() => handleSelectStep(step.type)}
        activeOpacity={0.7}
      >
        <Card variant="outlined" style={styles.stepOption}>
          <View style={styles.stepOptionContent}>
            <View
              style={[
                styles.stepIcon,
                { backgroundColor: `${colors?.brand?.primary || colors?.primary || '#6200ee'}15` },
              ]}
            >
              <MaterialCommunityIcons
                name={step.icon as any}
                size={24}
                color={colors?.brand?.primary || colors?.primary || '#6200ee'}
              />
            </View>
            <View style={styles.stepInfo}>
              <Text style={[styles.stepLabel, { color: colors?.text?.primary || colors?.onSurface || '#333333' }]}>
                {step.label}
              </Text>
              <Text style={[styles.stepDescription, { color: colors?.text?.secondary || colors?.onSurfaceVariant || '#666666' }]}>
                {step.description}
              </Text>
            </View>
            <MaterialCommunityIcons
              name="plus"
              size={20}
              color={colors?.text?.tertiary || colors?.onSurfaceVariant || '#999999'}
            />
          </View>
        </Card>
      </TouchableOpacity>
    </Animated.View>
  );
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.modalBackdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity 
          activeOpacity={1}
          style={[styles.container, { backgroundColor: colors?.background?.primary || colors?.background || '#ffffff' }]}
        >
          <View style={styles.handle} />
          
          <View style={styles.header}>
          <Text style={[styles.title, { color: colors?.text?.primary || colors?.onSurface || '#333333' }]}>
            Add Step
          </Text>
          <TouchableOpacity onPress={onClose}>
            <MaterialCommunityIcons
              name="close"
              size={24}
              color={colors?.text?.secondary || colors?.onSurfaceVariant || '#666666'}
            />
          </TouchableOpacity>
        </View>
        
        <View style={[styles.searchContainer, { backgroundColor: colors?.surface?.secondary || colors?.surface || '#f5f5f5' }]}>
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color={colors?.text?.secondary || colors?.onSurfaceVariant || '#666666'}
          />
          <TextInput
            style={[styles.searchInput, { color: colors?.text?.primary || colors?.onSurface || '#333333' }]}
            placeholder="Search steps..."
            placeholderTextColor={colors?.text?.tertiary || colors?.onSurfaceVariant || '#999999'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialCommunityIcons
                name="close-circle"
                size={20}
                color={colors?.text?.secondary || colors?.onSurfaceVariant || '#666666'}
              />
            </TouchableOpacity>
          )}
        </View>
        
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContainer}
        >
          <TouchableOpacity
            onPress={() => setSelectedCategory(null)}
            style={[
              styles.categoryChip,
              !selectedCategory && { backgroundColor: colors?.brand?.primary || colors?.primary || '#6200ee' },
            ]}
          >
            <Text
              style={[
                styles.categoryText,
                { color: !selectedCategory ? '#FFFFFF' : colors?.text?.secondary || colors?.onSurfaceVariant || '#666666' },
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {categories.map(category => (
            <TouchableOpacity
              key={category}
              onPress={() => setSelectedCategory(category)}
              style={[
                styles.categoryChip,
                selectedCategory === category && { backgroundColor: colors?.brand?.primary || colors?.primary || '#6200ee' },
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  { color: selectedCategory === category ? '#FFFFFF' : colors?.text?.secondary || colors?.onSurfaceVariant || '#666666' },
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.stepsList}
          contentContainerStyle={styles.stepsContent}
        >
          {recentStepOptions.length > 0 && !searchQuery && !selectedCategory && (
            <>
              <Text style={[styles.sectionTitle, { color: colors?.text?.secondary || colors?.onSurfaceVariant || '#666666' }]}>
                Recently Used
              </Text>
              {recentStepOptions.map((step, index) => renderStepOption(step, index))}
              <Text style={[styles.sectionTitle, { color: colors?.text?.secondary || colors?.onSurfaceVariant || '#666666' }]}>
                All Steps
              </Text>
            </>
          )}
          
          {filteredSteps.map((step, index) => renderStepOption(step, index))}
          
          {filteredSteps.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="magnify-close"
                size={48}
                color={colors?.text?.disabled || colors?.onSurfaceDisabled || '#CCCCCC'}
              />
              <Text style={[styles.emptyText, { color: colors?.text?.secondary || colors?.onSurfaceVariant || '#666666' }]}>
                No steps found
              </Text>
            </View>
          )}
        </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',  // Slightly darker for better contrast
    justifyContent: 'flex-end',
  },
  container: {
    maxHeight: screenHeight * 0.85,
    borderTopLeftRadius: theme.tokens.borderRadius.xl,
    borderTopRightRadius: theme.tokens.borderRadius.xl,
    paddingBottom: theme.spacing.xl,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: theme.tokens.colors.gray[300],
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  title: {
    ...theme.typography.headlineMedium,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.tokens.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: theme.spacing.sm,
    ...theme.typography.bodyMedium,
  },
  categoryScroll: {
    maxHeight: 40,
    marginBottom: theme.spacing.md,
  },
  categoryContainer: {
    paddingHorizontal: theme.spacing.lg,
  },
  categoryChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.tokens.borderRadius.full,
    backgroundColor: theme.tokens.colors.gray[200],
    marginRight: theme.spacing.sm,
  },
  categoryText: {
    ...theme.typography.labelMedium,
    fontWeight: '600',
  },
  stepsList: {
    flex: 1,
  },
  stepsContent: {
    paddingHorizontal: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.labelLarge,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  stepOption: {
    marginBottom: theme.spacing.sm,
  },
  stepOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.tokens.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  stepInfo: {
    flex: 1,
  },
  stepLabel: {
    ...theme.typography.bodyMedium,
    fontWeight: '600',
    marginBottom: 2,
  },
  stepDescription: {
    ...theme.typography.caption,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyText: {
    ...theme.typography.bodyLarge,
    marginTop: theme.spacing.md,
  },
});