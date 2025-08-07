import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  TouchableOpacity
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  ActivityIndicator,
  useTheme,
  Appbar,
  Avatar,
  IconButton
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { supabase } from '../../services/supabase/client';
import { updateProfile } from '../../store/slices/authSlice';
import { EventLogger } from '../../utils/EventLogger';
import * as ImagePicker from 'expo-image-picker';

const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [location, setLocation] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAvatar, setIsLoadingAvatar] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.user_metadata?.display_name || user.email?.split('@')[0] || '');
      setBio(user.user_metadata?.bio || '');
      setWebsite(user.user_metadata?.website || '');
      setLocation(user.user_metadata?.location || '');
      setAvatarUrl(user.user_metadata?.avatar_url || '');
    }
  }, [user]);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Please allow access to your photo library to change your profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadAvatar(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (uri: string) => {
    setIsLoadingAvatar(true);
    try {
      // In a real app, you would upload this to Supabase Storage
      // For now, we'll just update the local state
      setAvatarUrl(uri);
      EventLogger.info('Profile', 'Avatar updated locally');
    } catch (error) {
      EventLogger.error('Profile', 'Avatar upload failed:', error as Error);
      Alert.alert('Error', 'Failed to update profile picture');
    } finally {
      setIsLoadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Display name is required');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          display_name: displayName.trim(),
          bio: bio.trim(),
          website: website.trim(),
          location: location.trim(),
          avatar_url: avatarUrl,
        }
      });

      if (error) throw error;

      // Update Redux store
      dispatch(updateProfile({
        display_name: displayName.trim(),
        bio: bio.trim(),
        website: website.trim(),
        location: location.trim(),
        avatar_url: avatarUrl,
      }));

      EventLogger.info('Profile', 'Profile updated successfully');
      Alert.alert(
        'Success',
        'Your profile has been updated',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      EventLogger.error('Profile', 'Profile update failed:', error as Error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to update profile'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Edit Profile" />
        <Appbar.Action 
          icon="check" 
          onPress={handleSaveProfile}
          disabled={isLoading}
        />
      </Appbar.Header>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Card style={styles.avatarCard}>
            <Card.Content style={styles.avatarContent}>
              <TouchableOpacity 
                onPress={pickImage}
                disabled={isLoadingAvatar}
                style={styles.avatarContainer}
              >
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                ) : (
                  <Avatar.Icon 
                    size={100} 
                    icon="account" 
                    style={styles.avatarIcon}
                  />
                )}
                {isLoadingAvatar ? (
                  <View style={styles.avatarOverlay}>
                    <ActivityIndicator color="white" />
                  </View>
                ) : (
                  <View style={styles.avatarOverlay}>
                    <IconButton
                      icon="camera"
                      iconColor="white"
                      size={24}
                    />
                  </View>
                )}
              </TouchableOpacity>
              <Text variant="bodySmall" style={styles.avatarHint}>
                Tap to change profile picture
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <TextInput
                label="Display Name *"
                value={displayName}
                onChangeText={setDisplayName}
                style={styles.input}
                disabled={isLoading}
                maxLength={50}
              />

              <TextInput
                label="Bio"
                value={bio}
                onChangeText={setBio}
                style={styles.input}
                disabled={isLoading}
                multiline
                numberOfLines={3}
                maxLength={200}
              />

              <TextInput
                label="Website"
                value={website}
                onChangeText={setWebsite}
                style={styles.input}
                disabled={isLoading}
                autoCapitalize="none"
                keyboardType="url"
              />

              <TextInput
                label="Location"
                value={location}
                onChangeText={setLocation}
                style={styles.input}
                disabled={isLoading}
                maxLength={100}
              />

              <Text variant="bodySmall" style={styles.email}>
                Email: {user?.email}
              </Text>
              <Text variant="bodySmall" style={styles.note}>
                Email cannot be changed
              </Text>
            </Card.Content>
          </Card>

          <Button
            mode="contained"
            onPress={handleSaveProfile}
            loading={isLoading}
            disabled={isLoading}
            style={styles.button}
          >
            Save Changes
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  avatarCard: {
    marginBottom: 16,
  },
  avatarContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarIcon: {
    backgroundColor: '#8B5CF6',
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarHint: {
    marginTop: 8,
    color: '#666',
  },
  card: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginBottom: 16,
  },
  email: {
    marginTop: 8,
    color: '#333',
  },
  note: {
    marginTop: 4,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default EditProfileScreen;