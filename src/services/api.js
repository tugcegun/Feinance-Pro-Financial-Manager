import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Base URL - Use your computer's local IP so phone can reach it
const API_BASE_IP = '192.168.1.122';

const getBaseUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost/Finansapp/backend/api';
  }
  // Physical device and emulators use the actual LAN IP
  return `http://${API_BASE_IP}/Finansapp/backend/api`;
};

const API_BASE = getBaseUrl();
const TOKEN_KEY = 'auth_token';

// ---- Token Management ----
export const getToken = async () => {
  return await AsyncStorage.getItem(TOKEN_KEY);
};

export const setToken = async (token) => {
  await AsyncStorage.setItem(TOKEN_KEY, token);
};

export const removeToken = async () => {
  await AsyncStorage.removeItem(TOKEN_KEY);
};

// ---- Fetch Wrapper ----
const apiFetch = async (endpoint, options = {}) => {
  const token = await getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}/${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.error || 'API request failed');
    error.status = response.status;
    throw error;
  }

  return data;
};

// ---- Auth API Functions ----

export const apiRegister = async (name, email, password) => {
  const data = await apiFetch('register.php', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
  await setToken(data.token);
  return data.user;
};

export const apiLogin = async (email, password) => {
  const data = await apiFetch('login.php', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  await setToken(data.token);
  return data.user;
};

export const apiLogout = async () => {
  try {
    await apiFetch('logout.php', { method: 'POST' });
  } catch (e) {
    // Logout should succeed even if API call fails
  }
  await removeToken();
};

export const apiGetMe = async () => {
  const data = await apiFetch('me.php', { method: 'GET' });
  return data.user;
};

export const apiUpdateProfile = async ({ name, profile_photo }) => {
  const body = {};
  if (name !== undefined) body.name = name;
  if (profile_photo !== undefined) body.profile_photo = profile_photo;

  const data = await apiFetch('update-profile.php', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return data.user;
};

export const apiChangePassword = async (currentPassword, newPassword) => {
  const data = await apiFetch('change-password.php', {
    method: 'POST',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
  return data;
};

// ==================== CATEGORIES ====================

export const apiGetCategories = async (type = null) => {
  const params = type ? `?type=${type}` : '';
  const data = await apiFetch(`categories.php${params}`);
  return data.categories;
};

export const apiAddCategory = async (name, type, icon, color) => {
  const data = await apiFetch('categories.php', {
    method: 'POST',
    body: JSON.stringify({ name, type, icon, color }),
  });
  return data;
};

export const apiCreateDefaultCategories = async () => {
  const data = await apiFetch('categories.php?action=create-defaults', {
    method: 'POST',
  });
  return data;
};

export const apiUpdateCategory = async (categoryId, name, icon, color) => {
  const data = await apiFetch('categories.php?action=update', {
    method: 'PUT',
    body: JSON.stringify({ id: categoryId, name, icon, color }),
  });
  return data;
};

export const apiDeleteCategory = async (categoryId) => {
  const data = await apiFetch(`categories.php?action=delete&id=${categoryId}`, {
    method: 'DELETE',
  });
  return data;
};

// ==================== TRANSACTIONS ====================

export const apiGetTransactions = async (month = null, year = null) => {
  let params = '';
  if (month && year) {
    params = `?month=${month}&year=${year}`;
  }
  const data = await apiFetch(`transactions.php${params}`);
  return data.transactions;
};

export const apiAddTransaction = async (type, amount, categoryId, description, date, accountId = null) => {
  const data = await apiFetch('transactions.php', {
    method: 'POST',
    body: JSON.stringify({ type, amount, category_id: categoryId, description, date, account_id: accountId }),
  });
  return data;
};

export const apiGetTransactionsByAccount = async (accountId) => {
  const data = await apiFetch(`transactions.php?action=by-account&account_id=${accountId}`);
  return data.transactions;
};

export const apiGetArchivedTransactions = async () => {
  const data = await apiFetch('transactions.php?action=archived');
  return data.transactions;
};

export const apiGetDeletedTransactions = async () => {
  const data = await apiFetch('transactions.php?action=deleted');
  return data.transactions;
};

export const apiSoftDeleteTransaction = async (id) => {
  const data = await apiFetch('transactions.php?action=soft-delete', {
    method: 'PUT',
    body: JSON.stringify({ id }),
  });
  return data;
};

export const apiDeleteTransaction = async (id) => {
  const data = await apiFetch(`transactions.php?action=delete&id=${id}`, {
    method: 'DELETE',
  });
  return data;
};

export const apiTogglePinTransaction = async (id, isPinned) => {
  const data = await apiFetch('transactions.php?action=toggle-pin', {
    method: 'PUT',
    body: JSON.stringify({ id, is_pinned: isPinned ? 1 : 0 }),
  });
  return data;
};

export const apiToggleArchiveTransaction = async (id, isArchived) => {
  const data = await apiFetch('transactions.php?action=toggle-archive', {
    method: 'PUT',
    body: JSON.stringify({ id, is_archived: isArchived ? 1 : 0 }),
  });
  return data;
};

export const apiRestoreTransaction = async (id) => {
  const data = await apiFetch('transactions.php?action=restore', {
    method: 'PUT',
    body: JSON.stringify({ id }),
  });
  return data;
};

export const apiEmptyTrash = async () => {
  const data = await apiFetch('transactions.php?action=empty-trash', {
    method: 'DELETE',
  });
  return data;
};

// ==================== ACCOUNTS ====================

export const apiGetAccounts = async () => {
  const data = await apiFetch('accounts.php');
  return data.accounts;
};

export const apiAddAccount = async (name, type, bankName, balance, color, icon, cardLastFour) => {
  const data = await apiFetch('accounts.php', {
    method: 'POST',
    body: JSON.stringify({ name, type, bank_name: bankName, balance, color, icon, card_last_four: cardLastFour }),
  });
  return data;
};

export const apiUpdateAccount = async (id, name, type, bankName, balance, color, icon, cardLastFour) => {
  const data = await apiFetch('accounts.php?action=update', {
    method: 'PUT',
    body: JSON.stringify({ id, name, type, bank_name: bankName, balance, color, icon, card_last_four: cardLastFour }),
  });
  return data;
};

export const apiUpdateAccountBalance = async (id, balance) => {
  const data = await apiFetch('accounts.php?action=update-balance', {
    method: 'PUT',
    body: JSON.stringify({ id, balance }),
  });
  return data;
};

export const apiDeleteAccount = async (id) => {
  const data = await apiFetch(`accounts.php?action=delete&id=${id}`, {
    method: 'DELETE',
  });
  return data;
};

export const apiGetTotalBalance = async () => {
  const data = await apiFetch('accounts.php?action=total-balance');
  return data.total;
};

export const apiTransferBetweenAccounts = async (fromAccountId, toAccountId, amount) => {
  const data = await apiFetch('accounts.php?action=transfer', {
    method: 'POST',
    body: JSON.stringify({ from_account_id: fromAccountId, to_account_id: toAccountId, amount }),
  });
  return data;
};

// ==================== BUDGETS ====================

export const apiGetBudgets = async (month, year) => {
  const data = await apiFetch(`budgets.php?month=${month}&year=${year}`);
  return data.budgets;
};

export const apiSetBudget = async (categoryId, amount, month, year) => {
  const data = await apiFetch('budgets.php?action=set', {
    method: 'POST',
    body: JSON.stringify({ category_id: categoryId, amount, month, year }),
  });
  return data;
};

export const apiGetCategorySpending = async (categoryId, month, year) => {
  const data = await apiFetch(`budgets.php?action=category-spending&category_id=${categoryId}&month=${month}&year=${year}`);
  return data.total;
};

export const apiGetCategoryTransactions = async (categoryId, month, year) => {
  const data = await apiFetch(`budgets.php?action=category-transactions&category_id=${categoryId}&month=${month}&year=${year}`);
  return data.transactions;
};

// ==================== SUMMARY ====================

export const apiGetMonthlySummary = async (month, year) => {
  const data = await apiFetch(`summary.php?action=monthly&month=${month}&year=${year}`);
  return data.summary;
};

export const apiGetTopSpendingCategories = async (month, year, limit = 3) => {
  const data = await apiFetch(`summary.php?action=top-categories&month=${month}&year=${year}&limit=${limit}`);
  return data.categories;
};

// ==================== BILLS ====================

export const apiGetBills = async (showPaid = false) => {
  const data = await apiFetch(`bills.php?show_paid=${showPaid ? '1' : '0'}`);
  return data.bills;
};

export const apiAddBill = async (name, type, amount, dueDate, photoUri, notes, isRecurring, recurringDay, reminderDays) => {
  const data = await apiFetch('bills.php', {
    method: 'POST',
    body: JSON.stringify({
      name, type, amount, due_date: dueDate, photo_uri: photoUri, notes,
      is_recurring: isRecurring ? 1 : 0, recurring_day: recurringDay, reminder_days: reminderDays || 3,
    }),
  });
  return data;
};

export const apiGetBillById = async (billId) => {
  const data = await apiFetch(`bills.php?action=get-by-id&id=${billId}`);
  return data.bill;
};

export const apiUpdateBill = async (billId, name, type, amount, dueDate, photoUri, notes, isRecurring, recurringDay, reminderDays) => {
  const data = await apiFetch('bills.php?action=update', {
    method: 'PUT',
    body: JSON.stringify({
      id: billId, name, type, amount, due_date: dueDate, photo_uri: photoUri, notes,
      is_recurring: isRecurring ? 1 : 0, recurring_day: recurringDay, reminder_days: reminderDays,
    }),
  });
  return data;
};

export const apiMarkBillAsPaid = async (billId, paidDate, amount, photoUri, notes) => {
  const data = await apiFetch('bills.php?action=mark-paid', {
    method: 'POST',
    body: JSON.stringify({ bill_id: billId, paid_date: paidDate, amount, photo_uri: photoUri, notes }),
  });
  return data;
};

export const apiDeleteBill = async (billId) => {
  const data = await apiFetch(`bills.php?action=delete&id=${billId}`, {
    method: 'DELETE',
  });
  return data;
};

export const apiGetBillHistory = async (billId = null) => {
  const params = billId ? `&bill_id=${billId}` : '';
  const data = await apiFetch(`bills.php?action=history${params}`);
  return data.history;
};

export const apiGetBillsDueSoon = async (daysAhead = 7) => {
  const data = await apiFetch(`bills.php?action=due-soon&days=${daysAhead}`);
  return data.bills;
};

export const apiGetOverdueBills = async () => {
  const data = await apiFetch('bills.php?action=overdue');
  return data.bills;
};

export const apiGetMonthlyBillSummary = async (month, year) => {
  const data = await apiFetch(`bills.php?action=monthly-summary&month=${month}&year=${year}`);
  return data.summary;
};

export const apiGetYearlyBillSummary = async (year) => {
  const data = await apiFetch(`bills.php?action=yearly-summary&year=${year}`);
  return data.summary;
};

// ==================== FAMILY MEMBERS ====================

export const apiGetFamilyMembers = async () => {
  const data = await apiFetch('family-members.php');
  return data.members;
};

export const apiAddFamilyMember = async (name, email, role) => {
  const data = await apiFetch('family-members.php', {
    method: 'POST',
    body: JSON.stringify({ name, email, role }),
  });
  return data;
};

export const apiUpdateFamilyMember = async (memberId, name, email, role) => {
  const data = await apiFetch('family-members.php?action=update', {
    method: 'PUT',
    body: JSON.stringify({ id: memberId, name, email, role }),
  });
  return data;
};

export const apiDeleteFamilyMember = async (memberId) => {
  const data = await apiFetch(`family-members.php?action=delete&id=${memberId}`, {
    method: 'DELETE',
  });
  return data;
};

// ==================== BILL ASSIGNMENTS ====================

export const apiGetBillAssignments = async (billId) => {
  const data = await apiFetch(`bill-assignments.php?bill_id=${billId}`);
  return data.assignments;
};

export const apiAssignBillToMember = async (billId, familyMemberId, shareAmount, sharePercentage) => {
  const data = await apiFetch('bill-assignments.php', {
    method: 'POST',
    body: JSON.stringify({ bill_id: billId, family_member_id: familyMemberId, share_amount: shareAmount, share_percentage: sharePercentage }),
  });
  return data;
};

export const apiUpdateAssignmentPayment = async (assignmentId, isPaid) => {
  const data = await apiFetch('bill-assignments.php?action=update-payment', {
    method: 'PUT',
    body: JSON.stringify({ id: assignmentId, is_paid: isPaid ? 1 : 0 }),
  });
  return data;
};

export const apiDeleteBillAssignment = async (assignmentId) => {
  const data = await apiFetch(`bill-assignments.php?action=delete&id=${assignmentId}`, {
    method: 'DELETE',
  });
  return data;
};

// ==================== RECURRING TRANSACTIONS ====================

export const apiGetRecurringTransactions = async () => {
  const data = await apiFetch('recurring-transactions.php');
  return data.recurring_transactions;
};

export const apiAddRecurringTransaction = async (type, amount, categoryId, description, accountId, frequency, dayOfWeek, dayOfMonth, startDate, endDate) => {
  const data = await apiFetch('recurring-transactions.php', {
    method: 'POST',
    body: JSON.stringify({
      type, amount, category_id: categoryId, description, account_id: accountId,
      frequency, day_of_week: dayOfWeek, day_of_month: dayOfMonth, start_date: startDate, end_date: endDate,
    }),
  });
  return data;
};

export const apiUpdateRecurringTransaction = async (id, type, amount, categoryId, description, accountId, frequency, dayOfWeek, dayOfMonth, startDate, endDate) => {
  const data = await apiFetch('recurring-transactions.php?action=update', {
    method: 'PUT',
    body: JSON.stringify({
      id, type, amount, category_id: categoryId, description, account_id: accountId,
      frequency, day_of_week: dayOfWeek, day_of_month: dayOfMonth, start_date: startDate, end_date: endDate,
    }),
  });
  return data;
};

export const apiDeleteRecurringTransaction = async (id) => {
  const data = await apiFetch(`recurring-transactions.php?action=delete&id=${id}`, {
    method: 'DELETE',
  });
  return data;
};

export const apiToggleRecurringTransaction = async (id, isActive) => {
  const data = await apiFetch('recurring-transactions.php?action=toggle', {
    method: 'PUT',
    body: JSON.stringify({ id, is_active: isActive ? 1 : 0 }),
  });
  return data;
};

export const apiProcessRecurringTransactions = async () => {
  const data = await apiFetch('recurring-transactions.php?action=process', {
    method: 'POST',
  });
  return data.generated_count;
};

// ==================== SAVINGS GOALS ====================

export const apiGetSavingsGoals = async () => {
  const data = await apiFetch('savings-goals.php');
  return data.goals;
};

export const apiAddSavingsGoal = async (name, description, targetAmount, icon, color, targetDate) => {
  const data = await apiFetch('savings-goals.php', {
    method: 'POST',
    body: JSON.stringify({ name, description, target_amount: targetAmount, icon, color, target_date: targetDate }),
  });
  return data;
};

export const apiUpdateSavingsGoal = async (id, name, description, targetAmount, icon, color, targetDate) => {
  const data = await apiFetch('savings-goals.php?action=update', {
    method: 'PUT',
    body: JSON.stringify({ id, name, description, target_amount: targetAmount, icon, color, target_date: targetDate }),
  });
  return data;
};

export const apiDeleteSavingsGoal = async (id) => {
  const data = await apiFetch(`savings-goals.php?action=delete&id=${id}`, {
    method: 'DELETE',
  });
  return data;
};

export const apiDepositToSavingsGoal = async (id, amount, accountId = null, deducted = true) => {
  const data = await apiFetch('savings-goals.php?action=deposit', {
    method: 'POST',
    body: JSON.stringify({ id, amount, account_id: accountId, deducted: deducted ? 1 : 0 }),
  });
  return data;
};

export const apiWithdrawFromSavingsGoal = async (id, amount, accountId = null, deducted = true) => {
  const data = await apiFetch('savings-goals.php?action=withdraw', {
    method: 'POST',
    body: JSON.stringify({ id, amount, account_id: accountId, deducted: deducted ? 1 : 0 }),
  });
  return data;
};

export const apiGetSavingsGoalHistory = async (goalId) => {
  const data = await apiFetch(`savings-goals.php?action=history&goal_id=${goalId}`);
  return data.history;
};

export const apiDeleteAllSavingsGoalHistory = async (goalId) => {
  const data = await apiFetch(`savings-goals.php?action=delete-all-history&goal_id=${goalId}`, {
    method: 'DELETE',
  });
  return data;
};

export const apiDeleteSavingsGoalHistoryEntry = async (id) => {
  const data = await apiFetch(`savings-goals.php?action=delete-history-entry&id=${id}`, {
    method: 'DELETE',
  });
  return data;
};

// ==================== INSTALLMENTS ====================

export const apiGetInstallments = async () => {
  const data = await apiFetch('installments.php');
  return data.installments;
};

export const apiAddInstallment = async (name, description, totalAmount, installmentCount, monthlyAmount, firstPaymentDate, accountId) => {
  const data = await apiFetch('installments.php', {
    method: 'POST',
    body: JSON.stringify({
      name, description, total_amount: totalAmount, installment_count: installmentCount,
      monthly_amount: monthlyAmount, first_payment_date: firstPaymentDate, account_id: accountId,
    }),
  });
  return data;
};

export const apiUpdateInstallment = async (id, name, description) => {
  const data = await apiFetch('installments.php?action=update', {
    method: 'PUT',
    body: JSON.stringify({ id, name, description }),
  });
  return data;
};

export const apiDeleteInstallment = async (id) => {
  const data = await apiFetch(`installments.php?action=delete&id=${id}`, {
    method: 'DELETE',
  });
  return data;
};

export const apiGetInstallmentPayments = async (installmentId) => {
  const data = await apiFetch(`installments.php?action=payments&installment_id=${installmentId}`);
  return data.payments;
};

export const apiMarkInstallmentPaid = async (paymentId) => {
  const data = await apiFetch('installments.php?action=mark-paid', {
    method: 'PUT',
    body: JSON.stringify({ payment_id: paymentId }),
  });
  return data;
};

export const apiUnmarkInstallmentPaid = async (paymentId) => {
  const data = await apiFetch('installments.php?action=unmark-paid', {
    method: 'PUT',
    body: JSON.stringify({ payment_id: paymentId }),
  });
  return data;
};

// ==================== DEBTS/CREDITS ====================

export const apiGetDebtsCredits = async () => {
  const data = await apiFetch('debts-credits.php');
  return data.debts_credits;
};

export const apiAddDebtCredit = async (type, personName, amount, description, dateCreated, dueDate) => {
  const data = await apiFetch('debts-credits.php', {
    method: 'POST',
    body: JSON.stringify({ type, person_name: personName, amount, description, date_created: dateCreated, due_date: dueDate }),
  });
  return data;
};

export const apiUpdateDebtCredit = async (id, personName, amount, description, dueDate) => {
  const data = await apiFetch('debts-credits.php?action=update', {
    method: 'PUT',
    body: JSON.stringify({ id, person_name: personName, amount, description, due_date: dueDate }),
  });
  return data;
};

export const apiDeleteDebtCredit = async (id) => {
  const data = await apiFetch(`debts-credits.php?action=delete&id=${id}`, {
    method: 'DELETE',
  });
  return data;
};

export const apiGetDebtCreditPayments = async (debtCreditId) => {
  const data = await apiFetch(`debts-credits.php?action=payments&debt_credit_id=${debtCreditId}`);
  return data.payments;
};

export const apiAddDebtCreditPayment = async (debtCreditId, amount, paymentDate, note) => {
  const data = await apiFetch('debts-credits.php?action=add-payment', {
    method: 'POST',
    body: JSON.stringify({ debt_credit_id: debtCreditId, amount, payment_date: paymentDate, note }),
  });
  return data;
};

export const apiSettleDebtCredit = async (id) => {
  const data = await apiFetch('debts-credits.php?action=settle', {
    method: 'PUT',
    body: JSON.stringify({ id }),
  });
  return data;
};
