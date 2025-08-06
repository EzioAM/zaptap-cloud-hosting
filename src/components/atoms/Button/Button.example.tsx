/**
 * Example usage of the Button component
 * This demonstrates all available variants and configurations
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button } from './Button';
import { theme } from '../../../theme';
import { EventLogger } from '../../../utils/EventLogger';

export const ButtonExamples = () => {
  return (
    <View style={styles.container}>
      {/* Primary Variants */}
      <View style={styles.section}>
        <Button
          variant="primary"
          size="large"
          label="Get Started"
          onPress={() => EventLogger.debug('Button.example', 'Primary pressed');}
          icon="rocket-launch"
        />
        
        <Button
          variant="secondary"
          size="medium"
          label="Learn More"
          onPress={() => EventLogger.debug('Button.example', 'Secondary pressed');}
          icon="information"
          iconPosition="right"
        />
        
        <Button
          variant="accent"
          size="medium"
          label="Success Action"
          onPress={() => EventLogger.debug('Button.example', 'Accent pressed');}
          icon="check-circle"
        />
      </View>

      {/* Outline and Ghost Variants */}
      <View style={styles.section}>
        <Button
          variant="outline"
          size="medium"
          label="Cancel"
          onPress={() => EventLogger.debug('Button.example', 'Outline pressed');}
        />
        
        <Button
          variant="ghost"
          size="medium"
          label="Skip"
          onPress={() => EventLogger.debug('Button.example', 'Ghost pressed');}
        />
        
        <Button
          variant="danger"
          size="medium"
          label="Delete"
          onPress={() => EventLogger.debug('Button.example', 'Danger pressed');}
          icon="trash-can"
        />
      </View>

      {/* Different Sizes */}
      <View style={styles.section}>
        <Button
          variant="primary"
          size="small"
          label="Small"
          onPress={() => EventLogger.debug('Button.example', 'Small pressed');}
        />
        
        <Button
          variant="primary"
          size="medium"
          label="Medium"
          onPress={() => EventLogger.debug('Button.example', 'Medium pressed');}
        />
        
        <Button
          variant="primary"
          size="large"
          label="Large"
          onPress={() => EventLogger.debug('Button.example', 'Large pressed');}
        />
      </View>

      {/* States */}
      <View style={styles.section}>
        <Button
          variant="primary"
          size="medium"
          label="Loading..."
          onPress={() => EventLogger.debug('Button.example', 'Loading pressed');}
          loading
        />
        
        <Button
          variant="primary"
          size="medium"
          label="Disabled"
          onPress={() => EventLogger.debug('Button.example', 'Disabled pressed');}
          disabled
        />
        
        <Button
          variant="primary"
          size="medium"
          label="Full Width"
          onPress={() => EventLogger.debug('Button.example', 'Full width pressed');}
          fullWidth
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.lg,
    backgroundColor: '#f5f5f5',
  },
  section: {
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
});