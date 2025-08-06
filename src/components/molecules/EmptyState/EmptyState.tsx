import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle, Rect, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Button } from '../../atoms/Button';
import { useSafeTheme } from '../../common/ThemeFallbackWrapper';
import { theme } from '../../../theme';

const { width: screenWidth } = Dimensions.get('window');
const illustrationSize = Math.min(screenWidth * 0.6, 240);

export type EmptyStateType = 
  | 'no-automations'
  | 'no-history'
  | 'no-results'
  | 'no-connection'
  | 'error'
  | 'coming-soon';

interface EmptyStateProps {
  type: EmptyStateType;
  title?: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  customIllustration?: React.ReactNode;
}

const Illustrations: Record<EmptyStateType, (colors: any) => React.ReactNode> = {
  'no-automations': (colors) => (
    <Svg width={illustrationSize} height={illustrationSize * 0.8} viewBox="0 0 240 192">
      <Defs>
        <LinearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={colors?.primary || '#6200ee'} stopOpacity="0.6" />
          <Stop offset="100%" stopColor={colors?.secondary || '#03dac6'} stopOpacity="0.6" />
        </LinearGradient>
      </Defs>
      {/* Robot body */}
      <Rect x="80" y="60" width="80" height="80" rx="20" fill="url(#grad1)" />
      {/* Robot head */}
      <Rect x="90" y="30" width="60" height="40" rx="15" fill={colors?.surface || '#f5f5f5'} stroke={colors?.onSurface || '#333333'} strokeWidth="2" />
      {/* Eyes */}
      <Circle cx="105" cy="50" r="5" fill={colors?.onSurface || '#333333'} />
      <Circle cx="135" cy="50" r="5" fill={colors?.onSurface || '#333333'} />
      {/* Arms */}
      <Rect x="60" y="80" width="20" height="40" rx="10" fill={colors?.surface || '#f5f5f5'} />
      <Rect x="160" y="80" width="20" height="40" rx="10" fill={colors?.surface || '#f5f5f5'} />
      {/* Question mark */}
      <Text x="120" y="110" fontSize="30" textAnchor="middle" fill="#FFFFFF">?</Text>
    </Svg>
  ),
  
  'no-history': (colors) => (
    <Svg width={illustrationSize} height={illustrationSize * 0.8} viewBox="0 0 240 192">
      <Defs>
        <LinearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={colors?.secondary || '#03dac6'} stopOpacity="0.3" />
          <Stop offset="100%" stopColor={colors?.primary || '#6200ee'} stopOpacity="0.3" />
        </LinearGradient>
      </Defs>
      {/* Clock face */}
      <Circle cx="120" cy="96" r="60" fill="url(#grad2)" />
      <Circle cx="120" cy="96" r="50" fill={colors?.surface || '#ffffff'} stroke={colors?.onSurface || '#333333'} strokeWidth="2" />
      {/* Clock hands */}
      <Path d="M120 96 L120 66" stroke={colors?.onSurface || '#333333'} strokeWidth="4" strokeLinecap="round" />
      <Path d="M120 96 L140 96" stroke={colors?.onSurfaceVariant || '#666666'} strokeWidth="3" strokeLinecap="round" />
      {/* Center dot */}
      <Circle cx="120" cy="96" r="4" fill={colors?.onSurface || '#333333'} />
    </Svg>
  ),
  
  'no-results': (colors) => (
    <Svg width={illustrationSize} height={illustrationSize * 0.8} viewBox="0 0 240 192">
      <Defs>
        <LinearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={colors?.primary || '#2196F3'} stopOpacity="0.3" />
          <Stop offset="100%" stopColor={colors?.primary || '#6200ee'} stopOpacity="0.3" />
        </LinearGradient>
      </Defs>
      {/* Magnifying glass */}
      <Circle cx="100" cy="80" r="40" fill="url(#grad3)" stroke={colors?.onSurface || '#333333'} strokeWidth="3" />
      <Path d="M130 110 L160 140" stroke={colors?.onSurface || '#333333'} strokeWidth="6" strokeLinecap="round" />
      {/* X mark inside */}
      <Path d="M85 65 L115 95 M115 65 L85 95" stroke={colors?.onSurfaceVariant || '#666666'} strokeWidth="3" strokeLinecap="round" />
    </Svg>
  ),
  
  'no-connection': (colors) => (
    <Svg width={illustrationSize} height={illustrationSize * 0.8} viewBox="0 0 240 192">
      <Defs>
        <LinearGradient id="grad4" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={colors?.error || '#dc2626'} stopOpacity="0.3" />
          <Stop offset="100%" stopColor={colors?.error || '#fbbf24'} stopOpacity="0.3" />
        </LinearGradient>
      </Defs>
      {/* WiFi icon */}
      <Path d="M60 80 Q120 40 180 80" fill="none" stroke={colors?.outline || '#e0e0e0'} strokeWidth="4" strokeLinecap="round" strokeDasharray="5,5" />
      <Path d="M80 100 Q120 70 160 100" fill="none" stroke={colors?.outline || '#e0e0e0'} strokeWidth="4" strokeLinecap="round" strokeDasharray="5,5" />
      <Path d="M100 120 Q120 100 140 120" fill="none" stroke={colors?.outline || '#e0e0e0'} strokeWidth="4" strokeLinecap="round" strokeDasharray="5,5" />
      <Circle cx="120" cy="140" r="8" fill={colors?.error || '#dc2626'} />
      {/* X mark */}
      <Circle cx="160" cy="100" r="20" fill="url(#grad4)" />
      <Path d="M150 90 L170 110 M170 90 L150 110" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
    </Svg>
  ),
  
  'error': (colors) => (
    <Svg width={illustrationSize} height={illustrationSize * 0.8} viewBox="0 0 240 192">
      <Defs>
        <LinearGradient id="grad5" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={colors?.error || '#dc2626'} stopOpacity="0.8" />
          <Stop offset="100%" stopColor={colors?.error || '#dc2626'} stopOpacity="0.4" />
        </LinearGradient>
      </Defs>
      {/* Triangle */}
      <Path d="M120 40 L180 140 L60 140 Z" fill="url(#grad5)" stroke={colors?.error || '#dc2626'} strokeWidth="3" />
      {/* Exclamation mark */}
      <Path d="M120 70 L120 100" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />
      <Circle cx="120" cy="120" r="4" fill="#FFFFFF" />
    </Svg>
  ),
  
  'coming-soon': (colors) => (
    <Svg width={illustrationSize} height={illustrationSize * 0.8} viewBox="0 0 240 192">
      <Defs>
        <LinearGradient id="grad6" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={colors?.primary || '#6200ee'} stopOpacity="0.3" />
          <Stop offset="100%" stopColor={colors?.secondary || '#03dac6'} stopOpacity="0.3" />
        </LinearGradient>
      </Defs>
      {/* Rocket */}
      <G transform="translate(120, 96)">
        <Path d="M0 -40 Q20 -20 20 20 L10 40 L0 35 L-10 40 L-20 20 Q-20 -20 0 -40" fill="url(#grad6)" stroke={colors?.onSurface || '#333333'} strokeWidth="2" />
        {/* Window */}
        <Circle cx="0" cy="-10" r="8" fill={colors?.surface || '#ffffff'} stroke={colors?.onSurface || '#333333'} strokeWidth="2" />
        {/* Flames */}
        <Path d="M-10 30 Q-5 50 0 30 Q5 50 10 30" fill={colors?.error || '#fbbf24'} opacity="0.7" />
      </G>
      {/* Stars */}
      {[
        { x: 60, y: 40 },
        { x: 180, y: 50 },
        { x: 70, y: 130 },
        { x: 170, y: 120 },
      ].map(({ x, y }, i) => (
        <Circle key={i} cx={x} cy={y} r="3" fill={colors?.onSurfaceVariant || '#999999'} />
      ))}
    </Svg>
  ),
};

