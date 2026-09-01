# MehndiGo Project Guidelines

## 1. Backend Deployment (Cloudflare Workers)
- **Deployment is Mandatory**: The backend runs as a Cloudflare Worker at api.mehndigo.in. When modifying backend API logic in index.js, you MUST run `npx wrangler deploy` in the backend directory.
- Local testing (npm start) only affects the local SQLite database.

## 2. Wallet Transactions and Ledger Logic
- **Tab Filtering**: When filtering for the Online ledger, explicitly exclude DEBIT, WITHDRAWAL, and payout types.
- **Cash Entries**: Always rely on the is_cash column to determine if a transaction is cash. When inserting new cash transactions, always insert the actual cash amount into the amount column, never hardcode 0.

## 3. Frontend UI and Data Integrity
- **Deduplicating Transactions**: The backend may return duplicate cash entries for the same booking. Always deduplicate using booking_id, booking_number, or id.
- **Legacy Zero-Amount Entries**: Older cash transactions stored the actual amount in the description string (e.g., Cash Collected in Hand for Booking #123 (1123.45)). Parse these using regex if amount is 0 and it is a cash transaction.
- **Preventing UI Overflow**: Use flexShrink: 1 and/or flexWrap: wrap for dynamic text inside rows to prevent overflow.

## 4. UI/UX and Flow Interactions
- **Avoid Redundant Confirmations**: Do not trigger Alert.alert popups on component mount when an inline action card already shows the action. Avoid wrapping inline button presses in secondary confirmation Alerts - this causes duplicate loading states.

## 5. Backend Status Overrides
- **Whitelist New Detailed Statuses**: API endpoints that fetch bookings must whitelist all required detailed statuses in Status Protection logic. For example, AWAITING_CASH_CONFIRMATION must be explicitly excluded from the block that forces SERVICE_IN_PROGRESS, otherwise the backend silently overwrites it.

## 6. Payment Finalization and Booking States
- **Advance Payments Are Requests**: When creating a new booking after a successful advance payment in finalizePaidBooking, NEVER set the initial status to CONFIRMED or ACCEPTED. Insert with: status: pending, booking_status: PENDING, detailed_status: PENDING_ARTIST_CONFIRMATION.
- **Cash Completion Requires Customer Confirmation**: A booking is only COMPLETED when both the artist checkout AND the customer cash confirmation have occurred. Artist confirming alone is not sufficient.

## 7. Shared Component Visibility - Status Gate Completeness

When a booking UI component (e.g., ServiceProgressCard, CheckoutCard, OtpVerificationCard) is conditionally rendered in both Customer and Artist views, the condition must cover ALL terminal states in each user flow.

### Rules
- Do not gate on a single boolean. Conditions like (isCompleted and booking.service_started_at) silently fail when DB columns are null (older records, missed DB updates).
- Always include isCheckoutVerified in the customer-side progress card condition. This flag covers CHECKOUT, PAYMENT_REQUIRED, and AWAITING_CASH_CONFIRMATION - states where service is done but isCompleted is still false.
- Always use a full startTime fallback chain for timer-based components:
  booking?.service_started_at || booking?.check_in_time || booking?.checked_in_at || booking?.service_start_time || booking?.booking_date || booking?.created_at
- Mirror render conditions between Customer and Artist screens. When you fix one side, check the other immediately.
- Customer vs Artist flow: The artist screen uses !isCheckout to suppress the progress card during checkout. The customer screen has no such conflict - the card should remain visible through all post-service states (CHECKOUT, AWAITING_CASH_CONFIRMATION, COMPLETED).
- Correct pattern for ServiceProgressCard on the customer side:
  (isServiceActive || isCheckoutVerified || isCompleted) with isCompleted prop set to (isCompleted || isCheckoutVerified).

## 8. Chat and Messaging Data Isolation - No Global Notification Fallbacks

When rendering a per-user or per-entity conversation (e.g., support ticket chat, booking chat, admin messages), the reply/message list MUST be sourced exclusively from the authoritative, entity-scoped backend record.

### Rules
- NEVER use a global notification stream as a reply source. Notifications are broadcast to a user and are NOT scoped to a specific ticket or conversation. Using allNotifs filtered by keyword (e.g., title.includes(Reply)) as a message source will always risk cross-user data leakage.
- NEVER add a broadening fallback. Patterns like if no ticket-specific results found, show the latest N admin replies are a privacy violation - they show messages intended for other users. When no replies exist for a ticket, show an empty state, never global data.
- The authoritative source for ticket replies is data.replies - the JSON array stored on the support_tickets record and returned by GET /support/tickets/:id. Always parse and display this directly.
- Optimistic local replies are the only safe non-server merge. When a user sends a message, you can merge their just-sent message locally for instant UX, but it will be replaced once the server poll confirms the message in data.replies.
- Correct pattern for SupportTicketDetailsScreen:
  const ticketData = await getSupportTicketDetails(ticketId);
  const serverReplies = JSON.parse(ticketData.replies or []);
  // Merge only local optimistic replies, never global notifications
- Incorrect anti-pattern to avoid:
  // WRONG: global notification fallback with no scoping
  if (candidateReplies.length === 0) {
    candidateReplies = allNotifs.filter(n => n.title.includes(Reply)).slice(0, 10);
  }

## 9. Customer Wallet Screen - Transaction History Only

### Wallet Screen Design Rules

The Customer Wallet screen (Customer/WalletScreen.js) is a read-only transaction log.

What to INCLUDE:
- FlatList of past wallet transactions
- Filter tabs: All / Money Added / Spent
- Tap-on-row to show transaction detail modal (ID, date, amount, status)
- Pull-to-refresh (RefreshControl)

What to NEVER include:
- Balance card or available balance display
- Add Money / Recharge button or bottom sheet modal
- Quick topup chips (e.g. Rs.100, Rs.250, Rs.500)
- Razorpay checkout or payment session creation
- Wallet Benefits / Info modal

Rationale: Customers cannot top up their wallet independently. Wallet balance is only credited via cashback, refunds, or admin action. The wallet screen for customers is purely a read-only audit log.

### No Blocking Loading Spinner on First Render

Screens must render immediately on mount/focus. Never gate the entire screen behind a loading === true check with a full-screen ActivityIndicator.

Correct pattern:
  const [data, setData] = useState([]);
  useFocusEffect(useCallback(() => { fetchData(); }, []));
  // List renders immediately; data populates when ready

Incorrect pattern (AVOID):
  const [loading, setLoading] = useState(true);
  if (loading) return <ActivityIndicator />;

The refreshing prop on RefreshControl is acceptable for pull-to-refresh UX.
