import React from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeTheme } from '../common/ThemeFallbackWrapper';
import { useAppSelector } from '../../hooks/redux';

interface UserAvatarProps {
  size?: number;
  onPress?: () => void;
  showBadge?: boolean;
  imageUrl?: string | null;
  userName?: string | null;
  userEmail?: string | null;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  size = 40,
  onPress,
  showBadge = false,
  imageUrl,
  userName,
  userEmail,
}) => {
  const theme = useSafeTheme();
  const user = useAppSelector(state => state.auth.user);
  
  // Use provided props or fallback to user from Redux
  const avatarUrl = imageUrl ?? user?.user_metadata?.avatar_url ?? user?.avatar_url;
  const name = userName ?? user?.user_metadata?.full_name ?? user?.full_name ?? user?.name;
  const email = userEmail ?? user?.email;
  
  console.log('[UserAvatar] Avatar URL:', avatarUrl);
  console.log('[UserAvatar] User object:', user);
  console.log('[UserAvatar] User metadata:', user?.user_metadata);

  const getInitials = () => {
    if (name) {
      const parts = name.split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return name[0]?.toUpperCase() || '?';
    } else if (email) {
      return email[0]?.toUpperCase() || '?';
    }
    return '?';
  };

  const avatarContent = avatarUrl ? (
    <Image 
      source={{ uri: avatarUrl }} 
      style={[
        styles.image, 
        { 
          width: size, 
          height: size, 
          borderRadius: size / 2 
        }
      ]}
      onError={(error) => {
        console.log('[UserAvatar] Image load error:', error.nativeEvent.error);
        console.log('[UserAvatar] Failed URL:', avatarUrl);
      }}
      onLoad={() => {
        console.log('[UserAvatar] Image loaded successfully:', avatarUrl);
      }}
    />
  ) : (
    <LinearGradient
      colors={['#8B5CF6', '#EC4899', '#F472B6']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.gradient,
        { 
          width: size, 
          height: size, 
          borderRadius: size / 2 
        }
      ]}
    >
      {name || email ? (
        <Text style={[styles.initials, { fontSize: size * 0.4 }]}>
          {getInitials()}
        </Text>
      ) : (
        <MaterialCommunityIcons 
          name="account" 
          size={size * 0.6} 
          color="white" 
        />
      )}
    </LinearGradient>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={styles.container}
        activeOpacity={0.7}
      >
        {avatarContent}
        {showBadge && (
          <View 
            style={[
              styles.badge,
              {
                backgroundColor: theme.currentTheme.colors.semantic?.success || '#4CAF50',
                borderColor: theme.currentTheme.colors.background?.primary || '#FFFFFF',
              }
            ]}
          />
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {avatarContent}
      {showBadge && (
        <View 
          style={[
            styles.badge,
            {
              backgroundColor: theme.currentTheme.colors.semantic?.success || '#4CAF50',
              borderColor: theme.currentTheme.colors.background?.primary || '#FFFFFF',
            }
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    resizeMode: 'cover',
  },
  gradient: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
});