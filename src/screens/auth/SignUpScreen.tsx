import React, { useState } from 'react';
  import {
    View,
    StyleSheet,
    Alert,
  } from 'react-native';
  import {
    Text,
    TextInput,
    Button,
    Card,
    ActivityIndicator,
  } from 'react-native-paper';
  import { useDispatch, useSelector } from 'react-redux';
  import { signUp } from '../../store/slices/authSlice';
  import { RootState, AppDispatch } from '../../store';

  interface SignUpScreenProps {
    navigation: any;
  }

  const SignUpScreen: React.FC<SignUpScreenProps> = ({ navigation }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const dispatch = useDispatch<AppDispatch>();
    const { isLoading, error } = useSelector((state: RootState) => state.auth);

    const handleSignUp = async () => {
      if (!name || !email || !password) {
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }

      if (password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }

      if (password.length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters');
        return;
      }

      try {
        await dispatch(signUp({ email, password, name })).unwrap();
        Alert.alert('Success', 'Account created successfully!', [
          { text: 'OK', onPress: () => navigation.navigate('Home') }
        ]);
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Sign up failed');
      }
    };

    return (
      <View style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.title}>Create Account</Text>

            <TextInput
              label="Full Name"
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={styles.input}
              autoCapitalize="words"
            />

            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              style={styles.input}
              secureTextEntry
            />

            <TextInput
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              mode="outlined"
              style={styles.input}
              secureTextEntry
            />

            {error && (
              <Text style={styles.error}>{error}</Text>
            )}

            <Button
              mode="contained"
              onPress={handleSignUp}
              disabled={isLoading}
              style={styles.button}
            >
              {isLoading ? <ActivityIndicator color="white" /> : 'Sign Up'}
            </Button>

            <Button
              mode="text"
              onPress={() => navigation.navigate('SignIn')}
              style={styles.linkButton}
            >
              Already have an account? Sign In
            </Button>
          </Card.Content>
        </Card>
      </View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      padding: 20,
      backgroundColor: '#f5f5f5',
    },
    card: {
      padding: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 30,
    },
    input: {
      marginBottom: 15,
    },
    button: {
      marginTop: 10,
      marginBottom: 10,
    },
    linkButton: {
      marginTop: 10,
    },
    error: {
      color: 'red',
      textAlign: 'center',
      marginBottom: 10,
    },
  });

  export default SignUpScreen;