import React, { ReactNode, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_MAX_HEIGHT = 250;
const HEADER_MIN_HEIGHT = 90;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

interface ParallaxScrollViewProps {
  children: ReactNode;
  backgroundComponent?: ReactNode;
  headerComponent?: ReactNode;
  onScroll?: (event: { nativeEvent: { contentOffset: { y: number } } }) => void;
  refreshControl?: ReactNode;
  showsVerticalScrollIndicator?: boolean;
  contentContainerStyle?: any;
  parallaxHeaderHeight?: number;
  renderBackground?: (offset: Animated.Value) => ReactNode;
  renderForeground?: (offset: Animated.Value) => ReactNode;
  renderStickyHeader?: (offset: Animated.Value) => ReactNode;
  backgroundColor?: string;
  stickyHeaderHeight?: number;
  fadeOutParallax?: boolean;
}

export const ParallaxScrollView: React.FC<ParallaxScrollViewProps> = React.memo(({
  children,
  backgroundComponent,
  headerComponent,
  onScroll,
  refreshControl,
  showsVerticalScrollIndicator = false,
  contentContainerStyle,
  parallaxHeaderHeight = HEADER_MAX_HEIGHT,
  renderBackground,
  renderForeground,
  renderStickyHeader,
  backgroundColor = 'transparent',
  stickyHeaderHeight = HEADER_MIN_HEIGHT,
  fadeOutParallax = true,
}) => {
  // Use useRef to prevent recreating Animated.Value on each render
  const scrollY = useRef(new Animated.Value(0)).current;

  // Memoize all interpolated values to prevent recreation
  const headerTranslate = useMemo(() => 
    scrollY.interpolate({
      inputRange: [0, HEADER_SCROLL_DISTANCE],
      outputRange: [0, -HEADER_SCROLL_DISTANCE],
      extrapolate: 'clamp',
    }), [scrollY]);

  const imageOpacity = useMemo(() => 
    fadeOutParallax
      ? scrollY.interpolate({
          inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
          outputRange: [1, 1, 0],
          extrapolate: 'clamp',
        })
      : 1, [fadeOutParallax, scrollY]);

  const imageTranslate = useMemo(() => 
    scrollY.interpolate({
      inputRange: [0, HEADER_SCROLL_DISTANCE],
      outputRange: [0, 100],
      extrapolate: 'extend',
    }), [scrollY]);

  const titleScale = useMemo(() => 
    scrollY.interpolate({
      inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
      outputRange: [1, 1, 0.8],
      extrapolate: 'clamp',
    }), [scrollY]);

  const titleTranslateY = useMemo(() => 
    scrollY.interpolate({
      inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
      outputRange: [0, 0, -8],
      extrapolate: 'clamp',
    }), [scrollY]);

  // Memoize sticky header animations BEFORE using them
  const stickyHeaderOpacity = useMemo(() => 
    scrollY.interpolate({
      inputRange: [0, HEADER_SCROLL_DISTANCE - 50, HEADER_SCROLL_DISTANCE],
      outputRange: [0, 0, 1],
      extrapolate: 'clamp',
    }), [scrollY]);
  
  const stickyHeaderTranslateY = useMemo(() => 
    scrollY.interpolate({
      inputRange: [0, HEADER_SCROLL_DISTANCE, HEADER_SCROLL_DISTANCE + 1],
      outputRange: [stickyHeaderHeight, 0, 0],
      extrapolate: 'clamp',
    }), [scrollY, stickyHeaderHeight]);

  // Memoize scroll handler to prevent recreation
  const handleScroll = useMemo(() => 
    Animated.event(
      [{ nativeEvent: { contentOffset: { y: scrollY } } }],
      {
        useNativeDriver: true,
        listener: (event: { nativeEvent: { contentOffset: { y: number } } }) => {
          // Prevent potential recursion from onScroll handler
          if (onScroll && typeof onScroll === 'function') {
            try {
              // Use setTimeout to break potential recursion chain
              setTimeout(() => {
                onScroll(event);
              }, 0);
            } catch (error) {
              console.warn('ParallaxScrollView: onScroll handler error:', error);
            }
          }
        },
      }
    ), [scrollY, onScroll]);

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Animated.ScrollView
        style={styles.container}
        onScroll={handleScroll}
        scrollEventThrottle={1}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        refreshControl={refreshControl}
        contentContainerStyle={[
          { paddingTop: parallaxHeaderHeight },
          contentContainerStyle,
        ]}
      >
        {children}
      </Animated.ScrollView>

      {/* Parallax Header Background */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.header,
          {
            height: parallaxHeaderHeight,
            transform: [{ translateY: headerTranslate }],
          },
        ]}
      >
        {renderBackground ? (
          renderBackground(scrollY)
        ) : backgroundComponent ? (
          <Animated.View
            style={[
              styles.backgroundImageContainer,
              {
                opacity: imageOpacity,
                transform: [{ translateY: imageTranslate }],
              },
            ]}
          >
            {backgroundComponent}
          </Animated.View>
        ) : (
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.defaultBackground}
          />
        )}

        {/* Foreground Content */}
        {renderForeground && (
          <Animated.View
            style={[
              styles.foreground,
              {
                transform: [
                  { scale: titleScale },
                  { translateY: titleTranslateY },
                ],
              },
            ]}
          >
            {renderForeground(scrollY)}
          </Animated.View>
        )}
      </Animated.View>

      {/* Sticky Header */}
      {renderStickyHeader && (
        <Animated.View
          style={[
            styles.stickyHeader,
            {
              height: stickyHeaderHeight,
              opacity: stickyHeaderOpacity,
              transform: [
                {
                  translateY: stickyHeaderTranslateY,
                },
              ],
            },
          ]}
        >
          {Platform.OS === 'ios' ? (
            <BlurView
              intensity={80}
              tint="systemMaterial"
              style={StyleSheet.absoluteFillObject}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFillObject,
                { backgroundColor: 'rgba(255, 255, 255, 0.95)' },
              ]}
            />
          )}
          {renderStickyHeader(scrollY)}
        </Animated.View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  backgroundImageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  defaultBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  foreground: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 30,
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
});