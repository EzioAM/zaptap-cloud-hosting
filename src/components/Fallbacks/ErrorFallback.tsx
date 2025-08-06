import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeTheme } from '../common/ThemeFallbackWrapper';

interface ErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
  message?: string;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  message = 'Something went wrong'
}) => {
  const theme = useSafeTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <MaterialCommunityIcons
        name="alert-circle-outline"
        size={48}
        color={theme.colors.error}
      />
      <Text style={[styles.title, { color: theme.colors.onBackground }]}>
        {message}
      </Text>
      {error && (
        <Text style={[styles.errorText, { color: theme.colors.onSurfaceVariant }]}>
          {error.message}
        </Text>
      )}
      {resetError && (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
          onPress={resetError}
        >
          <Text style={[styles.buttonText, { color: theme.colors.onPrimary }]}>
            Try Again
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ErrorFallback;