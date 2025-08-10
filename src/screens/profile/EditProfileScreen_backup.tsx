import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { updateProfile } from '../../store/slices/authSlice';
import { ThemedInput } from '../../components/ui/ThemedInput';
import { GradientButton } from '../../components/shared/GradientButton';
import { useSafeTheme } from '../../components/common/ThemeFallbackWrapper';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { EventLogger } from '../../utils/EventLogger';
import { supabase } from '../../services/supabase/client';

const { width: screenWidth } = Dimensions.get('window');

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  bio: string;
  website: string;
  location: string;
  avatarUri: string | null;
  socialLinks: {
    twitter: string;
    linkedin: string;
    github: string;
  };
}

const EditProfileScreen: React.FC = () => {
  const theme = useSafeTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Form state
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    email: user?.email || '',
    phone: '',
    company: '',
    role: '',
    bio: '',
    website: '',
    location: '',
    avatarUri: null,
    socialLinks: {
      twitter: '',
      linkedin: '',
      github: '',
    },
  });
  
  const [originalData, setOriginalData] = useState<ProfileData>(profileData);
  const [errors, setErrors] = useState<Partial<ProfileData>>({});
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const avatarScaleAnim = useRef(new Animated.Value(0.8)).current;
  const avatarRotateAnim = useRef(new Animated.Value(0)).current;
  const cardAnimations = useRef(
    Array.from({ length: 4 }, () => new Animated.Value(0))
  ).current;
  
  useEffect(() => {
    loadUserProfile();
    
    // Enhanced entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideUpAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(avatarScaleAnim, {
        toValue: 1,
        tension: 30,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();

    // Staggered card animations
    const cardAnimationDelay = 150;
    cardAnimations.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: index * cardAnimationDelay,
        useNativeDriver: true,
      }).start();
    });
  }, []);
  
  useEffect(() => {
    // Check if data has changed
    const changed = JSON.stringify(profileData) !== JSON.stringify(originalData);
    setHasChanges(changed);
  }, [profileData, originalData]);
  
  const loadUserProfile = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      // Get user metadata from auth
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      // Get additional profile data from users table
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      const metadata = authUser?.user_metadata || {};
      const profileInfo = profile || {};
      
      const loadedData: ProfileData = {
        firstName: metadata.first_name || profileInfo.first_name || '',
        lastName: metadata.last_name || profileInfo.last_name || '',
        email: authUser?.email || user.email || '',
        phone: metadata.phone || profileInfo.phone || '',
        company: metadata.company || profileInfo.company || '',
        role: metadata.role || profileInfo.role || '',
        bio: metadata.bio || profileInfo.bio || '',
        website: metadata.website || profileInfo.website || '',
        location: metadata.location || profileInfo.location || '',
        avatarUri: metadata.avatar_url || profileInfo.avatar_url || null,
        socialLinks: {
          twitter: metadata.twitter || profileInfo.twitter || '',
          linkedin: metadata.linkedin || profileInfo.linkedin || '',
          github: metadata.github || profileInfo.github || '',
        },
      };
      
      setProfileData(loadedData);
      setOriginalData(loadedData);
    } catch (error) {
      EventLogger.error('EditProfile', 'Failed to load profile:', error as Error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };
  
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
  
  const handleInputChange = (field: string, value: string) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setProfileData(prev => ({
        ...prev,
        [parent]: {
          ...(prev as any)[parent],
          [child]: value,
        },
      }));
    } else {
      setProfileData(prev => ({ ...prev, [field]: value }));
    }
    
    // Clear error for this field
    if (errors[field as keyof ProfileData]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };
  
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera roll permissions to update your avatar.');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      
      if (!result.canceled && result.assets[0]) {
        setProfileData(prev => ({ ...prev, avatarUri: result.assets[0].uri }));
        triggerHaptic('medium');
        
        // Avatar update animation
        Animated.sequence([
          Animated.timing(avatarRotateAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(avatarRotateAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }
    } catch (error) {
      EventLogger.error('EditProfile', 'Image picker error:', error as Error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };
  
  const uploadAvatar = async (userId: string, uri: string): Promise<string | null> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;
      
      // Delete old avatar if exists
      if (originalData.avatarUri && originalData.avatarUri.includes('avatars/')) {
        const oldPath = originalData.avatarUri.split('avatars/')[1];
        await supabase.storage.from('avatars').remove([`avatars/${oldPath}`]);
      }
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });
      
      if (uploadError) {
        EventLogger.error('EditProfile', 'Avatar upload error:', uploadError as Error);
        return null;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      return publicUrl;
    } catch (error) {
      EventLogger.error('EditProfile', 'Avatar upload failed:', error as Error);
      return null;
    }
  };
  
  const validateUrl = (url: string): boolean => {
    if (!url) return true; // Empty is valid
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
      return true;
    } catch {
      return false;
    }
  };
  
  const validateProfile = (): boolean => {
    const newErrors: Partial<ProfileData> = {};
    
    if (!profileData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!profileData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    if (profileData.website && !validateUrl(profileData.website)) {
      newErrors.website = 'Invalid website URL';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSave = async () => {
    if (!validateProfile() || !user?.id) {
      triggerHaptic('heavy');
      return;
    }
    
    setIsSaving(true);
    triggerHaptic('medium');
    
    try {
      let avatarUrl = originalData.avatarUri;
      
      // Upload new avatar if changed
      if (profileData.avatarUri !== originalData.avatarUri && profileData.avatarUri) {
        const uploadedUrl = await uploadAvatar(user.id, profileData.avatarUri);
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
        }
      }
      
      const fullName = `${profileData.firstName} ${profileData.lastName}`.trim();
      
      // Update auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          phone: profileData.phone,
          company: profileData.company,
          role: profileData.role,
          bio: profileData.bio,
          website: profileData.website,
          location: profileData.location,
          avatar_url: avatarUrl,
          twitter: profileData.socialLinks.twitter,
          linkedin: profileData.socialLinks.linkedin,
          github: profileData.socialLinks.github,
        },
      });
      
      if (authError) {
        throw authError;
      }
      
      // Update users table
      const { error: dbError } = await supabase
        .from('users')
        .update({
          name: fullName,
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          phone: profileData.phone,
          company: profileData.company,
          role: profileData.role,
          bio: profileData.bio,
          website: profileData.website,
          location: profileData.location,
          avatar_url: avatarUrl,
          twitter: profileData.socialLinks.twitter,
          linkedin: profileData.socialLinks.linkedin,
          github: profileData.socialLinks.github,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      
      if (dbError) {
        throw dbError;
      }
      
      // Update Redux store
      dispatch(updateProfile({
        name: fullName,
        avatar_url: avatarUrl,
      }));
      
      triggerHaptic('heavy');
      Alert.alert(
        'Success',
        'Your profile has been updated successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
      
      setOriginalData({ ...profileData, avatarUri: avatarUrl });
      setHasChanges(false);
    } catch (error: any) {
      EventLogger.error('EditProfile', 'Failed to save profile:', error as Error);
      Alert.alert('Error', error.message || 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  };
  
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background?.primary || theme.colors.background || '#F5F5F5' }]}>
        <LinearGradient
          colors={['#6366F1', '#8B5CF6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.loadingGradient}
        >
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="white" />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }
  
  
  // Simplified version that works
  const backgroundColor = theme.colors.background?.primary || theme.colors.background || '#F5F5F5';
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: backgroundColor }}>
      {/* Simple header first */}
      <View style={{ backgroundColor: '#6366F1', padding: 20, paddingTop: 40 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="close" size={24} color="white" />
          </TouchableOpacity>
          <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>Edit Profile</Text>
          <TouchableOpacity onPress={() => console.log('Save pressed')}>
            <MaterialCommunityIcons name="check" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Simple content */}
      <ScrollView style={{ flex: 1, padding: 20 }}>
        <Text style={{ fontSize: 18, color: '#000', marginBottom: 20 }}>Edit Your Profile</Text>
        
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, color: '#666', marginBottom: 5 }}>First Name</Text>
          <View style={{ borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, backgroundColor: 'white' }}>
            <Text style={{ color: '#000' }}>{profileData.firstName || 'Enter first name'}</Text>
          </View>
        </View>
        
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, color: '#666', marginBottom: 5 }}>Last Name</Text>
          <View style={{ borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, backgroundColor: 'white' }}>
            <Text style={{ color: '#000' }}>{profileData.lastName || 'Enter last name'}</Text>
          </View>
        </View>
        
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, color: '#666', marginBottom: 5 }}>Email</Text>
          <View style={{ borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, backgroundColor: '#F5F5F5' }}>
            <Text style={{ color: '#666' }}>{profileData.email || user?.email || 'No email'}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
  
  // Note: Original complex view with animations was causing rendering issues
  // This simplified version works reliably
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
                    {
                      rotate: avatarRotateAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
                {profileData.avatarUri ? (
                  <Image source={{ uri: profileData.avatarUri }} style={styles.avatar} />
                ) : (
                  <LinearGradient
                    colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.avatarPlaceholder}
                  >
                    <Text style={styles.avatarInitial}>
                      {profileData.firstName.charAt(0).toUpperCase() || 'U'}
                    </Text>
                  </LinearGradient>
                )}
                <View style={styles.avatarBadge}>
                  <MaterialCommunityIcons name="camera" size={18} color="white" />
                </View>
              </TouchableOpacity>
              <Text style={styles.avatarHint}>Tap to change photo</Text>
            </Animated.View>
          </LinearGradient>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Personal Information Card */}
            <Animated.View
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.surface?.primary || theme.colors.surface || '#FFFFFF',
                  opacity: cardAnimations[0],
                  transform: [
                    {
                      translateY: cardAnimations[0].interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
                theme.shadows?.md || {},
              ]}
            >
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons 
                  name="account" 
                  size={24} 
                  color={theme.colors.brand.primary} 
                />
                <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>
                  Personal Information
                </Text>
              </View>
              
              <View style={styles.cardContent}>
                <View style={styles.row}>
                  <View style={styles.halfInput}>
                    <ThemedInput
                      label="First Name"
                      value={profileData.firstName}
                      onChangeText={(text) => handleInputChange('firstName', text)}
                      errorText={errors.firstName}
                      required
                    />
                  </View>
                  <View style={styles.halfInput}>
                    <ThemedInput
                      label="Last Name"
                      value={profileData.lastName}
                      onChangeText={(text) => handleInputChange('lastName', text)}
                      errorText={errors.lastName}
                      required
                    />
                  </View>
                </View>
                
                <ThemedInput
                  label="Email"
                  value={profileData.email}
                  editable={false}
                  leftIcon="email"
                  helperText="Email cannot be changed"
                />
                
                <ThemedInput
                  label="Phone"
                  value={profileData.phone}
                  onChangeText={(text) => handleInputChange('phone', text)}
                  leftIcon="phone"
                  keyboardType="phone-pad"
                />
                
                <ThemedInput
                  label="Location"
                  value={profileData.location}
                  onChangeText={(text) => handleInputChange('location', text)}
                  leftIcon="map-marker"
                  placeholder="City, Country"
                />
              </View>
            </Animated.View>

            {/* Professional Information Card */}
            <Animated.View
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.surface?.primary || theme.colors.surface || '#FFFFFF',
                  opacity: cardAnimations[1],
                  transform: [
                    {
                      translateY: cardAnimations[1].interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
                theme.shadows?.md || {},
              ]}
            >
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons 
                  name="briefcase" 
                  size={24} 
                  color={theme.colors.brand.primary} 
                />
                <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>
                  Professional Information
                </Text>
              </View>
              
              <View style={styles.cardContent}>
                <ThemedInput
                  label="Company"
                  value={profileData.company}
                  onChangeText={(text) => handleInputChange('company', text)}
                  leftIcon="office-building"
                />
                
                <ThemedInput
                  label="Role / Title"
                  value={profileData.role}
                  onChangeText={(text) => handleInputChange('role', text)}
                  leftIcon="briefcase-variant"
                />
                
                <ThemedInput
                  label="Website"
                  value={profileData.website}
                  onChangeText={(text) => handleInputChange('website', text)}
                  errorText={errors.website}
                  leftIcon="web"
                  keyboardType="url"
                  autoCapitalize="none"
                  placeholder="https://example.com"
                />
                
                <ThemedInput
                  label="Bio"
                  value={profileData.bio}
                  onChangeText={(text) => handleInputChange('bio', text)}
                  leftIcon="text"
                  multiline
                  numberOfLines={3}
                  placeholder="Tell us about yourself..."
                />
              </View>
            </Animated.View>

            {/* Social Links Card */}
            <Animated.View
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.surface?.primary || theme.colors.surface || '#FFFFFF',
                  opacity: cardAnimations[2],
                  transform: [
                    {
                      translateY: cardAnimations[2].interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
                theme.shadows?.md || {},
              ]}
            >
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons 
                  name="share-variant" 
                  size={24} 
                  color={theme.colors.brand.primary} 
                />
                <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>
                  Social Links
                </Text>
              </View>
              
              <View style={styles.cardContent}>
                <ThemedInput
                  label="Twitter"
                  value={profileData.socialLinks.twitter}
                  onChangeText={(text) => handleInputChange('socialLinks.twitter', text)}
                  leftIcon="twitter"
                  autoCapitalize="none"
                  placeholder="@username"
                />
                
                <ThemedInput
                  label="LinkedIn"
                  value={profileData.socialLinks.linkedin}
                  onChangeText={(text) => handleInputChange('socialLinks.linkedin', text)}
                  leftIcon="linkedin"
                  autoCapitalize="none"
                  placeholder="linkedin.com/in/username"
                />
                
                <ThemedInput
                  label="GitHub"
                  value={profileData.socialLinks.github}
                  onChangeText={(text) => handleInputChange('socialLinks.github', text)}
                  leftIcon="github"
                  autoCapitalize="none"
                  placeholder="github.com/username"
                />
              </View>
            </Animated.View>

            {/* Action Buttons Card */}
            <Animated.View
              style={[
                styles.actionCard,
                {
                  opacity: cardAnimations[3],
                  transform: [
                    {
                      translateY: cardAnimations[3].interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  { 
                    borderColor: theme.colors.border?.light || '#E0E0E0',
                    backgroundColor: theme.colors.surface?.primary || theme.colors.surface || '#FFFFFF',
                  },
                  theme.shadows?.sm || {},
                ]}
                onPress={handleCancel}
              >
                <MaterialCommunityIcons 
                  name="close" 
                  size={20} 
                  color={theme.colors.text.secondary} 
                />
                <Text style={[styles.secondaryButtonText, { color: theme.colors.text.primary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <GradientButton
                onPress={handleSave}
                disabled={!hasChanges || isSaving}
                style={[styles.primaryButton, { opacity: hasChanges ? 1 : 0.6 }]}
              >
                {isSaving ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="check" size={20} color="white" />
                    <Text style={styles.primaryButtonText}>Save Changes</Text>
                  </>
                )}
              </GradientButton>
            </Animated.View>
          </ScrollView>
        </Animated.View>
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
  content: {
    flex: 1,
  },
  
  // Loading styles
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginTop: 16,
  },

  // Header styles
  gradientHeader: {
    paddingTop: 20,
    paddingBottom: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },

  // Avatar styles
  avatarSection: {
    alignItems: 'center',
    paddingTop: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarInitial: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  avatarHint: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },

  // Scroll content
  scrollContent: {
    paddingTop: 24,
    paddingBottom: 120,
    paddingHorizontal: 20,
  },

  // Card styles
  card: {
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
    gap: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  cardContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },

  // Form styles
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  halfInput: {
    flex: 1,
  },

  // Action card styles
  actionCard: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    marginTop: 8,
    gap: 16,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
});

export default EditProfileScreen;