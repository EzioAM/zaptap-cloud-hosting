import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { EventLogger } from '../../utils/EventLogger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

/**
 * Component-level error boundary for React components
 * Provides graceful error handling with retry functionality
 */
export class ComponentErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`ComponentErrorBoundary caught error in ${this.props.componentName || 'component'}:`, error, errorInfo);
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to analytics/crash reporting service
    try {
      // Add your analytics logging here
      EventLogger.error('ErrorBoundary', 'Component error details:', {
        componentName: this.props.componentName,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        retryCount: this.state.retryCount,
      } as Error);
    } catch (analyticsError) {
      EventLogger.error('ErrorBoundary', 'Failed to log component error:', analyticsError as Error);
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      retryCount: prevState.retryCount + 1,
    }));
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      const { error, retryCount } = this.state;
      const componentName = this.props.componentName || 'Component';

      return (
        <View style={styles.container}>
          <MaterialCommunityIcons 
            name="alert-circle-outline" 
            size={48} 
            color="#ff5252" 
            style={styles.icon}
          />
          
          <Text style={styles.title}>
            {componentName} Error
          </Text>
          
          <Text style={styles.message}>
            Something went wrong with this component. You can try refreshing it.
          </Text>

          {__DEV__ && error && (
            <View style={styles.errorDetails}>
              <Text style={styles.errorMessage}>{error.message}</Text>
            </View>
          )}

          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={this.handleRetry}
          >
            <MaterialCommunityIcons name="refresh" size={20} color="#fff" />
            <Text style={styles.retryButtonText}>
              Try Again {retryCount > 0 && `(${retryCount})`}
            </Text>
          </TouchableOpacity>

          {retryCount > 2 && (
            <Text style={styles.persistentError}>
              This component keeps failing. Please refresh the entire app.
            </Text>
          )}
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
    padding: 16,
    backgroundColor: '#f5f5f5',
    minHeight: 120,
  },
  icon: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  errorDetails: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
    maxWidth: '100%',
  },
  errorMessage: {
    fontSize: 12,
    color: '#ff5252',
    fontFamily: 'monospace',
  },
  retryButton: {
    backgroundColor: '#6200ee',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  persistentError: {
    fontSize: 12,
    color: '#ff5252',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
});

export default ComponentErrorBoundary;