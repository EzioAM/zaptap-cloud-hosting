# Developer Tools Guide

## Overview

The Developer Tools menu has been completely revamped with functional, production-ready tools that provide deep insights and control over the application.

## New Features

### 1. Database Inspector
- **Real-time database browsing**: View all tables with record counts
- **Data exploration**: Browse, search, and filter table data
- **Export capabilities**: Export table data or debug bundles to console
- **Pagination**: Handle large datasets efficiently
- **Search functionality**: Find specific records quickly

### 2. Performance Monitor
- **Memory tracking**: Real-time JS heap usage with visual charts
- **Performance metrics**: Track uptime, errors, and warnings
- **API monitoring**: Average response times per endpoint
- **Visual charts**: Memory usage over time using react-native-chart-kit
- **Performance tips**: Automatic suggestions based on metrics
- **Export reports**: Generate comprehensive performance reports

### 3. Network Monitor
- **Request interception**: All fetch requests are automatically logged
- **Detailed inspection**: View request/response bodies, headers, and timing
- **Filtering**: Filter by status, method, or search query
- **Real-time updates**: See network activity as it happens
- **Error tracking**: Quickly identify failed requests
- **Export logs**: Copy request/response data for debugging

### 4. Storage Inspector
- **AsyncStorage browser**: View all stored key-value pairs
- **Size analysis**: See storage usage by item
- **Edit capabilities**: Modify values directly
- **Search and filter**: Find specific storage items
- **Import/Export**: Backup and restore storage data
- **Type detection**: Automatically detect JSON vs string values

### 5. Test Runner
- **System health checks**: Automated tests for core functionality
  - Supabase connection
  - Authentication flow
  - Storage operations
  - Network connectivity
- **Automation simulator**: Test automation execution without side effects
- **Detailed logging**: Step-by-step execution logs
- **Pass/fail metrics**: Visual test results with timing

### 6. Developer Service
A comprehensive service (`DeveloperService.ts`) that provides:
- Performance metric collection
- Network request interception
- Storage management utilities
- Test automation framework
- Feature flag management
- Debug bundle generation

## Key Improvements

1. **Functional Tools**: Replaced alert-based tools with full-featured components
2. **Real-time Monitoring**: Live updates for performance and network data
3. **Data Management**: Direct database and storage manipulation
4. **Testing Framework**: Automated testing and simulation capabilities
5. **Visual Feedback**: Charts, progress bars, and color-coded indicators
6. **Export Capabilities**: Console logging for all debug data

## Usage

1. Access Developer Menu from settings (requires developer role)
2. Select any tool to open its dedicated interface
3. Use the back button to return to the main menu
4. All tools preserve authentication - no need to re-login

## Security

- Developer access is controlled by `RoleService`
- Sensitive operations require confirmation
- Cache clearing preserves authentication tokens
- Export functions log to console for security

## Technical Details

- Uses `react-native-chart-kit` for performance graphs
- Implements custom fetch interceptor for network monitoring
- Leverages Supabase RPC for database queries (when available)
- AsyncStorage operations are batched for performance

## Future Enhancements

- Add WebSocket monitoring
- Implement log persistence
- Add custom RPC query execution
- Create automation recording/playback
- Add Redux DevTools integration