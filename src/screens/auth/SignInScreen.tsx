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
import { useDispatch, useSelector } from 'react-redux';
import { signIn, resetPassword } from '../../store/slices/authSlice';
import { RootState, AppDispatch } from '../../store';
import { useSafeTheme } from '../../components/common/ThemeFallbackWrapper';
import { EventLogger } from '../../utils/EventLogger';
import * as Haptics from 'expo-haptics';

const { width: screenWidth } = Dimensions.get('window');

interface SignInScreenProps {
  navigation: any;
}

const SignInScreen: React.FC<SignInScreenProps> = ({ navigation }) => {
  const theme = useSafeTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error, isAuthenticated } = useSelector((state: RootState) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Auto-navigate when authentication succeeds
  useEffect(() => {
    if (isAuthenticated) {
      navigation.goBack();
    }
  }, [isAuthenticated, navigation]);

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

  const handleSignIn = async () => {
    if (!email || !password) {
      triggerHaptic('medium');
      Alert.alert('Missing Information', 'Please fill in all fields');
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

    try {
      await dispatch(signIn({ email: email.trim(), password })).unwrap();
      triggerHaptic('medium');
    } catch (error: any) {
      triggerHaptic('heavy');
      EventLogger.error('Authentication', 'Sign in error:', error as Error);
      Alert.alert('Sign In Failed', error.message || 'Invalid email or password');
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      triggerHaptic('medium');
      Alert.alert('Email Required', 'Please enter your email address first');
      return;
    }

    triggerHaptic('light');

    try {
      await dispatch(resetPassword({ email: email.trim() })).unwrap();
      triggerHaptic('medium');
      Alert.alert(
        'Password Reset Email Sent', 
        `Check your email (${email}) for instructions to reset your password.`
      );
    } catch (error: any) {
      triggerHaptic('heavy');
      Alert.alert('Error', error.message || 'Failed to send reset email');
    }
  };

  const navigateToSignUp = () => {
    triggerHaptic('light');
    navigation.navigate('SignUp');
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
              {/* Logo/Icon Section */}
              <View style={styles.logoContainer}>
                <View style={[styles.logoCircle, { backgroundColor: theme.colors.surface }]}>
                  <MaterialCommunityIcons
                    name="robot-happy"
                    size={60}
                    color={theme.colors.primary}
                  />
                </View>
                <Text style={[styles.appName, { color: '#FFFFFF' }]}>
                  Zaptap
                </Text>
                <Text style={[styles.tagline, { color: 'rgba(255, 255, 255, 0.8)' }]}>
                  Automate Everything
                </Text>
              </View>

              {/* Form Card */}
              <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.title, { color: theme.colors.onSurface }]}>
                  Welcome Back
                </Text>

                {/* Email Input */}
                <View style={[
                  styles.inputContainer,
                  emailFocused && styles.inputFocused,
                  { borderColor: emailFocused ? theme.colors.primary : theme.colors.outline }
                ]}>
                  <MaterialCommunityIcons
                    name="email-outline"
                    size={20}
                    color={emailFocused ? theme.colors.primary : theme.colors.onSurfaceVariant}
                    style={styles.inputIcon}
                  />
                  <RNTextInput
                    style={[styles.input, { color: theme.colors.onSurface }]}
                    placeholder="Email"
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                  />
                </View>

                {/* Password Input */}
                <View style={[
                  styles.inputContainer,
                  passwordFocused && styles.inputFocused,
                  { borderColor: passwordFocused ? theme.colors.primary : theme.colors.outline }
                ]}>
                  <MaterialCommunityIcons
                    name="lock-outline"
                    size={20}
                    color={passwordFocused ? theme.colors.primary : theme.colors.onSurfaceVariant}
                    style={styles.inputIcon}
                  />
                  <RNTextInput
                    style={[styles.input, { color: theme.colors.onSurface }]}
                    placeholder="Password"
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      setShowPassword(!showPassword);
                      triggerHaptic('light');
                    }}
                    style={styles.eyeIcon}
                  >
                    <MaterialCommunityIcons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={theme.colors.onSurfaceVariant}
                    />
                  </TouchableOpacity>
                </View>

                {/* Error Message */}
                {error && (
                  <View style={styles.errorContainer}>
                    <MaterialCommunityIcons
                      name="alert-circle"
                      size={16}
                      color={theme.colors.error}
                    />
                    <Text style={[styles.errorText, { color: theme.colors.error }]}>
                      {error}
                    </Text>
                  </View>
                )}

                {/* Sign In Button */}
                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                  <TouchableOpacity
                    style={styles.signInButton}
                    onPress={handleSignIn}
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
                          <Text style={styles.buttonText}>Sign In</Text>
                          <MaterialCommunityIcons
                            name="arrow-right"
                            size={20}
                            color="white"
                            style={styles.buttonIcon}
                          />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>

                {/* Forgot Password Link */}
                <TouchableOpacity
                  onPress={handleForgotPassword}
                  style={styles.linkButton}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.linkText, { color: theme.colors.primary }]}>
                    Forgot Password?
                  </Text>
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.dividerContainer}>
                  <View style={[styles.divider, { backgroundColor: theme.colors.outline }]} />
                  <Text style={[styles.dividerText, { color: theme.colors.onSurfaceVariant }]}>
                    OR
                  </Text>
                  <View style={[styles.divider, { backgroundColor: theme.colors.outline }]} />
                </View>

                {/* Social Login Buttons */}
                <View style={styles.socialContainer}>
                  <TouchableOpacity
                    style={[styles.socialButton, { backgroundColor: theme.colors.surfaceVariant }]}
                    onPress={() => {
                      triggerHaptic('light');
                      Alert.alert('Coming Soon', 'Social login will be available soon!');
                    }}
                  >
                    <MaterialCommunityIcons name="google" size={24} color="#4285F4" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.socialButton, { backgroundColor: theme.colors.surfaceVariant }]}
                    onPress={() => {
                      triggerHaptic('light');
                      Alert.alert('Coming Soon', 'Social login will be available soon!');
                    }}
                  >
                    <MaterialCommunityIcons name="apple" size={24} color="#000000" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.socialButton, { backgroundColor: theme.colors.surfaceVariant }]}
                    onPress={() => {
                      triggerHaptic('light');
                      Alert.alert('Coming Soon', 'Social login will be available soon!');
                    }}
                  >
                    <MaterialCommunityIcons name="github" size={24} color="#333333" />
                  </TouchableOpacity>
                </View>

                {/* Sign Up Link */}
                <View style={styles.signUpContainer}>
                  <Text style={[styles.signUpText, { color: theme.colors.onSurfaceVariant }]}>
                    Don't have an account?
                  </Text>
                  <TouchableOpacity onPress={navigateToSignUp} activeOpacity={0.7}>
                    <Text style={[styles.signUpLink, { color: theme.colors.primary }]}>
                      {' Sign Up'}
                    </Text>
                  </TouchableOpacity>
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
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    fontStyle: 'italic',
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  errorText: {
    fontSize: 14,
    marginLeft: 6,
  },
  signInButton: {
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
  linkButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 12,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 20,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpText: {
    fontSize: 14,
  },
  signUpLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SignInScreen;