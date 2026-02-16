import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import CategoryPicker from '../components/CategoryPicker';
import {
  apiGetCategories,
  apiGetBudgets,
  apiSetBudget,
  apiGetCategorySpending,
  apiGetCategoryTransactions,
} from '../services/api';
import { getCurrentMonth, getCurrentYear, getMonthName } from '../utils/dateUtils';
import { formatCurrency } from '../utils/currency';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

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

const BudgetScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t, currentLanguage } = useLanguage();
  const themeContext = useTheme();
  const colors = themeContext?.colors || defaultColors;
  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [spending, setSpending] = useState({});
  const [currentMonth] = useState(getCurrentMonth());
  const [currentYear] = useState(getCurrentYear());

  // Detail modal states
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [categoryTransactions, setCategoryTransactions] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });

    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    if (!user?.id) return;

    try {
      const cats = await apiGetCategories('expense');
      setCategories(cats);

      const buds = await apiGetBudgets(currentMonth.toString().padStart(2, '0'), currentYear);
      setBudgets(buds);

      const spendingData = {};
      for (const cat of cats) {
        const spent = await apiGetCategorySpending(cat.id, currentMonth, currentYear);
        spendingData[cat.id] = spent;
      }
      setSpending(spendingData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleSetBudget = async () => {
    if (!budgetAmount || parseFloat(budgetAmount) <= 0) {
      Alert.alert(t('common.error'), t('budget.validBudgetAmount'));
      return;
    }

    if (!selectedCategory) {
      Alert.alert(t('common.error'), t('transactions.selectCategoryError'));
      return;
    }

    try {
      await apiSetBudget(
        selectedCategory.id,
        parseFloat(budgetAmount),
        currentMonth.toString().padStart(2, '0'),
        currentYear
      );

      setModalVisible(false);
      setBudgetAmount('');
      setSelectedCategory(null);
      loadData();
    } catch (error) {
      console.error('Error setting budget:', error);
      Alert.alert(t('common.error'), 'Failed to set budget');
    }
  };

  const handleBudgetPress = async (budget) => {
    setSelectedBudget(budget);
    try {
      const transactions = await apiGetCategoryTransactions(
        budget.category_id,
        currentMonth,
        currentYear
      );
      setCategoryTransactions(transactions);
      setDetailModalVisible(true);
    } catch (error) {
      console.error('Error loading category transactions:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getDate()} ${getMonthName(date.getMonth() + 1, currentLanguage)}`;
  };

  const getBudgetStatus = (budget) => {
    const spent = spending[budget.category_id] || 0;
    const percentage = (spent / budget.amount) * 100;

    if (percentage >= 100) return { color: colors.danger, status: t('budget.overBudget') };
    if (percentage >= 90) return { color: colors.warning, status: t('budget.almostThere') };
    if (percentage >= 70) return { color: colors.info || colors.secondary, status: t('budget.onTrack') };
    return { color: colors.success, status: t('budget.great') };
  };

  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + (spending[b.category_id] || 0), 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('budget.title')}</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <Feather name="plus" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.monthText, { color: colors.textLight }]}>{getMonthName(currentMonth, currentLanguage)} {currentYear}</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.textLight }]}>{t('budget.totalBudget')}</Text>
            <Text style={[styles.summaryAmount, { color: colors.text }]}>{formatCurrency(totalBudget, currentLanguage)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.textLight }]}>{t('budget.spent')}</Text>
            <Text style={[styles.summaryAmount, { color: colors.expense }]}>
              {formatCurrency(totalSpent, currentLanguage)}
            </Text>
          </View>
        </View>
        <View style={[styles.progressBar, { backgroundColor: colors.light }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min((totalSpent / totalBudget) * 100, 100) || 0}%`,
                backgroundColor: totalSpent > totalBudget ? colors.danger : colors.primary,
              },
            ]}
          />
        </View>
        <Text style={[styles.remainingText, { color: colors.success }]}>
          {formatCurrency(Math.max(totalBudget - totalSpent, 0), currentLanguage)} {t('budget.remaining')}
        </Text>
      </View>

      <ScrollView
        style={styles.budgetsList}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {budgets.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="pie-chart" size={48} color={colors.textLight} />
            <Text style={[styles.emptyText, { color: colors.textLight }]}>{t('budget.noBudgets')}</Text>
            <TouchableOpacity
              style={[styles.addBudgetButton, { backgroundColor: colors.primary }]}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.addBudgetText}>{t('budget.setBudget')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          budgets.map((budget) => {
            const spent = spending[budget.category_id] || 0;
            const percentage = Math.min((spent / budget.amount) * 100, 100);
            const status = getBudgetStatus(budget);

            return (
              <TouchableOpacity
                key={budget.id}
                style={[styles.budgetCard, { backgroundColor: colors.card }]}
                onPress={() => handleBudgetPress(budget)}
              >
                <View style={styles.budgetHeader}>
                  <View style={styles.budgetInfo}>
                    <View
                      style={[
                        styles.categoryIcon,
                        { backgroundColor: budget.color + '20' },
                      ]}
                    >
                      <Feather name={budget.icon || 'tag'} size={20} color={budget.color} />
                    </View>
                    <View>
                      <Text style={[styles.categoryName, { color: colors.text }]}>{budget.category_name}</Text>
                      <Text style={[styles.statusText, { color: status.color }]}>
                        {status.status}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.budgetAmounts}>
                    <Text style={[styles.spentText, { color: colors.text }]}>
                      {formatCurrency(spent, currentLanguage)} / {formatCurrency(budget.amount, currentLanguage)}
                    </Text>
                    <Feather name="chevron-right" size={16} color={colors.textLight} />
                  </View>
                </View>

                <View style={[styles.progressBar, { backgroundColor: colors.light }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${percentage}%`,
                        backgroundColor: status.color,
                      },
                    ]}
                  />
                </View>

                <Text style={[styles.percentageText, { color: colors.textLight }]}>{percentage.toFixed(0)}% {t('budget.used')}</Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Set Budget Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={[styles.modalContent, { backgroundColor: colors.modalBackground }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>{t('budget.setBudget')}</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Feather name="x" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.label, { color: colors.text }]}>{t('transactions.selectCategory')}</Text>
                <CategoryPicker
                  categories={categories}
                  selectedCategory={selectedCategory}
                  onSelect={setSelectedCategory}
                />

                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                  placeholder={t('budget.budgetAmount')}
                  placeholderTextColor={colors.textLight}
                  keyboardType="numeric"
                  value={budgetAmount}
                  onChangeText={setBudgetAmount}
                />

                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: colors.primary }]}
                  onPress={handleSetBudget}
                >
                  <Text style={styles.submitButtonText}>{t('budget.setBudget')}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* Budget Detail Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDetailModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.detailModalContent, { backgroundColor: colors.modalBackground }]}>
              {selectedBudget && (
                <>
                  <View style={styles.modalHeader}>
                    <View style={styles.detailHeaderInfo}>
                      <View
                        style={[
                          styles.detailCategoryIcon,
                          { backgroundColor: selectedBudget.color + '20' },
                        ]}
                      >
                        <Feather name={selectedBudget.icon || 'tag'} size={24} color={selectedBudget.color} />
                      </View>
                      <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedBudget.category_name}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                      <Feather name="x" size={24} color={colors.text} />
                    </TouchableOpacity>
                  </View>

                  {/* Budget Progress */}
                  <View style={styles.detailProgressContainer}>
                    <View style={styles.detailProgressInfo}>
                      <Text style={[styles.detailSpentLabel, { color: colors.textLight }]}>{t('budget.spent')}</Text>
                      <Text style={[styles.detailSpentAmount, { color: colors.expense }]}>
                        {formatCurrency(spending[selectedBudget.category_id] || 0, currentLanguage)}
                      </Text>
                    </View>
                    <View style={styles.detailProgressInfo}>
                      <Text style={[styles.detailSpentLabel, { color: colors.textLight }]}>{t('budget.totalBudget')}</Text>
                      <Text style={[styles.detailSpentAmount, { color: colors.text }]}>
                        {formatCurrency(selectedBudget.amount, currentLanguage)}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.detailProgressBar, { backgroundColor: colors.light }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(((spending[selectedBudget.category_id] || 0) / selectedBudget.amount) * 100, 100)}%`,
                          backgroundColor: getBudgetStatus(selectedBudget).color,
                        },
                      ]}
                    />
                  </View>

                  <Text style={[styles.detailRemainingText, { color: colors.success }]}>
                    {formatCurrency(Math.max(selectedBudget.amount - (spending[selectedBudget.category_id] || 0), 0), currentLanguage)} {t('budget.remaining')}
                  </Text>

                  {/* Transactions List */}
                  <Text style={[styles.transactionsTitle, { color: colors.text, borderTopColor: colors.border }]}>{t('budget.transactions') || 'Transactions'}</Text>

                  <ScrollView style={styles.transactionsList}>
                    {categoryTransactions.length === 0 ? (
                      <View style={styles.emptyTransactions}>
                        <Feather name="inbox" size={32} color={colors.textLight} />
                        <Text style={[styles.emptyTransactionsText, { color: colors.textLight }]}>
                          {t('budget.noTransactions') || 'No transactions yet'}
                        </Text>
                      </View>
                    ) : (
                      categoryTransactions.map((transaction) => (
                        <View key={transaction.id} style={[styles.transactionItem, { borderBottomColor: colors.border }]}>
                          <View style={[styles.transactionDate, { backgroundColor: colors.light }]}>
                            <Text style={[styles.transactionDateText, { color: colors.text }]}>{formatDate(transaction.date)}</Text>
                          </View>
                          <View style={styles.transactionInfo}>
                            <Text style={[styles.transactionDesc, { color: colors.text }]}>
                              {transaction.description || t('transactions.noDescription')}
                            </Text>
                          </View>
                          <Text style={[styles.transactionAmount, { color: colors.expense }]}>
                            -{formatCurrency(transaction.amount, currentLanguage)}
                          </Text>
                        </View>
                      ))
                    )}
                  </ScrollView>
                </>
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  summaryCard: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  monthText: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: '700',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  remainingText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  budgetsList: {
    flex: 1,
    padding: 20,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
    marginBottom: 20,
  },
  addBudgetButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addBudgetText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  budgetCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  budgetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  budgetAmounts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  spentText: {
    fontSize: 14,
    fontWeight: '600',
  },
  percentageText: {
    fontSize: 12,
    textAlign: 'right',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  keyboardAvoidingView: {
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 16,
    marginTop: 16,
    borderWidth: 1,
  },
  submitButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  // Detail Modal Styles
  detailModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  detailHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailCategoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailProgressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailProgressInfo: {
    alignItems: 'center',
  },
  detailSpentLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  detailSpentAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  detailProgressBar: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  detailRemainingText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 20,
  },
  transactionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    borderTopWidth: 1,
    paddingTop: 16,
  },
  transactionsList: {
    maxHeight: 300,
  },
  emptyTransactions: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyTransactionsText: {
    fontSize: 14,
    marginTop: 8,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  transactionDate: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 12,
  },
  transactionDateText: {
    fontSize: 12,
    fontWeight: '600',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDesc: {
    fontSize: 14,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
});

export default BudgetScreen;
