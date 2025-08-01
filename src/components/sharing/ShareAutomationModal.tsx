import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Clipboard,
  Share,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AutomationData } from '../../types';
import { automationSharingService } from '../../services/sharing/AutomationSharingService';
import { smartLinkService } from '../../services/linking/SmartLinkService';

interface ShareAutomationModalProps {
  visible: boolean;
  automation: AutomationData | null;
  onClose: () => void;
}

export const ShareAutomationModal: React.FC<ShareAutomationModalProps> = ({
  visible,
  automation,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'quick' | 'advanced' | 'analytics'>('quick');
  const [customMessage, setCustomMessage] = useState('');
  const [publicLinkEnabled, setPublicLinkEnabled] = useState(false);
  const [embedData, setEmbedData] = useState(false);
  const [recipients, setRecipients] = useState('');
  const [loading, setLoading] = useState(false);

  if (!automation) return null;

  const handleQuickShare = async () => {
    setLoading(true);
    try {
      const result = await automationSharingService.shareAutomation(automation, {
        customMessage: customMessage || undefined,
        generatePublicLink: publicLinkEnabled,
        embedData,
      });

      if (result.success) {
        Alert.alert(
          'Shared Successfully! 🎉',
          'Your automation has been shared. Others can now access it via the link.',
          [{ text: 'OK' }]
        );
        onClose();
      } else {
        Alert.alert('Share Failed', result.error || 'Failed to share automation');
      }
    } catch (error: any) {
      Alert.alert('Share Failed', error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      const result = await automationSharingService.shareViaUrl(automation, {
        embedData,
        emergency: false,
      });

      if (result.success && result.shareUrl) {
        await Clipboard.setString(result.shareUrl);
        Alert.alert('Link Copied! 📋', 'The automation link has been copied to your clipboard.');
      } else {
        Alert.alert('Copy Failed', result.error || 'Failed to generate link');
      }
    } catch (error: any) {
      Alert.alert('Copy Failed', error.message || 'An unexpected error occurred');
    }
  };

  const handleShareWithUsers = async () => {
    if (!recipients.trim()) {
      Alert.alert('No Recipients', 'Please enter email addresses or phone numbers');
      return;
    }

    setLoading(true);
    try {
      const recipientList = recipients.split(',').map(r => r.trim()).filter(r => r);
      const method = recipientList[0].includes('@') ? 'email' : 'sms';

      const result = await automationSharingService.shareWithUsers(
        automation,
        recipientList,
        method,
        customMessage || undefined
      );

      if (result.success) {
        Alert.alert(
          'Share Prepared! 📧',
          `Sharing details have been prepared for ${recipientList.length} recipient(s). The share link is ready for distribution.`,
          [{ text: 'OK' }]
        );
        onClose();
      } else {
        Alert.alert('Share Failed', result.error || 'Failed to share with users');
      }
    } catch (error: any) {
      Alert.alert('Share Failed', error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePublicLink = async () => {
    setLoading(true);
    try {
      const result = await automationSharingService.createPublicShareLink(automation);

      if (result.success && result.shareUrl) {
        await Clipboard.setString(result.shareUrl);
        Alert.alert(
          'Public Link Created! 🌐',
          `Your automation now has a public link that anyone can use to run it.\n\nLink copied to clipboard!\n\nPublic ID: ${result.publicId}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Creation Failed', result.error || 'Failed to create public link');
      }
    } catch (error: any) {
      Alert.alert('Creation Failed', error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const renderQuickShareTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚀 Quick Share</Text>
        <Text style={styles.sectionDescription}>
          Share your automation with others instantly
        </Text>
      </View>

      <View style={styles.optionGroup}>
        <Text style={styles.optionLabel}>Custom Message (Optional)</Text>
        <TextInput
          style={styles.textInput}
          value={customMessage}
          onChangeText={setCustomMessage}
          placeholder="Add a personal message..."
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.optionGroup}>
        <TouchableOpacity
          style={styles.toggleOption}
          onPress={() => setPublicLinkEnabled(!publicLinkEnabled)}
        >
          <Icon
            name={publicLinkEnabled ? 'checkbox-marked' : 'checkbox-blank-outline'}
            size={24}
            color={publicLinkEnabled ? '#6200ee' : '#999'}
          />
          <View style={styles.toggleContent}>
            <Text style={styles.toggleTitle}>Create Public Link</Text>
            <Text style={styles.toggleDescription}>
              Generate a permanent shareable link with analytics
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toggleOption}
          onPress={() => setEmbedData(!embedData)}
        >
          <Icon
            name={embedData ? 'checkbox-marked' : 'checkbox-blank-outline'}
            size={24}
            color={embedData ? '#6200ee' : '#999'}
          />
          <View style={styles.toggleContent}>
            <Text style={styles.toggleTitle}>Embed Automation Data</Text>
            <Text style={styles.toggleDescription}>
              Include full automation data for offline execution
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={handleQuickShare}
          disabled={loading}
        >
          <Icon name="share" size={20} color="white" />
          <Text style={styles.primaryButtonText}>
            {loading ? 'Sharing...' : 'Share Now'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={handleCopyLink}
        >
          <Icon name="content-copy" size={20} color="#6200ee" />
          <Text style={styles.secondaryButtonText}>Copy Link</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderAdvancedTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚙️ Advanced Sharing</Text>
        <Text style={styles.sectionDescription}>
          More sharing options and customization
        </Text>
      </View>

      <View style={styles.optionGroup}>
        <Text style={styles.optionLabel}>Share with Specific Users</Text>
        <TextInput
          style={styles.textInput}
          value={recipients}
          onChangeText={setRecipients}
          placeholder="Enter emails or phone numbers (comma-separated)"
          multiline
          numberOfLines={2}
        />
        <Text style={styles.helperText}>
          Example: user@email.com, +1234567890, another@email.com
        </Text>
      </View>

      <View style={styles.optionGroup}>
        <Text style={styles.optionLabel}>Custom Message</Text>
        <TextInput
          style={styles.textInput}
          value={customMessage}
          onChangeText={setCustomMessage}
          placeholder="Add a personal message for recipients..."
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={handleShareWithUsers}
          disabled={loading}
        >
          <Icon name="account-multiple" size={20} color="white" />
          <Text style={styles.primaryButtonText}>
            {loading ? 'Preparing...' : 'Share with Users'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={handleCreatePublicLink}
          disabled={loading}
        >
          <Icon name="earth" size={20} color="#6200ee" />
          <Text style={styles.secondaryButtonText}>Create Public Link</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderAnalyticsTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Sharing Analytics</Text>
        <Text style={styles.sectionDescription}>
          Track how your automation is being shared and used
        </Text>
      </View>

      <View style={styles.analyticsPlaceholder}>
        <Icon name="chart-line" size={64} color="#ccc" />
        <Text style={styles.placeholderTitle}>Analytics Coming Soon</Text>
        <Text style={styles.placeholderDescription}>
          View sharing statistics, link clicks, and user engagement metrics
        </Text>
      </View>

      <View style={styles.featureList}>
        <View style={styles.featureItem}>
          <Icon name="eye" size={20} color="#666" />
          <Text style={styles.featureText}>Track link views and clicks</Text>
        </View>
        <View style={styles.featureItem}>
          <Icon name="share-variant" size={20} color="#666" />
          <Text style={styles.featureText}>Monitor sharing methods</Text>
        </View>
        <View style={styles.featureItem}>
          <Icon name="chart-timeline-variant" size={20} color="#666" />
          <Text style={styles.featureText}>View usage over time</Text>
        </View>
        <View style={styles.featureItem}>
          <Icon name="map-marker" size={20} color="#666" />
          <Text style={styles.featureText}>Geographic usage data</Text>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Share Automation</Text>
          <View style={styles.closeButton} />
        </View>

        <View style={styles.automationInfo}>
          <Text style={styles.automationTitle}>{automation.title}</Text>
          <Text style={styles.automationMeta}>
            {automation.steps?.length || 0} steps • {automation.category}
          </Text>
        </View>

        <View style={styles.tabBar}>
          {[
            { key: 'quick', label: 'Quick', icon: 'flash' },
            { key: 'advanced', label: 'Advanced', icon: 'cog' },
            { key: 'analytics', label: 'Analytics', icon: 'chart-line' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.activeTab]}
              onPress={() => setActiveTab(tab.key as any)}
            >
              <Icon
                name={tab.icon}
                size={20}
                color={activeTab === tab.key ? '#6200ee' : '#999'}
              />
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === tab.key && styles.activeTabLabel,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'quick' && renderQuickShareTab()}
        {activeTab === 'advanced' && renderAdvancedTab()}
        {activeTab === 'analytics' && renderAnalyticsTab()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  automationInfo: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  automationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  automationMeta: {
    fontSize: 14,
    color: '#666',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#6200ee',
  },
  tabLabel: {
    fontSize: 14,
    color: '#999',
  },
  activeTabLabel: {
    color: '#6200ee',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  optionGroup: {
    marginBottom: 24,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: 'white',
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  toggleOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  toggleContent: {
    flex: 1,
    marginLeft: 12,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  actionButtons: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#6200ee',
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#6200ee',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#6200ee',
    fontSize: 16,
    fontWeight: '600',
  },
  analyticsPlaceholder: {
    alignItems: 'center',
    paddingVertical: 40,
    marginBottom: 32,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  placeholderDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  featureList: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#666',
  },
});