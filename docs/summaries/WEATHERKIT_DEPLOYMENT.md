# WeatherKit Production Deployment Guide

## 🚀 Complete Setup Steps

### 1. Deploy Supabase Edge Function

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref <your-project-ref>

# Deploy the WeatherKit JWT function
supabase functions deploy weatherkit-jwt
```

### 2. Set Environment Variables in Supabase Dashboard

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Edge Functions** → **weatherkit-jwt** → **Manage secrets**
4. Add the following secrets:

```
WEATHERKIT_KEY_ID=4M5352QQMM
WEATHERKIT_TEAM_ID=QH729XYMW4
WEATHERKIT_BUNDLE_ID=com.zaptap.app
WEATHERKIT_PRIVATE_KEY=<paste your entire .p8 file contents here>
```

**Important**: For `WEATHERKIT_PRIVATE_KEY`, include the entire content of your `.p8` file, including:
```
-----BEGIN PRIVATE KEY-----
<your key content>
-----END PRIVATE KEY-----
```

### 3. Test the Edge Function

```bash
# Get your project URL and anon key from Supabase dashboard
curl -X POST https://<your-project-ref>.supabase.co/functions/v1/weatherkit-jwt \
  -H "Authorization: Bearer <your-anon-key>" \
  -H "Content-Type: application/json" \
  -d '{"duration": 3600}'
```

You should receive a response like:
```json
{
  "token": "eyJ...",
  "expiresIn": 3600,
  "expiresAt": "2024-01-10T12:00:00.000Z"
}
```

### 4. Update Your App Configuration

Ensure your `.env` file has the correct Supabase configuration:
```
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
```

### 5. Build and Test

```bash
# Clean build
cd ios
rm -rf build
pod install
cd ..

# Run the app
npm run ios
```

## 🔍 Verification Checklist

- [ ] Edge function deployed successfully
- [ ] Environment variables set in Supabase
- [ ] Edge function returns JWT token when tested
- [ ] App successfully fetches JWT from Edge function
- [ ] WeatherKit shows real weather data on iOS 16+ devices
- [ ] Fallback to simulated weather works on older devices

## 🛡️ Security Best Practices

1. **Never commit private keys** - The `.p8` file and `WeatherKitConfig.swift` should never be in version control
2. **Use server-side JWT** - Always generate JWT tokens server-side in production
3. **Rotate keys regularly** - Apple allows multiple WeatherKit keys
4. **Monitor usage** - Check your WeatherKit usage in Apple Developer dashboard
5. **Rate limiting** - Consider adding rate limiting to your Edge function

## 📊 Monitoring

### Check WeatherKit Usage
1. Go to [Apple Developer](https://developer.apple.com)
2. Navigate to **Services** → **WeatherKit**
3. View your usage dashboard

### Check Edge Function Logs
```bash
supabase functions logs weatherkit-jwt
```

### Debug in Xcode
1. Open Xcode console
2. Filter for "WeatherKit" to see all related logs
3. Check for JWT token fetching and weather data requests

## 🚨 Troubleshooting

### "Failed to fetch JWT token"
- Check Supabase Edge function is deployed
- Verify environment variables are set
- Check network connectivity

### "WeatherKit not available"
- Ensure iOS 16+ device
- Check WeatherKit entitlement in app
- Verify App ID has WeatherKit enabled

### "Authentication failed"
- Verify private key is correct
- Check Key ID matches
- Ensure Team ID is correct
- Verify bundle ID matches app

## 📱 Testing on Device

For best results, test on a real iOS 16+ device:
1. Build to device (not simulator)
2. Allow location permissions
3. Check weather data updates
4. Verify animations work smoothly

## ✅ Success Indicators

When everything is working correctly:
- Weather data shows real conditions
- Location-based weather updates
- Smooth weather animations
- JWT tokens refresh automatically
- No authentication errors in logs