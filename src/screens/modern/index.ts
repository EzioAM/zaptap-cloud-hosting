/**
 * Export hub for optimized modern screens
 * These screens include performance optimizations for animations
 */

// Original screens (for backward compatibility)
export { default as ModernHomeScreen } from './ModernHomeScreen';
export { default as DiscoverScreen } from './DiscoverScreen';
export { default as LibraryScreen } from './LibraryScreen';
export { default as BuildScreen } from './BuildScreen';
export { default as ModernProfileScreen } from './ModernProfileScreen';

// Optimized screens with performance improvements
export { default as ModernHomeScreenOptimized } from './ModernHomeScreenOptimized';
export { default as DiscoverScreenOptimized } from './DiscoverScreenOptimized';

// Re-export other screens
export { default as ModernCommentsScreen } from './ModernCommentsScreen';
export { default as ModernReviewsScreen } from './ModernReviewsScreen';
export { default as ModernReviewsScreenSafe } from './ModernReviewsScreenSafe';
export { default as ScannerScreen } from './ScannerScreen';
export { default as HomeScreen } from './HomeScreen';