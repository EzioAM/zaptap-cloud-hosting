import React from 'react';
import { lazyWidget } from '../../utils/lazyLoad';

// Lazy load all dashboard widgets
export const LazyQuickStatsWidget = lazyWidget(
  () => import('./DashboardWidgets/QuickStatsWidget').then(m => ({ default: m.QuickStatsWidget })),
  'Quick Stats'
);

export const LazyFeaturedAutomationWidget = lazyWidget(
  () => import('./DashboardWidgets/FeaturedAutomationWidget').then(m => ({ default: m.FeaturedAutomationWidget })),
  'Featured Automation'
);

export const LazyQuickActionsWidget = lazyWidget(
  () => import('./DashboardWidgets/QuickActionsWidget').then(m => ({ default: m.QuickActionsWidget })),
  'Quick Actions'
);

export const LazyRecentActivityWidget = lazyWidget(
  () => import('./DashboardWidgets/RecentActivityWidget').then(m => ({ default: m.RecentActivityWidget })),
  'Recent Activity'
);

// Enhanced versions (if they exist)
export const LazyQuickStatsWidgetEnhanced = lazyWidget(
  () => import('./DashboardWidgets/QuickStatsWidgetEnhanced'),
  'Quick Stats Enhanced'
);

export const LazyFeaturedAutomationWidgetEnhanced = lazyWidget(
  () => import('./DashboardWidgets/FeaturedAutomationWidgetEnhanced'),
  'Featured Automation Enhanced'
);

export const LazyQuickActionsWidgetEnhanced = lazyWidget(
  () => import('./DashboardWidgets/QuickActionsWidgetEnhanced'),
  'Quick Actions Enhanced'
);

export const LazyRecentActivityWidgetEnhanced = lazyWidget(
  () => import('./DashboardWidgets/RecentActivityWidgetEnhanced'),
  'Recent Activity Enhanced'
);

// Lazy load heavy chart components
export const LazyChartWidget = lazyWidget(
  async () => {
    const { LineChart } = await import('react-native-chart-kit');
    return {
      default: LineChart
    };
  },
  'Chart Widget'
);

// Lazy load victory charts
export const LazyVictoryChart = lazyWidget(
  async () => {
    const { VictoryChart, VictoryLine, VictoryAxis } = await import('victory-native');
    return {
      default: () => (
        <VictoryChart>
          <VictoryAxis />
          <VictoryLine />
        </VictoryChart>
      )
    };
  },
  'Victory Chart'
);

// Widget loader with progressive enhancement
export class DashboardWidgetLoader {
  private static loadedWidgets = new Set<string>();
  
  static async loadWidget(widgetName: string): Promise<React.ComponentType<any>> {
    if (this.loadedWidgets.has(widgetName)) {
      return this.getWidget(widgetName);
    }
    
    const widget = await this.importWidget(widgetName);
    this.loadedWidgets.add(widgetName);
    return widget;
  }
  
  private static async importWidget(widgetName: string): Promise<React.ComponentType<any>> {
    switch (widgetName) {
      case 'QuickStats':
        return (await import('./DashboardWidgets/QuickStatsWidget')).QuickStatsWidget;
      case 'FeaturedAutomation':
        return (await import('./DashboardWidgets/FeaturedAutomationWidget')).FeaturedAutomationWidget;
      case 'QuickActions':
        return (await import('./DashboardWidgets/QuickActionsWidget')).QuickActionsWidget;
      case 'RecentActivity':
        return (await import('./DashboardWidgets/RecentActivityWidget')).RecentActivityWidget;
      default:
        throw new Error(`Unknown widget: ${widgetName}`);
    }
  }
  
  private static getWidget(widgetName: string): React.ComponentType<any> {
    // Return already loaded widget from cache
    switch (widgetName) {
      case 'QuickStats':
        return LazyQuickStatsWidget;
      case 'FeaturedAutomation':
        return LazyFeaturedAutomationWidget;
      case 'QuickActions':
        return LazyQuickActionsWidget;
      case 'RecentActivity':
        return LazyRecentActivityWidget;
      default:
        throw new Error(`Widget not loaded: ${widgetName}`);
    }
  }
  
  static preloadCriticalWidgets() {
    // Preload only the most important widgets
    return Promise.all([
      import('./DashboardWidgets/QuickStatsWidget'),
      import('./DashboardWidgets/QuickActionsWidget'),
    ]);
  }
  
  static clearCache() {
    this.loadedWidgets.clear();
  }
}

// Export a hook for dynamic widget loading
export const useLazyWidget = (widgetName: string, shouldLoad: boolean = true) => {
  const [Widget, setWidget] = React.useState<React.ComponentType<any> | null>(null);
  const [loading, setLoading] = React.useState(shouldLoad);
  const [error, setError] = React.useState<Error | null>(null);
  
  React.useEffect(() => {
    if (!shouldLoad) return;
    
    setLoading(true);
    DashboardWidgetLoader.loadWidget(widgetName)
      .then(setWidget)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [widgetName, shouldLoad]);
  
  return { Widget, loading, error };
};

// Intersection observer for lazy loading widgets on scroll
export const useIntersectionWidget = (widgetName: string) => {
  const [isIntersecting, setIsIntersecting] = React.useState(false);
  const ref = React.useRef<any>(null);
  
  React.useEffect(() => {
    // React Native doesn't have IntersectionObserver, 
    // but we can use onLayout and ScrollView's onScroll
    // This is a placeholder for the actual implementation
    setIsIntersecting(true); // For now, always load
  }, []);
  
  const { Widget, loading, error } = useLazyWidget(widgetName, isIntersecting);
  
  return { ref, Widget, loading, error };
};