import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import TransactionItem from '../components/TransactionItem';
import CategoryPicker from '../components/CategoryPicker';
import AccountPicker from '../components/AccountPicker';
import { StaggeredItem } from '../components/AnimatedScreen';
import { apiGetMonthlySummary, apiGetTransactions, apiGetCategories, apiGetAccounts, apiAddTransaction, apiGetTotalBalance, apiGetBillsDueSoon, apiGetOverdueBills, apiGetBudgets, apiGetCategorySpending, apiGetSavingsGoals, apiGetTopSpendingCategories } from '../services/api';
import { getCurrentMonth, getCurrentYear, getMonthName, getDaysInMonth, getFirstDayOfMonth } from '../utils/dateUtils';
import { exportDatabase } from '../utils/exportDatabase';
import { formatCurrency } from '../utils/currency';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');
const DAY_SIZE = (width - 60) / 7;

// Default colors matching ThemeContext light theme
const defaultColors = {
  primary: '#50D890',
  secondary: '#4F98CA',
  success: '#50D890',
  danger: '#FF4646',
  warning: '#FFA726',
  info: '#4F98CA',
  light: '#EFFFFB',
  dark: '#272727',
  white: '#FFFFFF',
  black: '#000000',
  background: '#EFFFFB',
  card: '#FFFFFF',
  text: '#272727',
  textLight: '#666666',
  border: '#D0D0D0',
  modalBackground: '#FFFFFF',
  inputBackground: '#FFFFFF',
  income: '#50D890',
  expense: '#FF4646',
};

const HomeScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { t, currentLanguage } = useLanguage();
  const themeContext = useTheme();
  const colors = themeContext?.colors || defaultColors;
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedYear, setSelectedYear] = useState(getCurrentYear());
  const [menuVisible, setMenuVisible] = useState(false);
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayModalVisible, setDayModalVisible] = useState(false);
  const [dayTransactions, setDayTransactions] = useState([]);

  // Add transaction states
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [transactionType, setTransactionType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);

  // Dashboard enrichment states
  const [totalAssets, setTotalAssets] = useState(0);
  const [accountsCount, setAccountsCount] = useState(0);
  const [lastMonthExpense, setLastMonthExpense] = useState(0);
  const [topCategories, setTopCategories] = useState([]);
  const [upcomingBills, setUpcomingBills] = useState([]);
  const [overdueBills, setOverdueBills] = useState([]);
  const [budgetStatus, setBudgetStatus] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);

  const loadData = async () => {
    if (!user?.id) return;

    try {
      const monthData = await apiGetMonthlySummary(selectedMonth, selectedYear);
      const income = monthData.find(m => m.type === 'income')?.total || 0;
      const expense = monthData.find(m => m.type === 'expense')?.total || 0;

      setSummary({
        income,
        expense,
        balance: income - expense,
      });

      const transactions = await apiGetTransactions(selectedMonth, selectedYear);
      setAllTransactions(transactions);
      setRecentTransactions(transactions.slice(0, 5));

      const cats = await apiGetCategories();
      setCategories(cats);

      const accs = await apiGetAccounts();
      setAccounts(accs);

      // Dashboard enrichment data
      const totalBal = await apiGetTotalBalance();
      setTotalAssets(totalBal);
      setAccountsCount(accs.length);

      // Last month comparison
      let prevMonth = selectedMonth - 1;
      let prevYear = selectedYear;
      if (prevMonth < 1) { prevMonth = 12; prevYear -= 1; }
      const lastMonthData = await apiGetMonthlySummary(prevMonth, prevYear);
      const lastExp = lastMonthData.find(m => m.type === 'expense')?.total || 0;
      setLastMonthExpense(lastExp);

      // Top spending categories
      const topCats = await apiGetTopSpendingCategories(selectedMonth, selectedYear, 3);
      setTopCategories(topCats);

      // Upcoming & overdue bills
      const upcoming = await apiGetBillsDueSoon(7);
      setUpcomingBills(upcoming);
      const overdue = await apiGetOverdueBills();
      setOverdueBills(overdue);

      // Budget status
      const budgets = await apiGetBudgets(selectedMonth, selectedYear);
      const budgetsWithSpending = await Promise.all(
        budgets.map(async (b) => {
          const spent = await apiGetCategorySpending(b.category_id, selectedMonth, selectedYear);
          return { ...b, spent, percentage: b.amount > 0 ? (spent / b.amount) * 100 : 0 };
        })
      );
      setBudgetStatus(budgetsWithSpending);

      // Savings goals (only active)
      const goals = await apiGetSavingsGoals();
      setSavingsGoals(goals.filter(g => !g.is_completed));
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation, selectedMonth, selectedYear]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleExportDatabase = async () => {
    setMenuVisible(false);
    Alert.alert(
      t('common.exportDatabase') || 'Export Database',
      t('common.exportDatabaseMessage') || 'Export your database?',
      [
        { text: t('transactions.cancel'), style: 'cancel' },
        {
          text: t('common.export') || 'Export',
          onPress: async () => {
            const result = await exportDatabase();
            if (result.success) {
              Alert.alert(t('common.success'), t('common.exportSuccess'));
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    setMenuVisible(false);
    Alert.alert(
      t('auth.logout'),
      t('common.logoutConfirm'),
      [
        { text: t('transactions.cancel'), style: 'cancel' },
        { text: t('auth.logout'), style: 'destructive', onPress: () => logout() },
      ]
    );
  };

  const changeMonth = (direction) => {
    let newMonth = selectedMonth + direction;
    let newYear = selectedYear;
    if (newMonth > 12) { newMonth = 1; newYear += 1; }
    else if (newMonth < 1) { newMonth = 12; newYear -= 1; }
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  const getTransactionsForDay = (day) => {
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return allTransactions.filter(t => t.date && t.date.startsWith(dateStr));
  };

  const getDayTotal = (day) => {
    const dayTrans = getTransactionsForDay(day);
    let income = 0, expense = 0;
    dayTrans.forEach(t => {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    });
    return { income, expense, hasTransactions: dayTrans.length > 0 };
  };

  const handleDayPress = (day) => {
    const dayTrans = getTransactionsForDay(day);
    setSelectedDay(day);
    setDayTransactions(dayTrans);
    setDayModalVisible(true);
  };

  const openAddTransactionModal = (type) => {
    setDayModalVisible(false);
    setTransactionType(type);
    setAmount('');
    setDescription('');
    setSelectedCategory(null);
    const defaultAcc = accounts.find(a => a.is_default === 1);
    setSelectedAccountId(defaultAcc ? defaultAcc.id : null);
    setTimeout(() => {
      setAddModalVisible(true);
    }, 300);
  };

  const handleAddTransaction = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert(t('common.error'), t('transactions.validAmount'));
      return;
    }
    if (!selectedCategory) {
      Alert.alert(t('common.error'), t('transactions.selectCategoryError'));
      return;
    }

    try {
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
      await apiAddTransaction(transactionType, parseFloat(amount), selectedCategory.id, description, dateStr, selectedAccountId);

      setAddModalVisible(false);
      await loadData();

      // Refresh day transactions
      const newDayTrans = getTransactionsForDay(selectedDay);
      setDayTransactions(newDayTrans);

      Alert.alert(t('common.success'), t('home.transactionAdded') || 'Transaction added!');
    } catch (error) {
      console.error('Error adding transaction:', error);
      Alert.alert(t('common.error'), 'Failed to add transaction');
    }
  };

  const filteredCategories = categories.filter(c => c.type === transactionType);

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
    const firstDay = getFirstDayOfMonth(selectedMonth, selectedYear);
    const days = [];
    const weekDays = currentLanguage === 'tr'
      ? ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const headers = weekDays.map((day, index) => (
      <View key={`header-${index}`} style={styles.calendarDayHeader}>
        <Text style={[styles.calendarDayHeaderText, { color: colors.textLight }]}>{day}</Text>
      </View>
    ));

    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < adjustedFirstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const { income, expense, hasTransactions } = getDayTotal(day);
      const isToday = day === new Date().getDate() &&
                      selectedMonth === getCurrentMonth() &&
                      selectedYear === getCurrentYear();

      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.calendarDay,
            isToday && { backgroundColor: colors.primary + '20' },
            hasTransactions && { backgroundColor: colors.light },
          ]}
          onPress={() => handleDayPress(day)}
        >
          <Text style={[styles.calendarDayText, { color: colors.text }, isToday && { fontWeight: '700', color: colors.primary }]}>{day}</Text>
          {hasTransactions && (
            <View style={styles.dayIndicators}>
              {income > 0 && <View style={[styles.dayDot, { backgroundColor: colors.income }]} />}
              {expense > 0 && <View style={[styles.dayDot, { backgroundColor: colors.expense }]} />}
            </View>
          )}
        </TouchableOpacity>
      );
    }

    return (
      <View style={[styles.calendarContainer, { backgroundColor: colors.card }]}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.calendarArrow}>
            <Feather name="chevron-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMonthPickerVisible(true)}>
            <Text style={[styles.calendarTitle, { color: colors.text }]}>
              {getMonthName(selectedMonth, currentLanguage)} {selectedYear}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.calendarArrow}>
            <Feather name="chevron-right" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.calendarWeekHeader}>{headers}</View>
        <View style={styles.calendarGrid}>{days}</View>
      </View>
    );
  };

  const months = [
    { value: 1, label: t('months.january') }, { value: 2, label: t('months.february') },
    { value: 3, label: t('months.march') }, { value: 4, label: t('months.april') },
    { value: 5, label: t('months.may') }, { value: 6, label: t('months.june') },
    { value: 7, label: t('months.july') }, { value: 8, label: t('months.august') },
    { value: 9, label: t('months.september') }, { value: 10, label: t('months.october') },
    { value: 11, label: t('months.november') }, { value: 12, label: t('months.december') },
  ];

  const years = [];
  for (let y = getCurrentYear() - 5; y <= getCurrentYear() + 1; y++) years.push(y);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.greeting, { color: colors.text }]}>{t('home.welcomeBack')}</Text>
          <Text style={[styles.userName, { color: colors.primary }]}>{user?.name || t('common.user')}</Text>
        </View>
        <TouchableOpacity style={[styles.menuButton, { backgroundColor: colors.card }]} onPress={() => setMenuVisible(true)}>
          <Feather name="menu" size={24} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate('Transactions')}>
          <Feather name="plus" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Menu Modal */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={[styles.menuContainer, { backgroundColor: colors.modalBackground }]}>
            <TouchableOpacity style={styles.menuItem} onPress={handleExportDatabase}>
              <Feather name="download" size={20} color={colors.primary} />
              <Text style={[styles.menuText, { color: colors.text }]}>{t('common.exportDatabase')}</Text>
            </TouchableOpacity>
            <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <Feather name="log-out" size={20} color={colors.danger} />
              <Text style={[styles.menuText, { color: colors.danger }]}>{t('auth.logout')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Month Picker Modal */}
      <Modal visible={monthPickerVisible} transparent animationType="slide" onRequestClose={() => setMonthPickerVisible(false)}>
        <View style={styles.pickerModalOverlay}>
          <TouchableOpacity style={styles.pickerBackdrop} onPress={() => setMonthPickerVisible(false)} />
          <View style={[styles.pickerContainer, { backgroundColor: colors.modalBackground }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>{t('home.selectMonthYear') || 'Select Month & Year'}</Text>
              <TouchableOpacity onPress={() => setMonthPickerVisible(false)}>
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.pickerLabel, { color: colors.text }]}>{t('home.year') || 'Year'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yearScroll}>
              {years.map((year) => (
                <TouchableOpacity
                  key={year}
                  style={[styles.yearChip, { backgroundColor: colors.light, borderColor: colors.border }, selectedYear === year && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setSelectedYear(year)}
                >
                  <Text style={[styles.yearChipText, { color: colors.text }, selectedYear === year && styles.yearChipTextActive]}>{year}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={[styles.pickerLabel, { color: colors.text }]}>{t('home.month') || 'Month'}</Text>
            <View style={styles.monthsGrid}>
              {months.map((month) => (
                <TouchableOpacity
                  key={month.value}
                  style={[styles.monthChip, { backgroundColor: colors.light, borderColor: colors.border }, selectedMonth === month.value && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => { setSelectedMonth(month.value); setMonthPickerVisible(false); }}
                >
                  <Text style={[styles.monthChipText, { color: colors.text }, selectedMonth === month.value && styles.monthChipTextActive]}>{month.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Day Detail Modal */}
      <Modal visible={dayModalVisible} transparent animationType="slide" onRequestClose={() => setDayModalVisible(false)}>
        <View style={styles.pickerModalOverlay}>
          <TouchableOpacity style={styles.pickerBackdrop} onPress={() => setDayModalVisible(false)} />
          <View style={[styles.dayModalContainer, { backgroundColor: colors.modalBackground }]}>
            {/* Header */}
            <View style={styles.dayModalHeader}>
              <View>
                <Text style={[styles.dayModalDate, { color: colors.text }]}>{selectedDay}</Text>
                <Text style={[styles.dayModalMonth, { color: colors.textLight }]}>{getMonthName(selectedMonth, currentLanguage)} {selectedYear}</Text>
              </View>
              <TouchableOpacity onPress={() => setDayModalVisible(false)} style={styles.closeButton}>
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Quick Stats */}
            <View style={[styles.dayStatsContainer, { backgroundColor: colors.light }]}>
              <View style={styles.dayStat}>
                <Feather name="arrow-up-circle" size={20} color={colors.income} />
                <Text style={[styles.dayStatLabel, { color: colors.textLight }]}>{t('home.income')}</Text>
                <Text style={[styles.dayStatValue, { color: colors.income }]}>
                  {formatCurrency(dayTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), currentLanguage)}
                </Text>
              </View>
              <View style={[styles.dayStatDivider, { backgroundColor: colors.border }]} />
              <View style={styles.dayStat}>
                <Feather name="arrow-down-circle" size={20} color={colors.expense} />
                <Text style={[styles.dayStatLabel, { color: colors.textLight }]}>{t('home.expenses')}</Text>
                <Text style={[styles.dayStatValue, { color: colors.expense }]}>
                  {formatCurrency(dayTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0), currentLanguage)}
                </Text>
              </View>
            </View>

            {/* Transactions List */}
            {dayTransactions.length > 0 ? (
              <ScrollView style={styles.dayTransactionsList} showsVerticalScrollIndicator={false}>
                {dayTransactions.map((transaction) => (
                  <View key={transaction.id} style={[styles.dayTransactionItem, { borderBottomColor: colors.border }]}>
                    <View style={[styles.dayTransactionIcon, { backgroundColor: (transaction.color || colors.primary) + '15' }]}>
                      <Feather name={transaction.icon || 'tag'} size={18} color={transaction.color || colors.primary} />
                    </View>
                    <View style={styles.dayTransactionInfo}>
                      <Text style={[styles.dayTransactionCategory, { color: colors.text }]}>{transaction.category_name || t('transactions.uncategorized')}</Text>
                      <Text style={[styles.dayTransactionDesc, { color: colors.textLight }]} numberOfLines={1}>{transaction.description || t('transactions.noDescription')}</Text>
                    </View>
                    <Text style={[styles.dayTransactionAmount, { color: transaction.type === 'income' ? colors.income : colors.expense }]}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount, currentLanguage)}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyDayState}>
                <Feather name="calendar" size={40} color={colors.textLight} />
                <Text style={[styles.emptyDayText, { color: colors.textLight }]}>{t('home.noTransactionsDay') || 'No transactions'}</Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.dayActionButtons}>
              <TouchableOpacity
                style={[styles.dayActionBtn, { backgroundColor: colors.income }]}
                onPress={() => openAddTransactionModal('income')}
                activeOpacity={0.7}
              >
                <Feather name="trending-up" size={18} color={colors.white} />
                <Text style={styles.dayActionBtnText}>{t('transactions.addIncome')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dayActionBtn, { backgroundColor: colors.expense }]}
                onPress={() => openAddTransactionModal('expense')}
                activeOpacity={0.7}
              >
                <Feather name="trending-down" size={18} color={colors.white} />
                <Text style={styles.dayActionBtnText}>{t('transactions.addExpense')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Transaction Modal */}
      <Modal visible={addModalVisible} transparent animationType="slide" onRequestClose={() => setAddModalVisible(false)}>
        <View style={styles.pickerModalOverlay}>
          <TouchableOpacity style={styles.pickerBackdrop} onPress={() => setAddModalVisible(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.addModalWrapper}>
            <View style={[styles.addModalContainer, { backgroundColor: colors.modalBackground }]}>
              <View style={styles.addModalHeader}>
                <View style={[styles.addModalTypeIndicator, { backgroundColor: transactionType === 'income' ? colors.income : colors.expense }]}>
                  <Feather name={transactionType === 'income' ? 'trending-up' : 'trending-down'} size={20} color="#FFFFFF" />
                </View>
                <Text style={[styles.addModalTitle, { color: colors.text }]}>
                  {transactionType === 'income' ? t('transactions.addIncome') : t('transactions.addExpense')}
                </Text>
                <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                  <Feather name="x" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={[styles.addModalDateBadge, { backgroundColor: colors.primary + '10' }]}>
                <Feather name="calendar" size={16} color={colors.primary} />
                <Text style={[styles.addModalDateText, { color: colors.primary }]}>
                  {selectedDay} {getMonthName(selectedMonth, currentLanguage)} {selectedYear}
                </Text>
              </View>

              <Text style={[styles.inputLabel, { color: colors.text }]}>{t('transactions.amount')}</Text>
              <View style={[styles.amountInputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                <Text style={[styles.currencySymbol, { color: colors.textLight }]}>{currentLanguage === 'tr' ? '₺' : '$'}</Text>
                <TextInput
                  style={[styles.amountInput, { color: colors.text }]}
                  placeholder="0.00"
                  placeholderTextColor={colors.textLight}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>

              <Text style={[styles.inputLabel, { color: colors.text }]}>{t('transactions.selectCategory')}</Text>
              <CategoryPicker
                categories={filteredCategories}
                selectedCategory={selectedCategory}
                onSelect={setSelectedCategory}
              />

              {/* Account Picker */}
              {accounts.length > 0 && (
                <>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>{t('transactions.linkAccount')}</Text>
                  <AccountPicker
                    accounts={accounts}
                    selectedAccountId={selectedAccountId}
                    onSelect={setSelectedAccountId}
                  />
                </>
              )}

              <Text style={[styles.inputLabel, { color: colors.text }]}>{t('transactions.descriptionOptional')}</Text>
              <TextInput
                style={[styles.descInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                placeholder={t('transactions.description')}
                placeholderTextColor={colors.textLight}
                value={description}
                onChangeText={setDescription}
              />

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: transactionType === 'income' ? colors.income : colors.expense }]}
                onPress={handleAddTransaction}
                activeOpacity={0.8}
              >
                <Feather name="check" size={20} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* 1. Total Assets Card */}
      <StaggeredItem index={0}>
        <View style={[styles.totalAssetsCard, { backgroundColor: colors.primary }]}>
          <View style={styles.totalAssetsHeader}>
            <View style={[styles.totalAssetsIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Feather name="briefcase" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.totalAssetsLabel}>{t('home.totalAssets')}</Text>
          </View>
          <Text style={styles.totalAssetsAmount}>{formatCurrency(totalAssets, currentLanguage)}</Text>
          <Text style={styles.totalAssetsSubtext}>{accountsCount} {t('home.accountCount')}</Text>
        </View>
      </StaggeredItem>

      <StaggeredItem index={1}>
        {renderCalendar()}
      </StaggeredItem>

      <StaggeredItem index={2}>
        <View style={styles.statsContainer}>
          <View style={[styles.balanceCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.balanceLabel, { color: colors.textLight }]}>{t('home.totalBalance')}</Text>
            <Text style={[styles.balanceAmount, { color: summary.balance >= 0 ? colors.success : colors.danger }]}>
              {formatCurrency(summary.balance, currentLanguage)}
            </Text>
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 6 }}>
              <View style={[styles.miniCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.miniCardLabel, { color: colors.textLight }]}>{t('home.income')}</Text>
                <Text style={[styles.miniCardAmount, { color: colors.income }]}>{formatCurrency(summary.income, currentLanguage)}</Text>
              </View>
            </View>
            <View style={{ flex: 1, marginLeft: 6 }}>
              <View style={[styles.miniCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.miniCardLabel, { color: colors.textLight }]}>{t('home.expenses')}</Text>
                <Text style={[styles.miniCardAmount, { color: colors.expense }]}>{formatCurrency(summary.expense, currentLanguage)}</Text>
              </View>
            </View>
          </View>
        </View>
      </StaggeredItem>

      {/* 2. Monthly Comparison */}
      {summary.expense > 0 && (
        <StaggeredItem index={3}>
          <View style={[styles.comparisonCard, { backgroundColor: colors.card }]}>
            <View style={styles.comparisonHeader}>
              <Feather name="trending-up" size={20} color={colors.primary} />
              <Text style={[styles.comparisonTitle, { color: colors.text }]}>{t('home.vsLastMonth')}</Text>
            </View>
            {(() => {
              const diff = lastMonthExpense > 0 ? ((summary.expense - lastMonthExpense) / lastMonthExpense) * 100 : 0;
              const isDecreased = diff <= 0;
              const color = isDecreased ? colors.success : colors.danger;
              const icon = isDecreased ? 'arrow-down-right' : 'arrow-up-right';
              return (
                <View style={styles.comparisonContent}>
                  <View style={[styles.comparisonBadge, { backgroundColor: color + '15' }]}>
                    <Feather name={icon} size={18} color={color} />
                    <Text style={[styles.comparisonPercent, { color }]}>
                      %{Math.abs(diff).toFixed(1)}
                    </Text>
                  </View>
                  <Text style={[styles.comparisonText, { color: colors.textLight }]}>
                    {isDecreased ? t('home.decreased') : t('home.increased')}
                  </Text>
                  <Text style={[styles.comparisonDetail, { color: colors.textLight }]}>
                    {formatCurrency(lastMonthExpense, currentLanguage)} → {formatCurrency(summary.expense, currentLanguage)}
                  </Text>
                </View>
              );
            })()}
          </View>
        </StaggeredItem>
      )}

      {/* 3. Top Spending Categories */}
      {topCategories.length > 0 && (
        <StaggeredItem index={4}>
          <View style={[styles.dashSection, { backgroundColor: colors.card }]}>
            <Text style={[styles.dashSectionTitle, { color: colors.text, marginBottom: 12 }]}>{t('home.topCategories')}</Text>
            {(() => {
              const maxAmount = topCategories[0]?.total || 1;
              return topCategories.map((cat, index) => {
                const pct = (cat.total / maxAmount) * 100;
                return (
                  <View key={cat.id || index} style={styles.topCatRow}>
                    <View style={[styles.topCatIcon, { backgroundColor: (cat.color || colors.primary) + '15' }]}>
                      <Feather name={cat.icon || 'tag'} size={16} color={cat.color || colors.primary} />
                    </View>
                    <View style={styles.topCatInfo}>
                      <View style={styles.topCatLabelRow}>
                        <Text style={[styles.topCatName, { color: colors.text }]}>{cat.name}</Text>
                        <Text style={[styles.topCatAmount, { color: colors.text }]}>{formatCurrency(cat.total, currentLanguage)}</Text>
                      </View>
                      <View style={[styles.topCatBarBg, { backgroundColor: colors.border + '40' }]}>
                        <View style={[styles.topCatBarFill, { width: `${pct}%`, backgroundColor: cat.color || colors.primary }]} />
                      </View>
                    </View>
                  </View>
                );
              });
            })()}
          </View>
        </StaggeredItem>
      )}

      {/* 4. Upcoming Bills Warning */}
      {(upcomingBills.length > 0 || overdueBills.length > 0) && (
        <StaggeredItem index={5}>
          <TouchableOpacity
            style={[styles.dashSection, { backgroundColor: colors.card }]}
            onPress={() => navigation.navigate('Bills')}
            activeOpacity={0.7}
          >
            <View style={styles.dashSectionHeader}>
              <Text style={[styles.dashSectionTitle, { color: colors.text }]}>{t('home.upcomingBills')}</Text>
              <View style={styles.billBadges}>
                {overdueBills.length > 0 && (
                  <View style={[styles.billBadge, { backgroundColor: colors.danger }]}>
                    <Text style={styles.billBadgeText}>{overdueBills.length} {t('home.overdueBillsLabel')}</Text>
                  </View>
                )}
                {upcomingBills.length > 0 && (
                  <View style={[styles.billBadge, { backgroundColor: colors.warning }]}>
                    <Text style={styles.billBadgeText}>{upcomingBills.length}</Text>
                  </View>
                )}
              </View>
            </View>
            {overdueBills.slice(0, 2).map((bill) => (
              <View key={`overdue-${bill.id}`} style={styles.billRow}>
                <View style={[styles.billDot, { backgroundColor: colors.danger }]} />
                <Text style={[styles.billName, { color: colors.text }]} numberOfLines={1}>{bill.name}</Text>
                <Text style={[styles.billAmount, { color: colors.danger }]}>{formatCurrency(bill.amount, currentLanguage)}</Text>
              </View>
            ))}
            {upcomingBills.slice(0, 3).map((bill) => (
              <View key={`upcoming-${bill.id}`} style={styles.billRow}>
                <View style={[styles.billDot, { backgroundColor: colors.warning }]} />
                <Text style={[styles.billName, { color: colors.text }]} numberOfLines={1}>{bill.name}</Text>
                <Text style={[styles.billAmount, { color: colors.textLight }]}>{formatCurrency(bill.amount, currentLanguage)}</Text>
              </View>
            ))}
          </TouchableOpacity>
        </StaggeredItem>
      )}

      {/* 5. Budget Status */}
      {budgetStatus.length > 0 && (
        <StaggeredItem index={6}>
          <View style={[styles.dashSection, { backgroundColor: colors.card }]}>
            <View style={styles.dashSectionHeader}>
              <Text style={[styles.dashSectionTitle, { color: colors.text }]}>{t('home.budgetStatus')}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Budget')}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>{t('home.viewAll')}</Text>
              </TouchableOpacity>
            </View>
            {budgetStatus.slice(0, 4).map((b) => {
              const pct = Math.min(b.percentage, 100);
              const barColor = b.percentage > 100 ? colors.danger : b.percentage > 80 ? colors.warning : colors.success;
              return (
                <View key={b.id} style={styles.budgetRow}>
                  <View style={styles.budgetLabelRow}>
                    <View style={styles.budgetLabelLeft}>
                      <Feather name={b.icon || 'tag'} size={14} color={b.color || colors.primary} />
                      <Text style={[styles.budgetName, { color: colors.text }]}>{b.category_name}</Text>
                    </View>
                    <Text style={[styles.budgetPct, { color: barColor }]}>
                      {b.percentage > 100
                        ? `${t('home.budgetOverspent')}`
                        : `%${Math.round(b.percentage)} ${t('home.ofBudget')}`}
                    </Text>
                  </View>
                  <View style={[styles.budgetBarBg, { backgroundColor: colors.border + '40' }]}>
                    <View style={[styles.budgetBarFill, { width: `${pct}%`, backgroundColor: barColor }]} />
                  </View>
                  <Text style={[styles.budgetAmounts, { color: colors.textLight }]}>
                    {formatCurrency(b.spent, currentLanguage)} / {formatCurrency(b.amount, currentLanguage)}
                  </Text>
                </View>
              );
            })}
          </View>
        </StaggeredItem>
      )}

      {/* 6. Savings Goals */}
      {savingsGoals.length > 0 && (
        <StaggeredItem index={7}>
          <View style={[styles.dashSection, { backgroundColor: colors.card }]}>
            <View style={styles.dashSectionHeader}>
              <Text style={[styles.dashSectionTitle, { color: colors.text }]}>{t('home.savingsProgress')}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('SavingsGoals')}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>{t('home.viewAll')}</Text>
              </TouchableOpacity>
            </View>
            {savingsGoals.slice(0, 3).map((goal) => {
              const pct = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
              const clampedPct = Math.min(pct, 100);
              return (
                <View key={goal.id} style={styles.savingsRow}>
                  <View style={[styles.savingsIcon, { backgroundColor: (goal.color || colors.primary) + '15' }]}>
                    <Feather name={goal.icon || 'target'} size={18} color={goal.color || colors.primary} />
                  </View>
                  <View style={styles.savingsInfo}>
                    <View style={styles.savingsLabelRow}>
                      <Text style={[styles.savingsName, { color: colors.text }]} numberOfLines={1}>{goal.name}</Text>
                      <Text style={[styles.savingsPct, { color: colors.textLight }]}>{Math.round(pct)}%</Text>
                    </View>
                    <View style={[styles.savingsBarBg, { backgroundColor: colors.border + '40' }]}>
                      <View style={[styles.savingsBarFill, { width: `${clampedPct}%`, backgroundColor: goal.color || colors.primary }]} />
                    </View>
                    <Text style={[styles.savingsAmounts, { color: colors.textLight }]}>
                      {formatCurrency(goal.current_amount, currentLanguage)} / {formatCurrency(goal.target_amount, currentLanguage)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </StaggeredItem>
      )}

      <StaggeredItem index={8}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('home.recentTransactions')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>{t('home.seeAll')}</Text>
            </TouchableOpacity>
          </View>
          {recentTransactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="inbox" size={48} color={colors.textLight} />
              <Text style={[styles.emptyText, { color: colors.textLight }]}>{t('home.noTransactions')}</Text>
              <TouchableOpacity style={[styles.addTransactionButton, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate('Transactions')}>
                <Text style={styles.addTransactionText}>{t('home.addTransaction')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            recentTransactions.map((transaction) => (
              <TransactionItem key={transaction.id} transaction={transaction} onPress={() => navigation.navigate('Transactions')} />
            ))
          )}
        </View>
      </StaggeredItem>

      <StaggeredItem index={9}>
        <View style={styles.quickActions}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('home.quickActions')}</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.card }]} onPress={() => navigation.navigate('Budget')}>
              <Feather name="pie-chart" size={24} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.text }]}>{t('home.budgets')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.card }]} onPress={() => navigation.navigate('Reports')}>
              <Feather name="bar-chart-2" size={24} color={colors.secondary} />
              <Text style={[styles.actionText, { color: colors.text }]}>{t('nav.reports')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.card }]} onPress={() => navigation.navigate('Tips')}>
              <Feather name="book-open" size={24} color={colors.info} />
              <Text style={[styles.actionText, { color: colors.text }]}>{t('nav.tips')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.card }]} onPress={() => navigation.navigate('Transactions')}>
              <Feather name="list" size={24} color={colors.warning} />
              <Text style={[styles.actionText, { color: colors.text }]}>{t('home.allTransactions')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </StaggeredItem>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  greeting: { fontSize: 24, fontWeight: '700' },
  userName: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  menuButton: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  addButton: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 90, paddingRight: 20 },
  menuContainer: { borderRadius: 12, minWidth: 200, elevation: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  menuText: { fontSize: 16, fontWeight: '600', marginLeft: 12 },
  menuDivider: { height: 1, marginHorizontal: 16 },

  // Calendar
  calendarContainer: { marginHorizontal: 20, borderRadius: 16, padding: 16, marginBottom: 16 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  calendarArrow: { padding: 8 },
  calendarTitle: { fontSize: 18, fontWeight: '700' },
  calendarWeekHeader: { flexDirection: 'row', marginBottom: 8 },
  calendarDayHeader: { width: DAY_SIZE, alignItems: 'center', paddingVertical: 8 },
  calendarDayHeaderText: { fontSize: 12, fontWeight: '600' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarDay: { width: DAY_SIZE, height: DAY_SIZE, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  calendarDayToday: {},
  calendarDayWithData: {},
  calendarDayText: { fontSize: 14 },
  calendarDayTodayText: { fontWeight: '700' },
  dayIndicators: { flexDirection: 'row', marginTop: 2 },
  dayDot: { width: 4, height: 4, borderRadius: 2, marginHorizontal: 1 },

  // Picker Modal
  pickerModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerBackdrop: { flex: 1 },
  pickerContainer: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  pickerTitle: { fontSize: 20, fontWeight: '700' },
  pickerLabel: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  yearScroll: { marginBottom: 20 },
  yearChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginRight: 8, borderWidth: 1 },
  yearChipActive: {},
  yearChipText: { fontSize: 16, fontWeight: '600' },
  yearChipTextActive: { color: '#FFFFFF' },
  monthsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  monthChip: { width: '31%', paddingVertical: 12, borderRadius: 12, marginRight: '2%', marginBottom: 8, alignItems: 'center', borderWidth: 1 },
  monthChipActive: {},
  monthChipText: { fontSize: 14, fontWeight: '600' },
  monthChipTextActive: { color: '#FFFFFF' },

  // Day Modal - Professional Design
  dayModalContainer: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 30, maxHeight: '80%' },
  dayModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  dayModalDate: { fontSize: 42, fontWeight: '800' },
  dayModalMonth: { fontSize: 16, fontWeight: '500' },
  closeButton: { padding: 4 },
  dayStatsContainer: { flexDirection: 'row', borderRadius: 16, padding: 16, marginBottom: 20 },
  dayStat: { flex: 1, alignItems: 'center' },
  dayStatDivider: { width: 1, marginHorizontal: 16 },
  dayStatLabel: { fontSize: 12, marginTop: 6, marginBottom: 4 },
  dayStatValue: { fontSize: 18, fontWeight: '700' },
  dayTransactionsList: { maxHeight: 200, marginBottom: 20 },
  dayTransactionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  dayTransactionIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  dayTransactionInfo: { flex: 1 },
  dayTransactionCategory: { fontSize: 15, fontWeight: '600' },
  dayTransactionDesc: { fontSize: 12, marginTop: 2 },
  dayTransactionAmount: { fontSize: 15, fontWeight: '700' },
  emptyDayState: { alignItems: 'center', paddingVertical: 40 },
  emptyDayText: { fontSize: 14, marginTop: 10 },
  dayActionButtons: { flexDirection: 'row', gap: 12 },
  dayActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  incomeBtn: {},
  expenseBtn: {},
  dayActionBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  // Add Transaction Modal - Professional Design
  addModalWrapper: { justifyContent: 'flex-end' },
  addModalContainer: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  addModalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  addModalTypeIndicator: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  addModalTitle: { flex: 1, fontSize: 20, fontWeight: '700' },
  addModalDateBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, marginBottom: 20, alignSelf: 'flex-start', gap: 8 },
  addModalDateText: { fontSize: 14, fontWeight: '600' },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  amountInputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 16 },
  currencySymbol: { fontSize: 24, fontWeight: '700', marginRight: 8 },
  amountInput: { flex: 1, fontSize: 24, fontWeight: '700', paddingVertical: 16 },
  descInput: { padding: 16, borderRadius: 12, fontSize: 16, borderWidth: 1 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12, marginTop: 24, gap: 8 },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  // Stats
  statsContainer: { padding: 20, paddingTop: 0 },
  balanceCard: { padding: 20, borderRadius: 16, marginBottom: 12, alignItems: 'center' },
  balanceLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  balanceAmount: { fontSize: 36, fontWeight: '700' },
  row: { flexDirection: 'row' },
  miniCard: { padding: 16, borderRadius: 12 },
  miniCardLabel: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  miniCardAmount: { fontSize: 20, fontWeight: '700' },
  section: { padding: 20, paddingTop: 0 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  seeAll: { fontSize: 14, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16, marginTop: 12, marginBottom: 20 },
  addTransactionButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  addTransactionText: { color: '#FFFFFF', fontWeight: '600' },
  quickActions: { padding: 20, paddingTop: 0 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  actionCard: { width: '48%', padding: 20, borderRadius: 12, alignItems: 'center', marginBottom: 12, marginRight: '2%' },
  actionText: { fontSize: 14, fontWeight: '600', marginTop: 8 },

  // Total Assets Card
  totalAssetsCard: { marginHorizontal: 20, borderRadius: 16, padding: 20, marginBottom: 16 },
  totalAssetsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  totalAssetsIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  totalAssetsLabel: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', opacity: 0.9 },
  totalAssetsAmount: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  totalAssetsSubtext: { fontSize: 13, color: '#FFFFFF', opacity: 0.7 },

  // Monthly Comparison
  comparisonCard: { marginHorizontal: 20, borderRadius: 16, padding: 16, marginBottom: 16 },
  comparisonHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  comparisonTitle: { fontSize: 14, fontWeight: '600', marginLeft: 8 },
  comparisonContent: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  comparisonBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 4 },
  comparisonPercent: { fontSize: 16, fontWeight: '700' },
  comparisonText: { fontSize: 13 },
  comparisonDetail: { fontSize: 12, marginLeft: 'auto' },

  // Dashboard Sections (shared)
  dashSection: { marginHorizontal: 20, borderRadius: 16, padding: 16, marginBottom: 16 },
  dashSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dashSectionTitle: { fontSize: 16, fontWeight: '700' },

  // Top Categories
  topCatRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  topCatIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  topCatInfo: { flex: 1 },
  topCatLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  topCatName: { fontSize: 14, fontWeight: '600' },
  topCatAmount: { fontSize: 14, fontWeight: '600' },
  topCatBarBg: { height: 6, borderRadius: 3 },
  topCatBarFill: { height: 6, borderRadius: 3 },

  // Bills
  billBadges: { flexDirection: 'row', gap: 6 },
  billBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  billBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  billRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  billDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  billName: { flex: 1, fontSize: 14, fontWeight: '500' },
  billAmount: { fontSize: 14, fontWeight: '600' },

  // Budget Status
  budgetRow: { marginBottom: 14 },
  budgetLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  budgetLabelLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  budgetName: { fontSize: 13, fontWeight: '600' },
  budgetPct: { fontSize: 12, fontWeight: '600' },
  budgetBarBg: { height: 6, borderRadius: 3, marginBottom: 4 },
  budgetBarFill: { height: 6, borderRadius: 3 },
  budgetAmounts: { fontSize: 11 },

  // Savings Goals
  savingsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  savingsIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  savingsInfo: { flex: 1 },
  savingsLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  savingsName: { fontSize: 14, fontWeight: '600', flex: 1 },
  savingsPct: { fontSize: 12, fontWeight: '600', marginLeft: 8 },
  savingsBarBg: { height: 6, borderRadius: 3, marginBottom: 4 },
  savingsBarFill: { height: 6, borderRadius: 3 },
  savingsAmounts: { fontSize: 11 },
});

export default HomeScreen;
