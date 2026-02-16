import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LineChart } from 'react-native-chart-kit';
import {
  apiGetBills,
  apiAddBill,
  apiUpdateBill,
  apiDeleteBill,
  apiMarkBillAsPaid,
  apiGetBillHistory,
  apiGetOverdueBills,
  apiGetBillsDueSoon,
  apiGetYearlyBillSummary,
  apiGetFamilyMembers,
  apiAddFamilyMember,
  apiDeleteFamilyMember,
  apiGetBillAssignments,
  apiAssignBillToMember,
} from '../services/api';
import { formatCurrency } from '../utils/currency';
import { StaggeredItem } from '../components/AnimatedScreen';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');

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

const BILL_TYPES = [
  { id: 'electricity', icon: 'zap', color: '#FFC107' },
  { id: 'water', icon: 'droplet', color: '#2196F3' },
  { id: 'gas', icon: 'thermometer', color: '#FF5722' },
  { id: 'internet', icon: 'wifi', color: '#9C27B0' },
  { id: 'phone', icon: 'phone', color: '#4CAF50' },
  { id: 'rent', icon: 'home', color: '#795548' },
  { id: 'subscription', icon: 'tv', color: '#E91E63' },
  { id: 'other', icon: 'file-text', color: '#607D8B' },
];

const BillsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t, currentLanguage } = useLanguage();
  const themeContext = useTheme();
  const colors = themeContext?.colors || defaultColors;

  // States
  const [bills, setBills] = useState([]);
  const [overdueBills, setOverdueBills] = useState([]);
  const [dueSoonBills, setDueSoonBills] = useState([]);
  const [billHistory, setBillHistory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('pending'); // pending, history, stats, family

  // Add/Edit Modal States
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [billName, setBillName] = useState('');
  const [billType, setBillType] = useState('electricity');
  const [billAmount, setBillAmount] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [billNotes, setBillNotes] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDay, setRecurringDay] = useState('');
  const [reminderDays, setReminderDays] = useState('3');
  const [photoUri, setPhotoUri] = useState(null);

  // Camera States
  const [cameraVisible, setCameraVisible] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [facing, setFacing] = useState('back');

  // Pay Modal States
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [payingBill, setPayingBill] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payNotes, setPayNotes] = useState('');

  // Family States
  const [familyMembers, setFamilyMembers] = useState([]);
  const [familyModalVisible, setFamilyModalVisible] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');

  // Stats States
  const [yearlyData, setYearlyData] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const loadData = async () => {
    if (!user?.id) return;

    try {
      const allBills = await apiGetBills(false);
      setBills(allBills);

      const overdue = await apiGetOverdueBills();
      setOverdueBills(overdue);

      const dueSoon = await apiGetBillsDueSoon(7);
      setDueSoonBills(dueSoon);

      const history = await apiGetBillHistory();
      setBillHistory(history);

      const family = await apiGetFamilyMembers();
      setFamilyMembers(family);

      const yearly = await apiGetYearlyBillSummary(selectedYear);
      setYearlyData(yearly);
    } catch (error) {
      console.error('Error loading bills:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getBillTypeInfo = (type) => {
    return BILL_TYPES.find(t => t.id === type) || BILL_TYPES[BILL_TYPES.length - 1];
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString(currentLanguage === 'tr' ? 'tr-TR' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getDaysUntilDue = (dueDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const openAddModal = () => {
    setEditingBill(null);
    setBillName('');
    setBillType('electricity');
    setBillAmount('');
    setDueDate(new Date());
    setBillNotes('');
    setIsRecurring(false);
    setRecurringDay('');
    setReminderDays('3');
    setPhotoUri(null);
    setModalVisible(true);
  };

  const openEditModal = (bill) => {
    setEditingBill(bill);
    setBillName(bill.name);
    setBillType(bill.type);
    setBillAmount(bill.amount?.toString() || '');
    setDueDate(bill.due_date ? new Date(bill.due_date) : new Date());
    setBillNotes(bill.notes || '');
    setIsRecurring(bill.is_recurring === 1);
    setRecurringDay(bill.recurring_day?.toString() || '');
    setReminderDays(bill.reminder_days?.toString() || '3');
    setPhotoUri(bill.photo_uri);
    setModalVisible(true);
  };

  const handleSaveBill = async () => {
    if (!billName.trim()) {
      Alert.alert(t('common.error'), t('bills.enterName') || 'Please enter bill name');
      return;
    }

    try {
      const dueDateStr = dueDate.toISOString().split('T')[0];
      const amount = billAmount ? parseFloat(billAmount) : null;
      const recDay = recurringDay ? parseInt(recurringDay) : null;
      const remDays = reminderDays ? parseInt(reminderDays) : 3;

      let savedBill;

      if (editingBill) {
        await apiUpdateBill(
          editingBill.id,
          billName,
          billType,
          amount,
          dueDateStr,
          photoUri,
          billNotes,
          isRecurring,
          recDay,
          remDays
        );
        savedBill = { ...editingBill, name: billName, type: billType, amount, due_date: dueDateStr, reminder_days: remDays };
      } else {
        const result = await apiAddBill(
          billName,
          billType,
          amount,
          dueDateStr,
          photoUri,
          billNotes,
          isRecurring,
          recDay,
          remDays
        );
        savedBill = { id: result.id, name: billName, type: billType, amount, due_date: dueDateStr, reminder_days: remDays };
      }

      setModalVisible(false);
      await loadData();
      Alert.alert(t('common.success'), editingBill ? (t('bills.updated') || 'Bill updated') : (t('bills.added') || 'Bill added'));
    } catch (error) {
      console.error('Save bill error:', error);
      Alert.alert(t('common.error'), 'Failed to save bill');
    }
  };

  const handleDeleteBill = (bill) => {
    Alert.alert(
      t('common.confirm') || 'Confirm',
      t('bills.deleteConfirm') || 'Delete this bill?',
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('common.delete') || 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiDeleteBill(bill.id);
              await loadData();
            } catch (error) {
              Alert.alert(t('common.error'), 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  const openPayModal = (bill) => {
    setPayingBill(bill);
    setPayAmount(bill.amount?.toString() || '');
    setPayNotes('');
    setPayModalVisible(true);
  };

  const handlePayBill = async () => {
    if (!payAmount || parseFloat(payAmount) <= 0) {
      Alert.alert(t('common.error'), t('bills.enterAmount') || 'Please enter amount');
      return;
    }

    try {
      const paidDate = new Date().toISOString().split('T')[0];
      await apiMarkBillAsPaid(payingBill.id, paidDate, parseFloat(payAmount), null, payNotes);
      setPayModalVisible(false);
      await loadData();
      Alert.alert(t('common.success'), t('bills.markedPaid') || 'Bill marked as paid');
    } catch (error) {
      console.error('Pay bill error:', error);
      Alert.alert(t('common.error'), 'Failed to mark as paid');
    }
  };

  // Camera functions
  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync();
        setPhotoUri(photo.uri);
        setCameraVisible(false);
      } catch (error) {
        console.error('Take picture error:', error);
      }
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const openCamera = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(t('common.error'), t('bills.cameraPermission') || 'Camera permission required');
        return;
      }
    }
    setCameraVisible(true);
  };

  // Family functions
  const handleAddFamilyMember = async () => {
    if (!newMemberName.trim()) {
      Alert.alert(t('common.error'), t('bills.enterMemberName') || 'Please enter name');
      return;
    }

    try {
      await apiAddFamilyMember(newMemberName, newMemberEmail, 'member');
      setNewMemberName('');
      setNewMemberEmail('');
      setFamilyModalVisible(false);
      await loadData();
    } catch (error) {
      Alert.alert(t('common.error'), 'Failed to add member');
    }
  };

  const handleDeleteMember = (member) => {
    Alert.alert(
      t('common.confirm') || 'Confirm',
      t('bills.deleteMemberConfirm') || 'Remove this member?',
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('common.delete') || 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiDeleteFamilyMember(member.id);
              await loadData();
            } catch (error) {
              Alert.alert(t('common.error'), 'Failed to remove');
            }
          },
        },
      ]
    );
  };

  // Prepare chart data
  const getChartData = () => {
    const months = Array(12).fill(0);
    yearlyData.forEach(item => {
      const monthIndex = parseInt(item.month) - 1;
      months[monthIndex] += item.total || 0;
    });

    return {
      labels: currentLanguage === 'tr'
        ? ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
        : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      datasets: [{ data: months.map(v => v || 0) }],
    };
  };

  const renderBillItem = (bill, isOverdue = false) => {
    const typeInfo = getBillTypeInfo(bill.type);
    const daysUntil = getDaysUntilDue(bill.due_date);

    return (
      <TouchableOpacity
        key={bill.id}
        style={[styles.billItem, { backgroundColor: colors.card }]}
        onPress={() => openEditModal(bill)}
        onLongPress={() => handleDeleteBill(bill)}
      >
        <View style={[styles.billIcon, { backgroundColor: typeInfo.color + '20' }]}>
          <Feather name={typeInfo.icon} size={24} color={typeInfo.color} />
        </View>
        <View style={styles.billInfo}>
          <Text style={[styles.billName, { color: colors.text }]}>{bill.name}</Text>
          <Text style={[styles.billDue, { color: isOverdue ? colors.danger : colors.textLight }]}>
            {isOverdue
              ? (t('bills.overdue') || 'Overdue') + ` ${Math.abs(daysUntil)} ` + (t('bills.days') || 'days')
              : daysUntil === 0
                ? (t('bills.dueToday') || 'Due today')
                : daysUntil === 1
                  ? (t('bills.dueTomorrow') || 'Due tomorrow')
                  : `${daysUntil} ` + (t('bills.daysLeft') || 'days left')
            }
          </Text>
        </View>
        <View style={styles.billRight}>
          {bill.amount ? (
            <Text style={[styles.billAmount, { color: colors.text }]}>
              {formatCurrency(bill.amount, currentLanguage)}
            </Text>
          ) : (
            <Text style={[styles.billAmount, { color: colors.textLight }]}>-</Text>
          )}
          <TouchableOpacity
            style={[styles.payButton, { backgroundColor: colors.success }]}
            onPress={() => openPayModal(bill)}
          >
            <Feather name="check" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHistoryItem = (item) => {
    const typeInfo = getBillTypeInfo(item.bill_type);

    return (
      <View key={item.id} style={[styles.historyItem, { backgroundColor: colors.card }]}>
        <View style={[styles.billIcon, { backgroundColor: typeInfo.color + '20' }]}>
          <Feather name={typeInfo.icon} size={20} color={typeInfo.color} />
        </View>
        <View style={styles.billInfo}>
          <Text style={[styles.billName, { color: colors.text }]}>{item.bill_name}</Text>
          <Text style={[styles.billDue, { color: colors.textLight }]}>
            {formatDate(item.paid_date)}
          </Text>
        </View>
        <Text style={[styles.historyAmount, { color: colors.success }]}>
          {formatCurrency(item.amount, currentLanguage)}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <StaggeredItem index={0}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{t('bills.title') || 'Bills'}</Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={openAddModal}
          >
            <Feather name="plus" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </StaggeredItem>

      {/* Tabs */}
      <StaggeredItem index={1}>
      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        {['pending', 'history', 'stats', 'family'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? colors.primary : colors.textLight }]}>
              {t(`bills.${tab}`) || tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      </StaggeredItem>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === 'pending' && (
          <>
            {/* Overdue Bills */}
            {overdueBills.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Feather name="alert-circle" size={18} color={colors.danger} />
                  <Text style={[styles.sectionTitle, { color: colors.danger }]}>
                    {t('bills.overdueBills') || 'Overdue'} ({overdueBills.length})
                  </Text>
                </View>
                {overdueBills.map((bill) => renderBillItem(bill, true))}
              </View>
            )}

            {/* Due Soon */}
            {dueSoonBills.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Feather name="clock" size={18} color={colors.warning} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    {t('bills.dueSoon') || 'Due Soon'} ({dueSoonBills.length})
                  </Text>
                </View>
                {dueSoonBills.map((bill) => renderBillItem(bill))}
              </View>
            )}

            {/* All Pending */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Feather name="file-text" size={18} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t('bills.allPending') || 'All Pending'} ({bills.length})
                </Text>
              </View>
              {bills.length === 0 ? (
                <View style={styles.emptyState}>
                  <Feather name="check-circle" size={48} color={colors.textLight} />
                  <Text style={[styles.emptyText, { color: colors.textLight }]}>
                    {t('bills.noPending') || 'No pending bills'}
                  </Text>
                </View>
              ) : (
                bills.map((bill) => renderBillItem(bill))
              )}
            </View>
          </>
        )}

        {activeTab === 'history' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="check-circle" size={18} color={colors.success} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('bills.paymentHistory') || 'Payment History'}
              </Text>
            </View>
            {billHistory.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="inbox" size={48} color={colors.textLight} />
                <Text style={[styles.emptyText, { color: colors.textLight }]}>
                  {t('bills.noHistory') || 'No payment history'}
                </Text>
              </View>
            ) : (
              billHistory.map((item) => renderHistoryItem(item))
            )}
          </View>
        )}

        {activeTab === 'stats' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="bar-chart-2" size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('bills.yearlyStats') || 'Yearly Statistics'} - {selectedYear}
              </Text>
            </View>

            {/* Year Selector */}
            <View style={styles.yearSelector}>
              <TouchableOpacity onPress={() => setSelectedYear(selectedYear - 1)}>
                <Feather name="chevron-left" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.yearText, { color: colors.text }]}>{selectedYear}</Text>
              <TouchableOpacity onPress={() => setSelectedYear(selectedYear + 1)}>
                <Feather name="chevron-right" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Chart */}
            <View style={[styles.chartContainer, { backgroundColor: colors.card }]}>
              <LineChart
                data={getChartData()}
                width={width - 60}
                height={220}
                yAxisLabel={currentLanguage === 'tr' ? '₺' : '$'}
                chartConfig={{
                  backgroundColor: colors.card,
                  backgroundGradientFrom: colors.card,
                  backgroundGradientTo: colors.card,
                  decimalPlaces: 0,
                  color: (opacity = 1) => colors.primary,
                  labelColor: (opacity = 1) => colors.textLight,
                  style: { borderRadius: 16 },
                  propsForDots: {
                    r: '4',
                    strokeWidth: '2',
                    stroke: colors.primary,
                  },
                }}
                bezier
                style={{ marginVertical: 8, borderRadius: 16 }}
              />
            </View>

            {/* Summary by type */}
            <Text style={[styles.subSectionTitle, { color: colors.text }]}>
              {t('bills.byType') || 'By Type'}
            </Text>
            {BILL_TYPES.map((type) => {
              const typeTotal = yearlyData
                .filter(d => d.type === type.id)
                .reduce((sum, d) => sum + (d.total || 0), 0);
              if (typeTotal === 0) return null;
              return (
                <View key={type.id} style={[styles.typeRow, { backgroundColor: colors.card }]}>
                  <View style={[styles.typeIcon, { backgroundColor: type.color + '20' }]}>
                    <Feather name={type.icon} size={18} color={type.color} />
                  </View>
                  <Text style={[styles.typeName, { color: colors.text }]}>
                    {t(`bills.types.${type.id}`) || type.id}
                  </Text>
                  <Text style={[styles.typeAmount, { color: colors.text }]}>
                    {formatCurrency(typeTotal, currentLanguage)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {activeTab === 'family' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="users" size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('bills.familyMembers') || 'Family Members'}
              </Text>
              <TouchableOpacity
                style={[styles.addMemberBtn, { backgroundColor: colors.primary }]}
                onPress={() => setFamilyModalVisible(true)}
              >
                <Feather name="user-plus" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>

            {familyMembers.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="users" size={48} color={colors.textLight} />
                <Text style={[styles.emptyText, { color: colors.textLight }]}>
                  {t('bills.noFamilyMembers') || 'No family members'}
                </Text>
                <TouchableOpacity
                  style={[styles.addFamilyBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setFamilyModalVisible(true)}
                >
                  <Text style={styles.addFamilyBtnText}>
                    {t('bills.addMember') || 'Add Member'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              familyMembers.map((member) => (
                <View key={member.id} style={[styles.memberItem, { backgroundColor: colors.card }]}>
                  <View style={[styles.memberAvatar, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.memberInitial, { color: colors.primary }]}>
                      {member.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={[styles.memberName, { color: colors.text }]}>{member.name}</Text>
                    {member.email && (
                      <Text style={[styles.memberEmail, { color: colors.textLight }]}>{member.email}</Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteMember(member)}>
                    <Feather name="trash-2" size={20} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Bill Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalWrapper}>
            <View style={[styles.modalContainer, { backgroundColor: colors.modalBackground }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {editingBill ? (t('bills.editBill') || 'Edit Bill') : (t('bills.addBill') || 'Add Bill')}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Feather name="x" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Bill Name */}
                <Text style={[styles.inputLabel, { color: colors.text }]}>{t('bills.name') || 'Name'}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                  placeholder={t('bills.namePlaceholder') || 'e.g., Electric Bill'}
                  placeholderTextColor={colors.textLight}
                  value={billName}
                  onChangeText={setBillName}
                />

                {/* Bill Type */}
                <Text style={[styles.inputLabel, { color: colors.text }]}>{t('bills.type') || 'Type'}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
                  {BILL_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.id}
                      style={[
                        styles.typeChip,
                        { backgroundColor: billType === type.id ? type.color : colors.light, borderColor: type.color }
                      ]}
                      onPress={() => setBillType(type.id)}
                    >
                      <Feather name={type.icon} size={18} color={billType === type.id ? '#FFF' : type.color} />
                      <Text style={[styles.typeChipText, { color: billType === type.id ? '#FFF' : type.color }]}>
                        {t(`bills.types.${type.id}`) || type.id}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Amount */}
                <Text style={[styles.inputLabel, { color: colors.text }]}>{t('bills.amount') || 'Amount'}</Text>
                <View style={[styles.amountContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                  <Text style={[styles.currency, { color: colors.textLight }]}>{currentLanguage === 'tr' ? '₺' : '$'}</Text>
                  <TextInput
                    style={[styles.amountInput, { color: colors.text }]}
                    placeholder="0.00"
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                    value={billAmount}
                    onChangeText={setBillAmount}
                  />
                </View>

                {/* Due Date */}
                <Text style={[styles.inputLabel, { color: colors.text }]}>{t('bills.dueDate') || 'Due Date'}</Text>
                <TouchableOpacity
                  style={[styles.dateButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Feather name="calendar" size={20} color={colors.textLight} />
                  <Text style={[styles.dateText, { color: colors.text }]}>{formatDate(dueDate.toISOString())}</Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={dueDate}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(false);
                      if (selectedDate) setDueDate(selectedDate);
                    }}
                  />
                )}

                {/* Photo */}
                <Text style={[styles.inputLabel, { color: colors.text }]}>{t('bills.photo') || 'Photo'}</Text>
                <View style={styles.photoRow}>
                  <TouchableOpacity
                    style={[styles.photoBtn, { backgroundColor: colors.light }]}
                    onPress={openCamera}
                  >
                    <Feather name="camera" size={24} color={colors.primary} />
                    <Text style={[styles.photoBtnText, { color: colors.primary }]}>
                      {t('bills.takePhoto') || 'Take Photo'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.photoBtn, { backgroundColor: colors.light }]}
                    onPress={pickImage}
                  >
                    <Feather name="image" size={24} color={colors.secondary} />
                    <Text style={[styles.photoBtnText, { color: colors.secondary }]}>
                      {t('bills.pickImage') || 'Gallery'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {photoUri && (
                  <View style={styles.photoPreview}>
                    <Image source={{ uri: photoUri }} style={styles.previewImage} />
                    <TouchableOpacity
                      style={styles.removePhoto}
                      onPress={() => setPhotoUri(null)}
                    >
                      <Feather name="x" size={16} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Recurring */}
                <View style={styles.switchRow}>
                  <Text style={[styles.inputLabel, { color: colors.text, marginBottom: 0 }]}>
                    {t('bills.recurring') || 'Recurring Bill'}
                  </Text>
                  <Switch
                    value={isRecurring}
                    onValueChange={setIsRecurring}
                    trackColor={{ false: colors.border, true: colors.primary + '50' }}
                    thumbColor={isRecurring ? colors.primary : colors.textLight}
                  />
                </View>

                {isRecurring && (
                  <View style={styles.recurringRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={[styles.inputLabel, { color: colors.text }]}>
                        {t('bills.recurringDay') || 'Day of Month'}
                      </Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                        placeholder="1-31"
                        placeholderTextColor={colors.textLight}
                        keyboardType="numeric"
                        value={recurringDay}
                        onChangeText={setRecurringDay}
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={[styles.inputLabel, { color: colors.text }]}>
                        {t('bills.reminderDays') || 'Remind Days Before'}
                      </Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                        placeholder="3"
                        placeholderTextColor={colors.textLight}
                        keyboardType="numeric"
                        value={reminderDays}
                        onChangeText={setReminderDays}
                      />
                    </View>
                  </View>
                )}

                {/* Notes */}
                <Text style={[styles.inputLabel, { color: colors.text }]}>{t('bills.notes') || 'Notes'}</Text>
                <TextInput
                  style={[styles.input, styles.notesInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                  placeholder={t('bills.notesPlaceholder') || 'Optional notes...'}
                  placeholderTextColor={colors.textLight}
                  value={billNotes}
                  onChangeText={setBillNotes}
                  multiline
                  numberOfLines={3}
                />

                {/* Save Button */}
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                  onPress={handleSaveBill}
                >
                  <Feather name="check" size={20} color="#FFF" />
                  <Text style={styles.saveBtnText}>{t('common.save') || 'Save'}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Pay Modal */}
      <Modal visible={payModalVisible} transparent animationType="slide" onRequestClose={() => setPayModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setPayModalVisible(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalWrapper}>
          <View style={[styles.payModalContainer, { backgroundColor: colors.modalBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('bills.markAsPaid') || 'Mark as Paid'}
              </Text>
              <TouchableOpacity onPress={() => setPayModalVisible(false)}>
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.payBillName, { color: colors.text }]}>{payingBill?.name}</Text>

            <Text style={[styles.inputLabel, { color: colors.text }]}>{t('bills.paidAmount') || 'Paid Amount'}</Text>
            <View style={[styles.amountContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              <Text style={[styles.currency, { color: colors.textLight }]}>{currentLanguage === 'tr' ? '₺' : '$'}</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.text }]}
                placeholder="0.00"
                placeholderTextColor={colors.textLight}
                keyboardType="numeric"
                value={payAmount}
                onChangeText={setPayAmount}
              />
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>{t('bills.notes') || 'Notes'}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
              placeholder={t('bills.notesPlaceholder') || 'Optional...'}
              placeholderTextColor={colors.textLight}
              value={payNotes}
              onChangeText={setPayNotes}
            />

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.success }]}
              onPress={handlePayBill}
            >
              <Feather name="check-circle" size={20} color="#FFF" />
              <Text style={styles.saveBtnText}>{t('bills.confirmPayment') || 'Confirm Payment'}</Text>
            </TouchableOpacity>
          </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Family Member Modal */}
      <Modal visible={familyModalVisible} transparent animationType="slide" onRequestClose={() => setFamilyModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setFamilyModalVisible(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalWrapper}>
          <View style={[styles.payModalContainer, { backgroundColor: colors.modalBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('bills.addMember') || 'Add Family Member'}
              </Text>
              <TouchableOpacity onPress={() => setFamilyModalVisible(false)}>
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>{t('bills.memberName') || 'Name'}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
              placeholder={t('bills.memberNamePlaceholder') || 'Enter name'}
              placeholderTextColor={colors.textLight}
              value={newMemberName}
              onChangeText={setNewMemberName}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>{t('bills.memberEmail') || 'Email (optional)'}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
              placeholder={t('bills.memberEmailPlaceholder') || 'Enter email'}
              placeholderTextColor={colors.textLight}
              value={newMemberEmail}
              onChangeText={setNewMemberEmail}
              keyboardType="email-address"
            />

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={handleAddFamilyMember}
            >
              <Feather name="user-plus" size={20} color="#FFF" />
              <Text style={styles.saveBtnText}>{t('bills.addMember') || 'Add Member'}</Text>
            </TouchableOpacity>
          </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Camera Modal */}
      <Modal visible={cameraVisible} animationType="slide" onRequestClose={() => setCameraVisible(false)}>
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={facing}
          >
            <View style={styles.cameraOverlay}>
              <TouchableOpacity
                style={styles.cameraCloseBtn}
                onPress={() => setCameraVisible(false)}
              >
                <Feather name="x" size={28} color="#FFF" />
              </TouchableOpacity>

              <View style={styles.cameraControls}>
                <TouchableOpacity
                  style={styles.flipBtn}
                  onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
                >
                  <Feather name="refresh-cw" size={24} color="#FFF" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
                  <View style={styles.captureBtnInner} />
                </TouchableOpacity>

                <View style={{ width: 50 }} />
              </View>
            </View>
          </CameraView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  title: { fontSize: 28, fontWeight: '700' },
  addBtn: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },

  tabs: { flexDirection: 'row', borderBottomWidth: 1, marginHorizontal: 20 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabText: { fontSize: 14, fontWeight: '600' },

  content: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },

  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', flex: 1 },

  billItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 10 },
  billIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  billInfo: { flex: 1 },
  billName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  billDue: { fontSize: 13 },
  billRight: { alignItems: 'flex-end' },
  billAmount: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  payButton: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },

  historyItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 8 },
  historyAmount: { fontSize: 15, fontWeight: '700' },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 15, marginTop: 12 },

  // Stats
  yearSelector: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 16, gap: 20 },
  yearText: { fontSize: 18, fontWeight: '700' },
  chartContainer: { borderRadius: 16, padding: 10, marginBottom: 20 },
  subSectionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 12 },
  typeRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 10, marginBottom: 8 },
  typeIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  typeName: { flex: 1, fontSize: 15, fontWeight: '500' },
  typeAmount: { fontSize: 15, fontWeight: '700' },

  // Family
  addMemberBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  addFamilyBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, marginTop: 16 },
  addFamilyBtnText: { color: '#FFF', fontWeight: '600' },
  memberItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 8 },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  memberInitial: { fontSize: 18, fontWeight: '700' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '600' },
  memberEmail: { fontSize: 13, marginTop: 2 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1 },
  modalWrapper: { justifyContent: 'flex-end' },
  modalContainer: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  payModalContainer: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700' },

  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  input: { padding: 14, borderRadius: 12, fontSize: 16, borderWidth: 1 },
  notesInput: { height: 80, textAlignVertical: 'top' },

  typeScroll: { marginBottom: 8 },
  typeChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, marginRight: 8, borderWidth: 1, gap: 6 },
  typeChipText: { fontSize: 13, fontWeight: '600' },

  amountContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 14 },
  currency: { fontSize: 20, fontWeight: '700', marginRight: 8 },
  amountInput: { flex: 1, fontSize: 20, fontWeight: '700', paddingVertical: 14 },

  dateButton: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, gap: 10 },
  dateText: { fontSize: 16 },

  photoRow: { flexDirection: 'row', gap: 12 },
  photoBtn: { flex: 1, alignItems: 'center', padding: 16, borderRadius: 12, gap: 8 },
  photoBtnText: { fontSize: 13, fontWeight: '600' },
  photoPreview: { marginTop: 12, position: 'relative' },
  previewImage: { width: '100%', height: 200, borderRadius: 12 },
  removePhoto: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },

  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  recurringRow: { flexDirection: 'row', marginTop: 8 },

  saveBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 12, marginTop: 24, gap: 8 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  payBillName: { fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 16 },

  // Camera
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraOverlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'space-between' },
  cameraCloseBtn: { alignSelf: 'flex-start', margin: 20, marginTop: 50, padding: 10 },
  cameraControls: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: 40 },
  flipBtn: { padding: 15 },
  captureBtn: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  captureBtnInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFF' },
});

export default BillsScreen;
