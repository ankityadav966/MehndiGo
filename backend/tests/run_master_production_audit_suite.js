/**
 * MehndiGo Master Full-Application Production Test Suite Runner
 * Runs all major test modules: Customer, Artist, Booking, Financials, Escrow, Auth, DeepLinks, Reviews
 */

const { execSync } = require("child_process");
const path = require("path");

const testSuites = [
  { name: "1. Customer Discovery & Selection Flow", file: "test_customer_discovery_booking_flow.js" },
  { name: "2. Master Artist Storefront & Payment Journey (21 Steps)", file: "test_artist_profile_to_payment_master_journey.js" },
  { name: "3. Complete Artist Profile Pipeline", file: "test_artist_profile_complete_flow.js" },
  { name: "4. Full Booking Lifecycle & State Transitions", file: "test_full_booking_lifecycle_master_audit.js" },
  { name: "5. Artist Wallet, Escrow & Payout System", file: "test_artist_wallet_escrow_payout_system.js" },
  { name: "6. Artist Earnings, Commission & Settlements", file: "test_artist_earnings_wallet_commission_settlement_flow.js" },
  { name: "7. Customer Login, Register & Auth Routing", file: "test_customer_login_register_navigation_flow.js" },
  { name: "8. Artist Onboarding, Verification & KYC", file: "test_artist_auth_onboarding_kyc_flow.js" },
  { name: "9. Reviews, Ratings & Reputation Engine", file: "test_artist_reviews_reputation_flow.js" },
  { name: "10. Disputes, Cancellations & Refunds Flow", file: "test_artist_disputes_cancellations_refunds_incidents_flow.js" },
  { name: "11. Deep Link Resolution & Routing", file: "verify_deep_link_system.js" },
  { name: "12. Categories & Festival Engine", file: "verify_categories_and_festivals.js" },
  { name: "13. Master Financial Ledger Reconciliation", file: "test_master_financial_reconciliation.js" }
];

async function runMasterAudit() {
  console.log("================================================================================");
  console.log("🚀 EXECUTING MEHNDIGO FULL-APPLICATION MASTER PRODUCTION AUDIT SUITE");
  console.log("================================================================================\n");

  const results = [];
  let totalPass = 0;
  let totalFail = 0;

  for (const suite of testSuites) {
    const startTime = Date.now();
    process.stdout.write(`▶ Running: ${suite.name}... `);
    try {
      const output = execSync(`node ${path.join(__dirname, suite.file)}`, {
        cwd: path.join(__dirname, ".."),
        encoding: "utf8",
        env: { ...process.env, NODE_ENV: "test", ALLOW_SIMULATED_EMAIL: "true" }
      });
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ PASSED (${duration}s)`);
      results.push({ name: suite.name, status: "PASSED", duration, error: null });
      totalPass++;
    } catch (err) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`❌ FAILED (${duration}s)`);
      const snippet = (err.stdout || err.stderr || err.message).split("\n").slice(-8).join("\n");
      console.error(snippet);
      results.push({ name: suite.name, status: "FAILED", duration, error: snippet });
      totalFail++;
    }
  }

  console.log("\n================================================================================");
  console.log("📊 MASTER PRODUCTION AUDIT SUMMARY");
  console.log("================================================================================");
  results.forEach(r => {
    const icon = r.status === "PASSED" ? "✅" : "❌";
    console.log(`${icon} [${r.status}] ${r.name} (${r.duration}s)`);
  });
  console.log("--------------------------------------------------------------------------------");
  console.log(`TOTAL SUITES: ${testSuites.length} | PASSED: ${totalPass} | FAILED: ${totalFail}`);
  console.log("================================================================================\n");

  if (totalFail > 0) process.exit(1);
  process.exit(0);
}

runMasterAudit();
