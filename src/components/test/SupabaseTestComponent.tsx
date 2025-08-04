import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase, testConnection } from '../../services/supabase/client';

export const SupabaseTestComponent = () => {
  const [status, setStatus] = useState<string>('🔍 Testing connection...');
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [queryResult, setQueryResult] = useState<string>('');

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setLoading(true);
    try {
      console.log('🔍 Testing Supabase connection...');
      const result = await testConnection();
      
      if (result.connected) {
        setStatus('✅ Supabase Connected');
        setDetails(result);
        console.log('✅ Supabase connection successful:', result);
      } else {
        setStatus('❌ Supabase Connection Failed');
        setDetails(result);
        console.error('❌ Supabase connection failed:', result);
      }
    } catch (error: any) {
      setStatus('❌ Connection Error');
      setDetails({ error: error.message });
      console.error('❌ Supabase test error:', error);
    } finally {
      setLoading(false);
    }
  };

  const testQuery = async () => {
    setQueryResult('Loading...');
    try {
      console.log('🔍 Testing Supabase query...');
      
      // Simple query to test database access
      const { data, error, count } = await supabase
        .from('automations')
        .select('id', { count: 'exact', head: true });
      
      if (error) {
        setQueryResult(`❌ Query Error: ${error.message}`);
        console.error('❌ Query error:', error);
      } else {
        setQueryResult(`✅ Query Success! Automation count: ${count || 0}`);
        console.log('✅ Query successful, count:', count);
      }
    } catch (error: any) {
      setQueryResult(`❌ Error: ${error.message}`);
      console.error('❌ Query exception:', error);
    }
  };

  const testAuth = async () => {
    try {
      console.log('🔍 Testing Supabase auth...');
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        setQueryResult(`❌ Auth Error: ${error.message}`);
      } else if (session) {
        setQueryResult(`✅ Authenticated as: ${session.user.email}`);
      } else {
        setQueryResult('⚠️ Not authenticated');
      }
    } catch (error: any) {
      setQueryResult(`❌ Auth Error: ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Supabase Connection Test</Text>
      
      {loading ? (
        <ActivityIndicator size="small" color="#6200ee" />
      ) : (
        <>
          <Text style={styles.status}>{status}</Text>
          
          {details && (
            <View style={styles.details}>
              <Text style={styles.label}>Connection Details:</Text>
              <Text style={styles.value}>
                Network: {details.networkStatus ? 'Online' : 'Offline'}
              </Text>
              <Text style={styles.value}>
                Authenticated: {details.authenticated ? 'Yes' : 'No'}
              </Text>
              {details.user && (
                <Text style={styles.value}>User: {details.user}</Text>
              )}
              {details.error && (
                <Text style={styles.error}>Error: {details.error}</Text>
              )}
            </View>
          )}
          
          <View style={styles.buttons}>
            <Button title="Test Query" onPress={testQuery} />
            <View style={styles.buttonSpacer} />
            <Button title="Test Auth" onPress={testAuth} />
            <View style={styles.buttonSpacer} />
            <Button title="Retry Connection" onPress={checkConnection} />
          </View>
          
          {queryResult !== '' && (
            <Text style={styles.queryResult}>{queryResult}</Text>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    padding: 20,
    margin: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  status: {
    fontSize: 16,
    marginBottom: 10,
  },
  details: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
    marginBottom: 10,
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  value: {
    marginLeft: 10,
    marginBottom: 3,
  },
  error: {
    color: 'red',
    marginLeft: 10,
  },
  buttons: {
    marginTop: 10,
  },
  buttonSpacer: {
    height: 10,
  },
  queryResult: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
});