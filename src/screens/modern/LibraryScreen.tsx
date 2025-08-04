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
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { 
  useGetMyAutomationsQuery, 
  useDeleteAutomationMutation,
  useUpdateAutomationMutation 
} from '../../store/api/automationApi';
import { useConnection } from '../../contexts/ConnectionContext';

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

const LibraryScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { connectionState, checkConnection } = useConnection();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'alphabetical' | 'most-used'>('recent');

  const styles = createStyles(theme);
  
  const { data: automations = [], isLoading, refetch } = useGetMyAutomationsQuery();
  const [deleteAutomation] = useDeleteAutomationMutation();
  const [updateAutomation] = useUpdateAutomationMutation();

  // Map real automations to the expected format
  const savedAutomations: SavedAutomation[] = automations.map((automation) => {
    const createdDate = new Date(automation.created_at);
    const daysOld = Math.floor((new Date().getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    const estimatedRuns = Math.max(1, daysOld * 2);
    
    const getRelativeTime = (date: Date) => {
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      
      if (diffInHours < 1) return 'Just now';
      if (diffInHours < 24) return `${diffInHours} hours ago`;
      if (diffInHours < 48) return 'Yesterday';
      const days = Math.floor(diffInHours / 24);
      return `${days} days ago`;
    };
    
    const categoryIcons: Record<string, string> = {
      'Productivity': 'briefcase',
      'Smart Home': 'home-automation',
      'Social': 'share-variant',
      'Health': 'heart-pulse',
      'Communication': 'message',
      'Entertainment': 'movie',
      'Safety': 'alert-circle',
      'Fitness': 'run-fast',
    };
    
    const categoryColors: Record<string, string> = {
      'Productivity': '#FF6B6B',
      'Smart Home': '#4ECDC4',
      'Social': '#95E1D3',
      'Health': '#F38181',
      'Communication': '#6750A4',
      'Entertainment': '#625B71',
      'Safety': '#F38181',
      'Fitness': '#95E1D3',
    };
    
    return {
      id: automation.id,
      title: automation.title,
      description: automation.description || 'No description',
      icon: categoryIcons[automation.category] || 'robot',
      color: categoryColors[automation.category] || '#6750A4',
      steps: automation.steps?.length || 0,
      lastRun: getRelativeTime(createdDate),
      totalRuns: estimatedRuns,
      isActive: !automation.is_archived,
      tags: automation.tags || [],
      createdAt: automation.created_at,
    };
  });


  const filteredAutomations = savedAutomations.filter(automation => {
    const matchesSearch = automation.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      automation.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      automation.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFilter = selectedFilter === 'all' ||
      (selectedFilter === 'active' && automation.isActive) ||
      (selectedFilter === 'inactive' && !automation.isActive);
    
    return matchesSearch && matchesFilter;
  });

  const sortedAutomations = [...filteredAutomations].sort((a, b) => {
    switch (sortBy) {
      case 'alphabetical':
        return a.title.localeCompare(b.title);
      case 'most-used':
        return b.totalRuns - a.totalRuns;
      case 'recent':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const onRefresh = async () => {
    setRefreshing(true);
    
    // Check connection first
    await checkConnection();
    
    if (connectionState.isConnected) {
      await refetch();
    }
    
    setRefreshing(false);
  };

  const handleBackup = () => {
    Alert.alert(
      'Backup Automations',
      'Choose backup destination',
      [
        { text: 'iCloud', onPress: () => console.log('Backup to iCloud') },
        { text: 'Export File', onPress: () => console.log('Export to file') },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const handleRestore = () => {
    Alert.alert(
      'Restore Automations',
      'Choose restore source',
      [
        { text: 'iCloud', onPress: () => console.log('Restore from iCloud') },
        { text: 'Import File', onPress: () => console.log('Import from file') },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const handleToggleActive = async (automation: SavedAutomation) => {
    try {
      await updateAutomation({
        id: automation.id,
        updates: { is_archived: automation.isActive }
      });
    } catch (error) {
      console.error('Failed to toggle automation:', error);
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
              await deleteAutomation(automation.id);
            } catch (error) {
              console.error('Failed to delete automation:', error);
              Alert.alert('Error', 'Failed to delete automation');
            }
          }
        },
      ],
    );
  };

  const handleShare = async (automation: SavedAutomation) => {
    try {
      const shareUrl = `https://shortcutslike.app/automation/${automation.id}`;
      const message = `Check out my automation "${automation.title}"!\n\n${automation.description}\n\n`;
      
      const result = await Share.share({
        message: message + shareUrl,
        title: automation.title,
        url: shareUrl, // iOS only
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // Shared with activity type of result.activityType
          console.log('Shared with activity:', result.activityType);
        } else {
          // Shared
          console.log('Automation shared successfully');
        }
      } else if (result.action === Share.dismissedAction) {
        // Dismissed
        console.log('Share dismissed');
      }
    } catch (error) {
      console.error('Error sharing automation:', error);
      Alert.alert('Error', 'Failed to share automation');
    }
  };

  const renderAutomation = ({ item }: { item: SavedAutomation }) => (
    <TouchableOpacity
      style={[styles.automationCard, { backgroundColor: theme.colors.surface }]}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('AutomationDetails', { automationId: item.id })}
    >
      <View style={styles.automationHeader}>
        <View
          style={[
            styles.automationIcon,
            { backgroundColor: `${item.color}20` },
          ]}
        >
          <MaterialCommunityIcons
            name={item.icon as any}
            size={24}
            color={item.color}
          />
        </View>
        <View style={styles.automationInfo}>
          <View style={styles.titleRow}>
            <Text style={[styles.automationTitle, { color: theme.colors.text }]}>
              {item.title}
            </Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: item.isActive ? theme.colors.success + '20' : theme.colors.surfaceVariant }
            ]}>
              <Text style={[
                styles.statusText,
                { color: item.isActive ? theme.colors.success : theme.colors.textSecondary }
              ]}>
                {item.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          <Text style={[styles.automationDescription, { color: theme.colors.textSecondary }]}>
            {item.description}
          </Text>
          <View style={styles.automationMeta}>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons
                name="walk"
                size={14}
                color={theme.colors.textSecondary}
              />
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                {item.steps} steps
              </Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons
                name="play-circle-outline"
                size={14}
                color={theme.colors.textSecondary}
              />
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                {item.totalRuns} runs
              </Text>
            </View>
            {item.lastRun && (
              <View style={styles.metaItem}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={14}
                  color={theme.colors.textSecondary}
                />
                <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                  {item.lastRun}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.tagsContainer}>
            {item.tags.map((tag, index) => (
              <View key={index} style={[styles.tag, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Text style={[styles.tagText, { color: theme.colors.textSecondary }]}>
                  #{tag}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
      <View style={styles.automationActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleToggleActive(item)}
        >
          <MaterialCommunityIcons
            name={item.isActive ? 'pause' : 'play'}
            size={20}
            color={theme.colors.primary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('EditAutomation' as never, { automationId: item.id } as never)}
        >
          <MaterialCommunityIcons
            name="pencil"
            size={20}
            color={theme.colors.primary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleShare(item)}
        >
          <MaterialCommunityIcons
            name="share-variant"
            size={20}
            color={theme.colors.primary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDelete(item)}
        >
          <MaterialCommunityIcons
            name="delete-outline"
            size={20}
            color={theme.colors.error}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons
        name={!connectionState.isConnected ? "wifi-off" : "book-open-blank-variant"}
        size={64}
        color={theme.colors.textSecondary}
      />
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
        {!connectionState.isConnected ? "No Connection" : "No Automations Yet"}
      </Text>
      <Text style={[styles.emptyDescription, { color: theme.colors.textSecondary }]}>
        {!connectionState.isConnected 
          ? "Please check your internet connection and try again." 
          : "Create your first automation to get started"}
      </Text>
      {!connectionState.isConnected ? (
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
          onPress={async () => {
            await checkConnection();
            if (connectionState.isConnected) {
              refetch();
            }
          }}
        >
          <MaterialCommunityIcons name="refresh" size={20} color="#FFFFFF" />
          <Text style={styles.createButtonText}>Retry</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => navigation.navigate('BuildTab' as never)}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
          <Text style={styles.createButtonText}>Create Automation</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <MaterialCommunityIcons
            name="loading"
            size={48}
            color={theme.colors.primary}
          />
          <Text style={[styles.emptyDescription, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>
            Loading your library...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show connection error banner if not connected
  const showConnectionBanner = !connectionState.isConnected || connectionState.error;

  // Check if user is authenticated
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <MaterialCommunityIcons
            name="account-lock"
            size={64}
            color={theme.colors.textSecondary}
          />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            Sign In Required
          </Text>
          <Text style={[styles.emptyDescription, { color: theme.colors.textSecondary }]}>
            Please sign in to view your automations
          </Text>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.navigate('SignIn' as never)}
          >
            <Text style={styles.actionButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Connection Status Banner */}
      {showConnectionBanner && (
        <TouchableOpacity 
          style={[styles.connectionBanner, { backgroundColor: theme.colors.error }]}
          onPress={checkConnection}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons 
            name="wifi-off" 
            size={20} 
            color="#FFFFFF" 
          />
          <Text style={styles.connectionBannerText}>
            {connectionState.error || 'No connection'}
          </Text>
          <MaterialCommunityIcons 
            name="refresh" 
            size={20} 
            color="#FFFFFF" 
          />
        </TouchableOpacity>
      )}
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          My Library
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={handleBackup}>
            <MaterialCommunityIcons
              name="cloud-upload"
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleRestore}>
            <MaterialCommunityIcons
              name="cloud-download"
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: theme.colors.surface }]}>
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color={theme.colors.textSecondary}
          />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search automations..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialCommunityIcons
                name="close-circle"
                size={18}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters and Sort */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedFilter === 'all' && styles.activeFilter,
              { backgroundColor: selectedFilter === 'all' ? theme.colors.primary : theme.colors.surface }
            ]}
            onPress={() => setSelectedFilter('all')}
          >
            <Text style={[
              styles.filterText,
              { color: selectedFilter === 'all' ? '#FFFFFF' : theme.colors.text }
            ]}>
              All ({savedAutomations.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedFilter === 'active' && styles.activeFilter,
              { backgroundColor: selectedFilter === 'active' ? theme.colors.primary : theme.colors.surface }
            ]}
            onPress={() => setSelectedFilter('active')}
          >
            <Text style={[
              styles.filterText,
              { color: selectedFilter === 'active' ? '#FFFFFF' : theme.colors.text }
            ]}>
              Active ({savedAutomations.filter(a => a.isActive).length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedFilter === 'inactive' && styles.activeFilter,
              { backgroundColor: selectedFilter === 'inactive' ? theme.colors.primary : theme.colors.surface }
            ]}
            onPress={() => setSelectedFilter('inactive')}
          >
            <Text style={[
              styles.filterText,
              { color: selectedFilter === 'inactive' ? '#FFFFFF' : theme.colors.text }
            ]}>
              Inactive ({savedAutomations.filter(a => !a.isActive).length})
            </Text>
          </TouchableOpacity>
        </ScrollView>
        <TouchableOpacity
          style={[styles.sortButton, { backgroundColor: theme.colors.surface }]}
          onPress={() => {
            const options = ['recent', 'alphabetical', 'most-used'];
            const currentIndex = options.indexOf(sortBy);
            setSortBy(options[(currentIndex + 1) % options.length] as any);
          }}
        >
          <MaterialCommunityIcons
            name="sort"
            size={20}
            color={theme.colors.text}
          />
        </TouchableOpacity>
      </View>

      {/* Automations List */}
      {sortedAutomations.length > 0 ? (
        <FlatList
          data={sortedAutomations}
          renderItem={renderAutomation}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
        />
      ) : (
        <EmptyState />
      )}
    </SafeAreaView>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    connectionBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    connectionBannerText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
    headerTitle: {
      fontSize: theme.typography.h1.fontSize,
      fontWeight: theme.typography.h1.fontWeight,
    },
    headerActions: {
      flexDirection: 'row',
    },
    headerButton: {
      width: 44,
      height: 44,
      borderRadius: theme.borderRadius.round,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      marginLeft: theme.spacing.sm,
    },
    searchContainer: {
      paddingHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.sm,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      height: 48,
      borderRadius: theme.borderRadius.lg,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      marginLeft: theme.spacing.sm,
    },
    filtersContainer: {
      flexDirection: 'row',
      paddingHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    },
    filterChip: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.round,
      marginRight: theme.spacing.sm,
    },
    activeFilter: {
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
    filterText: {
      fontSize: 14,
      fontWeight: '600',
    },
    sortButton: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.round,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 'auto',
    },
    listContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
    },
    automationCard: {
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.md,
      shadowColor: theme.colors.cardShadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
    },
    automationHeader: {
      flexDirection: 'row',
      marginBottom: theme.spacing.sm,
    },
    automationIcon: {
      width: 48,
      height: 48,
      borderRadius: theme.borderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.md,
    },
    automationInfo: {
      flex: 1,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    automationTitle: {
      fontSize: 16,
      fontWeight: '600',
      flex: 1,
    },
    statusBadge: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
      borderRadius: theme.borderRadius.sm,
      marginLeft: theme.spacing.sm,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '600',
    },
    automationDescription: {
      fontSize: 13,
      lineHeight: 18,
      marginBottom: theme.spacing.sm,
    },
    automationMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: theme.spacing.md,
    },
    metaText: {
      fontSize: 12,
      marginLeft: 4,
    },
    tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    tag: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
      borderRadius: theme.borderRadius.sm,
      marginRight: theme.spacing.xs,
      marginTop: theme.spacing.xs,
    },
    tagText: {
      fontSize: 11,
      fontWeight: '500',
    },
    automationActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingTop: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.divider,
    },
    actionButton: {
      width: 36,
      height: 36,
      borderRadius: theme.borderRadius.round,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: theme.spacing.sm,
      backgroundColor: theme.colors.surfaceVariant,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '600',
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.sm,
    },
    emptyDescription: {
      fontSize: 16,
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
    },
    createButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.round,
    },
    createButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
      marginLeft: theme.spacing.sm,
    },
    actionButton: {
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.round,
      marginTop: theme.spacing.lg,
    },
    actionButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });

export default LibraryScreen;