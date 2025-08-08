/**
 * Error Boundaries - Fixed constructor issues
 * Catches and handles errors at different levels of the component tree
 */

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { EventLogger } from '../utils/EventLogger';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  context?: string;
  level?: 'screen' | 'component' | 'navigation';
  showDetails?: boolean;
}

/**
 * Base Error Boundary Component
 */
export class BaseErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, context = 'Unknown' } = this.props;
    
    EventLogger.error('ErrorBoundary', `Error caught in ${context}:`, error, {
      componentStack: errorInfo.componentStack,
      context,
      level: this.props.level || 'component',
    });

    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    if (onError) {
      onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.handleReset}
          context={this.props.context}
          level={this.props.level}
          showDetails={this.props.showDetails}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Navigation-specific Error Boundary - Fixed constructor
 */
export class NavigationErrorBoundary extends BaseErrorBoundary {
  constructor(props: ErrorBoundaryProps) {
    // Pass the props directly to super, don't wrap them
    super(props);
  }
}

/**
 * Screen-level Error Boundary - Fixed constructor
 */
export class ScreenErrorBoundary extends BaseErrorBoundary {
  constructor(props: ErrorBoundaryProps) {
    // Pass the props directly to super, don't wrap them
    super(props);
  }
}

/**
 * Widget-level Error Boundary for dashboard widgets
 */
export class WidgetErrorBoundary extends BaseErrorBoundary {
  constructor(props: ErrorBoundaryProps & { widgetName?: string; minimal?: boolean }) {
    super(props);
  }

  render() {
    if (this.state.hasError) {
      const { widgetName = 'Widget', minimal = false } = this.props;
      
      if (minimal) {
        return (
          <View style={styles.minimalErrorContainer}>
            <MaterialCommunityIcons 
              name="alert-circle" 
              size={20} 
              color="#B00020" 
            />
            <Text style={styles.minimalErrorText}>
              {widgetName} unavailable
            </Text>
          </View>
        );
      }
      
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.handleReset}
          context={widgetName}
          level="widget"
          showDetails={false}
          title={`${widgetName} Error`}
          showRetry={true}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Error Fallback Component
 */
interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReset?: () => void;
  context?: string;
  level?: string;
  showDetails?: boolean;
  title?: string;
  message?: string;
  icon?: string;
  showRetry?: boolean;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  onReset,
  context = 'Application',
  level = 'component',
  showDetails = __DEV__,
  title,
  message,
  icon = 'alert-circle-outline',
  showRetry = true,
}) => {
  const errorTitle = title || `${context} Error`;
  const errorMessage = message || error?.message || 'An unexpected error occurred';

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <MaterialCommunityIcons
          name={icon as any}
          size={64}
          color="#B00020"
          style={styles.icon}
        />
        
        <Text style={styles.title}>{errorTitle}</Text>
        <Text style={styles.message}>{errorMessage}</Text>
        
        {showDetails && error && (
          <ScrollView style={styles.detailsContainer}>
            <Text style={styles.detailsTitle}>Error Details:</Text>
            <Text style={styles.detailsText}>{error.toString()}</Text>
            
            {errorInfo && (
              <>
                <Text style={styles.detailsTitle}>Component Stack:</Text>
                <Text style={styles.detailsText}>
                  {errorInfo.componentStack?.slice(0, 500)}...
                </Text>
              </>
            )}
          </ScrollView>
        )}
        
        {showRetry && onReset && (
          <TouchableOpacity style={styles.button} onPress={onReset}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

/**
 * Loading Fallback Component
 */
export const LoadingFallback: React.FC<{ message?: string }> = ({ 
  message = 'Loading...' 
}) => {
  return (
    <View style={styles.loadingContainer}>
      <MaterialCommunityIcons
        name="loading"
        size={48}
        color="#6200ee"
        style={styles.loadingIcon}
      />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  content: {
    maxWidth: 400,
    width: '100%',
    alignItems: 'center',
  },
  icon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#B00020',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  detailsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    maxHeight: 200,
    width: '100%',
    marginBottom: 20,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  detailsText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: '#6200ee',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingIcon: {
    marginBottom: 15,
  },
  loadingText: {
    fontSize: 16,
    color: '#6200ee',
  },
  // Widget Error Boundary styles
  minimalErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 8,
  },
  minimalErrorText: {
    fontSize: 14,
    color: '#B00020',
    marginLeft: 8,
  },
});