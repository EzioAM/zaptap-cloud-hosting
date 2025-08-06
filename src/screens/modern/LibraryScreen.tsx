import React, { useState, useRef, useCallback, useMemo, useEffect, memo } from 'react';
// Error Boundaries and Recovery
import { ScreenErrorBoundary, WidgetErrorBoundary } from '../../components/ErrorBoundaries';
import { EventLogger } from '../../utils/EventLogger';
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
  Platform,
  Animated,
  Dimensions,
  InteractionManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeTheme } from '../../components/common/ThemeFallbackWrapper';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { 
  useGetMyAutomationsQuery, 
  useDeleteAutomationMutation,
  useUpdateAutomationMutation 
} from '../../store/api/automationApi';
import { useConnection } from '../../contexts/ConnectionContext';
import * as Haptics from 'expo-haptics';

// Components
import EnhancedAutomationCard from '../../components/organisms/EnhancedAutomationCard';
import EnhancedFloatingActionButton from '../../components/organisms/EnhancedFloatingActionButton';
import EnhancedSearchBar from '../../components/organisms/EnhancedSearchBar';
import EnhancedFilterChips from '../../components/organisms/EnhancedFilterChips';
import { EnhancedLoadingSkeleton } from '../../components/common/EnhancedLoadingSkeleton';
import { ErrorState } from '../../components/states/ErrorState';
import { EmptyState } from '../../components/states/EmptyState';

// Enhanced components
import { GradientHeader } from '../../components/shared/GradientHeader';
import { GradientCard, GradientCardSkeleton } from '../../components/shared/GradientCard';
import { GradientButton } from '../../components/shared/GradientButton';
import { EmptyStateIllustration } from '../../components/shared/EmptyStateIllustration';

// Theme imports
import { gradients, subtleGradients, getGlassStyle } from '../../theme/gradients';
import { typography, fontWeights, textShadows } from '../../theme/typography';

// Constants
import { ANIMATION_CONFIG } from '../../constants/animations';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Feature flags for progressive enhancement
const FEATURE_FLAGS = {
  ENHANCED_ANIMATIONS: Platform.OS !== 'web',
  HAPTIC_FEEDBACK: Platform.OS !== 'web',
  BLUR_EFFECTS: Platform.OS !== 'web',
  GRADIENT_HEADERS: true,
  STAGGERED_ANIMATIONS: Platform.OS !== 'web',
  SELECTION_MODE: true,
  ADVANCED_SORTING: true,
  SHARING: Platform.OS !== 'web',
};

interface SavedAutomation {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  steps: any[];
  lastRun?: string;
  totalRuns: number;
  isActive: boolean;
  tags: string[];
  createdAt: string;
  created_at?: string;
  is_active?: boolean;
  likes?: number;
  uses?: number;
  category?: string;
}

