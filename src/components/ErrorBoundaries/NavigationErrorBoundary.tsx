import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { EventLogger } from '../../utils/EventLogger';

interface NavigationErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  context?: string;
  enableRecovery?: boolean;
  enableReset?: boolean;
}

interface NavigationErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
  lastErrorTime: number;
  isRecovering: boolean;
}

// Global navigation error tracking
let globalNavigationErrors = 0;
let lastGlobalErrorTime = 0;
const MAX_GLOBAL_NAVIGATION_ERRORS = 10;
const GLOBAL_ERROR_RESET_TIME = 60000; // 1 minute

export class NavigationErrorBoundary extends Component<
  NavigationErrorBoundaryProps,
  NavigationErrorBoundaryState
> {
  private recoveryTimeout?: NodeJS.Timeout;

  constructor(props: NavigationErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      lastErrorTime: 0,
      isRecovering: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<NavigationErrorBoundaryState> {
    const now = Date.now();
    
    // Reset global error count if enough time has passed
    if (now - lastGlobalErrorTime > GLOBAL_ERROR_RESET_TIME) {
      globalNavigationErrors = 0;
    }
    
    globalNavigationErrors++;
    lastGlobalErrorTime = now;

    return {
      hasError: true,
      error,
      lastErrorTime: now,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { context = 'Navigation', onError } = this.props;
    
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Log navigation-specific error details
    EventLogger.error(
      'NavigationErrorBoundary',
      `Navigation error in ${context}`,
      error,
      {
        componentStack: errorInfo.componentStack,
        context,
        errorCount: this.state.errorCount + 1,
        globalNavigationErrors,
        isNavigationCritical: true,
        possibleCauses: [
          'Redux store not properly initialized',
          'Navigation state corruption',
          'Screen component render error',
          'Route configuration issue',
          'Theme or context provider error'
        ]
      }
    );

    // Call custom error handler if provided
    if (onError) {
      try {
        onError(error, errorInfo);
      } catch (handlerError) {
        EventLogger.error(
          'NavigationErrorBoundary',
          'Error in custom navigation error handler',
          handlerError as Error
        );
      }
    }

    // Show alert for critical navigation failures
    if (globalNavigationErrors >= MAX_GLOBAL_NAVIGATION_ERRORS) {
      Alert.alert(
        'Critical Navigation Error',
        'The app navigation system has encountered too many errors. Please restart the app.',
        [
          {
            text: 'Restart App',
            onPress: () => {
              // In development, reload the app
              if (__DEV__) {
                const { DevSettings } = require('react-native');
                DevSettings?.reload?.();
              }
            }
          }
        ]
      );
    } else if (this.state.errorCount >= 3) {
      this.scheduleRecovery();
    }
  }

  componentWillUnmount() {
    if (this.recoveryTimeout) {
      clearTimeout(this.recoveryTimeout);
    }
  }

  private scheduleRecovery = () => {
    const { enableRecovery = true } = this.props;
    
    if (!enableRecovery) return;

    const delay = Math.min(this.state.errorCount * 2000, 10000); // Max 10s delay
    
    EventLogger.info(
      'NavigationErrorBoundary',
      `Scheduling navigation recovery in ${delay}ms`,
      { errorCount: this.state.errorCount, context: this.props.context }
    );

    this.setState({ isRecovering: true });

    this.recoveryTimeout = setTimeout(() => {
      this.handleRecovery();
    }, delay);
  };

  private handleRecovery = () => {
    EventLogger.info(
      'NavigationErrorBoundary',
      'Attempting navigation recovery',
      { context: this.props.context, errorCount: this.state.errorCount }
    );

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isRecovering: false,
    });
  };

  private handleReset = () => {
    EventLogger.info(
      'NavigationErrorBoundary',
      'Manual navigation reset triggered',
      { context: this.props.context }
    );

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      lastErrorTime: 0,
      isRecovering: false,
    });

    // Reset global counters
    globalNavigationErrors = Math.max(0, globalNavigationErrors - 2);
  };

  private handleReportError = () => {
    const { error, errorInfo } = this.state;
    const { context } = this.props;

    Alert.alert(
      'Report Navigation Error',
      'Would you like to send a navigation error report to help us fix this issue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Report',
          onPress: () => {
            EventLogger.critical(
              'NavigationErrorBoundary',
              'User-reported navigation error',
              error!,
              {
                context,
                componentStack: errorInfo?.componentStack,
                userReported: true,
                navigationState: 'error',
                globalNavigationErrors,
              }
            );
            Alert.alert('Report Sent', 'Thank you for helping us improve navigation!');
          },
        },
      ]
    );
  };

  render() {
    if (this.state.isRecovering) {
      return (
        <View style={styles.recoveryContainer}>
          <MaterialCommunityIcons name="refresh" size={48} color="#ff9800" />
          <Text style={styles.recoveryTitle}>Recovering Navigation...</Text>
          <Text style={styles.recoverySubtitle}>Please wait a moment</Text>
        </View>
      );
    }

    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      const { error, errorCount } = this.state;
      const { enableReset = true, context = 'Navigation' } = this.props;
      const isCritical = errorCount >= 3 || globalNavigationErrors >= 5;

      return (
        <View style={styles.container}>
          <MaterialCommunityIcons 
            name="navigation-outline" 
            size={64} 
            color="#f44336" 
            style={styles.icon}
          />
          
          <Text style={styles.title}>Navigation Error</Text>
          
          <Text style={styles.message}>
            {isCritical
              ? `The ${context.toLowerCase()} navigation system has encountered multiple errors.`
              : `The ${context.toLowerCase()} navigation encountered an error and cannot be displayed.`}
          </Text>

          {isCritical && (
            <View style={styles.criticalWarning}>
              <MaterialCommunityIcons name="alert" size={20} color="#ff5722" />
              <Text style={styles.criticalText}>
                Critical navigation failure detected. App restart may be required.
              </Text>
            </View>
          )}

          {__DEV__ && error && (
            <View style={styles.debugContainer}>
              <Text style={styles.debugTitle}>Debug Info:</Text>
              <Text style={styles.debugText}>{error.toString()}</Text>
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={this.handleRecovery}
            >
              <MaterialCommunityIcons name="refresh" size={16} color="#fff" />
              <Text style={styles.primaryButtonText}>Try Again</Text>
            </TouchableOpacity>

            {enableReset && (
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={this.handleReset}
              >
                <MaterialCommunityIcons name="restart" size={16} color="#333" />
                <Text style={styles.secondaryButtonText}>Reset {context}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.button, styles.reportButton]}
              onPress={this.handleReportError}
            >
              <MaterialCommunityIcons name="bug-outline" size={16} color="#fff" />
              <Text style={styles.primaryButtonText}>Report Issue</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.errorMetrics}>
            <Text style={styles.metricsText}>
              Error Count: {errorCount} | Global: {globalNavigationErrors}
            </Text>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 24,
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  criticalWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#ff5722',
  },
  criticalText: {
    fontSize: 14,
    color: '#d32f2f',
    marginLeft: 8,
    flex: 1,
  },
  debugContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    width: '100%',
    maxHeight: 150,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  actions: {
    width: '100%',
    maxWidth: 300,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#6200ee',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  reportButton: {
    backgroundColor: '#f44336',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  recoveryContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    padding: 24,
  },
  recoveryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#856404',
    marginTop: 16,
    marginBottom: 8,
  },
  recoverySubtitle: {
    fontSize: 14,
    color: '#856404',
    opacity: 0.8,
  },
  errorMetrics: {
    marginTop: 20,
    opacity: 0.6,
  },
  metricsText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
});