import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { PlatformButton, PlatformCard, usePlatform } from './index';

/**
 * Simple test component to verify platform-aware components work with existing theme system
 */
export const PlatformAwareTest: React.FC = () => {
  const platform = usePlatform();
  const [buttonPressed, setButtonPressed] = useState(false);

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
      <PlatformCard>
        <Text style={{ fontSize: 18, marginBottom: 16, textAlign: 'center' }}>
          Platform-Aware Components Test
        </Text>
        
        <Text style={{ marginBottom: 16, textAlign: 'center' }}>
          Current Platform: {platform.isIOS ? 'iOS' : platform.isAndroid ? 'Android' : 'Web'}
        </Text>
        
        <Text style={{ marginBottom: 16, textAlign: 'center' }}>
          Supports Haptics: {platform.supportsHaptics ? 'Yes' : 'No'}
        </Text>
        
        {buttonPressed && (
          <Text style={{ marginBottom: 16, textAlign: 'center', color: 'green' }}>
            Button was pressed! ✓
          </Text>
        )}
        
        <PlatformButton
          label="Test Platform Button"
          variant="primary"
          onPress={() => setButtonPressed(true)}
          fullWidth
        />
      </PlatformCard>
    </View>
  );
};