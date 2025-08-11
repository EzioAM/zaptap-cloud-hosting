import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Text,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeTheme } from '../common/ThemeFallbackWrapper';
import { theme } from '../../theme';
import { StorageService } from '../../services/supabase/storage';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { updateProfile } from '../../store/slices/authSlice';

interface ProfileImagePickerProps {
  currentImageUrl?: string | null;
  size?: number;
  onImageChange?: (imageUrl: string | null) => void;
  editable?: boolean;
}

export const ProfileImagePicker: React.FC<ProfileImagePickerProps> = ({
  currentImageUrl,
  size = 120,
  onImageChange,
  editable = true,
}) => {
  const currentTheme = useSafeTheme();
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(
    currentImageUrl || user?.user_metadata?.avatar_url || user?.avatar_url || null
  );

  // Update imageUri when user's avatar changes
  useEffect(() => {
    const userAvatar = user?.user_metadata?.avatar_url || user?.avatar_url;
    console.log('[ProfileImagePicker] User avatar URL:', userAvatar);
    console.log('[ProfileImagePicker] Current imageUri:', imageUri);
    if (userAvatar && userAvatar !== imageUri) {
      console.log('[ProfileImagePicker] Updating imageUri to:', userAvatar);
      setImageUri(userAvatar);
    }
  }, [user?.user_metadata?.avatar_url, user?.avatar_url]);

  const getInitials = () => {
    const name = user?.user_metadata?.full_name || user?.email || 'U';
    if (typeof name === 'string') {
      const parts = name.split(/[\s@]/);
      if (parts.length > 1) {
        return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
      }
      return name.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant camera roll permissions to upload a profile image.',
      );
      return false;
    }
    return true;
  };

  const processImage = async (uri: string) => {
    try {
      console.log('[ProfileImagePicker] Processing image, input URI:', uri);
      
      // Resize and compress image
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 500, height: 500 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      
      console.log('[ProfileImagePicker] Image processed, output URI:', manipulatedImage.uri);
      console.log('[ProfileImagePicker] Image dimensions:', manipulatedImage.width, 'x', manipulatedImage.height);
      
      return manipulatedImage.uri;
    } catch (error) {
      console.error('[ProfileImagePicker] Error processing image:', error);
      return uri;
    }
  };

  const pickImage = async () => {
    if (!editable || !user) return;

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'Images' as any, // Using string to avoid deprecation warning
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setLoading(true);
        
        console.log('[ProfileImagePicker] Original image URI:', result.assets[0].uri);
        
        // Process the image
        const processedUri = await processImage(result.assets[0].uri);
        console.log('[ProfileImagePicker] Processed image URI:', processedUri);
        
        // Upload to Supabase
        const uploadedUrl = await StorageService.uploadProfileImage(user.id, processedUri);
        
        if (uploadedUrl) {
          // Update user profile in database
          const success = await StorageService.updateUserProfileImage(user.id, uploadedUrl);
          
          if (success) {
            // Clean up old images
            await StorageService.deleteOldProfileImages(user.id);
            
            // Update local state
            setImageUri(uploadedUrl);
            
            // Update Redux store
            dispatch(updateProfile({ avatar_url: uploadedUrl }));
            
            // Notify parent component
            onImageChange?.(uploadedUrl);
            
            Alert.alert('Success', 'Profile image updated successfully!');
          } else {
            Alert.alert(
              'Storage Setup Required', 
              'Profile image storage is not configured. Please ask your administrator to set up the storage bucket in Supabase.',
              [{ text: 'OK' }]
            );
          }
        } else {
          Alert.alert('Error', 'Failed to upload image. Please try again.');
        }
      }
    } catch (error) {
      console.error('[ProfileImagePicker] Error picking image:', error);
      Alert.alert('Error', 'An error occurred while selecting the image.');
    } finally {
      setLoading(false);
    }
  };

  const removeImage = () => {
    if (!editable || !user) return;

    Alert.alert(
      'Remove Profile Image',
      'Are you sure you want to remove your profile image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const success = await StorageService.removeProfileImage(user.id);
              
              if (success) {
                setImageUri(null);
                dispatch(updateProfile({ avatar_url: null }));
                onImageChange?.(null);
                Alert.alert('Success', 'Profile image removed successfully!');
              } else {
                Alert.alert('Error', 'Failed to remove profile image.');
              }
            } catch (error) {
              console.error('[ProfileImagePicker] Error removing image:', error);
              Alert.alert('Error', 'An error occurred while removing the image.');
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const handlePress = () => {
    if (!editable) return;

    if (imageUri) {
      Alert.alert(
        'Profile Image',
        'Choose an action',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Change Image', onPress: pickImage },
          { text: 'Remove Image', style: 'destructive', onPress: removeImage },
        ],
      );
    } else {
      pickImage();
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, { width: size, height: size }]}
      onPress={handlePress}
      disabled={!editable || loading}
      activeOpacity={editable ? 0.7 : 1}
    >
      {loading ? (
        <View
          style={[
            styles.placeholder,
            {
              width: size,
              height: size,
              backgroundColor: currentTheme.colors?.surface?.secondary || '#F0F0F0',
            },
          ]}
        >
          <ActivityIndicator size="large" color={currentTheme.colors?.brand?.primary || '#6366F1'} />
        </View>
      ) : imageUri ? (
        <Image 
          source={{ uri: imageUri }} 
          style={[styles.image, { width: size, height: size }]}
          onError={(error) => {
            console.log('[ProfileImagePicker] Image load error:', error.nativeEvent.error);
            console.log('[ProfileImagePicker] Failed URL:', imageUri);
          }}
          onLoad={() => {
            console.log('[ProfileImagePicker] Image loaded successfully:', imageUri);
          }}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            {
              width: size,
              height: size,
              backgroundColor: currentTheme.colors?.brand?.primary || '#6366F1',
            },
          ]}
        >
          <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{getInitials()}</Text>
        </View>
      )}
      
      {editable && !loading && (
        <View
          style={[
            styles.editBadge,
            {
              backgroundColor: currentTheme.colors?.brand?.primary || '#6366F1',
              borderColor: currentTheme.colors?.background?.primary || '#FFFFFF',
            },
          ]}
        >
          <MaterialCommunityIcons
            name={imageUri ? 'pencil' : 'camera'}
            size={16}
            color={currentTheme.colors?.background?.primary || '#FFFFFF'}
          />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    borderRadius: 60,
  },
  placeholder: {
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
});