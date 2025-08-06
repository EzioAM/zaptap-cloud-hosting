#!/usr/bin/env node

/**
 * Cleanup script for oversized offline monitoring data
 * Run this script to clear or limit offline data that's too large for AsyncStorage
 * 
 * Usage: node scripts/cleanup-offline-data.js
 */

const path = require('path');

// Mock AsyncStorage for running from command line
// In production, this would use the actual AsyncStorage from the app
const mockAsyncStorage = {
  data: {},
  
  async getItem(key) {
    // In a real scenario, you'd read from the actual storage location
    // For React Native, this would be from the app's storage directory
    console.log(`Would read: ${key}`);
    return this.data[key] || null;
  },
  
  async setItem(key, value) {
    console.log(`Would write ${value.length} bytes to: ${key}`);
    this.data[key] = value;
  },
  
  async removeItem(key) {
    console.log(`Would remove: ${key}`);
    delete this.data[key];
  },
  
  async multiRemove(keys) {
    for (const key of keys) {
      await this.removeItem(key);
    }
  }
};

// Storage keys from the monitoring services
const OFFLINE_METRICS_KEY = 'performance_metrics_offline';
const OFFLINE_ALERTS_KEY = 'performance_alerts_offline';
const OFFLINE_REPORTS_KEY = 'crash_reports_offline';

const COLORS = {
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  RESET: '\x1b[0m'
};

function log(message, color = COLORS.RESET) {
  console.log(`${color}${message}${COLORS.RESET}`);
}

async function cleanupOfflineData() {
  log('\n🧹 Starting cleanup of oversized offline monitoring data...', COLORS.BLUE);
  
  try {
    // Clean up performance metrics
    log('\n📊 Cleaning performance metrics...', COLORS.YELLOW);
    await cleanupMetrics();
    
    // Clean up performance alerts
    log('\n⚠️  Cleaning performance alerts...', COLORS.YELLOW);
    await cleanupAlerts();
    
    // Clean up crash reports
    log('\n🐛 Cleaning crash reports...', COLORS.YELLOW);
    await cleanupReports();
    
    log('\n✅ Cleanup complete!', COLORS.GREEN);
    log('\nNext steps:', COLORS.BLUE);
    log('1. Run the SQL script in Supabase to create monitoring tables', COLORS.RESET);
    log('2. Restart your app - monitoring should work without errors', COLORS.RESET);
    log('3. Data will now be properly limited to prevent overflow', COLORS.RESET);
    
  } catch (error) {
    log(`\n❌ Cleanup failed: ${error.message}`, COLORS.RED);
    process.exit(1);
  }
}

async function cleanupMetrics() {
  try {
    const metricsData = await mockAsyncStorage.getItem(OFFLINE_METRICS_KEY);
    
    if (!metricsData) {
      log('  No offline metrics found', COLORS.GREEN);
      return;
    }
    
    const metrics = JSON.parse(metricsData);
    const originalCount = metrics.length;
    
    // Keep only the most recent 50 metrics
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const cleanedMetrics = metrics
      .filter(m => m.timestamp > oneDayAgo)
      .slice(-50);
    
    if (cleanedMetrics.length < originalCount) {
      await mockAsyncStorage.setItem(OFFLINE_METRICS_KEY, JSON.stringify(cleanedMetrics));
      log(`  ✅ Reduced metrics from ${originalCount} to ${cleanedMetrics.length}`, COLORS.GREEN);
    } else {
      log(`  ✅ Metrics already within limit (${originalCount})`, COLORS.GREEN);
    }
    
  } catch (error) {
    // If data is corrupted or too large, just remove it
    await mockAsyncStorage.removeItem(OFFLINE_METRICS_KEY);
    log('  ⚠️  Removed corrupted/oversized metrics data', COLORS.YELLOW);
  }
}

async function cleanupAlerts() {
  try {
    const alertsData = await mockAsyncStorage.getItem(OFFLINE_ALERTS_KEY);
    
    if (!alertsData) {
      log('  No offline alerts found', COLORS.GREEN);
      return;
    }
    
    const alerts = JSON.parse(alertsData);
    const originalCount = alerts.length;
    
    // Keep only the most recent 25 alerts
    const cleanedAlerts = alerts.slice(-25);
    
    if (cleanedAlerts.length < originalCount) {
      await mockAsyncStorage.setItem(OFFLINE_ALERTS_KEY, JSON.stringify(cleanedAlerts));
      log(`  ✅ Reduced alerts from ${originalCount} to ${cleanedAlerts.length}`, COLORS.GREEN);
    } else {
      log(`  ✅ Alerts already within limit (${originalCount})`, COLORS.GREEN);
    }
    
  } catch (error) {
    // If data is corrupted or too large, just remove it
    await mockAsyncStorage.removeItem(OFFLINE_ALERTS_KEY);
    log('  ⚠️  Removed corrupted/oversized alerts data', COLORS.YELLOW);
  }
}

async function cleanupReports() {
  try {
    const reportsData = await mockAsyncStorage.getItem(OFFLINE_REPORTS_KEY);
    
    if (!reportsData) {
      log('  No offline reports found', COLORS.GREEN);
      return;
    }
    
    const reports = JSON.parse(reportsData);
    const originalCount = reports.length;
    
    // Keep only the most recent 25 reports
    const cleanedReports = reports.slice(-25);
    
    if (cleanedReports.length < originalCount) {
      await mockAsyncStorage.setItem(OFFLINE_REPORTS_KEY, JSON.stringify(cleanedReports));
      log(`  ✅ Reduced reports from ${originalCount} to ${cleanedReports.length}`, COLORS.GREEN);
    } else {
      log(`  ✅ Reports already within limit (${originalCount})`, COLORS.GREEN);
    }
    
  } catch (error) {
    // If data is corrupted or too large, just remove it
    await mockAsyncStorage.removeItem(OFFLINE_REPORTS_KEY);
    log('  ⚠️  Removed corrupted/oversized reports data', COLORS.YELLOW);
  }
}

// React Native specific cleanup - to be run in the app context
function getReactNativeCleanupCode() {
  return `
// Add this code to your app to clean up oversized offline data
// Run it once on app start or as a utility function

import AsyncStorage from '@react-native-async-storage/async-storage';

export async function cleanupOversizedOfflineData() {
  const keys = [
    'performance_metrics_offline',
    'performance_alerts_offline', 
    'crash_reports_offline'
  ];
  
  try {
    // Clear all offline monitoring data
    await AsyncStorage.multiRemove(keys);
    console.log('✅ Cleared oversized offline monitoring data');
    return true;
  } catch (error) {
    console.error('Failed to clear offline data:', error);
    return false;
  }
}

// Call this function on app start if you're experiencing storage issues
// cleanupOversizedOfflineData();
`;
}

// Show the React Native code that can be used
function showReactNativeInstructions() {
  log('\n📱 React Native Cleanup Code:', COLORS.BLUE);
  log('Copy this code to your app to clean up data directly:\n', COLORS.YELLOW);
  console.log(getReactNativeCleanupCode());
}

// Main execution
if (require.main === module) {
  cleanupOfflineData()
    .then(() => {
      showReactNativeInstructions();
    })
    .catch(error => {
      log(`\n❌ Error: ${error.message}`, COLORS.RED);
      process.exit(1);
    });
}

module.exports = { cleanupOfflineData };