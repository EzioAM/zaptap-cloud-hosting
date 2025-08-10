// Supabase Edge Function for generating WeatherKit JWT tokens
// Deploy with: supabase functions deploy weatherkit-jwt

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

// Base64URL encoding helper
function base64UrlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Manual JWT creation for ES256
async function createES256JWT(
  keyId: string,
  teamId: string,
  privateKeyPem: string
): Promise<string> {
  // Create the JWT header - Apple requires specific format
  const header = {
    alg: 'ES256',
    kid: keyId,
    id: `${teamId}.com.zaptap.app`, // TEAM_ID.BUNDLE_ID format required by Apple
    typ: 'JWT'
  };
  
  // Create the JWT payload - Apple WeatherKit specific
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: teamId,
    iat: now,
    exp: now + 3600, // 1 hour expiry
    sub: 'com.apple.weatherkit.authservice'
  };
  
  // Encode header and payload
  const encodedHeader = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(header))
  );
  const encodedPayload = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(payload))
  );
  
  const message = `${encodedHeader}.${encodedPayload}`;
  
  try {
    // Clean the private key
    const pemContents = privateKeyPem
      .replace(/-----BEGIN PRIVATE KEY-----/g, '')
      .replace(/-----END PRIVATE KEY-----/g, '')
      .replace(/\s/g, '');
    
    // Decode the base64 PEM to get the DER-encoded key
    const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
    
    // Import the key
    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryDer,
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      false,
      ['sign']
    );
    
    // Sign the message
    const signature = await crypto.subtle.sign(
      {
        name: 'ECDSA',
        hash: 'SHA-256',
      },
      privateKey,
      new TextEncoder().encode(message)
    );
    
    // Convert signature to raw format (r || s)
    const sig = new Uint8Array(signature);
    
    // ES256 signature is 64 bytes (32 bytes for r, 32 bytes for s)
    // The signature from WebCrypto is already in the correct format
    const encodedSignature = base64UrlEncode(sig);
    
    return `${message}.${encodedSignature}`;
  } catch (error) {
    console.error('Error in JWT creation:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get configuration from environment variables
    const WEATHERKIT_KEY_ID = Deno.env.get('WEATHERKIT_KEY_ID')
    const WEATHERKIT_TEAM_ID = Deno.env.get('WEATHERKIT_TEAM_ID')
    const WEATHERKIT_PRIVATE_KEY = Deno.env.get('WEATHERKIT_PRIVATE_KEY')
    const WEATHERKIT_BUNDLE_ID = Deno.env.get('WEATHERKIT_BUNDLE_ID')

    if (!WEATHERKIT_KEY_ID || !WEATHERKIT_TEAM_ID || !WEATHERKIT_PRIVATE_KEY || !WEATHERKIT_BUNDLE_ID) {
      console.error('Missing configuration:', {
        hasKeyId: !!WEATHERKIT_KEY_ID,
        hasTeamId: !!WEATHERKIT_TEAM_ID,
        hasPrivateKey: !!WEATHERKIT_PRIVATE_KEY,
        hasBundleId: !!WEATHERKIT_BUNDLE_ID
      });
      throw new Error('Missing required WeatherKit configuration')
    }

    // Generate the JWT token with simplified header
    const jwt = await createES256JWT(
      WEATHERKIT_KEY_ID,
      WEATHERKIT_TEAM_ID,
      WEATHERKIT_PRIVATE_KEY
    );
    
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 3600; // 1 hour

    // Log token generation for debugging
    console.log('JWT token generated successfully', {
      keyId: WEATHERKIT_KEY_ID,
      teamId: WEATHERKIT_TEAM_ID,
      bundleId: WEATHERKIT_BUNDLE_ID,
      tokenLength: jwt.length
    });

    // Return the JWT token
    return new Response(
      JSON.stringify({ 
        token: jwt,
        expiresIn: expiresIn,
        expiresAt: new Date((now + expiresIn) * 1000).toISOString()
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    )
  } catch (error) {
    console.error('Error generating WeatherKit JWT:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate WeatherKit JWT',
        message: error.message,
        details: error.stack
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    )
  }
})