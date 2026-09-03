# Direct Firebase Cloud Messaging (FCM v1) & Push Notification Guidelines

## 1. Native Firebase Push Over Expo Push
- **No Reliance on Expo Push Service for Standalone APKs**:
  All production Android builds created via the `android/` directory (e.g. `gradlew assembleRelease` or `gradlew bundleRelease`) must use direct Firebase Cloud Messaging (FCM HTTP v1 API).
- **Service Account Credentials**:
  FCM push messages are dispatched directly to:
  `https://fcm.googleapis.com/v1/projects/mehndigo-87331/messages:send`
  via `backend/src/fcm_v1_service.js`, signed via Web Crypto RS256 OAuth2 tokens without any third-party external push server.

## 2. Mobile Client Token Generation
- In `mobile/src/services/notification.js`, prioritize `Notifications.getDevicePushTokenAsync()` to obtain the native FCM registration token.
- Only fallback to `Notifications.getExpoPushTokenAsync()` if running inside the Expo Go container.

## 3. Native Android Permissions
- `mobile/android/app/src/main/AndroidManifest.xml` and `mobile/app.json` must always include:
  `<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>`
  for Android 13+ support.

## 4. Backend Routing & Database Integrity
- `push_tokens` table must include `is_active` (INTEGER DEFAULT 1).
- `users` table must include `push_token` (TEXT).
- In `backend/src/notification_service.js`, route tokens starting with `ExponentPushToken` to Expo Push API, and all other tokens (native FCM) to `sendBatchFcmNotifications`.
