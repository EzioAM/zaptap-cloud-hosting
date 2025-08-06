import React, { useCallback, useState, useMemo, useEffect, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  Animated,
  RefreshControl,
  Dimensions,
  InteractionManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeTheme } from '../../components/common/ThemeFallbackWrapper';
import { useNavigation } from '@react-navigation/native';

// Optimized Animation System
import {
  useOptimizedAnimatedValue,
  useOptimizedScrollAnimation,
  useBatchAnimations,
  useReducedMotion,
  useFPSMonitor,
  useSpringAnimation,
  useLazyAnimation,
  PresetAnimations,
  animationController,
  PlatformOptimizer,
  DURATIONS,
  SPRING_CONFIGS,
} from '../../utils/animations';

const { width: screenWidth } = Dimensions.get('window');

// Optimized Automation Card
const OptimizedAutomationCard = memo(({ 
  item, 
  index, 
  onPress 
}: any) => {
  const theme = useSafeTheme();
  const reducedMotion = useReducedMotion();
  const { value: scale, animate: animateScale } = useSpringAnimation(0.95);
  const opacity = useOptimizedAnimatedValue(0);
  const translateY = useOptimizedAnimatedValue(50);

  // Lazy initialization for staggered animations
  const { start } = useLazyAnimation(() => {
    return PresetAnimations.fadeInUp(opacity, translateY, {
      duration: DURATIONS.NORMAL,
      delay: Math.min(index * 50, 200), // Cap delay for long lists
    });
  }, index * 50);

  useEffect(() => {
    if (reducedMotion) {
      opacity.setValue(1);
      translateY.setValue(0);
      scale.setValue(1);
      return;
    }

    InteractionManager.runAfterInteractions(() => {
      start(() => {
        animateScale(1);
      });
    });
  }, [reducedMotion]);

  const handlePress = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Animate press
    animateScale(0.98);
    setTimeout(() => {
      animateScale(1);
      onPress(item);
    }, 100);
  }, [item, onPress, animateScale]);

  const optimizedStyle = useMemo(() => 
    PlatformOptimizer.optimizeStyle({
      opacity,
      transform: [{ scale }, { translateY }],
    }), []);

  return (
    <Animated.View style={[styles.cardContainer, optimizedStyle]}>
      <TouchableOpacity 
        onPress={handlePress}
        activeOpacity={0.8}
        style={styles.card}
      >
        <LinearGradient
          colors={['#6366F1', '#8B5CF6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons 
              name={item.icon || 'robot'} 
              size={32} 
              color="#fff" 
            />
            <View style={styles.cardBadge}>
              <Text style={styles.badgeText}>{item.category}</Text>
            </View>
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.cardDescription} numberOfLines={3}>
            {item.description}
          </Text>
          <View style={styles.cardFooter}>
            <View style={styles.cardStats}>
              <MaterialCommunityIcons name="play-circle" size={16} color="#fff" />
              <Text style={styles.statText}>{item.uses || 0}</Text>
            </View>
            <View style={styles.cardRating}>
              <MaterialCommunityIcons name="star" size={16} color="#FFD700" />
              <Text style={styles.statText}>{item.rating || '0.0'}</Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
});

