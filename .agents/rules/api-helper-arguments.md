# API Helper Argument Safety

When calling backend service helpers (e.g., from `src/services/*.js`), ensure argument structures exactly match the function signature, especially for functions taking polymorphic arguments.

## `createPaymentSession`
In `src/services/booking.js`, `createPaymentSession(payload, paymentMethodType)` must be called correctly:
- **DO NOT** pass `bookingId` as the first argument if you are passing a full data object.
- **DO** pass the entire payload object as the **first argument**:
  ```javascript
  // CORRECT:
  await createPaymentSession({
    bookingId: targetBookingId,
    checkoutData: checkoutData,
    amount: ...
  }, paymentMethodType);
  
  // INCORRECT (Causes nesting bug if targetBookingId is null):
  await createPaymentSession(targetBookingId, { ...payload });
  ```

## `typeof null` Edge Case
Be highly vigilant of JavaScript's `typeof null === "object"` behavior. When inspecting API payloads or helper functions, remember that passing `null` to a function expecting an `object` might trigger unexpected fallback logic if `!== null` checks are missing or if arguments are reversed.
