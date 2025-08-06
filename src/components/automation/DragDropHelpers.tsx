import React, { useRef, useEffect } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');

// Drop zone indicator with animated highlighting
export const DropZoneIndicator: React.FC<{
  isActive: boolean;
  position: 'top' | 'bottom';
  color?: string;
}> = ({ isActive, position, color = '#8B5CF6' }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: isActive ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isActive, animatedValue]);

  const animatedStyle = {
    opacity: animatedValue,
    height: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [2, 4],
    }),
    backgroundColor: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['transparent', color],
    }),
  };

  return (
    <Animated.View
      style={[
        styles.dropZoneIndicator,
        animatedStyle,
        position === 'top' ? styles.dropZoneTop : styles.dropZoneBottom,
      ]}
    />
  );
};

// Drag preview component with opacity and scale animation
export const DragPreview: React.FC<{
  children: React.ReactNode;
  isDragging: boolean;
}> = ({ children, isDragging }) => {
  const scaleValue = useRef(new Animated.Value(1)).current;
  const opacityValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isDragging) {
      Animated.parallel([
        Animated.timing(scaleValue, {
          toValue: 1.05,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityValue, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isDragging, scaleValue, opacityValue]);

  return (
    <Animated.View
      style={[
        {
          transform: [{ scale: scaleValue }],
          opacity: opacityValue,
        },
        isDragging && styles.dragPreviewShadow,
      ]}
    >
      {children}
    </Animated.View>
  );
};

// Connection line between steps
export const ConnectionLine: React.FC<{
  visible: boolean;
  color?: string;
}> = ({ visible, color = '#8B5CF6' }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [visible, animatedValue]);

  const animatedStyle = {
    opacity: animatedValue,
    width: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 2],
    }),
  };

  return (
    <View style={styles.connectionLineContainer}>
      <Animated.View
        style={[
          styles.connectionLine,
          { backgroundColor: color },
          animatedStyle,
        ]}
      />
      <View style={styles.connectionDots}>
        {[0, 1, 2].map((index) => (
          <Animated.View
            key={index}
            style={[
              styles.connectionDot,
              { backgroundColor: color },
              {
                opacity: animatedValue,
                transform: [
                  {
                    scale: animatedValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 1],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

// Animated step counter badge
export const StepCounterBadge: React.FC<{
  count: number;
  color?: string;
}> = ({ count, color = '#8B5CF6' }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const prevCount = useRef(count);

  useEffect(() => {
    if (count !== prevCount.current) {
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
      prevCount.current = count;
    }
  }, [count, animatedValue]);

  return (
    <Animated.View
      style={[
        styles.stepCounterBadge,
        { backgroundColor: color },
        {
          transform: [
            {
              scale: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.2],
              }),
            },
          ],
        },
      ]}
    >
      <Animated.Text
        style={[
          styles.stepCounterText,
          {
            color: animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: ['white', '#FFD700'],
            }),
          },
        ]}
      >
        {count}
      </Animated.Text>
    </Animated.View>
  );
};

// Validation indicator with pulse animation
export const ValidationIndicator: React.FC<{
  isValid: boolean;
  isConfigured: boolean;
}> = ({ isValid, isConfigured }) => {
  const pulseValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isValid) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseValue, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseValue, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseValue.setValue(0);
    }
  }, [isValid, pulseValue]);

  if (isConfigured && isValid) {
    return (
      <View style={[styles.validationIndicator, styles.validIndicator]}>
        <MaterialCommunityIcons name="check-circle" size={16} color="white" />
      </View>
    );
  }

  if (!isConfigured) {
    return (
      <Animated.View
        style={[
          styles.validationIndicator,
          styles.warningIndicator,
          {
            opacity: pulseValue.interpolate({
              inputRange: [0, 1],
              outputRange: [0.6, 1],
            }),
          },
        ]}
      >
        <MaterialCommunityIcons name="alert-circle" size={16} color="white" />
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.validationIndicator,
        styles.errorIndicator,
        {
          opacity: pulseValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0.6, 1],
          }),
        },
      ]}
    >
      <MaterialCommunityIcons name="close-circle" size={16} color="white" />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  dropZoneIndicator: {
    width: '100%',
    borderRadius: 2,
    marginVertical: 2,
  },
  dropZoneTop: {
    marginBottom: 4,
  },
  dropZoneBottom: {
    marginTop: 4,
  },
  dragPreviewShadow: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  connectionLineContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 20,
    marginVertical: 4,
  },
  connectionLine: {
    height: 2,
    borderRadius: 1,
  },
  connectionDots: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: 30,
    marginTop: -6,
  },
  connectionDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  stepCounterBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  stepCounterText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  validationIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  validIndicator: {
    backgroundColor: '#4CAF50',
  },
  warningIndicator: {
    backgroundColor: '#FF9800',
  },
  errorIndicator: {
    backgroundColor: '#F44336',
  },
});