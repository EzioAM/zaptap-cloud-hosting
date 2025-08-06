import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  ViewStyle, 
  ActivityIndicator,
  TouchableOpacity 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { EventLogger } from '../../utils/EventLogger';

export interface LoadingFallbackProps {
  title?: string;
  message?: string;
  style?: ViewStyle;
  showSpinner?: boolean;
  showProgress?: boolean;
  progress?: number;
  timeout?: number;
  onTimeout?: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'skeleton' | 'shimmer';
}

export const LoadingFallback: React.FC<LoadingFallbackProps> = ({
  title = 'Loading...',
  message,
  style,
  showSpinner = true,
  showProgress = false,
  progress = 0,
  timeout = 30000, // 30 seconds
  onTimeout,
  onCancel,
  showCancel = false,
  size = 'medium',
  variant = 'default',
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Start shimmer animation
    if (variant === 'shimmer') {
      const shimmer = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      shimmer.start();
    }

    // Pulse animation for spinner
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    if (showSpinner && variant === 'default') {
      pulse.start();
    }

    // Setup timeout
    if (timeout && onTimeout) {
      timeoutRef.current = setTimeout(() => {
        EventLogger.warn(
          'LoadingFallback',
          'Loading timeout reached',
          { title, timeout }
        );
        onTimeout();
      }, timeout);
    }

    return () => {
      shimmer?.stop?.();
      pulse?.stop?.();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [shimmerAnim, scaleAnim, variant, timeout, onTimeout, title, showSpinner]);

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: { padding: 16 },
          title: { fontSize: 14 },
          message: { fontSize: 12 },
          spinner: 20,
        };
      case 'large':
        return {
          container: { padding: 32 },
          title: { fontSize: 20 },
          message: { fontSize: 16 },
          spinner: 40,
        };
      default:
        return {
          container: { padding: 24 },
          title: { fontSize: 16 },
          message: { fontSize: 14 },
          spinner: 30,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      <View style={[styles.skeletonBar, styles.skeletonTitle]} />
      <View style={[styles.skeletonBar, styles.skeletonLine]} />
      <View style={[styles.skeletonBar, styles.skeletonLine, { width: '70%' }]} />
    </View>
  );

  const renderShimmer = () => {
    const shimmerTranslateX = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-100, 100],
    });

    return (
      <View style={styles.shimmerContainer}>
        <View style={styles.shimmerBar}>
          <Animated.View
            style={[
              styles.shimmerGradient,
              {
                transform: [{ translateX: shimmerTranslateX }],
              },
            ]}
          />
        </View>
        <View style={[styles.shimmerBar, { marginTop: 12, width: '80%' }]}>
          <Animated.View
            style={[
              styles.shimmerGradient,
              {
                transform: [{ translateX: shimmerTranslateX }],
              },
            ]}
          />
        </View>
      </View>
    );
  };

  const renderDefault = () => (
    <>
      {showSpinner && (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <ActivityIndicator 
            size={sizeStyles.spinner as any} 
            color="#6200ee" 
            style={styles.spinner}
          />
        </Animated.View>
      )}
      
      <Text style={[styles.title, sizeStyles.title]}>{title}</Text>
      
      {message && (
        <Text style={[styles.message, sizeStyles.message]}>{message}</Text>
      )}
      
      {showProgress && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${Math.max(0, Math.min(100, progress))}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>{Math.round(progress)}%</Text>
        </View>
      )}
      
      {showCancel && onCancel && (
        <TouchableOpacity 
          style={styles.cancelButton} 
          onPress={onCancel}
        >
          <MaterialCommunityIcons name="close" size={16} color="#666" />
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </>
  );

  const renderContent = () => {
    switch (variant) {
      case 'skeleton':
        return renderSkeleton();
      case 'shimmer':
        return renderShimmer();
      default:
        return renderDefault();
    }
  };

  return (
    <View style={[styles.container, sizeStyles.container, style]}>
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  spinner: {
    marginBottom: 16,
  },
  title: {
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  progressContainer: {
    width: '100%',
    maxWidth: 200,
    alignItems: 'center',
    marginBottom: 16,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6200ee',
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  
  // Skeleton styles
  skeletonContainer: {
    width: '100%',
    maxWidth: 250,
  },
  skeletonBar: {
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 12,
  },
  skeletonTitle: {
    height: 20,
    width: '60%',
  },
  skeletonLine: {
    height: 16,
    width: '100%',
  },
  
  // Shimmer styles
  shimmerContainer: {
    width: '100%',
    maxWidth: 250,
    alignItems: 'center',
  },
  shimmerBar: {
    height: 20,
    width: '100%',
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  shimmerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f5f5f5',
    opacity: 0.7,
    width: '30%',
  },
});

export default LoadingFallback;