import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  FlatList,
  Pressable,
  Animated,
  Text as RNText,
  TextInput,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  ActivityIndicator,
  Text,
  IconButton,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeTheme } from '../../components/common/ThemeFallbackWrapper';
import { AutomationData } from '../../types';
import { supabase } from '../../services/supabase/client';
import StarRating from '../../components/reviews/StarRating';
import Constants from 'expo-constants';
import { AutomationFilters, FilterOptions } from '../../components/filtering/AutomationFilters';
import { automationFilterService } from '../../services/filtering/AutomationFilterService';
import { AutomationCard } from '../../components/automation/AutomationCard';
import { EventLogger } from '../../utils/EventLogger';

const { width: screenWidth } = Dimensions.get('window');

interface GalleryScreenProps {
  navigation: any;
  route?: {
    params?: {
      category?: string;
    };
  };
}

interface GalleryCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
}

const categories: GalleryCategory[] = [
  { id: 'essentials', name: 'Essentials', icon: 'star', description: 'Must-have automations for everyone', color: '#6200ee' },
  { id: 'productivity', name: 'Productivity', icon: 'briefcase', description: 'Get more done with less effort', color: '#03dac6' },
  { id: 'morning-routine', name: 'Morning Routine', icon: 'weather-sunny', description: 'Start your day right', color: '#ff6b00' },
  { id: 'travel', name: 'Travel', icon: 'airplane', description: 'Automations for travelers', color: '#e91e63' },
  { id: 'smart-home', name: 'Smart Home', icon: 'home-automation', description: 'Control your connected devices', color: '#4caf50' },
  { id: 'health-fitness', name: 'Health & Fitness', icon: 'heart', description: 'Track and improve your wellness', color: '#f44336' },
  { id: 'entertainment', name: 'Entertainment', icon: 'play', description: 'Fun and media automations', color: '#9c27b0' },
  { id: 'emergency', name: 'Emergency', icon: 'alert', description: 'Safety and emergency tools', color: '#ff5722' },
  { id: 'social', name: 'Social', icon: 'account-group', description: 'Connect and share with others', color: '#2196f3' },
  { id: 'tools', name: 'Tools', icon: 'tools', description: 'Useful utilities and helpers', color: '#795548' },
];

