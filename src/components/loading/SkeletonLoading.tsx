import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useSafeTheme } from '../common/ThemeFallbackWrapper';

interface SkeletonItemProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  marginBottom?: number;
}

const SkeletonItem: React.FC<SkeletonItemProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  marginBottom = 0,
}) => {
  const theme = useSafeTheme();
  const opacity = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          marginBottom,
          backgroundColor: theme.colors?.surfaceVariant || '#e0e0e0',
          opacity,
        },
      ]}
    />
  );
};

interface AutomationCardSkeletonProps {
  showTrending?: boolean;
}

export const AutomationCardSkeleton: React.FC<AutomationCardSkeletonProps> = ({
  showTrending = false,
}) => {
  const theme = useSafeTheme();
  const styles = createStyles(theme);

  return (
    <View style={[styles.card, { backgroundColor: theme.colors?.surface || '#ffffff' }]}>
      {showTrending && (
        <View style={styles.trendingBadge}>
          <SkeletonItem width={60} height={20} borderRadius={10} />
        </View>
      )}
      <View style={styles.header}>
        <SkeletonItem width={48} height={48} borderRadius={12} />
        <View style={styles.info}>
          <SkeletonItem width="80%" height={16} marginBottom={8} />
          <SkeletonItem width="100%" height={14} />
        </View>
      </View>
      <View style={styles.meta}>
        <View style={styles.author}>
          <SkeletonItem width={24} height={24} borderRadius={12} />
          <SkeletonItem width={80} height={14} />
        </View>
        <View style={styles.stats}>
          <SkeletonItem width={40} height={14} />
          <SkeletonItem width={40} height={14} />
        </View>
      </View>
    </View>
  );
};

interface TrendingCardSkeletonProps {}

export const TrendingCardSkeleton: React.FC<TrendingCardSkeletonProps> = () => {
  const theme = useSafeTheme();
  const styles = createStyles(theme);

  return (
    <View style={[styles.trendingCard, { backgroundColor: theme.colors?.surface || '#ffffff' }]}>
      <SkeletonItem width={32} height={32} borderRadius={16} />
      <SkeletonItem width={48} height={48} borderRadius={12} />
      <View style={styles.trendingInfo}>
        <SkeletonItem width="70%" height={16} marginBottom={8} />
        <View style={styles.trendingStats}>
          <SkeletonItem width={30} height={12} />
          <SkeletonItem width={30} height={12} />
          <SkeletonItem width={50} height={12} />
        </View>
      </View>
      <SkeletonItem width={20} height={20} />
    </View>
  );
};

interface CategoryChipSkeletonProps {}

export const CategoryChipSkeleton: React.FC<CategoryChipSkeletonProps> = () => {
  const theme = useSafeTheme();

  return (
    <View style={[
      {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing?.md || 12,
        paddingVertical: theme.spacing?.sm || 8,
        borderRadius: theme.borderRadius?.round || 24,
        marginRight: theme.spacing?.sm || 8,
        backgroundColor: theme.colors?.surface || '#ffffff',
      }
    ]}>
      <SkeletonItem width={18} height={18} borderRadius={9} />
      <SkeletonItem width={60} height={14} />
      <SkeletonItem width={20} height={12} />
    </View>
  );
};

interface DiscoverScreenSkeletonProps {}

export const DiscoverScreenSkeleton: React.FC<DiscoverScreenSkeletonProps> = () => {
  const theme = useSafeTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.skeletonHeader}>
        <SkeletonItem width={120} height={32} />
        <SkeletonItem width={44} height={44} borderRadius={22} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SkeletonItem width="100%" height={48} borderRadius={12} />
      </View>

      {/* Categories */}
      <View style={styles.categoriesContainer}>
        <View style={styles.categoriesList}>
          {Array.from({ length: 4 }).map((_, index) => (
            <CategoryChipSkeleton key={index} />
          ))}
        </View>
      </View>

      {/* Trending Section */}
      <View style={styles.section}>
        <SkeletonItem width={150} height={20} marginBottom={16} />
        {Array.from({ length: 3 }).map((_, index) => (
          <View key={index} style={styles.trendingCardWrapper}>
            <TrendingCardSkeleton />
          </View>
        ))}
      </View>

      {/* Popular Automations */}
      <View style={styles.section}>
        <SkeletonItem width={180} height={20} marginBottom={16} />
        {Array.from({ length: 3 }).map((_, index) => (
          <View key={index} style={styles.cardWrapper}>
            <AutomationCardSkeleton />
          </View>
        ))}
      </View>
    </View>
  );
};

const createStyles = (theme: any) => {
  // Safe defaults for theme properties
  const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    ...theme?.spacing
  };
  
  const borderRadius = {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    round: 24,
    ...theme?.borderRadius
  };
  
  const colors = {
    background: '#f5f5f5',
    cardShadow: '#000',
    ...theme?.colors
  };

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    skeletonHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    searchContainer: {
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.md,
    },
    categoriesContainer: {
      marginBottom: spacing.lg,
    },
    categoriesList: {
      flexDirection: 'row',
      paddingHorizontal: spacing.lg,
    },
    section: {
      marginBottom: spacing.xl,
      paddingHorizontal: spacing.lg,
    },
    card: {
      padding: spacing.lg,
      borderRadius: borderRadius.xl,
      shadowColor: colors.cardShadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    trendingBadge: {
      position: 'absolute',
      top: spacing.md,
      right: spacing.md,
      zIndex: 1,
    },
    header: {
      flexDirection: 'row',
      marginBottom: spacing.md,
    },
    info: {
      flex: 1,
      marginLeft: spacing.md,
    },
    meta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    author: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    stats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    trendingCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.lg,
      borderRadius: borderRadius.xl,
      gap: spacing.md,
    },
    trendingInfo: {
      flex: 1,
    },
    trendingStats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    trendingCardWrapper: {
      marginBottom: spacing.md,
    },
    cardWrapper: {
      marginBottom: spacing.sm,
    },
  });
};