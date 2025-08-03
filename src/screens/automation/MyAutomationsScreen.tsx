import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Pressable,
} from 'react-native';
import {
  Appbar,
  Card,
  Text,
  Chip,
  Button,
  IconButton,
  FAB,
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

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error('Failed to refresh automations:', error);
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
    Alert.alert(
      'Delete Automation',
      `Are you sure you want to delete "${automation.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
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
        Alert.alert(
          'Success! 🎉',
          `Automation completed successfully!\\n\\n⏱️ Execution time: ${result.executionTime}ms\\n✅ Steps completed: ${result.stepsCompleted}/${result.totalSteps}`
        );
      } else {
        Alert.alert('Execution Failed', result.error || 'Unknown error occurred');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to run automation');
    }
  };

  const handleEditAutomation = (automation: AutomationData) => {
    navigation.navigate('AutomationBuilderScreen', { automation });
  };

  const handleDeployAutomation = (automation: AutomationData) => {
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
          onPress: () => navigation.navigate('AutomationBuilderScreen', { 
            automation, 
            showQRGenerator: true 
          }),
        },
      ]
    );
  };

  const handleWriteToNFC = (automation: AutomationData) => {
    setSelectedAutomationForNFC(automation);
    setShowNFCWriter(true);
  };

  const handleNFCWriteSuccess = () => {
    setShowNFCWriter(false);
    setSelectedAutomationForNFC(null);
    Alert.alert(
      'NFC Write Successful! 🎉',
      'Your automation has been written to the NFC tag. Anyone can now tap this tag to run the automation!'
    );
  };

  const handlePublishAutomation = (automation: AutomationData) => {
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
              
              Alert.alert(
                'Published! 🎉',
                'Your automation is now live in the Gallery!',
                [
                  { text: 'OK' },
                  { text: 'View Gallery', onPress: () => navigation.navigate('Gallery') }
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

  const handleNFCScan = async (automationId: string, metadata: any) => {
    setShowNFCScanner(false);
    
    try {
      let automationData: AutomationData | null = null;
      
      // Check if this is a public share URL
      if (metadata?.source === 'web' && metadata?.url?.includes('/share/')) {
        console.log('NFC tag contains public share link, fetching from public_shares');
        
        // This is a public share ID, not an automation ID
        const { data: shareData, error: shareError } = await supabase
          .from('public_shares')
          .select('*')
          .eq('id', automationId)
          .eq('is_active', true)
          .single();
        
        if (shareError || !shareData) {
          console.error('Failed to fetch public share:', shareError);
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
      console.error('Error loading automation from NFC:', error);
      Alert.alert('Error', 'Failed to load automation from NFC tag');
    }
  };

  const renderAutomationCard = (automation: AutomationData) => (
    <AutomationCard
      key={automation.id}
      automation={automation}
      onPress={() => navigation.navigate('AutomationDetails', { automation })}
      onRun={() => handleRunAutomation(automation)}
      onPublish={!automation.is_public ? () => handlePublishAutomation(automation) : undefined}
      onLocationTrigger={() => navigation.navigate('LocationTriggers', { automation })}
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
  );

  const renderEmptyState = () => (
    <EmptyState
      icon="robot-outline"
      title="No Automations Found"
      description={
        searchQuery || filter !== 'all' 
          ? 'Try adjusting your search or filter'
          : 'Create your first automation to get started'
      }
      actionLabel={!searchQuery && filter === 'all' ? 'Create Automation' : undefined}
      onAction={!searchQuery && filter === 'all' ? () => navigation.navigate('AutomationBuilder') : undefined}
    />
  );

  const renderSkeletonCard = () => (
    <Card style={styles.automationCard}>
      <Card.Content>
        <View style={styles.skeletonHeader}>
          <View style={styles.skeletonText} />
          <View style={styles.skeletonActions}>
            <View style={styles.skeletonButton} />
            <View style={styles.skeletonButton} />
            <View style={styles.skeletonButton} />
          </View>
        </View>
        <View style={styles.skeletonMeta}>
          <View style={styles.skeletonChip} />
          <View style={styles.skeletonChip} />
          <View style={styles.skeletonChip} />
        </View>
      </Card.Content>
    </Card>
  );

  if (isLoading && !refreshing) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.Content title="My Automations" />
          <Appbar.Action icon="nfc" disabled />
          <Appbar.Action icon="refresh" disabled />
          <Appbar.Action icon="plus" disabled />
        </Appbar.Header>
        <View style={styles.content}>
          <View style={styles.searchContainer}>
            <Searchbar
              placeholder="Search automations..."
              value=""
              editable={false}
              style={[styles.searchBar, { opacity: 0.5 }]}
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
        <Appbar.Header>
          <Appbar.Content title="My Automations" />
        </Appbar.Header>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={64} color="#f44336" />
          <Text style={styles.errorTitle}>Failed to Load</Text>
          <Text style={styles.errorDescription}>
            Could not load your automations. Check your connection and try again.
          </Text>
          <Button mode="contained" onPress={handleRefresh} icon="refresh">
            Retry
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="My Automations" />
        <Appbar.Action
          icon="nfc"
          onPress={() => setShowNFCScanner(true)}
        />
        <Appbar.Action
          icon="refresh"
          onPress={handleRefresh}
        />
        <Appbar.Action
          icon="plus"
          onPress={() => navigation.navigate('AutomationBuilderScreen')}
        />
      </Appbar.Header>

      <View style={styles.content}>
        {/* Search and Filters */}
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Search automations..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
          />
          
          <View style={styles.customSegmentedButtons}>
            <Pressable 
              style={[
                styles.segmentButton, 
                styles.leftSegment,
                filter === 'all' && styles.activeSegment
              ]}
              onPress={() => setFilter('all')}
            >
              <Text style={[
                styles.segmentText,
                filter === 'all' && styles.activeSegmentText
              ]}>All</Text>
            </Pressable>
            <Pressable 
              style={[
                styles.segmentButton, 
                styles.middleSegment,
                filter === 'recent' && styles.activeSegment
              ]}
              onPress={() => setFilter('recent')}
            >
              <Text style={[
                styles.segmentText,
                filter === 'recent' && styles.activeSegmentText
              ]}>Recent</Text>
            </Pressable>
            <Pressable 
              style={[
                styles.segmentButton, 
                styles.rightSegment,
                filter === 'favorites' && styles.activeSegment
              ]}
              onPress={() => setFilter('favorites')}
            >
              <Text style={[
                styles.segmentText,
                filter === 'favorites' && styles.activeSegmentText
              ]}>Top Rated</Text>
            </Pressable>
          </View>
        </View>

        {/* Results Summary */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryText}>
            {filteredAutomations.length} automation{filteredAutomations.length !== 1 ? 's' : ''} found
          </Text>
        </View>

        {/* Automations List */}
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {filteredAutomations.length > 0 ? (
            filteredAutomations.map(renderAutomationCard)
          ) : (
            renderEmptyState()
          )}
          
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>

      {/* Floating Action Button */}
      <FAB
        icon="plus"
        style={[styles.fab, { bottom: insets.bottom + 16 }]}
        onPress={() => navigation.navigate('AutomationBuilderScreen')}
      />

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
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchbar: {
    marginBottom: 12,
  },
  customSegmentedButtons: {
    flexDirection: 'row',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  leftSegment: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  middleSegment: {
    // No additional styles needed
  },
  rightSegment: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    borderRightWidth: 0,
  },
  activeSegment: {
    backgroundColor: '#6200ee',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeSegmentText: {
    color: '#fff',
  },
  summaryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f9f9f9',
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  automationCard: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardInfo: {
    flex: 1,
    marginRight: 12,
  },
  automationTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  automationDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  createdDate: {
    fontSize: 12,
    color: '#999',
  },
  publicStatus: {
    fontSize: 12,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyButton: {
    minWidth: 180,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
  },
  errorDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
  },
  bottomSpacer: {
    height: 80,
  },
  fullScreenModal: {
    flex: 1,
    margin: 0,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  // Skeleton loading styles
  skeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  skeletonText: {
    height: 20,
    width: '60%',
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
  skeletonActions: {
    flexDirection: 'row',
    gap: 8,
  },
  skeletonButton: {
    width: 32,
    height: 32,
    backgroundColor: '#e0e0e0',
    borderRadius: 16,
  },
  skeletonMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  skeletonChip: {
    height: 24,
    width: 60,
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
  },
  skeletonSearchbar: {
    height: 48,
    backgroundColor: '#e0e0e0',
    borderRadius: 24,
    marginBottom: 12,
  },
  skeletonFilters: {
    height: 40,
    backgroundColor: '#e0e0e0',
    borderRadius: 20,
  },
});

export default MyAutomationsScreen;