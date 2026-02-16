import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Pressable,
  ScrollView,
  Switch,
  Animated,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Animated dropdown component
const AnimatedDropdown = ({ isOpen, children, itemCount }) => {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animValue, {
      toValue: isOpen ? 1 : 0,
      useNativeDriver: false,
      friction: 14,
      tension: 100,
    }).start();
  }, [isOpen]);

  const maxHeight = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.max(itemCount * 48, 48)],
  });

  const opacity = animValue.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0.5, 1],
  });

  const translateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 0],
  });

  return (
    <Animated.View style={{ maxHeight, opacity, transform: [{ translateY }], overflow: 'hidden' }}>
      {children}
    </Animated.View>
  );
};

// Animated chevron
const AnimatedChevron = ({ isOpen, color }) => {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(rotation, {
      toValue: isOpen ? 1 : 0,
      useNativeDriver: true,
      friction: 12,
      tension: 100,
    }).start();
  }, [isOpen]);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Feather name="chevron-down" size={18} color={color} />
    </Animated.View>
  );
};
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  apiGetRecurringTransactions,
  apiAddRecurringTransaction,
  apiUpdateRecurringTransaction,
  apiDeleteRecurringTransaction,
  apiToggleRecurringTransaction,
  apiGetCategories,
  apiGetAccounts,
} from '../services/api';

const defaultColors = {
  primary: '#50D890',
  secondary: '#4F98CA',
  background: '#EFFFFB',
  card: '#FFFFFF',
  text: '#272727',
  textLight: '#666666',
  border: '#D0D0D0',
  danger: '#FF4646',
  warning: '#FFA726',
};

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_VALUES = [1, 2, 3, 4, 5, 6, 7]; // 1=Monday ... 7=Sunday

const RecurringTransactionsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useLanguage();
  const themeContext = useTheme();
  const colors = themeContext?.colors || defaultColors;
  const isDarkMode = themeContext?.isDarkMode || false;

  const [recurrings, setRecurrings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form state
  const [formType, setFormType] = useState('expense');
  const [formAmount, setFormAmount] = useState('');
  const [formCategoryId, setFormCategoryId] = useState(null);
  const [formAccountId, setFormAccountId] = useState(null);
  const [formDescription, setFormDescription] = useState('');
  const [formFrequency, setFormFrequency] = useState('monthly');
  const [formDayOfWeek, setFormDayOfWeek] = useState(1);
  const [formDayOfMonth, setFormDayOfMonth] = useState(1);
  const [formStartDate, setFormStartDate] = useState('');
  const [formHasEndDate, setFormHasEndDate] = useState(false);
  const [formEndDate, setFormEndDate] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);

  const cardBg = isDarkMode ? '#1A1A1A' : colors.card;
  const inputBg = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    if (!user?.id) return;
    const [recs, cats, accs] = await Promise.all([
      apiGetRecurringTransactions(),
      apiGetCategories(),
      apiGetAccounts(),
    ]);
    setRecurrings(recs);
    setCategories(cats);
    setAccounts(accs);
  };

  const getTodayStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormType('expense');
    setFormAmount('');
    setFormCategoryId(null);
    setFormAccountId(null);
    setFormDescription('');
    setFormFrequency('monthly');
    setFormDayOfWeek(1);
    setFormDayOfMonth(1);
    setFormStartDate(getTodayStr());
    setFormHasEndDate(false);
    setFormEndDate('');
    setModalVisible(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormType(item.type);
    setFormAmount(String(item.amount));
    setFormCategoryId(item.category_id);
    setFormAccountId(item.account_id);
    setFormDescription(item.description || '');
    setFormFrequency(item.frequency);
    setFormDayOfWeek(item.day_of_week || 1);
    setFormDayOfMonth(item.day_of_month || 1);
    setFormStartDate(item.start_date);
    setFormHasEndDate(!!item.end_date);
    setFormEndDate(item.end_date || '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    const amount = parseFloat(formAmount);
    if (!amount || amount <= 0) {
      Alert.alert(t('common.error'), t('transactions.validAmount'));
      return;
    }

    try {
      if (editingItem) {
        await apiUpdateRecurringTransaction(
          editingItem.id, formType, amount, formCategoryId, formDescription,
          formAccountId, formFrequency,
          formFrequency === 'weekly' ? formDayOfWeek : null,
          formFrequency === 'monthly' ? formDayOfMonth : null,
          formStartDate, formHasEndDate ? formEndDate : null
        );
        Alert.alert(t('common.success'), t('recurring.updated'));
      } else {
        await apiAddRecurringTransaction(
          formType, amount, formCategoryId, formDescription,
          formAccountId, formFrequency,
          formFrequency === 'weekly' ? formDayOfWeek : null,
          formFrequency === 'monthly' ? formDayOfMonth : null,
          formStartDate, formHasEndDate ? formEndDate : null
        );
        Alert.alert(t('common.success'), t('recurring.added'));
      }
      setModalVisible(false);
      loadData();
    } catch (error) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  const handleDelete = (item) => {
    Alert.alert(
      t('common.delete'),
      t('recurring.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await apiDeleteRecurringTransaction(item.id);
            loadData();
          },
        },
      ]
    );
  };

  const handleToggle = async (item, value) => {
    await apiToggleRecurringTransaction(item.id, value);
    loadData();
  };

  const handleLongPress = (item) => {
    Alert.alert(
      item.description || item.category_name || t('recurring.title'),
      '',
      [
        { text: t('recurring.editRecurring'), onPress: () => openEditModal(item) },
        { text: t('common.delete'), style: 'destructive', onPress: () => handleDelete(item) },
        { text: t('common.cancel'), style: 'cancel' },
      ]
    );
  };

  const getFrequencyLabel = (item) => {
    if (item.frequency === 'daily') return t('recurring.everyDay');
    if (item.frequency === 'weekly') {
      const dayKey = DAY_KEYS[(item.day_of_week || 1) - 1];
      return `${t('recurring.weekly')}, ${t(`recurring.daysShort.${dayKey}`)}`;
    }
    if (item.frequency === 'monthly') {
      return `${t('recurring.monthly')}, ${item.day_of_month}.`;
    }
    return '';
  };

  const filteredCategories = categories.filter(c => c.type === formType);
  const selectedCategory = categories.find(c => c.id === formCategoryId);
  const selectedAccount = accounts.find(a => a.id === formAccountId);

  const renderItem = ({ item }) => {
    const isActive = item.is_active === 1;
    return (
      <TouchableOpacity
        style={[styles.itemCard, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.itemIcon, { backgroundColor: (item.color || colors.primary) + '20' }]}>
          <Feather name={item.icon || 'repeat'} size={20} color={item.color || colors.primary} />
        </View>
        <View style={styles.itemContent}>
          <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
            {item.category_name || item.description || t('transactions.uncategorized')}
          </Text>
          {item.description && item.category_name ? (
            <Text style={[styles.itemDesc, { color: colors.textLight }]} numberOfLines={1}>
              {item.description}
            </Text>
          ) : null}
          <Text style={[styles.itemFrequency, { color: colors.textLight }]}>
            {getFrequencyLabel(item)}
          </Text>
        </View>
        <View style={styles.itemRight}>
          <Text style={[styles.itemAmount, { color: item.type === 'income' ? '#4CAF50' : colors.danger }]}>
            {item.type === 'income' ? '+' : '-'}{item.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </Text>
          <Switch
            value={isActive}
            onValueChange={(val) => handleToggle(item, val)}
            trackColor={{ false: colors.border, true: '#C8F5DC' }}
            thumbColor={isActive ? colors.primary : '#f4f3f4'}
            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
          />
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Feather name="repeat" size={56} color={colors.textLight} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('recurring.noRecurring')}</Text>
      <Text style={[styles.emptyDesc, { color: colors.textLight }]}>{t('recurring.noRecurringDesc')}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('recurring.title')}</Text>
          <TouchableOpacity onPress={openAddModal} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Feather name="plus-circle" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={recurrings}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={recurrings.length === 0 ? { flex: 1 } : { paddingBottom: 40 }}
      />

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <Pressable style={{ flex: 1 }} onPress={() => { Keyboard.dismiss(); setModalVisible(false); }} />
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ justifyContent: 'flex-end' }}
            >
              <View style={[styles.modalContainer, { backgroundColor: cardBg }]}>
                <View style={styles.handle} />
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    {editingItem ? t('recurring.editRecurring') : t('recurring.addRecurring')}
                  </Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Feather name="x" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {/* Type selector */}
                  <Text style={[styles.label, { color: colors.textLight }]}>{t('transactions.title')}</Text>
                  <View style={styles.typeRow}>
                    <TouchableOpacity
                      style={[styles.typeChip, { backgroundColor: formType === 'expense' ? '#FF5252' : inputBg }]}
                      onPress={() => { setFormType('expense'); setFormCategoryId(null); }}
                    >
                      <Text style={[styles.typeChipText, { color: formType === 'expense' ? '#FFF' : colors.textLight }]}>
                        {t('transactions.addExpense')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.typeChip, { backgroundColor: formType === 'income' ? '#4CAF50' : inputBg }]}
                      onPress={() => { setFormType('income'); setFormCategoryId(null); }}
                    >
                      <Text style={[styles.typeChipText, { color: formType === 'income' ? '#FFF' : colors.textLight }]}>
                        {t('transactions.addIncome')}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Amount */}
                  <Text style={[styles.label, { color: colors.textLight }]}>{t('transactions.amount')}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBg, color: colors.text, borderColor: colors.border }]}
                    value={formAmount}
                    onChangeText={setFormAmount}
                    placeholder="0.00"
                    placeholderTextColor={colors.textLight}
                    keyboardType="decimal-pad"
                  />

                  {/* Category Picker */}
                  <Text style={[styles.label, { color: colors.textLight }]}>{t('transactions.selectCategory')}</Text>
                  <TouchableOpacity
                    style={[
                      styles.pickerButton,
                      { backgroundColor: inputBg, borderColor: showCategoryPicker ? colors.primary : colors.border },
                    ]}
                    onPress={() => { setShowCategoryPicker(!showCategoryPicker); setShowAccountPicker(false); }}
                    activeOpacity={0.7}
                  >
                    {selectedCategory ? (
                      <View style={styles.pickerSelected}>
                        <View style={[styles.pickerIcon, { backgroundColor: (selectedCategory.color || '#999') + '20' }]}>
                          <Feather name={selectedCategory.icon || 'tag'} size={16} color={selectedCategory.color || '#999'} />
                        </View>
                        <Text style={[styles.pickerText, { color: colors.text }]}>{selectedCategory.name}</Text>
                      </View>
                    ) : (
                      <Text style={[styles.pickerText, { color: colors.textLight }]}>{t('transactions.selectCategory')}</Text>
                    )}
                    <AnimatedChevron isOpen={showCategoryPicker} color={colors.textLight} />
                  </TouchableOpacity>
                  <AnimatedDropdown isOpen={showCategoryPicker} itemCount={filteredCategories.length}>
                    <View style={[styles.pickerList, { backgroundColor: inputBg }]}>
                      {filteredCategories.map((cat) => (
                        <TouchableOpacity
                          key={cat.id}
                          style={[styles.pickerItem, formCategoryId === cat.id && { backgroundColor: colors.primary + '20' }]}
                          onPress={() => { setFormCategoryId(cat.id); setShowCategoryPicker(false); }}
                          activeOpacity={0.6}
                        >
                          <View style={[styles.pickerIcon, { backgroundColor: (cat.color || '#999') + '20' }]}>
                            <Feather name={cat.icon || 'tag'} size={16} color={cat.color || '#999'} />
                          </View>
                          <Text style={[styles.pickerItemText, { color: colors.text }]}>{cat.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </AnimatedDropdown>

                  {/* Account Picker */}
                  <Text style={[styles.label, { color: colors.textLight }]}>{t('transactions.linkAccount')}</Text>
                  <TouchableOpacity
                    style={[
                      styles.pickerButton,
                      { backgroundColor: inputBg, borderColor: showAccountPicker ? colors.primary : colors.border },
                    ]}
                    onPress={() => { setShowAccountPicker(!showAccountPicker); setShowCategoryPicker(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pickerText, { color: selectedAccount ? colors.text : colors.textLight }]}>
                      {selectedAccount ? selectedAccount.name : t('transactions.noAccount')}
                    </Text>
                    <AnimatedChevron isOpen={showAccountPicker} color={colors.textLight} />
                  </TouchableOpacity>
                  <AnimatedDropdown isOpen={showAccountPicker} itemCount={accounts.length + 1}>
                    <View style={[styles.pickerList, { backgroundColor: inputBg }]}>
                      <TouchableOpacity
                        style={[styles.pickerItem, !formAccountId && { backgroundColor: colors.primary + '20' }]}
                        onPress={() => { setFormAccountId(null); setShowAccountPicker(false); }}
                        activeOpacity={0.6}
                      >
                        <Text style={[styles.pickerItemText, { color: colors.text }]}>{t('transactions.noAccount')}</Text>
                      </TouchableOpacity>
                      {accounts.map((acc) => (
                        <TouchableOpacity
                          key={acc.id}
                          style={[styles.pickerItem, formAccountId === acc.id && { backgroundColor: colors.primary + '20' }]}
                          onPress={() => { setFormAccountId(acc.id); setShowAccountPicker(false); }}
                          activeOpacity={0.6}
                        >
                          <Text style={[styles.pickerItemText, { color: colors.text }]}>{acc.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </AnimatedDropdown>

                  {/* Description */}
                  <Text style={[styles.label, { color: colors.textLight }]}>{t('transactions.description')}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBg, color: colors.text, borderColor: colors.border }]}
                    value={formDescription}
                    onChangeText={setFormDescription}
                    placeholder={t('transactions.descriptionOptional')}
                    placeholderTextColor={colors.textLight}
                  />

                  {/* Frequency */}
                  <Text style={[styles.label, { color: colors.textLight }]}>{t('recurring.frequency')}</Text>
                  <View style={styles.freqRow}>
                    {['daily', 'weekly', 'monthly'].map((freq) => (
                      <TouchableOpacity
                        key={freq}
                        style={[
                          styles.freqChip,
                          { backgroundColor: formFrequency === freq ? colors.primary : inputBg },
                        ]}
                        onPress={() => setFormFrequency(freq)}
                      >
                        <Text style={[styles.freqChipText, { color: formFrequency === freq ? '#FFF' : colors.textLight }]}>
                          {t(`recurring.${freq}`)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Day of Week (weekly) */}
                  {formFrequency === 'weekly' && (
                    <>
                      <Text style={[styles.label, { color: colors.textLight }]}>{t('recurring.dayOfWeek')}</Text>
                      <View style={styles.dayRow}>
                        {DAY_KEYS.map((key, idx) => (
                          <TouchableOpacity
                            key={key}
                            style={[
                              styles.dayChip,
                              { backgroundColor: formDayOfWeek === DAY_VALUES[idx] ? colors.primary : inputBg },
                            ]}
                            onPress={() => setFormDayOfWeek(DAY_VALUES[idx])}
                          >
                            <Text style={[styles.dayChipText, { color: formDayOfWeek === DAY_VALUES[idx] ? '#FFF' : colors.textLight }]}>
                              {t(`recurring.daysShort.${key}`)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}

                  {/* Day of Month (monthly) */}
                  {formFrequency === 'monthly' && (
                    <>
                      <Text style={[styles.label, { color: colors.textLight }]}>{t('recurring.dayOfMonth')}</Text>
                      <View style={styles.monthDayContainer}>
                        <TouchableOpacity
                          style={[styles.monthDayButton, { backgroundColor: inputBg }]}
                          onPress={() => setFormDayOfMonth(Math.max(1, formDayOfMonth - 1))}
                        >
                          <Feather name="minus" size={18} color={colors.text} />
                        </TouchableOpacity>
                        <View style={[styles.monthDayValue, { backgroundColor: colors.primary + '15' }]}>
                          <Text style={[styles.monthDayText, { color: colors.text }]}>{formDayOfMonth}</Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.monthDayButton, { backgroundColor: inputBg }]}
                          onPress={() => setFormDayOfMonth(Math.min(31, formDayOfMonth + 1))}
                        >
                          <Feather name="plus" size={18} color={colors.text} />
                        </TouchableOpacity>
                      </View>
                    </>
                  )}

                  {/* Start Date */}
                  <Text style={[styles.label, { color: colors.textLight }]}>{t('recurring.startDate')}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBg, color: colors.text, borderColor: colors.border }]}
                    value={formStartDate}
                    onChangeText={setFormStartDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textLight}
                  />

                  {/* End Date Toggle */}
                  <View style={styles.endDateToggleRow}>
                    <Text style={[styles.label, { color: colors.textLight, marginTop: 0 }]}>
                      {formHasEndDate ? t('recurring.hasEndDate') : t('recurring.noEndDate')}
                    </Text>
                    <Switch
                      value={formHasEndDate}
                      onValueChange={setFormHasEndDate}
                      trackColor={{ false: colors.border, true: '#C8F5DC' }}
                      thumbColor={formHasEndDate ? colors.primary : '#f4f3f4'}
                    />
                  </View>
                  {formHasEndDate && (
                    <TextInput
                      style={[styles.input, { backgroundColor: inputBg, color: colors.text, borderColor: colors.border }]}
                      value={formEndDate}
                      onChangeText={setFormEndDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.textLight}
                    />
                  )}

                  {/* Save Button */}
                  <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary }]} onPress={handleSave}>
                    <Feather name="check" size={20} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>{t('common.save')}</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  // List item
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  itemDesc: {
    fontSize: 12,
    marginTop: 1,
  },
  itemFrequency: {
    fontSize: 12,
    marginTop: 2,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemAmount: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyDesc: {
    fontSize: 14,
    marginTop: 6,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 8,
    maxHeight: '88%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(150,150,150,0.3)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 7,
    marginTop: 12,
  },
  input: {
    padding: 14,
    borderRadius: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Frequency
  freqRow: {
    flexDirection: 'row',
    gap: 8,
  },
  freqChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  freqChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Day of week chips
  dayRow: {
    flexDirection: 'row',
    gap: 4,
  },
  dayChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  dayChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Day of month stepper
  monthDayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  monthDayButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthDayValue: {
    width: 56,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthDayText: {
    fontSize: 20,
    fontWeight: '700',
  },
  // End date toggle
  endDateToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  // Category / Account picker
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  pickerSelected: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  pickerText: {
    fontSize: 15,
  },
  pickerList: {
    borderRadius: 14,
    marginTop: 4,
    overflow: 'hidden',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  pickerItemText: {
    fontSize: 14,
  },
  // Save
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 14,
    marginTop: 20,
    marginBottom: 34,
    gap: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default RecurringTransactionsScreen;