// Optimized Category Chip
const OptimizedCategoryChip = memo(({ 
  category, 
  isSelected, 
  onPress, 
  index 
}: any) => {
  const { value: scale, animate } = useSpringAnimation(1);
  const opacity = useOptimizedAnimatedValue(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      opacity.setValue(1);
      return;
    }

    setTimeout(() => {
      animationController.createTiming(opacity, 1, {
        duration: DURATIONS.FAST,
      }).start();
    }, index * 30);
  }, [index, reducedMotion]);

  const handlePress = useCallback(() => {
    animate(0.95);
    setTimeout(() => {
      animate(1);
      onPress(category);
    }, 50);
  }, [category, onPress, animate]);

  return (
    <Animated.View 
      style={[
        { opacity, transform: [{ scale }] },
        PlatformOptimizer.optimizeStyle({}),
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        style={[
          styles.categoryChip,
          isSelected && styles.categoryChipSelected,
        ]}
      >
        <Text style={[
          styles.categoryChipText,
          isSelected && styles.categoryChipTextSelected,
        ]}>
          {category}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

// Main Optimized Discover Screen
const DiscoverScreenOptimized: React.FC = memo(() => {
  const theme = useSafeTheme();
  const navigation = useNavigation();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [automations, setAutomations] = useState<any[]>([]);
  
  // Performance monitoring
  const { isLowFPS, currentFPS } = useFPSMonitor();
  const reducedMotion = useReducedMotion();
  const { scrollY, handleScroll } = useOptimizedScrollAnimation();
  
  // Batch animations for better performance
  const { addAnimation } = useBatchAnimations();

  // Categories
  const categories = useMemo(() => 
    ['All', 'Productivity', 'Social', 'Smart Home', 'Entertainment', 'Utilities'],
    []
  );

  // Mock data - replace with actual API call
  useEffect(() => {
    InteractionManager.runAfterInteractions(() => {
      const mockData = Array.from({ length: 20 }, (_, i) => ({
        id: `automation-${i}`,
        title: `Automation ${i + 1}`,
        description: 'This is a sample automation that does amazing things',
        category: categories[Math.floor(Math.random() * (categories.length - 1)) + 1],
        icon: 'robot',
        uses: Math.floor(Math.random() * 1000),
        rating: (Math.random() * 2 + 3).toFixed(1),
      }));
      setAutomations(mockData);
    });
  }, []);

  // Filter automations by category
  const filteredAutomations = useMemo(() => {
    if (selectedCategory === 'All') return automations;
    return automations.filter(a => a.category === selectedCategory);
  }, [automations, selectedCategory]);

  // Handle refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  // Navigate to automation details
  const handleAutomationPress = useCallback((automation: any) => {
    animationController.runAfterAnimations(() => {
      navigation.navigate('AutomationDetails' as any, { automation });
    });
  }, [navigation]);

  // Optimized header with parallax effect
  const headerTranslateY = useMemo(() => {
    if (reducedMotion) return 0;
    
    return animationController.createScrollAnimation(scrollY, {
      inputRange: [0, 100],
      outputRange: [0, -50],
    });
  }, [scrollY, reducedMotion]);

  // Render automation card
  const renderAutomation = useCallback(({ item, index }: any) => (
    <OptimizedAutomationCard
      item={item}
      index={index}
      onPress={handleAutomationPress}
    />
  ), [handleAutomationPress]);

  // Key extractor
  const keyExtractor = useCallback((item: any) => item.id, []);

  // Get item layout for optimization
  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 180,
    offset: 180 * index,
    index,
  }), []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Animated Header */}
      <Animated.View 
        style={[
          styles.header,
          PlatformOptimizer.optimizeStyle({
            transform: [{ translateY: headerTranslateY }],
          }),
        ]}
      >
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Discover
        </Text>
        <TouchableOpacity 
          style={styles.searchButton}
          onPress={() => navigation.navigate('Search' as any)}
        >
          <MaterialCommunityIcons 
            name="magnify" 
            size={24} 
            color={theme.colors.text} 
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Category Chips */}
      <View style={styles.categoriesContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item}
          renderItem={({ item, index }) => (
            <OptimizedCategoryChip
              category={item}
              isSelected={selectedCategory === item}
              onPress={setSelectedCategory}
              index={index}
            />
          )}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      {/* Automations List */}
      <FlatList
        data={filteredAutomations}
        renderItem={renderAutomation}
        keyExtractor={keyExtractor}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        // Performance optimizations
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={10}
        initialNumToRender={8}
        windowSize={10}
        getItemLayout={getItemLayout}
        {...(Platform.OS === 'android' && {
          renderToHardwareTextureAndroid: true,
        })}
      />

      {/* Performance Monitor (Dev Only) */}
      {__DEV__ && isLowFPS && (
        <View style={styles.perfWarning}>
          <Text style={styles.perfWarningText}>
            Low FPS: {currentFPS}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoriesContainer: {
    height: 50,
    marginBottom: 8,
  },
  categoriesList: {
    paddingHorizontal: 16,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: '#6366F1',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666',
  },
  categoryChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  listContent: {
    paddingBottom: 100,
  },
  cardContainer: {
    width: (screenWidth - 48) / 2,
    marginBottom: 16,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardGradient: {
    padding: 16,
    minHeight: 160,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardDescription: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  cardStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
  },
  perfWarning: {
    position: 'absolute',
    top: 100,
    right: 16,
    backgroundColor: 'rgba(255,0,0,0.8)',
    padding: 8,
    borderRadius: 4,
  },
  perfWarningText: {
    color: '#fff',
    fontSize: 10,
  },
});

export default DiscoverScreenOptimized;