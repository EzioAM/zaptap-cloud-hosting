# Monitoring Services Setup Guide

This guide explains how to set up the monitoring services (Performance Monitor and Crash Reporter) in your ShortcutsLike application.

## Overview

The monitoring services provide comprehensive application performance tracking and error reporting. They work gracefully whether or not the database tables exist:

- **Without database tables**: All metrics and error reports are stored locally in AsyncStorage
- **With database tables**: Data is synced to the database for analysis and monitoring

## Quick Setup

### 1. Database Setup (Recommended)

If you have a Supabase database configured, create the monitoring tables:

1. Open your Supabase project dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `scripts/setup-monitoring-tables.sql`
4. Run the SQL script

This creates:
- `performance_metrics` table for performance data
- `error_reports` table for crash and error information
- Proper indexes for efficient querying
- Row Level Security (RLS) policies
- Aggregation views for reporting

### 2. Environment Configuration

Ensure your `.env` file contains:
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Verify Setup

The monitoring services automatically detect whether the database tables exist and log their status on initialization:

**✅ With tables**: "Database available for metrics storage" / "Database available for error reporting"
**⚠️ Without tables**: "Performance metrics table missing - run setup script to create tables"

## Service Features

### Performance Monitor
- **App Launch Time**: Tracks how long the app takes to start
- **Screen Render Time**: Monitors navigation and screen loading performance  
- **API Response Time**: Measures network request latencies
- **Memory Usage**: Tracks JavaScript heap usage (when available)
- **Custom Metrics**: Allows tracking of application-specific metrics

### Crash Reporter
- **Error Capture**: Automatically captures JavaScript errors and crashes
- **Breadcrumbs**: Tracks user actions leading up to errors
- **Context**: Records app state, user info, and environment details
- **Network Errors**: Specifically handles API and network failures
- **Manual Reporting**: Allows explicit error reporting with custom context

## Configuration

### Performance Monitor Configuration

```typescript
// Configure via ANALYTICS_CONFIG in src/config/analytics.ts
const config = {
  performance: {
    trackFPS: true,
    trackAppLaunchTime: true,
    trackScreenRenderTime: true,
    trackNetworkLatency: true,
    trackMemory: true,
    sampleRate: 1.0, // 100% in development, reduce for production
    slowThresholdMs: 3000
  }
};
```

### Crash Reporter Configuration

```typescript
const config = {
  errors: {
    enabled: true,
    maxBreadcrumbs: 50,
    captureConsoleErrors: true,
    captureUnhandledPromiseRejections: true,
    sampleRate: 1.0 // 100% in development, reduce for production
  }
};
```

## Usage Examples

### Basic Usage (Automatic)

Both services initialize automatically and start tracking immediately:

```typescript
import { PerformanceMonitor } from './services/monitoring/PerformanceMonitor';
import { CrashReporter } from './services/monitoring/CrashReporter';

// These initialize automatically when imported
```

### Manual Performance Tracking

```typescript
import { 
  startScreenRender, 
  endScreenRender,
  trackCustomMetric 
} from './services/monitoring/PerformanceMonitor';

// Track screen rendering
startScreenRender('HomeScreen');
// ... screen loads
endScreenRender('HomeScreen', { itemCount: 15 });

// Track custom metrics
trackCustomMetric('api_calls_per_session', 23, 'count');
```

### Manual Error Reporting

```typescript
import { 
  reportError,
  addBreadcrumb,
  trackUserAction 
} from './services/monitoring/CrashReporter';

// Add context
addBreadcrumb({
  category: 'user_action',
  message: 'User tapped create button',
  level: 'info'
});

// Track user action
trackUserAction({
  type: 'click',
  target: 'create_automation_button',
  data: { screen: 'HomeScreen' }
});

// Report error with context
try {
  // some operation
} catch (error) {
  reportError(error, { 
    operation: 'create_automation',
    userId: user.id 
  }, 'high');
}
```

## Data Access and Analysis

### Local Data (Always Available)

Both services store data locally regardless of database availability:

```typescript
// Performance data
const summary = PerformanceMonitor.getPerformanceSummary();
console.log('App launch average:', summary.app_launch_time.average);

// Error data
const alerts = PerformanceMonitor.getRecentAlerts(10);
const exportedData = CrashReporter.exportData();
```

### Database Queries (When Tables Exist)

With database tables, you can query data directly:

```sql
-- Performance metrics over time
SELECT 
    date_trunc('day', timestamp) as day,
    AVG(value) as avg_value
FROM performance_metrics 
WHERE type = 'app_launch' 
GROUP BY day 
ORDER BY day DESC;

-- Error frequency
SELECT 
    error_name,
    COUNT(*) as occurrences,
    MAX(timestamp) as last_seen
FROM error_reports
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY error_name
ORDER BY occurrences DESC;
```

### Using the Views

The setup script creates convenient views:

```sql
-- Daily performance summary
SELECT * FROM performance_summary 
WHERE date >= CURRENT_DATE - 7;

-- Daily error summary  
SELECT * FROM error_summary
WHERE date >= CURRENT_DATE - 7;
```

## Troubleshooting

### Database Connection Issues

**Error**: "Supabase client not initialized"
- **Solution**: Check your `.env` file has correct `SUPABASE_URL` and `SUPABASE_ANON_KEY`

**Error**: "Permission denied for performance metrics table"  
- **Solution**: Check RLS policies allow authenticated users to INSERT

**Error**: "Performance metrics table does not exist"
- **Solution**: Run the SQL setup script `scripts/setup-monitoring-tables.sql`

### Common Scenarios

1. **Development without database**: Services work normally, data stored locally
2. **Production with database**: Full monitoring with persistent data
3. **Database temporarily down**: Services continue working, data cached locally
4. **Migration/setup**: Run SQL script, restart app to detect tables

### Log Levels

- **Error**: Critical issues that affect functionality
- **Warn**: Important issues logged once (like missing tables)
- **Info**: Significant events (database availability, data sync)
- **Debug**: Detailed information for troubleshooting

## Performance Considerations

### Production Recommendations

1. **Reduce sample rates** for performance metrics (e.g., 0.1 = 10%)
2. **Limit offline storage** (automatically handled, but monitor AsyncStorage usage)
3. **Monitor database costs** if storing high volumes of metrics
4. **Set up data retention policies** to manage database size

### Storage Limits

- **Local storage**: Automatically limited to 500 metrics, 100 error reports
- **Database storage**: No automatic limits (implement retention policies)
- **Sync frequency**: Every 60 seconds by default

## Support

If you encounter issues:

1. Check the console logs for specific error messages
2. Verify your Supabase configuration
3. Test database connectivity independently
4. Review the SQL script for any custom modifications needed

The monitoring services are designed to be resilient and provide value even when database connectivity is limited or unavailable.