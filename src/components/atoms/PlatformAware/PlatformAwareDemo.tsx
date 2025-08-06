import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import {
  PlatformButton,
  PlatformCard,
  PlatformInput,
  PlatformModal,
  BottomSheetModal,
  CardModal,
  PopupModal,
} from './index';
import { usePlatform } from '../../../hooks/usePlatform';
import { useSafeTheme } from '../../common/ThemeFallbackWrapper';
import { EventLogger } from '../../../utils/EventLogger';

/**
 * Demo component showcasing all platform-aware components
 * This demonstrates how components automatically adapt to iOS, Android, and Web
 */
export const PlatformAwareDemo: React.FC = () => {
  const platform = usePlatform();
  const theme = useSafeTheme();
  const colors = theme.colors;

  // Modal states
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);
  const [isCardModalVisible, setIsCardModalVisible] = useState(false);
  const [isPopupModalVisible, setIsPopupModalVisible] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    scrollContent: {
      padding: 16,
    },
    section: {
      marginBottom: 32,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 16,
    },
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    column: {
      marginBottom: 16,
    },
    infoCard: {
      marginBottom: 16,
    },
    infoText: {
      fontSize: 14,
      color: colors.text.secondary,
      lineHeight: 20,
    },
    modalContent: {
      padding: 24,
      alignItems: 'center',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 16,
      textAlign: 'center',
    },
    modalText: {
      fontSize: 16,
      color: colors.text.secondary,
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 22,
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Platform Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Platform Information</Text>
          <PlatformCard style={styles.infoCard}>
            <Text style={styles.infoText}>
              Current Platform: {platform.isIOS ? 'iOS' : platform.isAndroid ? 'Android' : 'Web'}{'\n'}
              Is Mobile: {platform.isMobile ? 'Yes' : 'No'}{'\n'}
              Is Tablet: {platform.isTablet ? 'Yes' : 'No'}{'\n'}
              Supports Haptics: {platform.supportsHaptics ? 'Yes' : 'No'}{'\n'}
              Supports Gestures: {platform.supportsGestures ? 'Yes' : 'No'}{'\n'}
              Supports Blur: {platform.supportsBlur ? 'Yes' : 'No'}
            </Text>
          </PlatformCard>
        </View>

        {/* Platform Buttons Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Platform Buttons</Text>
          <Text style={styles.infoText}>
            These buttons automatically adapt their appearance and behavior based on the platform:
            {'\n'}• iOS: System-style with scale animation
            {'\n'}• Android: Material Design with ripple effect
            {'\n'}• Web: Hover states and cursor changes
          </Text>
          
          <View style={styles.row}>
            <PlatformButton
              label="Primary"
              variant="primary"
              onPress={() => EventLogger.debug('PlatformAwareDemo', 'Primary pressed');}
            />
            <PlatformButton
              label="Secondary"
              variant="secondary"
              onPress={() => EventLogger.debug('PlatformAwareDemo', 'Secondary pressed');}
            />
            <PlatformButton
              label="Accent"
              variant="accent"
              onPress={() => EventLogger.debug('PlatformAwareDemo', 'Accent pressed');}
            />
          </View>

          <View style={styles.row}>
            <PlatformButton
              label="Ghost"
              variant="ghost"
              onPress={() => EventLogger.debug('PlatformAwareDemo', 'Ghost pressed');}
            />
            <PlatformButton
              label="Outline"
              variant="outline"
              onPress={() => EventLogger.debug('PlatformAwareDemo', 'Outline pressed');}
            />
            <PlatformButton
              label="System"
              variant="system"
              onPress={() => EventLogger.debug('PlatformAwareDemo', 'System pressed');}
            />
          </View>

          <View style={styles.row}>
            <PlatformButton
              label="Small"
              size="small"
              onPress={() => EventLogger.debug('PlatformAwareDemo', 'Small pressed');}
            />
            <PlatformButton
              label="Medium"
              size="medium"
              onPress={() => EventLogger.debug('PlatformAwareDemo', 'Medium pressed');}
            />
            <PlatformButton
              label="Large"
              size="large"
              onPress={() => EventLogger.debug('PlatformAwareDemo', 'Large pressed');}
            />
          </View>

          <View style={styles.row}>
            <PlatformButton
              label="With Icon"
              icon="star"
              onPress={() => EventLogger.debug('PlatformAwareDemo', 'Icon pressed');}
            />
            <PlatformButton
              label="Loading"
              loading={true}
              onPress={() => EventLogger.debug('PlatformAwareDemo', 'Loading pressed');}
            />
            <PlatformButton
              label="Disabled"
              disabled={true}
              onPress={() => EventLogger.debug('PlatformAwareDemo', 'Disabled pressed');}
            />
          </View>
        </View>

        {/* Platform Cards Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Platform Cards</Text>
          <Text style={styles.infoText}>
            Cards automatically adapt their shadows and styling:
            {'\n'}• iOS: Multiple shadow layers
            {'\n'}• Android: Material elevation
            {'\n'}• Web: Box-shadow with hover states
          </Text>

          <PlatformCard variant="elevated" style={styles.column}>
            <Text style={styles.sectionTitle}>Elevated Card</Text>
            <Text style={styles.infoText}>
              This card has platform-specific elevation/shadows that create depth.
            </Text>
          </PlatformCard>

          <PlatformCard variant="outlined" style={styles.column}>
            <Text style={styles.sectionTitle}>Outlined Card</Text>
            <Text style={styles.infoText}>
              This card uses borders instead of shadows for a cleaner look.
            </Text>
          </PlatformCard>

          <PlatformCard variant="filled" style={styles.column}>
            <Text style={styles.sectionTitle}>Filled Card</Text>
            <Text style={styles.infoText}>
              This card has a filled background color.
            </Text>
          </PlatformCard>

          <PlatformCard
            variant="elevated"
            interactive
            onPress={() => EventLogger.debug('PlatformAwareDemo', 'Interactive card pressed');}
            style={styles.column}
          >
            <Text style={styles.sectionTitle}>Interactive Card</Text>
            <Text style={styles.infoText}>
              This card is pressable and includes platform-appropriate feedback.
            </Text>
          </PlatformCard>
        </View>

        {/* Platform Inputs Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Platform Inputs</Text>
          <Text style={styles.infoText}>
            Input fields adapt to platform conventions:
            {'\n'}• iOS: Minimal style with bottom border
            {'\n'}• Android: Material outlined/filled variants
            {'\n'}• Web: Focus states and transitions
          </Text>

          <View style={styles.column}>
            <PlatformInput
              variant="outlined"
              label="Email Address"
              placeholder="Enter your email"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              leftIcon="email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.column}>
            <PlatformInput
              variant="filled"
              label="Password"
              placeholder="Enter your password"
              value={formData.password}
              onChangeText={(text) => setFormData({ ...formData, password: text })}
              leftIcon="lock"
              secureTextEntry
              helperText="Password must be at least 8 characters"
            />
          </View>

          <View style={styles.column}>
            <PlatformInput
              variant="underlined"
              label="Full Name"
              placeholder="Enter your full name"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              leftIcon="account"
              required
            />
          </View>

          <View style={styles.column}>
            <PlatformInput
              variant="minimal"
              label="Phone Number"
              placeholder="+1 (555) 123-4567"
              leftIcon="phone"
              keyboardType="phone-pad"
              errorText="Invalid phone number format"
            />
          </View>
        </View>

        {/* Platform Modals Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Platform Modals</Text>
          <Text style={styles.infoText}>
            Modals adapt their presentation style:
            {'\n'}• iOS: Slide up from bottom with drag to dismiss
            {'\n'}• Android: Fade in with scrim
            {'\n'}• Web: Centered with backdrop
          </Text>

          <View style={styles.row}>
            <PlatformButton
              label="Bottom Sheet"
              onPress={() => setIsBottomSheetVisible(true)}
            />
            <PlatformButton
              label="Card Modal"
              variant="secondary"
              onPress={() => setIsCardModalVisible(true)}
            />
            <PlatformButton
              label="Popup Modal"
              variant="accent"
              onPress={() => setIsPopupModalVisible(true)}
            />
          </View>
        </View>
      </ScrollView>

      {/* Modals */}
      <BottomSheetModal
        isVisible={isBottomSheetVisible}
        onClose={() => setIsBottomSheetVisible(false)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Bottom Sheet Modal</Text>
          <Text style={styles.modalText}>
            This modal slides up from the bottom on iOS and fades in on other platforms.
            {platform.supportsGestures && '\n\nYou can drag it down to dismiss.'}
          </Text>
          <PlatformButton
            label="Close"
            onPress={() => setIsBottomSheetVisible(false)}
          />
        </View>
      </BottomSheetModal>

      <CardModal
        isVisible={isCardModalVisible}
        onClose={() => setIsCardModalVisible(false)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Card Modal</Text>
          <Text style={styles.modalText}>
            This modal appears as a card in the center of the screen with platform-appropriate animations.
          </Text>
          <PlatformButton
            label="Close"
            variant="secondary"
            onPress={() => setIsCardModalVisible(false)}
          />
        </View>
      </CardModal>

      <PopupModal
        isVisible={isPopupModalVisible}
        onClose={() => setIsPopupModalVisible(false)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Popup Modal</Text>
          <Text style={styles.modalText}>
            This modal is optimized for smaller content and appears with a scale animation.
          </Text>
          <PlatformButton
            label="Close"
            variant="accent"
            onPress={() => setIsPopupModalVisible(false)}
          />
        </View>
      </PopupModal>
    </View>
  );
};