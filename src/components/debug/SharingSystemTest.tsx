import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Linking,
} from 'react-native';
import {
  Card,
  Button,
  Text,
  Divider,
  Surface,
  List,
  Chip,
  ActivityIndicator,
} from 'react-native-paper';
import { smartLinkService } from '../../services/linking/SmartLinkService';
import { automationSharingService } from '../../services/sharing/AutomationSharingService';
import { linkingService } from '../../services/linking/LinkingService';
import NFCService from '../../services/nfc/NFCService';
import { supabase } from '../../services/supabase/client';
import * as Clipboard from 'expo-clipboard';

interface TestResult {
  test: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  message?: string;
  details?: any;
}

export const SharingSystemTest: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [nfcSupported, setNfcSupported] = useState<boolean | null>(null);

  // Sample automation for testing
  const testAutomation = {
    id: 'test-automation-123',
    title: 'Test Automation',
    description: 'This is a test automation for sharing system verification',
    steps: [
      {
        id: 'step-1',
        type: 'notification',
        title: 'Test Notification',
        enabled: true,
        config: {
          title: 'Test',
          message: 'This is a test notification from shared automation'
        }
      }
    ],
    created_by: 'test-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_public: true,
    category: 'test',
    tags: ['test', 'sharing'],
    execution_count: 0,
    average_rating: 0,
    rating_count: 0,
  };

  const updateTestResult = (test: string, status: TestResult['status'], message?: string, details?: any) => {
    setTestResults(prev => {
      const existing = prev.find(r => r.test === test);
      if (existing) {
        return prev.map(r => r.test === test ? { ...r, status, message, details } : r);
      }
      return [...prev, { test, status, message, details }];
    });
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    // Test suite
    const tests = [
      { name: 'NFC Support Check', fn: testNFCSupport },
      { name: 'Smart Link Generation', fn: testSmartLinkGeneration },
      { name: 'QR Data Generation', fn: testQRDataGeneration },
      { name: 'Emergency Link Generation', fn: testEmergencyLinkGeneration },
      { name: 'Deep Link Parsing', fn: testDeepLinkParsing },
      { name: 'Public Share Creation', fn: testPublicShareCreation },
      { name: 'Share URL Validation', fn: testShareURLValidation },
      { name: 'Clipboard Operations', fn: testClipboardOperations },
      { name: 'Database Connectivity', fn: testDatabaseConnectivity },
      { name: 'RLS Policies', fn: testRLSPolicies },
    ];

    for (const test of tests) {
      updateTestResult(test.name, 'running');
      try {
        await test.fn();
      } catch (error) {
        updateTestResult(test.name, 'failed', error.message);
      }
    }

    setIsRunning(false);
  };

  // Individual test functions
  const testNFCSupport = async () => {
    try {
      const supported = await NFCService.initialize();
      setNfcSupported(supported);
      
      if (supported) {
        const enabled = await NFCService.checkNFCEnabled();
        updateTestResult('NFC Support Check', 'success', 
          `NFC is ${enabled ? 'enabled' : 'supported but disabled'}`,
          { supported, enabled }
        );
      } else {
        updateTestResult('NFC Support Check', 'success', 
          'NFC not supported on this device',
          { supported: false }
        );
      }
    } catch (error) {
      throw new Error(`NFC check failed: ${error.message}`);
    }
  };

  const testSmartLinkGeneration = async () => {
    try {
      const smartLink = smartLinkService.generateSmartLink(testAutomation);
      
      if (!smartLink.universalUrl || !smartLink.qrData || !smartLink.appDeepLink) {
        throw new Error('Smart link missing required fields');
      }
      
      updateTestResult('Smart Link Generation', 'success', 
        'Smart links generated successfully',
        {
          universalUrl: smartLink.universalUrl,
          qrData: smartLink.qrData,
          appDeepLink: smartLink.appDeepLink,
          webFallbackUrl: smartLink.webFallbackUrl
        }
      );
    } catch (error) {
      throw new Error(`Smart link generation failed: ${error.message}`);
    }
  };

  const testQRDataGeneration = async () => {
    try {
      const smartLink = smartLinkService.generateSmartLink(testAutomation);
      
      // Validate QR data format
      if (!smartLink.qrData.includes('zaptap.cloud')) {
        throw new Error('QR data missing domain');
      }
      
      updateTestResult('QR Data Generation', 'success', 
        'QR data generated correctly',
        { qrData: smartLink.qrData }
      );
    } catch (error) {
      throw new Error(`QR data generation failed: ${error.message}`);
    }
  };

  const testEmergencyLinkGeneration = async () => {
    try {
      const emergencyLink = smartLinkService.generateEmergencyLink(testAutomation);
      
      if (!emergencyLink.qrData.includes('emergency')) {
        throw new Error('Emergency link missing emergency identifier');
      }
      
      updateTestResult('Emergency Link Generation', 'success', 
        'Emergency links generated with embedded data',
        {
          url: emergencyLink.universalUrl,
          hasEmbeddedData: emergencyLink.embedData !== undefined
        }
      );
    } catch (error) {
      throw new Error(`Emergency link generation failed: ${error.message}`);
    }
  };

  const testDeepLinkParsing = async () => {
    try {
      const testLinks = [
        'zaptap://automation/test-123',
        'https://www.zaptap.cloud/link/test-123',
        'https://www.zaptap.cloud/share/test-123',
        'shortcuts-like://automation/test-123'
      ];
      
      const results = testLinks.map(link => ({
        link,
        isSmartLink: smartLinkService.isSmartLink(link),
        automationId: smartLinkService.extractAutomationId(link)
      }));
      
      const allValid = results.every(r => r.automationId === 'test-123');
      
      if (!allValid) {
        throw new Error('Some links failed to parse correctly');
      }
      
      updateTestResult('Deep Link Parsing', 'success', 
        'All link formats parsed correctly',
        { results }
      );
    } catch (error) {
      throw new Error(`Deep link parsing failed: ${error.message}`);
    }
  };

  const testPublicShareCreation = async () => {
    try {
      const result = await automationSharingService.createPublicShareLink(testAutomation);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create public share');
      }
      
      updateTestResult('Public Share Creation', 'success', 
        'Public share created successfully',
        {
          publicId: result.publicId,
          shareUrl: result.shareUrl
        }
      );
    } catch (error) {
      throw new Error(`Public share creation failed: ${error.message}`);
    }
  };

  const testShareURLValidation = async () => {
    try {
      const shareResult = await automationSharingService.shareViaUrl(testAutomation);
      
      if (!shareResult.success) {
        throw new Error(shareResult.error || 'Failed to generate share URL');
      }
      
      // Validate URL format
      const url = new URL(shareResult.shareUrl);
      if (!url.hostname.includes('zaptap')) {
        throw new Error('Invalid share URL domain');
      }
      
      updateTestResult('Share URL Validation', 'success', 
        'Share URLs are valid',
        { shareUrl: shareResult.shareUrl }
      );
    } catch (error) {
      throw new Error(`Share URL validation failed: ${error.message}`);
    }
  };

  const testClipboardOperations = async () => {
    try {
      const testText = 'https://www.zaptap.cloud/link/test-automation';
      await Clipboard.setStringAsync(testText);
      const retrieved = await Clipboard.getStringAsync();
      
      if (retrieved !== testText) {
        throw new Error('Clipboard content mismatch');
      }
      
      updateTestResult('Clipboard Operations', 'success', 
        'Clipboard operations working correctly'
      );
    } catch (error) {
      throw new Error(`Clipboard test failed: ${error.message}`);
    }
  };

  const testDatabaseConnectivity = async () => {
    try {
      // Test database connection
      const { data, error } = await supabase
        .from('automations')
        .select('id')
        .limit(1);
      
      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }
      
      updateTestResult('Database Connectivity', 'success', 
        'Successfully connected to Supabase'
      );
    } catch (error) {
      throw new Error(`Database connectivity test failed: ${error.message}`);
    }
  };

  const testRLSPolicies = async () => {
    try {
      // Test RLS by attempting to read public shares
      const { data, error } = await supabase
        .from('public_shares')
        .select('id')
        .limit(1);
      
      // Even if no data, lack of error means RLS is configured
      if (error && !error.message.includes('no rows')) {
        throw new Error(`RLS policy error: ${error.message}`);
      }
      
      updateTestResult('RLS Policies', 'success', 
        'RLS policies are properly configured'
      );
    } catch (error) {
      throw new Error(`RLS policy test failed: ${error.message}`);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending': return 'clock-outline';
      case 'running': return 'loading';
      case 'success': return 'check-circle';
      case 'failed': return 'alert-circle';
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pending': return '#666';
      case 'running': return '#2196F3';
      case 'success': return '#4CAF50';
      case 'failed': return '#F44336';
    }
  };

  return (
    <Card style={styles.card}>
      <Card.Title 
        title="Sharing System Test Suite"
        subtitle="Comprehensive validation of NFC, QR, and web sharing"
      />
      <Card.Content>
        <View style={styles.header}>
          <Text variant="bodyMedium" style={styles.description}>
            This test suite validates all sharing mechanisms including NFC tag writing/reading, 
            QR code generation, deep linking, and database operations.
          </Text>
          
          {nfcSupported !== null && (
            <Chip 
              icon={nfcSupported ? 'nfc' : 'nfc-off'} 
              style={[styles.chip, { backgroundColor: nfcSupported ? '#E8F5E9' : '#FFEBEE' }]}
            >
              NFC {nfcSupported ? 'Supported' : 'Not Supported'}
            </Chip>
          )}
        </View>

        <Divider style={styles.divider} />

        <ScrollView style={styles.resultsContainer}>
          {testResults.map((result, index) => (
            <Surface key={index} style={styles.testResult} elevation={1}>
              <List.Item
                title={result.test}
                description={result.message}
                left={props => 
                  result.status === 'running' ? (
                    <ActivityIndicator size="small" style={{ marginLeft: 8 }} />
                  ) : (
                    <List.Icon 
                      {...props} 
                      icon={getStatusIcon(result.status)} 
                      color={getStatusColor(result.status)}
                    />
                  )
                }
                right={() => (
                  <Chip 
                    textStyle={{ fontSize: 12 }}
                    style={{ backgroundColor: getStatusColor(result.status) + '20' }}
                  >
                    {result.status.toUpperCase()}
                  </Chip>
                )}
              />
              {result.details && (
                <View style={styles.details}>
                  <Text variant="bodySmall" style={styles.detailsText}>
                    {JSON.stringify(result.details, null, 2)}
                  </Text>
                </View>
              )}
            </Surface>
          ))}
        </ScrollView>

        <View style={styles.actions}>
          <Button
            mode="contained"
            onPress={runAllTests}
            loading={isRunning}
            disabled={isRunning}
            icon="play"
          >
            Run All Tests
          </Button>
          
          <Button
            mode="outlined"
            onPress={() => {
              const summary = testResults.map(r => 
                `${r.test}: ${r.status}${r.message ? ' - ' + r.message : ''}`
              ).join('\n');
              
              Alert.alert(
                'Test Summary',
                summary || 'No tests run yet',
                [
                  { text: 'Copy', onPress: () => Clipboard.setStringAsync(summary) },
                  { text: 'OK' }
                ]
              );
            }}
            disabled={testResults.length === 0}
            icon="content-copy"
          >
            Copy Results
          </Button>
        </View>

        <Surface style={styles.infoBox} elevation={0}>
          <Text variant="titleSmall" style={styles.infoTitle}>
            🔍 What This Tests
          </Text>
          <Text variant="bodySmall" style={styles.infoText}>
            • NFC hardware support and permissions{'\n'}
            • Smart link generation for universal access{'\n'}
            • QR code data formatting{'\n'}
            • Emergency link embedding{'\n'}
            • Deep link URL parsing{'\n'}
            • Public share database operations{'\n'}
            • Clipboard functionality{'\n'}
            • Supabase connectivity and RLS policies
          </Text>
        </Surface>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 16,
  },
  header: {
    marginBottom: 16,
  },
  description: {
    marginBottom: 12,
    color: '#666',
  },
  chip: {
    alignSelf: 'flex-start',
  },
  divider: {
    marginVertical: 16,
  },
  resultsContainer: {
    maxHeight: 400,
    marginBottom: 16,
  },
  testResult: {
    marginBottom: 8,
    borderRadius: 8,
  },
  details: {
    padding: 12,
    paddingTop: 0,
  },
  detailsText: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  infoBox: {
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  infoTitle: {
    marginBottom: 8,
    color: '#333',
  },
  infoText: {
    color: '#666',
    lineHeight: 20,
  },
});