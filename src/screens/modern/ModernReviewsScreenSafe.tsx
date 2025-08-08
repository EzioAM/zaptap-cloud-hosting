import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BaseErrorBoundary } from '../../components/ErrorBoundaries';
import { ErrorFallback } from '../../components/Fallbacks';
import { EventLogger } from '../../utils/EventLogger';
import ModernReviewsScreen from './ModernReviewsScreen';

// Safe wrapper for ModernReviewsScreen with error boundary
const ModernReviewsScreenSafe: React.FC = () => {
  return (
    <BaseErrorBoundary
      context="ModernReviewsScreen"
      level="screen"
      onError={(error, errorInfo) => {
        EventLogger.error('ModernReviews', 'Screen error caught', error, {
          componentStack: errorInfo.componentStack,
        });
      }}
      fallback={
        <ErrorFallback
          title="Reviews Error"
          message="Unable to load reviews. Please try again."
          icon="star-box-multiple"
          onRetry={() => {
            // Trigger a re-render
            window.location.reload();
          }}
          showRetry={true}
        />
      }
    >
      <ModernReviewsScreen />
    </BaseErrorBoundary>
  );
};

export default ModernReviewsScreenSafe;