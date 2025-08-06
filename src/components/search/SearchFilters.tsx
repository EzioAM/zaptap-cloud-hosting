/**
 * SearchFilters component with glass morphism design
 * 
 * Features:
 * - Category selection with visual chips
 * - Rating filter with star display
 * - NFC/QR availability filters
 * - Sort options
 * - Animated filter chips
 * - Reset functionality
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { getExtendedColors, getGlassStyle } from '../../theme/colors';
import { SearchFilters as SearchFiltersType } from '../../store/api/searchApi';
import { defaultCategories } from '../../store/api/searchApi';

interface SearchFiltersProps {
  filters: SearchFiltersType;
  onFiltersChange: (filters: SearchFiltersType) => void;
  onReset: () => void;
  style?: any;
  theme?: 'light' | 'dark';
}

interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: string;
  gradient?: string[];
  theme?: 'light' | 'dark';
}

const FilterChip: React.FC<FilterChipProps> = ({
  label,
  selected,
  onPress,
  icon,
  gradient,
  theme = 'light',
}) => {
  const [scaleValue] = useState(new Animated.Value(1));
  const colors = getExtendedColors(theme);
  
  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.8}
    >
      <Animated.View
        style={[
          styles.filterChip,
          {
            transform: [{ scale: scaleValue }],
            borderColor: selected ? colors.brand.primary : colors.border.light,
            backgroundColor: selected 
              ? colors.brand.primary + '15' 
              : colors.surface.primary,
          }
        ]}
      >
        {selected && gradient && (
          <LinearGradient
            colors={gradient}
            style={styles.chipGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        )}
        
        {Platform.OS === 'ios' && selected && (
          <BlurView intensity={20} tint={theme} style={styles.chipBlur} />
        )}
        
        <View style={styles.chipContent}>
          {icon && (
            <Ionicons
              name={icon as any}
              size={16}
              color={selected ? colors.brand.primary : colors.text.secondary}
              style={styles.chipIcon}
            />
          )}
          <Text
            style={[
              styles.chipText,
              {
                color: selected ? colors.brand.primary : colors.text.secondary,
                fontWeight: selected ? '600' : '500',
              }
            ]}
          >
            {label}
          </Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

interface RatingFilterProps {
  value: number;
  onChange: (rating: number) => void;
  theme?: 'light' | 'dark';
}

const RatingFilter: React.FC<RatingFilterProps> = ({ value, onChange, theme = 'light' }) => {
  const colors = getExtendedColors(theme);
  
  return (
    <View style={styles.ratingFilter}>
      <Text style={[styles.filterLabel, { color: colors.text.primary }]}>
        Minimum Rating
      </Text>
      <View style={styles.ratingStars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onChange(star)}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Ionicons
              name={star <= value ? 'star' : 'star-outline'}
              size={24}
              color={star <= value ? '#F59E0B' : colors.text.tertiary}
              style={styles.star}
            />
          </TouchableOpacity>
        ))}
        {value > 0 && (
          <TouchableOpacity onPress={() => onChange(0)} style={styles.clearRating}>
            <Text style={[styles.clearRatingText, { color: colors.text.tertiary }]}>
              Clear
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  filters,
  onFiltersChange,
  onReset,
  style,
  theme = 'light',
}) => {
  const colors = getExtendedColors(theme);
  const glassStyle = getGlassStyle('medium', theme === 'dark');

  const updateFilter = <K extends keyof SearchFiltersType>(
    key: K,
    value: SearchFiltersType[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== undefined && value !== null && value !== '' && value !== 0
  );

  const sortOptions = [
    { value: 'relevance', label: 'Relevance', icon: 'search' },
    { value: 'rating', label: 'Rating', icon: 'star' },
    { value: 'recent', label: 'Recent', icon: 'time' },
    { value: 'popular', label: 'Popular', icon: 'trending-up' },
    { value: 'executions', label: 'Most Used', icon: 'play' },
  ] as const;

  return (
    <View style={[styles.container, style]}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={80} tint={theme} style={styles.blurContainer}>
          <LinearGradient
            colors={['rgba(139, 92, 246, 0.05)', 'rgba(124, 58, 237, 0.02)']}
            style={styles.gradient}
          />
        </BlurView>
      ) : (
        <View style={[StyleSheet.absoluteFillObject, glassStyle]} />
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Categories */}
        <View style={styles.filterSection}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Categories
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalFilters}
          >
            {defaultCategories.map((category) => (
              <FilterChip
                key={category.id}
                label={category.name}
                selected={filters.category === category.id}
                onPress={() => updateFilter('category', 
                  filters.category === category.id ? undefined : category.id
                )}
                icon={category.icon}
                gradient={category.gradient}
                theme={theme}
              />
            ))}
          </ScrollView>
        </View>

        {/* Rating Filter */}
        <View style={styles.filterSection}>
          <RatingFilter
            value={filters.minRating || 0}
            onChange={(rating) => updateFilter('minRating', rating || undefined)}
            theme={theme}
          />
        </View>

        {/* Availability Filters */}
        <View style={styles.filterSection}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Availability
          </Text>
          <View style={styles.chipRow}>
            <FilterChip
              label="Has NFC"
              selected={filters.hasNFC === true}
              onPress={() => updateFilter('hasNFC', 
                filters.hasNFC === true ? undefined : true
              )}
              icon="radio"
              theme={theme}
            />
            <FilterChip
              label="Has QR"
              selected={filters.hasQR === true}
              onPress={() => updateFilter('hasQR', 
                filters.hasQR === true ? undefined : true
              )}
              icon="qr-code"
              theme={theme}
            />
            <FilterChip
              label="Public"
              selected={filters.isPublic === true}
              onPress={() => updateFilter('isPublic', 
                filters.isPublic === true ? undefined : true
              )}
              icon="globe"
              theme={theme}
            />
          </View>
        </View>

        {/* Sort Options */}
        <View style={styles.filterSection}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Sort By
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalFilters}
          >
            {sortOptions.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                selected={filters.sortBy === option.value}
                onPress={() => updateFilter('sortBy', 
                  filters.sortBy === option.value ? 'relevance' : option.value
                )}
                icon={option.icon}
                theme={theme}
              />
            ))}
          </ScrollView>
        </View>

        {/* Sort Order */}
        {filters.sortBy && filters.sortBy !== 'relevance' && (
          <View style={styles.filterSection}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Order
            </Text>
            <View style={styles.chipRow}>
              <FilterChip
                label="Descending"
                selected={filters.sortOrder === 'desc' || !filters.sortOrder}
                onPress={() => updateFilter('sortOrder', 'desc')}
                icon="arrow-down"
                theme={theme}
              />
              <FilterChip
                label="Ascending"
                selected={filters.sortOrder === 'asc'}
                onPress={() => updateFilter('sortOrder', 'asc')}
                icon="arrow-up"
                theme={theme}
              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Reset Button */}
      {hasActiveFilters && (
        <View style={styles.resetContainer}>
          <TouchableOpacity
            style={[styles.resetButton, { borderColor: colors.border.medium }]}
            onPress={onReset}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#EF4444', '#DC2626']}
              style={styles.resetGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="refresh" size={16} color="white" />
              <Text style={styles.resetButtonText}>Reset Filters</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  blurContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  scrollView: {
    maxHeight: 400,
  },
  scrollContent: {
    padding: 16,
  },
  filterSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  horizontalFilters: {
    flexDirection: 'row',
    gap: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
    minHeight: 36,
  },
  chipGradient: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.1,
  },
  chipBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chipIcon: {
    marginRight: 6,
  },
  chipText: {
    fontSize: 14,
  },
  ratingFilter: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  ratingStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  star: {
    marginRight: 2,
  },
  clearRating: {
    marginLeft: 12,
  },
  clearRatingText: {
    fontSize: 12,
    fontWeight: '500',
  },
  resetContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  resetButton: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  resetGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  resetButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SearchFilters;