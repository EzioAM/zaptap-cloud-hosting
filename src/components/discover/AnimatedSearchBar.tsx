import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Animated,
  FlatList,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeTheme } from '../common/ThemeFallbackWrapper';

interface SearchSuggestion {
  id: string;
  text: string;
  icon?: string;
  type: 'recent' | 'trending' | 'category' | 'suggestion';
}

interface AnimatedSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  suggestions?: SearchSuggestion[];
  onSuggestionPress?: (suggestion: SearchSuggestion) => void;
  showSuggestions?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const AnimatedSearchBar: React.FC<AnimatedSearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search automations...',
  suggestions = [],
  onSuggestionPress,
  showSuggestions = false,
  onFocus,
  onBlur,
}) => {
  const theme = useSafeTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestionList, setShowSuggestionList] = useState(false);

  // Animation refs
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const suggestionHeightAnim = useRef(new Animated.Value(0)).current;
  const suggestionOpacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Focus/blur animations
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: isFocused ? 1.02 : 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: isFocused ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Glow pulse animation when focused
    if (isFocused) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    }
  }, [isFocused]);

  useEffect(() => {
    // Suggestions animation
    const shouldShow = showSuggestions && showSuggestionList && suggestions.length > 0;
    
    Animated.parallel([
      Animated.timing(suggestionHeightAnim, {
        toValue: shouldShow ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(suggestionOpacityAnim, {
        toValue: shouldShow ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [showSuggestions, showSuggestionList, suggestions.length]);

  const handleFocus = () => {
    setIsFocused(true);
    setShowSuggestionList(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Delay hiding suggestions to allow for tap
    setTimeout(() => setShowSuggestionList(false), 200);
    onBlur?.();
  };

  const handleSuggestionPress = (suggestion: SearchSuggestion) => {
    onChangeText(suggestion.text);
    setShowSuggestionList(false);
    onSuggestionPress?.(suggestion);
  };

  const clearSearch = () => {
    onChangeText('');
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.3],
  });

  const suggestionMaxHeight = suggestionHeightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200],
  });

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'recent':
        return 'clock-outline';
      case 'trending':
        return 'trending-up';
      case 'category':
        return 'tag-outline';
      default:
        return 'magnify';
    }
  };

  const getSuggestionTypeColor = (type: string) => {
    switch (type) {
      case 'recent':
        return '#9CA3AF';
      case 'trending':
        return '#FF6B6B';
      case 'category':
        return theme.colors?.brand?.primary || '#6366F1';
      default:
        return theme.colors?.text?.secondary || '#6B7280';
    }
  };

  const renderSuggestion = ({ item, index }: { item: SearchSuggestion; index: number }) => {
    const slideAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 200,
        delay: index * 50,
        useNativeDriver: true,
      }).start();
    }, []);

    const translateX = slideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [30, 0],
    });

    return (
      <Animated.View
        style={[
          styles.suggestionItem,
          {
            transform: [{ translateX }],
            opacity: slideAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.suggestionButton}
          onPress={() => handleSuggestionPress(item)}
        >
          <MaterialCommunityIcons
            name={item.icon || getSuggestionIcon(item.type)}
            size={18}
            color={getSuggestionTypeColor(item.type)}
            style={styles.suggestionIcon}
          />
          <Text
            style={[
              styles.suggestionText,
              { color: theme.colors?.text?.primary || '#1F2937' },
            ]}
          >
            {item.text}
          </Text>
          <View
            style={[
              styles.suggestionTypeBadge,
              { backgroundColor: getSuggestionTypeColor(item.type) + '20' },
            ]}
          >
            <Text
              style={[
                styles.suggestionTypeText,
                { color: getSuggestionTypeColor(item.type) },
              ]}
            >
              {item.type}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.searchContainer,
          {
            transform: [{ scale: scaleAnim }, { scale: pulseAnim }],
          },
        ]}
      >
        {/* Glow effect */}
        <Animated.View
          style={[
            styles.glowContainer,
            {
              opacity: glowOpacity,
            },
          ]}
        />

        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: theme.colors?.surface?.primary || theme.colors?.surface || '#FFFFFF',
              borderColor: isFocused
                ? theme.colors?.brand?.primary || '#6366F1'
                : theme.colors?.border?.light || '#E5E7EB',
            },
          ]}
        >
          <MaterialCommunityIcons
            name="magnify"
            size={24}
            color={
              isFocused
                ? theme.colors?.brand?.primary || '#6366F1'
                : theme.colors?.text?.secondary || '#9CA3AF'
            }
          />

          <TextInput
            style={[
              styles.searchInput,
              { color: theme.colors?.text?.primary || '#1F2937' },
            ]}
            placeholder={placeholder}
            placeholderTextColor={theme.colors?.text?.secondary || '#9CA3AF'}
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            returnKeyType="search"
            selectionColor={theme.colors?.brand?.primary || '#6366F1'}
          />

          {value.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
              <MaterialCommunityIcons
                name="close-circle"
                size={20}
                color={theme.colors?.text?.secondary || '#9CA3AF'}
              />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Suggestions List */}
      <Animated.View
        style={[
          styles.suggestionsContainer,
          {
            height: suggestionMaxHeight,
            opacity: suggestionOpacityAnim,
            backgroundColor: theme.colors?.surface?.primary || theme.colors?.surface || '#FFFFFF',
            overflow: 'hidden',
          },
        ]}
      >
        <FlatList
          data={suggestions}
          renderItem={renderSuggestion}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  searchContainer: {
    position: 'relative',
  },
  glowContainer: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    zIndex: -1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
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
    fontSize: 16,
    marginLeft: 12,
    marginRight: 8,
  },
  clearButton: {
    padding: 4,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  suggestionItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  suggestionTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  suggestionTypeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});

export default AnimatedSearchBar;