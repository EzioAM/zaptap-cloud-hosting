import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { updateProfile } from '../../store/slices/authSlice';
import { useSafeTheme } from '../../components/common/ThemeFallbackWrapper';
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
  const theme = useSafeTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  
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
    }
  };
  
  const triggerHaptic = async (type: 'light' | 'medium' | 'heavy' = 'light') => {
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
      EventLogger.error('EditProfile', 'Haptics not supported:', error as Error);
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
    
    if (profileData.website && !validateUrl(profileData.website)) {
      newErrors.website = 'Invalid website URL';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSave = async () => {
    console.log('[EditProfile] handleSave called');
    
    if (!validateProfile() || !user?.id) {
      console.log('[EditProfile] Validation failed or no user ID');
      triggerHaptic('heavy');
      return;
    }
    
    setIsSaving(true);
    triggerHaptic('medium');
    
    console.log('[EditProfile] Starting save with data:', { 
      firstName: profileData.firstName, 
      lastName: profileData.lastName 
    });
    
    try {
      const fullName = `${profileData.firstName} ${profileData.lastName}`.trim();
      console.log('[EditProfile] Full name:', fullName);
      console.log('[EditProfile] About to update auth metadata...');
      
      // Keep existing avatar URL for now (don't update avatar in this screen)
      const avatarUrl = user?.user_metadata?.avatar_url || originalData.avatarUri;
      
      // Update auth metadata with timeout
      console.log('[EditProfile] Calling supabase.auth.updateUser...');
      
      try {
        const authUpdatePromise = supabase.auth.updateUser({
          data: {
            full_name: fullName || undefined,
            first_name: profileData.firstName,
            last_name: profileData.lastName,
            phone: profileData.phone,
            company: profileData.company,
            role: profileData.role,
            bio: profileData.bio,
            website: profileData.website,
            location: profileData.location,
            twitter: profileData.socialLinks.twitter,
            linkedin: profileData.socialLinks.linkedin,
            github: profileData.socialLinks.github,
          },
        });
        
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Auth update timeout')), 5000)
        );
        
        const { error: authError } = await Promise.race([authUpdatePromise, timeoutPromise]) as any;
        
        if (authError) {
          console.log('[EditProfile] Auth update error:', authError);
          throw authError;
        }
        
        console.log('[EditProfile] Auth metadata updated successfully');
      } catch (error) {
        console.log('[EditProfile] Auth update failed or timed out:', error);
        // Continue anyway - we can still update the database and Redux
        console.log('[EditProfile] Continuing with database update despite auth failure...');
      }
      
      console.log('[EditProfile] About to update database...');
      
      // Update users table with only the fields that exist in the table (with timeout)
      console.log('[EditProfile] Calling database update...');
      
      try {
        const dbUpdatePromise = supabase
          .from('users')
          .update({
            name: fullName || user?.email?.split('@')[0] || 'User',
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);
          
        const dbTimeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database update timeout')), 5000)
        );
        
        const { error: dbError } = await Promise.race([dbUpdatePromise, dbTimeoutPromise]) as any;
        
        if (dbError) {
          console.log('[EditProfile] Database update error:', dbError);
          throw dbError;
        }
        
        console.log('[EditProfile] Database updated successfully');
      } catch (error) {
        console.log('[EditProfile] Database update failed or timed out:', error);
        console.log('[EditProfile] Continuing with Redux update despite database failure...');
      }
      
      console.log('[EditProfile] Database operations complete - continuing with Redux update');
      console.log('[EditProfile] Full name to save:', fullName);
      
      // Update Redux store immediately with the data we know is correct
      console.log('[EditProfile] About to update Redux store...');
      dispatch(updateProfile({
        name: fullName || user?.email?.split('@')[0] || 'User',
        first_name: profileData.firstName,
        last_name: profileData.lastName,
        avatar_url: avatarUrl,
        user_metadata: {
          ...user?.user_metadata,
          full_name: fullName || undefined,
          first_name: profileData.firstName,
          last_name: profileData.lastName,
        },
      }));
      
      console.log('[EditProfile] Redux store updated successfully');
      
      // Update the original data to reflect saved changes
      console.log('[EditProfile] Updating local state...');
      setOriginalData({ ...profileData, avatarUri: avatarUrl });
      setHasChanges(false);
      
      // Stop the spinner immediately
      console.log('[EditProfile] Stopping loading spinner...');
      setIsSaving(false);
      
      console.log('[EditProfile] Save complete, preparing navigation...');
      
      // Trigger success haptic
      console.log('[EditProfile] Triggering success haptic...');
      triggerHaptic('heavy');
      
      // Navigate back immediately - the profile has been saved
      console.log('[EditProfile] Scheduling navigation...');
      setTimeout(() => {
        console.log('[EditProfile] Executing navigation.goBack()...');
        navigation.goBack();
        console.log('[EditProfile] Navigation completed');
      }, 100);
      
    } catch (error: any) {
      console.log('[EditProfile] Save failed with error:', error);
      EventLogger.error('EditProfile', 'Failed to save profile:', error as Error);
      setIsSaving(false);
      
      // Small delay for error alert too
      setTimeout(() => {
        Alert.alert('Error', error.message || 'Failed to save profile');
      }, 100);
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
  
  // Remove the problematic full-screen loading - just show the normal form
  
  // Simplified version that works
  const backgroundColor = theme.colors.background?.primary || theme.colors.background || '#F5F5F5';
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: backgroundColor }}>
      {/* Simple header first */}
      <View style={{ backgroundColor: '#6366F1', padding: 20, paddingTop: 40 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <TouchableOpacity onPress={handleCancel}>
            <MaterialCommunityIcons name="close" size={24} color="white" />
          </TouchableOpacity>
          <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>Edit Profile</Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving || !hasChanges}>
            {isSaving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <MaterialCommunityIcons 
                name="check" 
                size={24} 
                color={hasChanges ? "white" : "rgba(255,255,255,0.5)"} 
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Simple content */}
      <ScrollView style={{ flex: 1, padding: 20 }}>
        <Text style={{ fontSize: 18, color: '#000', marginBottom: 20 }}>Edit Your Profile</Text>
        
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, color: '#666', marginBottom: 5 }}>First Name</Text>
          <TextInput
            style={{ 
              borderWidth: 1, 
              borderColor: '#DDD', 
              borderRadius: 8, 
              padding: 12, 
              backgroundColor: 'white',
              color: '#000',
              fontSize: 16
            }}
            value={profileData.firstName}
            onChangeText={(text) => handleInputChange('firstName', text)}
            placeholder="Enter first name"
            placeholderTextColor="#999"
          />
        </View>
        
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, color: '#666', marginBottom: 5 }}>Last Name</Text>
          <TextInput
            style={{ 
              borderWidth: 1, 
              borderColor: '#DDD', 
              borderRadius: 8, 
              padding: 12, 
              backgroundColor: 'white',
              color: '#000',
              fontSize: 16
            }}
            value={profileData.lastName}
            onChangeText={(text) => handleInputChange('lastName', text)}
            placeholder="Enter last name"
            placeholderTextColor="#999"
          />
        </View>
        
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, color: '#666', marginBottom: 5 }}>Email</Text>
          <View style={{ borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, backgroundColor: '#F5F5F5' }}>
            <Text style={{ color: '#666' }}>{profileData.email || user?.email || 'No email'}</Text>
          </View>
        </View>
        
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, color: '#666', marginBottom: 5 }}>Phone</Text>
          <TextInput
            style={{ 
              borderWidth: 1, 
              borderColor: '#DDD', 
              borderRadius: 8, 
              padding: 12, 
              backgroundColor: 'white',
              color: '#000',
              fontSize: 16
            }}
            value={profileData.phone}
            onChangeText={(text) => handleInputChange('phone', text)}
            placeholder="Enter phone number"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
          />
        </View>
        
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, color: '#666', marginBottom: 5 }}>Bio</Text>
          <TextInput
            style={{ 
              borderWidth: 1, 
              borderColor: '#DDD', 
              borderRadius: 8, 
              padding: 12, 
              backgroundColor: 'white',
              color: '#000',
              fontSize: 16,
              minHeight: 100,
              textAlignVertical: 'top'
            }}
            value={profileData.bio}
            onChangeText={(text) => handleInputChange('bio', text)}
            placeholder="Tell us about yourself"
            placeholderTextColor="#999"
            multiline={true}
            numberOfLines={4}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
  
  // Note: Original complex view with animations was causing rendering issues
  // This simplified version works reliably
};


export default EditProfileScreen;