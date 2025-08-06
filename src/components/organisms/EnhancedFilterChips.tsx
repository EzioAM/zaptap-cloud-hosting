import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeTheme } from '../common/ThemeFallbackWrapper';
import { ANIMATION_CONFIG } from '../../constants/animations';

interface FilterOption {
  id: string;
  label: string;
  value: string;
  icon?: string;
  count?: number;
}

interface EnhancedFilterChipsProps {
  filters: FilterOption[];
  selectedFilter: string;
  onFilterSelect: (value: string) => void;
  onClearAll?: () => void;
  showClearAll?: boolean;
}

const EnhancedFilterChips: React.FC<EnhancedFilterChipsProps> = ({
  filters,
  selectedFilter,
  onFilterSelect,
  onClearAll,
  showClearAll = true,
}) => {
  const theme = useSafeTheme();

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filters.map((filter) => (
          <FilterChip
            key={filter.id}
            filter={filter}
            isSelected={selectedFilter === filter.value}
            onPress={() => onFilterSelect(filter.value)}
            theme={theme}
          />
        ))}
        
        {showClearAll && selectedFilter !== filters[0]?.value && (
          <ClearAllChip onPress={onClearAll} theme={theme} />
        )}
      </ScrollView>
    </View>
  );
};

interface FilterChipProps {
  filter: FilterOption;
  isSelected: boolean;
  onPress: () => void;
  theme: any;
}

const FilterChip: React.FC<FilterChipProps> = ({
  filter,
  isSelected,
  onPress,
  theme,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const badgeAnim = useRef(new Animated.Value(isSelected ? 1 : 0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Update animations when selection changes
  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(badgeAnim, {
        toValue: isSelected ? 1 : 0,
        tension: ANIMATION_CONFIG.SPRING_TENSION,
        friction: ANIMATION_CONFIG.SPRING_FRICTION,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: isSelected ? 1 : 0,
        duration: ANIMATION_CONFIG.FOCUS_ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isSelected]);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: ANIMATION_CONFIG.MICRO_INTERACTION_SCALE,
      tension: ANIMATION_CONFIG.SPRING_TENSION,
      friction: ANIMATION_CONFIG.SPRING_FRICTION,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: ANIMATION_CONFIG.SPRING_TENSION,
      friction: ANIMATION_CONFIG.SPRING_FRICTION,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePress = useCallback(() => {
    // Quick scale animation for feedback
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1.1,
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

    onPress();
  }, [onPress]);

  const chipBackgroundColor = isSelected
    ? theme.colors?.primary || '#2196F3'
    : theme.colors?.surface || '#fff';

  const textColor = isSelected
    ? 'white'
    : theme.colors?.text || '#000';

  const badgeScale = badgeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.3],
  });

  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.8}
    >
      <Animated.View
        style={[
          styles.filterChip,
          {
            backgroundColor: chipBackgroundColor,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Glow effect for selected state */}
        {isSelected && (
          <Animated.View
            style={[
              styles.glowEffect,
              {
                backgroundColor: theme.colors?.primary || '#2196F3',
                opacity: glowOpacity,
              },
            ]}
          />
        )}

        <View style={styles.chipContent}>
          {filter.icon && (
            <MaterialCommunityIcons
              name={filter.icon as any}
              size={16}
              color={textColor}
              style={styles.chipIcon}
            />
          )}
          
          <Text style={[styles.filterChipText, { color: textColor }]}>
            {filter.label}
          </Text>
          
          {filter.count !== undefined && (
            <Animated.View
              style={[
                styles.countBadge,
                {
                  backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.2)' : theme.colors?.primaryLight || '#E3F2FD',
                  transform: [{ scale: badgeScale }],
                },
              ]}
            >
              <Text
                style={[
                  styles.countBadgeText,
                  {
                    color: isSelected ? 'white' : theme.colors?.primary || '#2196F3',
                  },
                ]}
              >
                {filter.count}
              </Text>
            </Animated.View>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

interface ClearAllChipProps {
  onPress?: () => void;
  theme: any;
}

const ClearAllChip: React.FC<ClearAllChipProps> = ({ onPress, theme }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: ANIMATION_CONFIG.MICRO_INTERACTION_SCALE,
      tension: ANIMATION_CONFIG.SPRING_TENSION,
      friction: ANIMATION_CONFIG.SPRING_FRICTION,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: ANIMATION_CONFIG.SPRING_TENSION,
      friction: ANIMATION_CONFIG.SPRING_FRICTION,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePress = useCallback(() => {
    // Rotate animation for clear action
    Animated.timing(rotateAnim, {
      toValue: 1,
      duration: ANIMATION_CONFIG.MICRO_INTERACTION_DURATION * 2,
      useNativeDriver: true,
    }).start(() => {
      rotateAnim.setValue(0);
    });

    onPress?.();
  }, [onPress]);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.clearAllContainer}
    >
      <Animated.View
        style={[
          styles.clearAllChip,
          {
            backgroundColor: theme.colors?.semantic?.error || '#ff4444',
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Animated.View
          style={{
            transform: [{ rotate: rotateInterpolate }],
          }}
        >
          <MaterialCommunityIcons
            name="close-circle"
            size={16}
            color="white"
          />
        </Animated.View>
        <Text style={styles.clearAllText}>Clear</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default EnhancedFilterChips;

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  scrollContent: {
    paddingHorizontal: 4,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  glowEffect: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 22,
    zIndex: -1,
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipIcon: {
    marginRight: 4,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  countBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  clearAllContainer: {
    marginLeft: 8,
  },
  clearAllChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  clearAllText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
});