# Supabase Auth Configuration Fix Guide

This guide addresses the remaining Auth configuration warnings:
1. **OTP expiry too long** (currently > 1 hour)
2. **Leaked password protection disabled**

## Auth Configuration Fixes

These settings must be changed in the Supabase Dashboard as they are project-level configurations.

### 1. Fix OTP Long Expiry

**Current Issue**: OTP (One-Time Password) expiry is set to more than 1 hour, which is a security risk.

**To Fix**:
1. Go to your Supabase Dashboard: https://app.supabase.com
2. Navigate to **Authentication** → **Providers**
3. Click on **Email** provider settings
4. Find **OTP Expiry** setting
5. Change from current value to **3600** (1 hour) or less
6. Recommended: Set to **900** (15 minutes) for better security
7. Click **Save**

### 2. Enable Leaked Password Protection

**Current Issue**: Password checking against HaveIBeenPwned database is disabled.

**To Fix**:
1. Go to your Supabase Dashboard: https://app.supabase.com
2. Navigate to **Authentication** → **Settings**
3. Scroll to **Security and Protection**
4. Find **Leaked Password Protection**
5. Toggle **ON** the switch for "Prevent users from using leaked passwords"
6. Click **Save**

### 3. Additional Security Recommendations

While you're in the Auth settings, also consider:

1. **Enable Email Confirmations**:
   - Authentication → Settings → Email Auth
   - Toggle ON "Confirm email"

2. **Set Strong Password Requirements**:
   - Authentication → Settings → Security and Protection
   - Set minimum password length to 8+ characters
   - Enable "Require at least one uppercase letter"
   - Enable "Require at least one number"

3. **Enable Rate Limiting**:
   - Authentication → Settings → Security and Protection
   - Enable rate limiting for sign-ups and sign-ins

4. **Configure Session Length**:
   - Authentication → Settings → JWT
   - Set appropriate JWT expiry (default is 1 hour)

## Verification

After making these changes:

1. The Supabase Linter should no longer show these warnings
2. Test sign-up with a weak/leaked password - it should be rejected
3. Test OTP flow - codes should expire within your set timeframe

## Security Impact

These changes improve security by:
- Reducing the window for OTP attacks
- Preventing users from using compromised passwords
- Protecting user accounts from known breaches

## Notes

- These are dashboard-only settings and don't require code changes
- Changes take effect immediately
- Existing sessions are not affected
- New sign-ups/sign-ins will use the new settings