/**
 * Test file to verify all enhanced components work together
 * This is a development aid and should not be included in production builds
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ParallaxScrollView } from '../common/ParallaxScrollView';
import TrendingCarousel from './TrendingCarousel';
import FeaturedCard from './FeaturedCard';
import AnimatedCategoryChips from './AnimatedCategoryChips';
import AnimatedAutomationCard from './AnimatedAutomationCard';
import AnimatedSearchBar from './AnimatedSearchBar';
import { EventLogger } from '../../utils/EventLogger';

// Sample data for testing
const sampleAutomation = {
  id: '1',
  title: 'Smart Morning Routine',
  description: 'Automate your morning with lights, coffee, and weather updates',
  author: 'TechGuru',
  likes: 125,
  uses: 450,
  category: 'productivity',
  icon: 'coffee',
  color: '#FF6B6B',
  rating: 4.8,
  featured: true,
};

const sampleCategories = [
  { id: 'all', name: 'All', icon: 'view-grid', gradient: ['#667eea', '#764ba2'], count: 150 },
  { id: 'productivity', name: 'Productivity', icon: 'briefcase', gradient: ['#f093fb', '#f5576c'], count: 45 },
];

const sampleSuggestions = [
  { id: '1', text: 'Smart Home Controls', type: 'trending' as const },
  { id: '2', text: 'Morning Routine', type: 'recent' as const },
];

/**
 * Component Integration Test
 * - Tests all enhanced Discover screen components
 * - Verifies proper prop passing
 * - Checks for any runtime errors
 */
export const TestComponentIntegration: React.FC = () => {
  const handleItemPress = (item: any) => EventLogger.debug('TestIntegration', 'Item pressed:', item.title);
  const handleLike = (item: any) => EventLogger.debug('TestIntegration', 'Like:', item.title);
  const handleShare = (item: any) => EventLogger.debug('TestIntegration', 'Share:', item.title);
  const handleCategorySelect = (categoryId: string) => EventLogger.debug('TestIntegration', 'Category:', categoryId);
  const handleSearch = (text: string) => EventLogger.debug('TestIntegration', 'Search:', text);

  return (
    <View style={styles.container}>
      {/* Test AnimatedSearchBar */}
      <View style={styles.section}>
        <AnimatedSearchBar
          value=""
          onChangeText={handleSearch}
          suggestions={sampleSuggestions}
          showSuggestions={false}
        />
      </View>

      {/* Test FeaturedCard */}
      <View style={styles.section}>
        <FeaturedCard
          automation={sampleAutomation}
          onPress={handleItemPress}
          onLike={handleLike}
        />
      </View>

      {/* Test TrendingCarousel */}
      <View style={styles.section}>
        <TrendingCarousel
          data={[sampleAutomation]}
          onItemPress={handleItemPress}
          onLike={handleLike}
          autoPlay={false}
        />
      </View>

      {/* Test AnimatedCategoryChips */}
      <View style={styles.section}>
        <AnimatedCategoryChips
          categories={sampleCategories}
          selectedCategory="all"
          onCategorySelect={handleCategorySelect}
          showCounts={true}
        />
      </View>

      {/* Test AnimatedAutomationCard */}
      <View style={styles.section}>
        <AnimatedAutomationCard
          automation={sampleAutomation}
          onPress={handleItemPress}
          onLike={handleLike}
          onShare={handleShare}
          index={0}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    marginVertical: 10,
    paddingHorizontal: 20,
  },
});

export default TestComponentIntegration;