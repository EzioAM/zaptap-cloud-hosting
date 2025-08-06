import AsyncStorage from '@react-native-async-storage/async-storage';

// Test script to verify session persistence
async function testSessionPersistence() {
  console.log('🔍 Testing session persistence...\n');
  
  try {
    // Check if session is stored in AsyncStorage
    const sessionKey = 'supabase.auth.token';
    const sessionData = await AsyncStorage.getItem(sessionKey);
    
    if (sessionData) {
      console.log('✅ Session found in AsyncStorage!');
      
      // Parse and display basic session info
      const session = JSON.parse(sessionData);
      console.log('\n📊 Session details:');
      console.log('- Has access token:', !!session.currentSession?.access_token);
      console.log('- Has refresh token:', !!session.currentSession?.refresh_token);
      console.log('- Has user ID:', !!session.currentSession?.user?.id);
      console.log('- User email:', session.currentSession?.user?.email || 'N/A');
      
      // Check token expiry
      if (session.currentSession?.expires_at) {
        const expiresAt = new Date(session.currentSession.expires_at * 1000);
        const now = new Date();
        const isExpired = expiresAt < now;
        
        console.log('\n⏰ Token status:');
        console.log('- Expires at:', expiresAt.toLocaleString());
        console.log('- Current time:', now.toLocaleString());
        console.log('- Is expired:', isExpired);
        
        if (isExpired) {
          console.log('\n⚠️  Token is expired - AuthInitializer should refresh it on app startup');
        } else {
          console.log('\n✅ Token is still valid');
        }
      }
      
      // List all AsyncStorage keys to see what's stored
      console.log('\n📦 All AsyncStorage keys:');
      const allKeys = await AsyncStorage.getAllKeys();
      allKeys.forEach(key => {
        console.log(`- ${key}`);
      });
      
    } else {
      console.log('❌ No session found in AsyncStorage');
      console.log('   User needs to sign in first');
      
      // Still list all keys to debug
      console.log('\n📦 All AsyncStorage keys:');
      const allKeys = await AsyncStorage.getAllKeys();
      if (allKeys.length === 0) {
        console.log('   (AsyncStorage is empty)');
      } else {
        allKeys.forEach(key => {
          console.log(`- ${key}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing session persistence:', error);
  }
}

// Run the test
testSessionPersistence();