const GalleryScreen: React.FC<GalleryScreenProps> = ({ navigation, route }) => {
  const theme = useSafeTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [automations, setAutomations] = useState<AutomationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<GalleryCategory[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Define component functions inside GalleryScreen
  const ModernSearchBar = ({ value, onChangeText }: { value: string; onChangeText: (text: string) => void }) => (
    <View style={[styles.modernSearchContainer, { 
      borderColor: theme.colors.border?.light || '#E0E0E0',
      backgroundColor: theme.colors.surface?.primary || '#FFFFFF'
    }]}>
      <Icon name="magnify" size={20} color={theme.colors.text?.secondary || '#666666'} />
      <TextInput
        style={[styles.modernSearchInput, { color: theme.colors.text?.primary || '#000000' }]}
        placeholder="Search automations..."
        placeholderTextColor={theme.colors.text?.secondary || '#666666'}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );

  const ModernFilterChip = ({ label, onPress, onClose }: { label: string; onPress?: () => void; onClose?: () => void }) => (
    <LinearGradient
      colors={[theme.colors.brand?.primary || '#6200ee', theme.colors.brand?.secondary || '#03DAC6']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.modernFilterChip}
    >
      <TouchableOpacity
        onPress={onPress}
        style={styles.modernFilterChipContent}
      >
        <Text style={styles.modernFilterChipText}>{label}</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.filterChipClose}>
            <Icon name="close" size={16} color="white" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </LinearGradient>
  );

  const ModernSortButton = ({ title, active, onPress }: { title: string; active: boolean; onPress: () => void }) => (
    active ? (
      <LinearGradient
        colors={['#6366F1', '#8B5CF6', '#EC4899']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.sortButton}
      >
        <TouchableOpacity
          onPress={onPress}
          style={styles.sortButtonContent}
        >
          <Text style={styles.sortButtonTextActive}>{title}</Text>
        </TouchableOpacity>
      </LinearGradient>
    ) : (
      <TouchableOpacity
        onPress={onPress}
        style={[styles.sortButton, { backgroundColor: theme.colors.surface?.secondary || '#F5F5F5' }]}
      >
        <Text style={[styles.sortButtonText, { color: theme.colors.text?.secondary || '#666666' }]}>{title}</Text>
      </TouchableOpacity>
    )
  );

  // Animation values
  const fadeInAnim = useRef(new Animated.Value(0)).current;
  const slideInAnim = useRef(new Animated.Value(50)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  
  // Initialize filters with route category if provided
  const [filters, setFilters] = useState<FilterOptions>({
    category: route?.params?.category || null,
    sortBy: 'created_at',
    sortOrder: 'desc',
    minRating: 0,
    isPublic: true,
    hasSteps: null,
    tags: [],
    dateRange: 'all',
  });
  
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // Initial animations
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(fadeInAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideInAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    loadAvailableFilters();
    loadAutomations();
  }, []);

  useEffect(() => {
    loadAutomations();
  }, [filters]);

  const loadAvailableFilters = async () => {
    try {
      const filterData = await automationFilterService.getAvailableFilters();
      // Map to match GalleryCategory interface
      const mappedCategories = filterData.categories.map(cat => ({
        ...cat,
        description: `${cat.count} automations`
      }));
      setAvailableCategories(mappedCategories);
      setAvailableTags(filterData.tags);
    } catch (error) {
      EventLogger.error('Automation', 'Failed to load filter options:', error as Error);
    }
  };

  const loadAutomations = async () => {
    try {
      setIsLoading(true);
      
      const result = await automationFilterService.getFilteredAutomations(
        { ...filters, searchQuery },
        1, // page
        50 // limit
      );
      
      setAutomations(result.automations);
      setTotalCount(result.totalCount);
    } catch (error: any) {
      EventLogger.error('Automation', 'Error loading gallery automations:', {
        message: error.message,
        details: error.stack || error.toString(),
        url: Constants.expoConfig?.extra?.supabaseUrl
      } as Error);
      Alert.alert('Error', `Failed to load automations: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    await loadAvailableFilters();
    await loadAutomations();
    setRefreshing(false);
  };

  const handleFiltersChange = (newFilters: FilterOptions) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const defaultFilters: FilterOptions = {
      category: null,
      sortBy: 'created_at',
      sortOrder: 'desc',
      minRating: 0,
      isPublic: true,
      hasSteps: null,
      tags: [],
      dateRange: 'all',
    };
    setFilters(defaultFilters);
    setSearchQuery('');
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
  };

  const handleCategorySelect = (categoryId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFilters(prev => ({ ...prev, category: categoryId }));
  };

  const handleSortChange = (sortBy: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilters(prev => ({ ...prev, sortBy }));
  };

  const handleImportAutomation = async (automation: AutomationData) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Alert.alert(
        'Import Automation',
        `Do you want to add "${automation.title}" to your library?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Import',
            onPress: async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) {
                Alert.alert('Authentication Required', 'Please sign in to import automations');
                return;
              }

              // Create a copy of the automation for the user
              const { error } = await supabase
                .from('automations')
                .insert({
                  title: automation.title + ' (Imported)',
                  description: automation.description,
                  steps: automation.steps,
                  category: automation.category,
                  tags: [...automation.tags, 'imported'],
                  created_by: user.id,
                  is_public: false,
                });

              if (error) {
                Alert.alert('Import Failed', 'Could not import this automation');
              } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Success!', 'Automation imported to your library');
              }
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to import automation');
    }
  };

  const filteredAutomations = automations;

  const renderCategoryCard = ({ item, index }: { item: GalleryCategory; index: number }) => {
    const animatedValue = useRef(new Animated.Value(0)).current;
    const scaleValue = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 600,
        delay: index * 100,
        useNativeDriver: true,
      }).start();
    }, []);

    const handlePressIn = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Animated.spring(scaleValue, {
        toValue: 0.98,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleValue, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    };

    const translateY = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [30, 0],
    });

    return (
      <Animated.View
        style={{
          opacity: animatedValue,
          transform: [{ translateY }, { scale: scaleValue }],
        }}
      >
        <TouchableOpacity
          onPress={() => handleCategorySelect(item.id)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[
            styles.modernCategoryCard,
            { backgroundColor: theme.colors.surface.primary }
          ]}
        >
          <LinearGradient
            colors={[`${item.color}20`, `${item.color}10`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.categoryGradientOverlay}
          />
          <View style={styles.categoryContent}>
            <View style={[styles.categoryIconContainer, { backgroundColor: `${item.color}20` }]}>
              <Icon name={item.icon} size={28} color={item.color} />
            </View>
            <View style={styles.categoryText}>
              <Text style={[styles.categoryName, { color: theme.colors.text.primary }]}>{item.name}</Text>
              <Text style={[styles.categoryDescription, { color: theme.colors.text.secondary }]}>{item.description}</Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.colors.text.secondary} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderAutomationCard = (automation: AutomationData, index: number) => {
    const animatedValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 500,
        delay: index * 100,
        useNativeDriver: true,
      }).start();
    }, []);

    const translateY = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [20, 0],
    });

    return (
      <Animated.View
        key={automation.id}
        style={{
          opacity: animatedValue,
          transform: [{ translateY }],
          marginBottom: 12,
        }}
      >
        <AutomationCard
          automation={automation}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate('AutomationDetails', { automationId: automation.id, fromGallery: true });
          }}
          onRun={() => handleImportAutomation(automation)}
          showActions={true}
        />
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      {/* Gradient Header */}
      <Animated.View style={{ opacity: headerOpacity }}>
        <LinearGradient
          colors={['#6366F1', '#8B5CF6', '#EC4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientHeader, { paddingTop: insets.top }]}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.goBack();
              }}
              style={styles.headerButton}
            >
              <Icon name="arrow-left" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Gallery</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowFilters(true);
                }}
                style={styles.headerButton}
              >
                <Icon name="filter-variant" size={22} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleRefresh}
                style={styles.headerButton}
              >
                <Icon name="refresh" size={22} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeInAnim,
            transform: [{ translateY: slideInAnim }],
          },
        ]}
      >
        {/* Modern Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface.primary }]}>
          <ModernSearchBar
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>

        {/* Active Filters Summary */}
        {(filters.category || filters.minRating > 0 || filters.tags.length > 0 || filters.dateRange !== 'all') && (
          <View style={[styles.filterSummary, { backgroundColor: theme.colors.surface.secondary }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {filters.category && (
                <ModernFilterChip
                  label={availableCategories.find(c => c.id === filters.category)?.name || filters.category}
                  onClose={() => setFilters(prev => ({ ...prev, category: null }))}
                                  />
              )}
              {filters.minRating > 0 && (
                <ModernFilterChip
                  label={`${filters.minRating}+ stars`}
                  onClose={() => setFilters(prev => ({ ...prev, minRating: 0 }))}
                                  />
              )}
              {filters.tags.map(tag => (
                <ModernFilterChip
                  key={tag}
                  label={tag}
                  onClose={() => setFilters(prev => ({ 
                    ...prev, 
                    tags: prev.tags.filter(t => t !== tag) 
                  }))}
                                  />
              ))}
              {filters.dateRange !== 'all' && (
                <ModernFilterChip
                  label={filters.dateRange === 'week' ? 'This Week' : 
                         filters.dateRange === 'month' ? 'This Month' : 
                         filters.dateRange === 'year' ? 'This Year' : filters.dateRange}
                  onClose={() => setFilters(prev => ({ ...prev, dateRange: 'all' }))}
                                  />
              )}
            </ScrollView>
            <TouchableOpacity 
              onPress={handleResetFilters}
              style={styles.clearAllButton}
            >
              <Text style={[styles.clearAllText, { color: theme.colors.brand.primary }]}>Clear All</Text>
            </TouchableOpacity>
          </View>
        )}


        {/* Category Navigation */}
        {!filters.category && (
          <View style={[styles.categoriesSection, { backgroundColor: theme.colors.surface.primary }]}>
            <LinearGradient
              colors={['#6366F120', '#8B5CF610']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sectionHeaderGradient}
            >
              <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Browse Categories</Text>
            </LinearGradient>
            <FlatList
              data={categories}
              renderItem={({ item, index }) => renderCategoryCard({ item, index })}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              style={styles.categoriesList}
              contentContainerStyle={styles.categoriesListContainer}
            />
          </View>
        )}

        {/* Category Header when filtered */}
        {filters.category && (
          <LinearGradient
            colors={['#6366F1', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.categoryHeader}
          >
            <View style={styles.categoryHeaderContent}>
              <View style={styles.categoryHeaderIcon}>
                <Icon 
                  name={categories.find(c => c.id === filters.category)?.icon || 'folder'} 
                  size={24} 
                  color="white" 
                />
              </View>
              <Text style={styles.categoryHeaderTitle}>
                {categories.find(c => c.id === filters.category)?.name || 'Category'}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFilters(prev => ({ ...prev, category: null }));
              }}
              style={styles.backButton}
            >
              <Icon name="arrow-left" size={20} color="white" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          </LinearGradient>
        )}

        {/* Modern Sorting Tabs - Only show when viewing automations */}
        {(filters.category || searchQuery || automations.length > 0) && (
          <View style={[styles.sortingContainer, { backgroundColor: theme.colors.surface.primary }]}>
            <View style={styles.modernSortButtons}>
              <ModernSortButton
                title="Trending"
                active={filters.sortBy === 'popularity'}
                onPress={() => handleSortChange('popularity')}
                              />
              <ModernSortButton
                title="Newest"
                active={filters.sortBy === 'created_at'}
                onPress={() => handleSortChange('created_at')}
                              />
              <ModernSortButton
                title="Top Rated"
                active={filters.sortBy === 'rating'}
                onPress={() => handleSortChange('rating')}
                              />
            </View>
          </View>
        )}

        {/* Automations List */}
        {isLoading ? (
          <LinearGradient
            colors={[theme.colors.surface.primary, theme.colors.surface.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.loadingContainer}
          >
            <Animated.View
              style={{
                transform: [{
                  rotate: fadeInAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  })
                }]
              }}
            >
              <Icon name="loading" size={48} color={theme.colors.brand.primary} />
            </Animated.View>
            <Text style={[styles.loadingText, { color: theme.colors.text.primary }]}>
              Loading gallery...
            </Text>
          </LinearGradient>
        ) : (
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={handleRefresh}
                colors={[theme.colors.brand.primary]}
                tintColor={theme.colors.brand.primary}
              />
            }
          >
            {filteredAutomations.length > 0 ? (
              filteredAutomations.map((automation, index) => renderAutomationCard(automation, index))
            ) : (
              <LinearGradient
                colors={['#6366F108', '#8B5CF608', '#EC489908']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.emptyState}
              >
                <Animated.View
                  style={{
                    opacity: fadeInAnim,
                    transform: [{
                      scale: fadeInAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 1],
                      })
                    }]
                  }}
                >
                  <View style={[styles.emptyIconContainer, { backgroundColor: theme.colors.surface.primary }]}>
                    <Icon name="robot-confused" size={64} color={theme.colors.text.secondary} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>
                    No Automations Found
                  </Text>
                  <Text style={[styles.emptyDescription, { color: theme.colors.text.secondary }]}>
                    {searchQuery 
                      ? 'Try adjusting your search terms or filters'
                      : 'No public automations available in this category'
                    }
                  </Text>
                  {searchQuery && (
                    <TouchableOpacity 
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSearchQuery('');
                      }}
                      style={styles.clearSearchButton}
                    >
                      <LinearGradient
                        colors={['#6366F1', '#8B5CF6']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.clearSearchButtonGradient}
                      >
                        <Text style={styles.clearSearchButtonText}>Clear Search</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </Animated.View>
              </LinearGradient>
            )}
            
            <View style={styles.bottomSpacer} />
          </ScrollView>
        )}
      </Animated.View>

      {/* Filter Modal */}
      <AutomationFilters
        visible={showFilters}
        filters={filters}
        categories={availableCategories}
        availableTags={availableTags}
        onFiltersChange={handleFiltersChange}
        onClose={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setShowFilters(false);
        }}
        onReset={handleResetFilters}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Header Styles
  gradientHeader: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    elevation: 8,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },

  // Content Styles
  content: {
    flex: 1,
  },
  
  // Modern Search Bar Styles
  searchContainer: {
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  modernSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 2,
    gap: 12,
    elevation: 4,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  modernSearchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },

  // Modern Filter Styles
  filterSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  modernFilterChip: {
    borderRadius: 20,
    marginRight: 8,
    elevation: 2,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  modernFilterChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  modernFilterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  filterChipClose: {
    padding: 2,
  },
  clearAllButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Categories Section Styles
  categoriesSection: {
    paddingBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionHeaderGradient: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  categoriesList: {
    paddingHorizontal: 20,
  },
  categoriesListContainer: {
    paddingBottom: 8,
  },

  // Modern Category Card Styles
  modernCategoryCard: {
    marginBottom: 12,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  categoryGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  categoryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryText: {
    flex: 1,
    gap: 4,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  categoryDescription: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.8,
  },

  // Category Header Styles
  categoryHeader: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  categoryHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  categoryHeaderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  categoryHeaderTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    gap: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },

  // Modern Sort Buttons
  sortingContainer: {
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  modernSortButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  sortButtonContainer: {
    flex: 1,
  },
  sortButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  sortButtonContent: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sortButtonTextActive: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },

  // Loading and Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    margin: 20,
    borderRadius: 24,
    gap: 20,
    elevation: 4,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    margin: 20,
    borderRadius: 24,
    marginTop: 80,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  emptyDescription: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    opacity: 0.8,
  },
  clearSearchButton: {
    marginTop: 8,
  },
  clearSearchButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  clearSearchButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
  },

  // Other Styles
  scrollView: {
    flex: 1,
    padding: 20,
  },
  bottomSpacer: {
    height: 100,
  },
});

export default GalleryScreen;