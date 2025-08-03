import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  ViewStyle,
} from 'react-native';

interface LoadingSkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
  shimmerSpeed?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
  shimmerSpeed = 1000,
}) => {
  const shimmerAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnimation, {
          toValue: 1,
          duration: shimmerSpeed,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnimation, {
          toValue: 0,
          duration: shimmerSpeed,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [shimmerAnimation, shimmerSpeed]);

  const opacity = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

// Preset skeleton components for common use cases
export const SkeletonCard: React.FC<{ style?: ViewStyle }> = ({ style }) => (
  <View style={[styles.card, style]}>
    <View style={styles.cardHeader}>
      <LoadingSkeleton width={40} height={40} borderRadius={20} />
      <View style={styles.cardHeaderText}>
        <LoadingSkeleton width={150} height={16} />
        <LoadingSkeleton width={100} height={12} style={{ marginTop: 4 }} />
      </View>
    </View>
    <LoadingSkeleton height={60} style={{ marginTop: 12 }} />
    <View style={styles.cardFooter}>
      <LoadingSkeleton width={60} height={24} />
      <LoadingSkeleton width={80} height={24} />
    </View>
  </View>
);

export const SkeletonList: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <View>
    {Array.from({ length: count }).map((_, index) => (
      <SkeletonCard key={index} style={{ marginBottom: 16 }} />
    ))}
  </View>
);

export const SkeletonText: React.FC<{ lines?: number; style?: ViewStyle }> = ({ 
  lines = 3, 
  style 
}) => (
  <View style={style}>
    {Array.from({ length: lines }).map((_, index) => (
      <LoadingSkeleton
        key={index}
        width={index === lines - 1 ? '70%' : '100%'}
        height={14}
        style={{ marginBottom: 8 }}
      />
    ))}
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E0E0E0',
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
});