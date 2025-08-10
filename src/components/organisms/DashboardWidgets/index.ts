// Standard widgets - using named exports
export { QuickStatsWidget } from './QuickStatsWidget';
export { QuickActionsWidget } from './QuickActionsWidget';
export { RecentActivityWidget } from './RecentActivityWidget';
export { FeaturedAutomationWidget } from './FeaturedAutomationWidget';

// Enhanced widgets - using default exports as named exports
export { default as QuickStatsWidgetEnhanced } from './QuickStatsWidgetEnhanced';
export { default as QuickStatsWidgetEnhanced2 } from './QuickStatsWidgetEnhanced'; // Alias for now
export { default as QuickStatsWidgetSimple } from './QuickStatsWidgetSimple';
export { QuickActionsWidgetEnhanced } from './QuickActionsWidgetEnhanced';
export { RecentActivityWidgetEnhanced } from './RecentActivityWidgetEnhanced';
export { FeaturedAutomationWidgetEnhanced } from './FeaturedAutomationWidgetEnhanced';

// Weather-enhanced widget
export { default as FeaturedAutomationWeatherWidget } from './FeaturedAutomationWeatherWidget';