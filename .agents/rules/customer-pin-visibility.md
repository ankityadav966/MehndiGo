# Customer PIN Visibility

**NEVER display the raw 4-digit Check-In or Completion PIN on the customer-facing app UI.**

- When implementing or modifying OTP/PIN verification screens (like `OtpVerificationCard.jsx`), ensure the customer view only instructs the user to "Check your email for the OTP".
- Do not render visual PIN tiles or cards (e.g., `pinDisplayCardGreen`, `pinDisplayCardPurple`) that expose the PIN digits to the customer directly within the app.
- The Artist view, however, is allowed to have an input field where they enter the PIN provided by the customer.
