import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';

export const ReduxTestComponent = () => {
  const dispatch = useDispatch();
  
  // Test Redux selectors
  let reduxStatus = '❓ Testing...';
  let authState = null;
  let error = null;
  
  try {
    // Try to access auth state
    authState = useSelector((state: RootState) => state.auth);
    reduxStatus = '✅ Redux Connected';
    console.log('🔍 Redux auth state:', authState);
  } catch (err: any) {
    reduxStatus = '❌ Redux Error';
    error = err.message;
    console.error('❌ Redux selector error:', err);
  }
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Redux Store Test</Text>
      <Text style={styles.status}>{reduxStatus}</Text>
      
      {error && (
        <Text style={styles.error}>Error: {error}</Text>
      )}
      
      {authState && (
        <View style={styles.details}>
          <Text style={styles.label}>Auth State:</Text>
          <Text style={styles.value}>
            Authenticated: {authState.isAuthenticated ? 'Yes' : 'No'}
          </Text>
          <Text style={styles.value}>
            User: {authState.user?.email || 'Not logged in'}
          </Text>
          <Text style={styles.value}>
            Loading: {authState.loading ? 'Yes' : 'No'}
          </Text>
        </View>
      )}
      
      <Button 
        title="Test Dispatch" 
        onPress={() => {
          try {
            console.log('🔍 Testing Redux dispatch...');
            // This won't do anything visible but tests if dispatch works
            dispatch({ type: 'TEST_ACTION' });
            console.log('✅ Dispatch successful');
          } catch (err) {
            console.error('❌ Dispatch error:', err);
          }
        }}
      />
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
  error: {
    color: 'red',
    marginBottom: 10,
  },
  details: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  value: {
    marginLeft: 10,
    marginBottom: 3,
  },
});