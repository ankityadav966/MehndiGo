# Cash Payment Completion Flow

This rule enforces the strict two-step cash payment checkout flow for the MehndiGo platform to ensure security and prevent artists from unilaterally completing bookings without the customer's consent.

## Flow Requirements
The cash payment completion flow MUST follow this exact sequence and should NEVER be changed or bypassed:

1. **Step 1: Customer Initiates Cash Payment**
   - The customer MUST explicitly select "Pay Cash" in their app during the checkout phase.
   - This action updates the backend `detailed_status` strictly to `AWAITING_CASH_CONFIRMATION`.

2. **Step 2: Artist Confirms Receipt**
   - **Frontend Constraint:** In `CheckoutCard.jsx` (and any checkout action view), the artist's "Confirm Cash Received" button MUST be visible but strictly **disabled** (`disabled={loading || !isCashChosen}`) and styled with a disabled/grey appearance with copy such as *"Waiting for customer to select 'Pay Cash'"*. It must only be enabled (green) once the customer has chosen cash (`isCashChosen` / `AWAITING_CASH_CONFIRMATION`).
   - **Backend Constraint:** The backend API (`handleConfirmCashPayment` in `backend/src/index.js`) MUST strictly validate that `detailed_status` is `AWAITING_CASH_CONFIRMATION` before allowing the booking to be marked as `COMPLETED`. 

## Rationale
This prevents the artist from confirming cash collection unilaterally and ensures both parties interact with the system to verify the transaction. This was explicitly requested by the user and must remain locked down.
