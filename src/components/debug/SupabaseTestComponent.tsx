import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Button,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { supabase } from '../../services/supabase/client';

interface TestResult {
  test: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
  data?: any;
}

export const SupabaseTestComponent: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);

  const updateResult = (test: string, status: TestResult['status'], message?: string, data?: any) => {
    setResults(prev => {
      const existing = prev.find(r => r.test === test);
      if (existing) {
        return prev.map(r => r.test === test ? { ...r, status, message, data } : r);
      }
      return [...prev, { test, status, message, data }];
    });
  };

  const runTests = async () => {
    setTesting(true);
    setResults([]);

    // Test 1: Basic Connection
    updateResult('Connection', 'pending');
    try {
      const { data, error } = await supabase.from('categories').select('count');
      if (error) throw error;
      updateResult('Connection', 'success', 'Connected to Supabase');
    } catch (error: any) {
      updateResult('Connection', 'error', error.message);
    }

    // Test 2: Auth Status
    updateResult('Auth Status', 'pending');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      updateResult('Auth Status', 'success', user ? `Logged in as ${user.email}` : 'Not authenticated');
    } catch (error: any) {
      updateResult('Auth Status', 'error', error.message);
    }

    // Test 3: Categories Table
    updateResult('Categories Table', 'pending');
    try {
      const { data, error } = await supabase.from('categories').select('*').limit(5);
      if (error) throw error;
      updateResult('Categories Table', 'success', `Found ${data.length} categories`, data);
    } catch (error: any) {
      updateResult('Categories Table', 'error', error.message);
    }

    // Test 4: Automations Table
    updateResult('Automations Table', 'pending');
    try {
      const { data, error } = await supabase
        .from('automations')
        .select('*')
        .eq('is_public', true)
        .limit(5);
      if (error) throw error;
      updateResult('Automations Table', 'success', `Found ${data.length} public automations`, data);
    } catch (error: any) {
      updateResult('Automations Table', 'error', error.message);
    }

    // Test 5: Reviews Table
    updateResult('Reviews Table', 'pending');
    try {
      const { data, error } = await supabase
        .from('automation_reviews')
        .select('*')
        .limit(5);
      if (error) throw error;
      updateResult('Reviews Table', 'success', `Found ${data.length} reviews`, data);
    } catch (error: any) {
      updateResult('Reviews Table', 'error', error.message);
    }

    // Test 6: Create Test Automation (if authenticated)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      updateResult('Create Test', 'pending');
      try {
        const testAutomation = {
          title: `Test Automation ${Date.now()}`,
          description: 'Created by Supabase test',
          steps: [],
          created_by: user.id,
          is_public: false,
          category: 'general',
        };

        const { data, error } = await supabase
          .from('automations')
          .insert(testAutomation)
          .select()
          .single();

        if (error) throw error;
        
        // Clean up - delete the test automation
        await supabase.from('automations').delete().eq('id', data.id);
        
        updateResult('Create Test', 'success', 'Successfully created and deleted test automation');
      } catch (error: any) {
        updateResult('Create Test', 'error', error.message);
      }
    }

    setTesting(false);
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return '#4CAF50';
      case 'error': return '#F44336';
      case 'pending': return '#FF9800';
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'pending': return '⏳';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Supabase Connection Test</Text>
        <Button
          title={testing ? 'Testing...' : 'Run Tests'}
          onPress={runTests}
          disabled={testing}
          color="#6200ee"
        />
      </View>

      {results.map((result, index) => (
        <View key={index} style={[styles.resultCard, { borderLeftColor: getStatusColor(result.status) }]}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultIcon}>{getStatusIcon(result.status)}</Text>
            <Text style={styles.resultTitle}>{result.test}</Text>
          </View>
          {result.message && (
            <Text style={[styles.resultMessage, { color: getStatusColor(result.status) }]}>
              {result.message}
            </Text>
          )}
          {result.data && (
            <Text style={styles.resultData}>
              {JSON.stringify(result.data, null, 2).substring(0, 200)}...
            </Text>
          )}
        </View>
      ))}

      {testing && (
        <ActivityIndicator size="large" color="#6200ee" style={styles.loader} />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  resultCard: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  resultIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  resultMessage: {
    fontSize: 14,
    marginTop: 5,
  },
  resultData: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontFamily: 'monospace',
  },
  loader: {
    marginTop: 20,
  },
});