// Filter chip component with enhanced animations
const FilterChip: React.FC<{
  label: string;
  selected: boolean;
  onPress: () => void;
  gradientKey?: keyof typeof gradients;
  count?: number;
}> = memo(({ label, selected, onPress, gradientKey = 'primary', count }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    if (FEATURE_FLAGS.HAPTIC_FEEDBACK) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Haptics not supported
      }
    }
    
    if (FEATURE_FLAGS.ENHANCED_ANIMATIONS) {
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: ANIMATION_CONFIG.MICRO_INTERACTION_SCALE,
          tension: ANIMATION_CONFIG.SPRING_TENSION,
          friction: ANIMATION_CONFIG.SPRING_FRICTION,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: ANIMATION_CONFIG.SPRING_TENSION,
          friction: ANIMATION_CONFIG.SPRING_FRICTION,
          useNativeDriver: true,
        }),
      ]).start();
    }
    
    InteractionManager.runAfterInteractions(() => {
      onPress();
    });
  }, [onPress, scaleAnim]);

  const AnimatedTouchable = FEATURE_FLAGS.ENHANCED_ANIMATIONS ? 
    Animated.createAnimatedComponent(TouchableOpacity) : 
    TouchableOpacity;

  return (
    <AnimatedTouchable 
      style={FEATURE_FLAGS.ENHANCED_ANIMATIONS ? { transform: [{ scale: scaleAnim }] } : {}}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      {selected ? (
        <LinearGradient
          colors={gradients[gradientKey]?.colors || gradients.primary.colors}
          start={gradients[gradientKey]?.start || gradients.primary.start}
          end={gradients[gradientKey]?.end || gradients.primary.end}
          style={styles.filterChip}
        >
          <Text style={styles.filterChipTextSelected}>{label}</Text>
          {count !== undefined && (
            <Text style={styles.filterChipCount}>{count}</Text>
          )}
        </LinearGradient>
      ) : (
        <View style={styles.filterChipOutline}>
          <Text style={styles.filterChipText}>{label}</Text>
          {count !== undefined && (
            <Text style={styles.filterChipCountOutline}>{count}</Text>
          )}
        </View>
      )}
    </AnimatedTouchable>
  );
});

FilterChip.displayName = 'FilterChip';

