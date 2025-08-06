import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Dimensions,
  Alert,
  Share,
  Pressable,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeTheme } from '../common/ThemeFallbackWrapper';
import { ANIMATION_CONFIG } from '../../constants/animations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_HEIGHT = 120;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const ACTION_BUTTON_WIDTH = 80;

interface SavedAutomation {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  steps: any[];
  lastRun?: string;
  totalRuns: number;
  isActive: boolean;
  is_active?: boolean;
  tags: string[];
  createdAt: string;
  created_at?: string;
}

interface EnhancedAutomationCardProps {
  item: SavedAutomation;
  index: number;
  onPress: () => void;
  onEdit: () => void;
  onShare: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onLongPress?: () => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelectionToggle?: () => void;
}

const EnhancedAutomationCard: React.FC<EnhancedAutomationCardProps> = ({
  item,
  index,
  onPress,
  onEdit,
  onShare,
  onDelete,
  onToggleActive,
  onLongPress,
  isSelectionMode = false,
  isSelected = false,
  onSelectionToggle,
}) => {
  const theme = useSafeTheme();
  const [isFlipped, setIsFlipped] = useState(false);
  const [showActions, setShowActions] = useState(false);

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const flipAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(50)).current;

  // Entry animation on mount
  React.useEffect(() => {
    const delay = index * ANIMATION_CONFIG.STAGGERED_ENTRY_DELAY;
    
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: ANIMATION_CONFIG.ENTRY_ANIMATION_DURATION,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        tension: ANIMATION_CONFIG.SPRING_TENSION,
        friction: ANIMATION_CONFIG.SPRING_FRICTION,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index]);

  // Press animations
  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: ANIMATION_CONFIG.MICRO_INTERACTION_SCALE,
      tension: ANIMATION_CONFIG.SPRING_TENSION,
      friction: ANIMATION_CONFIG.SPRING_FRICTION,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: ANIMATION_CONFIG.SPRING_TENSION,
      friction: ANIMATION_CONFIG.SPRING_FRICTION,
      useNativeDriver: true,
    }).start();
  }, []);

  // Card flip animation
  const handleFlip = useCallback(() => {
    const toValue = isFlipped ? 0 : 1;
    
    Animated.timing(flipAnim, {
      toValue,
      duration: 600,
      useNativeDriver: true,
    }).start();
    
    setIsFlipped(!isFlipped);
  }, [isFlipped]);

  // Swipe gesture handling
  const handleGestureEvent = useCallback((event: any) => {
    const { translationX } = event.nativeEvent;
    slideAnim.setValue(translationX);
  }, []);

  const handleGestureStateChange = useCallback((event: any) => {
    const { translationX, state } = event.nativeEvent;
    
    if (state === State.END) {
      const shouldShowActions = Math.abs(translationX) > SWIPE_THRESHOLD;
      
      Animated.spring(slideAnim, {
        toValue: shouldShowActions ? (translationX > 0 ? ACTION_BUTTON_WIDTH * 3 : -ACTION_BUTTON_WIDTH * 3) : 0,
        tension: ANIMATION_CONFIG.SPRING_TENSION,
        friction: ANIMATION_CONFIG.SPRING_FRICTION,
        useNativeDriver: true,
      }).start();
      
      setShowActions(shouldShowActions);
    }
  }, []);

  // Toggle animation for active state
  const handleTogglePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: ANIMATION_CONFIG.MICRO_INTERACTION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 0,
        duration: ANIMATION_CONFIG.MICRO_INTERACTION_DURATION,
        useNativeDriver: true,
      }),
    ]).start();
    
    onToggleActive();
  }, [onToggleActive]);

  // Animated interpolations
  const flipInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const frontCardStyle = {
    transform: [
      { rotateY: flipInterpolate },
      { scale: scaleAnim },
    ],
  };

  const backCardStyle = {
    transform: [
      { rotateY: flipAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['180deg', '0deg'],
        })
      },
      { scale: scaleAnim },
    ],
  };

  const cardContainerStyle = {
    opacity: opacityAnim,
    transform: [
      { translateY },
      { translateX: slideAnim },
    ],
  };

  const isActive = item.is_active ?? item.isActive ?? true;

  // Action buttons for swipe gesture
  const renderActionButtons = () => (
    <View style={styles.actionButtonsContainer}>
      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: theme.colors?.primary || '#2196F3' }]}
        onPress={onShare}
      >
        <MaterialCommunityIcons name="share-variant" size={20} color="white" />
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
        onPress={onEdit}
      >
        <MaterialCommunityIcons name="pencil" size={20} color="white" />
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: '#ff4444' }]}
        onPress={onDelete}
      >
        <MaterialCommunityIcons name="delete" size={20} color="white" />
      </TouchableOpacity>
    </View>
  );

  // Front of the card (main content)
  const renderFrontCard = () => (
    <Animated.View style={[styles.cardFace, frontCardStyle]}>
      <View style={styles.cardContent}>
        {isSelectionMode && (
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={onSelectionToggle}
          >
            <MaterialCommunityIcons
              name={isSelected ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
              size={24}
              color={isSelected ? (theme.colors?.primary || '#2196F3') : theme.colors?.textSecondary || '#666'}
            />
          </TouchableOpacity>
        )}

        <View style={[styles.iconContainer, { backgroundColor: item.color || '#2196F3' }]}>
          <MaterialCommunityIcons name={(item.icon || 'flash') as any} size={24} color="white" />
        </View>
        
        <View style={styles.cardInfo}>
          <View style={styles.titleRow}>
            <Text style={[styles.cardTitle, { color: theme.colors?.text || '#000' }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
              <TouchableOpacity onPress={handleTogglePress} style={styles.toggleButton}>
                <MaterialCommunityIcons 
                  name={isActive ? "toggle-switch" : "toggle-switch-off"} 
                  size={28} 
                  color={isActive ? (theme.colors?.primary || '#2196F3') : '#ccc'} 
                />
              </TouchableOpacity>
            </Animated.View>
          </View>
          
          <Text style={[styles.cardDescription, { color: theme.colors?.textSecondary || '#666' }]} numberOfLines={2}>
            {item.description}
          </Text>
          
          <View style={styles.cardStats}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="play-circle" size={16} color={theme.colors?.textSecondary || '#666'} />
              <Text style={[styles.statText, { color: theme.colors?.textSecondary || '#666' }]}>
                {item.totalRuns || 0} runs
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="layers" size={16} color={theme.colors?.textSecondary || '#666'} />
              <Text style={[styles.statText, { color: theme.colors?.textSecondary || '#666' }]}>
                {item.steps?.length || 0} steps
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.flipButton} onPress={handleFlip}>
          <MaterialCommunityIcons name="flip-horizontal" size={20} color={theme.colors?.textSecondary || '#666'} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  // Back of the card (detailed view)
  const renderBackCard = () => (
    <Animated.View style={[styles.cardFace, styles.cardBack, backCardStyle]}>
      <View style={styles.cardContent}>
        <TouchableOpacity style={styles.flipButton} onPress={handleFlip}>
          <MaterialCommunityIcons name="flip-horizontal" size={20} color={theme.colors?.textSecondary || '#666'} />
        </TouchableOpacity>

        <View style={styles.backContent}>
          <Text style={[styles.backTitle, { color: theme.colors?.text || '#000' }]}>
            Automation Details
          </Text>

          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: theme.colors?.textSecondary || '#666' }]}>
              Created:
            </Text>
            <Text style={[styles.detailValue, { color: theme.colors?.text || '#000' }]}>
              {new Date(item.created_at || item.createdAt).toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: theme.colors?.textSecondary || '#666' }]}>
              Status:
            </Text>
            <Text style={[styles.detailValue, { color: isActive ? '#4CAF50' : '#ff4444' }]}>
              {isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>

          {item.lastRun && (
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: theme.colors?.textSecondary || '#666' }]}>
                Last Run:
              </Text>
              <Text style={[styles.detailValue, { color: theme.colors?.text || '#000' }]}>
                {item.lastRun}
              </Text>
            </View>
          )}

          {item.tags && item.tags.length > 0 && (
            <View style={styles.tagsSection}>
              <Text style={[styles.detailLabel, { color: theme.colors?.textSecondary || '#666' }]}>
                Tags:
              </Text>
              <View style={styles.tagsContainer}>
                {item.tags.map((tag, tagIndex) => (
                  <View key={tagIndex} style={[styles.tag, { backgroundColor: theme.colors?.primaryLight || '#E3F2FD' }]}>
                    <Text style={[styles.tagText, { color: theme.colors?.primary || '#2196F3' }]}>
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );

  if (Platform.OS === 'ios' && PanGestureHandler) {
    return (
      <Animated.View style={cardContainerStyle}>
        <PanGestureHandler
          onGestureEvent={handleGestureEvent}
          onHandlerStateChange={handleGestureStateChange}
        >
          <View style={styles.cardWrapper}>
            {showActions && renderActionButtons()}
            
            <Pressable
              style={[styles.automationCard, { backgroundColor: theme.colors?.surface || '#fff' }]}
              onPress={isSelectionMode ? onSelectionToggle : onPress}
              onLongPress={onLongPress}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              android_ripple={{ 
                color: theme.colors?.states?.pressed || 'rgba(0, 0, 0, 0.08)',
                borderless: false
              }}
            >
              {renderFrontCard()}
              {renderBackCard()}
            </Pressable>
          </View>
        </PanGestureHandler>
      </Animated.View>
    );
  }

  // Fallback for platforms without PanGestureHandler
  return (
    <Animated.View style={cardContainerStyle}>
      <Pressable
        style={[styles.automationCard, { backgroundColor: theme.colors?.surface || '#fff' }]}
        onPress={isSelectionMode ? onSelectionToggle : onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        android_ripple={{ 
          color: theme.colors?.states?.pressed || 'rgba(0, 0, 0, 0.08)',
          borderless: false
        }}
      >
        {renderFrontCard()}
        {renderBackCard()}
      </Pressable>
    </Animated.View>
  );
};

export default EnhancedAutomationCard;

const styles = StyleSheet.create({
  cardWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  automationCard: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
    height: CARD_HEIGHT,
  },
  cardFace: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
  },
  cardBack: {
    transform: [{ rotateY: '180deg' }],
  },
  cardContent: {
    flexDirection: 'row',
    padding: 16,
    flex: 1,
  },
  checkboxContainer: {
    marginRight: 12,
    justifyContent: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  toggleButton: {
    padding: 4,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 8,
  },
  cardStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  statText: {
    fontSize: 12,
    marginLeft: 4,
  },
  flipButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
  },
  backContent: {
    flex: 1,
    paddingTop: 32,
  },
  backTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
  },
  tagsSection: {
    marginTop: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionButtonsContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: -1,
  },
  actionButton: {
    width: ACTION_BUTTON_WIDTH,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});