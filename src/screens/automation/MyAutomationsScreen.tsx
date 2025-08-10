import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Pressable,
  Animated,
  Text as RNText,
  StatusBar,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Card,
  Text,
  Chip,
  Button,
  IconButton,
  ActivityIndicator,
  Searchbar,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useGetMyAutomationsQuery, useDeleteAutomationMutation } from '../../store/api/automationApi';
import { AutomationData } from '../../types';
import { supabase } from '../../services/supabase/client';
import NFCScanner from '../../components/nfc/NFCScanner';
import NFCWriter from '../../components/nfc/NFCWriter';
import { FullScreenModal } from '../../components/common/FullScreenModal';
import { AutomationCard } from '../../components/automation/AutomationCard';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonCard, SkeletonList } from '../../components/common/LoadingSkeleton';
import { EventLogger } from '../../utils/EventLogger';
import { useSafeTheme } from '../../components/common/ThemeFallbackWrapper';

const { width: screenWidth } = Dimensions.get('window');

interface MyAutomationsScreenProps {
  navigation: any;
}

type FilterType = 'all' | 'recent' | 'favorites';

const MyAutomationsScreen: React.FC<MyAutomationsScreenProps> = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showNFCScanner, setShowNFCScanner] = useState(false);
  const [showNFCWriter, setShowNFCWriter] = useState(false);
  const [selectedAutomationForNFC, setSelectedAutomationForNFC] = useState<AutomationData | null>(null);
  
  const insets = useSafeAreaInsets();
  const theme = useSafeTheme();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;
  const fabScale = useRef(new Animated.Value(0)).current;
  const cardAnimations = useRef<{ [key: string]: Animated.Value }>({}).current;
  
  // Fetch automations from Supabase
  const { 
    data: automations = [], 
    isLoading, 
    refetch,
    error 
  } = useGetMyAutomationsQuery();
  
  const [deleteAutomation] = useDeleteAutomationMutation();

  useEffect(() => {
    // Auto-refresh when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      refetch();
    });
    return unsubscribe;
  }, [navigation, refetch]);

  useEffect(() => {
    // Initial animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(fabScale, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    // Animate cards with staggered entrance
    if (filteredAutomations.length > 0) {
      const animations = filteredAutomations.map((automation, index) => {
        if (!cardAnimations[automation.id]) {
          cardAnimations[automation.id] = new Animated.Value(0);
        }
        return Animated.timing(cardAnimations[automation.id], {
          toValue: 1,
          duration: 400,
          delay: index * 100,
          useNativeDriver: true,
        });
      });
      
      Animated.stagger(100, animations).start();
    }
  }, [filteredAutomations]);

  const handleRefresh = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      EventLogger.error('Automation', 'Failed to refresh automations:', error as Error);
    } finally {
      setRefreshing(false);
    }
  };

  const filteredAutomations = automations.filter((automation: AutomationData) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!automation.title.toLowerCase().includes(query) && 
          !automation.description?.toLowerCase().includes(query)) {
        return false;
      }
    }
    
    // Type filter
    switch (filter) {
      case 'recent':
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return new Date(automation.created_at) > dayAgo;
      case 'favorites':
        return automation.average_rating >= 4; // Using rating as favorite indicator for now
      default:
        return true;
    }
  });

  const handleDeleteAutomation = (automation: AutomationData) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Delete Automation',
      `Are you sure you want to delete "${automation.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            try {
              await deleteAutomation(automation.id).unwrap();
              Alert.alert('Success', 'Automation deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete automation');
            }
          },
        },
      ]
    );
  };

  const handleRunAutomation = async (automation: AutomationData) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      const { AutomationEngine } = await import('../../services/automation/AutomationEngine');
      const engine = new AutomationEngine();
      
      Alert.alert(
        'Running Automation 🚀',
        `Starting "${automation.title}" with ${automation.steps?.length || 0} steps...`,
        [{ text: 'OK' }]
      );
      
      const result = await engine.execute(automation);
      
      if (result.success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Success! 🎉',
          `Automation completed successfully!\n\n⏱️ Execution time: ${result.executionTime}ms\n✅ Steps completed: ${result.stepsCompleted}/${result.totalSteps}`
        );
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Execution Failed', result.error || 'Unknown error occurred');
      }
    } catch (error: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to run automation');
    }
  };

  const handleEditAutomation = (automation: AutomationData) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('AutomationBuilder', { automationId: automation.id });
  };

  const handleDeployAutomation = (automation: AutomationData) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Deploy Automation',
      'Choose how you want to deploy this automation:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '📱 NFC Tag',
          onPress: () => handleWriteToNFC(automation),
        },
        {
          text: '📋 QR Code',
          onPress: () => navigation.navigate('AutomationBuilder', { 
            automationId: automation.id, 
            showQRGenerator: true 
          }),
        },
      ]
    );
  };

  const handleWriteToNFC = (automation: AutomationData) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedAutomationForNFC(automation);
    setShowNFCWriter(true);
  };

  const handleNFCWriteSuccess = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowNFCWriter(false);
    setSelectedAutomationForNFC(null);
    Alert.alert(
      'NFC Write Successful! 🎉',
      'Your automation has been written to the NFC tag. Anyone can now tap this tag to run the automation!'
    );
  };

  const handlePublishAutomation = (automation: AutomationData) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Publish to Gallery',
      `Publish "${automation.title}" to the public gallery?\n\nOthers will be able to discover and use your automation.`,
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

              // Refresh the automations list to reflect the change
              refetch();
              
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert(
                'Published! 🎉',
                'Your automation is now live in the Gallery!',
                [
                  { text: 'OK' },
                  { text: 'View Gallery', onPress: () => navigation.navigate('DiscoverTab') }
                ]
              );
            } catch (error) {
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Error', 'Failed to publish automation');
            }
          },
        },
      ]
    );
  };

  const handleNFCScan = async (automationId: string, metadata: any) => {
    setShowNFCScanner(false);
    
    try {
      let automationData: AutomationData | null = null;
      
      // Check if this is a public share URL
      if (metadata?.source === 'web' && metadata?.url?.includes('/share/')) {
        EventLogger.debug('Automation', 'NFC tag contains public share link, fetching from public_shares');
        
        // This is a public share ID, not an automation ID
        const { data: shareData, error: shareError } = await supabase
          .from('public_shares')
          .select('*')
          .eq('id', automationId)
          .eq('is_active', true)
          .single();
        
        if (shareError || !shareData) {
          EventLogger.error('Automation', 'Failed to fetch public share:', shareError as Error);
          Alert.alert(
            'Share Link Invalid',
            'This shared automation link is invalid or has expired.'
          );
          return;
        }
        
        // Check if expired
        if (new Date(shareData.expires_at) < new Date()) {
          Alert.alert(
            'Share Link Expired',
            'This shared automation link has expired.'
          );
          return;
        }
        
        // Get automation data from the share
        automationData = shareData.automation_data;
        
        // Increment access count
        await supabase
          .from('public_shares')
          .update({ access_count: (shareData.access_count || 0) + 1 })
          .eq('id', automationId);
          
      } else {
        // Regular automation ID lookup
        const foundAutomation = automations.find(a => a.id === automationId);
        
        if (foundAutomation) {
          automationData = foundAutomation;
        } else {
          // Fetch from Supabase if not found locally
          const { data, error } = await supabase
            .from('automations')
            .select('*')
            .eq('id', automationId)
            .single();

          if (error || !data) {
            Alert.alert(
              'Automation Not Found',
              'This automation could not be found or you may not have access to it.'
            );
            return;
          }
          
          automationData = data;
        }
      }
      
      if (automationData) {
        // Run the automation
        handleRunAutomation(automationData);
      }
      
    } catch (error) {
      EventLogger.error('Automation', 'Error loading automation from NFC:', error as Error);
      Alert.alert('Error', 'Failed to load automation from NFC tag');
    }
  };

  const handleFilterPress = async (newFilter: FilterType) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilter(newFilter);
  };

  const handleNFCButtonPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowNFCScanner(true);
  };

  const handleFABPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    // Spring animation for FAB press
    Animated.sequence([
      Animated.spring(fabScale, {
        toValue: 0.9,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(fabScale, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
    navigation.navigate('AutomationBuilder');
  };

  const renderModernFilterButton = (type: FilterType, label: string, isFirst = false, isLast = false) => (
    <Pressable
      key={type}
      style={[
        styles.modernFilterButton,
        filter === type && styles.activeModernFilterButton,
        isFirst && styles.firstFilterButton,
        isLast && styles.lastFilterButton,
      ]}
      onPress={() => handleFilterPress(type)}
    >
      <LinearGradient
        colors={filter === type ? ['#6366F1', '#8B5CF6'] : ['transparent', 'transparent']}
        style={styles.filterButtonGradient}
      >
        <Text style={[
          styles.modernFilterText,
          filter === type && styles.activeModernFilterText
        ]}>
          {label}
        </Text>
      </LinearGradient>
    </Pressable>
  );

  const renderAnimatedAutomationCard = (automation: AutomationData, index: number) => {
    if (!cardAnimations[automation.id]) {
      cardAnimations[automation.id] = new Animated.Value(0);
    }

    return (
      <Animated.View
        key={automation.id}
        style={[
          styles.animatedCardContainer,
          {
            opacity: cardAnimations[automation.id],
            transform: [
              {
                translateY: cardAnimations[automation.id].interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
              {
                scale: cardAnimations[automation.id].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.95, 1],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.modernCardWrapper}>
          <LinearGradient
            colors={['#FFFFFF', '#F8FAFC']}
            style={styles.cardGradientOverlay}
          >
            <AutomationCard
              automation={automation}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('AutomationDetails', { automationId: automation.id });
              }}
              onRun={() => handleRunAutomation(automation)}
              onPublish={!automation.is_public ? () => handlePublishAutomation(automation) : undefined}
              onLocationTrigger={() => navigation.navigate('LocationTriggers')}
              onEdit={() => navigation.navigate('AutomationBuilder', { automationId: automation.id })}
              onDelete={async () => {
                Alert.alert(
                  'Delete Automation',
                  'Are you sure you want to delete this automation?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await supabase
                            .from('automations')
                            .delete()
                            .eq('id', automation.id);
                          refetch();
                          Alert.alert('Success', 'Automation deleted');
                        } catch (error) {
                          Alert.alert('Error', 'Failed to delete automation');
                        }
                      },
                    },
                  ]
                );
              }}
            />
          </LinearGradient>
        </View>
      </Animated.View>
    );
  };

  const renderModernEmptyState = () => (
    <Animated.View style={[styles.modernEmptyState, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={['#F1F5F9', '#E2E8F0']}
        style={styles.emptyStateGradient}
      >
        <View style={styles.emptyIconContainer}>
          <LinearGradient
            colors={['#6366F1', '#8B5CF6', '#EC4899']}
            style={styles.emptyIconGradient}
          >
            <Icon name="robot-outline" size={48} color="#FFFFFF" />
          </LinearGradient>
        </View>
        <Text style={styles.modernEmptyTitle}>
          {searchQuery || filter !== 'all' ? 'No Results Found' : 'Ready to Automate?'}
        </Text>
        <Text style={styles.modernEmptyDescription}>
          {searchQuery || filter !== 'all' 
            ? 'Try adjusting your search or filter to find more automations'
            : 'Create your first automation to streamline your daily tasks'
          }
        </Text>
        {!searchQuery && filter === 'all' && (
          <Pressable style={styles.modernEmptyButton} onPress={handleFABPress}>
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              style={styles.emptyButtonGradient}
            >
              <Icon name="plus" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.modernEmptyButtonText}>Create Automation</Text>
            </LinearGradient>
          </Pressable>
        )}
      </LinearGradient>
    </Animated.View>
  );

  if (isLoading && !refreshing) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <LinearGradient
          colors={['#6366F1', '#8B5CF6', '#EC4899']}
          style={[styles.gradientHeader, { paddingTop: insets.top }]}
        >
          <View style={styles.headerContent}>
            <Text style={styles.modernHeaderTitle}>My Automations</Text>
            <View style={styles.headerActions}>
              <IconButton icon="nfc" iconColor="#FFFFFF" disabled />
              <IconButton icon="refresh" iconColor="#FFFFFF" disabled />
              <IconButton icon="plus" iconColor="#FFFFFF" disabled />
            </View>
          </View>
        </LinearGradient>
        
        <View style={styles.content}>
          <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface.primary }]}>
            <Searchbar
              placeholder="Search automations..."
              value=""
              editable={false}
              style={[styles.modernSearchBar, { opacity: 0.5 }]}
            />
          </View>
          <ScrollView style={styles.scrollView} contentContainerStyle={{ padding: 16 }}>
            <SkeletonList count={3} />
          </ScrollView>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <LinearGradient
          colors={['#6366F1', '#8B5CF6', '#EC4899']}
          style={[styles.gradientHeader, { paddingTop: insets.top }]}
        >
          <View style={styles.headerContent}>
            <Text style={styles.modernHeaderTitle}>My Automations</Text>
          </View>
        </LinearGradient>
        
        <Animated.View style={[styles.errorContainer, { opacity: fadeAnim }]}>
          <LinearGradient
            colors={['#FEE2E2', '#FECACA']}
            style={styles.errorGradient}
          >
            <Icon name="alert-circle" size={64} color="#EF4444" />
            <Text style={styles.modernErrorTitle}>Failed to Load</Text>
            <Text style={styles.modernErrorDescription}>
              Could not load your automations. Check your connection and try again.
            </Text>
            <Pressable style={styles.modernRetryButton} onPress={handleRefresh}>
              <LinearGradient
                colors={['#EF4444', '#DC2626']}
                style={styles.retryButtonGradient}
              >
                <Icon name="refresh" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.modernRetryButtonText}>Retry</Text>
              </LinearGradient>
            </Pressable>
          </LinearGradient>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface.primary }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Gradient Header */}
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <LinearGradient
          colors={['#6366F1', '#8B5CF6', '#EC4899']}
          style={[styles.gradientHeader, { paddingTop: insets.top }]}
        >
          <View style={styles.headerContent}>
            <Text style={styles.modernHeaderTitle}>My Automations</Text>
            <View style={styles.headerActions}>
              <IconButton 
                icon="nfc" 
                iconColor="#FFFFFF" 
                onPress={handleNFCButtonPress}
                style={styles.headerActionButton}
              />
              <IconButton 
                icon="refresh" 
                iconColor="#FFFFFF" 
                onPress={handleRefresh}
                style={styles.headerActionButton}
              />
              <IconButton 
                icon="plus" 
                iconColor="#FFFFFF" 
                onPress={handleFABPress}
                style={styles.headerActionButton}
              />
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Modern Search and Filters */}
        <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface.secondary }]}>
          <Searchbar
            placeholder="Search automations..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={[styles.modernSearchBar, { backgroundColor: theme.colors.surface.primary }]}
            inputStyle={{ color: theme.colors.text.primary }}
            iconColor={theme.colors.text.secondary}
            placeholderTextColor={theme.colors.text.secondary}
          />
          
          <View style={styles.modernFiltersContainer}>
            {renderModernFilterButton('all', 'All', true)}
            {renderModernFilterButton('recent', 'Recent')}
            {renderModernFilterButton('favorites', 'Top Rated', false, true)}
          </View>
        </View>

        {/* Results Summary */}
        <View style={[styles.summaryContainer, { backgroundColor: theme.colors.surface.secondary }]}>
          <Text style={[styles.summaryText, { color: theme.colors.text.secondary }]}>
            {filteredAutomations.length} automation{filteredAutomations.length !== 1 ? 's' : ''} found
          </Text>
        </View>

        {/* Automations List */}
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh}
              colors={['#6366F1', '#8B5CF6']}
              tintColor="#6366F1"
            />
          }
        >
          {filteredAutomations.length > 0 ? (
            filteredAutomations.map(renderAnimatedAutomationCard)
          ) : (
            renderModernEmptyState()
          )}
          
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </Animated.View>

      {/* Modern Floating Action Button */}
      <Animated.View 
        style={[
          styles.modernFABContainer, 
          { 
            bottom: insets.bottom + 16,
            transform: [{ scale: fabScale }],
          }
        ]}
      >
        <Pressable style={styles.modernFAB} onPress={handleFABPress}>
          <LinearGradient
            colors={['#6366F1', '#8B5CF6', '#EC4899']}
            style={styles.fabGradient}
          >
            <Icon name="plus" size={28} color="#FFFFFF" />
          </LinearGradient>
        </Pressable>
      </Animated.View>

      {/* NFC Scanner Modal */}
      <FullScreenModal
        visible={showNFCScanner}
        onDismiss={() => setShowNFCScanner(false)}
      >
        <NFCScanner
          onScan={handleNFCScan}
          onClose={() => setShowNFCScanner(false)}
        />
      </FullScreenModal>

      {/* NFC Writer Modal */}
      <FullScreenModal
        visible={showNFCWriter}
        onDismiss={() => {
          setShowNFCWriter(false);
          setSelectedAutomationForNFC(null);
        }}
      >
        {selectedAutomationForNFC && (
          <NFCWriter
            automation={selectedAutomationForNFC}
            onSuccess={handleNFCWriteSuccess}
            onClose={() => {
              setShowNFCWriter(false);
              setSelectedAutomationForNFC(null);
            }}
          />
        )}
      </FullScreenModal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientHeader: {
    paddingBottom: 20,
    elevation: 8,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  modernHeaderTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerActionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  modernSearchBar: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 0,
  },
  modernFiltersContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  modernFilterButton: {
    flex: 1,
  },
  activeModernFilterButton: {
    elevation: 2,
  },
  firstFilterButton: {
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  lastFilterButton: {
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  filterButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  activeModernFilterText: {
    color: '#FFFFFF',
  },
  summaryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  animatedCardContainer: {
    marginBottom: 16,
  },
  modernCardWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardGradientOverlay: {
    borderRadius: 16,
  },
  modernEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 64,
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: 'hidden',
  },
  emptyStateGradient: {
    paddingVertical: 48,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyIconGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernEmptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    color: '#1F2937',
    textAlign: 'center',
  },
  modernEmptyDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  modernEmptyButton: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  emptyButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernEmptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorGradient: {
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    width: '100%',
  },
  modernErrorTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    color: '#1F2937',
    textAlign: 'center',
  },
  modernErrorDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  modernRetryButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernRetryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modernFABContainer: {
    position: 'absolute',
    right: 16,
  },
  modernFAB: {
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSpacer: {
    height: 100,
  },
});

export default MyAutomationsScreen;