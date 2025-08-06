import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeTheme } from '../common/ThemeFallbackWrapper';

interface Automation {
  id: string;
  title: string;
  description: string;
  author: string;
  authorAvatar?: string;
  likes: number;
  uses: number;
  category: string;
  icon: string;
  color: string;
  trending?: boolean;
  hasLiked?: boolean;
  isLoading?: boolean;
}

interface AnimatedAutomationCardProps {
  automation: Automation;
  onPress: (automation: Automation) => void;
  onLike: (automation: Automation) => void;
  onShare?: (automation: Automation) => void;
  index?: number;
}

export const AnimatedAutomationCard: React.FC<AnimatedAutomationCardProps> = ({
  automation,
  onPress,
  onLike,
  onShare,
  index = 0,
}) => {
  const theme = useSafeTheme();
  const [isPressed, setIsPressed] = useState(false);
  
  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const likeScaleAnim = useRef(new Animated.Value(1)).current;
  const heartBurstAnim = useRef(new Animated.Value(0)).current;
  const shareRippleAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const tiltAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entry animation with stagger
    Animated.sequence([
      Animated.delay(index * 100),
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Shimmer effect for loading state
    if (automation.isLoading) {
      const shimmerAnimation = Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        })
      );
      shimmerAnimation.start();
      return () => shimmerAnimation.stop();
    }
  }, [index, automation.isLoading]);

  const handlePressIn = () => {
    setIsPressed(true);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.96,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(tiltAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(tiltAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePress = () => {
    onPress(automation);
  };

  const handleLikePress = () => {
    // Heart burst animation
    Animated.sequence([
      Animated.timing(likeScaleAnim, {
        toValue: 1.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(likeScaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(heartBurstAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      heartBurstAnim.setValue(0);
    });

    onLike(automation);
  };

  const handleSharePress = () => {
    // Ripple effect animation
    Animated.sequence([
      Animated.timing(shareRippleAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      shareRippleAnim.setValue(0);
    });

    onShare?.(automation);
  };

  // Animation interpolations
  const slideTransform = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });

  const tiltRotate = tiltAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '2deg'],
  });

  const shimmerTranslateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  const heartBurstScale = heartBurstAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.5, 0.5],
  });

  const heartBurstOpacity = heartBurstAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1, 0],
  });

  const shareRippleScale = shareRippleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 2.5],
  });

  const shareRippleOpacity = shareRippleAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0.6, 0.3, 0],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim,
          transform: [
            { translateY: slideTransform },
            { scale: scaleAnim },
            { rotate: tiltRotate },
          ],
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: theme.colors?.surface?.primary || theme.colors?.surface || '#fff',
          },
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Shimmer loading effect */}
        {automation.isLoading && (
          <Animated.View
            style={[
              styles.shimmerOverlay,
              {
                transform: [{ translateX: shimmerTranslateX }],
              },
            ]}
          />
        )}

        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: automation.color }]}>
            <MaterialCommunityIcons 
              name={automation.icon as any} 
              size={24} 
              color="white" 
            />
          </View>
          
          <View style={styles.cardInfo}>
            <Text 
              style={[
                styles.cardTitle, 
                { color: theme.colors?.text?.primary || theme.colors?.text || '#000' }
              ]} 
              numberOfLines={1}
            >
              {automation.title}
            </Text>
            <Text 
              style={[
                styles.cardAuthor, 
                { color: theme.colors?.text?.secondary || theme.colors?.textSecondary || '#666' }
              ]}
            >
              by {automation.author}
            </Text>
          </View>

          {automation.trending && (
            <Animated.View 
              style={[
                styles.trendingBadge,
                {
                  transform: [{
                    rotate: rotateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  }],
                },
              ]}
            >
              <MaterialCommunityIcons name="trending-up" size={16} color="#FF6B6B" />
            </Animated.View>
          )}
        </View>
        
        <Text 
          style={[
            styles.cardDescription, 
            { color: theme.colors?.text?.secondary || theme.colors?.textSecondary || '#666' }
          ]} 
          numberOfLines={2}
        >
          {automation.description}
        </Text>
        
        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={[styles.statItem, styles.likeButton]}
            onPress={handleLikePress}
          >
            <View style={styles.likeContainer}>
              <Animated.View
                style={[
                  styles.heartIcon,
                  {
                    transform: [{ scale: likeScaleAnim }],
                  },
                ]}
              >
                <MaterialCommunityIcons 
                  name={automation.hasLiked ? "heart" : "heart-outline"} 
                  size={20} 
                  color={automation.hasLiked ? "#FF6B6B" : (theme.colors?.text?.secondary || theme.colors?.textSecondary || '#666')} 
                />
              </Animated.View>
              
              {/* Heart burst effect */}
              <Animated.View
                style={[
                  styles.heartBurst,
                  {
                    opacity: heartBurstOpacity,
                    transform: [{ scale: heartBurstScale }],
                  },
                ]}
              >
                <MaterialCommunityIcons name="heart" size={20} color="#FF6B6B" />
              </Animated.View>
            </View>
            
            <Text 
              style={[
                styles.statText, 
                { color: theme.colors?.text?.secondary || theme.colors?.textSecondary || '#666' }
              ]}
            >
              {automation.likes}
            </Text>
          </TouchableOpacity>
          
          <View style={styles.statItem}>
            <MaterialCommunityIcons 
              name="download" 
              size={20} 
              color={theme.colors?.text?.secondary || theme.colors?.textSecondary || '#666'} 
            />
            <Text 
              style={[
                styles.statText, 
                { color: theme.colors?.text?.secondary || theme.colors?.textSecondary || '#666' }
              ]}
            >
              {automation.uses}
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.shareButton}
            onPress={handleSharePress}
          >
            <View style={styles.shareContainer}>
              <MaterialCommunityIcons 
                name="share-variant" 
                size={18} 
                color={theme.colors?.text?.secondary || theme.colors?.textSecondary || '#666'} 
              />
              
              {/* Ripple effect */}
              <Animated.View
                style={[
                  styles.shareRipple,
                  {
                    opacity: shareRippleOpacity,
                    transform: [{ scale: shareRippleScale }],
                  },
                ]}
              />
            </View>
          </TouchableOpacity>
          
          <LinearGradient
            colors={[
              `${theme.colors?.brand?.primary || '#2196F3'}20`,
              `${theme.colors?.brand?.primary || '#2196F3'}10`,
            ]}
            style={styles.categoryBadge}
          >
            <Text 
              style={[
                styles.categoryBadgeText, 
                { color: theme.colors?.brand?.primary || '#2196F3' }
              ]}
            >
              {automation.category}
            </Text>
          </LinearGradient>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 12,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
    position: 'relative',
    overflow: 'hidden',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 100,
    backgroundColor: 'rgba(255,255,255,0.3)',
    transform: [{ skewX: '-20deg' }],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardAuthor: {
    fontSize: 14,
  },
  trendingBadge: {
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  likeButton: {
    position: 'relative',
  },
  likeContainer: {
    position: 'relative',
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartIcon: {
    position: 'absolute',
  },
  heartBurst: {
    position: 'absolute',
  },
  shareButton: {
    marginRight: 16,
  },
  shareContainer: {
    position: 'relative',
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareRipple: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2196F3',
  },
  statText: {
    fontSize: 14,
    marginLeft: 4,
    fontWeight: '500',
  },
  categoryBadge: {
    marginLeft: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default AnimatedAutomationCard;