# MehandiGo — Production Setup Guide

## 1. Firebase Project Setup

### Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project: `mehendigoo`
3. Register Android app: `com.mehendigoo.app`
4. Register iOS app: `com.mehendigoo.app`
5. Register Web app: `mehendigoo-web`

### Android Setup
1. Download `google-services.json` → place in project root
2. Generate SHA-1 and SHA-256:
   ```bash
   cd android
   ./gradlew signingReport
   ```
3. Add SHA fingerprints in Firebase Console → Project Settings → Android app
4. Enable Google Sign-In in Firebase Console → Authentication → Sign-in methods

### iOS Setup
1. Download `GoogleService-Info.plist` → place in project root
2. Enable Google Sign-In in Firebase Console
3. Add `REVERSED_CLIENT_ID` from `GoogleService-Info.plist` to `app.json` → `ios.infoPlist`

### Enable Firebase Services
- **Authentication**: Enable Google, Email/Password, Phone
- **Cloud Messaging**: For push notifications
- **Firestore** (optional): For real-time data if needed

## 2. Expo / EAS Setup

### Install EAS CLI
```bash
npm install -g eas-cli
eas login
```

### Configure EAS Build
```bash
eas build:configure
```

### Create `eas.json`
```json
{
  "cli": {
    "version": ">= 10.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development",
      "env": {
        "EXPO_PUBLIC_API_URL": "https://dev-api.mehendigoo.com/v1"
      }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://staging-api.mehendigoo.com/v1"
      }
    },
    "production": {
      "channel": "production",
      "android": {
        "buildType": "app-bundle"
      },
      "ios": {
        "autoIncrement": true
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.mehendigoo.com/v1"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./path/to/service-account.json",
        "track": "production"
      },
      "ios": {
        "appleId": "your@apple.com",
        "ascAppId": "your_app_store_id",
        "appleTeamId": "your_team_id"
      }
    }
  }
}
```

### Build Commands
```bash
# Development build
eas build --platform android --profile development
eas build --platform ios --profile development

# Production build
eas build --platform android --profile production
eas build --platform ios --profile production

# Submit to stores
eas submit --platform android --profile production
eas submit --platform ios --profile production
```

## 3. Environment Variables

Copy `.env.template` to `.env` and fill in values:
```bash
cp .env.template .env
```

All `EXPO_PUBLIC_*` variables are exposed to the client. NEVER store secrets in these.

## 4. Deep Linking

### iOS
- Configure `associatedDomains` in app.json: `applinks:mehendigoo.com`
- Add Apple App Site Association file to `https://mehendigoo.com/.well-known/apple-app-site-association`

### Android
- Configure `intentFilters` in app.json (already done)
- Add Digital Asset Links file to `https://mehendigoo.com/.well-known/assetlinks.json`

## 5. Push Notifications

### Backend Setup
1. Get Firebase Server Key from: Firebase Console → Project Settings → Cloud Messaging
2. Expo Push API is used client-side; server can also send via Expo Push API or FCM
3. For Expo Push API: `https://exp.host/--/api/v2/push/send`

### Testing Push Notifications
```bash
curl -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_EXPO_ACCESS_TOKEN" \
     -X POST https://exp.host/--/api/v2/push/send \
     -d '{
       "to": "ExponentPushToken[xxx]",
       "title": "Test",
       "body": "Hello from MehandiGo!",
       "data": { "type": "booking", "event": "test" }
     }'
```

## 6. Security Checklist

- [ ] Firebase Auth configured with secure rules
- [ ] MMKV encrypted storage enabled
- [ ] API uses HTTPS (already enforced via `usesCleartextTraffic: false`)
- [ ] JWT tokens stored in encrypted MMKV
- [ ] ProGuard enabled for Android release builds
- [ ] iOS App Transport Security configured for API domain only
- [ ] `.env` file added to `.gitignore`
- [ ] Google Firebase API key restricted to Android/iOS/Web apps
- [ ] Notification permission request with clear messaging
- [ ] Deep link URLs validated before navigation
- [ ] All API responses validated before rendering

## 7. Production Launch Checklist

- [ ] Firebase project in production mode (not Blaze? ensure billing)
- [ ] EAS project configured and linked
- [ ] Android keystore generated and backed up
- [ ] iOS certificates and provisioning profiles created
- [ ] App Store Connect / Google Play Console entries created
- [ ] Privacy policy URL (required for App Store + Google Play)
- [ ] App icon and splash screen assets finalized
- [ ] Screenshots for all device sizes
- [ ] App description, keywords, and category set
- [ ] TestFlight / Internal Testing track set up
- [ ] Deep links verified on real devices
- [ ] Push notifications tested on real devices
- [ ] Offline states handled gracefully
- [ ] Analytics and crash reporting configured
- [ ] Rate limiting implemented on backend
- [ ] API pagination verified
- [ ] Accessibility labels added to all interactive elements
