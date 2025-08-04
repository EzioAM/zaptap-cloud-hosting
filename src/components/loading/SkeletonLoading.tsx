import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

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
  const { theme } = useTheme();
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
          backgroundColor: theme.colors.surfaceVariant,
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
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
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
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={[styles.trendingCard, { backgroundColor: theme.colors.surface }]}>
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
  const { theme } = useTheme();

  return (
    <View style={[
      {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.round,
        marginRight: theme.spacing.sm,
        backgroundColor: theme.colors.surface,
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
  const { theme } = useTheme();
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

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    skeletonHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
    searchContainer: {
      paddingHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    },
    categoriesContainer: {
      marginBottom: theme.spacing.lg,
    },
    categoriesList: {
      flexDirection: 'row',
      paddingHorizontal: theme.spacing.lg,
    },
    section: {
      marginBottom: theme.spacing.xl,
      paddingHorizontal: theme.spacing.lg,
    },
    card: {
      padding: theme.spacing.lg,
      borderRadius: theme.borderRadius.xl,
      shadowColor: theme.colors.cardShadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    trendingBadge: {
      position: 'absolute',
      top: theme.spacing.md,
      right: theme.spacing.md,
      zIndex: 1,
    },
    header: {
      flexDirection: 'row',
      marginBottom: theme.spacing.md,
    },
    info: {
      flex: 1,
      marginLeft: theme.spacing.md,
    },
    meta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    author: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    stats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    trendingCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.lg,
      borderRadius: theme.borderRadius.xl,
      gap: theme.spacing.md,
    },
    trendingInfo: {
      flex: 1,
    },
    trendingStats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    trendingCardWrapper: {
      marginBottom: theme.spacing.md,
    },
    cardWrapper: {
      marginBottom: theme.spacing.sm,
    },
  });