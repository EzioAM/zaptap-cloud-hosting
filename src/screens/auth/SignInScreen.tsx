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
  import { signIn, resetPassword } from '../../store/slices/authSlice';
  import { RootState, AppDispatch } from '../../store';

  interface SignInScreenProps {
    navigation: any;
  }

  const SignInScreen: React.FC<SignInScreenProps> = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const dispatch = useDispatch<AppDispatch>();
    const { isLoading, error } = useSelector((state: RootState) => state.auth);

    const handleSignIn = async () => {
      if (!email || !password) {
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }

      try {
        await dispatch(signIn({ email: email.trim(), password })).unwrap();
        // Navigation will be handled by auth state change
      } catch (error: any) {
        console.error('Sign in error:', error);
        Alert.alert('Sign In Failed', error.message || 'Invalid email or password');
      }
    };

    const handleForgotPassword = async () => {
      if (!email) {
        Alert.alert('Error', 'Please enter your email address first');
        return;
      }

      try {
        await dispatch(resetPassword({ email: email.trim() })).unwrap();
        Alert.alert(
          'Password Reset Email Sent', 
          `Check your email (${email}) for instructions to reset your password.`
        );
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to send reset email');
      }
    };

    return (
      <View style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.title}>Sign In</Text>

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

            {error && (
              <Text style={styles.error}>{error}</Text>
            )}

            <Button
              mode="contained"
              onPress={handleSignIn}
              disabled={isLoading}
              style={styles.button}
            >
              {isLoading ? <ActivityIndicator color="white" /> : 'Sign In'}
            </Button>

            <Button
              mode="text"
              onPress={handleForgotPassword}
              style={styles.linkButton}
            >
              Forgot Password?
            </Button>

            <Button
              mode="text"
              onPress={() => navigation.navigate('SignUp')}
              style={styles.linkButton}
            >
              Don't have an account? Sign Up
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

  export default SignInScreen;