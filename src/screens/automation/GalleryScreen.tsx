import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  FlatList,
  Pressable,
} from 'react-native';
import {
  Appbar,
  Card,
  Text,
  Chip,
  Button,
  IconButton,
  ActivityIndicator,
  Searchbar,
  Surface,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { AutomationData } from '../../types';
import { supabase } from '../../services/supabase/client';
import StarRating from '../../components/reviews/StarRating';
import Constants from 'expo-constants';
import { AutomationFilters, FilterOptions } from '../../components/filtering/AutomationFilters';
import { automationFilterService } from '../../services/filtering/AutomationFilterService';
import { AutomationCard } from '../../components/automation/AutomationCard';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [automations, setAutomations] = useState<AutomationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<GalleryCategory[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  
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
      console.error('Failed to load filter options:', error);
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
      console.error('Error loading gallery automations:', {
        message: error.message,
        details: error.stack || error.toString(),
        url: Constants.expoConfig?.extra?.supabaseUrl
      });
      Alert.alert('Error', `Failed to load automations: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAvailableFilters();
    await loadAutomations();
    setRefreshing(false);
  };

  const handleFiltersChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
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

  const handleImportAutomation = async (automation: AutomationData) => {
    try {
      Alert.alert(
        'Import Automation',
        `Do you want to add "${automation.title}" to your library?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Import',
            onPress: async () => {
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

  const renderCategoryCard = ({ item }: { item: GalleryCategory }) => (
    <Pressable 
      onPress={() => setFilters(prev => ({ ...prev, category: item.id }))}
      style={({ pressed }) => [
        { opacity: pressed ? 0.7 : 1 }
      ]}
    >
      <Surface 
        style={[styles.categoryCard, { borderLeftColor: item.color }]} 
        elevation={2}
      >
        <View style={styles.categoryContent}>
          <Icon name={item.icon} size={32} color={item.color} />
          <View style={styles.categoryText}>
            <Text style={styles.categoryName}>{item.name}</Text>
            <Text style={styles.categoryDescription}>{item.description}</Text>
          </View>
          <IconButton
            icon="chevron-right"
            size={20}
            onPress={() => setFilters(prev => ({ ...prev, category: item.id }))}
          />
        </View>
      </Surface>
    </Pressable>
  );

  const renderAutomationCard = (automation: AutomationData) => (
    <AutomationCard
      key={automation.id}
      automation={automation}
      onPress={() => navigation.navigate('AutomationDetails', { automationId: automation.id, fromGallery: true })}
      onRun={() => handleImportAutomation(automation)}
      showActions={true}
    />
  );

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Gallery" />
        <Appbar.Action
          icon="filter-variant"
          onPress={() => setShowFilters(true)}
        />
        <Appbar.Action
          icon="refresh"
          onPress={handleRefresh}
        />
      </Appbar.Header>

      <View style={styles.content}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Search automations..."
            onChangeText={handleSearch}
            value={searchQuery}
            style={styles.searchbar}
          />
        </View>

        {/* Active Filters Summary */}
        {(filters.category || filters.minRating > 0 || filters.tags.length > 0 || filters.dateRange !== 'all') && (
          <View style={styles.filterSummary}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {filters.category && (
                <Chip
                  style={styles.filterChip}
                  onClose={() => setFilters(prev => ({ ...prev, category: null }))}
                >
                  {availableCategories.find(c => c.id === filters.category)?.name || filters.category}
                </Chip>
              )}
              {filters.minRating > 0 && (
                <Chip
                  style={styles.filterChip}
                  onClose={() => setFilters(prev => ({ ...prev, minRating: 0 }))}
                >
                  {filters.minRating}+ stars
                </Chip>
              )}
              {filters.tags.map(tag => (
                <Chip
                  key={tag}
                  style={styles.filterChip}
                  onClose={() => setFilters(prev => ({ 
                    ...prev, 
                    tags: prev.tags.filter(t => t !== tag) 
                  }))}
                >
                  {tag}
                </Chip>
              ))}
              {filters.dateRange !== 'all' && (
                <Chip
                  style={styles.filterChip}
                  onClose={() => setFilters(prev => ({ ...prev, dateRange: 'all' }))}
                >
                  {filters.dateRange === 'week' ? 'This Week' : 
                   filters.dateRange === 'month' ? 'This Month' : 
                   filters.dateRange === 'year' ? 'This Year' : filters.dateRange}
                </Chip>
              )}
            </ScrollView>
            <Button 
              mode="text" 
              onPress={handleResetFilters}
              labelStyle={{ fontSize: 12 }}
            >
              Clear All
            </Button>
          </View>
        )}


        {/* Category Navigation */}
        {!filters.category && (
          <View style={styles.categoriesSection}>
            <Text style={styles.sectionTitle}>Browse Categories</Text>
            <FlatList
              data={categories}
              renderItem={renderCategoryCard}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              style={styles.categoriesList}
            />
          </View>
        )}

        {/* Category Header when filtered */}
        {filters.category && (
          <View style={styles.categoryHeader}>
            <View style={styles.categoryHeaderContent}>
              <Icon 
                name={categories.find(c => c.id === filters.category)?.icon || 'folder'} 
                size={24} 
                color={categories.find(c => c.id === filters.category)?.color || '#6200ee'} 
              />
              <Text style={styles.categoryHeaderTitle}>
                {categories.find(c => c.id === filters.category)?.name || 'Category'}
              </Text>
            </View>
            <Button 
              mode="outlined" 
              compact 
              onPress={() => setFilters(prev => ({ ...prev, category: null }))}
              icon="arrow-left"
            >
              Back to Categories
            </Button>
          </View>
        )}

        {/* Sorting Tabs - Only show when viewing automations */}
        {(filters.category || searchQuery || automations.length > 0) && (
          <View style={styles.sortingContainer}>
            <View style={styles.customSegmentedButtons}>
              <Pressable 
                style={[
                  styles.segmentButton, 
                  styles.leftSegment,
                  filters.sortBy === 'popularity' && styles.activeSegment
                ]}
                onPress={() => setFilters(prev => ({ ...prev, sortBy: 'popularity' }))}
              >
                <Text style={[
                  styles.segmentText,
                  filters.sortBy === 'popularity' && styles.activeSegmentText
                ]}>Trending</Text>
              </Pressable>
              <Pressable 
                style={[
                  styles.segmentButton, 
                  styles.middleSegment,
                  filters.sortBy === 'created_at' && styles.activeSegment
                ]}
                onPress={() => setFilters(prev => ({ ...prev, sortBy: 'created_at' }))}
              >
                <Text style={[
                  styles.segmentText,
                  filters.sortBy === 'created_at' && styles.activeSegmentText
                ]}>Newest</Text>
              </Pressable>
              <Pressable 
                style={[
                  styles.segmentButton, 
                  styles.rightSegment,
                  filters.sortBy === 'rating' && styles.activeSegment
                ]}
                onPress={() => setFilters(prev => ({ ...prev, sortBy: 'rating' }))}
              >
                <Text style={[
                  styles.segmentText,
                  filters.sortBy === 'rating' && styles.activeSegmentText
                ]}>Top Rated</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Automations List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>Loading gallery...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          >
            {filteredAutomations.length > 0 ? (
              filteredAutomations.map(renderAutomationCard)
            ) : (
              <View style={styles.emptyState}>
                <Icon name="robot-confused" size={64} color="#ccc" />
                <Text style={styles.emptyTitle}>No Automations Found</Text>
                <Text style={styles.emptyDescription}>
                  {searchQuery 
                    ? 'Try adjusting your search terms'
                    : 'No public automations available in this category'
                  }
                </Text>
              </View>
            )}
            
            <View style={styles.bottomSpacer} />
          </ScrollView>
        )}
      </View>

      {/* Filter Modal */}
      <AutomationFilters
        visible={showFilters}
        filters={filters}
        categories={availableCategories}
        availableTags={availableTags}
        onFiltersChange={handleFiltersChange}
        onClose={() => setShowFilters(false)}
        onReset={handleResetFilters}
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
  categoriesSection: {
    backgroundColor: '#fff',
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  categoriesList: {
    paddingHorizontal: 16,
    maxHeight: 300,
  },
  categoryCard: {
    marginBottom: 8,
    borderRadius: 12,
    borderLeftWidth: 4,
    backgroundColor: '#fff',
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  categoryText: {
    flex: 1,
    marginLeft: 16,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#666',
  },
  categoryHeader: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
    color: '#333',
  },
  sortingContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoryFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginRight: 8,
  },
  categoryChip: {
    marginRight: 8,
  },
  customSegmentedButtons: {
    flexDirection: 'row',
    borderRadius: 25,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftSegment: {
    // No specific styles needed due to overflow: 'hidden' on parent
  },
  middleSegment: {
    marginHorizontal: 1,
  },
  rightSegment: {
    // No specific styles needed
  },
  activeSegment: {
    backgroundColor: '#6200ee',
    borderRadius: 25,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeSegmentText: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  automationCard: {
    marginBottom: 12,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardInfo: {
    flex: 1,
  },
  automationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  automationAuthor: {
    fontSize: 14,
    color: '#6200ee',
    marginBottom: 8,
  },
  automationDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  cardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  ratingContainer: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  noRatingText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  importButton: {
    flex: 1,
    marginRight: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
  filterSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterChip: {
    marginRight: 8,
    backgroundColor: '#6200ee20',
  },
  resultsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  resultsText: {
    fontSize: 14,
    color: '#666',
  },
  sortText: {
    fontSize: 12,
    color: '#666',
  },
});

export default GalleryScreen;