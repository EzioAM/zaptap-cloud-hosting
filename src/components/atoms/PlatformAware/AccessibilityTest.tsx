import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { EventLogger } from '../../../utils/EventLogger';
import { 
  PlatformButton, 
  PlatformCard, 
  PlatformInput, 
  PlatformModal,
  usePlatform 
} from './index';

/**
 * Accessibility test component to validate WCAG compliance and screen reader support
 */
export const AccessibilityTest: React.FC = () => {
  const platform = usePlatform();
  const [modalVisible, setModalVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [formSubmitted, setFormSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!inputValue.trim()) {
      Alert.alert('Error', 'Please enter a valid email address', [
        { text: 'OK', onPress: () => EventLogger.debug('AccessibilityTest', 'Error acknowledged'); }
      ]);
      return;
    }
    
    setFormSubmitted(true);
    Alert.alert('Success', 'Form submitted successfully!', [
      { text: 'OK', onPress: () => setFormSubmitted(false) }
    ]);
  };

  return (
    <View 
      style={{ flex: 1, padding: 20 }}
      accessible={true}
      accessibilityLabel="Accessibility test screen"
    >
      <Text 
        style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}
        accessible={true}
        accessibilityRole="header"
        accessibilityLevel={1}
      >
        Accessibility Test Suite
      </Text>

      {/* Platform info with accessibility */}
      <PlatformCard 
        style={{ marginBottom: 20 }}
        accessible={true}
        accessibilityLabel={`Platform information. Current platform: ${platform.isIOS ? 'iOS' : platform.isAndroid ? 'Android' : 'Web'}`}
        accessibilityHint="Displays current platform detection results"
      >
        <Text style={{ fontSize: 16, marginBottom: 10 }}>
          Platform Detection Results:
        </Text>
        <Text>• Platform: {platform.isIOS ? 'iOS' : platform.isAndroid ? 'Android' : 'Web'}</Text>
        <Text>• Haptics: {platform.supportsHaptics ? 'Supported' : 'Not supported'}</Text>
        <Text>• Gestures: {platform.supportsGestures ? 'Supported' : 'Not supported'}</Text>
      </PlatformCard>

      {/* Form with accessibility */}
      <PlatformCard 
        style={{ marginBottom: 20 }}
        accessible={true}
        accessibilityLabel="Email subscription form"
        accessibilityHint="Form to subscribe to newsletter"
      >
        <Text 
          style={{ fontSize: 18, fontWeight: '600', marginBottom: 15 }}
          accessible={true}
          accessibilityRole="header"
          accessibilityLevel={2}
        >
          Newsletter Subscription
        </Text>

        <PlatformInput
          label="Email Address"
          placeholder="Enter your email"
          value={inputValue}
          onChangeText={setInputValue}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          leftIcon="email"
          required
          accessibilityLabel="Email address input field"
          accessibilityHint="Enter your email address to subscribe to our newsletter"
          accessibilityRequired={true}
          style={{ marginBottom: 15 }}
        />

        <PlatformButton
          label={formSubmitted ? "Submitting..." : "Subscribe"}
          variant="primary"
          onPress={handleSubmit}
          loading={formSubmitted}
          disabled={!inputValue.trim()}
          fullWidth
          accessibilityLabel="Subscribe to newsletter button"
          accessibilityHint={
            !inputValue.trim() 
              ? "Button is disabled. Please enter an email address first"
              : "Tap to subscribe to the newsletter with the entered email address"
          }
          accessibilityState={{
            disabled: !inputValue.trim(),
            busy: formSubmitted
          }}
        />
      </PlatformCard>

      {/* Interactive elements with accessibility */}
      <PlatformCard 
        style={{ marginBottom: 20 }}
        accessible={true}
        accessibilityLabel="Interactive controls section"
      >
        <Text 
          style={{ fontSize: 18, fontWeight: '600', marginBottom: 15 }}
          accessible={true}
          accessibilityRole="header"
          accessibilityLevel={2}
        >
          Interactive Controls
        </Text>

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15, flexWrap: 'wrap' }}>
          <PlatformButton
            label="Primary"
            variant="primary"
            size="small"
            onPress={() => Alert.alert('Primary', 'Primary button pressed')}
            accessibilityLabel="Primary action button"
            accessibilityHint="Performs the main action"
          />
          
          <PlatformButton
            label="Secondary"
            variant="secondary"
            size="small"
            onPress={() => Alert.alert('Secondary', 'Secondary button pressed')}
            accessibilityLabel="Secondary action button"
            accessibilityHint="Performs a secondary action"
          />
          
          <PlatformButton
            label="Danger"
            variant="danger"
            size="small"
            onPress={() => Alert.alert('Danger', 'Danger action confirmed')}
            accessibilityLabel="Destructive action button"
            accessibilityHint="Performs a destructive action. Use with caution."
            accessibilityState={{ expanded: false }}
          />
        </View>

        <PlatformButton
          label="Open Modal"
          variant="accent"
          onPress={() => setModalVisible(true)}
          fullWidth
          accessibilityLabel="Open modal dialog button"
          accessibilityHint="Opens a modal dialog with additional options"
        />
      </PlatformCard>

      {/* Status announcement */}
      {formSubmitted && (
        <View 
          accessible={true}
          accessibilityLiveRegion="polite"
          accessibilityLabel="Form submission in progress"
        >
          <Text style={{ textAlign: 'center', fontStyle: 'italic', color: 'blue' }}>
            Processing your subscription...
          </Text>
        </View>
      )}

      {/* Modal with accessibility */}
      <PlatformModal
        isVisible={modalVisible}
        onClose={() => setModalVisible(false)}
        presentationStyle="card"
        accessibilityViewIsModal={true}
      >
        <View 
          style={{ padding: 24 }}
          accessible={true}
          accessibilityLabel="Modal dialog content"
        >
          <Text 
            style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' }}
            accessible={true}
            accessibilityRole="header"
            accessibilityLevel={1}
          >
            Modal Dialog
          </Text>
          
          <Text 
            style={{ marginBottom: 20, textAlign: 'center', lineHeight: 22 }}
            accessible={true}
          >
            This modal demonstrates accessible dialog patterns with proper focus management and screen reader support.
          </Text>
          
          <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center' }}>
            <PlatformButton
              label="Cancel"
              variant="secondary"
              onPress={() => setModalVisible(false)}
              accessibilityLabel="Cancel and close modal"
              accessibilityHint="Closes the modal without performing any action"
            />
            
            <PlatformButton
              label="Confirm"
              variant="primary"
              onPress={() => {
                setModalVisible(false);
                Alert.alert('Confirmed', 'Action confirmed!');
              }}
              accessibilityLabel="Confirm action"
              accessibilityHint="Confirms the action and closes the modal"
            />
          </View>
        </View>
      </PlatformModal>

      {/* Instructions for testing */}
      <PlatformCard style={{ marginTop: 20 }}>
        <Text 
          style={{ fontSize: 16, fontWeight: '600', marginBottom: 10 }}
          accessible={true}
          accessibilityRole="header"
          accessibilityLevel={3}
        >
          Accessibility Testing Instructions
        </Text>
        <Text style={{ lineHeight: 20 }}>
          • Enable VoiceOver (iOS) or TalkBack (Android)
          {'\n'}• Navigate using screen reader gestures
          {'\n'}• Test form input with voice control
          {'\n'}• Verify focus management in modals
          {'\n'}• Check color contrast and text scaling
        </Text>
      </PlatformCard>
    </View>
  );
};