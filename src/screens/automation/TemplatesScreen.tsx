import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  FlatList,
  Alert,
  Pressable,
  Animated,
  Dimensions,
  Text as RNText,
  TextInput as RNTextInput,
} from 'react-native';
import {
  Appbar,
  Portal,
  Modal,
  Searchbar,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeTheme } from '../../components/common/ThemeFallbackWrapper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
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
  const theme = useSafeTheme();
  const { user } = useSelector((state: RootState) => state.auth);
  const [createAutomation] = useCreateAutomationMutation();

  // Animated values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const filterButtonsAnim = useRef(new Animated.Value(0)).current;
  const templateCardsAnim = useRef(new Animated.Value(0)).current;

  // Screen dimensions
  const { width } = Dimensions.get('window');

  useEffect(() => {
    // Initial animations
    Animated.stagger(150, [
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(filterButtonsAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(templateCardsAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

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

  const handleUseTemplate = async (template: AutomationTemplate) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Show options for how to use the template
    Alert.alert(
      'Use Template',
      `How would you like to use "${template.title}"?`,
      [
        {
          text: 'Quick Load',
          onPress: async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            // Load directly into builder without customization
            const automation = AutomationTemplateService.createAutomationFromTemplate(
              template,
              user?.id || 'guest',
              { title: `${template.title} (from template)` }
            );
            navigation.navigate('AutomationBuilder', {
              automation: automation,
              isTemplate: false,
              showQRGenerator: false
            });
            Alert.alert(
              'Template Loaded! 🎉',
              `"${automation.title}" has been loaded with all ${automation.steps.length} steps.`
            );
          }
        },
        {
          text: 'Customize First',
          onPress: async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            // Open customization modal
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
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const handleCreateFromTemplate = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
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

      setShowCustomizeModal(false);
      
      // Navigate to AutomationBuilder with the template steps
      navigation.navigate('AutomationBuilder', {
        automation: automation,
        isTemplate: false,
        showQRGenerator: false
      });
      
      Alert.alert(
        'Template Loaded! 🎉',
        `"${automation.title}" has been loaded into the builder with all ${automation.steps.length} steps. You can now customize and save it.`,
        [
          { text: 'OK' }
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', `Failed to load template: ${error.message}`);
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

  const renderTemplateCard = (template: AutomationTemplate, index: number) => {
    const cardAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      }).start();
    }, []);

    const handleCardPress = async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.98,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
      
      handleUseTemplate(template);
    };

    const handleQuickUse = async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const automation = AutomationTemplateService.createAutomationFromTemplate(
        template, 
        user?.id || 'guest',
        { title: `${template.title} (from template)` }
      );
      navigation.navigate('AutomationBuilder', {
        automation: automation,
        isTemplate: false,
        showQRGenerator: false
      });
    };

    return (
      <Animated.View
        key={template.id}
        style={[
          styles.templateCard,
          {
            opacity: cardAnim,
            transform: [
              { scale: scaleAnim },
              {
                translateY: cardAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Pressable onPress={handleCardPress}>
          <View style={styles.card}>
            {/* Gradient accent */}
            <LinearGradient
              colors={['#6366F1', '#8B5CF6', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cardGradientAccent}
            />
            
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIcon}>
                  <Icon name={template.icon} size={32} color={template.color} />
                </View>
                <View style={styles.cardInfo}>
                  <RNText style={[styles.templateTitle, { color: theme.colors.text.primary }]}>
                    {template.title}
                  </RNText>
                  <RNText style={[styles.templateDescription, { color: theme.colors.text.secondary }]} numberOfLines={2}>
                    {template.description}
                  </RNText>
                </View>
                {template.isPopular && (
                  <View style={styles.popularBadge}>
                    <LinearGradient
                      colors={['#FFD700', '#FFA500']}
                      style={styles.popularGradient}
                    >
                      <Icon name="star" size={14} color="white" />
                      <RNText style={styles.popularText}>Popular</RNText>
                    </LinearGradient>
                  </View>
                )}
              </View>
              
              <View style={styles.cardMeta}>
                <View style={[styles.metaChip, { backgroundColor: theme.colors.surface.secondary }]}>
                  <Icon name="layers" size={14} color={theme.colors.text.secondary} />
                  <RNText style={[styles.metaText, { color: theme.colors.text.secondary }]}>
                    {template.steps.length} steps
                  </RNText>
                </View>
                <View style={[styles.metaChip, { backgroundColor: theme.colors.surface.secondary }]}>
                  <Icon name="clock" size={14} color={theme.colors.text.secondary} />
                  <RNText style={[styles.metaText, { color: theme.colors.text.secondary }]}>
                    {template.estimatedTime}
                  </RNText>
                </View>
                <View style={[styles.metaChip, { backgroundColor: getDifficultyColor(template.difficulty) }]}>
                  <RNText style={[styles.metaText, { color: 'white' }]}>
                    {template.difficulty}
                  </RNText>
                </View>
              </View>
              
              <View style={styles.cardTags}>
                {template.tags.slice(0, 3).map(tag => (
                  <View key={tag} style={[styles.tagChip, { backgroundColor: theme.colors.surface.tertiary }]}>
                    <RNText style={[styles.tagText, { color: theme.colors.text.secondary }]}>
                      {tag}
                    </RNText>
                  </View>
                ))}
                {template.tags.length > 3 && (
                  <RNText style={[styles.moreTagsText, { color: theme.colors.text.tertiary }]}>
                    +{template.tags.length - 3} more
                  </RNText>
                )}
              </View>
              
              <View style={styles.cardActions}>
                <Pressable onPress={handleQuickUse} style={styles.useButton}>
                  <LinearGradient
                    colors={['#6366F1', '#8B5CF6']}
                    style={styles.useButtonGradient}
                  >
                    <Icon name="lightning-bolt" size={16} color="white" />
                    <RNText style={styles.useButtonText}>Quick Use</RNText>
                  </LinearGradient>
                </Pressable>
                <Pressable onPress={handleCardPress} style={[styles.customizeButton, { borderColor: theme.colors.border.light }]}>
                  <Icon name="pencil" size={16} color={theme.colors.brand.primary} />
                  <RNText style={[styles.customizeButtonText, { color: theme.colors.brand.primary }]}>Customize</RNText>
                </Pressable>
              </View>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  const renderCategoryCard = ({ item, index }: { item: any; index: number }) => {
    const categoryAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      Animated.timing(categoryAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }).start();
    }, []);

    const handleCategoryPress = async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
      
      setSelectedCategory(item.id);
      setFilter('category');
    };

    return (
      <Animated.View
        style={[
          {
            opacity: categoryAnim,
            transform: [
              { scale: scaleAnim },
              {
                translateX: categoryAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Pressable onPress={handleCategoryPress} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
          <View style={[styles.categoryCard, { backgroundColor: theme.colors.surface.secondary }]}>
            <LinearGradient
              colors={[item.color + '20', item.color + '10']}
              style={styles.categoryGradient}
            />
            <View style={styles.categoryContent}>
              <Icon name={item.icon} size={24} color={item.color} />
              <RNText style={[styles.categoryName, { color: theme.colors.text.primary }]}>
                {item.name}
              </RNText>
              <Icon name="chevron-right" size={16} color={theme.colors.text.tertiary} />
            </View>
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  const renderPhoneNumberInput = (stepId: string, stepTitle: string) => (
    <View key={stepId} style={styles.phoneInputContainer}>
      <View style={[styles.inputWrapper, { backgroundColor: theme.colors.surface.secondary, borderColor: theme.colors.border?.light || '#E0E0E0' }]}>
        <RNText style={[styles.inputLabel, { color: theme.colors.text.secondary }]}>
          Phone Number for {stepTitle}
        </RNText>
        <RNTextInput
          value={phoneNumbers[stepId] || ''}
          onChangeText={(text) => setPhoneNumbers(prev => ({ ...prev, [stepId]: text }))}
          placeholder="+1234567890"
          placeholderTextColor={theme.colors.text.tertiary}
          keyboardType="phone-pad"
          style={[styles.phoneInput, { color: theme.colors.text.primary }]}
        />
      </View>
    </View>
  );

  const filteredTemplates = getFilteredTemplates();

  const handleFilterPress = async (filterType: FilterType) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilter(filterType);
  };

  const handleRefresh = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSearchQuery('');
    setFilter('all');
    setSelectedCategory('');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background?.primary || theme.colors.background || '#F5F5F5' }]}>
      {/* Gradient Header */}
      <LinearGradient
        colors={['#6366F1', '#8B5CF6', '#EC4899']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradientHeader, { paddingTop: insets.top }]}
      >
        <Animated.View
          style={[
            styles.headerContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="white" />
          </Pressable>
          <RNText style={styles.headerTitle}>Automation Templates</RNText>
          <Pressable onPress={handleRefresh} style={styles.refreshButton}>
            <Icon name="refresh" size={24} color="white" />
          </Pressable>
        </Animated.View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Search Bar */}
        <Animated.View
          style={[
            styles.searchContainer,
            { backgroundColor: theme.colors.surface.secondary },
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={[styles.searchWrapper, { backgroundColor: theme.colors.surface.secondary, borderColor: theme.colors.border?.light || '#E0E0E0' }]}>
            <Icon name="magnify" size={20} color={theme.colors.text.tertiary} style={styles.searchIcon} />
            <RNTextInput
              placeholder="Search templates..."
              placeholderTextColor={theme.colors.text.tertiary}
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={[styles.searchInput, { color: theme.colors.text.primary }]}
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery('')} style={styles.clearSearch}>
                <Icon name="close" size={20} color={theme.colors.text.tertiary} />
              </Pressable>
            ) : null}
          </View>
        </Animated.View>

        {/* Filter Controls */}
        <Animated.View
          style={[
            styles.filtersContainer,
            { backgroundColor: theme.colors.surface.secondary },
            {
              opacity: filterButtonsAnim,
            },
          ]}
        >
          <View style={styles.customSegmentedButtons}>
            <Pressable 
              style={[
                styles.segmentButton, 
                styles.leftSegment,
                { backgroundColor: theme.colors.surface.secondary, borderColor: theme.colors.border?.light || '#E0E0E0' },
                filter === 'all' && styles.activeSegment
              ]}
              onPress={() => handleFilterPress('all')}
            >
              {filter === 'all' && (
                <LinearGradient
                  colors={['#6366F1', '#8B5CF6']}
                  style={styles.segmentGradient}
                />
              )}
              <RNText style={[
                styles.segmentText,
                { color: theme.colors.text.primary },
                filter === 'all' && styles.activeSegmentText
              ]}>All</RNText>
            </Pressable>
            <Pressable 
              style={[
                styles.segmentButton, 
                styles.middleSegment,
                { backgroundColor: theme.colors.surface.secondary, borderColor: theme.colors.border?.light || '#E0E0E0' },
                filter === 'popular' && styles.activeSegment
              ]}
              onPress={() => handleFilterPress('popular')}
            >
              {filter === 'popular' && (
                <LinearGradient
                  colors={['#6366F1', '#8B5CF6']}
                  style={styles.segmentGradient}
                />
              )}
              <RNText style={[
                styles.segmentText,
                { color: theme.colors.text.primary },
                filter === 'popular' && styles.activeSegmentText
              ]}>Popular</RNText>
            </Pressable>
            <Pressable 
              style={[
                styles.segmentButton, 
                styles.rightSegment,
                { backgroundColor: theme.colors.surface.secondary, borderColor: theme.colors.border?.light || '#E0E0E0' },
                filter === 'category' && styles.activeSegment
              ]}
              onPress={() => handleFilterPress('category')}
            >
              {filter === 'category' && (
                <LinearGradient
                  colors={['#6366F1', '#8B5CF6']}
                  style={styles.segmentGradient}
                />
              )}
              <RNText style={[
                styles.segmentText,
                { color: theme.colors.text.primary },
                filter === 'category' && styles.activeSegmentText
              ]}>Category</RNText>
            </Pressable>
          </View>
        </Animated.View>

        {/* Category Selection */}
        {filter === 'category' && (
          <Animated.View
            style={[
              styles.categoriesSection,
              { backgroundColor: theme.colors.surface.secondary },
              {
                opacity: templateCardsAnim,
              },
            ]}
          >
            <RNText style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Choose Category</RNText>
            <FlatList
              data={categories}
              renderItem={({ item, index }) => renderCategoryCard({ item, index })}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              style={styles.categoriesList}
            />
          </Animated.View>
        )}

        {/* Results Count and Templates List - Only show when not selecting category */}
        {!(filter === 'category' && !selectedCategory) && (
          <>
            <Animated.View
              style={[
                styles.resultsContainer,
                { backgroundColor: theme.colors.surface.secondary },
                {
                  opacity: templateCardsAnim,
                },
              ]}
            >
              <RNText style={[styles.resultsText, { color: theme.colors.text.secondary }]}>
                {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} found
                {filter === 'category' && selectedCategory && (
                  <RNText style={[styles.categoryFilter, { color: theme.colors.brand.primary }]}>
                    {' '}in {categories.find(c => c.id === selectedCategory)?.name}
                  </RNText>
                )}
              </RNText>
            </Animated.View>

            {/* Templates List */}
            <Animated.View
              style={[
                styles.scrollContainer,
                {
                  opacity: templateCardsAnim,
                },
              ]}
            >
              <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {filteredTemplates.length > 0 ? (
                  filteredTemplates.map((template, index) => renderTemplateCard(template, index))
                ) : (
                  <View style={styles.emptyState}>
                    <Icon name="robot-confused" size={64} color={theme.colors.text.tertiary} />
                    <RNText style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>No Templates Found</RNText>
                    <RNText style={[styles.emptyDescription, { color: theme.colors.text.secondary }]}>
                      {searchQuery 
                        ? 'Try adjusting your search terms'
                        : 'No templates available for this category'
                      }
                    </RNText>
                  </View>
                )}
                
                <View style={styles.bottomSpacer} />
              </ScrollView>
            </Animated.View>
          </>
        )}
      </View>

      {/* Customization Modal */}
      <Portal>
        <Modal
          visible={showCustomizeModal}
          onDismiss={() => setShowCustomizeModal(false)}
          contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface.secondary }]}
        >
          {/* Modal Header with Gradient */}
          <LinearGradient
            colors={['#6366F1', '#8B5CF6']}
            style={styles.modalHeader}
          >
            <RNText style={styles.modalTitle}>Customize Template</RNText>
            <Pressable onPress={() => setShowCustomizeModal(false)} style={styles.modalCloseButton}>
              <Icon name="close" size={24} color="white" />
            </Pressable>
          </LinearGradient>
          
          <ScrollView style={styles.modalScrollView}>
            {selectedTemplate && (
              <>
                <View style={styles.modalContent}>
                  <View style={[styles.inputWrapper, { backgroundColor: theme.colors.surface.secondary, borderColor: theme.colors.border?.light || '#E0E0E0' }]}>
                    <RNText style={[styles.inputLabel, { color: theme.colors.text.secondary }]}>Automation Title</RNText>
                    <RNTextInput
                      value={customTitle}
                      onChangeText={setCustomTitle}
                      style={[styles.titleInput, { color: theme.colors.text.primary }]}
                      placeholder="Enter automation title"
                      placeholderTextColor={theme.colors.text.tertiary}
                    />
                  </View>
                  
                  {Object.keys(phoneNumbers).length > 0 && (
                    <View style={styles.phoneNumbersSection}>
                      <RNText style={[styles.sectionLabel, { color: theme.colors.text.primary }]}>Phone Numbers Required:</RNText>
                      {Object.keys(phoneNumbers).map(stepId => {
                        const step = selectedTemplate.steps.find(s => s.id.endsWith(stepId));
                        return renderPhoneNumberInput(stepId, step?.title || stepId);
                      })}
                    </View>
                  )}
                </View>
                
                <View style={[styles.modalActions, { borderTopColor: theme.colors.border?.light || '#E0E0E0' }]}>
                  <Pressable onPress={() => setShowCustomizeModal(false)} style={[styles.cancelButton, { borderColor: theme.colors.border.light }]}>
                    <RNText style={[styles.cancelButtonText, { color: theme.colors.text.secondary }]}>Cancel</RNText>
                  </Pressable>
                  <Pressable
                    onPress={handleCreateFromTemplate}
                    disabled={isCreating}
                    style={styles.createButton}
                  >
                    <LinearGradient
                      colors={['#6366F1', '#8B5CF6']}
                      style={styles.createButtonGradient}
                    >
                      <RNText style={styles.createButtonText}>
                        {isCreating ? 'Loading...' : 'Load into Builder'}
                      </RNText>
                    </LinearGradient>
                  </Pressable>
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
  },
  gradientHeader: {
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
  },
  refreshButton: {
    padding: 8,
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  clearSearch: {
    padding: 4,
  },
  filtersContainer: {
    padding: 16,
    borderBottomWidth: 1,
  },
  customSegmentedButtons: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  segmentGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  leftSegment: {
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  middleSegment: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  rightSegment: {
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  activeSegment: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    zIndex: 1,
  },
  activeSegmentText: {
    color: 'white',
  },
  categoriesSection: {
    flex: 1,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  categoriesList: {
    paddingHorizontal: 16,
  },
  categoryCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  categoryGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  categoryName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  resultsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  resultsText: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryFilter: {
    fontWeight: '700',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  templateCard: {
    marginBottom: 16,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    backgroundColor: 'white',
  },
  cardGradientAccent: {
    height: 4,
  },
  cardContent: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardIcon: {
    marginRight: 12,
    marginTop: 4,
  },
  cardInfo: {
    flex: 1,
  },
  templateTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  templateDescription: {
    fontSize: 15,
    lineHeight: 22,
  },
  popularBadge: {
    marginLeft: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  popularGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  popularText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  cardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  moreTagsText: {
    fontSize: 12,
    fontWeight: '500',
    alignSelf: 'center',
    marginLeft: 4,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  useButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  useButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  useButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  customizeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  customizeButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 12,
  },
  emptyDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  bottomSpacer: {
    height: 80,
  },
  modalContainer: {
    margin: 20,
    borderRadius: 20,
    maxHeight: '85%',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScrollView: {
    maxHeight: '100%',
  },
  modalContent: {
    padding: 20,
  },
  inputWrapper: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  titleInput: {
    fontSize: 16,
    height: 20,
  },
  phoneNumbersSection: {
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  phoneInputContainer: {
    marginBottom: 16,
  },
  phoneInput: {
    fontSize: 16,
    height: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  createButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default TemplatesScreen;