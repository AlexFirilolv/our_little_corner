# Firebase Google Authentication Setup Guide

## Issue: Google Sign-In returns "Firebase: Error (auth/internal-error)"

This error typically occurs when Google Sign-In is not properly configured in the Firebase console. Follow these steps to resolve:

## Required Firebase Console Configuration

### 1. Enable Google Sign-In Provider
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Authentication** → **Sign-in method**
4. Find **Google** in the provider list
5. Click **Enable** if not already enabled
6. Configure the following:
   - **Project support email**: Use a valid email address
   - **Authorized domains**: Add your domain(s):
     - `localhost` (for development)
     - Your production domain (e.g., `yourdomain.com`)

### 2. Configure OAuth 2.0 Client IDs
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select the same project as your Firebase project
3. Navigate to **APIs & Services** → **Credentials**
4. Find the Web client created by Firebase (usually named "Web client (auto created by Google Service)")
5. Click to edit the OAuth 2.0 Client ID
6. Add authorized JavaScript origins:
   - `http://localhost:3000` (for development)
   - `https://yourdomain.com` (for production)
7. Add authorized redirect URIs:
   - `http://localhost:3000/__/auth/handler` (for development)
   - `https://yourdomain.com/__/auth/handler` (for production)

### 3. Verify Firebase Configuration
Ensure your `.env` file contains the correct Firebase configuration:

```env
# These should match your Firebase project
NEXT_PUBLIC_FIREBASE_API_KEY=your_actual_api_key_from_firebase
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-actual-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_actual_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_actual_app_id
```

### 4. Check Domain Authorization
1. In Firebase Console → Authentication → Settings → Authorized domains
2. Ensure the following domains are listed:
   - `localhost`
   - Your production domain
   - Any additional domains you use for testing

### 5. Additional Troubleshooting Steps

#### Check Browser Console
1. Open browser developer tools
2. Look for specific error messages in the Console tab
3. Common specific errors:
   - `auth/unauthorized-domain`: Domain not authorized in Firebase
   - `auth/configuration-not-found`: OAuth configuration missing
   - `auth/invalid-api-key`: API key invalid or not configured for web

#### Verify Project Linking
1. Ensure Firebase project and Google Cloud project are the same
2. Check that the project ID in your config matches the actual project

#### Test in Incognito Mode
- Sometimes browser cache/cookies can interfere
- Test Google Sign-In in an incognito/private window

## Common Solutions

### Solution 1: Domain Authorization Issue
If the error persists, add these domains to Firebase authorized domains:
- `localhost` (without protocol)
- `127.0.0.1` (alternative localhost)

### Solution 2: OAuth Client Configuration
In Google Cloud Console, ensure the OAuth client has:
- Correct authorized JavaScript origins
- Correct authorized redirect URIs
- Application type set to "Web application"

### Solution 3: API Key Restrictions
In Google Cloud Console → APIs & Services → Credentials:
1. Find your API key
2. Ensure it's not restricted to exclude the Identity Toolkit API
3. If restricted, add "Identity Toolkit API" to allowed APIs

## Testing the Fix

After making the above changes:
1. Wait 5-10 minutes for configuration to propagate
2. Clear browser cache and cookies
3. Restart your application
4. Try Google Sign-In again

## Still Having Issues?

If the problem persists:
1. Check Firebase project quota and billing status
2. Verify the Firebase project is not suspended
3. Test with a fresh Firebase project to isolate the issue
4. Contact Firebase support if all configurations appear correct

## Security Note

Never commit your actual Firebase configuration to version control. Use environment variables and keep your Firebase private key secure.