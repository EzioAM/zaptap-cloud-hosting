/**
 * SearchBar component with glass morphism design and animated interactions
 * 
 * Features:
 * - Debounced search input (300ms delay)
 * - Recent searches dropdown
 * - Search suggestions
 * - Glass morphism styling with purple theme
 * - Smooth animations and transitions
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  FlatList,
  Text,
  Platform,
  Keyboard,
  KeyboardEvent,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getExtendedColors, getGlassStyle } from '../../theme/colors';
import { useLazyGetSearchSuggestionsQuery } from '../../store/api/searchApi';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: (query: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  showRecentSearches?: boolean;
  recentSearches?: string[];
  onRecentSearchPress?: (query: string) => void;
  onClearRecentSearches?: () => void;
  style?: any;
  theme?: 'light' | 'dark';
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  onSubmit,
  placeholder = 'Search automations...',
  autoFocus = false,
  showRecentSearches = true,
  recentSearches = [],
  onRecentSearchPress,
  onClearRecentSearches,
  style,
  theme = 'light',
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  const inputRef = useRef<TextInput>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Animated values
  const focusAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const suggestionsAnimation = useRef(new Animated.Value(0)).current;
  
  const colors = getExtendedColors(theme);
  const insets = useSafeAreaInsets();
  
  // Get search suggestions
  const [getSuggestions, { data: suggestions = [], isLoading: loadingSuggestions }] = 
    useLazyGetSearchSuggestionsQuery();

  // Handle keyboard events
  useEffect(() => {
    const keyboardWillShow = (event: KeyboardEvent) => {
      setKeyboardHeight(event.endCoordinates.height);
    };

    const keyboardWillHide = () => {
      setKeyboardHeight(0);
    };

    const showListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      keyboardWillShow
    );
    const hideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      keyboardWillHide
    );

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  // Debounced search suggestions
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.trim().length >= 2 && isFocused) {
      searchTimeoutRef.current = setTimeout(() => {
        getSuggestions(value.trim());
      }, 300);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [value, isFocused, getSuggestions]);

  // Handle focus animations
  const handleFocus = () => {
    setIsFocused(true);
    setShowSuggestions(true);
    
    Animated.parallel([
      Animated.timing(focusAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(suggestionsAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    
    // Delay hiding suggestions to allow for selection
    setTimeout(() => {
      setShowSuggestions(false);
      Animated.parallel([
        Animated.timing(focusAnimation, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(suggestionsAnimation, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }, 150);
  };

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit(value.trim());
      inputRef.current?.blur();
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    onChangeText(suggestion);
    onSubmit(suggestion);
    inputRef.current?.blur();
  };

  const handleClearInput = () => {
    onChangeText('');
    inputRef.current?.focus();
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnimation, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnimation, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  // Render suggestion item
  const renderSuggestionItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSuggestionPress(item)}
      activeOpacity={0.7}
    >
      <Ionicons 
        name="search" 
        size={16} 
        color={colors.text.secondary} 
        style={styles.suggestionIcon}
      />
      <Text style={[styles.suggestionText, { color: colors.text.primary }]}>
        {item}
      </Text>
    </TouchableOpacity>
  );

  // Render recent search item
  const renderRecentItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.recentItem}
      onPress={() => onRecentSearchPress?.(item)}
      activeOpacity={0.7}
    >
      <Ionicons 
        name="time" 
        size={16} 
        color={colors.text.tertiary} 
        style={styles.recentIcon}
      />
      <Text style={[styles.recentText, { color: colors.text.secondary }]}>
        {item}
      </Text>
    </TouchableOpacity>
  );

  const glassStyle = getGlassStyle('medium', theme === 'dark');
  const animatedBorderColor = focusAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border.medium, colors.brand.primary],
  });

  const suggestionsMaxHeight = keyboardHeight > 0 
    ? SCREEN_WIDTH * 0.6 
    : SCREEN_WIDTH * 0.8;

  return (
    <View style={[styles.container, style]}>
      <Animated.View 
        style={[
          styles.searchContainer,
          {
            transform: [{ scale: scaleAnimation }],
            borderColor: animatedBorderColor,
          }
        ]}
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={80} tint={theme} style={styles.blurContainer}>
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.1)', 'rgba(124, 58, 237, 0.05)']}
              style={styles.gradient}
            />
          </BlurView>
        ) : (
          <View style={[styles.androidGlass, glassStyle]} />
        )}
        
        <TouchableOpacity
          style={styles.searchIconContainer}
          onPress={handleSubmit}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <LinearGradient
            colors={['#8B5CF6', '#7C3AED']}
            style={styles.searchIconGradient}
          >
            <Ionicons name="search" size={20} color="white" />
          </LinearGradient>
        </TouchableOpacity>

        <TextInput
          ref={inputRef}
          style={[styles.textInput, { color: colors.text.primary }]}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={handleSubmit}
          placeholder={placeholder}
          placeholderTextColor={colors.text.tertiary}
          autoFocus={autoFocus}
          returnKeyType="search"
          clearButtonMode="never"
          selectionColor={colors.brand.primary}
        />

        {value.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearInput}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={[styles.clearButtonBackground, { backgroundColor: colors.text.tertiary }]}>
              <Ionicons name="close" size={12} color={colors.background.primary} />
            </View>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Suggestions Dropdown */}
      {showSuggestions && (isFocused || suggestions.length > 0 || recentSearches.length > 0) && (
        <Animated.View
          style={[
            styles.suggestionsContainer,
            {
              opacity: suggestionsAnimation,
              transform: [{
                translateY: suggestionsAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-10, 0],
                }),
              }],
              maxHeight: suggestionsMaxHeight,
            }
          ]}
        >
          {Platform.OS === 'ios' ? (
            <BlurView intensity={100} tint={theme} style={styles.suggestionsBlur}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
                style={StyleSheet.absoluteFillObject}
              />
            </BlurView>
          ) : (
            <View style={[StyleSheet.absoluteFillObject, glassStyle]} />
          )}

          <FlatList
            data={suggestions.length > 0 ? suggestions : recentSearches}
            renderItem={suggestions.length > 0 ? renderSuggestionItem : renderRecentItem}
            keyExtractor={(item, index) => `${item}-${index}`}
            style={styles.suggestionsList}
            contentContainerStyle={styles.suggestionsContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              suggestions.length === 0 && recentSearches.length > 0 && showRecentSearches ? (
                <View style={styles.suggestionsHeader}>
                  <Text style={[styles.suggestionsHeaderText, { color: colors.text.secondary }]}>
                    Recent Searches
                  </Text>
                  {onClearRecentSearches && (
                    <TouchableOpacity onPress={onClearRecentSearches}>
                      <Text style={[styles.clearAllText, { color: colors.brand.primary }]}>
                        Clear All
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : null
            }
          />
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  searchContainer: {
    height: 56,
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    elevation: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  blurContainer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
  },
  androidGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  searchIconContainer: {
    marginLeft: 8,
    marginRight: 12,
  },
  searchIconGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    paddingVertical: 0,
  },
  clearButton: {
    marginRight: 12,
    padding: 4,
  },
  clearButtonBackground: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 64,
    left: 0,
    right: 0,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  suggestionsBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  suggestionsList: {
    maxHeight: 300,
  },
  suggestionsContent: {
    paddingVertical: 8,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  suggestionsHeaderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionText: {
    fontSize: 16,
    fontWeight: '400',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  recentIcon: {
    marginRight: 12,
  },
  recentText: {
    fontSize: 16,
    fontWeight: '400',
  },
});

export default SearchBar;