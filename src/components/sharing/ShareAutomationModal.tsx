import React, { useState, useEffect, useRef } from 'react';
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
  Platform,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { AutomationData } from '../../types';
import { automationSharingService } from '../../services/sharing/AutomationSharingService';
import { smartLinkService } from '../../services/linking/SmartLinkService';
import { sharingAnalyticsService } from '../../services/sharing/SharingAnalyticsService';
import QRCode from 'react-native-qrcode-svg';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';

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
  const [activeTab, setActiveTab] = useState<'quick' | 'qr' | 'advanced' | 'analytics'>('quick');
  const [customMessage, setCustomMessage] = useState('');
  const [publicLinkEnabled, setPublicLinkEnabled] = useState(false);
  const [embedData, setEmbedData] = useState(false);
  const [recipients, setRecipients] = useState('');
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [isSharingQR, setIsSharingQR] = useState(false);
  const [isSavingQR, setIsSavingQR] = useState(false);
  const qrRef = useRef<View>(null);

  useEffect(() => {
    if (visible && automation && activeTab === 'analytics') {
      loadAnalytics();
    }
  }, [visible, automation, activeTab]);

  const loadAnalytics = async () => {
    if (!automation) return;
    
    setLoadingAnalytics(true);
    try {
      const analyticsData = await sharingAnalyticsService.getAutomationAnalytics(automation.id);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoadingAnalytics(false);
    }
  };

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

  const shareQRCode = async () => {
    try {
      if (!qrRef.current) {
        Alert.alert('Error', 'QR code not ready. Please try again.');
        return;
      }

      setIsSharingQR(true);

      const uri = await captureRef(qrRef.current, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      });

      const shareMessage = `Scan this QR code to run "${automation.title}" automation.\n\nWorks with or without the app!\n\nCreated with Shortcuts Like`;

      const shareOptions = {
        title: `${automation.title} - Automation QR Code`,
        message: shareMessage,
        url: Platform.OS === 'ios' ? uri : `file://${uri}`,
        subject: `${automation.title} - Automation QR Code`,
        failOnCancel: false,
      };

      const result = await Share.share(shareOptions);

      if (result.action === Share.sharedAction) {
        await sharingAnalyticsService.trackShare(automation.id, 'qr', {
          method: 'native_share',
          success: true,
        });
      }
    } catch (error: any) {
      console.error('QR share error:', error);
      if (!error.message?.includes('cancel')) {
        Alert.alert(
          'Share Failed',
          'Could not share QR code. Try saving to camera roll instead.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Save to Camera Roll', onPress: saveQRToCameraRoll },
            { text: 'Copy Link', onPress: handleCopyLink }
          ]
        );
      }
    } finally {
      setIsSharingQR(false);
    }
  };


  const saveQRToCameraRoll = async () => {
    try {
      if (!qrRef.current) {
        Alert.alert('Error', 'QR code not ready. Please try again.');
        return;
      }

      setIsSavingQR(true);

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to save QR code to your camera roll.',
          [{ text: 'OK' }]
        );
        return;
      }

      const uri = await captureRef(qrRef.current, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      });

      const asset = await MediaLibrary.createAssetAsync(uri);
      await MediaLibrary.createAlbumAsync('Shortcuts Like QR Codes', asset, false);

      Alert.alert(
        'Saved! 📸',
        'QR code has been saved to your camera roll.',
        [
          { text: 'OK' },
          { text: 'Share Now', onPress: shareQRCode }
        ]
      );

      await sharingAnalyticsService.trackShare(automation.id, 'qr', {
        method: 'save_to_camera_roll',
        success: true,
      });
    } catch (error: any) {
      console.error('Save QR error:', error);
      Alert.alert(
        'Save Failed',
        'Could not save QR code. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSavingQR(false);
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

  const renderQRTab = () => {
    const [qrError, setQrError] = useState(false);
    
    try {
      const shareUrl = automationSharingService.generateShareUrl(automation.id);
      const QR_SIZE = 200;

      return (
      <ScrollView style={styles.tabContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📱 QR Code Sharing</Text>
          <Text style={styles.sectionDescription}>
            Share your automation via QR code for easy scanning
          </Text>
        </View>

        <View style={styles.qrContainer}>
          <View ref={qrRef} style={styles.qrWrapper}>
            <View style={styles.qrCode}>
              {!qrError ? (
                <QRCode
                  value={shareUrl}
                  size={QR_SIZE}
                  backgroundColor="#ffffff"
                  color="#000000"
                  ecl="M"
                  quietZone={15}
                  getRef={() => {
                    // Verify QRCode rendered successfully
                    setQrError(false);
                  }}
                  onError={(error: any) => {
                    console.error('QR Code generation error:', error);
                    setQrError(true);
                  }}
                />
              ) : (
                <View style={[styles.qrCode, { width: QR_SIZE, height: QR_SIZE, justifyContent: 'center', alignItems: 'center' }]}>
                  <Icon name="qrcode" size={QR_SIZE / 2} color="#ccc" />
                  <Text style={{ marginTop: 8, color: '#666', fontSize: 12 }}>QR Error</Text>
                </View>
              )}
            </View>
            <Text style={styles.qrTitle}>{automation.title}</Text>
            <Text style={styles.qrSubtitle}>Scan to run automation</Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton, isSharingQR && styles.disabledButton]}
            onPress={shareQRCode}
            disabled={isSharingQR || isSavingQR}
          >
            <Icon name="share" size={20} color="white" />
            <Text style={styles.primaryButtonText}>
              {isSharingQR ? 'Sharing...' : 'Share QR Code'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton, isSavingQR && styles.disabledButton]}
            onPress={saveQRToCameraRoll}
            disabled={isSharingQR || isSavingQR}
          >
            <Icon name="content-save" size={20} color="#6200ee" />
            <Text style={styles.secondaryButtonText}>
              {isSavingQR ? 'Saving...' : 'Save to Camera Roll'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.qrInfo}>
          <Icon name="information" size={16} color="#666" />
          <Text style={styles.qrInfoText}>
            QR codes work with or without the app installed. When scanned, they'll either open the app directly or redirect to a web page where the automation can be run.
          </Text>
        </View>
      </ScrollView>
    );
    } catch (error) {
      console.error('Error rendering QR tab:', error);
      return (
        <ScrollView style={styles.tabContent}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📱 QR Code Sharing</Text>
            <Text style={styles.sectionDescription}>
              Share your automation via QR code for easy scanning
            </Text>
          </View>
          <View style={styles.analyticsPlaceholder}>
            <Icon name="alert-circle" size={64} color="#ff5252" />
            <Text style={styles.placeholderTitle}>QR Code Generation Failed</Text>
            <Text style={styles.placeholderDescription}>
              Unable to generate QR code. Please try again or use the Share option.
            </Text>
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton, { marginTop: 16 }]}
              onPress={handleCopyLink}
            >
              <Icon name="content-copy" size={20} color="#6200ee" />
              <Text style={styles.secondaryButtonText}>Copy Link Instead</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
    }
  };

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

  const renderAnalyticsTab = () => {
    if (loadingAnalytics) {
      return (
        <View style={[styles.tabContent, styles.centerContent]}>
          <Icon name="loading" size={48} color="#6200ee" />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      );
    }

    if (!analytics) {
      return (
        <ScrollView style={styles.tabContent}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Sharing Analytics</Text>
            <Text style={styles.sectionDescription}>
              Track how your automation is being shared and used
            </Text>
          </View>
          <View style={styles.analyticsPlaceholder}>
            <Icon name="chart-line" size={64} color="#ccc" />
            <Text style={styles.placeholderTitle}>No Analytics Data Yet</Text>
            <Text style={styles.placeholderDescription}>
              Share your automation to start tracking engagement
            </Text>
          </View>
        </ScrollView>
      );
    }

    return (
      <ScrollView style={styles.tabContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Sharing Analytics</Text>
          <Text style={styles.sectionDescription}>
            Performance metrics for your shared automation
          </Text>
        </View>

        {/* Key Metrics */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Icon name="share-variant" size={24} color="#6200ee" />
            <Text style={styles.metricValue}>{analytics.totalShares}</Text>
            <Text style={styles.metricLabel}>Total Shares</Text>
          </View>
          <View style={styles.metricCard}>
            <Icon name="eye" size={24} color="#6200ee" />
            <Text style={styles.metricValue}>{analytics.totalViews}</Text>
            <Text style={styles.metricLabel}>Total Views</Text>
          </View>
          <View style={styles.metricCard}>
            <Icon name="account-multiple" size={24} color="#6200ee" />
            <Text style={styles.metricValue}>{analytics.uniqueViewers}</Text>
            <Text style={styles.metricLabel}>Unique Viewers</Text>
          </View>
          <View style={styles.metricCard}>
            <Icon name="percent" size={24} color="#6200ee" />
            <Text style={styles.metricValue}>{analytics.conversionRate.toFixed(1)}%</Text>
            <Text style={styles.metricLabel}>Conversion Rate</Text>
          </View>
        </View>

        {/* Share Methods Breakdown */}
        {Object.keys(analytics.sharesByMethod).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.subsectionTitle}>Share Methods</Text>
            {Object.entries(analytics.sharesByMethod).map(([method, count]) => (
              <View key={method} style={styles.methodRow}>
                <Icon 
                  name={method === 'link' ? 'link' : method === 'qr' ? 'qrcode' : 'share'} 
                  size={20} 
                  color="#666" 
                />
                <Text style={styles.methodName}>{method.toUpperCase()}</Text>
                <Text style={styles.methodCount}>{count as number}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recent Shares */}
        {analytics.recentShares.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.subsectionTitle}>Recent Shares</Text>
            {analytics.recentShares.slice(0, 5).map((share: any, index: number) => (
              <View key={index} style={styles.recentShareItem}>
                <Icon name="share-variant" size={16} color="#999" />
                <Text style={styles.shareTime}>
                  {new Date(share.sharedAt).toLocaleDateString()} via {share.method}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Engagement Tips */}
        <View style={styles.tipsCard}>
          <Icon name="lightbulb-outline" size={24} color="#ff9800" />
          <View style={styles.tipsContent}>
            <Text style={styles.tipsTitle}>Boost Engagement</Text>
            <Text style={styles.tipsText}>
              {analytics.conversionRate < 10 
                ? 'Add a compelling description to improve conversion rates'
                : analytics.totalShares < 5
                ? 'Share more frequently to increase visibility'
                : 'Your automation is performing well! Keep sharing'}
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  };

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
            { key: 'qr', label: 'QR Code', icon: 'qrcode' },
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
        {activeTab === 'qr' && renderQRTab()}
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
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
    marginBottom: 24,
  },
  metricCard: {
    width: '50%',
    padding: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  methodName: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#333',
  },
  methodCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6200ee',
  },
  recentShareItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  shareTime: {
    marginLeft: 8,
    fontSize: 12,
    color: '#666',
  },
  tipsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff8e1',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  tipsContent: {
    flex: 1,
    marginLeft: 12,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f57c00',
    marginBottom: 4,
  },
  tipsText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  qrWrapper: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  qrCode: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
  },
  qrTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  qrSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  qrInfo: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  qrInfoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  disabledButton: {
    opacity: 0.6,
  },
});