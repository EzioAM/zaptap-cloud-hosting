import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  RefreshControl,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeTheme } from '../../components/common/ThemeFallbackWrapper';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { 
  useGetMyAutomationsQuery, 
  useDeleteAutomationMutation,
  useUpdateAutomationMutation 
} from '../../store/api/automationApi';
// import { useConnection } from '../../contexts/ConnectionContext';

interface SavedAutomation {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  steps: number;
  lastRun?: string;
  totalRuns: number;
  isActive: boolean;
  tags: string[];
  createdAt: string;
}

const LibraryScreenSafe = () => {
  const theme = useSafeTheme();
  const navigation = useNavigation();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  // const { connectionState, checkConnection } = useConnection();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'alphabetical' | 'most-used'>('recent');
  
  const { 
    data: automations, 
    isLoading, 
    error, 
    refetch 
  } = useGetMyAutomationsQuery(undefined, {
    skip: !isAuthenticated,
  });
  
  const [deleteAutomation] = useDeleteAutomationMutation();
  const [updateAutomation] = useUpdateAutomationMutation();

  const handleRefresh = async () => {
    setRefreshing(true);
    // await checkConnection();
    await refetch();
    setRefreshing(false);
  };

  const handleToggleActive = async (automation: SavedAutomation) => {
    try {
      await updateAutomation({
        id: automation.id,
        is_active: !automation.isActive,
      }).unwrap();
    } catch (error) {
      Alert.alert('Error', 'Failed to update automation');
    }
  };

  const handleDelete = (automation: SavedAutomation) => {
    Alert.alert(
      'Delete Automation',
      `Are you sure you want to delete "${automation.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAutomation(automation.id).unwrap();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete automation');
            }
          },
        },
      ]
    );
  };

  const handleShare = async (automation: SavedAutomation) => {
    try {
      await Share.share({
        message: `Check out my "${automation.title}" automation on ZapTap!`,
        url: `https://zaptap.app/automation/${automation.id}`,
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  // Filter and sort automations
  const filteredAutomations = automations?.filter(automation => {
    const matchesSearch = automation.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         automation.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = selectedFilter === 'all' ||
                         (selectedFilter === 'active' && automation.isActive) ||
                         (selectedFilter === 'inactive' && !automation.isActive);
    return matchesSearch && matchesFilter;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'alphabetical':
        return a.title.localeCompare(b.title);
      case 'most-used':
        return b.totalRuns - a.totalRuns;
      case 'recent':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  }) || [];

  const renderAutomationItem = ({ item }: { item: SavedAutomation }) => (
    <TouchableOpacity
      style={[styles.automationCard, { backgroundColor: theme.colors?.surface || '#fff' }]}
      onPress={() => navigation.navigate('AutomationDetail' as never, { automationId: item.id } as never)}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
          <MaterialCommunityIcons name={item.icon as any} size={24} color="white" />
        </View>
        
        <View style={styles.cardInfo}>
          <View style={styles.titleRow}>
            <Text style={[styles.cardTitle, { color: theme.colors?.text || '#000' }]} numberOfLines={1}>
              {item.title}
            </Text>
            <TouchableOpacity
              onPress={() => handleToggleActive(item)}
              style={styles.toggleButton}
            >
              <MaterialCommunityIcons 
                name={item.isActive ? "toggle-switch" : "toggle-switch-off"} 
                size={28} 
                color={item.isActive ? (theme.colors?.primary || '#2196F3') : '#ccc'} 
              />
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.cardDescription, { color: theme.colors?.textSecondary || '#666' }]} numberOfLines={2}>
            {item.description}
          </Text>
          
          <View style={styles.cardStats}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="play-circle" size={16} color={theme.colors?.textSecondary || '#666'} />
              <Text style={[styles.statText, { color: theme.colors?.textSecondary || '#666' }]}>
                {item.totalRuns} runs
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="layers" size={16} color={theme.colors?.textSecondary || '#666'} />
              <Text style={[styles.statText, { color: theme.colors?.textSecondary || '#666' }]}>
                {item.steps} steps
              </Text>
            </View>
            
            {item.lastRun && (
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="clock-outline" size={16} color={theme.colors?.textSecondary || '#666'} />
                <Text style={[styles.statText, { color: theme.colors?.textSecondary || '#666' }]}>
                  {item.lastRun}
                </Text>
              </View>
            )}
          </View>
          
          {item.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {item.tags.map((tag, index) => (
                <View key={index} style={[styles.tag, { backgroundColor: theme.colors?.primaryLight || '#E3F2FD' }]}>
                  <Text style={[styles.tagText, { color: theme.colors?.primary || '#2196F3' }]}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.cardActions}>
        <TouchableOpacity
          onPress={() => handleShare(item)}
          style={styles.actionButton}
        >
          <MaterialCommunityIcons name="share-variant" size={20} color={theme.colors?.primary || '#2196F3'} />
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => navigation.navigate('BuildScreen' as never, { automationId: item.id } as never)}
          style={styles.actionButton}
        >
          <MaterialCommunityIcons name="pencil" size={20} color={theme.colors?.primary || '#2196F3'} />
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => handleDelete(item)}
          style={styles.actionButton}
        >
          <MaterialCommunityIcons name="delete" size={20} color="#ff4444" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors?.background || '#f5f5f5' }]}>
        <View style={styles.authPrompt}>
          <MaterialCommunityIcons name="lock" size={64} color={theme.colors?.textSecondary || '#666'} />
          <Text style={[styles.authTitle, { color: theme.colors?.text || '#000' }]}>
            Sign in to access your library
          </Text>
          <Text style={[styles.authDescription, { color: theme.colors?.textSecondary || '#666' }]}>
            Create and save your personal automations
          </Text>
          <TouchableOpacity
            style={[styles.authButton, { backgroundColor: theme.colors?.primary || '#2196F3' }]}
            onPress={() => navigation.navigate('Auth' as never)}
          >
            <Text style={styles.authButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors?.background || '#f5f5f5' }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors?.primary || '#2196F3']}
          />
        }
        stickyHeaderIndices={[1]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors?.text || '#000' }]}>
            My Library
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors?.textSecondary || '#666' }]}>
            Manage your personal automations
          </Text>
        </View>

        {/* Search and Filters */}
        <View style={[styles.controlsContainer, { backgroundColor: theme.colors?.background || '#f5f5f5' }]}>
          <View style={[styles.searchBar, { backgroundColor: theme.colors?.surface || '#fff' }]}>
            <MaterialCommunityIcons 
              name="magnify" 
              size={24} 
              color={theme.colors?.textSecondary || '#666'} 
            />
            <TextInput
              style={[styles.searchInput, { color: theme.colors?.text || '#000' }]}
              placeholder="Search automations..."
              placeholderTextColor={theme.colors?.textSecondary || '#999'}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          
          <View style={styles.filtersRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(['all', 'active', 'inactive'] as const).map(filter => (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.filterChip,
                    { backgroundColor: selectedFilter === filter ? theme.colors?.primary || '#2196F3' : theme.colors?.surface || '#fff' }
                  ]}
                  onPress={() => setSelectedFilter(filter)}
                >
                  <Text style={[
                    styles.filterChipText,
                    { color: selectedFilter === filter ? 'white' : theme.colors?.text || '#000' }
                  ]}>
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity
              style={[styles.sortButton, { backgroundColor: theme.colors?.surface || '#fff' }]}
              onPress={() => {
                const options = ['recent', 'alphabetical', 'most-used'] as const;
                const nextIndex = (options.indexOf(sortBy) + 1) % options.length;
                setSortBy(options[nextIndex]);
              }}
            >
              <MaterialCommunityIcons 
                name="sort" 
                size={20} 
                color={theme.colors?.text || '#000'} 
              />
              <Text style={[styles.sortButtonText, { color: theme.colors?.text || '#000' }]}>
                {sortBy.charAt(0).toUpperCase() + sortBy.slice(1).replace('-', ' ')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Automations List */}
        {filteredAutomations.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons 
              name="folder-open" 
              size={64} 
              color={theme.colors?.textSecondary || '#666'} 
            />
            <Text style={[styles.emptyTitle, { color: theme.colors?.text || '#000' }]}>
              {searchQuery ? 'No automations found' : 'No automations yet'}
            </Text>
            <Text style={[styles.emptyDescription, { color: theme.colors?.textSecondary || '#666' }]}>
              {searchQuery ? 'Try adjusting your search' : 'Create your first automation to get started'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity
                style={[styles.createButton, { backgroundColor: theme.colors?.primary || '#2196F3' }]}
                onPress={() => navigation.navigate('BuildScreen' as never)}
              >
                <MaterialCommunityIcons name="plus" size={20} color="white" />
                <Text style={styles.createButtonText}>Create Automation</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={filteredAutomations}
            renderItem={renderAutomationItem}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.automationsList}
          />
        )}
      </ScrollView>

      {/* Floating Action Button */}
      {filteredAutomations.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.colors?.primary || '#2196F3' }]}
          onPress={() => navigation.navigate('BuildScreen' as never)}
        >
          <MaterialCommunityIcons name="plus" size={28} color="white" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

export default LibraryScreenSafe;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
  },
  controlsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  automationsList: {
    padding: 20,
    paddingTop: 10,
  },
  automationCard: {
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    padding: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  toggleButton: {
    padding: 4,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  cardStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  statText: {
    fontSize: 12,
    marginLeft: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  actionButton: {
    padding: 8,
    marginLeft: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  authPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 8,
  },
  authDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  authButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  authButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});