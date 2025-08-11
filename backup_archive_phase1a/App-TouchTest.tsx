// MINIMAL TOUCH TEST VERSION - Bypasses all complex providers and components
// This is a diagnostic version to test if touches work at all in iOS simulator

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

// Test component without ANY external providers or gesture handlers
const TouchTestApp = () => {
  console.log('🔄 TouchTestApp rendering');

  const testNativeButton = () => {
    console.log('🎯 Native Button pressed!');
    Alert.alert('Success', 'Native Button works!');
  };

  const testTouchableOpacity = () => {
    console.log('🎯 TouchableOpacity pressed!');
    Alert.alert('Success', 'TouchableOpacity works!');
  };

  const testPressable = () => {
    console.log('🎯 Pressable pressed!');
    Alert.alert('Success', 'Pressable works!');
  };

  const testOnPress = (testName: string) => {
    console.log(`🎯 ${testName} pressed!`);
    Alert.alert('Touch Test', `${testName} works!`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>iOS Touch Test</Text>
        <Text style={styles.subtitle}>Testing different touch components</Text>
        
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
            onPressIn={() => console.log('🎯 TouchableOpacity press in')}
            onPressOut={() => console.log('🎯 TouchableOpacity press out')}
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
            onPressIn={() => console.log('🎯 Pressable press in')}
            onPressOut={() => console.log('🎯 Pressable press out')}
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

        {/* Test 5: Multiple small buttons */}
        <View style={styles.testSection}>
          <Text style={styles.testLabel}>Test 5: Multiple Small Buttons</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.smallButton}
              onPress={() => testOnPress('Small Button 1')}
            >
              <Text style={styles.smallButtonText}>1</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.smallButton}
              onPress={() => testOnPress('Small Button 2')}
            >
              <Text style={styles.smallButtonText}>2</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.smallButton}
              onPress={() => testOnPress('Small Button 3')}
            >
              <Text style={styles.smallButtonText}>3</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Test 6: View with onTouchStart */}
        <View style={styles.testSection}>
          <Text style={styles.testLabel}>Test 6: View with Touch Events</Text>
          <View 
            style={styles.touchView}
            onTouchStart={(event) => {
              console.log('🎯 onTouchStart triggered at:', event.nativeEvent.locationX, event.nativeEvent.locationY);
              Alert.alert('Touch Event', 'onTouchStart works!');
            }}
            onTouchEnd={(event) => {
              console.log('🎯 onTouchEnd triggered');
            }}
          >
            <Text style={styles.touchViewText}>Touch this View</Text>
          </View>
        </View>

        {/* Test 7: Responder System */}
        <View style={styles.testSection}>
          <Text style={styles.testLabel}>Test 7: Responder System</Text>
          <View 
            style={styles.responderView}
            onStartShouldSetResponder={() => {
              console.log('🎯 onStartShouldSetResponder called');
              return true;
            }}
            onResponderGrant={() => {
              console.log('🎯 onResponderGrant called');
              Alert.alert('Responder', 'Responder system works!');
            }}
            onResponderMove={(event) => {
              console.log('🎯 onResponderMove:', event.nativeEvent.locationX, event.nativeEvent.locationY);
            }}
            onResponderRelease={() => {
              console.log('🎯 onResponderRelease called');
            }}
          >
            <Text style={styles.responderText}>Touch & Drag Here</Text>
          </View>
        </View>

        <Text style={styles.instructions}>
          Tap each test component above.{'\n'}
          Check the console for log messages.{'\n'}
          Successful tests will show alerts.
        </Text>
      </ScrollView>
    </SafeAreaView>
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
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  smallButton: {
    backgroundColor: '#FF9500',
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  touchView: {
    backgroundColor: '#FF3B30',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 60,
    justifyContent: 'center',
  },
  touchViewText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  responderView: {
    backgroundColor: '#AF52DE',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 80,
    justifyContent: 'center',
  },
  responderText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  instructions: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
    color: '#666666',
    lineHeight: 20,
  },
});

export default TouchTestApp;