const defaultTitles: Record<EmptyStateType, string> = {
  'no-automations': 'No Automations Yet',
  'no-history': 'No History',
  'no-results': 'No Results Found',
  'no-connection': 'No Connection',
  'error': 'Something Went Wrong',
  'coming-soon': 'Coming Soon',
};

const defaultSubtitles: Record<EmptyStateType, string> = {
  'no-automations': 'Create your first automation to get started',
  'no-history': 'Your automation runs will appear here',
  'no-results': 'Try adjusting your search or filters',
  'no-connection': 'Please check your internet connection',
  'error': 'An unexpected error occurred. Please try again',
  'coming-soon': 'This feature is under development',
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  title,
  subtitle,
  actionLabel,
  onAction,
  customIllustration,
}) => {
  const safeTheme = useSafeTheme();
  const colors = safeTheme.colors;
  
  const illustration = customIllustration || Illustrations[type](colors);
  const displayTitle = title || defaultTitles[type];
  const displaySubtitle = subtitle || defaultSubtitles[type];
  
  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        {illustration}
      </Animated.View>
      
      <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.textContainer}>
        <Text style={[styles.title, { color: colors?.onSurface || '#333333' }]}>
          {displayTitle}
        </Text>
        <Text style={[styles.subtitle, { color: colors?.onSurfaceVariant || '#666666' }]}>
          {displaySubtitle}
        </Text>
      </Animated.View>
      
      {actionLabel && onAction && (
        <Animated.View entering={FadeInUp.delay(300).springify()}>
          <Button
            variant="primary"
            label={actionLabel}
            onPress={onAction}
            style={styles.button}
          />
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.xxl,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  title: {
    ...theme.typography.headlineMedium,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    ...theme.typography.bodyLarge,
    textAlign: 'center',
    opacity: 0.8,
  },
  button: {
    marginTop: theme.spacing.xl,
    minWidth: 160,
  },
});