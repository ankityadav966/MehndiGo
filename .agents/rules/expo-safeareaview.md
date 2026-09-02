# SafeAreaView in Expo/React Native

When implementing or modifying screens that require safe area padding (to avoid notches and status bars):

1. **NEVER** import `SafeAreaView` from `react-native`. It is deprecated and causes warnings.
2. **ALWAYS** import `SafeAreaView` from `react-native-safe-area-context`.
3. **MANDATORY PROP**: Always explicitly provide the `edges` prop (e.g., `edges={["top"]}` or `edges={["top", "bottom"]}`) to ensure the top padding is correctly applied on Android devices, as it often fails to automatically pad the status bar without it.
