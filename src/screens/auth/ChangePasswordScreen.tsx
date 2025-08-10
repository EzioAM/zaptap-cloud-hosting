import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  TextInput as RNTextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../services/supabase/client';
import { useSafeTheme } from '../../components/common/ThemeFallbackWrapper';
import { EventLogger } from '../../utils/EventLogger';
import * as Haptics from 'expo-haptics';

const { width: screenWidth } = Dimensions.get('window');

const ChangePasswordScreen: React.FC = () => {
  const navigation = useNavigation();
  const theme = useSafeTheme();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentPasswordFocused, setCurrentPasswordFocused] = useState(false);
  const [newPasswordFocused, setNewPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Entry animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const triggerHaptic = useCallback(async (type: 'light' | 'medium' | 'heavy' = 'light') => {
    try {
      switch (type) {
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
      }
    } catch (error) {
      // Haptics not supported
    }
  }, []);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      triggerHaptic('medium');
      Alert.alert('Missing Information', 'Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      triggerHaptic('medium');
      Alert.alert('Password Mismatch', 'New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      triggerHaptic('medium');
      Alert.alert('Invalid Password', 'Password must be at least 6 characters');
      return;
    }

    if (currentPassword === newPassword) {
      triggerHaptic('medium');
      Alert.alert('Same Password', 'New password must be different from current password');
      return;
    }

    triggerHaptic('light');
    
    // Button press animation
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setIsLoading(true);
    try {
      // First verify current password by attempting to sign in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error('User not authenticated');
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      triggerHaptic('medium');
      EventLogger.info('Auth', 'Password changed successfully');
      Alert.alert(
        'Password Updated',
        'Your password has been changed successfully',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      triggerHaptic('heavy');
      EventLogger.error('Auth', 'Password change failed:', error as Error);
      Alert.alert(
        'Change Failed',
        error instanceof Error ? error.message : 'Failed to change password'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const navigateBack = () => {
    triggerHaptic('light');
    navigation.goBack();
  };

  return (
    <LinearGradient
      colors={[theme.colors.primary, theme.colors.secondary || theme.colors.primary]}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View
              style={[
                styles.content,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              {/* Header with Back Button */}
              <View style={styles.headerContainer}>
                <TouchableOpacity
                  onPress={navigateBack}
                  style={styles.backButton}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name="arrow-left"
                    size={24}
                    color={theme.colors.surface}
                  />
                </TouchableOpacity>
              </View>

              {/* Logo/Icon Section */}
              <View style={styles.logoContainer}>
                <View style={[styles.logoCircle, { backgroundColor: theme.colors.surface }]}>
                  <MaterialCommunityIcons
                    name="lock-reset"
                    size={60}
                    color={theme.colors.primary}
                  />
                </View>
                <Text style={[styles.appName, { color: theme.colors.surface }]}>
                  Change Password
                </Text>
                <Text style={[styles.tagline, { color: theme.colors.surface + 'CC' }]}>
                  Update your account security
                </Text>
              </View>

              {/* Form Card */}
              <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.title, { color: theme.colors.onSurface }]}>
                  Update Password
                </Text>

                {/* Current Password Input */}
                <View style={[
                  styles.inputContainer,
                  currentPasswordFocused && styles.inputFocused,
                  { borderColor: currentPasswordFocused ? theme.colors.primary : theme.colors.outline }
                ]}>
                  <MaterialCommunityIcons
                    name="lock-outline"
                    size={20}
                    color={currentPasswordFocused ? theme.colors.primary : theme.colors.onSurfaceVariant}
                    style={styles.inputIcon}
                  />
                  <RNTextInput
                    style={[styles.input, { color: theme.colors.onSurface }]}
                    placeholder="Current Password"
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry={!showCurrentPassword}
                    onFocus={() => setCurrentPasswordFocused(true)}
                    onBlur={() => setCurrentPasswordFocused(false)}
                    disabled={isLoading}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      setShowCurrentPassword(!showCurrentPassword);
                      triggerHaptic('light');
                    }}
                    style={styles.eyeIcon}
                  >
                    <MaterialCommunityIcons
                      name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={theme.colors.onSurfaceVariant}
                    />
                  </TouchableOpacity>
                </View>

                {/* New Password Input */}
                <View style={[
                  styles.inputContainer,
                  newPasswordFocused && styles.inputFocused,
                  { borderColor: newPasswordFocused ? theme.colors.primary : theme.colors.outline }
                ]}>
                  <MaterialCommunityIcons
                    name="lock-plus-outline"
                    size={20}
                    color={newPasswordFocused ? theme.colors.primary : theme.colors.onSurfaceVariant}
                    style={styles.inputIcon}
                  />
                  <RNTextInput
                    style={[styles.input, { color: theme.colors.onSurface }]}
                    placeholder="New Password"
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                    onFocus={() => setNewPasswordFocused(true)}
                    onBlur={() => setNewPasswordFocused(false)}
                    disabled={isLoading}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      setShowNewPassword(!showNewPassword);
                      triggerHaptic('light');
                    }}
                    style={styles.eyeIcon}
                  >
                    <MaterialCommunityIcons
                      name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={theme.colors.onSurfaceVariant}
                    />
                  </TouchableOpacity>
                </View>

                {/* Confirm Password Input */}
                <View style={[
                  styles.inputContainer,
                  confirmPasswordFocused && styles.inputFocused,
                  { borderColor: confirmPasswordFocused ? theme.colors.primary : theme.colors.outline }
                ]}>
                  <MaterialCommunityIcons
                    name="lock-check-outline"
                    size={20}
                    color={confirmPasswordFocused ? theme.colors.primary : theme.colors.onSurfaceVariant}
                    style={styles.inputIcon}
                  />
                  <RNTextInput
                    style={[styles.input, { color: theme.colors.onSurface }]}
                    placeholder="Confirm New Password"
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    onFocus={() => setConfirmPasswordFocused(true)}
                    onBlur={() => setConfirmPasswordFocused(false)}
                    disabled={isLoading}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      setShowConfirmPassword(!showConfirmPassword);
                      triggerHaptic('light');
                    }}
                    style={styles.eyeIcon}
                  >
                    <MaterialCommunityIcons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={theme.colors.onSurfaceVariant}
                    />
                  </TouchableOpacity>
                </View>

                {/* Password Requirements */}
                <View style={styles.requirementsContainer}>
                  <Text style={[styles.requirementsTitle, { color: theme.colors.onSurfaceVariant }]}>
                    Password Requirements:
                  </Text>
                  <View style={styles.requirementItem}>
                    <MaterialCommunityIcons
                      name={newPassword.length >= 6 ? 'check-circle' : 'circle-outline'}
                      size={16}
                      color={newPassword.length >= 6 ? theme.colors.primary : theme.colors.onSurfaceVariant}
                    />
                    <Text style={[styles.requirementText, { color: theme.colors.onSurfaceVariant }]}>
                      At least 6 characters
                    </Text>
                  </View>
                  <View style={styles.requirementItem}>
                    <MaterialCommunityIcons
                      name={newPassword && confirmPassword && newPassword === confirmPassword ? 'check-circle' : 'circle-outline'}
                      size={16}
                      color={newPassword && confirmPassword && newPassword === confirmPassword ? theme.colors.primary : theme.colors.onSurfaceVariant}
                    />
                    <Text style={[styles.requirementText, { color: theme.colors.onSurfaceVariant }]}>
                      Passwords match
                    </Text>
                  </View>
                  <View style={styles.requirementItem}>
                    <MaterialCommunityIcons
                      name={currentPassword && newPassword && currentPassword !== newPassword ? 'check-circle' : 'circle-outline'}
                      size={16}
                      color={currentPassword && newPassword && currentPassword !== newPassword ? theme.colors.primary : theme.colors.onSurfaceVariant}
                    />
                    <Text style={[styles.requirementText, { color: theme.colors.onSurfaceVariant }]}>
                      Different from current
                    </Text>
                  </View>
                  <View style={styles.requirementItem}>
                    <MaterialCommunityIcons
                      name="information-outline"
                      size={16}
                      color={theme.colors.onSurfaceVariant}
                    />
                    <Text style={[styles.requirementText, { color: theme.colors.onSurfaceVariant }]}>
                      Use letters, numbers, and symbols
                    </Text>
                  </View>
                </View>

                {/* Change Password Button */}
                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                  <TouchableOpacity
                    style={styles.changeButton}
                    onPress={handleChangePassword}
                    disabled={isLoading}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={[theme.colors.primary, theme.colors.secondary || theme.colors.primary]}
                      style={styles.buttonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        <>
                          <Text style={styles.buttonText}>Update Password</Text>
                          <MaterialCommunityIcons
                            name="shield-check"
                            size={20}
                            color="white"
                            style={styles.buttonIcon}
                          />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>

                {/* Security Tips */}
                <View style={styles.securityTipsContainer}>
                  <Text style={[styles.securityTipsTitle, { color: theme.colors.onSurfaceVariant }]}>
                    Security Tips:
                  </Text>
                  <Text style={[styles.securityTipText, { color: theme.colors.onSurfaceVariant }]}>
                    • Use a unique password you haven't used before{'\n'}
                    • Consider using a password manager{'\n'}
                    • Avoid personal information in passwords
                  </Text>
                </View>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  card: {
    borderRadius: 20,
    padding: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputFocused: {
    borderWidth: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 4,
  },
  requirementsContainer: {
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  requirementText: {
    fontSize: 13,
    marginLeft: 8,
  },
  changeButton: {
    marginBottom: 16,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginLeft: 8,
  },
  securityTipsContainer: {
    paddingHorizontal: 8,
    marginTop: 8,
  },
  securityTipsTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  securityTipText: {
    fontSize: 12,
    lineHeight: 18,
  },
});

export default ChangePasswordScreen;