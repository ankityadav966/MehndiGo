const express = require("express");
const router = express.Router();
const WalletController = require("../controllers/wallet/wallet.controller");
const { authenticate } = require("../middleware/auth.middleware");

// Wallet details & recharge
router.get("/", authenticate, WalletController.getWallet);
router.get("/history", authenticate, WalletController.getWalletHistory);
router.post("/add-money", authenticate, WalletController.addMoney);

// Withdraw requests operations
router.post("/withdraw", authenticate, WalletController.initiateWithdrawal);
router.put("/withdraw/cancel", authenticate, WalletController.cancelWithdrawal);
router.get("/withdraw/history", authenticate, WalletController.getWithdrawHistory);

// Transactions operations
router.get("/transactions", authenticate, WalletController.getTransactions);
router.get("/transactions/:id", authenticate, WalletController.getTransactionById);

// Settlements logs
router.get("/settlements", authenticate, WalletController.getSettlements);

// Bank account info configurations
router.get("/bank-account", authenticate, WalletController.getBankAccount);
router.post("/bank-account", authenticate, WalletController.upsertBankAccount);
router.put("/bank-account", authenticate, WalletController.upsertBankAccount);

module.exports = router;
