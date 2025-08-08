import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Category {
  id: string;
  name: string;
  icon: string;
  gradient?: string[];
  count?: number;
}

interface SafeCategoryChipsProps {
  categories: Category[];
  selectedCategory: string;
  onCategorySelect: (categoryId: string) => void;
  showCounts?: boolean;
  theme?: any;
}

export const SafeCategoryChips: React.FC<SafeCategoryChipsProps> = ({
  categories,
  selectedCategory,
  onCategorySelect,
  showCounts = false,
  theme
}) => {
  // Keep animations simple and separate native from JS
  const scaleAnims = useRef<Map<string, Animated.Value>>(new Map());

  useEffect(() => {
    categories.forEach((category) => {
      if (!scaleAnims.current.has(category.id)) {
        scaleAnims.current.set(category.id, new Animated.Value(1));
      }
    });
  }, [categories]);

  const handlePress = (categoryId: string) => {
    const scaleValue = scaleAnims.current.get(categoryId);
    
    if (scaleValue) {
      // Simple bounce animation using only native driver
      Animated.sequence([
        Animated.timing(scaleValue, {
          toValue: 0.95,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }

    if (typeof onCategorySelect === 'function') {
      onCategorySelect(categoryId);
    }
  };

  const getGradientColors = (category: Category, isSelected: boolean) => {
    if (!isSelected) {
      return ['transparent', 'transparent'];
    }
    
    // Always ensure valid gradient colors
    if (category.gradient && category.gradient.length >= 2) {
      return category.gradient;
    }
    
    // Fallback gradients
    const fallbackGradients: Record<string, string[]> = {
      'all': ['#667eea', '#764ba2'],
      'popular': ['#ff9a9e', '#fecfef'],
      'new': ['#a8edea', '#fed6e3'],
      'productivity': ['#f093fb', '#f5576c'],
      'smart-home': ['#4facfe', '#00f2fe'],
      'health': ['#43e97b', '#38f9d7'],
      'finance': ['#fa709a', '#fee140'],
      'social': ['#a8edea', '#fed6e3'],
      'entertainment': ['#ff9a9e', '#fecfef'],
      'travel': ['#ffecd2', '#fcb69f'],
    };
    
    return fallbackGradients[category.id] || ['#667eea', '#764ba2'];
  };

  const textColor = theme?.colors?.text?.primary || '#000';
  const surfaceColor = theme?.colors?.surface?.primary || '#F5F5F5';
  const primaryColor = theme?.colors?.brand?.primary || '#667eea';

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {categories.map((category) => {
        const isSelected = selectedCategory === category.id;
        const scaleValue = scaleAnims.current.get(category.id) || new Animated.Value(1);
        const gradientColors = getGradientColors(category, isSelected);

        return (
          <Animated.View
            key={category.id}
            style={[
              styles.chipContainer,
              { transform: [{ scale: scaleValue }] }
            ]}
          >
            <TouchableOpacity
              style={styles.chip}
              onPress={() => handlePress(category.id)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={gradientColors}
                style={[
                  styles.chipContent,
                  !isSelected && [styles.unselectedChip, { backgroundColor: surfaceColor }]
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <MaterialCommunityIcons
                  name={category.icon as any}
                  size={18}
                  color={isSelected ? 'white' : textColor}
                />
                <Text style={[
                  styles.chipText,
                  { color: isSelected ? 'white' : textColor }
                ]}>
                  {category.name}
                </Text>
                {showCounts && category.count !== undefined && (
                  <View style={[
                    styles.countBadge,
                    { backgroundColor: isSelected ? 'rgba(255,255,255,0.3)' : `${primaryColor}20` }
                  ]}>
                    <Text style={[
                      styles.countText,
                      { color: isSelected ? 'white' : primaryColor }
                    ]}>
                      {category.count}
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  chipContainer: {
    marginRight: 10,
  },
  chip: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  unselectedChip: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  countText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
});

export default SafeCategoryChips;