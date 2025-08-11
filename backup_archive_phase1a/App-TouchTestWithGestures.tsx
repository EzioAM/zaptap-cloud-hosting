// MINIMAL TOUCH TEST WITH GestureHandlerRootView
// This version includes GestureHandlerRootView to test if it's the culprit

import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Pressable, 
  Button,
  Alert,
  SafeAreaView,
  ScrollView
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Test component WITH GestureHandlerRootView
const TouchTestWithGesturesApp = () => {
  console.log('🔄 TouchTestWithGesturesApp rendering WITH GestureHandlerRootView');

  const testNativeButton = () => {
    console.log('🎯 Native Button pressed! (with GestureHandler)');
    Alert.alert('Success', 'Native Button works with GestureHandler!');
  };

  const testTouchableOpacity = () => {
    console.log('🎯 TouchableOpacity pressed! (with GestureHandler)');
    Alert.alert('Success', 'TouchableOpacity works with GestureHandler!');
  };

  const testPressable = () => {
    console.log('🎯 Pressable pressed! (with GestureHandler)');
    Alert.alert('Success', 'Pressable works with GestureHandler!');
  };

  const testOnPress = (testName: string) => {
    console.log(`🎯 ${testName} pressed! (with GestureHandler)`);
    Alert.alert('Touch Test', `${testName} works with GestureHandler!`);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>iOS Touch Test (With GestureHandler)</Text>
          <Text style={styles.subtitle}>Testing with GestureHandlerRootView</Text>
          
          {/* Test 1: Native Button */}
          <View style={styles.testSection}>
            <Text style={styles.testLabel}>Test 1: Native Button</Text>
            <Button 
              title="Press Me (Native Button)" 
              onPress={testNativeButton}
              color="#007AFF"
            />
          </View>

          {/* Test 2: TouchableOpacity */}
          <View style={styles.testSection}>
            <Text style={styles.testLabel}>Test 2: TouchableOpacity</Text>
            <TouchableOpacity 
              style={styles.touchable}
              onPress={testTouchableOpacity}
              onPressIn={() => console.log('🎯 TouchableOpacity press in (with GestureHandler)')}
              onPressOut={() => console.log('🎯 TouchableOpacity press out (with GestureHandler)')}
            >
              <Text style={styles.touchableText}>TouchableOpacity Button</Text>
            </TouchableOpacity>
          </View>

          {/* Test 3: Pressable */}
          <View style={styles.testSection}>
            <Text style={styles.testLabel}>Test 3: Pressable</Text>
            <Pressable 
              style={({ pressed }) => [
                styles.touchable,
                { backgroundColor: pressed ? '#E0E0E0' : '#F0F0F0' }
              ]}
              onPress={testPressable}
              onPressIn={() => console.log('🎯 Pressable press in (with GestureHandler)')}
              onPressOut={() => console.log('🎯 Pressable press out (with GestureHandler)')}
            >
              <Text style={styles.touchableText}>Pressable Button</Text>
            </Pressable>
          </View>

          {/* Test 4: Large touch target */}
          <View style={styles.testSection}>
            <Text style={styles.testLabel}>Test 4: Large Touch Target</Text>
            <TouchableOpacity 
              style={styles.largeTouchable}
              onPress={() => testOnPress('Large Touch Target')}
              activeOpacity={0.7}
            >
              <Text style={styles.largeTouchableText}>Large Touch Area</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.instructions}>
            This version includes GestureHandlerRootView.{'\n'}
            Compare results with the version without it.{'\n'}
            Check console for detailed logging.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#000000',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666666',
  },
  testSection: {
    marginBottom: 25,
    padding: 15,
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  testLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333333',
  },
  touchable: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
  },
  touchableText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  largeTouchable: {
    backgroundColor: '#34C759',
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 80,
    justifyContent: 'center',
  },
  largeTouchableText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  instructions: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
    color: '#666666',
    lineHeight: 20,
  },
});

export default TouchTestWithGesturesApp;