import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  FlatList,
  Alert,
  Pressable,
} from 'react-native';
import {
  Appbar,
  Card,
  Text,
  Chip,
  Button,
  IconButton,
  Searchbar,
  Surface,
  Portal,
  Modal,
  TextInput,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AutomationTemplateService, AutomationTemplate } from '../../services/templates/AutomationTemplates';
import { useCreateAutomationMutation } from '../../store/api/automationApi';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { supabase } from '../../services/supabase/client';
import { FullScreenModal } from '../../components/common/FullScreenModal';

interface TemplatesScreenProps {
  navigation: any;
}

type FilterType = 'all' | 'popular' | 'category';

const TemplatesScreen: React.FC<TemplatesScreenProps> = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AutomationTemplate | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [phoneNumbers, setPhoneNumbers] = useState<Record<string, string>>({});
  const [isCreating, setIsCreating] = useState(false);
  
  const insets = useSafeAreaInsets();
  const { user } = useSelector((state: RootState) => state.auth);
  const [createAutomation] = useCreateAutomationMutation();

  const categories = AutomationTemplateService.getCategories();

  const getFilteredTemplates = (): AutomationTemplate[] => {
    let templates: AutomationTemplate[] = [];

    switch (filter) {
      case 'popular':
        templates = AutomationTemplateService.getPopularTemplates();
        break;
      case 'category':
        templates = selectedCategory 
          ? AutomationTemplateService.getTemplatesByCategory(selectedCategory)
          : AutomationTemplateService.getAllTemplates();
        break;
      default:
        templates = AutomationTemplateService.getAllTemplates();
    }

    if (searchQuery) {
      templates = AutomationTemplateService.searchTemplates(searchQuery);
    }

    return templates;
  };

  const handleUseTemplate = (template: AutomationTemplate) => {
    setSelectedTemplate(template);
    setCustomTitle(template.title);
    
    // Extract phone number requirements from template steps
    const phoneRequirements: Record<string, string> = {};
    template.steps.forEach(step => {
      if (step.config.phoneNumber === '') {
        const stepKey = step.id.replace(`${template.id}-`, '');
        phoneRequirements[stepKey] = '';
      }
    });
    setPhoneNumbers(phoneRequirements);
    
    setShowCustomizeModal(true);
  };

  const handleCreateFromTemplate = async () => {
    if (!selectedTemplate || !user) {
      Alert.alert('Error', 'Please sign in to create automations');
      return;
    }

    setIsCreating(true);
    try {
      const automation = AutomationTemplateService.createAutomationFromTemplate(
        selectedTemplate,
        user.id,
        {
          title: customTitle,
          phoneNumbers: phoneNumbers
        }
      );

      const { error } = await supabase
        .from('automations')
        .insert({
          title: automation.title,
          description: automation.description,
          steps: automation.steps,
          category: automation.category,
          tags: automation.tags,
          created_by: automation.created_by,
          is_public: false
        });

      if (error) {
        throw error;
      }

      setShowCustomizeModal(false);
      Alert.alert(
        'Template Created! 🎉',
        `"${automation.title}" has been added to your automations.`,
        [
          { text: 'View Automations', onPress: () => navigation.navigate('MyAutomations') },
          { text: 'OK' }
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', `Failed to create automation: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return '#4CAF50';
      case 'intermediate': return '#FF9800';
      case 'advanced': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const renderTemplateCard = (template: AutomationTemplate) => (
    <Card key={template.id} style={styles.templateCard}>
      <Pressable onPress={() => handleUseTemplate(template)}>
        <Card.Content style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIcon}>
            <Icon name={template.icon} size={32} color={template.color} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.templateTitle}>{template.title}</Text>
            <Text style={styles.templateDescription} numberOfLines={2}>
              {template.description}
            </Text>
          </View>
          {template.isPopular && (
            <Chip
              icon="star"
              compact
              style={[styles.popularChip, { backgroundColor: '#FFD700' }]}
            >
              Popular
            </Chip>
          )}
        </View>
        
        <View style={styles.cardMeta}>
          <Chip 
            icon="layers" 
            compact
            style={styles.metaChip}
          >
            {template.steps.length} steps
          </Chip>
          <Chip 
            icon="clock" 
            compact
            style={styles.metaChip}
          >
            {template.estimatedTime}
          </Chip>
          <Chip 
            compact
            style={[styles.metaChip, { backgroundColor: getDifficultyColor(template.difficulty) }]}
            textStyle={{ color: 'white' }}
          >
            {template.difficulty}
          </Chip>
        </View>
        
        <View style={styles.cardTags}>
          {template.tags.slice(0, 3).map(tag => (
            <Chip key={tag} compact style={styles.tagChip}>
              {tag}
            </Chip>
          ))}
          {template.tags.length > 3 && (
            <Text style={styles.moreTagsText}>+{template.tags.length - 3} more</Text>
          )}
        </View>
        
        <View style={styles.cardActions}>
          <Button
            mode="outlined"
            onPress={() => handleUseTemplate(template)}
            icon="download"
            style={styles.useButton}
          >
            Use Template
          </Button>
          <IconButton
            icon="eye"
            size={20}
            onPress={() => navigation.navigate('AutomationBuilder', { 
              automation: AutomationTemplateService.createAutomationFromTemplate(template, 'preview'),
              readonly: true,
              isTemplate: true
            })}
          />
        </View>
        </Card.Content>
      </Pressable>
    </Card>
  );

  const renderCategoryCard = ({ item }: { item: any }) => (
    <Pressable 
      onPress={() => {
        setSelectedCategory(item.id);
        setFilter('category');
      }}
      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
    >
      <Surface 
        style={[styles.categoryCard, { borderLeftColor: item.color }]} 
        elevation={2}
      >
        <View style={styles.categoryContent}>
          <Icon name={item.icon} size={24} color={item.color} />
          <Text style={styles.categoryName}>{item.name}</Text>
          <IconButton
            icon="chevron-right"
            size={16}
            onPress={() => {
              setSelectedCategory(item.id);
              setFilter('category');
            }}
          />
        </View>
      </Surface>
    </Pressable>
  );

  const renderPhoneNumberInput = (stepId: string, stepTitle: string) => (
    <View key={stepId} style={styles.phoneInputContainer}>
      <TextInput
        label={`Phone Number for ${stepTitle}`}
        value={phoneNumbers[stepId] || ''}
        onChangeText={(text) => setPhoneNumbers(prev => ({ ...prev, [stepId]: text }))}
        placeholder="+1234567890"
        keyboardType="phone-pad"
        style={styles.phoneInput}
      />
    </View>
  );

  const filteredTemplates = getFilteredTemplates();

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Automation Templates" />
        <Appbar.Action
          icon="refresh"
          onPress={() => {
            setSearchQuery('');
            setFilter('all');
            setSelectedCategory('');
          }}
        />
      </Appbar.Header>

      <View style={styles.content}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Search templates..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
          />
        </View>

        {/* Filter Controls */}
        <View style={styles.filtersContainer}>
          <View style={styles.customSegmentedButtons}>
            <Pressable 
              style={[
                styles.segmentButton, 
                styles.leftSegment,
                filter === 'all' && styles.activeSegment
              ]}
              onPress={() => setFilter('all')}
            >
              <Text style={[
                styles.segmentText,
                filter === 'all' && styles.activeSegmentText
              ]}>All</Text>
            </Pressable>
            <Pressable 
              style={[
                styles.segmentButton, 
                styles.middleSegment,
                filter === 'popular' && styles.activeSegment
              ]}
              onPress={() => setFilter('popular')}
            >
              <Text style={[
                styles.segmentText,
                filter === 'popular' && styles.activeSegmentText
              ]}>Popular</Text>
            </Pressable>
            <Pressable 
              style={[
                styles.segmentButton, 
                styles.rightSegment,
                filter === 'category' && styles.activeSegment
              ]}
              onPress={() => setFilter('category')}
            >
              <Text style={[
                styles.segmentText,
                filter === 'category' && styles.activeSegmentText
              ]}>Category</Text>
            </Pressable>
          </View>
        </View>

        {/* Category Selection */}
        {filter === 'category' && (
          <View style={styles.categoriesSection}>
            <Text style={styles.sectionTitle}>Choose Category</Text>
            <FlatList
              data={categories}
              renderItem={renderCategoryCard}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              style={styles.categoriesList}
            />
          </View>
        )}

        {/* Results Count and Templates List - Only show when not selecting category */}
        {!(filter === 'category' && !selectedCategory) && (
          <>
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsText}>
                {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} found
                {filter === 'category' && selectedCategory && (
                  <Text style={styles.categoryFilter}> in {categories.find(c => c.id === selectedCategory)?.name}</Text>
                )}
              </Text>
            </View>

            {/* Templates List */}
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              {filteredTemplates.length > 0 ? (
                filteredTemplates.map(renderTemplateCard)
              ) : (
                <View style={styles.emptyState}>
                  <Icon name="robot-confused" size={64} color="#ccc" />
                  <Text style={styles.emptyTitle}>No Templates Found</Text>
                  <Text style={styles.emptyDescription}>
                    {searchQuery 
                      ? 'Try adjusting your search terms'
                      : 'No templates available for this category'
                    }
                  </Text>
                </View>
              )}
              
              <View style={styles.bottomSpacer} />
            </ScrollView>
          </>
        )}
      </View>

      {/* Customization Modal */}
      <Portal>
        <Modal
          visible={showCustomizeModal}
          onDismiss={() => setShowCustomizeModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <ScrollView style={styles.modalScrollView}>
            <Text style={styles.modalTitle}>Customize Template</Text>
            
            {selectedTemplate && (
              <>
                <TextInput
                  label="Automation Title"
                  value={customTitle}
                  onChangeText={setCustomTitle}
                  style={styles.titleInput}
                />
                
                {Object.keys(phoneNumbers).length > 0 && (
                  <View style={styles.phoneNumbersSection}>
                    <Text style={styles.sectionLabel}>Phone Numbers Required:</Text>
                    {Object.keys(phoneNumbers).map(stepId => {
                      const step = selectedTemplate.steps.find(s => s.id.endsWith(stepId));
                      return renderPhoneNumberInput(stepId, step?.title || stepId);
                    })}
                  </View>
                )}
                
                <View style={styles.modalActions}>
                  <Button 
                    onPress={() => setShowCustomizeModal(false)}
                    style={styles.cancelButton}
                  >
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleCreateFromTemplate}
                    loading={isCreating}
                    disabled={isCreating}
                    style={styles.createButton}
                  >
                    Create Automation
                  </Button>
                </View>
              </>
            )}
          </ScrollView>
        </Modal>
      </Portal>
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
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchbar: {
    elevation: 0,
  },
  filtersContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  customSegmentedButtons: {
    flexDirection: 'row',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  leftSegment: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  middleSegment: {
    // No additional styles needed
  },
  rightSegment: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    borderRightWidth: 0,
  },
  activeSegment: {
    backgroundColor: '#6200ee',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeSegmentText: {
    color: '#fff',
  },
  categoriesSection: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  categoriesList: {
    paddingHorizontal: 16,
  },
  categoryCard: {
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    backgroundColor: '#fff',
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  categoryName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 12,
    color: '#333',
  },
  resultsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f9f9f9',
  },
  resultsText: {
    fontSize: 14,
    color: '#666',
  },
  categoryFilter: {
    fontWeight: '500',
    color: '#6200ee',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  templateCard: {
    marginBottom: 16,
  },
  cardContent: {
    paddingVertical: 24,
    minHeight: 180,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardIcon: {
    marginRight: 12,
    marginTop: 4,
  },
  cardInfo: {
    flex: 1,
  },
  templateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  popularChip: {
    marginLeft: 8,
  },
  cardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  metaChip: {
    backgroundColor: '#f0f0f0',
  },
  cardTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  tagChip: {
    backgroundColor: '#e8f5e8',
  },
  moreTagsText: {
    fontSize: 12,
    color: '#999',
    alignSelf: 'center',
    marginLeft: 4,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  useButton: {
    flex: 1,
    marginRight: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  bottomSpacer: {
    height: 80,
  },
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 16,
    maxHeight: '100%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  modalScrollView: {
    maxHeight: '100%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  titleInput: {
    marginBottom: 16,
    marginHorizontal: 20,
    backgroundColor: 'transparent',
  },
  phoneNumbersSection: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
    color: '#333',
  },
  phoneInputContainer: {
    marginBottom: 12,
  },
  phoneInput: {
    backgroundColor: 'transparent',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
  },
  createButton: {
    flex: 1,
  },
});

export default TemplatesScreen;