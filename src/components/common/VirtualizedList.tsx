import React, { useCallback, useMemo } from 'react';
import {
  FlatList,
  RefreshControl,
  ListRenderItem,
  ViewStyle,
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import EnhancedLoadingSkeleton from './EnhancedLoadingSkeleton';
import { EmptyState } from '../molecules';

interface VirtualizedListProps<T> {
  data: T[];
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T, index: number) => string;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  loadingMore?: boolean;
  hasMore?: boolean;
  emptyTitle?: string;
  emptySubtitle?: string;
  emptyIcon?: string;
  skeletonVariant?: 'card' | 'list' | 'profile' | 'automation' | 'stats';
  skeletonCount?: number;
  estimatedItemSize?: number;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  horizontal?: boolean;
  numColumns?: number;
  initialNumToRender?: number;
  maxToRenderPerBatch?: number;
  windowSize?: number;
  removeClippedSubviews?: boolean;
  getItemLayout?: (data: T[] | null | undefined, index: number) => {
    length: number;
    offset: number;
    index: number;
  };
}

function VirtualizedList<T>({
  data,
  renderItem,
  keyExtractor,
  loading = false,
  refreshing = false,
  onRefresh,
  onEndReached,
  onEndReachedThreshold = 0.1,
  loadingMore = false,
  hasMore = true,
  emptyTitle = "No items found",
  emptySubtitle = "Try refreshing or check back later",
  emptyIcon = "inbox-outline",
  skeletonVariant = 'list',
  skeletonCount = 5,
  estimatedItemSize = 100,
  style,
  contentContainerStyle,
  horizontal = false,
  numColumns = 1,
  initialNumToRender = 10,
  maxToRenderPerBatch = 5,
  windowSize = 10,
  removeClippedSubviews = true,
  getItemLayout,
}: VirtualizedListProps<T>) {
  const { theme } = useTheme();

  // Memoized render item to prevent unnecessary re-renders
  const memoizedRenderItem = useCallback<ListRenderItem<T>>(
    ({ item, index }) => {
      return renderItem({ item, index, separators: {} as any });
    },
    [renderItem]
  );

  // Memoized footer component for load more functionality
  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator 
          size="small" 
          color={theme.colors.primary}
        />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Loading more...
        </Text>
      </View>
    );
  }, [loadingMore, theme]);

  // Memoized empty component
  const renderEmpty = useCallback(() => {
    if (loading) {
      return (
        <EnhancedLoadingSkeleton
          variant={skeletonVariant}
          count={skeletonCount}
          showAnimation={true}
        />
      );
    }

    return (
      <EmptyState
        type="no-automations"
        title={emptyTitle}
        subtitle={emptySubtitle}
        icon={emptyIcon}
      />
    );
  }, [loading, emptyTitle, emptySubtitle, emptyIcon, skeletonVariant, skeletonCount]);

  // Memoized refresh control
  const refreshControl = useMemo(() => {
    if (!onRefresh) return undefined;
    
    return (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        tintColor={theme.colors.primary}
        colors={[theme.colors.primary]}
      />
    );
  }, [refreshing, onRefresh, theme.colors.primary]);

  // Handle end reached with debounce
  const handleEndReached = useCallback(() => {
    if (onEndReached && hasMore && !loadingMore && !loading) {
      onEndReached();
    }
  }, [onEndReached, hasMore, loadingMore, loading]);

  // Show loading skeleton on initial load
  if (loading && data.length === 0) {
    return (
      <View style={[styles.container, style]}>
        <EnhancedLoadingSkeleton
          variant={skeletonVariant}
          count={skeletonCount}
          showAnimation={true}
        />
      </View>
    );
  }

  return (
    <FlatList
      data={data}
      renderItem={memoizedRenderItem}
      keyExtractor={keyExtractor}
      style={[styles.container, style]}
      contentContainerStyle={[
        styles.contentContainer,
        data.length === 0 && styles.emptyContentContainer,
        contentContainerStyle,
      ]}
      horizontal={horizontal}
      numColumns={numColumns}
      showsVerticalScrollIndicator={!horizontal}
      showsHorizontalScrollIndicator={horizontal}
      refreshControl={refreshControl}
      onEndReached={handleEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
      // Performance optimizations
      initialNumToRender={initialNumToRender}
      maxToRenderPerBatch={maxToRenderPerBatch}
      windowSize={windowSize}
      removeClippedSubviews={removeClippedSubviews}
      getItemLayout={getItemLayout}
      // Memory optimizations
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      // Additional performance props
      disableVirtualization={false}
      updateCellsBatchingPeriod={50}
      legacyImplementation={false}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  emptyContentContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  loadingFooter: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
  },
});

export default React.memo(VirtualizedList) as <T>(
  props: VirtualizedListProps<T>
) => React.ReactElement;