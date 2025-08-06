import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import { EventLogger } from '../../utils/EventLogger';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableReset?: boolean;
  enableReload?: boolean;
  context?: string;
  level?: 'screen' | 'component' | 'widget' | 'network';
  maxRetries?: number;
  showErrorDetails?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
  retryCount: number;
  errorId: string;
}

export class BaseErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeout?: NodeJS.Timeout;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      retryCount: 0,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { context = 'Unknown', level = 'component', onError } = this.props;
    
    // Update state with error details
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Log error with context
    EventLogger.error(
      `ErrorBoundary_${level}`,
      `Error caught in ${context}`,
      error,
      {
        componentStack: errorInfo.componentStack,
        errorBoundaryLevel: level,
        errorCount: this.state.errorCount + 1,
        retryCount: this.state.retryCount,
        context,
        errorId: this.state.errorId,
      }
    );

    // Call custom error handler if provided
    if (onError) {
      try {
        onError(error, errorInfo);
      } catch (handlerError) {
        EventLogger.error(
          'ErrorBoundary',
          'Error in custom error handler',
          handlerError as Error
        );
      }
    }

    // Auto-retry for transient errors (up to maxRetries)
    const { maxRetries = 3 } = this.props;
    if (this.isTransientError(error) && this.state.retryCount < maxRetries) {
      this.scheduleRetry();
    }
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  private isTransientError = (error: Error): boolean => {
    const transientPatterns = [
      'Network request failed',
      'fetch',
      'timeout',
      'connection',
      'AbortError',
      'NetworkError',
    ];
    
    return transientPatterns.some(pattern => 
      error.message.toLowerCase().includes(pattern.toLowerCase())
    );
  };

  private scheduleRetry = () => {
    const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 10000); // Exponential backoff, max 10s
    
    EventLogger.info(
      'ErrorBoundary',
      `Scheduling retry in ${delay}ms`,
      { retryCount: this.state.retryCount, delay }
    );

    this.retryTimeout = setTimeout(() => {
      this.handleRetry();
    }, delay);
  };

  private handleReset = () => {
    EventLogger.info(
      'ErrorBoundary', 
      'Manual reset triggered',
      { context: this.props.context, errorId: this.state.errorId }
    );

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      retryCount: 0,
      errorId: '',
    });
  };

  private handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
    }));

    EventLogger.info(
      'ErrorBoundary',
      'Retry attempt executed',
      { retryCount: this.state.retryCount + 1, context: this.props.context }
    );
  };

  private handleReload = async () => {
    try {
      EventLogger.info('ErrorBoundary', 'App reload initiated');
      
      if (Updates.isAvailable) {
        await Updates.reloadAsync();
      } else {
        // If updates module is not available, just reset
        this.handleReset();
      }
    } catch (error) {
      EventLogger.error('ErrorBoundary', 'Failed to reload app', error as Error);
      this.handleReset();
    }
  };

  private handleSendReport = () => {
    const { error, errorInfo, errorId } = this.state;
    const { context } = this.props;

    Alert.alert(
      'Send Error Report',
      'Would you like to send an error report to help us fix this issue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Report',
          onPress: () => {
            EventLogger.critical(
              'ErrorBoundary',
              'User-submitted error report',
              error!,
              {
                context,
                errorId,
                componentStack: errorInfo?.componentStack,
                userReported: true,
              }
            );
            Alert.alert('Report Sent', 'Thank you for helping us improve the app!');
          },
        },
      ]
    );
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      const { error, errorCount, retryCount } = this.state;
      const { 
        enableReset = true, 
        enableReload = true, 
        context = 'Component',
        level = 'component',
        maxRetries = 3,
        showErrorDetails = __DEV__
      } = this.props;

      const isDevelopment = __DEV__;
      const canRetry = retryCount < maxRetries;
      const isPersistentError = errorCount > 2;

      return (
        <View style={[styles.container, this.getContainerStyle(level)]}>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <MaterialCommunityIcons 
              name={this.getErrorIcon(level)} 
              size={this.getIconSize(level)} 
              color="#ff5252" 
              style={styles.icon}
            />
            
            <Text style={[styles.title, this.getTitleStyle(level)]}>
              {this.getErrorTitle(level, context)}
            </Text>
            
            <Text style={[styles.message, this.getMessageStyle(level)]}>
              {this.getErrorMessage(level, isPersistentError)}
            </Text>

            {showErrorDetails && error && (
              <View style={styles.errorDetails}>
                <Text style={styles.errorTitle}>Error Details (Development Only):</Text>
                <Text style={styles.errorMessage}>{error.toString()}</Text>
                
                {error.stack && (
                  <ScrollView style={styles.stackTrace} nestedScrollEnabled>
                    <Text style={styles.stackText}>{error.stack}</Text>
                  </ScrollView>
                )}
              </View>
            )}

            <View style={styles.actions}>
              {canRetry && (
                <TouchableOpacity 
                  style={[styles.button, styles.primaryButton]} 
                  onPress={this.handleRetry}
                >
                  <MaterialCommunityIcons name="refresh" size={16} color="#fff" />
                  <Text style={styles.primaryButtonText}>
                    Try Again {retryCount > 0 && `(${retryCount + 1}/${maxRetries + 1})`}
                  </Text>
                </TouchableOpacity>
              )}

              {enableReset && (
                <TouchableOpacity 
                  style={[styles.button, styles.secondaryButton]} 
                  onPress={this.handleReset}
                >
                  <MaterialCommunityIcons name="restart" size={16} color="#333" />
                  <Text style={styles.secondaryButtonText}>Reset {context}</Text>
                </TouchableOpacity>
              )}

              {enableReload && level === 'screen' && (
                <TouchableOpacity 
                  style={[styles.button, styles.warningButton]} 
                  onPress={this.handleReload}
                >
                  <MaterialCommunityIcons name="reload" size={16} color="#fff" />
                  <Text style={styles.primaryButtonText}>Reload App</Text>
                </TouchableOpacity>
              )}

              {isPersistentError && (
                <TouchableOpacity 
                  style={[styles.button, styles.reportButton]} 
                  onPress={this.handleSendReport}
                >
                  <MaterialCommunityIcons name="bug-outline" size={16} color="#fff" />
                  <Text style={styles.primaryButtonText}>Send Report</Text>
                </TouchableOpacity>
              )}
            </View>

            {isPersistentError && (
              <View style={styles.persistentErrorContainer}>
                <Text style={styles.persistentError}>
                  This error keeps happening. Please contact support if it persists.
                </Text>
                <Text style={styles.errorId}>Error ID: {this.state.errorId}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }

  private getErrorIcon = (level: string): string => {
    switch (level) {
      case 'screen': return 'alert-circle';
      case 'network': return 'wifi-off';
      case 'widget': return 'puzzle-outline';
      default: return 'alert-outline';
    }
  };

  private getIconSize = (level: string): number => {
    switch (level) {
      case 'screen': return 80;
      case 'network': return 60;
      case 'widget': return 40;
      default: return 50;
    }
  };

  private getErrorTitle = (level: string, context: string): string => {
    switch (level) {
      case 'screen': return `${context} Not Available`;
      case 'network': return 'Connection Problem';
      case 'widget': return `${context} Error`;
      default: return 'Something Went Wrong';
    }
  };

  private getErrorMessage = (level: string, isPersistent: boolean): string => {
    const baseMessages = {
      screen: 'This screen encountered an error and cannot be displayed.',
      network: 'Unable to connect to the server. Please check your internet connection.',
      widget: 'This component failed to load properly.',
      component: 'A component encountered an unexpected error.',
    };

    const message = baseMessages[level as keyof typeof baseMessages] || baseMessages.component;
    
    if (isPersistent) {
      return `${message} This error has occurred multiple times.`;
    }
    
    return message;
  };

  private getContainerStyle = (level: string) => {
    switch (level) {
      case 'screen': return { minHeight: 400 };
      case 'widget': return { minHeight: 120, padding: 16 };
      default: return {};
    }
  };

  private getTitleStyle = (level: string) => {
    switch (level) {
      case 'screen': return { fontSize: 24 };
      case 'widget': return { fontSize: 16 };
      default: return { fontSize: 20 };
    }
  };

  private getMessageStyle = (level: string) => {
    switch (level) {
      case 'widget': return { fontSize: 14, marginBottom: 16 };
      default: return {};
    }
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
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
  warningButton: {
    backgroundColor: '#ff9800',
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
  errorDetails: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    maxHeight: 300,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 12,
    color: '#ff5252',
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  stackTrace: {
    maxHeight: 200,
  },
  stackText: {
    fontSize: 10,
    color: '#666',
    fontFamily: 'monospace',
  },
  persistentErrorContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  persistentError: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  errorId: {
    fontSize: 12,
    color: '#856404',
    textAlign: 'center',
    fontFamily: 'monospace',
  },
});