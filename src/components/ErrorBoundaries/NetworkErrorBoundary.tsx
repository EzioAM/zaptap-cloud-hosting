import React from 'react';
import { BaseErrorBoundary, ErrorBoundaryProps } from './BaseErrorBoundary';
import { EventLogger } from '../../utils/EventLogger';

interface NetworkErrorBoundaryProps extends Omit<ErrorBoundaryProps, 'level'> {
  networkContext: string;
  onNetworkError?: (error: Error) => void;
}

export const NetworkErrorBoundary: React.FC<NetworkErrorBoundaryProps> = ({
  networkContext,
  onNetworkError,
  ...props
}) => {
  const handleNetworkError = (error: Error, errorInfo: any) => {
    // Log network-specific error details
    EventLogger.error(
      'NetworkError',
      `Network error in ${networkContext}`,
      error,
      {
        networkContext,
        isNetworkError: true,
        userAgent: navigator?.userAgent,
        connectionType: (navigator as any)?.connection?.effectiveType,
        onlineStatus: navigator?.onLine,
      }
    );

    // Call custom network error handler if provided
    if (onNetworkError) {
      try {
        onNetworkError(error);
      } catch (handlerError) {
        EventLogger.error(
          'NetworkError',
          'Error in network error handler',
          handlerError as Error
        );
      }
    }

    // Call original error handler if provided
    if (props.onError) {
      props.onError(error, errorInfo);
    }
  };

  return (
    <BaseErrorBoundary
      {...props}
      level="network"
      context={networkContext}
      onError={handleNetworkError}
      enableReset={true}
      enableReload={false}
      maxRetries={5}
      showErrorDetails={__DEV__}
    />
  );
};

export default NetworkErrorBoundary;