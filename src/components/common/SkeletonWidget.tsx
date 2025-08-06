import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Shimmer } from '../atoms/Shimmer/Shimmer';
import { useSafeTheme } from './ThemeFallbackWrapper';

const { width: screenWidth } = Dimensions.get('window');

export interface SkeletonWidgetProps {
  variant: 'stats' | 'actions' | 'featured' | 'activity' | 'custom';
  height?: number;
  showHeader?: boolean;
  showFooter?: boolean;
  customLayout?: React.ReactNode;
  animationDelay?: number;
}

export const SkeletonWidget: React.FC<SkeletonWidgetProps> = ({
  variant,
  height = 200,
  showHeader = true,
  showFooter = false,
  customLayout,
  animationDelay = 0,
}) => {
  const theme = useSafeTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: animationDelay,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        delay: animationDelay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [animationDelay]);

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Shimmer width="40%" height={12} borderRadius={6} />
        <Shimmer width="60%" height={20} borderRadius={8} style={styles.headerTitle} />
      </View>
      <Shimmer width={44} height={44} borderRadius={12} />
    </View>
  );

  const renderFooter = () => (
    <View style={styles.footer}>
      <Shimmer width={6} height={6} borderRadius={3} />
      <Shimmer width="50%" height={12} borderRadius={6} style={styles.footerText} />
    </View>
  );

  const renderStatsLayout = () => (
    <View style={styles.statsGrid}>
      {[...Array(4)].map((_, index) => (
        <View key={index} style={styles.statItem}>
          <Shimmer width={52} height={52} borderRadius={16} style={styles.statIcon} />
          <Shimmer width="80%" height={24} borderRadius={6} style={styles.statValue} />
          <Shimmer width="100%" height={12} borderRadius={4} style={styles.statLabel} />
        </View>
      ))}
    </View>
  );

  const renderActionsLayout = () => (
    <View>
      <View style={styles.actionsGrid}>
        {[...Array(4)].map((_, index) => (
          <View key={index} style={styles.actionItem}>
            <Shimmer width={56} height={56} borderRadius={16} />
            <Shimmer width="80%" height={14} borderRadius={4} style={styles.actionLabel} />
          </View>
        ))}
      </View>
      <View style={styles.quickActionRow}>
        <Shimmer width="100%" height={48} borderRadius={12} />
      </View>
    </View>
  );

  const renderFeaturedLayout = () => (
    <View>
      <Shimmer width="100%" height={120} borderRadius={12} style={styles.featuredCard} />
      <View style={styles.featuredMeta}>
        <View style={styles.featuredMetaLeft}>
          <Shimmer width={32} height={32} borderRadius={16} />
          <View style={styles.featuredMetaText}>
            <Shimmer width="60%" height={14} borderRadius={4} />
            <Shimmer width="40%" height={12} borderRadius={4} style={styles.featuredMetaSubtext} />
          </View>
        </View>
        <Shimmer width={80} height={32} borderRadius={16} />
      </View>
    </View>
  );

  const renderActivityLayout = () => (
    <View>
      {[...Array(3)].map((_, index) => (
        <View key={index} style={styles.activityItem}>
          <Shimmer width={40} height={40} borderRadius={20} />
          <View style={styles.activityContent}>
            <Shimmer width="70%" height={16} borderRadius={4} />
            <Shimmer width="90%" height={14} borderRadius={4} style={styles.activityDescription} />
            <Shimmer width="40%" height={12} borderRadius={4} style={styles.activityTime} />
          </View>
          <Shimmer width={20} height={20} borderRadius={4} />
        </View>
      ))}
    </View>
  );

  const renderContent = () => {
    if (customLayout) return customLayout;

    switch (variant) {
      case 'stats':
        return renderStatsLayout();
      case 'actions':
        return renderActionsLayout();
      case 'featured':
        return renderFeaturedLayout();
      case 'activity':
        return renderActivityLayout();
      default:
        return renderStatsLayout();
    }
  };

  const gradientColors = theme.mode === 'dark'
    ? ['rgba(30, 30, 30, 0.6)', 'rgba(40, 40, 40, 0.8)', 'rgba(30, 30, 30, 0.6)']
    : ['rgba(248, 249, 250, 0.8)', 'rgba(233, 236, 239, 0.9)', 'rgba(222, 226, 230, 0.8)'];

  return (
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.container, { minHeight: height }]}
      >
        <View style={[styles.content, { backgroundColor: theme.colors?.surface || '#ffffff' }]}>
          {showHeader && renderHeader()}
          {renderContent()}
          {showFooter && renderFooter()}
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

// Preset skeleton configurations
export const StatsSkeletonWidget = () => (
  <SkeletonWidget variant="stats" height={220} showHeader showFooter />
);

export const ActionsSkeletonWidget = () => (
  <SkeletonWidget variant="actions" height={180} showHeader />
);

export const FeaturedSkeletonWidget = () => (
  <SkeletonWidget variant="featured" height={240} showHeader />
);

export const ActivitySkeletonWidget = () => (
  <SkeletonWidget variant="activity" height={280} showHeader />
);

const styles = StyleSheet.create({
  container: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  content: {
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  footerText: {
    marginLeft: 8,
  },
  
  // Stats Layout
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    marginBottom: 12,
  },
  statValue: {
    marginBottom: 4,
  },
  statLabel: {},

  // Actions Layout
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionItem: {
    alignItems: 'center',
    width: '22%',
    marginBottom: 16,
  },
  actionLabel: {
    marginTop: 8,
  },
  quickActionRow: {
    marginTop: 8,
  },

  // Featured Layout
  featuredCard: {
    marginBottom: 16,
  },
  featuredMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuredMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  featuredMetaText: {
    marginLeft: 12,
    flex: 1,
  },
  featuredMetaSubtext: {
    marginTop: 4,
  },

  // Activity Layout
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  activityContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  activityDescription: {
    marginTop: 4,
  },
  activityTime: {
    marginTop: 8,
  },
});

export default SkeletonWidget;