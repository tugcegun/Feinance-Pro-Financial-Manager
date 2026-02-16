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
  Switch,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  apiGetSavingsGoals,
  apiAddSavingsGoal,
  apiUpdateSavingsGoal,
  apiDeleteSavingsGoal,
  apiDepositToSavingsGoal,
  apiWithdrawFromSavingsGoal,
  apiGetAccounts,
  apiGetSavingsGoalHistory,
  apiDeleteSavingsGoalHistoryEntry,
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

const ICONS = [
  'target', 'star', 'home', 'briefcase', 'gift',
  'heart', 'sun', 'umbrella', 'camera', 'music',
  'book', 'coffee', 'truck', 'map-pin', 'globe',
  'smartphone', 'monitor', 'headphones', 'shopping-bag', 'award',
  'compass', 'flag', 'zap', 'feather', 'anchor',
];

const COLORS = [
  '#F39C12', '#E74C3C', '#3498DB', '#2ECC71', '#9B59B6',
  '#1ABC9C', '#E67E22', '#34495E', '#FF6B6B', '#48DBFB',
  '#FF9FF3', '#54A0FF', '#5F27CD', '#01A3A4', '#F368E0',
];

const SavingsGoalsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useLanguage();
  const themeContext = useTheme();
  const colors = themeContext?.colors || defaultColors;
  const isDarkMode = themeContext?.isDarkMode || false;

  const [goals, setGoals] = useState([]);
  const [accounts, setAccountsList] = useState([]);
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [amountModalVisible, setAmountModalVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [selectedGoal, setSelectedGoal] = useState(null);

  // Goal form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTargetAmount, setFormTargetAmount] = useState('');
  const [formTargetDate, setFormTargetDate] = useState('');
  const [formIcon, setFormIcon] = useState('target');
  const [formColor, setFormColor] = useState('#F39C12');

  // Amount form state
  const [actionType, setActionType] = useState('deposit');
  const [actionAmount, setActionAmount] = useState('');
  const [actionAccountId, setActionAccountId] = useState(null);
  const [deductFromAccount, setDeductFromAccount] = useState(true);

  // History state
  const [history, setHistory] = useState([]);

  const cardBg = isDarkMode ? '#1A1A1A' : colors.card;
  const inputBg = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';

  useFocusEffect(
    useCallback(() => {
      loadGoals();
      loadAccounts();
    }, [])
  );

  const loadGoals = async () => {
    if (!user?.id) return;
    const data = await apiGetSavingsGoals();
    setGoals(data);
  };

  const loadAccounts = async () => {
    if (!user?.id) return;
    const data = await apiGetAccounts();
    setAccountsList(data);
  };

  const loadHistory = async (goalId) => {
    const data = await apiGetSavingsGoalHistory(goalId);
    setHistory(data);
  };

  const openAddModal = () => {
    setEditingGoal(null);
    setFormName('');
    setFormDescription('');
    setFormTargetAmount('');
    setFormTargetDate('');
    setFormIcon('target');
    setFormColor('#F39C12');
    setGoalModalVisible(true);
  };

  const openEditModal = (goal) => {
    setEditingGoal(goal);
    setFormName(goal.name);
    setFormDescription(goal.description || '');
    setFormTargetAmount(String(goal.target_amount));
    setFormTargetDate(goal.target_date || '');
    setFormIcon(goal.icon || 'target');
    setFormColor(goal.color || '#F39C12');
    setGoalModalVisible(true);
  };

  const openAmountModal = async (goal) => {
    setSelectedGoal(goal);
    setActionType('deposit');
    setActionAmount('');
    setActionAccountId(null);
    setDeductFromAccount(true);
    await loadHistory(goal.id);
    setAmountModalVisible(true);
  };

  const handleSaveGoal = async () => {
    if (!formName.trim()) {
      Alert.alert(t('common.error'), t('savingsGoals.nameRequired'));
      return;
    }
    const target = parseFloat(formTargetAmount);
    if (!target || target <= 0) {
      Alert.alert(t('common.error'), t('savingsGoals.amountRequired'));
      return;
    }

    try {
      if (editingGoal) {
        await apiUpdateSavingsGoal(editingGoal.id, formName.trim(), formDescription.trim(), target, formIcon, formColor, formTargetDate || null);
        Alert.alert(t('common.success'), t('savingsGoals.updated'));
      } else {
        await apiAddSavingsGoal(formName.trim(), formDescription.trim(), target, formIcon, formColor, formTargetDate || null);
        Alert.alert(t('common.success'), t('savingsGoals.added'));
      }
      setGoalModalVisible(false);
      loadGoals();
    } catch (error) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  const handleAmountAction = async () => {
    const amount = parseFloat(actionAmount);
    if (!amount || amount <= 0) {
      Alert.alert(t('common.error'), t('savingsGoals.insufficientAmount'));
      return;
    }

    try {
      if (actionType === 'deposit') {
        const result = await apiDepositToSavingsGoal(selectedGoal.id, amount, actionAccountId, deductFromAccount);
        Alert.alert(
          t('common.success'),
          result.isCompleted ? t('savingsGoals.goalCompleted') : t('savingsGoals.deposited')
        );
      } else {
        await apiWithdrawFromSavingsGoal(selectedGoal.id, amount, actionAccountId, deductFromAccount);
        Alert.alert(t('common.success'), t('savingsGoals.withdrawn'));
      }
      setActionAmount('');
      const updatedGoals = await apiGetSavingsGoals();
      setGoals(updatedGoals);
      const updatedGoal = updatedGoals.find(g => g.id === selectedGoal.id);
      if (updatedGoal) setSelectedGoal(updatedGoal);
      await loadHistory(selectedGoal.id);
      await loadAccounts();
    } catch (error) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  const handleDeleteHistoryEntry = (entry) => {
    Alert.alert(
      t('savingsGoals.undoEntry'),
      t('savingsGoals.deleteEntry'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('savingsGoals.undoEntry'),
          style: 'destructive',
          onPress: async () => {
            try {
              await apiDeleteSavingsGoalHistoryEntry(entry.id);
              Alert.alert(t('common.success'), t('savingsGoals.entryDeleted'));
              const updatedGoals = await apiGetSavingsGoals();
              setGoals(updatedGoals);
              const updatedGoal = updatedGoals.find(g => g.id === selectedGoal.id);
              if (updatedGoal) setSelectedGoal(updatedGoal);
              await loadHistory(selectedGoal.id);
              await loadAccounts();
            } catch (error) {
              Alert.alert(t('common.error'), error.message);
            }
          },
        },
      ]
    );
  };

  const handleDelete = (goal) => {
    Alert.alert(
      t('common.delete'),
      t('savingsGoals.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await apiDeleteSavingsGoal(goal.id);
            loadGoals();
          },
        },
      ]
    );
  };

  const handleLongPress = (goal) => {
    Alert.alert(
      goal.name,
      '',
      [
        { text: t('savingsGoals.editGoal'), onPress: () => openEditModal(goal) },
        { text: t('common.delete'), style: 'destructive', onPress: () => handleDelete(goal) },
        { text: t('common.cancel'), style: 'cancel' },
      ]
    );
  };

  const getDaysLeft = (targetDate) => {
    if (!targetDate) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(targetDate + 'T00:00:00');
    const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}.${month} ${hours}:${mins}`;
  };

  const renderItem = ({ item }) => {
    const progress = item.target_amount > 0 ? Math.min(item.current_amount / item.target_amount, 1) : 0;
    const percentage = Math.round(progress * 100);
    const isCompleted = item.is_completed === 1;
    const daysLeft = getDaysLeft(item.target_date);
    const isOverdue = daysLeft !== null && daysLeft < 0 && !isCompleted;
    const goalColor = item.color || '#F39C12';

    return (
      <TouchableOpacity
        style={[styles.goalCard, { backgroundColor: colors.card }]}
        onPress={() => openAmountModal(item)}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.7}
      >
        {/* Top row: icon + name + percentage */}
        <View style={styles.goalTopRow}>
          <View style={[styles.goalIconCircle, { backgroundColor: goalColor + '20' }]}>
            <Feather name={item.icon || 'target'} size={22} color={goalColor} />
          </View>
          <View style={styles.goalInfo}>
            <Text style={[styles.goalName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
            {item.description ? (
              <Text style={[styles.goalDescription, { color: colors.textLight }]} numberOfLines={1}>
                {item.description}
              </Text>
            ) : null}
          </View>
          {isCompleted ? (
            <View style={[styles.completedBadge, { backgroundColor: '#2ECC71' + '20' }]}>
              <Feather name="check-circle" size={18} color="#2ECC71" />
            </View>
          ) : (
            <View style={[styles.percentBadge, { backgroundColor: goalColor + '15' }]}>
              <Text style={[styles.percentText, { color: goalColor }]}>{percentage}%</Text>
            </View>
          )}
        </View>

        {/* Progress bar */}
        <View style={[styles.progressBarBg, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${percentage}%`,
                backgroundColor: isCompleted ? '#2ECC71' : goalColor,
              },
            ]}
          />
        </View>

        {/* Bottom row: amounts + days left */}
        <View style={styles.goalBottomRow}>
          <Text style={[styles.goalAmounts, { color: colors.text }]}>
            {item.current_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            <Text style={{ color: colors.textLight }}> / {item.target_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</Text>
          </Text>
          <Text style={[styles.goalDaysLeft, {
            color: isCompleted ? '#2ECC71' : isOverdue ? colors.danger : colors.textLight
          }]}>
            {isCompleted
              ? t('savingsGoals.completed')
              : isOverdue
                ? t('savingsGoals.overdue')
                : daysLeft !== null
                  ? `${daysLeft} ${t('savingsGoals.daysLeft')}`
                  : ''
            }
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Feather name="target" size={56} color={colors.textLight} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('savingsGoals.noGoals')}</Text>
      <Text style={[styles.emptyDesc, { color: colors.textLight }]}>{t('savingsGoals.noGoalsDesc')}</Text>
    </View>
  );

  const renderHistoryItem = (entry) => {
    const isDeposit = entry.action_type === 'deposit';
    const entryColor = isDeposit ? '#2ECC71' : colors.danger;

    return (
      <TouchableOpacity
        key={entry.id}
        style={[styles.historyItem, { backgroundColor: inputBg }]}
        onLongPress={() => handleDeleteHistoryEntry(entry)}
        activeOpacity={0.7}
      >
        <View style={[styles.historyIcon, { backgroundColor: entryColor + '15' }]}>
          <Feather name={isDeposit ? 'arrow-down-left' : 'arrow-up-right'} size={16} color={entryColor} />
        </View>
        <View style={styles.historyInfo}>
          <Text style={[styles.historyAmount, { color: entryColor }]}>
            {isDeposit ? '+' : '-'}{entry.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
          </Text>
          {entry.account_name ? (
            <Text style={[styles.historyAccount, { color: colors.textLight }]}>
              {entry.account_name}{entry.deducted === 0 ? ' (*)' : ''}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.historyDate, { color: colors.textLight }]}>{formatDate(entry.created_at)}</Text>
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('savingsGoals.title')}</Text>
          <TouchableOpacity onPress={openAddModal} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Feather name="plus-circle" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={goals}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={goals.length === 0 ? { flex: 1 } : { padding: 16, paddingBottom: 40 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />

      {/* Add/Edit Goal Modal */}
      <Modal
        visible={goalModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setGoalModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <Pressable style={{ flex: 1 }} onPress={() => { Keyboard.dismiss(); setGoalModalVisible(false); }} />
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ justifyContent: 'flex-end' }}
            >
              <View style={[styles.modalContainer, { backgroundColor: cardBg }]}>
                <View style={styles.handle} />
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    {editingGoal ? t('savingsGoals.editGoal') : t('savingsGoals.addGoal')}
                  </Text>
                  <TouchableOpacity onPress={() => setGoalModalVisible(false)}>
                    <Feather name="x" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {/* Goal Name */}
                  <Text style={[styles.label, { color: colors.textLight }]}>{t('savingsGoals.goalName')}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBg, color: colors.text, borderColor: colors.border }]}
                    value={formName}
                    onChangeText={setFormName}
                    placeholder={t('savingsGoals.goalNamePlaceholder')}
                    placeholderTextColor={colors.textLight}
                  />

                  {/* Target Amount */}
                  <Text style={[styles.label, { color: colors.textLight }]}>{t('savingsGoals.targetAmount')}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBg, color: colors.text, borderColor: colors.border }]}
                    value={formTargetAmount}
                    onChangeText={setFormTargetAmount}
                    placeholder="0.00"
                    placeholderTextColor={colors.textLight}
                    keyboardType="decimal-pad"
                  />

                  {/* Description */}
                  <Text style={[styles.label, { color: colors.textLight }]}>{t('savingsGoals.description')}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBg, color: colors.text, borderColor: colors.border }]}
                    value={formDescription}
                    onChangeText={setFormDescription}
                    placeholder={t('savingsGoals.descriptionPlaceholder')}
                    placeholderTextColor={colors.textLight}
                  />

                  {/* Target Date */}
                  <Text style={[styles.label, { color: colors.textLight }]}>{t('savingsGoals.targetDate')}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBg, color: colors.text, borderColor: colors.border }]}
                    value={formTargetDate}
                    onChangeText={setFormTargetDate}
                    placeholder={t('savingsGoals.targetDatePlaceholder')}
                    placeholderTextColor={colors.textLight}
                  />

                  {/* Icon Picker */}
                  <Text style={[styles.label, { color: colors.textLight }]}>{t('savingsGoals.selectIcon')}</Text>
                  <View style={styles.iconGrid}>
                    {ICONS.map((icon) => (
                      <TouchableOpacity
                        key={icon}
                        style={styles.iconCell}
                        onPress={() => setFormIcon(icon)}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.iconItemInner,
                            {
                              backgroundColor: formIcon === icon ? colors.primary + '15' : inputBg,
                              borderColor: formIcon === icon ? colors.primary : 'transparent',
                            },
                          ]}
                        >
                          <Feather name={icon} size={20} color={formIcon === icon ? colors.primary : colors.textLight} />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Color Picker */}
                  <Text style={[styles.label, { color: colors.textLight }]}>{t('savingsGoals.selectColor')}</Text>
                  <View style={styles.colorGrid}>
                    {COLORS.map((color) => (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.colorItem,
                          {
                            backgroundColor: color,
                            borderColor: formColor === color ? colors.primary : 'transparent',
                          },
                        ]}
                        onPress={() => setFormColor(color)}
                      >
                        {formColor === color && (
                          <Feather name="check" size={16} color="#FFFFFF" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Save Button */}
                  <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary }]} onPress={handleSaveGoal}>
                    <Feather name="check" size={20} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>{t('common.save')}</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Deposit/Withdraw Modal */}
      <Modal
        visible={amountModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAmountModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <Pressable style={{ flex: 1 }} onPress={() => { Keyboard.dismiss(); setAmountModalVisible(false); }} />
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ justifyContent: 'flex-end' }}
            >
              <View style={[styles.modalContainer, { backgroundColor: cardBg }]}>
                <View style={styles.handle} />
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>{selectedGoal?.name}</Text>
                  <TouchableOpacity onPress={() => setAmountModalVisible(false)}>
                    <Feather name="x" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingBottom: 20 }}
                >
                  {/* Current progress summary */}
                  {selectedGoal && (
                    <View style={[styles.amountSummary, { backgroundColor: inputBg }]}>
                      <Text style={[styles.amountSummaryLabel, { color: colors.textLight }]}>{t('savingsGoals.currentAmount')}</Text>
                      <Text style={[styles.amountSummaryValue, { color: colors.text }]}>
                        {selectedGoal.current_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        <Text style={{ color: colors.textLight, fontSize: 14 }}>
                          {' '}/ {selectedGoal.target_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                        </Text>
                      </Text>
                    </View>
                  )}

                  {/* History section */}
                  <Text style={[styles.sectionLabel, { color: colors.text }]}>{t('savingsGoals.history')}</Text>
                  {history.length === 0 ? (
                    <View style={[styles.noHistoryBox, { backgroundColor: inputBg }]}>
                      <Text style={[styles.noHistoryText, { color: colors.textLight }]}>{t('savingsGoals.noHistory')}</Text>
                    </View>
                  ) : (
                    <View style={styles.historyList}>
                      {history.slice(0, 10).map(renderHistoryItem)}
                    </View>
                  )}

                  {/* Divider */}
                  <View style={[styles.divider, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />

                  {/* Action type toggle */}
                  <View style={styles.actionTypeRow}>
                    <TouchableOpacity
                      style={[styles.actionChip, { backgroundColor: actionType === 'deposit' ? '#2ECC71' : inputBg }]}
                      onPress={() => setActionType('deposit')}
                    >
                      <Feather name="plus" size={16} color={actionType === 'deposit' ? '#FFF' : colors.textLight} />
                      <Text style={[styles.actionChipText, { color: actionType === 'deposit' ? '#FFF' : colors.textLight }]}>
                        {t('savingsGoals.deposit')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionChip, { backgroundColor: actionType === 'withdraw' ? colors.danger : inputBg }]}
                      onPress={() => setActionType('withdraw')}
                    >
                      <Feather name="minus" size={16} color={actionType === 'withdraw' ? '#FFF' : colors.textLight} />
                      <Text style={[styles.actionChipText, { color: actionType === 'withdraw' ? '#FFF' : colors.textLight }]}>
                        {t('savingsGoals.withdraw')}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Account selector */}
                  <Text style={[styles.label, { color: colors.textLight }]}>{t('savingsGoals.selectAccount')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountChipScroll}>
                    <TouchableOpacity
                      style={[
                        styles.accountChip,
                        {
                          backgroundColor: actionAccountId === null ? colors.primary : inputBg,
                          borderColor: actionAccountId === null ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setActionAccountId(null)}
                    >
                      <Feather name="x-circle" size={14} color={actionAccountId === null ? '#FFF' : colors.textLight} />
                      <Text style={[styles.accountChipText, { color: actionAccountId === null ? '#FFF' : colors.textLight }]}>
                        {t('savingsGoals.noAccount')}
                      </Text>
                    </TouchableOpacity>
                    {accounts.map((acc) => (
                      <TouchableOpacity
                        key={acc.id}
                        style={[
                          styles.accountChip,
                          {
                            backgroundColor: actionAccountId === acc.id ? colors.primary : inputBg,
                            borderColor: actionAccountId === acc.id ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => setActionAccountId(acc.id)}
                      >
                        <Feather name="credit-card" size={14} color={actionAccountId === acc.id ? '#FFF' : colors.textLight} />
                        <Text style={[styles.accountChipText, { color: actionAccountId === acc.id ? '#FFF' : colors.textLight }]} numberOfLines={1}>
                          {acc.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Deduct toggle — only visible when account selected */}
                  {actionAccountId !== null && (
                    <View style={[styles.deductRow, { backgroundColor: inputBg }]}>
                      <Text style={[styles.deductLabel, { color: colors.text }]}>{t('savingsGoals.deductFromAccount')}</Text>
                      <Switch
                        value={deductFromAccount}
                        onValueChange={setDeductFromAccount}
                        trackColor={{ false: colors.border, true: colors.primary + '80' }}
                        thumbColor={deductFromAccount ? colors.primary : '#f4f3f4'}
                      />
                    </View>
                  )}

                  {/* Amount input */}
                  <Text style={[styles.label, { color: colors.textLight }]}>{t('savingsGoals.amount')}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBg, color: colors.text, borderColor: colors.border }]}
                    value={actionAmount}
                    onChangeText={setActionAmount}
                    placeholder="0.00"
                    placeholderTextColor={colors.textLight}
                    keyboardType="decimal-pad"
                  />

                  {/* Confirm button */}
                  <TouchableOpacity
                    style={[styles.confirmButton, { backgroundColor: actionType === 'deposit' ? '#2ECC71' : colors.danger }]}
                    onPress={handleAmountAction}
                  >
                    <Feather name={actionType === 'deposit' ? 'plus' : 'minus'} size={20} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>{t('savingsGoals.confirmAction')}</Text>
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
  // Goal card
  goalCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  goalTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  goalInfo: {
    flex: 1,
  },
  goalName: {
    fontSize: 16,
    fontWeight: '700',
  },
  goalDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  percentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  percentText: {
    fontSize: 13,
    fontWeight: '700',
  },
  completedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Progress bar
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
  // Bottom row
  goalBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalAmounts: {
    fontSize: 13,
    fontWeight: '600',
  },
  goalDaysLeft: {
    fontSize: 12,
    fontWeight: '500',
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
    textAlign: 'center',
    paddingHorizontal: 40,
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
  // Icon grid
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  iconCell: {
    width: '20%',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconItemInner: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Color grid
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorItem: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Amount modal
  amountSummary: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 4,
  },
  amountSummaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  amountSummaryValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  actionTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  actionChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // History
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  historyList: {
    gap: 6,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
  },
  historyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  historyInfo: {
    flex: 1,
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  historyAccount: {
    fontSize: 11,
    marginTop: 1,
  },
  historyDate: {
    fontSize: 11,
  },
  noHistoryBox: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  noHistoryText: {
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  // Account chips
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
    gap: 6,
  },
  accountChipText: {
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 100,
  },
  // Deduct toggle
  deductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  deductLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  // Save / Confirm
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 14,
    marginTop: 20,
    marginBottom: 20,
    gap: 8,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 14,
    marginTop: 16,
    gap: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default SavingsGoalsScreen;
