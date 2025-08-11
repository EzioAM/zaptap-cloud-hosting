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
import { stepTypeCategories, stepTypeMetadata } from '../../../services/automation/executors';

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
  color?: string;
}

// Convert the metadata to step options
const stepOptions: StepOption[] = Object.entries(stepTypeMetadata).map(([type, metadata]) => {
  // Find which category this step belongs to
  let category = 'Other';
  for (const [catKey, catData] of Object.entries(stepTypeCategories)) {
    if (catData.steps.includes(type)) {
      category = catData.title;
      break;
    }
  }
  
  return {
    type: type as StepType,
    label: metadata.title,
    icon: metadata.icon,
    description: metadata.description,
    category,
    color: metadata.color
  };
});

// Add any legacy step types that might not be in the new system yet
const additionalSteps: StepOption[] = [
  { type: 'speak_text', label: 'Speak Text', icon: 'text-to-speech', description: 'Convert text to speech', category: 'Communication' },
  { type: 'http_request', label: 'HTTP Request', icon: 'cloud-upload', description: 'Advanced HTTP request', category: 'Communication' },
  { type: 'wifi', label: 'Toggle WiFi', icon: 'wifi', description: 'Turn WiFi on/off', category: 'Device & Location' },
  { type: 'bluetooth', label: 'Toggle Bluetooth', icon: 'bluetooth', description: 'Turn Bluetooth on/off', category: 'Device & Location' },
  { type: 'script', label: 'Run Script', icon: 'code-braces', description: 'Execute JavaScript', category: 'Control Flow' },
  { type: 'sound', label: 'Play Sound', icon: 'volume-high', description: 'Play a sound effect', category: 'Device & Location' },
  { type: 'vibration', label: 'Vibrate', icon: 'vibrate', description: 'Vibrate the device', category: 'Device & Location' },
  { type: 'flashlight', label: 'Toggle Flashlight', icon: 'flashlight', description: 'Turn flashlight on/off', category: 'Device & Location' },
  { type: 'brightness', label: 'Set Brightness', icon: 'brightness-6', description: 'Adjust screen brightness', category: 'Device & Location' },
  { type: 'close_app', label: 'Close App', icon: 'close-box', description: 'Close an application', category: 'App Integration' },
  { type: 'share', label: 'Share Content', icon: 'share-variant', description: 'Share via system dialog', category: 'App Integration' },
  { type: 'shortcut', label: 'Run Shortcut', icon: 'apple', description: 'Execute iOS Shortcut', category: 'App Integration' },
  { type: 'calendar', label: 'Add Calendar Event', icon: 'calendar', description: 'Create calendar entry', category: 'App Integration' },
  { type: 'reminder', label: 'Set Reminder', icon: 'reminder', description: 'Create a reminder', category: 'App Integration' },
  { type: 'contact', label: 'Call Contact', icon: 'contacts', description: 'Call a contact', category: 'App Integration' },
  { type: 'translate', label: 'Translate Text', icon: 'translate', description: 'Translate between languages', category: 'Text & Math' },
  { type: 'weather', label: 'Get Weather', icon: 'weather-partly-cloudy', description: 'Fetch weather data', category: 'Variables & Data' },
].filter(step => !stepOptions.find(s => s.type === step.type)); // Only add if not already present

// Combine all steps
const allStepOptions = [...stepOptions, ...additionalSteps];

