import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeTheme } from '../common/ThemeFallbackWrapper';

interface NetworkErrorFallbackProps {
  onRetry?: () => void;
  message?: string;
}

export const NetworkErrorFallback: React.FC<NetworkErrorFallbackProps> = ({
  onRetry,
  message = 'Network connection error'
}) => {
  const theme = useSafeTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <MaterialCommunityIcons
        name="wifi-off"
        size={48}
        color={theme.colors.error}
      />
      <Text style={[styles.title, { color: theme.colors.onBackground }]}>
        {message}
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
        Please check your internet connection
      </Text>
      {onRetry && (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
          onPress={onRetry}
        >
          <Text style={[styles.buttonText, { color: theme.colors.onPrimary }]}>
            Retry
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
  subtitle: {
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

export default NetworkErrorFallback;