import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeTheme } from '../../common/ThemeFallbackWrapper';

export interface ShimmerProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
  duration?: number;
  children?: React.ReactNode;
}

export const Shimmer: React.FC<ShimmerProps> = ({
  width = '100%',
  height = 20,
  borderRadius,
  style,
  duration = 1500,
  children,
}) => {
  const theme = useSafeTheme();
  const translateX = useSharedValue(-1);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(1, { duration }),
      -1,
      false
    );
  }, [duration]);

  const animatedStyle = useAnimatedStyle(() => {
    const translateXValue = interpolate(
      translateX.value,
      [-1, 1],
      [-200, 200]
    );

    return {
      transform: [{ translateX: translateXValue }],
    };
  });

  const shimmerColors = theme.mode === 'dark'
    ? ['#2a2a2a', '#3a3a3a', '#2a2a2a']
    : ['#E8E8E8', '#F5F5F5', '#E8E8E8'];

  const baseStyle: ViewStyle = {
    width,
    height,
    borderRadius: borderRadius ?? 8,
    backgroundColor: theme.colors?.surface || theme.colors?.surfaceVariant || '#f5f5f5',
    overflow: 'hidden',
  };

  return (
    <View style={[baseStyle, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        <LinearGradient
          colors={shimmerColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      {children}
    </View>
  );
};

export const ShimmerPlaceholder: React.FC<{
  lines?: number;
  lineHeight?: number;
  lineSpacing?: number;
  lastLineWidth?: string;
}> = ({
  lines = 3,
  lineHeight = 16,
  lineSpacing = 8,
  lastLineWidth = '60%',
}) => {
  return (
    <View>
      {Array.from({ length: lines }).map((_, index) => (
        <Shimmer
          key={index}
          height={lineHeight}
          width={index === lines - 1 ? lastLineWidth : '100%'}
          style={index > 0 ? { marginTop: lineSpacing } : undefined}
        />
      ))}
    </View>
  );
};

export const ShimmerCard: React.FC<{
  height?: number;
  showAvatar?: boolean;
  showActions?: boolean;
}> = ({
  height = 120,
  showAvatar = true,
  showActions = false,
}) => {
  const theme = useSafeTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors?.surface || '#ffffff',
          height,
        },
      ]}
    >
      <View style={styles.cardContent}>
        {showAvatar && (
          <Shimmer
            width={48}
            height={48}
            borderRadius={24}
            style={styles.avatar}
          />
        )}
        <View style={styles.cardText}>
          <Shimmer width="70%" height={18} />
          <Shimmer width="100%" height={14} style={{ marginTop: 8 }} />
          <Shimmer width="85%" height={14} style={{ marginTop: 4 }} />
        </View>
        {showActions && (
          <View style={styles.cardActions}>
            <Shimmer width={32} height={32} borderRadius={16} />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    marginRight: 8,
  },
  cardText: {
    flex: 1,
  },
  cardActions: {
    marginLeft: 8,
  },
});