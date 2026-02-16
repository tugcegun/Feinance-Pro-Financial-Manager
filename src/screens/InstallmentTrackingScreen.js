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
  apiGetInstallments,
  apiAddInstallment,
  apiUpdateInstallment,
  apiDeleteInstallment,
  apiGetInstallmentPayments,
  apiMarkInstallmentPaid,
  apiUnmarkInstallmentPaid,
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

const INSTALLMENT_COLOR = '#E91E63';

const formatAmount = (num) => {
  const val = Number(num) || 0;
  const fixed = val.toFixed(2);
  const parts = fixed.split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return intPart + ',' + parts[1];
};

const InstallmentTrackingScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useLanguage();
  const themeContext = useTheme();
  const colors = themeContext?.colors || defaultColors;
  const isDarkMode = themeContext?.isDarkMode || false;

  const [installmentsList, setInstallmentsList] = useState([]);
  const [accounts, setAccountsList] = useState([]);
  const [planModalVisible, setPlanModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [payments, setPayments] = useState([]);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTotalAmount, setFormTotalAmount] = useState('');
  const [formInstallmentCount, setFormInstallmentCount] = useState('');
  const [formMonthlyAmount, setFormMonthlyAmount] = useState('');
  const [formFirstPaymentDate, setFormFirstPaymentDate] = useState('');
  const [formAccountId, setFormAccountId] = useState(null);
  // 'fromTotal' = user last edited total, auto-calc monthly
  // 'fromMonthly' = user last edited monthly, auto-calc total
  const [lastEdited, setLastEdited] = useState('fromTotal');

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
      const data = await apiGetInstallments();
      setInstallmentsList(data || []);
      const accs = await apiGetAccounts();
      setAccountsList(accs || []);
    } catch (error) {
      console.error('Load data error:', error);
    }
  };

  const loadPayments = async (installmentId) => {
    try {
      const data = await apiGetInstallmentPayments(installmentId);
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

  const openAddModal = () => {
    setEditingPlan(null);
    setFormName('');
    setFormDescription('');
    setFormTotalAmount('');
    setFormInstallmentCount('');
    setFormMonthlyAmount('');
    setFormFirstPaymentDate(getTodayStr());
    setFormAccountId(null);
    setLastEdited('fromTotal');
    setPlanModalVisible(true);
  };

  const openEditModal = (plan) => {
    setEditingPlan(plan);
    setFormName(plan.name || '');
    setFormDescription(plan.description || '');
    setPlanModalVisible(true);
  };

  const openDetailModal = async (plan) => {
    setSelectedPlan(plan);
    await loadPayments(plan.id);
    setDetailModalVisible(true);
  };

  const recalcMonthly = (total, count) => {
    const t = parseFloat(total);
    const c = parseInt(count);
    if (t > 0 && c > 0) {
      return (t / c).toFixed(2);
    }
    return '';
  };

  const recalcTotal = (monthly, count) => {
    const m = parseFloat(monthly);
    const c = parseInt(count);
    if (m > 0 && c > 0) {
      return (m * c).toFixed(2);
    }
    return '';
  };

  const handleTotalAmountChange = (value) => {
    setFormTotalAmount(value);
    setLastEdited('fromTotal');
    const newMonthly = recalcMonthly(value, formInstallmentCount);
    if (newMonthly) setFormMonthlyAmount(newMonthly);
  };

  const handleCountChange = (value) => {
    setFormInstallmentCount(value);
    if (lastEdited === 'fromTotal' || lastEdited === 'fromTotal') {
      const newMonthly = recalcMonthly(formTotalAmount, value);
      if (newMonthly) setFormMonthlyAmount(newMonthly);
    } else {
      const newTotal = recalcTotal(formMonthlyAmount, value);
      if (newTotal) setFormTotalAmount(newTotal);
    }
  };

  const handleMonthlyAmountChange = (value) => {
    setFormMonthlyAmount(value);
    setLastEdited('fromMonthly');
    const newTotal = recalcTotal(value, formInstallmentCount);
    if (newTotal) setFormTotalAmount(newTotal);
  };

  const handleSavePlan = async () => {
    if (editingPlan) {
      if (!formName.trim()) {
        Alert.alert(t('common.error'), t('installments.nameRequired'));
        return;
      }
      try {
        await apiUpdateInstallment(editingPlan.id, formName.trim(), formDescription.trim());
        Alert.alert(t('common.success'), t('installments.updated'));
        setPlanModalVisible(false);
        loadData();
      } catch (error) {
        Alert.alert(t('common.error'), String(error?.message || error));
      }
      return;
    }

    // Add mode
    if (!formName.trim()) {
      Alert.alert(t('common.error'), t('installments.nameRequired'));
      return;
    }
    const totalAmount = parseFloat(formTotalAmount);
    if (!totalAmount || totalAmount <= 0) {
      Alert.alert(t('common.error'), t('installments.amountRequired'));
      return;
    }
    const count = parseInt(formInstallmentCount);
    if (!count || count <= 0) {
      Alert.alert(t('common.error'), t('installments.countRequired'));
      return;
    }
    const monthlyAmount = parseFloat(formMonthlyAmount);
    if (!monthlyAmount || monthlyAmount <= 0) {
      Alert.alert(t('common.error'), t('installments.amountRequired'));
      return;
    }
    if (!isValidDateStr(formFirstPaymentDate)) {
      Alert.alert(t('common.error'), 'YYYY-MM-DD');
      return;
    }

    try {
      await apiAddInstallment(
        formName.trim(),
        formDescription.trim() || null,
        totalAmount,
        count,
        monthlyAmount,
        formFirstPaymentDate,
        formAccountId
      );
      Alert.alert(t('common.success'), t('installments.added'));
      setPlanModalVisible(false);
      loadData();
    } catch (error) {
      Alert.alert(t('common.error'), String(error?.message || error));
    }
  };

  const handleTogglePayment = async (payment) => {
    try {
      if (payment.is_paid === 1) {
        await apiUnmarkInstallmentPaid(payment.id);
      } else {
        await apiMarkInstallmentPaid(payment.id);
      }
      // Reload both lists
      if (user?.id) {
        const updatedList = await apiGetInstallments();
        setInstallmentsList(updatedList || []);
        if (selectedPlan) {
          const updatedPlan = (updatedList || []).find(i => i.id === selectedPlan.id);
          if (updatedPlan) setSelectedPlan(updatedPlan);
          await loadPayments(selectedPlan.id);
        }
      }
    } catch (error) {
      Alert.alert(t('common.error'), String(error?.message || error));
    }
  };

  const handleDelete = (plan) => {
    Alert.alert(
      t('common.delete'),
      t('installments.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await apiDeleteInstallment(plan.id);
              loadData();
            } catch (error) {
              Alert.alert(t('common.error'), String(error?.message || error));
            }
          },
        },
      ]
    );
  };

  const handleLongPress = (plan) => {
    Alert.alert(
      plan.name,
      '',
      [
        { text: t('installments.editPlan'), onPress: () => openEditModal(plan) },
        { text: t('common.delete'), style: 'destructive', onPress: () => handleDelete(plan) },
        { text: t('common.cancel'), style: 'cancel' },
      ]
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return parts[2] + '.' + parts[1] + '.' + parts[0];
    return dateStr;
  };

  const getOverdueCount = (plan) => {
    if (!plan || !plan.first_payment_date) return 0;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const parts = plan.first_payment_date.split('-');
      if (parts.length !== 3) return 0;
      const baseYear = parseInt(parts[0]);
      const baseMonth = parseInt(parts[1]) - 1;
      const baseDay = parseInt(parts[2]);
      let expectedPaid = 0;
      for (let i = 0; i < (plan.installment_count || 0); i++) {
        let tMonth = baseMonth + i;
        let tYear = baseYear + Math.floor(tMonth / 12);
        tMonth = tMonth % 12;
        const daysInMonth = new Date(tYear, tMonth + 1, 0).getDate();
        const tDay = Math.min(baseDay, daysInMonth);
        const dueDate = new Date(tYear, tMonth, tDay);
        if (dueDate <= today) expectedPaid++;
      }
      return Math.max(0, expectedPaid - (plan.paid_count || 0));
    } catch (e) {
      return 0;
    }
  };

  const renderItem = ({ item }) => {
    const paidCount = item.paid_count || 0;
    const totalCount = item.installment_count || 1;
    const monthlyAmt = Number(item.monthly_amount) || 0;
    const progress = Math.min(paidCount / totalCount, 1);
    const percentage = Math.round(progress * 100);
    const isCompleted = item.is_completed === 1;
    const overdueCount = getOverdueCount(item);
    const remainingAmount = (totalCount - paidCount) * monthlyAmt;

    return (
      <TouchableOpacity
        style={[styles.planCard, { backgroundColor: colors.card }]}
        onPress={() => openDetailModal(item)}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.7}
      >
        {/* Top row */}
        <View style={styles.planTopRow}>
          <View style={[styles.planIconCircle, { backgroundColor: INSTALLMENT_COLOR + '20' }]}>
            <Feather name="credit-card" size={22} color={INSTALLMENT_COLOR} />
          </View>
          <View style={styles.planInfo}>
            <Text style={[styles.planName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.planSubtext, { color: colors.textLight }]}>
              {paidCount}/{totalCount} {t('installments.paid')}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            {isCompleted ? (
              <View style={[styles.completedBadge, { backgroundColor: '#2ECC71' + '20' }]}>
                <Feather name="check-circle" size={18} color="#2ECC71" />
              </View>
            ) : (
              <Text style={[styles.remainingAmount, { color: colors.text }]}>
                {formatAmount(remainingAmount)} ₺
              </Text>
            )}
            {!isCompleted && (
              <Text style={[styles.remainingLabel, { color: colors.textLight }]}>{t('installments.remaining')}</Text>
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
                backgroundColor: isCompleted ? '#2ECC71' : INSTALLMENT_COLOR,
              },
            ]}
          />
        </View>

        {/* Bottom row */}
        <View style={styles.planBottomRow}>
          <Text style={[styles.planAmountInfo, { color: colors.textLight }]}>
            {formatAmount(monthlyAmt)} ₺/ay
          </Text>
          {overdueCount > 0 && !isCompleted ? (
            <View style={[styles.overdueBadge, { backgroundColor: colors.danger + '15' }]}>
              <Feather name="alert-circle" size={12} color={colors.danger} />
              <Text style={[styles.overdueText, { color: colors.danger }]}>
                {overdueCount} {t('installments.overdue')}
              </Text>
            </View>
          ) : isCompleted ? (
            <Text style={[styles.completedText, { color: '#2ECC71' }]}>{t('installments.allPaid')}</Text>
          ) : (
            <Text style={[styles.percentageText, { color: INSTALLMENT_COLOR }]}>{percentage}%</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Feather name="credit-card" size={56} color={colors.textLight} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('installments.noInstallments')}</Text>
      <Text style={[styles.emptyDesc, { color: colors.textLight }]}>{t('installments.noInstallmentsDesc')}</Text>
    </View>
  );

  const renderPaymentItem = (payment) => {
    if (!payment) return null;
    const isPaid = payment.is_paid === 1;
    const today = getTodayStr();
    const dueDate = payment.due_date || '';
    const isOverdue = !isPaid && dueDate < today && dueDate.length > 0;
    const isDueThisMonth = !isPaid && !isOverdue && dueDate.length >= 7 && dueDate.substring(0, 7) === today.substring(0, 7);
    const amount = Number(payment.amount) || 0;

    return (
      <TouchableOpacity
        key={String(payment.id)}
        style={[styles.paymentItem, { backgroundColor: inputBg }]}
        onPress={() => handleTogglePayment(payment)}
        activeOpacity={0.7}
      >
        <View style={[
          styles.paymentCheckbox,
          {
            backgroundColor: isPaid ? '#2ECC71' : 'transparent',
            borderColor: isPaid ? '#2ECC71' : isOverdue ? colors.danger : colors.border,
          }
        ]}>
          {isPaid && <Feather name="check" size={14} color="#FFFFFF" />}
        </View>
        <View style={styles.paymentInfo}>
          <Text style={[
            styles.paymentNumber,
            { color: isPaid ? colors.textLight : colors.text },
            isPaid && styles.paidText,
          ]}>
            {payment.payment_number}. {t('installments.payments')}
          </Text>
          <Text style={[
            styles.paymentDate,
            {
              color: isOverdue ? colors.danger : isDueThisMonth ? INSTALLMENT_COLOR : colors.textLight,
            },
          ]}>
            {formatDate(dueDate)}
            {isOverdue ? ' - ' + t('installments.overdue') : ''}
            {isDueThisMonth ? ' - ' + t('installments.dueThisMonth') : ''}
          </Text>
        </View>
        <Text style={[
          styles.paymentAmount,
          { color: isPaid ? '#2ECC71' : colors.text },
        ]}>
          {formatAmount(amount)} ₺
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('installments.title')}</Text>
          <TouchableOpacity onPress={openAddModal} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Feather name="plus-circle" size={24} color={INSTALLMENT_COLOR} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={installmentsList}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={installmentsList.length === 0 ? { flex: 1 } : { padding: 16, paddingBottom: 40 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />

      {/* Add/Edit Plan Modal */}
      <Modal
        visible={planModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPlanModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <Pressable style={{ flex: 1 }} onPress={() => { Keyboard.dismiss(); setPlanModalVisible(false); }} />
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ justifyContent: 'flex-end' }}
            >
              <View style={[styles.modalContainer, { backgroundColor: cardBg }]}>
                <View style={styles.handle} />
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    {editingPlan ? t('installments.editPlan') : t('installments.addPlan')}
                  </Text>
                  <TouchableOpacity onPress={() => setPlanModalVisible(false)}>
                    <Feather name="x" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true}
                  contentContainerStyle={{ paddingBottom: 30 }}
                >
                  {/* Plan Name */}
                  <Text style={[styles.label, { color: colors.textLight }]}>{t('installments.planName')}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBg, color: colors.text, borderColor: colors.border }]}
                    value={formName}
                    onChangeText={setFormName}
                    placeholder={t('installments.planNamePlaceholder')}
                    placeholderTextColor={colors.textLight}
                  />

                  {/* Description */}
                  <Text style={[styles.label, { color: colors.textLight }]}>{t('installments.description')}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBg, color: colors.text, borderColor: colors.border }]}
                    value={formDescription}
                    onChangeText={setFormDescription}
                    placeholder={t('installments.descriptionPlaceholder')}
                    placeholderTextColor={colors.textLight}
                  />

                  {!editingPlan && (
                    <View>
                      {/* Total Amount */}
                      <Text style={[styles.label, { color: colors.textLight }]}>{t('installments.totalAmount')}</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: inputBg, color: colors.text, borderColor: colors.border }]}
                        value={formTotalAmount}
                        onChangeText={handleTotalAmountChange}
                        placeholder="0.00"
                        placeholderTextColor={colors.textLight}
                        keyboardType="decimal-pad"
                      />

                      {/* Installment Count */}
                      <Text style={[styles.label, { color: colors.textLight }]}>{t('installments.installmentCount')}</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: inputBg, color: colors.text, borderColor: colors.border }]}
                        value={formInstallmentCount}
                        onChangeText={handleCountChange}
                        placeholder="12"
                        placeholderTextColor={colors.textLight}
                        keyboardType="number-pad"
                      />

                      {/* Monthly Amount (auto-calculated) */}
                      <Text style={[styles.label, { color: colors.textLight }]}>{t('installments.monthlyAmount')}</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: inputBg, color: colors.text, borderColor: colors.border }]}
                        value={formMonthlyAmount}
                        onChangeText={handleMonthlyAmountChange}
                        placeholder="0.00"
                        placeholderTextColor={colors.textLight}
                        keyboardType="decimal-pad"
                      />

                      {/* First Payment Date */}
                      <Text style={[styles.label, { color: colors.textLight }]}>{t('installments.firstPaymentDate')}</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: inputBg, color: colors.text, borderColor: colors.border }]}
                        value={formFirstPaymentDate}
                        onChangeText={setFormFirstPaymentDate}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={colors.textLight}
                      />

                      {/* Account Selector */}
                      <Text style={[styles.label, { color: colors.textLight }]}>{t('installments.selectAccount')}</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        nestedScrollEnabled={true}
                        style={styles.accountChipScroll}
                      >
                        <TouchableOpacity
                          style={[
                            styles.accountChip,
                            {
                              backgroundColor: formAccountId === null ? INSTALLMENT_COLOR : inputBg,
                              borderColor: formAccountId === null ? INSTALLMENT_COLOR : colors.border,
                            },
                          ]}
                          onPress={() => setFormAccountId(null)}
                        >
                          <Feather name="x-circle" size={14} color={formAccountId === null ? '#FFF' : colors.textLight} />
                          <Text style={[styles.accountChipText, { color: formAccountId === null ? '#FFF' : colors.textLight }]}>
                            {t('installments.noAccount')}
                          </Text>
                        </TouchableOpacity>
                        {(accounts || []).map((acc) => (
                          <TouchableOpacity
                            key={String(acc.id)}
                            style={[
                              styles.accountChip,
                              {
                                backgroundColor: formAccountId === acc.id ? INSTALLMENT_COLOR : inputBg,
                                borderColor: formAccountId === acc.id ? INSTALLMENT_COLOR : colors.border,
                              },
                            ]}
                            onPress={() => setFormAccountId(acc.id)}
                          >
                            <Feather name="credit-card" size={14} color={formAccountId === acc.id ? '#FFF' : colors.textLight} />
                            <Text style={[styles.accountChipText, { color: formAccountId === acc.id ? '#FFF' : colors.textLight }]} numberOfLines={1}>
                              {acc.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {/* Save Button */}
                  <TouchableOpacity style={[styles.saveButton, { backgroundColor: INSTALLMENT_COLOR }]} onPress={handleSavePlan}>
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
        <View style={styles.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setDetailModalVisible(false)} />
          <View style={[styles.modalContainer, { backgroundColor: cardBg }]}>
            <View style={styles.handle} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>{selectedPlan?.name || ''}</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              {/* Plan Summary */}
              {selectedPlan && (
                <View style={[styles.summaryCard, { backgroundColor: inputBg }]}>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.textLight }]}>{t('installments.totalAmount')}</Text>
                    <Text style={[styles.summaryValue, { color: colors.text }]}>
                      {formatAmount(selectedPlan.total_amount)} ₺
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.textLight }]}>{t('installments.monthlyAmount')}</Text>
                    <Text style={[styles.summaryValue, { color: colors.text }]}>
                      {formatAmount(selectedPlan.monthly_amount)} ₺
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.textLight }]}>{t('installments.progress')}</Text>
                    <Text style={[styles.summaryValue, { color: INSTALLMENT_COLOR }]}>
                      {selectedPlan.paid_count || 0} / {selectedPlan.installment_count || 0}
                    </Text>
                  </View>
                </View>
              )}

              {/* Progress bar */}
              {selectedPlan && (
                <View style={[styles.detailProgressBg, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
                  <View
                    style={[
                      styles.detailProgressFill,
                      {
                        width: Math.round(((selectedPlan.paid_count || 0) / (selectedPlan.installment_count || 1)) * 100) + '%',
                        backgroundColor: selectedPlan.is_completed === 1 ? '#2ECC71' : INSTALLMENT_COLOR,
                      },
                    ]}
                  />
                </View>
              )}

              {/* Payments list */}
              <Text style={[styles.sectionLabel, { color: colors.text }]}>{t('installments.payments')}</Text>
              <View style={styles.paymentsList}>
                {(payments || []).map((payment) => renderPaymentItem(payment))}
              </View>
            </ScrollView>
          </View>
        </View>
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
  accountChipScroll: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  accountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  accountChipText: {
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 100,
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
  paidText: {
    textDecorationLine: 'line-through',
  },
  paymentDate: {
    fontSize: 12,
    marginTop: 2,
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export default InstallmentTrackingScreen;
