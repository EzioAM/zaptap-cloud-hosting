import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Share,
  Linking,
  Text,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
  Pressable,
} from 'react-native';
import {
  Appbar,
  Card,
  List,
  Divider,
  Button,
  IconButton,
  Portal,
  Modal,
  TextInput,
  Switch,
  SegmentedButtons,
  ActivityIndicator,
} from 'react-native-paper';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { AutomationData } from '../../types';
import { supabase } from '../../services/supabase/client';
import { useSelector } from 'react-redux';
import { smartLinkService } from '../../services/linking/SmartLinkService';
import { RootState } from '../../store';
import { useTrackAutomationDownloadMutation, useGetAutomationQuery } from '../../store/api/automationApi';
import { useRefreshDashboardMutation } from '../../store/api/dashboardApi';
import NFCWriter from '../../components/nfc/NFCWriter';
import QRGenerator from '../../components/qr/QRGenerator';
import StarRating from '../../components/reviews/StarRating';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { ShareAutomationModal } from '../../components/sharing/ShareAutomationModal';
import { FullScreenModal } from '../../components/common/FullScreenModal';
import { VersionHistoryModal } from '../../components/versions/VersionHistoryModal';
import { AnalyticsModal } from '../../components/analytics/AnalyticsModal';
import { CommentsModal } from '../../components/comments/CommentsModal';
import { DeploymentOptions } from '../../components/deployment/DeploymentOptions';
import { EventLogger } from '../../utils/EventLogger';
import { useSafeTheme } from '../../components/common/ThemeFallbackWrapper';

type Props = NativeStackScreenProps<RootStackParamList, 'AutomationDetails'>;

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Step type mappings for modern icons and colors
const stepTypeMapping: Record<string, { icon: string; color: string; bgColor: string }> = {
  notification: { icon: 'bell', color: '#FF9800', bgColor: '#FFF3E0' },
  sms: { icon: 'message-text', color: '#2196F3', bgColor: '#E3F2FD' },
  email: { icon: 'email', color: '#4CAF50', bgColor: '#E8F5E8' },
  webhook: { icon: 'webhook', color: '#E91E63', bgColor: '#FCE4EC' },
  delay: { icon: 'clock', color: '#9E9E9E', bgColor: '#F5F5F5' },
  variable: { icon: 'variable', color: '#795548', bgColor: '#EFEBE9' },
  get_variable: { icon: 'variable-box', color: '#FF5722', bgColor: '#FBE9E7' },
  prompt_input: { icon: 'form-textbox', color: '#9C27B0', bgColor: '#F3E5F5' },
  location: { icon: 'map-marker', color: '#F44336', bgColor: '#FFEBEE' },
  condition: { icon: 'source-branch', color: '#673AB7', bgColor: '#EDE7F6' },
  loop: { icon: 'repeat', color: '#CDDC39', bgColor: '#F9FBE7' },
  text: { icon: 'text', color: '#607D8B', bgColor: '#ECEFF1' },
  math: { icon: 'calculator', color: '#FF5722', bgColor: '#FBE9E7' },
  photo: { icon: 'camera', color: '#E91E63', bgColor: '#FCE4EC' },
  clipboard: { icon: 'clipboard', color: '#607D8B', bgColor: '#ECEFF1' },
  app: { icon: 'application', color: '#009688', bgColor: '#E0F2F1' },
  open_url: { icon: 'open-in-new', color: '#3F51B5', bgColor: '#E8EAF6' },
  share_text: { icon: 'share', color: '#00BCD4', bgColor: '#E0F7FA' },
  default: { icon: 'cog', color: '#757575', bgColor: '#F5F5F5' },
};

const AutomationDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  // Handle both automationId and automation object from params
  const params = route.params || {};
  const automationId = params.automationId || params.automation?.id;
  const fromGallery = params.fromGallery;
  
  // Theme and animations
  const theme = useSafeTheme();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const headerScaleAnim = useRef(new Animated.Value(0.95)).current;
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState(0);
  
  // Ensure gradient colors are always defined
  const primaryColor = theme.colors.brand?.primary || theme.colors.primary || '#6200ee';
  const primaryLightColor = theme.colors.brand?.primaryLight || '#7c4dff';
  
  // Validate route parameters
  useEffect(() => {
    if (!automationId || automationId === 'undefined' || automationId === 'null') {
      EventLogger.error('Automation', 'Invalid automation ID in route params:', automationId as Error);
      Alert.alert(
        'Invalid Automation',
        'The automation could not be found. Please try again.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return;
    }
  }, [automationId, navigation]);
  
  const { user } = useSelector((state: RootState) => state.auth);
  // Only call the API if we have a valid automationId
  const { data: automation, isLoading, error } = useGetAutomationQuery(automationId, {
    skip: !automationId || automationId === 'undefined' || automationId === 'null'
  });
  const [trackDownload] = useTrackAutomationDownloadMutation();
  const [refreshDashboard] = useRefreshDashboardMutation();
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showNFCModal, setShowNFCModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Privacy settings
  const [isPublic, setIsPublic] = useState(automation?.is_public || false);
  const [allowDuplication, setAllowDuplication] = useState(true);
  const [allowComments, setAllowComments] = useState(true);

  // Advanced features
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showComments, setShowComments] = useState(false);
  
  const isOwner = user?.id === automation?.created_by;

  // Entry animation
  useEffect(() => {
    if (automation) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(headerScaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [automation, fadeAnim, slideAnim, headerScaleAnim]);

  // Update privacy settings when automation data loads
  React.useEffect(() => {
    if (automation) {
      setIsPublic(automation.is_public);
    }
  }, [automation]);

  // Show loading state with modern design
  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <LinearGradient
          colors={[primaryColor || '#6200ee', primaryLightColor || '#7c4dff']}
          style={StyleSheet.absoluteFill}
        />
        <ActivityIndicator size="large" color={theme.colors.text?.inverse || '#FFFFFF'} />
        <Text style={[styles.loadingText, { color: theme.colors.text?.inverse || '#FFFFFF' }]}>Loading automation...</Text>
      </View>
    );
  }

  // Show error state with modern design
  if (error || !automation) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <LinearGradient
          colors={['#F44336', '#E57373']}
          style={StyleSheet.absoluteFill}
        />
        <Icon name="alert-circle" size={64} color={theme.colors.text?.inverse || '#FFFFFF'} />
        <Text style={[styles.errorTitle, { color: theme.colors.text?.inverse || '#FFFFFF' }]}>Failed to load automation</Text>
        <TouchableOpacity
          style={[styles.modernButton, styles.errorButton]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
        >
          <Text style={[styles.buttonText, { color: theme.colors.text?.inverse || '#FFFFFF' }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleRunAutomation = async () => {
    if (!automation) return;
    
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsExecuting(true);
      setExecutionProgress(0);
      
      const { AutomationEngine } = await import('../../services/automation/AutomationEngine');
      const engine = new AutomationEngine();
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setExecutionProgress(prev => Math.min(prev + 0.1, 0.9));
      }, 100);
      
      const result = await engine.execute(automation);
      
      clearInterval(progressInterval);
      setExecutionProgress(1);
      
      setTimeout(() => {
        setIsExecuting(false);
        setExecutionProgress(0);
        
        if (result.success) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert(
            'Success! 🎉',
            `Automation completed!\n\n⏱️ Time: ${result.executionTime}ms\n✅ Steps: ${result.stepsCompleted}/${result.totalSteps}`
          );
          // Refresh dashboard statistics after successful execution
          console.log('[AutomationDetails] Refreshing dashboard after successful execution');
          refreshDashboard().then(() => {
            console.log('[AutomationDetails] Dashboard refresh triggered');
          }).catch(err => {
            console.error('[AutomationDetails] Dashboard refresh failed:', err);
          });
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('Failed', result.error || 'Unknown error');
        }
      }, 500);
      
    } catch (error: any) {
      setIsExecuting(false);
      setExecutionProgress(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to run automation');
    }
  };

  const handleShareAutomation = async () => {
    if (!automation) return;

    try {
      // Generate smart link with web fallback
      const smartLink = smartLinkService.generateSmartLink(automation);
      const shareMessage = smartLinkService.generateSharingLink(automation);
      
      await Share.share({
        message: shareMessage,
        title: automation.title,
        url: smartLink.universalUrl,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share automation');
    }
  };

  const handleDuplicateAutomation = async () => {
    if (!automation) return;

    try {
      const { error } = await supabase
        .from('automations')
        .insert({
          title: `${automation.title} (Copy)`,
          description: automation.description,
          steps: automation.steps,
          category: automation.category,
          tags: [...(automation.tags || []), 'duplicate'],
          created_by: user?.id,
          is_public: false,
        });

      if (error) throw error;

      // Track the download/clone
      await trackDownload(automation.id);

      Alert.alert(
        'Duplicated!',
        'Automation has been duplicated to your library',
        [
          { text: 'View', onPress: () => navigation.navigate('MyAutomations') },
          { text: 'OK' }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to duplicate automation');
    }
  };

  const handleCopyLink = async () => {
    if (!automation) return;

    const shareUrl = `zaptap://automation/${automation.id}`;
    await Clipboard.setStringAsync(shareUrl);
    Alert.alert('Copied!', 'Automation link copied to clipboard');
  };

  const handlePublishToGallery = () => {
    Alert.alert(
      'Publish to Gallery',
      `Are you sure you want to publish "${automation.title}" to the public gallery?\n\nThis will make your automation discoverable by all users. You can change this later in Privacy Settings.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Publish',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('automations')
                .update({ is_public: true })
                .eq('id', automation.id);

              if (error) throw error;

              setIsPublic(true);
              Alert.alert(
                'Published! 🎉',
                'Your automation is now live in the Gallery! Others can discover, rate, and use your automation.',
                [
                  { text: 'OK' },
                  { text: 'View in Gallery', onPress: () => navigation.navigate('DiscoverTab') }
                ]
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to publish automation');
            }
          },
        },
      ]
    );
  };

  const handleUpdatePrivacy = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('automations')
        .update({ is_public: isPublic })
        .eq('id', automation.id);

      if (error) throw error;

      Alert.alert('Updated', 'Privacy settings have been updated');
      setShowSettingsModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update privacy settings');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAutomation = () => {
    Alert.alert(
      'Delete Automation',
      `Are you sure you want to delete "${automation.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('automations')
                .delete()
                .eq('id', automation.id);

              if (error) throw error;

              Alert.alert('Deleted', 'Automation has been deleted');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete automation');
            }
          },
        },
      ]
    );
  };

  const renderModernActionItem = (
    icon: string,
    title: string,
    description: string,
    onPress: () => void,
    color?: string,
    backgroundColor?: string
  ) => (
    <TouchableOpacity
      style={[styles.modernActionItem, { backgroundColor: backgroundColor || theme.colors.surface.primary }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      activeOpacity={0.7}
    >
      <View style={[styles.actionIconContainer, { backgroundColor: backgroundColor || 'rgba(98, 0, 238, 0.1)' }]}>
        <Icon name={icon} size={24} color={color || theme.colors.brand.primary} />
      </View>
      <View style={styles.actionTextContainer}>
        <Text style={[styles.actionTitle, { color: theme.colors.text.primary }]}>{title}</Text>
        <Text style={[styles.actionDescription, { color: theme.colors.text.secondary }]}>{description}</Text>
      </View>
      <Icon name="chevron-right" size={20} color={theme.colors.text.secondary} />
    </TouchableOpacity>
  );

  const renderStepCard = (step: any, index: number) => {
    const stepInfo = stepTypeMapping[step.type] || stepTypeMapping.default;
    
    return (
      <Animated.View
        key={index}
        style={[
          styles.stepCard,
          {
            backgroundColor: theme.colors.surface.primary,
            transform: [{
              translateY: slideAnim.interpolate({
                inputRange: [0, 50],
                outputRange: [0, 50],
              })
            }]
          }
        ]}
      >
        <View style={[styles.stepIconContainer, { backgroundColor: stepInfo.bgColor }]}>
          <Icon name={stepInfo.icon} size={20} color={stepInfo.color} />
        </View>
        <View style={styles.stepContent}>
          <Text style={[styles.stepTitle, { color: theme.colors.text.primary }]}>
            {step.type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
          </Text>
          {step.config && (
            <Text style={[styles.stepSubtitle, { color: theme.colors.text.secondary }]} numberOfLines={1}>
              {JSON.stringify(step.config).slice(1, 50)}...
            </Text>
          )}
        </View>
        <Text style={[styles.stepNumber, { color: theme.colors.text.tertiary }]}>#{index + 1}</Text>
      </Animated.View>
    );
  };

  const renderStatCard = (icon: string, title: string, value: string | number, color: string) => (
    <View style={[styles.statCard, { backgroundColor: theme.colors.surface.elevated }]}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Icon name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>{title}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Modern Header with Gradient */}
      <Animated.View
        style={[
          styles.modernHeader,
          {
            paddingTop: (insets.top || 44) + 10,
            opacity: fadeAnim,
            transform: [{ scale: headerScaleAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={[primaryColor || '#6200ee', primaryLightColor || '#7c4dff']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        
        {/* Header Content */}
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.goBack();
              }}
            >
              <Icon name="arrow-left" size={24} color={theme.colors.text?.inverse || '#FFFFFF'} />
            </TouchableOpacity>
            
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowShareModal(true);
                }}
              >
                <Icon name="share-variant" size={22} color={theme.colors.text?.inverse || '#FFFFFF'} />
              </TouchableOpacity>
              
              {isOwner && (
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    navigation.navigate('AutomationBuilder', { automationId });
                  }}
                >
                  <Icon name="pencil" size={22} color={theme.colors.text?.inverse || '#FFFFFF'} />
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.automationIcon}>
              <LinearGradient
                colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                style={styles.iconGradient}
              >
                <Icon name="play-circle" size={32} color={theme.colors.text?.inverse || '#FFFFFF'} />
              </LinearGradient>
            </View>
            <Text style={[styles.heroTitle, { color: theme.colors.text?.inverse || '#FFFFFF' }]} numberOfLines={2}>
              {automation.title}
            </Text>
            {automation.description && (
              <Text style={[styles.heroDescription, { color: (theme.colors.text?.inverse || '#FFFFFF') + 'CC' }]} numberOfLines={2}>
                {automation.description}
              </Text>
            )}
          </View>
          
          {/* Run Button */}
          <TouchableOpacity
            style={[
              styles.runButton,
              isExecuting && styles.runButtonExecuting,
              { backgroundColor: isExecuting ? (theme.colors.semantic?.warning || '#FF9800') : '#FFFFFF' }
            ]}
            onPress={handleRunAutomation}
            disabled={isExecuting}
            activeOpacity={0.8}
          >
            {isExecuting ? (
              <View style={styles.executionContainer}>
                <ActivityIndicator size="small" color={theme.colors.brand.primary} style={styles.executionSpinner} />
                <Text style={[styles.runButtonText, { color: theme.colors.brand.primary }]}>Running...</Text>
                <View style={[styles.progressBar, { backgroundColor: theme.colors.brand.primary + '20' }]}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: theme.colors.brand.primary,
                        width: `${executionProgress * 100}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.runButtonContent}>
                <Icon name="play" size={20} color={theme.colors.brand.primary} />
                <Text style={[styles.runButtonText, { color: theme.colors.brand.primary }]}>Run Automation</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Statistics Cards */}
          <View style={styles.statsContainer}>
            {renderStatCard('layers', 'Steps', automation.steps?.length || 0, '#2196F3')}
            {renderStatCard('play-circle', 'Runs', automation.execution_count || 0, '#4CAF50')}
            {renderStatCard('star', 'Rating', automation.average_rating?.toFixed(1) || '0', '#FF9800')}
            {renderStatCard('account-multiple', 'Reviews', automation.rating_count || 0, '#9C27B0')}
          </View>

          {/* Automation Steps */}
          {automation.steps && automation.steps.length > 0 && (
            <View style={[styles.modernSection, { backgroundColor: theme.colors.surface.primary }]}>
              <View style={styles.sectionHeader}>
                <Icon name="layers" size={20} color={theme.colors.brand.primary} />
                <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Steps ({automation.steps.length})</Text>
              </View>
              <View style={styles.stepsContainer}>
                {automation.steps.map((step: any, index: number) => renderStepCard(step, index))}
              </View>
            </View>
          )}

          {/* Quick Actions Grid */}
          <View style={[styles.modernSection, { backgroundColor: theme.colors.surface.primary }]}>
            <View style={styles.sectionHeader}>
              <Icon name="lightning-bolt" size={20} color={theme.colors.brand.primary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Quick Actions</Text>
            </View>
            <View style={styles.quickActionsGrid}>
              <TouchableOpacity
                style={[styles.quickActionCard, { backgroundColor: theme.colors.surface.elevated }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  handleShareAutomation();
                }}
              >
                <LinearGradient colors={['#2196F3', '#21CBF3']} style={styles.quickActionGradient}>
                  <Icon name="share-variant" size={24} color="white" />
                </LinearGradient>
                <Text style={[styles.quickActionLabel, { color: theme.colors.text.primary }]}>Share</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.quickActionCard, { backgroundColor: theme.colors.surface.elevated }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  handleDuplicateAutomation();
                }}
              >
                <LinearGradient colors={['#4CAF50', '#8BC34A']} style={styles.quickActionGradient}>
                  <Icon name="content-copy" size={24} color="white" />
                </LinearGradient>
                <Text style={[styles.quickActionLabel, { color: theme.colors.text.primary }]}>Duplicate</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.quickActionCard, { backgroundColor: theme.colors.surface.elevated }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowQRModal(true);
                }}
              >
                <LinearGradient colors={['#FF9800', '#FFC107']} style={styles.quickActionGradient}>
                  <Icon name="qrcode" size={24} color="white" />
                </LinearGradient>
                <Text style={[styles.quickActionLabel, { color: theme.colors.text.primary }]}>QR Code</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.quickActionCard, { backgroundColor: theme.colors.surface.elevated }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowNFCModal(true);
                }}
              >
                <LinearGradient colors={['#9C27B0', '#E91E63']} style={styles.quickActionGradient}>
                  <Icon name="nfc" size={24} color="white" />
                </LinearGradient>
                <Text style={[styles.quickActionLabel, { color: theme.colors.text.primary }]}>NFC Tag</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sharing & Privacy */}
          <View style={[styles.modernSection, { backgroundColor: theme.colors.surface.primary }]}>
            <View style={styles.sectionHeader}>
              <Icon name="shield-lock-outline" size={20} color={theme.colors.brand.primary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Sharing & Privacy</Text>
            </View>
            <View style={styles.actionsList}>
              {renderModernActionItem(
                'share-variant-outline',
                'Share Automation',
                'Share with friends or on social media',
                handleShareAutomation,
                '#2196F3',
                '#E3F2FD'
              )}
              {renderModernActionItem(
                'content-copy',
                'Duplicate',
                'Create a copy in your library',
                handleDuplicateAutomation,
                '#4CAF50',
                '#E8F5E8'
              )}
              {renderModernActionItem(
                'link',
                'Copy Link',
                'Copy automation link to clipboard',
                handleCopyLink,
                '#FF9800',
                '#FFF3E0'
              )}
              {isOwner && !isPublic && renderModernActionItem(
                'earth',
                'Publish to Gallery',
                'Make this automation discoverable by everyone',
                () => handlePublishToGallery(),
                '#00BCD4',
                '#E0F7FA'
              )}
              {isOwner && renderModernActionItem(
                'shield-lock-outline',
                'Privacy Settings',
                isPublic ? 'Public - Anyone can view' : 'Private - Only you can view',
                () => setShowSettingsModal(true),
                '#9C27B0',
                '#F3E5F5'
              )}
            </View>
          </View>

          {/* Deployment Options */}
          <View style={[styles.modernSection, { backgroundColor: theme.colors.surface.primary }]}>
            <View style={styles.sectionHeader}>
              <Icon name="rocket-launch" size={20} color={theme.colors.brand.primary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Deployment Options</Text>
            </View>
            <View style={styles.actionsList}>
              {renderModernActionItem(
                'qrcode',
                'Generate QR Code',
                'Create a QR code for easy sharing',
                () => setShowQRModal(true),
                '#000000',
                '#F5F5F5'
              )}
              {renderModernActionItem(
                'nfc',
                'Write to NFC Tag',
                'Deploy to NFC tag for tap-to-run',
                () => setShowNFCModal(true),
                '#FF5722',
                '#FBE9E7'
              )}
              {renderModernActionItem(
                'apple',
                'Add to Home Screen',
                'Create a shortcut on your home screen',
                () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Alert.alert('Coming Soon', 'This feature will be available in the next update');
                },
                '#007AFF',
                '#E3F2FD'
              )}
            </View>
          </View>

          {/* Advanced Options */}
          {isOwner && (
            <View style={[styles.modernSection, { backgroundColor: theme.colors.surface.primary }]}>
              <View style={styles.sectionHeader}>
                <Icon name="cog" size={20} color={theme.colors.brand.primary} />
                <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Advanced Options</Text>
              </View>
              <View style={styles.actionsList}>
                {renderModernActionItem(
                  'history',
                  'Version History',
                  'View and restore previous versions',
                  () => setShowVersionHistory(true),
                  '#607D8B',
                  'rgba(96, 125, 139, 0.08)'
                )}
                {renderModernActionItem(
                  'chart-line',
                  'Analytics',
                  'View usage statistics and insights',
                  () => setShowAnalytics(true),
                  '#3F51B5',
                  'rgba(63, 81, 181, 0.08)'
                )}
                {renderModernActionItem(
                  'comment-text-outline',
                  'Comments',
                  'View and manage user comments',
                  () => setShowComments(true),
                  '#009688',
                  'rgba(0, 150, 136, 0.08)'
                )}
                {renderModernActionItem(
                  'delete',
                  'Delete Automation',
                  'Permanently remove this automation',
                  handleDeleteAutomation,
                  '#f44336',
                  'rgba(244, 67, 54, 0.08)'
                )}
              </View>
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </Animated.View>
      </ScrollView>

      {/* Privacy Settings Modal */}
      <Portal>
        <Modal
          visible={showSettingsModal}
          onDismiss={() => setShowSettingsModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Privacy Settings</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Public Automation</Text>
                <Text style={styles.settingDescription}>
                  Anyone can discover and use this automation
                </Text>
              </View>
              <Switch
                value={isPublic}
                onValueChange={setIsPublic}
              />
            </View>

            <Divider style={styles.divider} />

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Allow Duplication</Text>
                <Text style={styles.settingDescription}>
                  Others can create copies of this automation
                </Text>
              </View>
              <Switch
                value={allowDuplication}
                onValueChange={setAllowDuplication}
              />
            </View>

            <Divider style={styles.divider} />

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Allow Comments</Text>
                <Text style={styles.settingDescription}>
                  Users can leave feedback and suggestions
                </Text>
              </View>
              <Switch
                value={allowComments}
                onValueChange={setAllowComments}
              />
            </View>

            <View style={styles.modalActions}>
              <Button onPress={() => setShowSettingsModal(false)}>
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleUpdatePrivacy}
                loading={isUpdating}
                disabled={isUpdating}
              >
                Save Changes
              </Button>
            </View>
          </View>
        </Modal>
      </Portal>

      {/* QR Code Modal */}
      <FullScreenModal
        visible={showQRModal}
        onDismiss={() => setShowQRModal(false)}
      >
        <QRGenerator
          automationId={automation.id}
          automationTitle={automation.title}
          automationDescription={automation.description || ''}
          creator={automation.created_by}
          automation={automation}
          onClose={() => setShowQRModal(false)}
        />
      </FullScreenModal>

      {/* Share Automation Modal */}
      <ShareAutomationModal
        visible={showShareModal}
        automation={automation}
        onClose={() => setShowShareModal(false)}
      />

      {/* NFC Writer Modal */}
      <FullScreenModal
        visible={showNFCModal}
        onDismiss={() => setShowNFCModal(false)}
      >
        <NFCWriter
          automation={automation}
          onSuccess={() => {
            setShowNFCModal(false);
            Alert.alert('Success!', 'Automation written to NFC tag');
          }}
          onClose={() => setShowNFCModal(false)}
        />
      </FullScreenModal>

      {/* Version History Modal */}
      <VersionHistoryModal
        visible={showVersionHistory}
        onDismiss={() => setShowVersionHistory(false)}
        automation={automation}
        onAutomationUpdated={() => {
          // RTK Query will automatically refetch updated data
        }}
      />

      {/* Analytics Modal */}
      <AnalyticsModal
        visible={showAnalytics}
        onDismiss={() => setShowAnalytics(false)}
        automation={automation}
      />

      {/* Comments Modal */}
      <CommentsModal
        visible={showComments}
        onDismiss={() => setShowComments(false)}
        automation={automation}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorButton: {
    marginTop: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  modernButton: {
    borderRadius: 25,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modernHeader: {
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    minHeight: 320,
    backgroundColor: '#6200ee', // Fallback color
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  headerContent: {
    paddingHorizontal: 20,
    zIndex: 1,
    position: 'relative',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  automationIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  iconGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)', // Fallback
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  runButton: {
    backgroundColor: 'white',
    borderRadius: 25,
    paddingHorizontal: 32,
    paddingVertical: 16,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  runButtonExecuting: {
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  runButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  runButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  executionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  executionSpinner: {
    marginRight: 4,
  },
  progressBar: {
    height: 3,
    borderRadius: 1.5,
    flex: 1,
    marginLeft: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
    paddingTop: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 80,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  modernSection: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  stepsContainer: {
    gap: 12,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  stepIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  stepSubtitle: {
    fontSize: 14,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '500',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  quickActionCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
  },
  quickActionGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  actionsList: {
    gap: 12,
  },
  modernActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 14,
  },
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 16,
    maxHeight: '80%',
  },
  modalContent: {
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    color: '#333',
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  divider: {
    marginVertical: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  bottomSpacer: {
    height: 40,
  },
});

export default AutomationDetailsScreen;