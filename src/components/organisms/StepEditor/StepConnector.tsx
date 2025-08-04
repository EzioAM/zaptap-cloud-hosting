import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { theme } from '../../../theme';

interface StepConnectorProps {
  isActive?: boolean;
  color?: string;
}

export const StepConnector: React.FC<StepConnectorProps> = ({
  isActive = false,
  color = theme.tokens.colors.indigo[500],
}) => {
  const animatedLineStyle = useAnimatedStyle(() => {
    if (isActive) {
      return {
        opacity: withRepeat(
          withSequence(
            withSpring(0.3, { duration: 500 }),
            withSpring(1, { duration: 500 })
          ),
          -1,
          true
        ),
      };
    }
    return { opacity: 1 };
  });
  
  const animatedDotStyle = useAnimatedStyle(() => {
    if (isActive) {
      return {
        transform: [
          {
            scale: withRepeat(
              withSequence(
                withSpring(1.2, { duration: 300 }),
                withSpring(0.8, { duration: 300 })
              ),
              -1,
              true
            ),
          },
        ],
      };
    }
    return { transform: [{ scale: 1 }] };
  });
  
  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.line,
          { backgroundColor: color },
          animatedLineStyle,
        ]}
      />
      <View style={styles.dotsContainer}>
        {[0, 1, 2].map((index) => (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              { backgroundColor: color },
              index === 1 && animatedDotStyle,
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: -theme.spacing.xs,
  },
  line: {
    position: 'absolute',
    width: 2,
    height: '100%',
    left: theme.spacing.md + 24 - 1, // Align with icon center
  },
  dotsContainer: {
    flexDirection: 'row',
    position: 'absolute',
    left: theme.spacing.md + 24 - 6, // Center dots on line
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 2,
  },
});