const LibraryScreen: React.FC = memo(() => {
  const theme = useSafeTheme();
  const navigation = useNavigation();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { connectionState } = useConnection();
  const { isConnected } = connectionState;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'alphabetical' | 'most-used'>('recent');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [fabVisible, setFabVisible] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'warning'; message: string; visible: boolean }>({ 
    type: 'success', 
    message: '', 
    visible: false 
  });
  
  // Animation refs
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const pullToRefreshAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const fabTranslateY = useRef(new Animated.Value(0)).current;
  
  // API hooks
  const { 
    data: automations = [], 
    isLoading, 
    error, 
    refetch 
  } = useGetMyAutomationsQuery(undefined, {
    skip: !isAuthenticated,
  });
  
  const [deleteAutomation] = useDeleteAutomationMutation();
  const [updateAutomation] = useUpdateAutomationMutation();

  // Haptic feedback helper
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (FEATURE_FLAGS.HAPTIC_FEEDBACK) {
      try {
        switch (type) {
          case 'light':
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            break;
          case 'medium':
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            break;
          case 'heavy':
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            break;
        }
      } catch (error) {
        // Haptics not supported
      }
    }
  }, []);

  const showFeedback = useCallback((type: 'success' | 'error' | 'warning', message: string) => {
    setFeedback({ type, message, visible: true });
    setTimeout(() => setFeedback(prev => ({ ...prev, visible: false })), 3000);
  }, []);

  // Header animation based on scroll
  useEffect(() => {
    if (FEATURE_FLAGS.ENHANCED_ANIMATIONS) {
      const listener = scrollY.addListener(({ value }) => {
        const opacity = Math.max(0, Math.min(1, 1 - value / 200));
        headerOpacity.setValue(opacity);
        
        // Hide/show FAB based on scroll direction
        const shouldHideFab = value > 100;
        if (shouldHideFab !== !fabVisible) {
          setFabVisible(!shouldHideFab);
          Animated.timing(fabTranslateY, {
            toValue: shouldHideFab ? 100 : 0,
            duration: 200,
            useNativeDriver: true,
          }).start();
        }
      });

      return () => scrollY.removeListener(listener);
    }
  }, [scrollY, headerOpacity, fabVisible, fabTranslateY]);

  // Enhanced refresh with animation
  const handleRefresh = useCallback(async () => {
    if (!isConnected) {
      showFeedback('warning', 'No internet connection');
      return;
    }

    try {
      setRefreshing(true);
      triggerHaptic('medium');
      
      if (FEATURE_FLAGS.ENHANCED_ANIMATIONS) {
        Animated.spring(pullToRefreshAnim, {
          toValue: 1,
          tension: ANIMATION_CONFIG.SPRING_TENSION,
          friction: ANIMATION_CONFIG.SPRING_FRICTION,
          useNativeDriver: true,
        }).start();
      }

      await refetch();
      showFeedback('success', 'Library updated');
    } catch (error) {
      EventLogger.error('Library', 'Error refreshing:', error as Error);
      showFeedback('error', 'Failed to refresh');
    } finally {
      setRefreshing(false);
      if (FEATURE_FLAGS.ENHANCED_ANIMATIONS) {
        pullToRefreshAnim.setValue(0);
      }
    }
  }, [isConnected, refetch, triggerHaptic, showFeedback, pullToRefreshAnim]);

  // Filter and sort automations
  const filteredAndSortedAutomations = useMemo(() => {
    try {
      let filtered = automations.filter((automation: SavedAutomation) => {
        const matchesSearch = !searchQuery || 
          automation.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          automation.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          automation.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const matchesFilter = selectedFilter === 'all' || 
          (selectedFilter === 'active' && (automation.isActive || automation.is_active)) ||
          (selectedFilter === 'inactive' && !(automation.isActive || automation.is_active));
        
        return matchesSearch && matchesFilter;
      });

      // Sort automations
      if (FEATURE_FLAGS.ADVANCED_SORTING) {
        filtered.sort((a, b) => {
          switch (sortBy) {
            case 'alphabetical':
              return a.title.localeCompare(b.title);
            case 'most-used':
              return (b.totalRuns || 0) - (a.totalRuns || 0);
            case 'recent':
            default:
              const aDate = new Date(a.created_at || a.createdAt);
              const bDate = new Date(b.created_at || b.createdAt);
              return bDate.getTime() - aDate.getTime();
          }
        });
      }

      return filtered;
    } catch (error) {
      EventLogger.error('Library', 'Error filtering automations:', error as Error);
      return [];
    }
  }, [automations, searchQuery, selectedFilter, sortBy]);

  // Get filter counts
  const filterCounts = useMemo(() => {
    try {
      return {
        all: automations.length,
        active: automations.filter(a => a.isActive || a.is_active).length,
        inactive: automations.filter(a => !(a.isActive || a.is_active)).length,
      };
    } catch (error) {
      EventLogger.error('Library', 'Error calculating filter counts:', error as Error);
      return { all: 0, active: 0, inactive: 0 };
    }
  }, [automations]);

  const handleAutomationPress = useCallback((automation: SavedAutomation) => {
    try {
      triggerHaptic('light');
      
      if (isSelectionMode) {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(automation.id)) {
          newSelected.delete(automation.id);
        } else {
          newSelected.add(automation.id);
        }
        setSelectedItems(newSelected);
      } else {
        navigation.navigate('AutomationDetails' as never, { automation } as never);
      }
    } catch (error) {
      EventLogger.error('Library', 'Error handling automation press:', error as Error);
      showFeedback('error', 'Failed to open automation');
    }
  }, [isSelectionMode, selectedItems, navigation, triggerHaptic, showFeedback]);

  const handleAutomationEdit = useCallback((automation: SavedAutomation) => {
    try {
      triggerHaptic('light');
      navigation.navigate('AutomationBuilder' as never, { automation } as never);
    } catch (error) {
      EventLogger.error('Library', 'Error navigating to edit:', error as Error);
      showFeedback('error', 'Failed to open editor');
    }
  }, [navigation, triggerHaptic, showFeedback]);

  const handleAutomationDelete = useCallback((automation: SavedAutomation) => {
    Alert.alert(
      'Delete Automation',
      `Are you sure you want to delete "${automation.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              triggerHaptic('heavy');
              await deleteAutomation(automation.id).unwrap();
              showFeedback('success', 'Automation deleted');
            } catch (error) {
              EventLogger.error('Library', 'Error deleting automation:', error as Error);
              showFeedback('error', 'Failed to delete automation');
            }
          },
        },
      ]
    );
  }, [deleteAutomation, triggerHaptic, showFeedback]);

  const handleAutomationShare = useCallback(async (automation: SavedAutomation) => {
    if (!FEATURE_FLAGS.SHARING) {
      showFeedback('warning', 'Sharing not available on this platform');
      return;
    }

    try {
      triggerHaptic('light');
      
      const shareContent = {
        title: automation.title,
        message: `Check out this automation: ${automation.title}\n\n${automation.description}`,
        url: `https://shortcutslike.app/automation/${automation.id}`, // Replace with actual URL
      };

      await Share.share(shareContent);
    } catch (error) {
      EventLogger.error('Library', 'Error sharing automation:', error as Error);
      showFeedback('error', 'Failed to share automation');
    }
  }, [triggerHaptic, showFeedback]);

  const handleAutomationToggle = useCallback(async (automation: SavedAutomation) => {
    try {
      triggerHaptic('medium');
      
      const newIsActive = !(automation.isActive || automation.is_active);
      
      await updateAutomation({
        id: automation.id,
        is_active: newIsActive,
      }).unwrap();
      
      showFeedback('success', newIsActive ? 'Automation activated' : 'Automation deactivated');
    } catch (error) {
      EventLogger.error('Library', 'Error toggling automation:', error as Error);
      showFeedback('error', 'Failed to update automation');
    }
  }, [updateAutomation, triggerHaptic, showFeedback]);

  const handleBulkDelete = useCallback(() => {
    if (selectedItems.size === 0) return;

    Alert.alert(
      'Delete Automations',
      `Are you sure you want to delete ${selectedItems.size} automation(s)? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              triggerHaptic('heavy');
              
              const deletePromises = Array.from(selectedItems).map(id => 
                deleteAutomation(id).unwrap()
              );
              
              await Promise.all(deletePromises);
              
              setSelectedItems(new Set());
              setIsSelectionMode(false);
              showFeedback('success', `${selectedItems.size} automation(s) deleted`);
            } catch (error) {
              EventLogger.error('Library', 'Error bulk deleting:', error as Error);
              showFeedback('error', 'Failed to delete some automations');
            }
          },
        },
      ]
    );
  }, [selectedItems, deleteAutomation, triggerHaptic, showFeedback]);

  const renderAutomationCard = useCallback(({ item, index }: { item: SavedAutomation; index: number }) => {
    const isSelected = selectedItems.has(item.id);
    
    return (
      <EnhancedAutomationCard
        automation={item}
        onPress={() => handleAutomationPress(item)}
        onEdit={() => handleAutomationEdit(item)}
        onDelete={() => handleAutomationDelete(item)}
        onShare={() => handleAutomationShare(item)}
        onToggle={() => handleAutomationToggle(item)}
        isSelected={isSelected}
        isSelectionMode={isSelectionMode}
        animationDelay={FEATURE_FLAGS.STAGGERED_ANIMATIONS ? index * 100 : 0}
        theme={theme}
      />
    );
  }, [
    selectedItems, 
    isSelectionMode, 
    handleAutomationPress, 
    handleAutomationEdit, 
    handleAutomationDelete, 
    handleAutomationShare, 
    handleAutomationToggle,
    theme
  ]);

  const renderFilterChips = useCallback(() => {
    const filters = [
      { key: 'all', label: 'All', count: filterCounts.all },
      { key: 'active', label: 'Active', count: filterCounts.active },
      { key: 'inactive', label: 'Inactive', count: filterCounts.inactive },
    ];

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {filters.map((filter) => (
          <FilterChip
            key={filter.key}
            label={filter.label}
            selected={selectedFilter === filter.key}
            onPress={() => setSelectedFilter(filter.key as any)}
            count={filter.count}
          />
        ))}
      </ScrollView>
    );
  }, [selectedFilter, filterCounts]);

  const renderSortButton = useCallback(() => (
    <TouchableOpacity
      style={[styles.sortButton, { backgroundColor: theme.colors.surfaceVariant }]}
      onPress={() => {
        Alert.alert(
          'Sort By',
          'Choose how to sort your automations',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Recent', onPress: () => setSortBy('recent') },
            { text: 'Alphabetical', onPress: () => setSortBy('alphabetical') },
            { text: 'Most Used', onPress: () => setSortBy('most-used') },
          ]
        );
      }}
    >
      <MaterialCommunityIcons 
        name="sort" 
        size={20} 
        color={theme.colors.onSurfaceVariant} 
      />
      <Text style={[styles.sortButtonText, { color: theme.colors.onSurfaceVariant }]}>
        {sortBy === 'recent' ? 'Recent' : 
         sortBy === 'alphabetical' ? 'A-Z' : 'Most Used'}
      </Text>
    </TouchableOpacity>
  ), [sortBy, theme]);

  // Authentication check
  if (!isAuthenticated) {
    return (
      <ErrorState
        title="Authentication Required"
        description="Please sign in to access your library"
        action={{
          label: "Sign In",
          onPress: () => navigation.navigate('Auth' as never),
        }}
      />
    );
  }

  // Loading state
  if (isLoading && automations.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        {FEATURE_FLAGS.GRADIENT_HEADERS ? (
          <GradientHeader title="My Library" />
        ) : (
          <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
              My Library
            </Text>
          </View>
        )}
        <EnhancedLoadingSkeleton type="library" />
      </SafeAreaView>
    );
  }

  // Error state
  if (error && !isConnected) {
    return (
      <ErrorState
        title="No Internet Connection"
        description="Please check your connection and try again"
        action={{
          label: "Retry",
          onPress: handleRefresh,
        }}
      />
    );
  }

  return (
    <ScreenErrorBoundary 
      screenName="Library"
      onError={(error, errorInfo) => {
        EventLogger.error('LibraryScreen', 'Screen-level error caught', error, {
          componentStack: errorInfo.componentStack,
          userId: user?.id,
          automationsCount: filteredAndSortedAutomations.length,
          selectedCategory: selectedFilter,
        });
      }}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      {FEATURE_FLAGS.GRADIENT_HEADERS ? (
        <Animated.View style={{ opacity: headerOpacity }}>
          <GradientHeader 
            title="My Library" 
            rightComponent={
              isSelectionMode ? (
                <TouchableOpacity 
                  onPress={() => {
                    setIsSelectionMode(false);
                    setSelectedItems(new Set());
                  }}
                >
                  <Text style={styles.headerAction}>Cancel</Text>
                </TouchableOpacity>
              ) : (
                FEATURE_FLAGS.SELECTION_MODE && (
                  <TouchableOpacity onPress={() => setIsSelectionMode(true)}>
                    <MaterialCommunityIcons name="select" size={24} color="white" />
                  </TouchableOpacity>
                )
              )
            }
          />
        </Animated.View>
      ) : (
        <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
            My Library
          </Text>
          {isSelectionMode ? (
            <TouchableOpacity 
              onPress={() => {
                setIsSelectionMode(false);
                setSelectedItems(new Set());
              }}
            >
              <Text style={[styles.headerAction, { color: theme.colors.primary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          ) : (
            FEATURE_FLAGS.SELECTION_MODE && (
              <TouchableOpacity onPress={() => setIsSelectionMode(true)}>
                <MaterialCommunityIcons 
                  name="select" 
                  size={24} 
                  color={theme.colors.onSurface} 
                />
              </TouchableOpacity>
            )
          )}
        </View>
      )}

      {/* Selection Mode Header */}
      {isSelectionMode && (
        <View style={[styles.selectionHeader, { backgroundColor: theme.colors.primaryContainer }]}>
          <Text style={[styles.selectionText, { color: theme.colors.onPrimaryContainer }]}>
            {selectedItems.size} selected
          </Text>
          <View style={styles.selectionActions}>
            <TouchableOpacity
              style={styles.selectionAction}
              onPress={handleBulkDelete}
              disabled={selectedItems.size === 0}
            >
              <MaterialCommunityIcons 
                name="delete" 
                size={24} 
                color={selectedItems.size === 0 ? theme.colors.outline : theme.colors.error} 
              />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Search and Filters */}
      <View style={styles.searchSection}>
        <EnhancedSearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search your automations..."
          theme={theme}
        />
        
        <View style={styles.filtersRow}>
          {renderFilterChips()}
          {FEATURE_FLAGS.ADVANCED_SORTING && renderSortButton()}
        </View>
      </View>

      {/* Content */}
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {filteredAndSortedAutomations.length === 0 ? (
          <EmptyState
            icon={searchQuery || selectedFilter !== 'all' ? "magnify-scan" : "puzzle"}
            title={searchQuery || selectedFilter !== 'all' ? "No Results Found" : "No Automations Yet"}
            description={
              searchQuery 
                ? `No automations found for "${searchQuery}"`
                : selectedFilter !== 'all'
                ? `No ${selectedFilter} automations found`
                : "Create your first automation to get started"
            }
            action={
              searchQuery || selectedFilter !== 'all'
                ? {
                    label: "Clear Filters",
                    onPress: () => {
                      setSearchQuery('');
                      setSelectedFilter('all');
                    },
                  }
                : {
                    label: "Create Automation",
                    onPress: () => navigation.navigate('BuildScreen' as never),
                  }
            }
          />
        ) : (
          <FlatList
            data={filteredAndSortedAutomations}
            renderItem={renderAutomationCard}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.primary}
              />
            }
            onScroll={FEATURE_FLAGS.ENHANCED_ANIMATIONS ? Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: false }
            ) : undefined}
          />
        )}
      </Animated.View>

      {/* FAB */}
      {!isSelectionMode && (
        <Animated.View 
          style={[
            styles.fabContainer,
            FEATURE_FLAGS.ENHANCED_ANIMATIONS && {
              transform: [{ translateY: fabTranslateY }],
            }
          ]}
        >
          <EnhancedFloatingActionButton
            onPress={() => navigation.navigate('BuildScreen' as never)}
            icon="plus"
            theme={theme}
          />
        </Animated.View>
      )}

      {/* Feedback Toast */}
      {feedback.visible && (
        <Animated.View 
          style={[
            styles.feedbackToast,
            { backgroundColor: theme.colors.surface },
            FEATURE_FLAGS.ENHANCED_ANIMATIONS && {
              opacity: fadeAnim,
              transform: [{ translateY: Animated.multiply(fadeAnim, -50) }]
            }
          ]}
        >
          <MaterialCommunityIcons 
            name={feedback.type === 'success' ? 'check-circle' :
                  feedback.type === 'error' ? 'alert-circle' : 'alert'}
            size={20}
            color={feedback.type === 'success' ? '#4CAF50' :
                  feedback.type === 'error' ? '#F44336' : '#FF9800'}
          />
          <Text style={[styles.feedbackText, { color: theme.colors.onSurface }]}>
            {feedback.message}
          </Text>
        </Animated.View>
      )}
      </SafeAreaView>
    </ScreenErrorBoundary>
  );
});

LibraryScreen.displayName = 'LibraryScreen';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerAction: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  selectionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectionActions: {
    flexDirection: 'row',
    gap: 16,
  },
  selectionAction: {
    padding: 8,
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  filtersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  filtersContainer: {
    flex: 1,
    marginRight: 12,
  },
  filtersContent: {
    paddingRight: 20,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    gap: 6,
  },
  filterChipOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    gap: 6,
  },
  filterChipTextSelected: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterChipCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  filterChipCountOutline: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.7,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
  feedbackToast: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    gap: 12,
  },
  feedbackText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default LibraryScreen;