import React from 'react';
import { BaseErrorBoundary, ErrorBoundaryProps } from './BaseErrorBoundary';

interface ScreenErrorBoundaryProps extends Omit<ErrorBoundaryProps, 'level'> {
  screenName: string;
}

export const ScreenErrorBoundary: React.FC<ScreenErrorBoundaryProps> = ({
  screenName,
  ...props
}) => {
  return (
    <BaseErrorBoundary
      {...props}
      level="screen"
      context={screenName}
      enableReset={true}
      enableReload={true}
      maxRetries={2}
      showErrorDetails={__DEV__}
    />
  );
};

export default ScreenErrorBoundary;