const WalletService = require("../../services/wallet.services");
const { SuccessResponse, ErrorResponse } = require("../../utils/common");

async function getWallet(req, res) {
  try {
    const response = await WalletService.getWalletSummary(req.user.id);
    return res.status(200).json(SuccessResponse("Wallet data fetched successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getWalletHistory(req, res) {
  try {
    const response = await WalletService.getTransactions(req.user.id);
    return res.status(200).json(SuccessResponse("Wallet transaction history fetched", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function addMoney(req, res) {
  try {
    const response = await WalletService.addWalletMoney(req.user.id, req.body);
    return res.status(200).json(SuccessResponse("Wallet credited successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function initiateWithdrawal(req, res) {
  try {
    const { amount } = req.body;
    const response = await WalletService.initiateWithdrawal(req.user.id, amount);
    return res.status(200).json(SuccessResponse("Withdrawal request created", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function cancelWithdrawal(req, res) {
  try {
    const { requestId } = req.body;
    const response = await WalletService.cancelWithdrawal(req.user.id, requestId);
    return res.status(200).json(SuccessResponse("Withdrawal request cancelled", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getWithdrawHistory(req, res) {
  try {
    const response = await WalletService.getWithdrawHistory(req.user.id);
    return res.status(200).json(SuccessResponse("Withdrawal history fetched", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getWithdrawalStatus(req, res) {
  try {
    const response = await WalletService.getWithdrawalStatus(req.user.id);
    return res.status(200).json(SuccessResponse("Withdrawal status fetched successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getTransactions(req, res) {
  try {
    const response = await WalletService.getTransactions(req.user.id);
    return res.status(200).json(SuccessResponse("Transactions list fetched", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getTransactionById(req, res) {
  try {
    const response = await WalletService.getTransactionById(req.params.id);
    return res.status(200).json(SuccessResponse("Transaction details fetched", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getSettlements(req, res) {
  try {
    const response = await WalletService.getSettlements(req.user.id, req.user.role);
    return res.status(200).json(SuccessResponse("Settlements history fetched", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getBankAccount(req, res) {
  try {
    const response = await WalletService.getBankAccount(req.user.id);
    return res.status(200).json(SuccessResponse("Bank details fetched", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function upsertBankAccount(req, res) {
  try {
    const response = await WalletService.upsertBankAccount(req.user.id, req.body);
    return res.status(200).json(SuccessResponse("Bank details saved successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

module.exports = {
  getWallet,
  getWalletHistory,
  addMoney,
  initiateWithdrawal,
  cancelWithdrawal,
  getWithdrawHistory,
  getWithdrawalStatus,
  getTransactions,
  getTransactionById,
  getSettlements,
  getBankAccount,
  upsertBankAccount
};
