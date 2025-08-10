/**
 * AutomationPreview component - Quick preview modal for automations
 * 
 * Features:
 * - Full-screen modal with glass morphism design
 * - Automation details and statistics
 * - Step visualization preview
 * - Deployment options (NFC/QR)
 * - Share functionality
 * - Creator information
 * - Smooth animations and transitions
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  Animated,
  Platform,
  Share,
  Alert,
  Image,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getExtendedColors, getGlassStyle } from '../../theme/colors';
import { EventLogger } from '../../utils/EventLogger';
import { 
  useGetAutomationByPublicIdQuery,
  createShareUrl,
  createDeepLink 
} from '../../store/api/searchApi';
import ShareHelper from '../../utils/ShareHelper';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AutomationPreviewProps {
  visible: boolean;
  publicId: string | null;
  onClose: () => void;
  onDeployPress?: (type: 'nfc' | 'qr', automation: any) => void;
  onCreatorPress?: (creatorId: string) => void;
  theme?: 'light' | 'dark';
}

interface StepPreviewProps {
  step: {
    id: string;
    type: string;
    name: string;
    config: any;
    order: number;
  };
  theme?: 'light' | 'dark';
}

const StepPreview: React.FC<StepPreviewProps> = ({ step, theme = 'light' }) => {
  const colors = getExtendedColors(theme);
  
  const getStepIcon = (type: string): string => {
    const iconMap: Record<string, string> = {
      'sms': 'chatbubble',
      'email': 'mail',
      'webhook': 'globe',
      'notification': 'notifications',
      'wait': 'time',
      'conditional': 'git-branch',
      'variable': 'code',
      'location': 'location',
      'device': 'phone-portrait',
      'api': 'server',
    };
    return iconMap[type] || 'ellipse';
  };

  const getStepColor = (type: string): string => {
    const colorMap: Record<string, string> = {
      'sms': '#10B981',
      'email': '#3B82F6',
      'webhook': '#8B5CF6',
      'notification': '#F59E0B',
      'wait': '#6B7280',
      'conditional': '#EC4899',
      'variable': '#06B6D4',
      'location': '#EF4444',
      'device': '#7C3AED',
      'api': '#059669',
    };
    return colorMap[type] || '#6B7280';
  };

  const stepColor = getStepColor(step.type);
  
  return (
    <View style={[styles.stepPreview, { borderColor: stepColor + '30' }]}>
      <LinearGradient
        colors={[stepColor + '20', stepColor + '05']}
        style={styles.stepGradient}
      />
      <View style={[styles.stepIcon, { backgroundColor: stepColor }]}>
        <Ionicons name={getStepIcon(step.type) as any} size={16} color="white" />
      </View>
      <View style={styles.stepContent}>
        <Text style={[styles.stepName, { color: colors.text.primary }]}>
          {step.name}
        </Text>
        <Text style={[styles.stepType, { color: stepColor }]}>
          {step.type.toUpperCase()}
        </Text>
      </View>
    </View>
  );
};

export const AutomationPreview: React.FC<AutomationPreviewProps> = ({
  visible,
  publicId,
  onClose,
  onDeployPress,
  onCreatorPress,
  theme = 'light',
}) => {
  const [showFullDescription, setShowFullDescription] = useState(false);
  const slideAnimation = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayAnimation = useRef(new Animated.Value(0)).current;
  
  const colors = getExtendedColors(theme);
  const insets = useSafeAreaInsets();
  
  const { data: automation, isLoading, error } = useGetAutomationByPublicIdQuery(
    publicId || '',
    { skip: !publicId || !visible }
  );

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnimation, {
          toValue: 0,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayAnimation, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnimation, {
          toValue: SCREEN_HEIGHT,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleShare = async () => {
    if (!automation) return;
    
    // Use centralized ShareHelper for consistent sharing
    await ShareHelper.shareAutomation(automation);
  };

  const handleDeploy = (type: 'nfc' | 'qr') => {
    if (automation) {
      onDeployPress?.(type, automation);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Ionicons key={`star-${i}`} name="star" size={14} color="#F59E0B" />);
    }
    
    if (hasHalfStar) {
      stars.push(<Ionicons key="half-star" name="star-half" size={14} color="#F59E0B" />);
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Ionicons key={`empty-${i}`} name="star-outline" size={14} color="#9CA3AF" />);
    }
    
    return stars;
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: overlayAnimation,
          }
        ]}
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={50} tint={theme} style={StyleSheet.absoluteFillObject} />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
        )}
      </Animated.View>

      <Animated.View
        style={[
          styles.modal,
          {
            transform: [{ translateY: slideAnimation }],
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          }
        ]}
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={100} tint={theme} style={styles.modalBlur}>
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.1)', 'rgba(124, 58, 237, 0.05)']}
              style={styles.modalGradient}
            />
          </BlurView>
        ) : (
          <View style={[StyleSheet.absoluteFillObject, getGlassStyle('strong', theme === 'dark')]} />
        )}

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <View style={[styles.closeButtonBackground, { backgroundColor: colors.surface.secondary }]}>
              <Ionicons name="close" size={20} color={colors.text.primary} />
            </View>
          </TouchableOpacity>
          
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
            Automation Preview
          </Text>
          
          <TouchableOpacity onPress={handleShare} style={styles.shareHeaderButton}>
            <LinearGradient
              colors={['#8B5CF6', '#7C3AED']}
              style={styles.shareButtonGradient}
            >
              <Ionicons name="share" size={18} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <View style={[styles.loadingSkeleton, { backgroundColor: colors.surface.secondary }]} />
              <View style={[styles.loadingSkeleton, { backgroundColor: colors.surface.secondary, width: '70%' }]} />
              <View style={[styles.loadingSkeleton, { backgroundColor: colors.surface.secondary, height: 100 }]} />
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={48} color={colors.semantic.error} />
              <Text style={[styles.errorText, { color: colors.text.secondary }]}>
                Unable to load automation details
              </Text>
            </View>
          ) : automation ? (
            <>
              {/* Basic Info */}
              <View style={styles.infoSection}>
                <Text style={[styles.title, { color: colors.text.primary }]}>
                  {automation.title}
                </Text>
                <Text style={[styles.category, { color: colors.brand.primary }]}>
                  {automation.category}
                </Text>
                
                {/* Rating */}
                <View style={styles.ratingContainer}>
                  <View style={styles.starsContainer}>
                    {renderStars(automation.rating)}
                  </View>
                  <Text style={[styles.ratingText, { color: colors.text.secondary }]}>
                    {automation.rating.toFixed(1)} ({formatNumber(automation.reviewCount)} reviews)
                  </Text>
                </View>
              </View>

              {/* Stats */}
              <View style={styles.statsSection}>
                <View style={[styles.statCard, { backgroundColor: colors.surface.elevated }]}>
                  <Ionicons name="play" size={20} color="#10B981" />
                  <Text style={[styles.statNumber, { color: colors.text.primary }]}>
                    {formatNumber(automation.executionCount)}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
                    Executions
                  </Text>
                </View>
                
                <View style={[styles.statCard, { backgroundColor: colors.surface.elevated }]}>
                  <Ionicons name="layers" size={20} color="#8B5CF6" />
                  <Text style={[styles.statNumber, { color: colors.text.primary }]}>
                    {automation.steps?.length || 0}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
                    Steps
                  </Text>
                </View>
                
                <View style={[styles.statCard, { backgroundColor: colors.surface.elevated }]}>
                  <Ionicons name="person" size={20} color="#F59E0B" />
                  <Text style={[styles.statNumber, { color: colors.text.primary }]}>
                    {automation.createdBy.username}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
                    Creator
                  </Text>
                </View>
              </View>

              {/* Description */}
              <View style={styles.descriptionSection}>
                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                  Description
                </Text>
                <Text 
                  style={[styles.description, { color: colors.text.secondary }]}
                  numberOfLines={showFullDescription ? undefined : 3}
                >
                  {automation.description}
                </Text>
                {automation.description.length > 150 && (
                  <TouchableOpacity onPress={() => setShowFullDescription(!showFullDescription)}>
                    <Text style={[styles.readMoreText, { color: colors.brand.primary }]}>
                      {showFullDescription ? 'Show Less' : 'Read More'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Steps Preview */}
              {automation.steps && automation.steps.length > 0 && (
                <View style={styles.stepsSection}>
                  <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                    Steps ({automation.steps.length})
                  </Text>
                  <View style={styles.stepsContainer}>
                    {automation.steps.map((step, index) => (
                      <StepPreview key={step.id} step={step} theme={theme} />
                    ))}
                  </View>
                </View>
              )}

              {/* Tags */}
              {automation.tags && automation.tags.length > 0 && (
                <View style={styles.tagsSection}>
                  <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                    Tags
                  </Text>
                  <View style={styles.tagsContainer}>
                    {automation.tags.map((tag, index) => (
                      <View
                        key={index}
                        style={[styles.tag, { backgroundColor: colors.brand.primary + '20' }]}
                      >
                        <Text style={[styles.tagText, { color: colors.brand.primary }]}>
                          {tag}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Deployment Options */}
              {automation.deployments && automation.deployments.length > 0 && (
                <View style={styles.deploymentsSection}>
                  <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                    Available Deployments
                  </Text>
                  <View style={styles.deploymentsContainer}>
                    {automation.deployments.map((deployment) => (
                      <TouchableOpacity
                        key={deployment.id}
                        style={[styles.deploymentCard, { backgroundColor: colors.surface.elevated }]}
                        onPress={() => handleDeploy(deployment.type)}
                      >
                        <Ionicons
                          name={deployment.type === 'nfc' ? 'radio' : 'qr-code'}
                          size={24}
                          color={colors.brand.primary}
                        />
                        <Text style={[styles.deploymentName, { color: colors.text.primary }]}>
                          {deployment.name}
                        </Text>
                        <Text style={[styles.deploymentType, { color: colors.text.secondary }]}>
                          {deployment.type.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </>
          ) : null}
        </ScrollView>

        {/* Footer Actions */}
        {automation && (
          <View style={[styles.footer, { borderTopColor: colors.border.light }]}>
            <TouchableOpacity
              style={[styles.footerButton, styles.deployButton]}
              onPress={() => handleDeploy('nfc')}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.footerButtonGradient}
              >
                <Ionicons name="radio" size={18} color="white" />
                <Text style={styles.footerButtonText}>Deploy NFC</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.footerButton, styles.qrButton]}
              onPress={() => handleDeploy('qr')}
            >
              <LinearGradient
                colors={['#8B5CF6', '#7C3AED']}
                style={styles.footerButtonGradient}
              >
                <Ionicons name="qr-code" size={18} color="white" />
                <Text style={styles.footerButtonText}>Generate QR</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  modal: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: 60,
    overflow: 'hidden',
  },
  modalBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  modalGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButton: {
    width: 40,
  },
  closeButtonBackground: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  shareHeaderButton: {
    width: 40,
    alignItems: 'flex-end',
  },
  shareButtonGradient: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  loadingContainer: {
    gap: 12,
  },
  loadingSkeleton: {
    height: 20,
    borderRadius: 10,
    opacity: 0.3,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
    textAlign: 'center',
  },
  infoSection: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    marginBottom: 4,
  },
  category: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  descriptionSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  readMoreText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  stepsSection: {
    marginBottom: 24,
  },
  stepsContainer: {
    gap: 12,
  },
  stepPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  stepGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepContent: {
    flex: 1,
  },
  stepName: {
    fontSize: 14,
    fontWeight: '600',
  },
  stepType: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  tagsSection: {
    marginBottom: 24,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deploymentsSection: {
    marginBottom: 24,
  },
  deploymentsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  deploymentCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
  },
  deploymentName: {
    fontSize: 14,
    fontWeight: '600',
  },
  deploymentType: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  footerButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  footerButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  footerButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  deployButton: {},
  qrButton: {},
});

export default AutomationPreview;