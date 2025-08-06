import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  StyleSheet,
  FlatList,
  Platform,
  Keyboard,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeTheme } from '../common/ThemeFallbackWrapper';
import { ANIMATION_CONFIG } from '../../constants/animations';

interface SearchSuggestion {
  id: string;
  text: string;
  icon?: string;
  type?: 'recent' | 'suggestion' | 'filter';
}

interface EnhancedSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  suggestions?: SearchSuggestion[];
  onSuggestionPress?: (suggestion: SearchSuggestion) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  showSuggestions?: boolean;
}

const EnhancedSearchBar: React.FC<EnhancedSearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search automations...',
  suggestions = [],
  onSuggestionPress,
  onFocus,
  onBlur,
  showSuggestions = true,
}) => {
  const theme = useSafeTheme();
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Animation values
  const borderColorAnim = useRef(new Animated.Value(0)).current;
  const iconScaleAnim = useRef(new Animated.Value(1)).current;
  const suggestionOpacityAnim = useRef(new Animated.Value(0)).current;
  const clearButtonRotateAnim = useRef(new Animated.Value(0)).current;
  const searchIconRotateAnim = useRef(new Animated.Value(0)).current;

  // Handle focus state changes
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    onFocus?.();

    // Animate border color and search icon
    Animated.parallel([
      Animated.timing(borderColorAnim, {
        toValue: 1,
        duration: ANIMATION_CONFIG.FOCUS_ANIMATION_DURATION,
        useNativeDriver: false,
      }),
      Animated.spring(iconScaleAnim, {
        toValue: 1.2,
        tension: ANIMATION_CONFIG.SPRING_TENSION,
        friction: ANIMATION_CONFIG.SPRING_FRICTION,
        useNativeDriver: true,
      }),
      Animated.timing(searchIconRotateAnim, {
        toValue: 1,
        duration: ANIMATION_CONFIG.FOCUS_ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start();

    // Show suggestions if available
    if (suggestions.length > 0 && showSuggestions) {
      Animated.timing(suggestionOpacityAnim, {
        toValue: 1,
        duration: ANIMATION_CONFIG.FADE_ANIMATION_DURATION,
        useNativeDriver: true,
      }).start();
    }
  }, [onFocus, suggestions.length, showSuggestions]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    onBlur?.();

    // Animate border color and search icon back
    Animated.parallel([
      Animated.timing(borderColorAnim, {
        toValue: 0,
        duration: ANIMATION_CONFIG.FOCUS_ANIMATION_DURATION,
        useNativeDriver: false,
      }),
      Animated.spring(iconScaleAnim, {
        toValue: 1,
        tension: ANIMATION_CONFIG.SPRING_TENSION,
        friction: ANIMATION_CONFIG.SPRING_FRICTION,
        useNativeDriver: true,
      }),
      Animated.timing(searchIconRotateAnim, {
        toValue: 0,
        duration: ANIMATION_CONFIG.FOCUS_ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start();

    // Hide suggestions after a delay
    setTimeout(() => {
      Animated.timing(suggestionOpacityAnim, {
        toValue: 0,
        duration: ANIMATION_CONFIG.FADE_ANIMATION_DURATION,
        useNativeDriver: true,
      }).start();
    }, 150);
  }, [onBlur]);

  // Handle clear button press
  const handleClear = useCallback(() => {
    // Rotate animation for clear button
    Animated.timing(clearButtonRotateAnim, {
      toValue: 1,
      duration: ANIMATION_CONFIG.MICRO_INTERACTION_DURATION,
      useNativeDriver: true,
    }).start(() => {
      clearButtonRotateAnim.setValue(0);
    });

    onChangeText('');
    inputRef.current?.focus();
  }, [onChangeText]);

  // Handle suggestion press
  const handleSuggestionPress = useCallback((suggestion: SearchSuggestion) => {
    onChangeText(suggestion.text);
    onSuggestionPress?.(suggestion);
    Keyboard.dismiss();
  }, [onChangeText, onSuggestionPress]);

  // Animated values
  const borderColor = borderColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      theme.colors?.border?.light || '#e0e0e0',
      theme.colors?.primary || '#2196F3'
    ],
  });

  const searchIconRotation = searchIconRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  const clearButtonRotation = clearButtonRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Filter suggestions based on input
  const filteredSuggestions = suggestions.filter(suggestion =>
    suggestion.text.toLowerCase().includes(value.toLowerCase())
  ).slice(0, 5);

  const showSuggestionsDropdown = isFocused && filteredSuggestions.length > 0 && showSuggestions && value.length > 0;

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.searchBar,
          {
            backgroundColor: theme.colors?.surface || '#fff',
            borderColor,
            borderWidth: 2,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.iconContainer,
            {
              transform: [
                { scale: iconScaleAnim },
                { rotate: searchIconRotation },
              ],
            },
          ]}
        >
          <MaterialCommunityIcons
            name="magnify"
            size={24}
            color={isFocused ? theme.colors?.primary || '#2196F3' : theme.colors?.textSecondary || '#666'}
          />
        </Animated.View>

        <TextInput
          ref={inputRef}
          style={[
            styles.searchInput,
            { color: theme.colors?.text || '#000' }
          ]}
          placeholder={placeholder}
          placeholderTextColor={theme.colors?.textSecondary || '#999'}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode={Platform.OS === 'ios' ? 'while-editing' : 'never'}
        />

        {Platform.OS === 'android' && value.length > 0 && (
          <Animated.View
            style={[
              styles.clearButton,
              {
                transform: [{ rotate: clearButtonRotation }],
              },
            ]}
          >
            <TouchableOpacity onPress={handleClear} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialCommunityIcons
                name="close-circle"
                size={20}
                color={theme.colors?.textSecondary || '#666'}
              />
            </TouchableOpacity>
          </Animated.View>
        )}
      </Animated.View>

      {/* Suggestions Dropdown */}
      {showSuggestionsDropdown && (
        <Animated.View
          style={[
            styles.suggestionsContainer,
            {
              backgroundColor: theme.colors?.surface || '#fff',
              opacity: suggestionOpacityAnim,
            },
          ]}
        >
          <FlatList
            data={filteredSuggestions}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={[
                  styles.suggestionItem,
                  index === filteredSuggestions.length - 1 && styles.lastSuggestionItem,
                ]}
                onPress={() => handleSuggestionPress(item)}
              >
                <MaterialCommunityIcons
                  name={(item.icon || 'clock-outline') as any}
                  size={16}
                  color={theme.colors?.textSecondary || '#666'}
                  style={styles.suggestionIcon}
                />
                <Text style={[styles.suggestionText, { color: theme.colors?.text || '#000' }]}>
                  {item.text}
                </Text>
                {item.type && (
                  <View style={[styles.suggestionBadge, { backgroundColor: theme.colors?.primaryLight || '#E3F2FD' }]}>
                    <Text style={[styles.suggestionBadgeText, { color: theme.colors?.primary || '#2196F3' }]}>
                      {item.type}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        </Animated.View>
      )}
    </View>
  );
};

export default EnhancedSearchBar;

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0, // Remove default padding on Android
  },
  clearButton: {
    marginLeft: 8,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderRadius: 12,
    marginTop: -12,
    paddingTop: 12,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1001,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  lastSuggestionItem: {
    borderBottomWidth: 0,
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
  },
  suggestionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  suggestionBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
});