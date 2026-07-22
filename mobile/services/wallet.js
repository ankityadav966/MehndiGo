import apiRequest from "./api";

export async function getUserWallet() {
  const res = await apiRequest("GET", "/wallet", null, true);
  return res?.data || res;
}

export async function getWalletHistory() {
  const res = await apiRequest("GET", "/wallet/history", null, true);
  return res?.data || res;
}

export async function addWalletMoney(amountDetails) {
  const res = await apiRequest("POST", "/wallet/add-money", amountDetails, true);
  return res?.data || res;
}

export async function requestWithdrawal(amount) {
  const res = await apiRequest("POST", "/wallet/withdraw", { amount }, true);
  return res?.data || res;
}

export async function cancelWithdrawal(requestId) {
  const res = await apiRequest("PUT", "/wallet/withdraw/cancel", { requestId }, true);
  return res?.data || res;
}

export async function getWithdrawalHistory() {
  const res = await apiRequest("GET", "/wallet/withdraw/history", null, true);
  return res?.data || res;
}

export async function getTransactions() {
  const res = await apiRequest("GET", "/transactions", null, true);
  return res?.data || res;
}

export async function getTransactionDetails(id) {
  const res = await apiRequest("GET", `/transactions/${id}`, null, true);
  return res?.data || res;
}

export async function getSettlementsHistory() {
  const res = await apiRequest("GET", "/settlements", null, true);
  return res?.data || res;
}

export async function getBankAccountDetails() {
  const res = await apiRequest("GET", "/bank-account", null, true);
  return res?.data || res;
}

export async function saveBankAccountDetails(bankData) {
  const res = await apiRequest("POST", "/bank-account", bankData, true);
  return res?.data || res;
}
