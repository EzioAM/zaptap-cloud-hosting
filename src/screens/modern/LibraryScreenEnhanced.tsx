import React, { useState, useRef, useEffect } from 'react';
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
import GradientHeader from '../../components/shared/GradientHeader';
import { GradientCard, GradientCardSkeleton } from '../../components/shared/GradientCard';
import GradientButton from '../../components/shared/GradientButton';
import EmptyStateIllustration from '../../components/shared/EmptyStateIllustration';
import { gradients, subtleGradients } from '../../theme/gradients';
import { typography, fontWeights } from '../../theme/typography';
import { ANIMATION_CONFIG } from '../../constants/animations';
import * as Haptics from 'expo-haptics';

const { width: screenWidth } = Dimensions.get('window');

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
}

const FilterChip: React.FC<{
  label: string;
  selected: boolean;
  onPress: () => void;
  gradientKey?: keyof typeof gradients;
}> = ({ label, selected, onPress, gradientKey = 'primary' }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    InteractionManager.runAfterInteractions(() => {
      onPress();
    });
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity onPress={handlePress}>
        {selected ? (
          <LinearGradient
            colors={gradients[gradientKey].colors}
            start={gradients[gradientKey].start}
            end={gradients[gradientKey].end}
            style={styles.filterChip}
          >
            <Text style={styles.filterChipTextSelected}>{label}</Text>
          </LinearGradient>
        ) : (
          <View style={styles.filterChipOutline}>
            <Text style={styles.filterChipText}>{label}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const LibraryScreenEnhanced = () => {
  const theme = useSafeTheme();
  const navigation = useNavigation();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'alphabetical' | 'most-used'>('recent');
  const scrollY = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(0)).current;
  const fabOpacity = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    // Animate FAB entrance with combined scale and opacity
    Animated.parallel([
      Animated.spring(fabScale, {
        toValue: 1,
        tension: ANIMATION_CONFIG.GENTLE_SPRING_TENSION,
        friction: ANIMATION_CONFIG.GENTLE_SPRING_FRICTION,
        delay: ANIMATION_CONFIG.ENTRY_ANIMATION_DELAY,
        useNativeDriver: true,
      }),
      Animated.timing(fabOpacity, {
        toValue: 1,
        duration: ANIMATION_CONFIG.ENTRY_ANIMATION_DURATION,
        delay: ANIMATION_CONFIG.ENTRY_ANIMATION_DELAY,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await refetch();
    setRefreshing(false);
  };

  const handleToggleActive = async (automation: SavedAutomation) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const currentActive = automation.is_active ?? automation.isActive ?? true;
      await updateAutomation({
        id: automation.id,
        is_active: !currentActive,
      }).unwrap();
    } catch (error) {
      Alert.alert('Error', 'Failed to update automation');
    }
  };

  const handleDelete = (automation: SavedAutomation) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `Check out my automation: ${automation.title}\n\n${automation.description}`,
        title: automation.title,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleCreateNew = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Add micro-interaction animation
    Animated.sequence([
      Animated.spring(fabScale, {
        toValue: ANIMATION_CONFIG.MICRO_INTERACTION_SCALE,
        tension: ANIMATION_CONFIG.SPRING_TENSION,
        friction: ANIMATION_CONFIG.SPRING_FRICTION,
        useNativeDriver: true,
      }),
      Animated.spring(fabScale, {
        toValue: 1,
        tension: ANIMATION_CONFIG.SPRING_TENSION,
        friction: ANIMATION_CONFIG.SPRING_FRICTION,
        useNativeDriver: true,
      }),
    ]).start();
    InteractionManager.runAfterInteractions(() => {
      navigation.navigate('AutomationBuilder' as never);
    });
  };

  const filteredAutomations = automations?.filter((automation: SavedAutomation) => {
    const matchesSearch = automation.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          automation.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const currentActive = automation.is_active ?? automation.isActive ?? true;
    const matchesFilter = selectedFilter === 'all' ||
                         (selectedFilter === 'active' && currentActive) ||
                         (selectedFilter === 'inactive' && !currentActive);
    
    return matchesSearch && matchesFilter;
  }) || [];

  const sortedAutomations = [...filteredAutomations].sort((a, b) => {
    switch (sortBy) {
      case 'alphabetical':
        return a.title.localeCompare(b.title);
      case 'most-used':
        return (b.totalRuns || 0) - (a.totalRuns || 0);
      case 'recent':
      default:
        const dateA = new Date(a.created_at || a.createdAt).getTime();
        const dateB = new Date(b.created_at || b.createdAt).getTime();
        return dateB - dateA;
    }
  });

  const renderAutomationCard = ({ item, index }: { item: SavedAutomation; index: number }) => {
    const isActive = item.is_active ?? item.isActive ?? true;
    const gradientKey = isActive ? 'success' : 'error';
    
    return (
      <GradientCard
        title={item.title}
        subtitle={`${item.steps?.length || 0} steps • ${item.totalRuns || 0} runs`}
        description={item.description}
        icon={item.icon || 'robot'}
        gradientKey={gradientKey as keyof typeof gradients}
        onPress={() => {
          if (item.id) {
            navigation.navigate('AutomationDetails' as never, { automationId: item.id } as never);
          } else {
            console.error('Missing automation ID for navigation');
          }
        }}
        delay={index * 100}
        showArrow
        badge={isActive ? 'Active' : 'Inactive'}
        badgeColor={isActive ? '#4CAF50' : '#FF5252'}
      />
    );
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors?.background || '#f5f5f5' }]}>
        <GradientHeader
          title="My Library"
          subtitle="Sign in to access your automations"
          gradientKey="primary"
        />
        <EmptyStateIllustration
          type="empty"
          title="Sign in Required"
          subtitle="Create and save your personal automations by signing in"
          actionLabel="Sign In"
          onAction={() => navigation.navigate('SignIn' as never)}
          gradientKey="primary"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors?.background || '#f5f5f5' }]}>
      <GradientHeader
        title="My Library"
        subtitle={`${automations?.length || 0} automations`}
        gradientKey="primary"
        rightIcon="plus"
        onRightPress={handleCreateNew}
        scrollOffset={scrollY}
      />

      <Animated.ScrollView
        style={styles.scrollView}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors?.primary || '#6366F1'}
            colors={[theme.colors?.primary || '#6366F1']}
          />
        }
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <LinearGradient
            colors={subtleGradients.lightGray.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.searchBar}
          >
            {Platform.OS === 'ios' && (
              <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFillObject} />
            )}
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
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialCommunityIcons 
                  name="close-circle" 
                  size={20} 
                  color={theme.colors?.textSecondary || '#666'} 
                />
              </TouchableOpacity>
            )}
          </LinearGradient>
        </View>

        {/* Filters */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}
        >
          <FilterChip
            label="All"
            selected={selectedFilter === 'all'}
            onPress={() => setSelectedFilter('all')}
            gradientKey="primary"
          />
          <FilterChip
            label="Active"
            selected={selectedFilter === 'active'}
            onPress={() => setSelectedFilter('active')}
            gradientKey="success"
          />
          <FilterChip
            label="Inactive"
            selected={selectedFilter === 'inactive'}
            onPress={() => setSelectedFilter('inactive')}
            gradientKey="error"
          />
          <View style={styles.filterDivider} />
          <FilterChip
            label="Recent"
            selected={sortBy === 'recent'}
            onPress={() => setSortBy('recent')}
            gradientKey="ocean"
          />
          <FilterChip
            label="A-Z"
            selected={sortBy === 'alphabetical'}
            onPress={() => setSortBy('alphabetical')}
            gradientKey="secondary"
          />
          <FilterChip
            label="Most Used"
            selected={sortBy === 'most-used'}
            onPress={() => setSortBy('most-used')}
            gradientKey="warning"
          />
        </ScrollView>

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            {[1, 2, 3].map((i) => (
              <GradientCardSkeleton key={i} />
            ))}
          </View>
        ) : sortedAutomations.length === 0 ? (
          <EmptyStateIllustration
            type="empty"
            title="No Automations Yet"
            subtitle="Create your first automation to get started"
            actionLabel="Create Automation"
            onAction={handleCreateNew}
            gradientKey="primary"
          />
        ) : (
          <FlatList
            data={sortedAutomations}
            renderItem={renderAutomationCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.listContent}
          />
        )}
      </Animated.ScrollView>

      {/* Floating Action Button */}
      <Animated.View
        style={[
          styles.fab,
          {
            transform: [
              { scale: fabScale },
            ],
            opacity: Animated.multiply(
              fabOpacity,
              scrollY.interpolate({
                inputRange: [0, 50, 100],
                outputRange: [1, 0.7, 0],
                extrapolate: 'clamp',
              })
            ),
          },
        ]}
        pointerEvents={scrollY._value > 80 ? 'none' : 'auto'}
      >
        <TouchableOpacity 
          onPress={handleCreateNew}
          activeOpacity={0.8}
          style={styles.fabTouchable}
        >
          <LinearGradient
            colors={gradients.primary.colors}
            start={gradients.primary.start}
            end={gradients.primary.end}
            style={styles.fabGradient}
          >
            <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  searchContainer: {
    padding: 16,
    paddingTop: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    ...typography.bodyLarge,
  },
  filtersContainer: {
    maxHeight: 50,
  },
  filtersContent: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipOutline: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    backgroundColor: '#FFFFFF',
  },
  filterChipText: {
    ...typography.labelMedium,
    color: '#666666',
  },
  filterChipTextSelected: {
    ...typography.labelMedium,
    color: '#FFFFFF',
    fontWeight: fontWeights.semibold,
  },
  filterDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 12,
  },
  loadingContainer: {
    padding: 16,
  },
  listContent: {
    paddingBottom: 100,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
  },
  fabTouchable: {
    borderRadius: 28,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
});

export default LibraryScreenEnhanced;