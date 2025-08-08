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
import { useTheme } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { EventLogger } from '../../utils/EventLogger';
import { supabase } from '../../services/supabase/client';

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
  const theme = useTheme();
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
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  
  useEffect(() => {
    loadUserProfile();
    
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
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
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.onSurface }]}>
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  
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
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
                <Text style={[styles.headerButtonText, { color: theme.colors.primary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
                Edit Profile
              </Text>
              <TouchableOpacity
                onPress={handleSave}
                disabled={!hasChanges || isSaving}
                style={styles.headerButton}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                  <Text
                    style={[
                      styles.headerButtonText,
                      {
                        color: hasChanges ? theme.colors.primary : theme.colors.onSurfaceVariant,
                      },
                    ]}
                  >
                    Save
                  </Text>
                )}
              </TouchableOpacity>
            </View>
            
            {/* Avatar Section */}
            <View style={styles.avatarSection}>
              <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
                {profileData.avatarUri ? (
                  <Image source={{ uri: profileData.avatarUri }} style={styles.avatar} />
                ) : (
                  <LinearGradient
                    colors={['#8B5CF6', '#EC4899']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.avatarPlaceholder}
                  >
                    <Text style={styles.avatarInitial}>
                      {profileData.firstName.charAt(0).toUpperCase() || 'U'}
                    </Text>
                  </LinearGradient>
                )}
                <View style={[styles.avatarBadge, { backgroundColor: theme.colors.primary }]}>
                  <MaterialCommunityIcons name="camera" size={20} color="white" />
                </View>
              </TouchableOpacity>
              <Text style={[styles.avatarHint, { color: theme.colors.onSurfaceVariant }]}>
                Tap to change photo
              </Text>
            </View>
            
            {/* Personal Information */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                Personal Information
              </Text>
              
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
            
            {/* Professional Information */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                Professional Information
              </Text>
              
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
                leftIcon="briefcase"
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
            
            {/* Social Links */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                Social Links
              </Text>
              
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
            
            {/* Action Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: theme.colors.outline }]}
                onPress={handleCancel}
              >
                <Text style={[styles.secondaryButtonText, { color: theme.colors.onSurface }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <GradientButton
                onPress={handleSave}
                disabled={!hasChanges || isSaving}
                style={styles.primaryButton}
              >
                {isSaving ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.primaryButtonText}>Save Changes</Text>
                )}
              </GradientButton>
            </View>
          </Animated.View>
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
  },
  content: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerButton: {
    padding: 4,
    minWidth: 60,
    alignItems: 'center',
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
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
  avatarInitial: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  avatarHint: {
    fontSize: 14,
    marginTop: 8,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 24,
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default EditProfileScreen;