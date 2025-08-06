import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BaseErrorBoundary, ErrorBoundaryProps } from './BaseErrorBoundary';

interface WidgetErrorBoundaryProps extends Omit<ErrorBoundaryProps, 'level' | 'fallback'> {
  widgetName: string;
  minimal?: boolean;
}

const MinimalErrorFallback: React.FC<{ widgetName: string; onRetry: () => void }> = ({
  widgetName,
  onRetry,
}) => (
  <View style={styles.minimalContainer}>
    <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#ff5252" />
    <Text style={styles.minimalText}>{widgetName} unavailable</Text>
    <TouchableOpacity style={styles.minimalButton} onPress={onRetry}>
      <MaterialCommunityIcons name="refresh" size={16} color="#6200ee" />
    </TouchableOpacity>
  </View>
);

export const WidgetErrorBoundary: React.FC<WidgetErrorBoundaryProps> = ({
  widgetName,
  minimal = false,
  children,
  ...props
}) => {
  const [retryTrigger, setRetryTrigger] = React.useState(0);

  const handleRetry = () => {
    setRetryTrigger(prev => prev + 1);
  };

  if (minimal) {
    return (
      <BaseErrorBoundary
        key={retryTrigger}
        {...props}
        level="widget"
        context={widgetName}
        enableReset={true}
        enableReload={false}
        maxRetries={3}
        showErrorDetails={false}
        fallback={<MinimalErrorFallback widgetName={widgetName} onRetry={handleRetry} />}
      >
        {children}
      </BaseErrorBoundary>
    );
  }

  return (
    <BaseErrorBoundary
      key={retryTrigger}
      {...props}
      level="widget"
      context={widgetName}
      enableReset={true}
      enableReload={false}
      maxRetries={3}
      showErrorDetails={__DEV__}
    >
      {children}
    </BaseErrorBoundary>
  );
};

const styles = StyleSheet.create({
  minimalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#fff3f3',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffcdd2',
    minHeight: 60,
  },
  minimalText: {
    fontSize: 14,
    color: '#d32f2f',
    marginLeft: 8,
    marginRight: 12,
    flex: 1,
  },
  minimalButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f3e5f5',
  },
});

export default WidgetErrorBoundary;