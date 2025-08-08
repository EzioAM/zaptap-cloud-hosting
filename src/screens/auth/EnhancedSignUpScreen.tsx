import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  Animated,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { RootState, AppDispatch } from '../../store';
import { signUp } from '../../store/slices/authSlice';
import { ThemedInput } from '../../components/ui/ThemedInput';
import { GradientButton } from '../../components/shared/GradientButton';
import { useSafeTheme } from '../../components/common/ThemeFallbackWrapper';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { EventLogger } from '../../utils/EventLogger';
import { supabase } from '../../services/supabase/client';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  company: string;
  role: string;
  bio: string;
  avatarUri: string | null;
}

const EnhancedSignUpScreen: React.FC = () => {
  const theme = useSafeTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);
  
  // Form state
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    company: '',
    role: '',
    bio: '',
    avatarUri: null,
  });
  
  const [currentStep, setCurrentStep] = useState(0);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  const steps = [
    { title: 'Personal Info', icon: 'account' },
    { title: 'Account Details', icon: 'email' },
    { title: 'Professional', icon: 'briefcase' },
    { title: 'Profile', icon: 'account-circle' },
  ];
  
  useEffect(() => {
    // Animate step changes
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Update progress bar
    Animated.timing(progressAnim, {
      toValue: (currentStep + 1) / steps.length,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);
  
  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
    try {
      switch (type) {
        case 'light':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
      }
    } catch (error) {
      // Haptics not supported
    }
  };
  
  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };
  
  const validatePhone = (phone: string) => {
    const re = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
    return phone === '' || re.test(phone);
  };
  
  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
    return strength;
  };
  
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    
    // Update password strength
    if (field === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
    }
  };
  
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera roll permissions to set your avatar.');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      
      if (!result.canceled && result.assets[0]) {
        setFormData(prev => ({ ...prev, avatarUri: result.assets[0].uri }));
        triggerHaptic('medium');
      }
    } catch (error) {
      EventLogger.error('SignUp', 'Image picker error:', error as Error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };
  
  const validateCurrentStep = (): boolean => {
    const newErrors: Partial<FormData> = {};
    
    switch (currentStep) {
      case 0: // Personal Info
        if (!formData.firstName.trim()) {
          newErrors.firstName = 'First name is required';
        }
        if (!formData.lastName.trim()) {
          newErrors.lastName = 'Last name is required';
        }
        break;
        
      case 1: // Account Details
        if (!formData.email.trim()) {
          newErrors.email = 'Email is required';
        } else if (!validateEmail(formData.email)) {
          newErrors.email = 'Invalid email format';
        }
        if (!formData.password) {
          newErrors.password = 'Password is required';
        } else if (formData.password.length < 8) {
          newErrors.password = 'Password must be at least 8 characters';
        }
        if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        }
        break;
        
      case 2: // Professional (optional)
        if (formData.phone && !validatePhone(formData.phone)) {
          newErrors.phone = 'Invalid phone number format';
        }
        break;
        
      case 3: // Profile (optional)
        // All fields optional
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleNext = () => {
    if (validateCurrentStep()) {
      triggerHaptic('light');
      if (currentStep < steps.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        handleSignUp();
      }
    } else {
      triggerHaptic('heavy');
    }
  };
  
  const handleBack = () => {
    if (currentStep > 0) {
      triggerHaptic('light');
      setCurrentStep(prev => prev - 1);
    }
  };
  
  const uploadAvatar = async (userId: string, uri: string): Promise<string | null> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });
      
      if (uploadError) {
        EventLogger.error('SignUp', 'Avatar upload error:', uploadError as Error);
        return null;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      return publicUrl;
    } catch (error) {
      EventLogger.error('SignUp', 'Avatar upload failed:', error as Error);
      return null;
    }
  };
  
  const handleSignUp = async () => {
    try {
      triggerHaptic('medium');
      
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      
      // Create user account
      const result = await dispatch(signUp({
        email: formData.email,
        password: formData.password,
        name: fullName,
      })).unwrap();
      
      // Upload avatar if provided
      let avatarUrl = null;
      if (formData.avatarUri && result.user?.id) {
        avatarUrl = await uploadAvatar(result.user.id, formData.avatarUri);
      }
      
      // Update user metadata with additional fields
      if (result.user?.id) {
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            full_name: fullName,
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
            company: formData.company,
            role: formData.role,
            bio: formData.bio,
            avatar_url: avatarUrl,
          },
        });
        
        if (updateError) {
          EventLogger.warn('SignUp', 'Failed to update user metadata:', updateError);
        }
        
        // Also update the users table
        const { error: profileError } = await supabase
          .from('users')
          .update({
            name: fullName,
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
            company: formData.company,
            role: formData.role,
            bio: formData.bio,
            avatar_url: avatarUrl,
          })
          .eq('id', result.user.id);
        
        if (profileError) {
          EventLogger.warn('SignUp', 'Failed to update user profile:', profileError);
        }
      }
      
      triggerHaptic('heavy');
      Alert.alert(
        'Welcome to ZapTap! 🎉',
        'Your account has been created successfully.',
        [
          {
            text: 'Get Started',
            onPress: () => navigation.navigate('MainTabs' as never),
          },
        ]
      );
    } catch (error: any) {
      triggerHaptic('heavy');
      Alert.alert('Sign Up Failed', error.message || 'Please try again');
    }
  };
  
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Personal Info
        return (
          <Animated.View
            style={[
              styles.stepContent,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={[styles.stepTitle, { color: theme.colors.onSurface }]}>
              Let's start with your name
            </Text>
            <Text style={[styles.stepDescription, { color: theme.colors.onSurfaceVariant }]}>
              This helps us personalize your experience
            </Text>
            
            <ThemedInput
              label="First Name"
              value={formData.firstName}
              onChangeText={(text) => handleInputChange('firstName', text)}
              errorText={errors.firstName}
              leftIcon="account"
              autoCapitalize="words"
              required
            />
            
            <ThemedInput
              label="Last Name"
              value={formData.lastName}
              onChangeText={(text) => handleInputChange('lastName', text)}
              errorText={errors.lastName}
              leftIcon="account-outline"
              autoCapitalize="words"
              required
            />
          </Animated.View>
        );
        
      case 1: // Account Details
        return (
          <Animated.View
            style={[
              styles.stepContent,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={[styles.stepTitle, { color: theme.colors.onSurface }]}>
              Create your account
            </Text>
            <Text style={[styles.stepDescription, { color: theme.colors.onSurfaceVariant }]}>
              Choose a secure password for your account
            </Text>
            
            <ThemedInput
              label="Email Address"
              value={formData.email}
              onChangeText={(text) => handleInputChange('email', text)}
              errorText={errors.email}
              leftIcon="email"
              keyboardType="email-address"
              autoCapitalize="none"
              required
            />
            
            <ThemedInput
              label="Password"
              value={formData.password}
              onChangeText={(text) => handleInputChange('password', text)}
              errorText={errors.password}
              leftIcon="lock"
              secureTextEntry={!showPassword}
              rightIcon={showPassword ? 'eye-off' : 'eye'}
              onRightIconPress={() => setShowPassword(!showPassword)}
              required
            />
            
            {formData.password && (
              <View style={styles.passwordStrength}>
                <Text style={[styles.passwordStrengthLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Password Strength:
                </Text>
                <View style={styles.passwordStrengthBar}>
                  <View
                    style={[
                      styles.passwordStrengthFill,
                      {
                        width: `${(passwordStrength / 5) * 100}%`,
                        backgroundColor:
                          passwordStrength <= 2 ? '#F44336' :
                          passwordStrength <= 3 ? '#FF9800' :
                          passwordStrength <= 4 ? '#FFC107' : '#4CAF50',
                      },
                    ]}
                  />
                </View>
              </View>
            )}
            
            <ThemedInput
              label="Confirm Password"
              value={formData.confirmPassword}
              onChangeText={(text) => handleInputChange('confirmPassword', text)}
              errorText={errors.confirmPassword}
              leftIcon="lock-check"
              secureTextEntry={!showPassword}
              required
            />
          </Animated.View>
        );
        
      case 2: // Professional
        return (
          <Animated.View
            style={[
              styles.stepContent,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={[styles.stepTitle, { color: theme.colors.onSurface }]}>
              Professional Details
            </Text>
            <Text style={[styles.stepDescription, { color: theme.colors.onSurfaceVariant }]}>
              Optional: Help us understand your needs better
            </Text>
            
            <ThemedInput
              label="Phone Number"
              value={formData.phone}
              onChangeText={(text) => handleInputChange('phone', text)}
              errorText={errors.phone}
              leftIcon="phone"
              keyboardType="phone-pad"
              helperText="Optional"
            />
            
            <ThemedInput
              label="Company"
              value={formData.company}
              onChangeText={(text) => handleInputChange('company', text)}
              leftIcon="office-building"
              helperText="Optional"
            />
            
            <ThemedInput
              label="Role / Title"
              value={formData.role}
              onChangeText={(text) => handleInputChange('role', text)}
              leftIcon="briefcase"
              helperText="e.g., IT Director, Developer, etc."
            />
          </Animated.View>
        );
        
      case 3: // Profile
        return (
          <Animated.View
            style={[
              styles.stepContent,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={[styles.stepTitle, { color: theme.colors.onSurface }]}>
              Complete your profile
            </Text>
            <Text style={[styles.stepDescription, { color: theme.colors.onSurfaceVariant }]}>
              Add a photo and tell us about yourself
            </Text>
            
            <TouchableOpacity style={styles.avatarPicker} onPress={pickImage}>
              {formData.avatarUri ? (
                <Image source={{ uri: formData.avatarUri }} style={styles.avatarImage} />
              ) : (
                <LinearGradient
                  colors={['#8B5CF6', '#EC4899']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatarPlaceholder}
                >
                  <MaterialCommunityIcons name="camera-plus" size={32} color="white" />
                </LinearGradient>
              )}
              <View style={styles.avatarBadge}>
                <MaterialCommunityIcons name="pencil" size={16} color="white" />
              </View>
            </TouchableOpacity>
            
            <ThemedInput
              label="Bio"
              value={formData.bio}
              onChangeText={(text) => handleInputChange('bio', text)}
              leftIcon="text"
              multiline
              numberOfLines={3}
              helperText="Tell us a bit about yourself (optional)"
            />
          </Animated.View>
        );
    }
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.onSurface} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
              Create Account
            </Text>
            <View style={{ width: 40 }} />
          </View>
          
          {/* Progress Steps */}
          <View style={styles.progressContainer}>
            <View style={styles.progressSteps}>
              {steps.map((step, index) => (
                <View key={index} style={styles.progressStep}>
                  <View
                    style={[
                      styles.progressDot,
                      {
                        backgroundColor:
                          index <= currentStep ? theme.colors.primary : theme.colors.surfaceVariant,
                      },
                    ]}
                  >
                    {index < currentStep ? (
                      <MaterialCommunityIcons name="check" size={16} color="white" />
                    ) : (
                      <Text
                        style={[
                          styles.progressNumber,
                          {
                            color: index <= currentStep ? 'white' : theme.colors.onSurfaceVariant,
                          },
                        ]}
                      >
                        {index + 1}
                      </Text>
                    )}
                  </View>
                  {index < steps.length - 1 && (
                    <View
                      style={[
                        styles.progressLine,
                        {
                          backgroundColor:
                            index < currentStep ? theme.colors.primary : theme.colors.surfaceVariant,
                        },
                      ]}
                    />
                  )}
                </View>
              ))}
            </View>
            <View style={styles.progressLabels}>
              {steps.map((step, index) => (
                <Text
                  key={index}
                  style={[
                    styles.progressLabel,
                    {
                      color:
                        index <= currentStep ? theme.colors.onSurface : theme.colors.onSurfaceVariant,
                      fontWeight: index === currentStep ? '600' : '400',
                    },
                  ]}
                >
                  {step.title}
                </Text>
              ))}
            </View>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                  backgroundColor: theme.colors.primary,
                },
              ]}
            />
          </View>
          
          {/* Step Content */}
          {renderStepContent()}
          
          {/* Navigation Buttons */}
          <View style={styles.navigation}>
            {currentStep > 0 && (
              <TouchableOpacity
                style={[styles.navButton, styles.backNavButton, { borderColor: theme.colors.outline }]}
                onPress={handleBack}
              >
                <MaterialCommunityIcons name="arrow-left" size={20} color={theme.colors.onSurface} />
                <Text style={[styles.navButtonText, { color: theme.colors.onSurface }]}>Back</Text>
              </TouchableOpacity>
            )}
            
            <GradientButton
              onPress={handleNext}
              disabled={isLoading}
              style={styles.nextButton}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text style={styles.nextButtonText}>
                    {currentStep === steps.length - 1 ? 'Create Account' : 'Next'}
                  </Text>
                  <MaterialCommunityIcons name="arrow-right" size={20} color="white" />
                </>
              )}
            </GradientButton>
          </View>
          
          {/* Sign In Link */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.colors.onSurfaceVariant }]}>
              Already have an account?
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignIn' as never)}>
              <Text style={[styles.footerLink, { color: theme.colors.primary }]}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  progressContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  progressSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressLabel: {
    fontSize: 10,
    flex: 1,
    textAlign: 'center',
  },
  progressBar: {
    height: 2,
    borderRadius: 1,
    marginTop: 8,
  },
  stepContent: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  passwordStrength: {
    marginTop: -8,
    marginBottom: 16,
  },
  passwordStrengthLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  passwordStrengthBar: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  passwordStrengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  avatarPicker: {
    alignSelf: 'center',
    marginBottom: 24,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  navigation: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 24,
    gap: 12,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  backNavButton: {
    borderWidth: 1,
    flex: 1,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    gap: 4,
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default EnhancedSignUpScreen;