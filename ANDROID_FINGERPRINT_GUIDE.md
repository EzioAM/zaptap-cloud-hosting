# Getting Android SHA256 Fingerprint

## Method 1: From Debug Keystore (Most Common)

If you've built your app for Android before, you can get the debug fingerprint:

```bash
# Check if debug keystore exists
ls ~/.android/debug.keystore

# If it exists, get the fingerprint:
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep SHA256
```

## Method 2: Generate Debug Keystore (If Missing)

If the debug keystore doesn't exist, generate it:

```bash
# Create the directory if it doesn't exist
mkdir -p ~/.android

# Generate debug keystore
keytool -genkey -v -keystore ~/.android/debug.keystore -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 -storepass android -keypass android -dname "CN=Android Debug, O=Android, C=US"

# Then get the fingerprint
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep SHA256
```

## Method 3: From EAS Build

Since you're using EAS, you can get the fingerprint from your build:

```bash
# First, create a debug build
eas build --platform android --profile development

# Then get the fingerprint from EAS
eas credentials
```

## Method 4: For Production/Release

For production builds, you'll need a release keystore:

```bash
# Generate release keystore (save this securely!)
keytool -genkey -v -keystore zaptap-release.keystore -alias zaptap -keyalg RSA -keysize 2048 -validity 25000

# Get release fingerprint
keytool -list -v -keystore zaptap-release.keystore -alias zaptap
```

## Next Steps:

1. Get your SHA256 fingerprint using one of the methods above
2. Replace `REPLACE_WITH_YOUR_SHA256_FINGERPRINT` in `assetlinks.json` with your fingerprint
3. The fingerprint should look like: `AB:CD:EF:12:34:56:...` (remove the colons for the file)

## Example:
If your fingerprint is: `AB:CD:EF:12:34:56:78:90:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD`

Update assetlinks.json:
```json
"sha256_cert_fingerprints": ["ABCDEF1234567890123456789012ABCDEF1234567890ABCDEF1234567890ABCD"]
```