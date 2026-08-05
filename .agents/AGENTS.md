# MEHNDIGO PROJECT RULES & BEHAVIOR CONSTRAINTS

## PERMANENT LOCKED RULE: AUTHENTICATION FLOW
The MehndiGo Login / Signup / OTP / Role authentication flow is **LOCKED and STABLE**.

### STRICT RULES:
1. **DO NOT MODIFY** `LoginScreen.js`, `RegisterScreen.js`, `OtpScreen.js`, `AuthContext.js`, `storage.js`, `RootNavigator.js` role routing, or backend authentication routes/services (`user.services.js` auth methods) unless the user explicitly requests changes to authentication.
2. **Role Mapping**:
   - Customer = `USER` -> Customer Stack / Dashboard
   - Artist = `ARTIST` -> Artist Stack / Dashboard
3. **Login Flow**:
   - Existing Email -> Send OTP -> Verify -> Save Session -> Route to Dashboard by DB Role.
   - Unknown/Unregistered Email -> Return 404 -> Auto-navigate to Sign Up screen with Email prefilled.
4. **Sign Up Flow**:
   - Collects Name, Email (prefilled), 10-digit Mobile Phone Number, Role (`CUSTOMER` / `ARTIST`).
   - Sends Registration OTP -> Verification -> Saves token + user + role -> Routes directly to correct Dashboard.
5. **No Post-Login Phone Popup**:
   - Customer Home screen MUST NOT show any `Phone Number Required` popup.
