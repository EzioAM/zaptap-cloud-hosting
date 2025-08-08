import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import {
  PanGestureHandler,
  State,
} from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeTheme } from '../../components/common/ThemeFallbackWrapper';
import { 
  ValidationIndicator, 
  DragPreview, 
  DropZoneIndicator 
} from './DragDropHelpers';
import { PressableAnimated } from './AnimationHelpers';

interface AutomationStep {
  id: string;
  type: string;
  title: string;
  icon: string;
  color: string;
  config?: any;
  enabled?: boolean;
}

interface EnhancedStepCardProps {
  step: AutomationStep;
  index: number;
  isDragging: boolean;
  isDropTarget: boolean;
  onPress: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onLongPress: () => void;
  onSwipeDelete?: () => void;
  drag?: () => void;
  showConnectionLine?: boolean;
}

export const EnhancedStepCard: React.FC<EnhancedStepCardProps> = ({
  step,
  index,
  isDragging,
  isDropTarget,
  onPress,
  onToggle,
  onDelete,
  onLongPress,
  onSwipeDelete,
  drag,
  showConnectionLine = true,
}) => {
  const theme = useSafeTheme();
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  
  // Animation values
  const slideValue = useRef(new Animated.Value(0)).current;
  const optionsOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  // Validation states
  const isConfigured = step.config && Object.keys(step.config).length > 0;
  const isValid = isConfigured; // Add more validation logic here

  useEffect(() => {
    // Glow effect for drop target
    if (isDropTarget) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      glowOpacity.setValue(0);
    }
  }, [isDropTarget, glowOpacity]);

  const handleSwipeGesture = (event: any) => {
    const { translationX, state } = event.nativeEvent;
    
    if (state === State.ACTIVE) {
      setIsSwipeActive(Math.abs(translationX) > 50);
      slideValue.setValue(translationX);
    } else if (state === State.END) {
      if (translationX < -100 && onSwipeDelete) {
        // Swipe to delete
        Animated.timing(slideValue, {
          toValue: -400,
          duration: 300,
          useNativeDriver: true,
        }).start(() => onSwipeDelete());
      } else {
        // Reset position
        Animated.spring(slideValue, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
        setIsSwipeActive(false);
      }
    }
  };

  const toggleOptionsMenu = () => {
    setShowOptionsMenu(!showOptionsMenu);
    Animated.timing(optionsOpacity, {
      toValue: showOptionsMenu ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const cardStyle = {
    transform: [
      { translateX: slideValue },
      { scale: cardScale },
    ],
  };

  const glowStyle = {
    opacity: glowOpacity,
  };

  return (
    <View style={styles.cardContainer}>
      {/* Drop zone indicator */}
      <DropZoneIndicator
      isActive={isDropTarget}
      position="top"
      color={step.color || '#8B5CF6'}
      />
      
      <PanGestureHandler
        onGestureEvent={handleSwipeGesture}
        onHandlerStateChange={handleSwipeGesture}
        enabled={Platform.OS !== 'web'}
      >
        <Animated.View style={styles.swipeContainer}>
          {/* Delete background */}
          <View style={[styles.deleteBackground, { backgroundColor: '#F44336' }]}>
            <MaterialCommunityIcons name="delete" size={24} color="white" />
            <Text style={styles.deleteText}>Delete</Text>
          </View>
          
          <DragPreview isDragging={isDragging}>
            <Animated.View style={[cardStyle]}>
              {/* Glow effect */}
              {isDropTarget && (
                <Animated.View
                  style={[
                    StyleSheet.absoluteFillObject,
                    styles.glowEffect,
                    { backgroundColor: (step.color || '#8B5CF6') + '40' },
                    glowStyle,
                  ]}
                />
              )}
              
              <PressableAnimated
                onPress={onPress}
                onLongPress={onLongPress || drag}
                hapticType="medium"
                style={[
                  styles.stepCard,
                  { backgroundColor: theme.colors?.surface || '#fff' },
                  isDragging && styles.cardDragging,
                  isSwipeActive && styles.cardSwipeActive,
                ]}
              >
                {/* Gradient overlay */}
                <LinearGradient
                  colors={[
                    'transparent',
                    (step.color || '#8B5CF6') + '08',
                    (step.color || '#8B5CF6') + '12',
                  ]}
                  style={StyleSheet.absoluteFillObject}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                
                <View style={styles.cardContent}>
                  {/* Step number badge */}
                  <View style={styles.stepNumberBadge}>
                    <Text style={styles.stepNumber}>{index + 1}</Text>
                  </View>
                  
                  {/* Main content */}
                  <View style={styles.stepMain}>
                    {/* Icon with animated background */}
                    <View style={styles.stepIconContainer}>
                      <LinearGradient
                        colors={[
                          step.color || '#8B5CF6',
                          (step.color || '#8B5CF6') + 'CC'
                        ]}
                        style={styles.stepIcon}
                      >
                        <MaterialCommunityIcons
                          name={step.icon as any}
                          size={24}
                          color="white"
                        />
                      </LinearGradient>
                      
                      {/* Validation indicator */}
                      <View style={styles.validationContainer}>
                        <ValidationIndicator
                          isValid={isValid}
                          isConfigured={isConfigured}
                        />
                      </View>
                    </View>
                    
                    {/* Step info */}
                    <View style={styles.stepInfo}>
                      <Text
                        style={[
                          styles.stepTitle,
                          { color: theme.colors?.text || '#000' },
                        ]}
                      >
                        {step.title}
                      </Text>
                      
                      {isConfigured ? (
                        <Text
                          style={[
                            styles.stepConfigStatus,
                            { color: '#4CAF50' },
                          ]}
                        >
                          Configured
                        </Text>
                      ) : (
                        <Text
                          style={[
                            styles.stepConfigStatus,
                            { color: '#FF9800' },
                          ]}
                        >
                          Needs configuration
                        </Text>
                      )}
                    </View>
                  </View>
                  
                  {/* Controls */}
                  <View style={styles.stepControls}>
                    {/* Toggle switch */}
                    <PressableAnimated
                      onPress={onToggle}
                      hapticType="light"
                    >
                      <View style={styles.toggleContainer}>
                        <MaterialCommunityIcons
                          name={step.enabled ? 'toggle-switch' : 'toggle-switch-off'}
                          size={32}
                          color={step.enabled ? (step.color || '#8B5CF6') : '#ccc'}
                        />
                      </View>
                    </PressableAnimated>
                    
                    {/* Options menu */}
                    <PressableAnimated
                      onPress={toggleOptionsMenu}
                      hapticType="light"
                    >
                      <View style={styles.optionsButton}>
                        <MaterialCommunityIcons
                          name="dots-vertical"
                          size={20}
                          color={theme.colors?.textSecondary || '#666'}
                        />
                      </View>
                    </PressableAnimated>
                  </View>
                </View>
                
                {/* Options menu */}
                {showOptionsMenu && (
                  <Animated.View
                    style={[
                      styles.optionsMenu,
                      { opacity: optionsOpacity },
                    ]}
                  >
                    <TouchableOpacity
                      onPress={() => {
                        onPress();
                        toggleOptionsMenu();
                      }}
                      style={styles.optionsMenuItem}
                    >
                      <MaterialCommunityIcons name="cog" size={16} color="#666" />
                      <Text style={styles.optionsMenuText}>Configure</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      onPress={() => {
                        onDelete();
                        toggleOptionsMenu();
                      }}
                      style={styles.optionsMenuItem}
                    >
                      <MaterialCommunityIcons name="delete" size={16} color="#F44336" />
                      <Text style={[styles.optionsMenuText, { color: '#F44336' }]}>
                        Delete
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                )}
              </PressableAnimated>
            </Animated.View>
          </DragPreview>
        </Animated.View>
      </PanGestureHandler>
      
      {/* Connection line to next step */}
      {showConnectionLine && (
        <View style={styles.connectionContainer}>
          <View style={[styles.connectionLine, { backgroundColor: (step.color || '#8B5CF6') + '40' }]} />
          <View style={styles.connectionArrow}>
            <MaterialCommunityIcons
              name="chevron-down"
              size={16}
              color={step.color || '#8B5CF6'}
            />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 8,
  },
  swipeContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  deleteBackground: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  deleteText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 12,
  },
  glowEffect: {
    borderRadius: 12,
    margin: -2,
  },
  stepCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  cardDragging: {
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  cardSwipeActive: {
    backgroundColor: '#ffebee',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  stepNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumber: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepIconContainer: {
    marginRight: 12,
    position: 'relative',
  },
  stepIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  validationContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  stepInfo: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  stepConfigStatus: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  stepControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleContainer: {
    marginRight: 8,
  },
  optionsButton: {
    padding: 8,
  },
  optionsMenu: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 120,
  },
  optionsMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  optionsMenuText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  connectionContainer: {
    alignItems: 'center',
    height: 20,
    justifyContent: 'center',
  },
  connectionLine: {
    width: 2,
    height: 12,
    borderRadius: 1,
  },
  connectionArrow: {
    marginTop: -2,
  },
});