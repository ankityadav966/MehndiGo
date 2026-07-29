const db = require('../models');

async function inspectModels() {
  const paymentAttributes = Object.keys(db.Payment.rawAttributes);
  console.log("Payment Model Attributes:", paymentAttributes);

  const txAttributes = Object.keys(db.Transaction.rawAttributes);
  console.log("Transaction Model Attributes:", txAttributes);

  const walletTxAttributes = Object.keys(db.WalletTransaction.rawAttributes);
  console.log("WalletTransaction Model Attributes:", walletTxAttributes);

  process.exit(0);
}

inspectModels();
