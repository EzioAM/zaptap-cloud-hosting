# WeatherKit JWT Edge Function Setup

## 1. Set Environment Variables in Supabase Dashboard

Go to your Supabase project dashboard → Edge Functions → Manage secrets and add:

```bash
WEATHERKIT_KEY_ID=4M5352QQMM
WEATHERKIT_TEAM_ID=QH729XYMW4
WEATHERKIT_BUNDLE_ID=com.zaptap.app
WEATHERKIT_PRIVATE_KEY=<your_p8_key_contents>
```

For the `WEATHERKIT_PRIVATE_KEY`, copy the entire contents of your `.p8` file including the BEGIN/END lines.

## 2. Deploy the Edge Function

```bash
# Login to Supabase CLI
supabase login

# Link to your project
supabase link --project-ref <your-project-ref>

# Deploy the function
supabase functions deploy weatherkit-jwt

# Set the secrets (alternative to dashboard)
supabase secrets set WEATHERKIT_KEY_ID=4M5352QQMM
supabase secrets set WEATHERKIT_TEAM_ID=QH729XYMW4
supabase secrets set WEATHERKIT_BUNDLE_ID=com.zaptap.app
supabase secrets set --env-file .env.weatherkit
```

## 3. Create .env.weatherkit file (for the private key)

Create a file `.env.weatherkit` with:

```
WEATHERKIT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
<your key content here>
-----END PRIVATE KEY-----"
```

## 4. Test the Function

```bash
# Test locally
supabase functions serve weatherkit-jwt

# Test deployed function
curl -X GET https://<your-project-ref>.supabase.co/functions/v1/weatherkit-jwt \
  -H "Authorization: Bearer <your-anon-key>"
```

## 5. Function URL

Your function will be available at:
```
https://<your-project-ref>.supabase.co/functions/v1/weatherkit-jwt
```