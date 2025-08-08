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
import { useSafeTheme } from '../common/ThemeFallbackWrapper';

interface Category {
  id: string;
  name: string;
  icon: string;
  gradient?: string[];
  count?: number;
}

interface AnimatedCategoryChipsProps {
  categories: Category[];
  selectedCategory: string;
  onCategorySelect?: (categoryId: string) => void; // Made optional to match default
  showCounts?: boolean;
}

export const AnimatedCategoryChips: React.FC<AnimatedCategoryChipsProps> = ({
  categories,
  selectedCategory,
  onCategorySelect = () => {}, // Default empty function to prevent errors
  showCounts = false,
}) => {
  const theme = useSafeTheme();
  const animRefs = useRef<Map<string, Animated.Value>>(new Map());
  const glowRefs = useRef<Map<string, Animated.Value>>(new Map());
  const bounceRefs = useRef<Map<string, Animated.Value>>(new Map());
  const iconRefs = useRef<Map<string, Animated.Value>>(new Map());

  // Initialize animations for each category
  useEffect(() => {
    categories.forEach((category) => {
      if (!animRefs.current.has(category.id)) {
        animRefs.current.set(category.id, new Animated.Value(0));
        glowRefs.current.set(category.id, new Animated.Value(0));
        bounceRefs.current.set(category.id, new Animated.Value(1));
        iconRefs.current.set(category.id, new Animated.Value(0));
      }
    });
  }, [categories]);

  // Animate glow effect for selected category
  useEffect(() => {
    categories.forEach((category) => {
      const isSelected = selectedCategory === category.id;
      const animValue = animRefs.current.get(category.id);
      const glowValue = glowRefs.current.get(category.id);
      const iconValue = iconRefs.current.get(category.id);

      if (animValue && glowValue && iconValue) {
        Animated.parallel([
          Animated.timing(animValue, {
            toValue: isSelected ? 1 : 0,
            duration: 300,
            useNativeDriver: false,  // Changed to false since we're animating colors
          }),
          Animated.loop(
            Animated.sequence([
              Animated.timing(glowValue, {
                toValue: isSelected ? 1 : 0,
                duration: 1000,
                useNativeDriver: false,  // Changed to false for consistency
              }),
              Animated.timing(glowValue, {
                toValue: isSelected ? 0.3 : 0,
                duration: 1000,
                useNativeDriver: false,  // Changed to false for consistency
              }),
            ]),
            { iterations: isSelected ? -1 : 0 }
          ),
          Animated.timing(iconValue, {
            toValue: isSelected ? 1 : 0,
            duration: 200,
            useNativeDriver: true,  // Keep true for transform animations
          }),
        ]).start();
      }
    });
  }, [selectedCategory, categories]);

  const handleCategoryPress = (categoryId: string) => {
    const bounceValue = bounceRefs.current.get(categoryId);
    
    if (bounceValue) {
      Animated.sequence([
        Animated.timing(bounceValue, {
          toValue: 1.2,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(bounceValue, {
          toValue: 1,
          tension: 300,
          friction: 4,
          useNativeDriver: true,
        }),
      ]).start();
    }

    // Safety check to prevent "onCategorySelect is not a function" errors
    if (typeof onCategorySelect === 'function') {
      onCategorySelect(categoryId);
    } else {
      console.warn('AnimatedCategoryChips: onCategorySelect prop is not a function');
    }
  };

  const getCategoryGradient = (category: Category, isSelected: boolean) => {
    if (category.gradient) {
      return category.gradient;
    }

    const gradients: Record<string, string[]> = {
      'all': ['#667eea', '#764ba2'],
      'productivity': ['#f093fb', '#f5576c'],
      'smart-home': ['#4facfe', '#00f2fe'],
      'health': ['#43e97b', '#38f9d7'],
      'finance': ['#fa709a', '#fee140'],
      'social': ['#a8edea', '#fed6e3'],
      'entertainment': ['#ff9a9e', '#fecfef'],
      'travel': ['#ffecd2', '#fcb69f'],
    };

    return gradients[category.id] || ['#667eea', '#764ba2'];
  };

  const renderCategoryChip = (category: Category) => {
    const isSelected = selectedCategory === category.id;
    const animValue = animRefs.current.get(category.id) || new Animated.Value(0);
    const glowValue = glowRefs.current.get(category.id) || new Animated.Value(0);
    const bounceValue = bounceRefs.current.get(category.id) || new Animated.Value(1);
    const iconValue = iconRefs.current.get(category.id) || new Animated.Value(0);

    const chipOpacity = animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.7, 1],
    });

    const chipScale = animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.05],
    });

    const glowOpacity = glowValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.8],
    });

    const iconRotate = iconValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    const gradient = getCategoryGradient(category, isSelected);

    return (
      <Animated.View
        key={category.id}
        style={[
          styles.chipContainer,
          {
            transform: [
              { scale: bounceValue },
              { scale: chipScale },
            ],
            opacity: chipOpacity,
          },
        ]}
      >
        {/* Glow Effect */}
        <Animated.View
          style={[
            styles.glowContainer,
            {
              opacity: glowOpacity,
            },
          ]}
        >
          <LinearGradient
            colors={[
              `${(gradient?.[0] || '#667eea')}40`,
              `${(gradient?.[1] || '#764ba2')}40`
            ]}
            style={styles.glow}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>

        <TouchableOpacity
          style={styles.chip}
          onPress={() => handleCategoryPress(category.id)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={isSelected && gradient ? gradient : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
            style={styles.chipBackground}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Animated.View
              style={[
                styles.iconContainer,
                {
                  transform: [{ rotate: iconRotate }],
                },
              ]}
            >
              <MaterialCommunityIcons
                name={category.icon as any}
                size={20}
                color={isSelected ? 'white' : (theme.colors?.text?.primary || '#000')}
              />
            </Animated.View>
            
            <Text
              style={[
                styles.chipText,
                {
                  color: isSelected
                    ? 'white'
                    : (theme.colors?.text?.primary || '#000'),
                },
              ]}
            >
              {category.name}
            </Text>

            {showCounts && category.count !== undefined && (
              <View
                style={[
                  styles.countBadge,
                  {
                    backgroundColor: isSelected
                      ? 'rgba(255,255,255,0.3)'
                      : (theme.colors?.brand?.primary || '#667eea') + '20',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.countText,
                    {
                      color: isSelected
                        ? 'white'
                        : (theme.colors?.brand?.primary || '#667eea'),
                    },
                  ]}
                >
                  {category.count}
                </Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={styles.scrollView}
    >
      {categories.map(renderCategoryChip)}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    paddingVertical: 5,
  },
  container: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  chipContainer: {
    marginRight: 12,
    position: 'relative',
  },
  glowContainer: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 28,
    zIndex: 0,
  },
  glow: {
    flex: 1,
    borderRadius: 28,
  },
  chip: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 1,
  },
  chipBackground: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 40,
  },
  iconContainer: {
    marginRight: 8,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  countBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default AnimatedCategoryChips;