import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import * as Haptics from 'expo-haptics';

// API hooks for real data
import {
  useGetMyAutomationsQuery,
  useDeleteAutomationMutation,
  useUpdateAutomationMutation,
} from '../../store/api/automationApi';

// Components
import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';

interface AutomationItem {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  is_public: boolean;
  created_at: string;
  updated_at: string;
  execution_count: number;
  last_run?: string;
  steps?: any[];
  icon?: string;
  color?: string;
}

const LibraryScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'runs'>('recent');
  const [refreshing, setRefreshing] = useState(false);
  
  // Fetch user's automations from Supabase
  const {
    data: automations = [],
    isLoading,
    error,
    refetch,
  } = useGetMyAutomationsQuery();
  
  const [deleteAutomation] = useDeleteAutomationMutation();
  const [updateAutomation] = useUpdateAutomationMutation();
  
  // Get unique categories from user's automations
  const categories = useMemo(() => {
    const cats = new Set(['all']);
    automations.forEach((auto: any) => {
      if (auto.category) cats.add(auto.category);
    });
    return Array.from(cats);
  }, [automations]);
  
  // Filter and sort automations
  const filteredAutomations = useMemo(() => {
    let filtered = [...automations];
    
    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter((auto: any) =>
        auto.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        auto.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        auto.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((auto: any) => auto.category === selectedCategory);
    }
    
    // Sort
    filtered.sort((a: any, b: any) => {
      switch (sortBy) {
        case 'name':
          return (a.title || '').localeCompare(b.title || '');
        case 'runs':
          return (b.execution_count || 0) - (a.execution_count || 0);
        case 'recent':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    
    return filtered;
  }, [automations, searchQuery, selectedCategory, sortBy]);
  
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);
  
  const handleDelete = useCallback(async (id: string, title: string) => {
    Alert.alert(
      'Delete Automation',
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAutomation(id).unwrap();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete automation');
            }
          },
        },
      ]
    );
  }, [deleteAutomation]);
  
  const handleTogglePublic = useCallback(async (id: string, currentStatus: boolean) => {
    try {
      await updateAutomation({
        id,
        updates: { is_public: !currentStatus },
      }).unwrap();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      Alert.alert('Error', 'Failed to update automation visibility');
    }
  }, [updateAutomation]);
  
  const handleAutomationPress = useCallback((automation: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('AutomationDetails' as never, { automation } as never);
  }, [navigation]);
  
  const handleCreateNew = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('BuildTab' as never);
  }, [navigation]);
  
  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      'productivity': 'briefcase',
      'smart-home': 'home-automation',
      'health': 'heart',
      'finance': 'cash',
      'social': 'account-group',
      'entertainment': 'gamepad',
      'travel': 'airplane',
      'education': 'school',
      'default': 'robot',
    };
    return icons[category?.toLowerCase()] || icons.default;
  };
  
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string[]> = {
      'productivity': ['#667eea', '#764ba2'],
      'smart-home': ['#4facfe', '#00f2fe'],
      'health': ['#43e97b', '#38f9d7'],
      'finance': ['#fa709a', '#fee140'],
      'social': ['#a8edea', '#fed6e3'],
      'entertainment': ['#ff9a9e', '#fecfef'],
      'travel': ['#ffecd2', '#fcb69f'],
      'education': ['#89f7fe', '#66a6ff'],
      'default': ['#667eea', '#764ba2'],
    };
    const result = colors[category?.toLowerCase()] || colors.default;
    // Ensure we always return a valid gradient array with at least 2 colors
    return result && result.length >= 2 ? result : ['#667eea', '#764ba2'];
  };
  
  const renderAutomationItem = ({ item, index }: { item: any; index: number }) => {
    const gradientColors = getCategoryColor(item.category);
    
    return (
      <TouchableOpacity
        style={[styles.automationCard, { backgroundColor: theme.colors.surface }]}
        onPress={() => handleAutomationPress(item)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={gradientColors && gradientColors.length >= 2 ? gradientColors : ['#667eea', '#764ba2']}
          style={styles.iconContainer}
        >
          <MaterialCommunityIcons
            name={getCategoryIcon(item.category) as any}
            size={24}
            color="white"
          />
        </LinearGradient>
        
        <View style={styles.automationInfo}>
          <View style={styles.titleRow}>
            <Text style={[styles.automationTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
              {item.title}
            </Text>
            {item.is_public && (
              <View style={styles.publicBadge}>
                <MaterialCommunityIcons name="earth" size={14} color={theme.colors.primary} />
                <Text style={[styles.publicText, { color: theme.colors.primary }]}>Public</Text>
              </View>
            )}
          </View>
          
          <Text style={[styles.automationDescription, { color: theme.colors.onSurfaceVariant }]} numberOfLines={2}>
            {item.description || 'No description'}
          </Text>
          
          <View style={styles.automationMeta}>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="play-circle" size={14} color={theme.colors.onSurfaceVariant} />
              <Text style={[styles.metaText, { color: theme.colors.onSurfaceVariant }]}>
                {item.execution_count || 0} runs
              </Text>
            </View>
            
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="folder" size={14} color={theme.colors.onSurfaceVariant} />
              <Text style={[styles.metaText, { color: theme.colors.onSurfaceVariant }]}>
                {item.category || 'General'}
              </Text>
            </View>
            
            {item.tags && item.tags.length > 0 && (
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="tag" size={14} color={theme.colors.onSurfaceVariant} />
                <Text style={[styles.metaText, { color: theme.colors.onSurfaceVariant }]}>
                  {item.tags.length} tags
                </Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.automationActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleTogglePublic(item.id, item.is_public)}
          >
            <MaterialCommunityIcons
              name={item.is_public ? 'earth' : 'earth-off'}
              size={20}
              color={theme.colors.onSurfaceVariant}
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDelete(item.id, item.title)}
          >
            <MaterialCommunityIcons
              name="delete"
              size={20}
              color={theme.colors.error}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };
  
  const renderHeader = () => (
    <View style={styles.headerContent}>
      {/* Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: theme.colors.surfaceVariant }]}>
        <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.onSurfaceVariant} />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.onSurface }]}
          placeholder="Search your automations..."
          placeholderTextColor={theme.colors.onSurfaceVariant}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialCommunityIcons name="close-circle" size={18} color={theme.colors.onSurfaceVariant} />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Categories */}
      {categories.length > 1 && (
        <View style={styles.categoriesContainer}>
          <FlatList
            horizontal
            data={categories}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  selectedCategory === item && styles.categoryChipSelected,
                  { 
                    backgroundColor: selectedCategory === item 
                      ? theme.colors.primary 
                      : theme.colors.surfaceVariant 
                  }
                ]}
                onPress={() => setSelectedCategory(item)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    { 
                      color: selectedCategory === item 
                        ? 'white' 
                        : theme.colors.onSurfaceVariant 
                    }
                  ]}
                >
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
      
      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <Text style={[styles.sortLabel, { color: theme.colors.onSurfaceVariant }]}>Sort by:</Text>
        {['recent', 'name', 'runs'].map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.sortChip,
              sortBy === option && styles.sortChipSelected,
              { 
                backgroundColor: sortBy === option 
                  ? theme.colors.primary + '20' 
                  : 'transparent' 
              }
            ]}
            onPress={() => setSortBy(option as any)}
          >
            <Text
              style={[
                styles.sortChipText,
                { 
                  color: sortBy === option 
                    ? theme.colors.primary 
                    : theme.colors.onSurfaceVariant 
                }
              ]}
            >
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Results Count */}
      {filteredAutomations.length > 0 && (
        <Text style={[styles.resultsCount, { color: theme.colors.onSurfaceVariant }]}>
          {filteredAutomations.length} automation{filteredAutomations.length !== 1 ? 's' : ''}
        </Text>
      )}
    </View>
  );
  
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.onBackground }]}>
            My Library
          </Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
            Loading your automations...
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.onBackground }]}>
            My Library
          </Text>
        </View>
        <ErrorState
          title="Failed to Load Automations"
          description="There was an error loading your automations"
          action={{
            label: "Retry",
            onPress: handleRefresh,
          }}
        />
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.onBackground }]}>
          My Library
        </Text>
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleCreateNew}
        >
          <MaterialCommunityIcons name="plus" size={20} color="white" />
          <Text style={styles.createButtonText}>Create</Text>
        </TouchableOpacity>
      </View>
      
      {filteredAutomations.length === 0 && !isLoading ? (
        <View style={styles.content}>
          {renderHeader()}
          <EmptyState
            icon={searchQuery ? "magnify-scan" : "robot-confused"}
            title={searchQuery ? "No Results Found" : "No Automations Yet"}
            description={
              searchQuery
                ? `No automations found for "${searchQuery}"`
                : user
                ? "Create your first automation to get started"
                : "Sign in to create and manage your automations"
            }
            action={
              searchQuery
                ? {
                    label: "Clear Search",
                    onPress: () => setSearchQuery(''),
                  }
                : user
                ? {
                    label: "Create Automation",
                    onPress: handleCreateNew,
                  }
                : {
                    label: "Sign In",
                    onPress: () => navigation.navigate('SignIn' as never),
                  }
            }
          />
        </View>
      ) : (
        <FlatList
          data={filteredAutomations}
          renderItem={renderAutomationItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  createButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  headerContent: {
    padding: 20,
    paddingTop: 0,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  categoriesContainer: {
    marginBottom: 12,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryChipSelected: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sortLabel: {
    fontSize: 14,
    marginRight: 4,
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  sortChipSelected: {},
  sortChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  resultsCount: {
    fontSize: 14,
    marginBottom: 8,
  },
  listContent: {
    paddingBottom: 20,
  },
  automationCard: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  automationInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  automationTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  publicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: 'rgba(98, 0, 238, 0.1)',
  },
  publicText: {
    fontSize: 11,
    fontWeight: '600',
  },
  automationDescription: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 18,
  },
  automationMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  automationActions: {
    justifyContent: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
});

export default LibraryScreen;