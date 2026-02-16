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
  LayoutAnimation,
  UIManager,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';

// Android için LayoutAnimation'ı etkinleştir
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DateTimePicker from '@react-native-community/datetimepicker';
import SwipeableTransactionItem from '../components/SwipeableTransactionItem';
import CategoryPicker from '../components/CategoryPicker';
import AccountPicker from '../components/AccountPicker';
import AnimatedScreen, { StaggeredItem } from '../components/AnimatedScreen';
import {
  apiGetTransactions,
  apiGetCategories,
  apiGetAccounts,
  apiAddTransaction,
  apiSoftDeleteTransaction,
  apiTogglePinTransaction,
  apiToggleArchiveTransaction,
} from '../services/api';
import { getCurrentMonth, getCurrentYear, formatDateForDB } from '../utils/dateUtils';
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
  income: '#50D890',
  expense: '#FF4646',
  background: '#EFFFFB',
  card: '#FFFFFF',
  text: '#272727',
  textLight: '#666666',
  border: '#D0D0D0',
  surface: '#FFFFFF',
  modalBackground: '#FFFFFF',
  inputBackground: '#FFFFFF',
};

const TransactionsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t, currentLanguage } = useLanguage();
  const themeContext = useTheme();
  const colors = themeContext?.colors || defaultColors;
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [transactionType, setTransactionType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentMonth] = useState(getCurrentMonth());
  const [currentYear] = useState(getCurrentYear());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState(null);

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
      const txs = await apiGetTransactions(currentMonth, currentYear);
      setTransactions(txs);

      const cats = await apiGetCategories();
      setCategories(cats);

      // Reset filterCategory if the selected category no longer exists
      setFilterCategory(prev => {
        if (prev !== null && !cats.some(c => c.id === prev)) return null;
        return prev;
      });

      const accs = await apiGetAccounts();
      setAccounts(accs);
    } catch (error) {
      console.error('Error loading data:', error);
    }
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
      await apiAddTransaction(
        transactionType,
        parseFloat(amount),
        selectedCategory.id,
        description,
        formatDateForDB(selectedDate),
        selectedAccountId
      );

      setModalVisible(false);
      setAmount('');
      setDescription('');
      setSelectedCategory(null);
      setSelectedAccountId(null);
      setSelectedDate(new Date());
      loadData();
    } catch (error) {
      console.error('Error adding transaction:', error);
      Alert.alert(t('common.error'), 'Failed to add transaction');
    }
  };

  const onDateChange = (event, date) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleDeleteTransaction = async (id) => {
    try {
      // Smooth animasyon başlat
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

      await apiSoftDeleteTransaction(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  const handlePinTransaction = async (id, isPinned) => {
    try {
      const now = new Date().toISOString();
      await apiTogglePinTransaction(id, isPinned);

      // Smooth animasyon başlat
      LayoutAnimation.configureNext(
        LayoutAnimation.create(
          300,
          LayoutAnimation.Types.easeInEaseOut,
          LayoutAnimation.Properties.opacity
        )
      );

      // Hemen local state'i güncelle ve sırala
      setTransactions(prev => {
        const updated = prev.map(t =>
          t.id === id ? { ...t, is_pinned: isPinned ? 1 : 0, pinned_at: isPinned ? now : null } : t
        );
        // Sabitlenenler üstte (en son sabitlenen en üstte), sonra tarihe göre sırala
        return updated.sort((a, b) => {
          const aPinned = a.is_pinned || 0;
          const bPinned = b.is_pinned || 0;
          if (bPinned !== aPinned) return bPinned - aPinned;
          // İkisi de sabitliyse, en son sabitlenen üstte
          if (aPinned && bPinned) {
            return new Date(b.pinned_at || 0) - new Date(a.pinned_at || 0);
          }
          return new Date(b.date) - new Date(a.date);
        });
      });
    } catch (error) {
      console.error('Error pinning transaction:', error);
    }
  };

  const handleArchiveTransaction = async (id, isArchived) => {
    try {
      // Smooth animasyon başlat
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

      await apiToggleArchiveTransaction(id, isArchived);
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error archiving transaction:', error);
    }
  };

  const openAddModal = (type) => {
    setTransactionType(type);
    setModalVisible(true);
    setSelectedCategory(null);
    const defaultAcc = accounts.find(a => a.is_default === 1);
    setSelectedAccountId(defaultAcc ? defaultAcc.id : null);
    setSelectedDate(new Date());
    setShowDatePicker(false);
  };

  const filteredCategories = categories.filter(c => c.type === transactionType);

  // Categories shown in filter chips (based on filterType)
  const displayCategories = filterType === 'all'
    ? categories
    : categories.filter(c => c.type === filterType);

  // Filtered transactions for display
  const isFilterActive = searchQuery !== '' || filterType !== 'all' || filterCategory !== null;

  const filteredTransactions = transactions.filter(tx => {
    // Type filter
    if (filterType !== 'all' && tx.type !== filterType) return false;
    // Category filter
    if (filterCategory !== null && tx.category_id !== filterCategory) return false;
    // Search filter
    if (searchQuery !== '') {
      const query = searchQuery.toLowerCase();
      const desc = (tx.description || '').toLowerCase();
      const catName = (tx.category_name || '').toLowerCase();
      // Also search translated category name
      const catKey = (tx.category_name || '').toLowerCase();
      const translatedCatName = t(`categories.${catKey}`)?.toLowerCase() || '';
      if (!desc.includes(query) && !catName.includes(query) && !translatedCatName.includes(query)) {
        return false;
      }
    }
    return true;
  });

  // Summary totals always use unfiltered transactions
  const incomeTotal = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const expenseTotal = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <GestureHandlerRootView style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <StaggeredItem index={0}>
        <View style={styles.header}>
          <View style={styles.headerSide}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Feather name="arrow-left" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('transactions.title')}</Text>
          <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => navigation.navigate('Archive')}
              >
                <Feather name="archive" size={20} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => navigation.navigate('Trash')}
              >
                <Feather name="trash-2" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </StaggeredItem>

      <StaggeredItem index={1}>
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.textLight }]}>{t('home.income')}</Text>
            <Text style={[styles.summaryAmount, { color: colors.income }]}>
              {formatCurrency(incomeTotal, currentLanguage)}
            </Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.textLight }]}>{t('home.expenses')}</Text>
            <Text style={[styles.summaryAmount, { color: colors.expense }]}>
              {formatCurrency(expenseTotal, currentLanguage)}
            </Text>
          </View>
        </View>
      </StaggeredItem>

      <StaggeredItem index={2}>
      <View style={styles.addButtons}>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.income }]}
          onPress={() => openAddModal('income')}
        >
          <Feather name="plus" size={20} color={colors.white} />
          <Text style={styles.addBtnText}>{t('transactions.addIncome')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.expense }]}
          onPress={() => openAddModal('expense')}
        >
          <Feather name="plus" size={20} color={colors.white} />
          <Text style={styles.addBtnText}>{t('transactions.addExpense')}</Text>
        </TouchableOpacity>
      </View>
      </StaggeredItem>

      <StaggeredItem index={3}>
        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
          <Feather name="search" size={20} color={colors.textLight} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t('transactions.searchPlaceholder')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textLight}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x" size={20} color={colors.textLight} />
            </TouchableOpacity>
          )}
        </View>

        {/* Type Filter Chips */}
        <View style={styles.typeFilterContainer}>
          {[
            { key: 'all', label: t('transactions.filterAll'), icon: 'layers', color: colors.primary },
            { key: 'income', label: t('transactions.filterIncome'), icon: 'trending-up', color: colors.income },
            { key: 'expense', label: t('transactions.filterExpense'), icon: 'trending-down', color: colors.expense },
          ].map(chip => {
            const isActive = filterType === chip.key;
            return (
              <TouchableOpacity
                key={chip.key}
                style={[
                  styles.typeChip,
                  {
                    backgroundColor: isActive ? chip.color : 'transparent',
                    borderColor: isActive ? chip.color : colors.border,
                  },
                ]}
                onPress={() => {
                  setFilterType(chip.key);
                  setFilterCategory(null);
                }}
              >
                <Feather name={chip.icon} size={16} color={isActive ? '#FFFFFF' : chip.color} />
                <Text style={[styles.typeChipText, { color: isActive ? '#FFFFFF' : colors.text }]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Category Filter Chips */}
        {displayCategories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryChipsScroll}
            contentContainerStyle={styles.categoryChipsContent}
          >
            <TouchableOpacity
              style={[
                styles.categoryChip,
                {
                  backgroundColor: filterCategory === null ? colors.primary : 'transparent',
                  borderColor: filterCategory === null ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setFilterCategory(null)}
            >
              <Text style={[styles.categoryChipText, { color: filterCategory === null ? '#FFFFFF' : colors.text }]}>
                {t('transactions.filterAll')}
              </Text>
            </TouchableOpacity>
            {displayCategories.map(cat => {
              const isActive = filterCategory === cat.id;
              const catColor = cat.color || colors.primary;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: isActive ? catColor : 'transparent',
                      borderColor: isActive ? catColor : colors.border,
                    },
                  ]}
                  onPress={() => setFilterCategory(isActive ? null : cat.id)}
                >
                  <Text style={[styles.categoryChipText, { color: isActive ? '#FFFFFF' : colors.text }]}>
                    {t(`categories.${cat.name.toLowerCase()}`) !== `categories.${cat.name.toLowerCase()}`
                      ? t(`categories.${cat.name.toLowerCase()}`)
                      : cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Results Count */}
        {isFilterActive && transactions.length > 0 && (
          <Text style={[styles.resultsText, { color: colors.textLight }]}>
            {filteredTransactions.length} {t('transactions.resultsFound')}
          </Text>
        )}
      </StaggeredItem>

      <ScrollView
        style={styles.transactionsList}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="inbox" size={48} color={colors.textLight} />
            <Text style={styles.emptyText}>{t('transactions.noTransactionsMonth')}</Text>
          </View>
        ) : filteredTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="search" size={48} color={colors.textLight} />
            <Text style={styles.emptyText}>{t('transactions.noResults')}</Text>
            <Text style={[styles.emptySubText, { color: colors.textLight }]}>{t('transactions.adjustFilters')}</Text>
          </View>
        ) : (
          filteredTransactions.map((transaction) => (
            <SwipeableTransactionItem
              key={transaction.id}
              transaction={transaction}
              onDelete={handleDeleteTransaction}
              onPin={handlePinTransaction}
              onArchive={handleArchiveTransaction}
            />
          ))
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.modalBackdrop} onPress={() => { Keyboard.dismiss(); setModalVisible(false); }} />
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalWrapper}
            >
              <View style={[styles.modalContainer, { backgroundColor: colors.modalBackground }]}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <View style={[styles.modalTypeIndicator, { backgroundColor: transactionType === 'income' ? colors.income : colors.expense }]}>
                  <Feather name={transactionType === 'income' ? 'trending-up' : 'trending-down'} size={20} color="#FFFFFF" />
                </View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {transactionType === 'income' ? t('transactions.addIncome') : t('transactions.addExpense')}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Feather name="x" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Date Badge */}
              <TouchableOpacity
                style={styles.dateBadge}
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setShowDatePicker(true);
                }}
              >
                <Feather name="calendar" size={16} color={colors.primary} />
                <Text style={styles.dateBadgeText}>
                  {selectedDate.toLocaleDateString(currentLanguage === 'tr' ? 'tr-TR' : 'en-US', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </Text>
                <Feather name="chevron-down" size={16} color={colors.primary} />
              </TouchableOpacity>

              {showDatePicker && (
                <View style={styles.datePickerInline}>
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="spinner"
                    onChange={onDateChange}
                    maximumDate={new Date()}
                    locale={currentLanguage === 'tr' ? 'tr-TR' : 'en-US'}
                    style={{ height: 100, backgroundColor: colors.inputBackground }}
                    textColor={colors.text}
                  />
                  <TouchableOpacity
                    style={styles.datePickerDoneBtn}
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setShowDatePicker(false);
                    }}
                  >
                    <Text style={styles.datePickerDoneText}>{t('common.done')}</Text>
                  </TouchableOpacity>
                </View>
              )}


              {/* Amount Input */}
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

              {/* Category Picker */}
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

              {/* Description Input */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>{t('transactions.descriptionOptional')}</Text>
              <TextInput
                style={[styles.descInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                placeholder={t('transactions.description')}
                placeholderTextColor={colors.textLight}
                value={description}
                onChangeText={setDescription}
              />

              {/* Submit Button */}
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
        </TouchableWithoutFeedback>
      </Modal>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: defaultColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  headerSide: {
    width: 60,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    color: defaultColors.text,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 4,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: defaultColors.card,
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: defaultColors.border,
    marginHorizontal: 20,
  },
  summaryLabel: {
    fontSize: 14,
    color: defaultColors.textLight,
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: '700',
  },
  addButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  addBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  addBtnText: {
    color: defaultColors.white,
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
  },
  transactionsList: {
    flex: 1,
    paddingHorizontal: 20,
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
    color: defaultColors.textLight,
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 14,
    marginTop: 6,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  typeFilterContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  typeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoryChipsScroll: {
    marginBottom: 12,
  },
  categoryChipsContent: {
    paddingHorizontal: 20,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  resultsText: {
    fontSize: 14,
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  // Modal Styles - Professional Design
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalWrapper: {
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: defaultColors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTypeIndicator: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: defaultColors.text,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: defaultColors.primary + '10',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 20,
    alignSelf: 'flex-start',
    gap: 8,
  },
  dateBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: defaultColors.primary,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: defaultColors.text,
    marginBottom: 8,
    marginTop: 16,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: defaultColors.light,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: defaultColors.border,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '700',
    color: defaultColors.textLight,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: defaultColors.text,
    paddingVertical: 16,
  },
  descInput: {
    backgroundColor: defaultColors.light,
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: defaultColors.border,
    color: defaultColors.text,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  submitBtnText: {
    color: defaultColors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  datePickerInline: {
    backgroundColor: defaultColors.white,
    borderRadius: 10,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: defaultColors.border,
  },
  datePickerDoneBtn: {
    backgroundColor: defaultColors.primary,
    paddingVertical: 8,
    alignItems: 'center',
  },
  datePickerDoneText: {
    color: defaultColors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default TransactionsScreen;
