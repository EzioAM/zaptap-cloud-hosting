import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Share,
  Linking,
} from 'react-native';
import {
  Appbar,
  Card,
  Text,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { AutomationData } from '../../types';
import { supabase } from '../../services/supabase/client';
import { useSelector } from 'react-redux';
import { smartLinkService } from '../../services/linking/SmartLinkService';
import { RootState } from '../../store';
import { useTrackAutomationDownloadMutation, useGetAutomationQuery } from '../../store/api/automationApi';
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

type Props = NativeStackScreenProps<RootStackParamList, 'AutomationDetails'>;

const AutomationDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  // Handle both automationId and automation object from params
  const params = route.params || {};
  const automationId = params.automationId || params.automation?.id;
  const fromGallery = params.fromGallery;
  
  // Validate route parameters
  React.useEffect(() => {
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
  
  const insets = useSafeAreaInsets();
  const isOwner = user?.id === automation?.created_by;

  // Update privacy settings when automation data loads
  React.useEffect(() => {
    if (automation) {
      setIsPublic(automation.is_public);
    }
  }, [automation]);

  // Show loading state
  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" />
        <Text>Loading automation...</Text>
      </View>
    );
  }

  // Show error state
  if (error || !automation) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Text>Failed to load automation</Text>
        <Button onPress={() => navigation.goBack()}>Go Back</Button>
      </View>
    );
  }

  const handleRunAutomation = async () => {
    if (!automation) return;
    
    try {
      const { AutomationEngine } = await import('../../services/automation/AutomationEngine');
      const engine = new AutomationEngine();
      
      Alert.alert(
        'Running Automation 🚀',
        `Starting "${automation.title}"...`,
        [{ text: 'OK' }]
      );
      
      const result = await engine.execute(automation);
      
      if (result.success) {
        Alert.alert(
          'Success! 🎉',
          `Automation completed!\n\n⏱️ Time: ${result.executionTime}ms\n✅ Steps: ${result.stepsCompleted}/${result.totalSteps}`
        );
      } else {
        Alert.alert('Failed', result.error || 'Unknown error');
      }
    } catch (error: any) {
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

  const renderActionItem = (
    icon: string,
    title: string,
    description: string,
    onPress: () => void,
    color?: string
  ) => (
    <List.Item
      title={title}
      description={description}
      left={(props) => <List.Icon {...props} icon={icon} color={color} />}
      onPress={onPress}
      style={styles.actionItem}
    />
  );

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={automation.title} />
        <Appbar.Action icon="play" onPress={handleRunAutomation} />
        <Appbar.Action icon="share-variant" onPress={() => setShowShareModal(true)} />
        {isOwner && (
          <Appbar.Action icon="pencil" onPress={() => navigation.navigate('AutomationBuilder', { automationId })} />
        )}
      </Appbar.Header>

      <ScrollView style={styles.content}>
        {/* Automation Info Card */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <Text style={styles.title}>{automation.title}</Text>
            {automation.description && (
              <Text style={styles.description}>{automation.description}</Text>
            )}
            
            <View style={styles.metadata}>
              <View style={styles.metaItem}>
                <Icon name="layers" size={16} color="#666" />
                <Text style={styles.metaText}>{automation.steps?.length || 0} steps</Text>
              </View>
              <View style={styles.metaItem}>
                <Icon name="tag" size={16} color="#666" />
                <Text style={styles.metaText}>{automation.category}</Text>
              </View>
              <View style={styles.metaItem}>
                <Icon name="play-circle" size={16} color="#666" />
                <Text style={styles.metaText}>{automation.execution_count} runs</Text>
              </View>
              <View style={styles.metaItem}>
                <StarRating
                  rating={automation.average_rating}
                  size={16}
                  showRating={true}
                  showCount={true}
                  reviewCount={automation.rating_count}
                />
              </View>
            </View>

            <Button
              mode="contained"
              icon="play"
              onPress={handleRunAutomation}
              style={styles.runButton}
            >
              Run Automation
            </Button>
          </Card.Content>
        </Card>

        {/* Deploy & Share */}
        <DeploymentOptions automation={automation} />

        {/* Quick Actions */}
        <Card style={styles.actionsCard}>
          <Card.Title title="Quick Actions" />
          <Card.Content>
            <View style={styles.quickActions}>
              <IconButton
                icon="share-variant"
                size={24}
                onPress={handleShareAutomation}
                style={styles.quickAction}
              />
              <IconButton
                icon="content-copy"
                size={24}
                onPress={handleDuplicateAutomation}
                style={styles.quickAction}
              />
              <IconButton
                icon="qrcode"
                size={24}
                onPress={() => setShowQRModal(true)}
                style={styles.quickAction}
              />
              <IconButton
                icon="nfc"
                size={24}
                onPress={() => setShowNFCModal(true)}
                style={styles.quickAction}
              />
              <IconButton
                icon="star-outline"
                size={24}
                onPress={() => navigation.navigate('Reviews', { automation })}
                style={styles.quickAction}
              />
            </View>
          </Card.Content>
        </Card>

        {/* Sharing & Privacy */}
        <Card style={styles.section}>
          <List.Section>
            <List.Subheader>Sharing & Privacy</List.Subheader>
            {renderActionItem(
              'share-variant-outline',
              'Share Automation',
              'Share with friends or on social media',
              handleShareAutomation
            )}
            {renderActionItem(
              'content-copy',
              'Duplicate',
              'Create a copy in your library',
              handleDuplicateAutomation
            )}
            {renderActionItem(
              'link',
              'Copy Link',
              'Copy automation link to clipboard',
              handleCopyLink
            )}
            {isOwner && !isPublic && renderActionItem(
              'earth',
              'Publish to Gallery',
              'Make this automation discoverable by everyone',
              () => handlePublishToGallery()
            )}
            {isOwner && renderActionItem(
              'shield-lock-outline',
              'Privacy Settings',
              isPublic ? 'Public - Anyone can view' : 'Private - Only you can view',
              () => setShowSettingsModal(true)
            )}
          </List.Section>
        </Card>

        {/* Deployment Options */}
        <Card style={styles.section}>
          <List.Section>
            <List.Subheader>Deployment Options</List.Subheader>
            {renderActionItem(
              'qrcode',
              'Generate QR Code',
              'Create a QR code for easy sharing',
              () => setShowQRModal(true)
            )}
            {renderActionItem(
              'nfc',
              'Write to NFC Tag',
              'Deploy to NFC tag for tap-to-run',
              () => setShowNFCModal(true)
            )}
            {renderActionItem(
              'apple',
              'Add to Home Screen',
              'Create a shortcut on your home screen',
              () => Alert.alert('Coming Soon', 'This feature will be available in the next update')
            )}
          </List.Section>
        </Card>

        {/* Advanced Options */}
        {isOwner && (
          <Card style={styles.section}>
            <List.Section>
              <List.Subheader>Advanced Options</List.Subheader>
              {renderActionItem(
                'history',
                'Version History',
                'View and restore previous versions',
                () => setShowVersionHistory(true)
              )}
              {renderActionItem(
                'chart-line',
                'Analytics',
                'View usage statistics and insights',
                () => setShowAnalytics(true)
              )}
              {renderActionItem(
                'comment-text-outline',
                'Comments',
                'View and manage user comments',
                () => setShowComments(true)
              )}
              {renderActionItem(
                'delete',
                'Delete Automation',
                'Permanently remove this automation',
                handleDeleteAutomation,
                '#f44336'
              )}
            </List.Section>
          </Card>
        )}

        <View style={styles.bottomSpacer} />
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
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    flex: 1,
  },
  infoCard: {
    margin: 16,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 22,
  },
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
  },
  metaText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  runButton: {
    marginTop: 8,
  },
  actionsCard: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickAction: {
    backgroundColor: '#f0f0f0',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  actionItem: {
    paddingVertical: 8,
  },
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    maxHeight: '80%',
  },
  modalContent: {
    padding: 20,
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
  fullScreenModal: {
    flex: 1,
    margin: 0,
  },
  bottomSpacer: {
    height: 32,
  },
});

export default AutomationDetailsScreen;