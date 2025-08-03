import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import {
  Button,
  Chip,
  SegmentedButtons,
  Switch,
  Divider,
} from 'react-native-paper';
// Import removed - using simple selection instead of slider
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

export interface FilterOptions {
  category: string | null;
  sortBy: 'created_at' | 'title' | 'rating' | 'popularity' | 'updated_at';
  sortOrder: 'asc' | 'desc';
  minRating: number;
  isPublic: boolean | null;
  hasSteps: boolean | null;
  tags: string[];
  dateRange: 'all' | 'week' | 'month' | 'year';
}

interface AutomationFiltersProps {
  visible: boolean;
  filters: FilterOptions;
  categories: Array<{ id: string; name: string; icon: string; color: string }>;
  availableTags: string[];
  onFiltersChange: (filters: FilterOptions) => void;
  onClose: () => void;
  onReset: () => void;
}

const AutomationFilters: React.FC<AutomationFiltersProps> = ({
  visible,
  filters,
  categories,
  availableTags,
  onFiltersChange,
  onClose,
  onReset,
}) => {
  const [localFilters, setLocalFilters] = useState<FilterOptions>(filters);

  const updateFilter = <K extends keyof FilterOptions>(
    key: K,
    value: FilterOptions[K]
  ) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleTag = (tag: string) => {
    const newTags = localFilters.tags.includes(tag)
      ? localFilters.tags.filter(t => t !== tag)
      : [...localFilters.tags, tag];
    updateFilter('tags', newTags);
  };

  const applyFilters = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const resetFilters = () => {
    const defaultFilters: FilterOptions = {
      category: null,
      sortBy: 'created_at',
      sortOrder: 'desc',
      minRating: 0,
      isPublic: null,
      hasSteps: null,
      tags: [],
      dateRange: 'all',
    };
    setLocalFilters(defaultFilters);
    onReset();
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (localFilters.category) count++;
    if (localFilters.minRating > 0) count++;
    if (localFilters.isPublic !== null) count++;
    if (localFilters.hasSteps !== null) count++;
    if (localFilters.tags.length > 0) count++;
    if (localFilters.dateRange !== 'all') count++;
    return count;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Icon name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Filter & Sort</Text>
          <TouchableOpacity onPress={resetFilters} style={styles.headerButton}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Sort Options */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Sort By</Text>
            <SegmentedButtons
              value={localFilters.sortBy}
              onValueChange={(value) => updateFilter('sortBy', value as any)}
              buttons={[
                { value: 'created_at', label: 'Recent' },
                { value: 'title', label: 'Name' },
                { value: 'rating', label: 'Rating' },
                { value: 'popularity', label: 'Popular' },
              ]}
              style={styles.segmentedButtons}
            />
            
            <View style={styles.sortOrderSection}>
              <Text style={styles.subSectionTitle}>Order</Text>
              <SegmentedButtons
                value={localFilters.sortOrder}
                onValueChange={(value) => updateFilter('sortOrder', value as any)}
                buttons={[
                  { 
                    value: 'desc', 
                    label: localFilters.sortBy === 'title' ? 'Z-A' : 'High-Low',
                    icon: localFilters.sortBy === 'title' ? 'sort-alphabetical-descending' : 'sort-numeric-descending'
                  },
                  { 
                    value: 'asc', 
                    label: localFilters.sortBy === 'title' ? 'A-Z' : 'Low-High',
                    icon: localFilters.sortBy === 'title' ? 'sort-alphabetical-ascending' : 'sort-numeric-ascending'
                  },
                ]}
                style={styles.segmentedButtons}
              />
            </View>
          </View>

          <Divider style={styles.divider} />

          {/* Category Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📂 Categories</Text>
            <View style={styles.chipContainer}>
              <Chip
                selected={localFilters.category === null}
                onPress={() => updateFilter('category', null)}
                style={[styles.chip, localFilters.category === null && styles.selectedChip]}
                textStyle={localFilters.category === null ? styles.selectedChipText : undefined}
              >
                All Categories
              </Chip>
              {categories.map((category) => (
                <Chip
                  key={category.id}
                  selected={localFilters.category === category.id}
                  onPress={() => updateFilter('category', category.id)}
                  icon={category.icon}
                  style={[
                    styles.chip,
                    localFilters.category === category.id && {
                      backgroundColor: category.color + '20',
                      borderColor: category.color,
                    }
                  ]}
                  textStyle={localFilters.category === category.id ? 
                    { color: category.color, fontWeight: 'bold' } : undefined
                  }
                >
                  {category.name}
                </Chip>
              ))}
            </View>
          </View>

          <Divider style={styles.divider} />

          {/* Rating Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⭐ Minimum Rating</Text>
            <SegmentedButtons
              value={localFilters.minRating.toString()}
              onValueChange={(value) => updateFilter('minRating', parseFloat(value))}
              buttons={[
                { value: '0', label: 'All' },
                { value: '3', label: '3+ ⭐' },
                { value: '4', label: '4+ ⭐' },
                { value: '5', label: '5 ⭐' },
              ]}
              style={styles.segmentedButtons}
            />
          </View>

          <Divider style={styles.divider} />

          {/* Visibility Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👥 Visibility</Text>
            <SegmentedButtons
              value={localFilters.isPublic === null ? 'all' : localFilters.isPublic ? 'public' : 'private'}
              onValueChange={(value) => 
                updateFilter('isPublic', 
                  value === 'all' ? null : value === 'public'
                )
              }
              buttons={[
                { value: 'all', label: 'All', icon: 'eye-outline' },
                { value: 'public', label: 'Public', icon: 'earth' },
                { value: 'private', label: 'Private', icon: 'lock' },
              ]}
              style={styles.segmentedButtons}
            />
          </View>

          <Divider style={styles.divider} />

          {/* Date Range Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅 Date Range</Text>
            <SegmentedButtons
              value={localFilters.dateRange}
              onValueChange={(value) => updateFilter('dateRange', value as any)}
              buttons={[
                { value: 'all', label: 'All Time' },
                { value: 'week', label: 'This Week' },
                { value: 'month', label: 'This Month' },
                { value: 'year', label: 'This Year' },
              ]}
              style={styles.segmentedButtons}
            />
          </View>

          <Divider style={styles.divider} />

          {/* Tags Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏷️ Tags</Text>
            <Text style={styles.sectionDescription}>
              Select tags to filter automations
            </Text>
            <View style={styles.tagContainer}>
              {availableTags.map((tag) => (
                <Chip
                  key={tag}
                  selected={localFilters.tags.includes(tag)}
                  onPress={() => toggleTag(tag)}
                  style={[
                    styles.tagChip,
                    localFilters.tags.includes(tag) && styles.selectedTag
                  ]}
                  textStyle={localFilters.tags.includes(tag) ? styles.selectedTagText : undefined}
                >
                  {tag}
                </Chip>
              ))}
            </View>
          </View>

          {/* Advanced Options */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚙️ Advanced</Text>
            
            <View style={styles.switchOption}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Has Steps Only</Text>
                <Text style={styles.switchDescription}>
                  Show only automations with configured steps
                </Text>
              </View>
              <Switch
                value={localFilters.hasSteps === true}
                onValueChange={(value) => updateFilter('hasSteps', value ? true : null)}
                color="#6200ee"
              />
            </View>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Apply/Cancel Buttons */}
        <View style={styles.actionBar}>
          <View style={styles.filterInfo}>
            <Text style={styles.filterCount}>
              {getActiveFilterCount()} active filter{getActiveFilterCount() !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.actionButtons}>
            <Button
              mode="outlined"
              onPress={onClose}
              style={styles.cancelButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={applyFilters}
              style={styles.applyButton}
              buttonColor="#6200ee"
            >
              Apply Filters
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
  },
  headerButton: {
    padding: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  resetText: {
    fontSize: 16,
    color: '#6200ee',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  segmentedButtons: {
    marginBottom: 8,
  },
  sortOrderSection: {
    marginTop: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginRight: 0,
    marginBottom: 8,
  },
  selectedChip: {
    backgroundColor: '#6200ee20',
    borderColor: '#6200ee',
  },
  selectedChipText: {
    color: '#6200ee',
    fontWeight: 'bold',
  },
  ratingSection: {
    paddingHorizontal: 8,
  },
  ratingDisplay: {
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  ratingSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    marginRight: 0,
    marginBottom: 8,
  },
  selectedTag: {
    backgroundColor: '#03dac620',
    borderColor: '#03dac6',
  },
  selectedTagText: {
    color: '#03dac6',
    fontWeight: 'bold',
  },
  switchOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  switchInfo: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  bottomSpacer: {
    height: 80,
  },
  actionBar: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    elevation: 8,
  },
  filterInfo: {
    alignItems: 'center',
    marginBottom: 12,
  },
  filterCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  applyButton: {
    flex: 1,
  },
  divider: {
    marginVertical: 16,
    backgroundColor: '#e0e0e0',
  },
});

export { AutomationFilters };