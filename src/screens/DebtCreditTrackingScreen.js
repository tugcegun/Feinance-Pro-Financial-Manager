import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  apiGetDebtsCredits,
  apiAddDebtCredit,
  apiUpdateDebtCredit,
  apiDeleteDebtCredit,
  apiGetDebtCreditPayments,
  apiAddDebtCreditPayment,
  apiSettleDebtCredit,
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

const DEBT_COLOR = '#2ECC71';   // borç verdim (alacak) — yeşil
const CREDIT_COLOR = '#FF6B6B'; // borç aldım (borç) — kırmızı
const SETTLED_COLOR = '#95A5A6'; // kapanmış — gri

const formatAmount = (num) => {
  const val = Number(num) || 0;
  const fixed = val.toFixed(2);
  const parts = fixed.split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return intPart + ',' + parts[1];
};

const DebtCreditTrackingScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useLanguage();
  const themeContext = useTheme();
  const colors = themeContext?.colors || defaultColors;
  const isDarkMode = themeContext?.isDarkMode || false;

  const [records, setRecords] = useState([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [payments, setPayments] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all'); // all, debt, credit, settled

  // Form state
  const [formType, setFormType] = useState('debt');
  const [formPersonName, setFormPersonName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDateCreated, setFormDateCreated] = useState('');
  const [formDueDate, setFormDueDate] = useState('');

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentDate, setPaymentDate] = useState('');

  const cardBg = isDarkMode ? '#1A1A1A' : colors.card;
  const inputBg = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    if (!user?.id) return;
    try {
      const data = await apiGetDebtsCredits();
      setRecords(data || []);
    } catch (error) {
      console.error('Load data error:', error);
    }
  };

  const loadPayments = async (debtCreditId) => {
    try {
      const data = await apiGetDebtCreditPayments(debtCreditId);
      setPayments(data || []);
    } catch (error) {
      console.error('Load payments error:', error);
      setPayments([]);
    }
  };

  const getTodayStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const isValidDateStr = (str) => {
    if (!str || typeof str !== 'string') return false;
    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return false;
    const y = parseInt(match[1]);
    const m = parseInt(match[2]);
    const d = parseInt(match[3]);
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;
    if (y < 2000 || y > 2100) return false;
    return true;
  };

  const formatDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return parts[2] + '.' + parts[1] + '.' + parts[0];
    return dateStr;
  };

  const isOverdue = (record) => {
    if (!record || record.is_settled === 1 || !record.due_date) return false;
    const today = getTodayStr();
    return record.due_date < today;
  };

  // Filtered records
  const getFilteredRecords = () => {
    if (activeFilter === 'all') return (records || []).filter(r => r.is_settled !== 1);
    if (activeFilter === 'debt') return (records || []).filter(r => r.type === 'debt' && r.is_settled !== 1);
    if (activeFilter === 'credit') return (records || []).filter(r => r.type === 'credit' && r.is_settled !== 1);
    if (activeFilter === 'settled') return (records || []).filter(r => r.is_settled === 1);
    return records || [];
  };

  // Summary calculations (only active records)
  const getActiveTotalDebt = () => {
    return (records || [])
      .filter(r => r.type === 'debt' && r.is_settled !== 1)
      .reduce((sum, r) => sum + (Number(r.remaining_amount) || 0), 0);
  };

  const getActiveTotalCredit = () => {
    return (records || [])
      .filter(r => r.type === 'credit' && r.is_settled !== 1)
      .reduce((sum, r) => sum + (Number(r.remaining_amount) || 0), 0);
  };

  const openAddModal = () => {
    setEditingRecord(null);
    setFormType('debt');
    setFormPersonName('');
    setFormAmount('');
    setFormDescription('');
    setFormDateCreated(getTodayStr());
    setFormDueDate('');
    setAddModalVisible(true);
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
    setFormType(record.type || 'debt');
    setFormPersonName(record.person_name || '');
    setFormAmount(String(Number(record.amount) || ''));
    setFormDescription(record.description || '');
    setFormDateCreated(record.date_created || getTodayStr());
    setFormDueDate(record.due_date || '');
    setAddModalVisible(true);
  };

  const openDetailModal = async (record) => {
    setSelectedRecord(record);
    setPaymentAmount('');
    setPaymentNote('');
    setPaymentDate(getTodayStr());
    await loadPayments(record.id);
    setDetailModalVisible(true);
  };

  const handleSave = async () => {
    if (!formPersonName.trim()) {
      Alert.alert(t('common.error'), t('debtCredit.nameRequired'));
      return;
    }
    const amount = parseFloat(formAmount);
    if (!amount || amount <= 0) {
      Alert.alert(t('common.error'), t('debtCredit.amountRequired'));
      return;
    }
    if (!isValidDateStr(formDateCreated)) {
      Alert.alert(t('common.error'), 'YYYY-MM-DD');
      return;
    }
    if (formDueDate && !isValidDateStr(formDueDate)) {
      Alert.alert(t('common.error'), 'YYYY-MM-DD');
      return;
    }

    try {
      if (editingRecord) {
        await apiUpdateDebtCredit(
          editingRecord.id,
          formPersonName.trim(),
          amount,
          formDescription.trim() || null,
          formDueDate || null
        );
        Alert.alert(t('common.success'), t('debtCredit.updated'));
      } else {
        await apiAddDebtCredit(
          formType,
          formPersonName.trim(),
          amount,
          formDescription.trim() || null,
          formDateCreated,
          formDueDate || null
        );
        Alert.alert(t('common.success'), t('debtCredit.added'));
      }
      setAddModalVisible(false);
      loadData();
    } catch (error) {
      Alert.alert(t('common.error'), String(error?.message || error));
    }
  };

  const handleAddPayment = async () => {
    if (!selectedRecord) return;
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      Alert.alert(t('common.error'), t('debtCredit.paymentAmountRequired'));
      return;
    }
    if (!isValidDateStr(paymentDate)) {
      Alert.alert(t('common.error'), 'YYYY-MM-DD');
      return;
    }

    try {
      await apiAddDebtCreditPayment(selectedRecord.id, amount, paymentDate, paymentNote.trim() || null);
      Alert.alert(t('common.success'), t('debtCredit.paymentAdded'));
      setPaymentAmount('');
      setPaymentNote('');
      setPaymentDate(getTodayStr());

      // Reload data and refresh selected record
      const updatedRecords = await apiGetDebtsCredits();
      setRecords(updatedRecords || []);
      const updated = (updatedRecords || []).find(r => r.id === selectedRecord.id);
      if (updated) setSelectedRecord(updated);
      await loadPayments(selectedRecord.id);
    } catch (error) {
      Alert.alert(t('common.error'), String(error?.message || error));
    }
  };

  const handleSettle = (record) => {
    Alert.alert(
      t('debtCredit.markSettled'),
      '',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm') || 'OK',
          onPress: async () => {
            try {
              await apiSettleDebtCredit(record.id);
              const updatedRecords = await apiGetDebtsCredits();
              setRecords(updatedRecords || []);
              const updated = (updatedRecords || []).find(r => r.id === record.id);
              if (updated) setSelectedRecord(updated);
              if (record.id === selectedRecord?.id) {
                await loadPayments(record.id);
              }
            } catch (error) {
              Alert.alert(t('common.error'), String(error?.message || error));
            }
          },
        },
      ]
    );
  };

  const handleDelete = (record) => {
    Alert.alert(
      t('common.delete'),
      t('debtCredit.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await apiDeleteDebtCredit(record.id);
              setDetailModalVisible(false);
              loadData();
            } catch (error) {
              Alert.alert(t('common.error'), String(error?.message || error));
            }
          },
        },
      ]
    );
  };

  const handleLongPress = (record) => {
    Alert.alert(
      record.person_name,
      '',
      [
        { text: t('debtCredit.editEntry'), onPress: () => openEditModal(record) },
        { text: t('common.delete'), style: 'destructive', onPress: () => handleDelete(record) },
        { text: t('common.cancel'), style: 'cancel' },
      ]
    );
  };

  const filteredRecords = getFilteredRecords();
  const totalDebt = getActiveTotalDebt();
  const totalCredit = getActiveTotalCredit();

  const renderItem = ({ item }) => {
    const isDebt = item.type === 'debt';
    const isSettled = item.is_settled === 1;
    const amount = Number(item.amount) || 0;
    const remaining = Number(item.remaining_amount) || 0;
    const paid = amount - remaining;
    const progress = amount > 0 ? Math.min(paid / amount, 1) : 0;
    const percentage = Math.round(progress * 100);
    const recordOverdue = isOverdue(item);
    const accentColor = isSettled ? SETTLED_COLOR : (isDebt ? DEBT_COLOR : CREDIT_COLOR);

    return (
      <TouchableOpacity
        style={[styles.planCard, { backgroundColor: colors.card }]}
        onPress={() => openDetailModal(item)}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.7}
      >
        {/* Top row */}
        <View style={styles.planTopRow}>
          <View style={[styles.planIconCircle, { backgroundColor: accentColor + '20' }]}>
            <Feather
              name={isDebt ? 'arrow-up-right' : 'arrow-down-left'}
              size={22}
              color={accentColor}
            />
          </View>
          <View style={styles.planInfo}>
            <Text style={[styles.planName, { color: isSettled ? SETTLED_COLOR : colors.text }]} numberOfLines={1}>
              {item.person_name}
            </Text>
            <Text style={[styles.planSubtext, { color: isSettled ? SETTLED_COLOR : colors.textLight }]}>
              {isDebt ? t('debtCredit.debt') : t('debtCredit.credit')}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            {isSettled ? (
              <View style={[styles.completedBadge, { backgroundColor: DEBT_COLOR + '20' }]}>
                <Feather name="check-circle" size={18} color={DEBT_COLOR} />
              </View>
            ) : (
              <Text style={[styles.remainingAmount, { color: colors.text }]}>
                {formatAmount(remaining)} ₺
              </Text>
            )}
            {!isSettled && (
              <Text style={[styles.remainingLabel, { color: colors.textLight }]}>{t('debtCredit.remaining')}</Text>
            )}
          </View>
        </View>

        {/* Progress bar */}
        <View style={[styles.progressBarBg, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: percentage + '%',
                backgroundColor: isSettled ? DEBT_COLOR : accentColor,
              },
            ]}
          />
        </View>

        {/* Bottom row */}
        <View style={styles.planBottomRow}>
          <Text style={[styles.planAmountInfo, { color: isSettled ? SETTLED_COLOR : colors.textLight }]}>
            {formatAmount(amount)} ₺
          </Text>
          {recordOverdue ? (
            <View style={[styles.overdueBadge, { backgroundColor: colors.danger + '15' }]}>
              <Feather name="alert-circle" size={12} color={colors.danger} />
              <Text style={[styles.overdueText, { color: colors.danger }]}>
                {t('debtCredit.overdue')}
              </Text>
            </View>
          ) : isSettled ? (
            <Text style={[styles.completedText, { color: DEBT_COLOR }]}>{t('debtCredit.settled')}</Text>
          ) : (
            <Text style={[styles.percentageText, { color: accentColor }]}>{percentage}%</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Feather name="users" size={56} color={colors.textLight} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('debtCredit.noRecords')}</Text>
      <Text style={[styles.emptyDesc, { color: colors.textLight }]}>{t('debtCredit.noRecordsDesc')}</Text>
    </View>
  );

  const renderPaymentItem = (payment) => {
    if (!payment) return null;
    const amount = Number(payment.amount) || 0;
    return (
      <View
        key={String(payment.id)}
        style={[styles.paymentItem, { backgroundColor: inputBg }]}
      >
        <View style={[styles.paymentCheckbox, { backgroundColor: DEBT_COLOR, borderColor: DEBT_COLOR }]}>
          <Feather name="check" size={14} color="#FFFFFF" />
        </View>
        <View style={styles.paymentInfo}>
          <Text style={[styles.paymentNumber, { color: colors.text }]}>
            {formatAmount(amount)} ₺
          </Text>
          <Text style={[styles.paymentDate, { color: colors.textLight }]}>
            {formatDate(payment.payment_date)}
            {payment.note ? ' - ' + payment.note : ''}
          </Text>
        </View>
      </View>
    );
  };

  const filters = [
    { key: 'all', label: t('debtCredit.active') },
    { key: 'debt', label: t('debtCredit.debt') },
    { key: 'credit', label: t('debtCredit.credit') },
    { key: 'settled', label: t('debtCredit.settled') },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('debtCredit.title')}</Text>
          <TouchableOpacity onPress={openAddModal} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Feather name="plus-circle" size={24} color={CREDIT_COLOR} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary cards */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCardSmall, { backgroundColor: colors.card }]}>
          <View style={[styles.summaryDot, { backgroundColor: DEBT_COLOR }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.summaryCardLabel, { color: colors.textLight }]}>{t('debtCredit.totalDebt')}</Text>
            <Text style={[styles.summaryCardValue, { color: DEBT_COLOR }]}>{formatAmount(totalDebt)} ₺</Text>
          </View>
        </View>
        <View style={{ width: 12 }} />
        <View style={[styles.summaryCardSmall, { backgroundColor: colors.card }]}>
          <View style={[styles.summaryDot, { backgroundColor: CREDIT_COLOR }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.summaryCardLabel, { color: colors.textLight }]}>{t('debtCredit.totalCredit')}</Text>
            <Text style={[styles.summaryCardValue, { color: CREDIT_COLOR }]}>{formatAmount(totalCredit)} ₺</Text>
          </View>
        </View>
      </View>

      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScrollView}
        contentContainerStyle={styles.filterContainer}
        nestedScrollEnabled={true}
      >
        {filters.map((f) => {
          const isActive = activeFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isActive ? CREDIT_COLOR : inputBg,
                  borderColor: isActive ? CREDIT_COLOR : colors.border,
                },
              ]}
              onPress={() => setActiveFilter(f.key)}
            >
              <Text style={[styles.filterChipText, { color: isActive ? '#FFF' : colors.textLight }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={filteredRecords}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={filteredRecords.length === 0 ? { flex: 1 } : { padding: 16, paddingBottom: 40 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />

      {/* Add/Edit Modal */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <Pressable style={{ flex: 1 }} onPress={() => { Keyboard.dismiss(); setAddModalVisible(false); }} />
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ justifyContent: 'flex-end' }}
            >
              <View style={[styles.modalContainer, { backgroundColor: cardBg }]}>
                <View style={styles.handle} />
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    {editingRecord ? t('debtCredit.editEntry') : t('debtCredit.addNew')}
                  </Text>
                  <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                    <Feather name="x" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true}
                  contentContainerStyle={{ paddingBottom: 30 }}
                >
                  {/* Type toggle (only for add mode) */}
                  {!editingRecord && (
                    <View>
                      <Text style={[styles.label, { color: colors.textLight }]}>{t('debtCredit.type')}</Text>
                      <View style={styles.typeToggleRow}>
                        <TouchableOpacity
                          style={[
                            styles.typeToggleBtn,
                            {
                              backgroundColor: formType === 'debt' ? DEBT_COLOR : inputBg,
                              borderColor: formType === 'debt' ? DEBT_COLOR : colors.border,
                            },
                          ]}
                          onPress={() => setFormType('debt')}
                        >
                          <Feather name="arrow-up-right" size={16} color={formType === 'debt' ? '#FFF' : colors.textLight} />
                          <Text style={[styles.typeToggleText, { color: formType === 'debt' ? '#FFF' : colors.textLight }]}>
                            {t('debtCredit.debt')}
                          </Text>
                        </TouchableOpacity>
                        <View style={{ width: 10 }} />
                        <TouchableOpacity
                          style={[
                            styles.typeToggleBtn,
                            {
                              backgroundColor: formType === 'credit' ? CREDIT_COLOR : inputBg,
                              borderColor: formType === 'credit' ? CREDIT_COLOR : colors.border,
                            },
                          ]}
                          onPress={() => setFormType('credit')}
                        >
                          <Feather name="arrow-down-left" size={16} color={formType === 'credit' ? '#FFF' : colors.textLight} />
                          <Text style={[styles.typeToggleText, { color: formType === 'credit' ? '#FFF' : colors.textLight }]}>
                            {t('debtCredit.credit')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Person Name */}
                  <Text style={[styles.label, { color: colors.textLight }]}>{t('debtCredit.personName')}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBg, color: colors.text, borderColor: colors.border }]}
                    value={formPersonName}
                    onChangeText={setFormPersonName}
                    placeholder={t('debtCredit.personNamePlaceholder')}
                    placeholderTextColor={colors.textLight}
                  />

                  {/* Amount */}
                  <Text style={[styles.label, { color: colors.textLight }]}>{t('debtCredit.amount')}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBg, color: colors.text, borderColor: colors.border }]}
                    value={formAmount}
                    onChangeText={setFormAmount}
                    placeholder="0.00"
                    placeholderTextColor={colors.textLight}
                    keyboardType="decimal-pad"
                  />

                  {/* Description */}
                  <Text style={[styles.label, { color: colors.textLight }]}>{t('debtCredit.description')}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBg, color: colors.text, borderColor: colors.border }]}
                    value={formDescription}
                    onChangeText={setFormDescription}
                    placeholder={t('debtCredit.descriptionPlaceholder')}
                    placeholderTextColor={colors.textLight}
                  />

                  {/* Date Created */}
                  {!editingRecord && (
                    <View>
                      <Text style={[styles.label, { color: colors.textLight }]}>{t('debtCredit.dateCreated')}</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: inputBg, color: colors.text, borderColor: colors.border }]}
                        value={formDateCreated}
                        onChangeText={setFormDateCreated}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={colors.textLight}
                      />
                    </View>
                  )}

                  {/* Due Date */}
                  <Text style={[styles.label, { color: colors.textLight }]}>{t('debtCredit.dueDate')}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBg, color: colors.text, borderColor: colors.border }]}
                    value={formDueDate}
                    onChangeText={setFormDueDate}
                    placeholder={t('debtCredit.dueDatePlaceholder') + ' (YYYY-MM-DD)'}
                    placeholderTextColor={colors.textLight}
                  />

                  {/* Save Button */}
                  <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: formType === 'debt' ? DEBT_COLOR : CREDIT_COLOR }]}
                    onPress={handleSave}
                  >
                    <Feather name="check" size={20} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>{t('common.save')}</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Detail Modal */}
      <Modal
        visible={detailModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <Pressable style={{ flex: 1 }} onPress={() => { Keyboard.dismiss(); setDetailModalVisible(false); }} />
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ justifyContent: 'flex-end' }}
            >
              <View style={[styles.modalContainer, { backgroundColor: cardBg }]}>
                <View style={styles.handle} />
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
                    {selectedRecord?.person_name || ''}
                  </Text>
                  <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                    <Feather name="x" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 40 }}
                  nestedScrollEnabled={true}
                  keyboardShouldPersistTaps="handled"
                >
                  {selectedRecord && (
                    <View>
                      {/* Record summary */}
                      <View style={[styles.summaryCard, { backgroundColor: inputBg }]}>
                        <View style={styles.summaryRow}>
                          <Text style={[styles.summaryLabel, { color: colors.textLight }]}>{t('debtCredit.type')}</Text>
                          <Text style={[styles.summaryValue, { color: selectedRecord.type === 'debt' ? DEBT_COLOR : CREDIT_COLOR }]}>
                            {selectedRecord.type === 'debt' ? t('debtCredit.debt') : t('debtCredit.credit')}
                          </Text>
                        </View>
                        <View style={styles.summaryRow}>
                          <Text style={[styles.summaryLabel, { color: colors.textLight }]}>{t('debtCredit.amount')}</Text>
                          <Text style={[styles.summaryValue, { color: colors.text }]}>
                            {formatAmount(selectedRecord.amount)} ₺
                          </Text>
                        </View>
                        <View style={styles.summaryRow}>
                          <Text style={[styles.summaryLabel, { color: colors.textLight }]}>{t('debtCredit.remaining')}</Text>
                          <Text style={[styles.summaryValue, { color: selectedRecord.is_settled === 1 ? DEBT_COLOR : CREDIT_COLOR }]}>
                            {formatAmount(selectedRecord.remaining_amount)} ₺
                          </Text>
                        </View>
                        <View style={styles.summaryRow}>
                          <Text style={[styles.summaryLabel, { color: colors.textLight }]}>{t('debtCredit.dateCreated')}</Text>
                          <Text style={[styles.summaryValue, { color: colors.text }]}>
                            {formatDate(selectedRecord.date_created)}
                          </Text>
                        </View>
                        {selectedRecord.due_date ? (
                          <View style={styles.summaryRow}>
                            <Text style={[styles.summaryLabel, { color: colors.textLight }]}>{t('debtCredit.dueDate')}</Text>
                            <Text style={[styles.summaryValue, { color: isOverdue(selectedRecord) ? colors.danger : colors.text }]}>
                              {formatDate(selectedRecord.due_date)}
                              {isOverdue(selectedRecord) ? ' (' + t('debtCredit.overdue') + ')' : ''}
                            </Text>
                          </View>
                        ) : null}
                        {selectedRecord.description ? (
                          <View style={styles.summaryRow}>
                            <Text style={[styles.summaryLabel, { color: colors.textLight }]}>{t('debtCredit.description')}</Text>
                            <Text style={[styles.summaryValue, { color: colors.text }]} numberOfLines={2}>
                              {selectedRecord.description}
                            </Text>
                          </View>
                        ) : null}
                        {selectedRecord.is_settled === 1 && selectedRecord.settled_date ? (
                          <View style={styles.summaryRow}>
                            <Text style={[styles.summaryLabel, { color: colors.textLight }]}>{t('debtCredit.settledDate')}</Text>
                            <Text style={[styles.summaryValue, { color: DEBT_COLOR }]}>
                              {formatDate(selectedRecord.settled_date)}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {/* Progress bar */}
                      <View style={[styles.detailProgressBg, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
                        <View
                          style={[
                            styles.detailProgressFill,
                            {
                              width: Math.round(((Number(selectedRecord.amount) - Number(selectedRecord.remaining_amount)) / (Number(selectedRecord.amount) || 1)) * 100) + '%',
                              backgroundColor: selectedRecord.is_settled === 1 ? DEBT_COLOR : (selectedRecord.type === 'debt' ? DEBT_COLOR : CREDIT_COLOR),
                            },
                          ]}
                        />
                      </View>

                      {/* Add payment form (only for active records) */}
                      {selectedRecord.is_settled !== 1 && (
                        <View style={[styles.paymentFormCard, { backgroundColor: inputBg }]}>
                          <Text style={[styles.sectionLabel, { color: colors.text }]}>{t('debtCredit.addPayment')}</Text>
                          <View style={styles.paymentFormRow}>
                            <View style={{ flex: 1 }}>
                              <TextInput
                                style={[styles.input, { backgroundColor: cardBg, color: colors.text, borderColor: colors.border }]}
                                value={paymentAmount}
                                onChangeText={setPaymentAmount}
                                placeholder={t('debtCredit.paymentAmount')}
                                placeholderTextColor={colors.textLight}
                                keyboardType="decimal-pad"
                              />
                            </View>
                          </View>
                          <TextInput
                            style={[styles.input, { backgroundColor: cardBg, color: colors.text, borderColor: colors.border, marginTop: 8 }]}
                            value={paymentDate}
                            onChangeText={setPaymentDate}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={colors.textLight}
                          />
                          <TextInput
                            style={[styles.input, { backgroundColor: cardBg, color: colors.text, borderColor: colors.border, marginTop: 8 }]}
                            value={paymentNote}
                            onChangeText={setPaymentNote}
                            placeholder={t('debtCredit.paymentNotePlaceholder')}
                            placeholderTextColor={colors.textLight}
                          />
                          <TouchableOpacity
                            style={[styles.addPaymentBtn, { backgroundColor: selectedRecord.type === 'debt' ? DEBT_COLOR : CREDIT_COLOR }]}
                            onPress={handleAddPayment}
                          >
                            <Feather name="plus" size={16} color="#FFF" />
                            <Text style={styles.addPaymentBtnText}>{t('debtCredit.addPayment')}</Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* Mark as settled button */}
                      {selectedRecord.is_settled !== 1 && (
                        <TouchableOpacity
                          style={[styles.settleButton, { borderColor: DEBT_COLOR }]}
                          onPress={() => handleSettle(selectedRecord)}
                        >
                          <Feather name="check-circle" size={18} color={DEBT_COLOR} />
                          <Text style={[styles.settleButtonText, { color: DEBT_COLOR }]}>{t('debtCredit.markSettled')}</Text>
                        </TouchableOpacity>
                      )}

                      {/* Payment history */}
                      <Text style={[styles.sectionLabel, { color: colors.text, marginTop: 16 }]}>{t('debtCredit.paymentHistory')}</Text>
                      <View style={styles.paymentsList}>
                        {(payments || []).length === 0 ? (
                          <Text style={[styles.noPaymentsText, { color: colors.textLight }]}>{t('debtCredit.noPayments')}</Text>
                        ) : (
                          (payments || []).map((payment) => renderPaymentItem(payment))
                        )}
                      </View>
                    </View>
                  )}
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
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  summaryCardSmall: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  summaryCardLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  summaryCardValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  filterScrollView: {
    maxHeight: 44,
    marginBottom: 4,
  },
  filterContainer: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  planCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  planTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  planIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 16,
    fontWeight: '700',
  },
  planSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  remainingAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  remainingLabel: {
    fontSize: 11,
    marginTop: 1,
  },
  completedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  planBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planAmountInfo: {
    fontSize: 13,
  },
  overdueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  overdueText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  percentageText: {
    fontSize: 13,
    fontWeight: '700',
  },
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
    textAlign: 'center',
    paddingHorizontal: 40,
  },
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
    flex: 1,
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
  typeToggleRow: {
    flexDirection: 'row',
  },
  typeToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  typeToggleText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 14,
    marginTop: 20,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
    maxWidth: '55%',
    textAlign: 'right',
  },
  detailProgressBg: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 16,
  },
  detailProgressFill: {
    height: '100%',
    borderRadius: 5,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  paymentFormCard: {
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  paymentFormRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  addPaymentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 10,
  },
  addPaymentBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
  settleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  settleButtonText: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  paymentsList: {
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 6,
  },
  paymentCheckbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  paymentDate: {
    fontSize: 12,
    marginTop: 2,
  },
  noPaymentsText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 16,
  },
});

export default DebtCreditTrackingScreen;
