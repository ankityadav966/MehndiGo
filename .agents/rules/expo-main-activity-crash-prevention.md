# Expo MainActivity Crash Prevention

When modifying or inspecting `MainActivity.kt` (or `MainActivity.java`) in an Expo project (especially ones using `expo-dev-client` and `react-native-screens`):

**DO NOT** use `super.onCreate(null)` inside the `onCreate` lifecycle method. This is a common instruction from `react-native-screens` that directly conflicts with `expo-dev-client` and will cause the application to crash on startup with the error: 
`java.lang.IllegalArgumentException: App react context shouldn't be created before`.

**ALWAYS** pass the `savedInstanceState` bundle down to the superclass:
```kotlin
super.onCreate(savedInstanceState)
```