const categories = [...new Set(allStepOptions.map(opt => opt.category))].sort();

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
    let filtered = allStepOptions;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        step =>
          step.label.toLowerCase().includes(query) ||
          step.description.toLowerCase().includes(query) ||
          step.type.toLowerCase().includes(query)
      );
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(step => step.category === selectedCategory);
    }
    
    return filtered;
  }, [searchQuery, selectedCategory]);
  
  const recentStepOptions = useMemo(() => {
    return recentSteps
      .map(type => allStepOptions.find(opt => opt.type === type))
      .filter(Boolean) as StepOption[];
  }, [recentSteps]);
  
  const handleSelectStep = (stepType: StepType) => {
    trigger('impact');
    onSelectStep(stepType);
    onClose();
  };
  
  const getCategoryIcon = (category: string): string => {
    const categoryData = Object.values(stepTypeCategories).find(cat => cat.title === category);
    return categoryData?.icon || 'folder';
  };
  
  if (!visible) return null;
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          entering={FadeInDown.springify()}
          style={[styles.container, { backgroundColor: colors.background }]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={[styles.title, { color: colors.text }]}>Add Step</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            {/* Search Bar */}
            <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
              <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search steps..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <MaterialCommunityIcons name="close-circle" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
          
          {/* Categories */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesContainer}
            contentContainerStyle={styles.categoriesContent}
          >
            <TouchableOpacity
              style={[
                styles.categoryChip,
                { backgroundColor: !selectedCategory ? colors.primary : colors.surface }
              ]}
              onPress={() => setSelectedCategory(null)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  { color: !selectedCategory ? colors.onPrimary : colors.text }
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            {categories.map(category => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryChip,
                  { backgroundColor: selectedCategory === category ? colors.primary : colors.surface }
                ]}
                onPress={() => setSelectedCategory(category === selectedCategory ? null : category)}
              >
                <MaterialCommunityIcons
                  name={getCategoryIcon(category) as any}
                  size={16}
                  color={selectedCategory === category ? colors.onPrimary : colors.text}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    { color: selectedCategory === category ? colors.onPrimary : colors.text }
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          {/* Steps List */}
          <ScrollView style={styles.stepsList} showsVerticalScrollIndicator={false}>
            {/* Recent Steps */}
            {recentStepOptions.length > 0 && !searchQuery && !selectedCategory && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  Recently Used
                </Text>
                <View style={styles.stepsGrid}>
                  {recentStepOptions.slice(0, 4).map(step => (
                    <TouchableOpacity
                      key={`recent-${step.type}`}
                      style={[styles.stepCard, { backgroundColor: colors.surface }]}
                      onPress={() => handleSelectStep(step.type)}
                    >
                      <View style={[styles.stepIcon, { backgroundColor: step.color || colors.primary + '20' }]}>
                        <MaterialCommunityIcons
                          name={step.icon as any}
                          size={24}
                          color={step.color || colors.primary}
                        />
                      </View>
                      <Text style={[styles.stepLabel, { color: colors.text }]} numberOfLines={1}>
                        {step.label}
                      </Text>
                      <Text style={[styles.stepDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                        {step.description}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
            
            {/* All Steps */}
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {selectedCategory || 'All Steps'}
            </Text>
            <View style={styles.stepsGrid}>
              {filteredSteps.map(step => (
                <TouchableOpacity
                  key={step.type}
                  style={[styles.stepCard, { backgroundColor: colors.surface }]}
                  onPress={() => handleSelectStep(step.type)}
                >
                  <View style={[styles.stepIcon, { backgroundColor: step.color ? step.color + '20' : colors.primary + '20' }]}>
                    <MaterialCommunityIcons
                      name={step.icon as any}
                      size={24}
                      color={step.color || colors.primary}
                    />
                  </View>
                  <Text style={[styles.stepLabel, { color: colors.text }]} numberOfLines={1}>
                    {step.label}
                  </Text>
                  <Text style={[styles.stepDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                    {step.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {filteredSteps.length === 0 && (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="magnify-close" size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                  No steps found
                </Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    height: screenHeight * 0.85,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  categoriesContainer: {
    maxHeight: 50,
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  categoriesContent: {
    alignItems: 'center',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  stepsList: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    marginHorizontal: -6,
  },
  stepCard: {
    width: '47%',
    padding: 16,
    margin: '1.5%',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  stepIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 16,
  },
});