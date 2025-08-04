/**
 * Example usage of the Button component
 * This demonstrates all available variants and configurations
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button } from './Button';
import { theme } from '../../../theme';

export const ButtonExamples = () => {
  return (
    <View style={styles.container}>
      {/* Primary Variants */}
      <View style={styles.section}>
        <Button
          variant="primary"
          size="large"
          label="Get Started"
          onPress={() => console.log('Primary pressed')}
          icon="rocket-launch"
        />
        
        <Button
          variant="secondary"
          size="medium"
          label="Learn More"
          onPress={() => console.log('Secondary pressed')}
          icon="information"
          iconPosition="right"
        />
        
        <Button
          variant="accent"
          size="medium"
          label="Success Action"
          onPress={() => console.log('Accent pressed')}
          icon="check-circle"
        />
      </View>

      {/* Outline and Ghost Variants */}
      <View style={styles.section}>
        <Button
          variant="outline"
          size="medium"
          label="Cancel"
          onPress={() => console.log('Outline pressed')}
        />
        
        <Button
          variant="ghost"
          size="medium"
          label="Skip"
          onPress={() => console.log('Ghost pressed')}
        />
        
        <Button
          variant="danger"
          size="medium"
          label="Delete"
          onPress={() => console.log('Danger pressed')}
          icon="trash-can"
        />
      </View>

      {/* Different Sizes */}
      <View style={styles.section}>
        <Button
          variant="primary"
          size="small"
          label="Small"
          onPress={() => console.log('Small pressed')}
        />
        
        <Button
          variant="primary"
          size="medium"
          label="Medium"
          onPress={() => console.log('Medium pressed')}
        />
        
        <Button
          variant="primary"
          size="large"
          label="Large"
          onPress={() => console.log('Large pressed')}
        />
      </View>

      {/* States */}
      <View style={styles.section}>
        <Button
          variant="primary"
          size="medium"
          label="Loading..."
          onPress={() => console.log('Loading pressed')}
          loading
        />
        
        <Button
          variant="primary"
          size="medium"
          label="Disabled"
          onPress={() => console.log('Disabled pressed')}
          disabled
        />
        
        <Button
          variant="primary"
          size="medium"
          label="Full Width"
          onPress={() => console.log('Full width pressed')}
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