import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Modal,
  TextInput,
  Alert,
  Dimensions,
  Animated,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  apiGetAccounts,
  apiAddAccount,
  apiUpdateAccount,
  apiDeleteAccount,
  apiGetTotalBalance,
  apiGetTransactionsByAccount,
  apiTransferBetweenAccounts,
} from '../services/api';
import { formatCurrency } from '../utils/currency';

const { width: SW, height: SH } = Dimensions.get('window');
const CARD_W = SW * 0.73;
const CARD_H = SH * 0.48;
const CARD_GAP = 14;
const SIDE_PAD = (SW - CARD_W) / 2;

const GRADIENTS = [
  { colors: ['#e8507f', '#f7627b', '#f5a0b0'] },
  { colors: ['#9b59b6', '#8e44ad', '#c39bd3'] },
  { colors: ['#4facfe', '#00f2fe', '#4facfe'] },
  { colors: ['#43e97b', '#38f9d7', '#43e97b'] },
  { colors: ['#fa709a', '#fee140', '#fa709a'] },
  { colors: ['#a18cd1', '#fbc2eb', '#a18cd1'] },
  { colors: ['#ff9a9e', '#fecfef', '#ff9a9e'] },
  { colors: ['#667eea', '#764ba2', '#667eea'] },
];

const BANKS = [
  { name: 'Ziraat Bankası', g: 0 }, { name: 'Akbank', g: 1 },
  { name: 'Garanti BBVA', g: 2 }, { name: 'İş Bankası', g: 3 },
  { name: 'Yapı Kredi', g: 4 }, { name: 'Halkbank', g: 5 },
  { name: 'Vakıfbank', g: 6 }, { name: 'QNB Finansbank', g: 0 },
  { name: 'Denizbank', g: 4 }, { name: 'TEB', g: 2 },
  { name: 'ING', g: 1 }, { name: 'Enpara', g: 1 },
  { name: 'Papara', g: 0 }, { name: 'Nakit', g: 3 }, { name: 'Diğer', g: 7 },
];

const TYPES = [
  { v: 'debit', tr: 'Banka Kartı', en: 'Debit Card' },
  { v: 'credit', tr: 'Kredi Kartı', en: 'Credit Card' },
  { v: 'cash', tr: 'Nakit', en: 'Cash' },
  { v: 'savings', tr: 'Birikim', en: 'Savings' },
];

const defaultColors = {
  primary: '#50D890', secondary: '#4F98CA', background: '#EFFFFB',
  card: '#FFFFFF', text: '#272727', textLight: '#666666',
};

// ─── Chip ───
const Chip = ({ s = 1 }) => (
  <View style={{ width: 46 * s, height: 34 * s, borderRadius: 6 * s, backgroundColor: '#FFD700', padding: 5 * s, justifyContent: 'space-around' }}>
    <View style={{ height: 3 * s, backgroundColor: 'rgba(180,140,0,0.35)', borderRadius: 1 }} />
    <View style={{ height: 3 * s, backgroundColor: 'rgba(180,140,0,0.35)', borderRadius: 1 }} />
    <View style={{ height: 3 * s, backgroundColor: 'rgba(180,140,0,0.35)', borderRadius: 1 }} />
  </View>
);

const getGrad = (acc) => {
  if (!acc) return GRADIENTS[0].colors;
  const i = acc.color ? parseInt(acc.color) : 0;
  const safe = isNaN(i) ? 0 : Math.abs(i) % GRADIENTS.length;
  return GRADIENTS[safe]?.colors || GRADIENTS[0].colors;
};

// ═══════════════════════════════════════════
// ─── MAIN COMPONENT ───
// ═══════════════════════════════════════════
const AccountsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t, currentLanguage } = useLanguage();
  const ctx = useTheme();
  const colors = ctx?.colors || defaultColors;
  const dark = ctx?.isDarkMode || false;
  const bg = dark ? '#0D0D0D' : colors.background;
  const fg = dark ? '#FFFFFF' : colors.text;
  const fgLight = dark ? 'rgba(255,255,255,0.5)' : colors.textLight;
  const cardBg = dark ? '#1A1A1A' : colors.card;

  // Data
  const [accounts, setAccounts] = useState([]);
  const [totalBal, setTotalBal] = useState(0);
  const [accountTxns, setAccountTxns] = useState([]);

  // UI
  const [detailCard, setDetailCard] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editAcc, setEditAcc] = useState(null);
  const [bankPicker, setBankPicker] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferFrom, setTransferFrom] = useState(null);
  const [transferTo, setTransferTo] = useState(null);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDesc, setTransferDesc] = useState('');

  // Form
  const [fName, setFName] = useState('');
  const [fType, setFType] = useState('credit');
  const [fBank, setFBank] = useState(null);
  const [fGrad, setFGrad] = useState(0);
  const [fBal, setFBal] = useState('');
  const [fLast4, setFLast4] = useState('');
  const [fHolder, setFHolder] = useState('');

  // Anim
  const scrollX = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(SH)).current;
  const sheetOp = useRef(new Animated.Value(0)).current;
  const cardPop = useRef(new Animated.Value(0.85)).current;

  const typeName = (type) => {
    if (type === 'credit') return t('accounts.creditCard');
    if (type === 'debit') return t('accounts.debitCard');
    if (type === 'cash') return t('accounts.cash');
    if (type === 'savings') return t('accounts.savings');
    return '';
  };

  // ─── Load Data ───
  const load = async () => {
    if (!user?.id) return;
    try {
      const accs = await apiGetAccounts();
      setAccounts(accs);
      const bal = await apiGetTotalBalance();
      setTotalBal(bal);
    } catch (e) {
      console.error('Load error:', e);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation]);

  // ─── Open Detail ───
  const openDetail = async (acc) => {
    setDetailCard(acc);
    sheetY.setValue(SH);
    sheetOp.setValue(0);
    cardPop.setValue(0.85);

    // Load account-specific transactions
    try {
      const txs = await apiGetTransactionsByAccount(acc.id);
      setAccountTxns(txs.slice(0, 10));
    } catch (e) {
      setAccountTxns([]);
    }

    Animated.parallel([
      Animated.timing(sheetOp, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring(sheetY, { toValue: 0, friction: 9, tension: 65, useNativeDriver: true }),
      Animated.spring(cardPop, { toValue: 1, friction: 7, tension: 55, useNativeDriver: true, delay: 120 }),
    ]).start();
  };

  const closeDetail = () => {
    Animated.parallel([
      Animated.timing(sheetOp, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(sheetY, { toValue: SH, duration: 280, useNativeDriver: true }),
    ]).start(() => setDetailCard(null));
  };

  // ─── Form ───
  const openForm = (acc = null) => {
    setEditAcc(acc);
    setFName(acc?.name || '');
    setFType(acc?.type || 'credit');
    setFBank(acc ? BANKS.find(b => b.name === acc.bank_name) || null : null);
    setFGrad(acc?.color ? parseInt(acc.color) : 0);
    setFBal(acc?.balance?.toString() || '');
    setFLast4(acc?.card_last_four || '');
    setFHolder(acc?.icon || user?.name || '');
    setFormOpen(true);
  };

  const saveForm = async () => {
    if (!fName.trim()) {
      Alert.alert(t('common.error'), t('accounts.nameRequired'));
      return;
    }
    try {
      if (editAcc) {
        await apiUpdateAccount(editAcc.id, fName.trim(), fType, fBank?.name || '', parseFloat(fBal) || 0, fGrad.toString(), fHolder, fLast4);
      } else {
        await apiAddAccount(fName.trim(), fType, fBank?.name || '', parseFloat(fBal) || 0, fGrad.toString(), fHolder, fLast4);
      }
      setFormOpen(false);
      setEditAcc(null);
      load();
    } catch (e) {
      Alert.alert(t('common.error'), e.message);
    }
  };

  const doDelete = (acc) => {
    Alert.alert(t('accounts.deleteAccount'), t('accounts.deleteConfirm'), [
      { text: t('transactions.cancel'), style: 'cancel' },
      { text: t('transactions.delete'), style: 'destructive', onPress: async () => {
        try { await apiDeleteAccount(acc.id); closeDetail(); load(); } catch (e) { Alert.alert(t('common.error'), e.message); }
      }},
    ]);
  };

  // ─── Transfer ───
  const openTransfer = (fromAcc = null) => {
    if (accounts.length < 2) {
      Alert.alert(t('common.error'), t('accounts.noAccounts'));
      return;
    }
    setTransferFrom(fromAcc);
    setTransferTo(null);
    setTransferAmount('');
    setTransferDesc('');
    if (detailCard) closeDetail();
    setTimeout(() => setTransferOpen(true), detailCard ? 350 : 0);
  };

  const doTransfer = async () => {
    if (!transferFrom || !transferTo) {
      Alert.alert(t('common.error'), t('accounts.transferFrom') + ' & ' + t('accounts.transferTo'));
      return;
    }
    if (transferFrom.id === transferTo.id) {
      Alert.alert(t('common.error'), t('accounts.sameAccountError'));
      return;
    }
    const amt = parseFloat(transferAmount);
    if (!amt || amt <= 0) {
      Alert.alert(t('common.error'), t('transactions.validAmount'));
      return;
    }
    try {
      await apiTransferBetweenAccounts(transferFrom.id, transferTo.id, amt);
      setTransferOpen(false);
      load();
      Alert.alert(t('common.success'), t('accounts.transferSuccess'));
    } catch (e) {
      if (e.message === 'INSUFFICIENT_BALANCE') {
        Alert.alert(t('common.error'), t('accounts.insufficientBalance'));
      } else if (e.message === 'SAME_ACCOUNT') {
        Alert.alert(t('common.error'), t('accounts.sameAccountError'));
      } else {
        Alert.alert(t('common.error'), e.message);
      }
    }
  };

  // ─── Render Card ───
  const renderCard = (acc, idx) => {
    const inp = [
      (idx - 1) * (CARD_W + CARD_GAP),
      idx * (CARD_W + CARD_GAP),
      (idx + 1) * (CARD_W + CARD_GAP),
    ];
    const sc = scrollX.interpolate({ inputRange: inp, outputRange: [0.87, 1, 0.87], extrapolate: 'clamp' });
    const op = scrollX.interpolate({ inputRange: inp, outputRange: [0.4, 1, 0.4], extrapolate: 'clamp' });
    const ty = scrollX.interpolate({ inputRange: inp, outputRange: [14, 0, 14], extrapolate: 'clamp' });

    return (
      <Animated.View key={acc.id} style={{ width: CARD_W, height: CARD_H, marginRight: CARD_GAP, transform: [{ scale: sc }, { translateY: ty }], opacity: op }}>
        <Pressable onPress={() => openDetail(acc)} style={{ flex: 1 }}>
          <LinearGradient colors={getGrad(acc)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.cardGrad}>
            {/* Top */}
            <View style={s.cardTop}>
              <View style={s.wifiCircle}>
                <Feather name="wifi" size={18} color="rgba(255,255,255,0.85)" style={{ transform: [{ rotate: '45deg' }] }} />
              </View>
              <Text style={s.visaV}>{acc.type === 'credit' ? 'VISA' : acc.type === 'debit' ? 'MASTER' : ''}</Text>
            </View>
            <View style={{ flex: 1 }} />
            {/* Bottom */}
            <View style={s.cardBot}>
              <View style={s.cardBotL}>
                <Text style={s.typeV}>{typeName(acc.type)}</Text>
                <Chip />
              </View>
              <View style={s.cardBotR}>
                <Text style={s.holderLbl}>{t('accounts.cardHolder').toUpperCase()}</Text>
                <Text style={s.holderVal} numberOfLines={1}>{acc.icon || user?.name || ''}</Text>
              </View>
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  };

  // ─── Render Transaction ───
  const dotC = ['#FF4444', '#FF6B8A', '#CC44CC', '#4466FF', '#3344AA', '#44BBCC', '#FF8844', '#AA66DD', '#44CC88', '#FFAA33'];
  const renderTx = (tx, i) => (
    <View key={tx.id} style={s.txRow}>
      <View style={[s.txDot, { backgroundColor: dotC[i % dotC.length] }]} />
      <View style={{ flex: 1 }}>
        <Text style={[s.txName, { color: fg }]}>{tx.category_name || 'Transaction'}</Text>
        <Text style={[s.txDesc, { color: fgLight }]}>{tx.description || ''}</Text>
      </View>
      <Text style={[s.txAmt, { color: tx.type === 'income' ? '#4ECDC4' : fg }]}>
        {tx.type === 'income' ? '+' : ''}{formatCurrency(tx.amount, currentLanguage)}
      </Text>
    </View>
  );

  // ═══════════════════════════════════════════
  // ─── RENDER ───
  // ═══════════════════════════════════════════
  return (
    <View style={[s.root, { backgroundColor: bg }]}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />

      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Feather name="chevron-left" size={28} color={fg} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        {accounts.length >= 2 && (
          <TouchableOpacity onPress={() => openTransfer()} style={[s.addBtn, { backgroundColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', marginRight: 8 }]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="repeat" size={20} color={fg} />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => openForm()} style={[s.addBtn, { backgroundColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="plus" size={20} color={fg} />
        </TouchableOpacity>
      </View>

      {/* ── Title + Balance ── */}
      <View style={s.titleWrap}>
        <Text style={[s.title, { color: fg }]}>{t('accounts.bankCards')}</Text>
        <Text style={[s.balLbl, { color: fgLight }]}>{t('accounts.balance')}</Text>
        <Text style={[s.balVal, { color: fg }]}>{formatCurrency(totalBal, currentLanguage)}</Text>
      </View>

      {/* ── Cards ── */}
      {accounts.length === 0 ? (
        <View style={s.empty}>
          <Feather name="credit-card" size={60} color={fgLight} />
          <Text style={[s.emptyTxt, { color: fgLight }]}>{t('accounts.noAccounts')}</Text>
          <TouchableOpacity style={s.emptyBtn} onPress={() => openForm()}>
            <Feather name="plus" size={18} color="#FFF" />
            <Text style={s.emptyBtnTxt}>{t('accounts.addAccount')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Animated.ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_W + CARD_GAP}
          snapToAlignment="start"
          decelerationRate="fast"
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingHorizontal: SIDE_PAD }}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: true }
          )}
        >
          {accounts.map((acc, i) => renderCard(acc, i))}
        </Animated.ScrollView>
      )}

      {/* spacer */}

      {/* ═══ DETAIL MODAL ═══ */}
      {detailCard !== null && (
        <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={closeDetail}>
          <Animated.View style={[s.overlay, { opacity: sheetOp }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeDetail} />
          </Animated.View>

          <Animated.View style={[s.sheet, { backgroundColor: bg, transform: [{ translateY: sheetY }] }]}>
            <View style={s.handle} />

            <View style={s.sheetHead}>
              <TouchableOpacity onPress={closeDetail} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Feather name="chevron-left" size={28} color={fg} />
              </TouchableOpacity>
              <Text style={[s.sheetTitle, { color: fg }]}>{t('accounts.fullCard')}</Text>
              <TouchableOpacity
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                onPress={() => {
                  const card = detailCard;
                  closeDetail();
                  setTimeout(() => openForm(card), 350);
                }}
              >
                <Feather name="edit-2" size={22} color={fg} />
              </TouchableOpacity>
            </View>

            <Text style={[s.sheetHint, { color: fgLight }]}>{t('accounts.rotateCardHint')}</Text>

            {/* Detail Card */}
            <Animated.View style={[s.dCardWrap, { transform: [{ scale: cardPop }] }]}>
              <LinearGradient colors={getGrad(detailCard)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.dCard}>
                <View style={s.dCardTop}>
                  <Text style={s.dCardType}>{typeName(detailCard.type)}</Text>
                  <Feather name="wifi" size={18} color="rgba(255,255,255,0.85)" style={{ transform: [{ rotate: '45deg' }] }} />
                </View>
                <View style={s.dCardMid}>
                  <Chip />
                  <Text style={s.dCardNum}>{detailCard.card_last_four || '0000'}</Text>
                </View>
                <View style={s.dCardBtm}>
                  <View>
                    <Text style={s.dLbl}>{t('accounts.cardHolder').toUpperCase()}</Text>
                    <Text style={s.dName}>{detailCard.icon || user?.name}</Text>
                  </View>
                  <Text style={s.dVisa}>VISA</Text>
                </View>
              </LinearGradient>
            </Animated.View>

            {/* Transactions */}
            <View style={s.txWrap}>
              <Text style={[s.txTitle, { color: fg }]}>{t('transactions.accountTransactions')}</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {accountTxns.length > 0 ? accountTxns.map((tx, i) => renderTx(tx, i)) : (
                  <Text style={[s.txNone, { color: fgLight }]}>{t('accounts.noTransactions')}</Text>
                )}
              </ScrollView>
            </View>

            {/* Transfer */}
            {accounts.length >= 2 && (
              <TouchableOpacity style={s.transferBtn} onPress={() => openTransfer(detailCard)}>
                <Feather name="repeat" size={18} color="#667eea" />
                <Text style={s.transferTxt}>{t('accounts.transfer')}</Text>
              </TouchableOpacity>
            )}

            {/* Delete */}
            <TouchableOpacity style={s.delBtn} onPress={() => doDelete(detailCard)}>
              <Feather name="trash-2" size={18} color="#FF6B6B" />
              <Text style={s.delTxt}>{t('accounts.deleteCard')}</Text>
            </TouchableOpacity>
          </Animated.View>
        </Modal>
      )}

      {/* ═══ ADD/EDIT FORM MODAL ═══ */}
      <Modal visible={formOpen} transparent animationType="slide" onRequestClose={() => setFormOpen(false)}>
        <View style={s.modalOvl}>
          <Pressable style={{ flex: 1 }} onPress={() => setFormOpen(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ justifyContent: 'flex-end' }}>
            <View style={[s.formSheet, { backgroundColor: cardBg }]}>
              <View style={s.handle} />
              <View style={s.formHead}>
                <Text style={[s.formTitle, { color: fg }]}>{editAcc ? t('accounts.editAccount') : t('accounts.addAccount')}</Text>
                <TouchableOpacity onPress={() => setFormOpen(false)}>
                  <Feather name="x" size={24} color={fg} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Preview */}
                <View style={{ alignItems: 'center', marginBottom: 16 }}>
                  <LinearGradient colors={GRADIENTS[fGrad].colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.prev}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Feather name="wifi" size={14} color="rgba(255,255,255,0.8)" style={{ transform: [{ rotate: '45deg' }] }} />
                      <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 13, letterSpacing: 2 }}>VISA</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Chip s={0.65} />
                      <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15, letterSpacing: 2 }}>•••• {fLast4 || '0000'}</Text>
                    </View>
                    <Text style={{ color: 'rgba(255,255,255,0.9)', fontWeight: '600', fontSize: 12 }}>{fHolder || t('accounts.cardHolderName')}</Text>
                  </LinearGradient>
                </View>

                {/* Colors */}
                <Text style={[s.lbl, { color: fgLight }]}>{t('accounts.cardColor')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
                  {GRADIENTS.map((g, i) => (
                    <TouchableOpacity key={i} onPress={() => setFGrad(i)} style={[s.cOpt, fGrad === i && { borderColor: '#667eea' }]}>
                      <LinearGradient colors={g.colors} style={s.cDot} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Bank */}
                <Text style={[s.lbl, { color: fgLight }]}>{t('accounts.selectBank')}</Text>
                <TouchableOpacity style={[s.inp, { backgroundColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} onPress={() => setBankPicker(true)}>
                  <Text style={{ color: fg, fontSize: 16 }}>{fBank?.name || t('accounts.selectBank')}</Text>
                  <Feather name="chevron-down" size={20} color={fgLight} />
                </TouchableOpacity>

                {/* Name */}
                <Text style={[s.lbl, { color: fgLight }]}>{t('accounts.accountName')}</Text>
                <TextInput style={[s.inp, { backgroundColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: fg }]} value={fName} onChangeText={setFName} placeholder={t('accounts.accountNamePlaceholder')} placeholderTextColor={fgLight} />

                {/* Holder */}
                <Text style={[s.lbl, { color: fgLight }]}>{t('accounts.cardHolderName')}</Text>
                <TextInput style={[s.inp, { backgroundColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: fg }]} value={fHolder} onChangeText={setFHolder} placeholder={t('accounts.cardHolderNamePlaceholder')} placeholderTextColor={fgLight} />

                {/* Type */}
                <Text style={[s.lbl, { color: fgLight }]}>{t('accounts.accountType')}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {TYPES.map((tp) => (
                    <TouchableOpacity key={tp.v} style={[s.chip, { backgroundColor: fType === tp.v ? '#667eea' : (dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)') }]} onPress={() => setFType(tp.v)}>
                      <Text style={[s.chipTxt, { color: fType === tp.v ? '#FFF' : fgLight }]}>{currentLanguage === 'tr' ? tp.tr : tp.en}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Balance */}
                <Text style={[s.lbl, { color: fgLight }]}>{t('accounts.balance')}</Text>
                <View style={[s.inp, { backgroundColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', flexDirection: 'row', alignItems: 'center' }]}>
                  <Text style={{ color: fg, fontSize: 22, fontWeight: '700', marginRight: 8 }}>{currentLanguage === 'tr' ? '₺' : '$'}</Text>
                  <TextInput style={{ flex: 1, color: fg, fontSize: 22, fontWeight: '700', paddingVertical: 0 }} value={fBal} onChangeText={setFBal} placeholder="0.00" placeholderTextColor={fgLight} keyboardType="numeric" />
                </View>

                {/* Last 4 */}
                <Text style={[s.lbl, { color: fgLight }]}>{t('accounts.cardLastFour')}</Text>
                <TextInput style={[s.inp, { backgroundColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: fg }]} value={fLast4} onChangeText={(v) => setFLast4(v.replace(/[^0-9]/g, '').slice(0, 4))} placeholder="1234" placeholderTextColor={fgLight} keyboardType="numeric" maxLength={4} />

                {/* Save */}
                <TouchableOpacity style={s.saveBtn} onPress={saveForm}>
                  <Feather name="check" size={20} color="#FFF" />
                  <Text style={s.saveTxt}>{t('common.save')}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ═══ TRANSFER MODAL ═══ */}
      <Modal visible={transferOpen} transparent animationType="slide" onRequestClose={() => setTransferOpen(false)}>
        <View style={s.modalOvl}>
          <Pressable style={{ flex: 1 }} onPress={() => setTransferOpen(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ justifyContent: 'flex-end' }}>
            <View style={[s.formSheet, { backgroundColor: cardBg }]}>
              <View style={s.handle} />
              <View style={s.formHead}>
                <Text style={[s.formTitle, { color: fg }]}>{t('accounts.transferBetween')}</Text>
                <TouchableOpacity onPress={() => setTransferOpen(false)}>
                  <Feather name="x" size={24} color={fg} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* From Account */}
                <Text style={[s.lbl, { color: fgLight }]}>{t('accounts.transferFrom')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                  {accounts.map((acc) => (
                    <TouchableOpacity
                      key={acc.id}
                      style={[s.trAccCard, { backgroundColor: transferFrom?.id === acc.id ? '#667eea' : (dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)') }]}
                      onPress={() => setTransferFrom(acc)}
                    >
                      <LinearGradient colors={getGrad(acc)} style={s.trAccDot} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                      <View>
                        <Text style={[s.trAccName, { color: transferFrom?.id === acc.id ? '#FFF' : fg }]} numberOfLines={1}>{acc.name}</Text>
                        <Text style={[s.trAccBal, { color: transferFrom?.id === acc.id ? 'rgba(255,255,255,0.7)' : fgLight }]}>{formatCurrency(acc.balance, currentLanguage)}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Arrow */}
                <View style={{ alignItems: 'center', marginVertical: 8 }}>
                  <Feather name="arrow-down" size={24} color={fgLight} />
                </View>

                {/* To Account */}
                <Text style={[s.lbl, { color: fgLight, marginTop: 0 }]}>{t('accounts.transferTo')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                  {accounts.filter(a => a.id !== transferFrom?.id).map((acc) => (
                    <TouchableOpacity
                      key={acc.id}
                      style={[s.trAccCard, { backgroundColor: transferTo?.id === acc.id ? '#667eea' : (dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)') }]}
                      onPress={() => setTransferTo(acc)}
                    >
                      <LinearGradient colors={getGrad(acc)} style={s.trAccDot} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                      <View>
                        <Text style={[s.trAccName, { color: transferTo?.id === acc.id ? '#FFF' : fg }]} numberOfLines={1}>{acc.name}</Text>
                        <Text style={[s.trAccBal, { color: transferTo?.id === acc.id ? 'rgba(255,255,255,0.7)' : fgLight }]}>{formatCurrency(acc.balance, currentLanguage)}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Amount */}
                <Text style={[s.lbl, { color: fgLight }]}>{t('accounts.transferAmount')}</Text>
                <View style={[s.inp, { backgroundColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', flexDirection: 'row', alignItems: 'center' }]}>
                  <Text style={{ color: fg, fontSize: 22, fontWeight: '700', marginRight: 8 }}>{currentLanguage === 'tr' ? '₺' : '$'}</Text>
                  <TextInput style={{ flex: 1, color: fg, fontSize: 22, fontWeight: '700', paddingVertical: 0 }} value={transferAmount} onChangeText={setTransferAmount} placeholder="0.00" placeholderTextColor={fgLight} keyboardType="numeric" />
                </View>

                {/* Transfer Button */}
                <TouchableOpacity style={s.saveBtn} onPress={doTransfer}>
                  <Feather name="repeat" size={20} color="#FFF" />
                  <Text style={s.saveTxt}>{t('accounts.transferNow')}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ═══ BANK PICKER ═══ */}
      <Modal visible={bankPicker} transparent animationType="slide" onRequestClose={() => setBankPicker(false)}>
        <View style={s.modalOvl}>
          <Pressable style={{ flex: 1 }} onPress={() => setBankPicker(false)} />
          <View style={[s.bankSheet, { backgroundColor: cardBg }]}>
            <View style={s.handle} />
            <View style={s.formHead}>
              <Text style={[s.formTitle, { color: fg }]}>{t('accounts.selectBank')}</Text>
              <TouchableOpacity onPress={() => setBankPicker(false)}>
                <Feather name="x" size={24} color={fg} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {BANKS.map((b, i) => (
                <TouchableOpacity key={i} style={s.bankRow} onPress={() => { setFBank(b); setFGrad(b.g); if (!fName) setFName(b.name); setBankPicker(false); }}>
                  <LinearGradient colors={GRADIENTS[b.g].colors} style={{ width: 26, height: 26, borderRadius: 13 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                  <Text style={[s.bankTxt, { color: fg }]}>{b.name}</Text>
                  {fBank?.name === b.name && <Feather name="check" size={20} color="#667eea" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ═══════════════════════════════════════════
// ─── STYLES ───
// ═══════════════════════════════════════════
const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 4, zIndex: 10 },
  titleWrap: { paddingHorizontal: 24, marginBottom: 14 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
  balLbl: { fontSize: 13, marginBottom: 2 },
  balVal: { fontSize: 28, fontWeight: '700' },

  // Cards
  cardGrad: { flex: 1, borderRadius: 24, padding: 22, justifyContent: 'space-between' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  wifiCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  visaV: { fontSize: 20, fontWeight: '800', color: 'rgba(255,255,255,0.9)', letterSpacing: 5, transform: [{ rotate: '-90deg' }], marginTop: 28, marginRight: -8 },
  cardBot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  cardBotL: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  typeV: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.8)', transform: [{ rotate: '-90deg' }], width: 80, textAlign: 'center', marginBottom: 8, marginLeft: -18 },
  cardBotR: { alignItems: 'flex-end', flexShrink: 1, maxWidth: '55%' },
  holderLbl: { fontSize: 8, color: 'rgba(255,255,255,0.45)', letterSpacing: 2, marginBottom: 2 },
  holderVal: { fontSize: 13, fontWeight: '700', color: '#FFF' },

  // Add button
  addBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },

  // Empty
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyTxt: { fontSize: 16, marginTop: 14, marginBottom: 22 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#667eea', paddingHorizontal: 20, paddingVertical: 11, borderRadius: 12, gap: 6 },
  emptyBtnTxt: { fontSize: 14, fontWeight: '600', color: '#FFF' },

  // Detail Sheet
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, height: SH * 0.87, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 8 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(150,150,150,0.3)', alignSelf: 'center', marginBottom: 12 },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sheetTitle: { fontSize: 20, fontWeight: '700' },
  sheetHint: { fontSize: 13, textAlign: 'center', marginBottom: 16 },

  // Detail Card
  dCardWrap: { alignItems: 'center', marginBottom: 18 },
  dCard: { width: SW - 50, height: 185, borderRadius: 20, padding: 20, justifyContent: 'space-between' },
  dCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dCardType: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  dCardMid: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dCardNum: { fontSize: 22, fontWeight: '800', color: '#FFF', letterSpacing: 2 },
  dCardBtm: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  dLbl: { fontSize: 8, color: 'rgba(255,255,255,0.45)', letterSpacing: 2, marginBottom: 2 },
  dName: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  dVisa: { fontSize: 24, fontWeight: '900', color: '#FFF', letterSpacing: 3, fontStyle: 'italic' },

  // Tx
  txWrap: { flex: 1, marginTop: 2 },
  txTitle: { fontSize: 17, fontWeight: '700', marginBottom: 10 },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(150,150,150,0.15)' },
  txDot: { width: 34, height: 34, borderRadius: 17, marginRight: 12 },
  txName: { fontSize: 14, fontWeight: '600' },
  txDesc: { fontSize: 11, marginTop: 1 },
  txAmt: { fontSize: 14, fontWeight: '700' },
  txNone: { fontSize: 14, textAlign: 'center', marginTop: 20 },
  transferBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(150,150,150,0.15)' },
  transferTxt: { fontSize: 14, fontWeight: '600', color: '#667eea' },
  delBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingBottom: 18, gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(150,150,150,0.15)' },
  delTxt: { fontSize: 14, fontWeight: '600', color: '#FF6B6B' },

  // Form
  modalOvl: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  formSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 8, maxHeight: '90%' },
  formHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  formTitle: { fontSize: 20, fontWeight: '700' },
  prev: { width: SW - 80, height: 130, borderRadius: 16, padding: 16, justifyContent: 'space-between' },
  lbl: { fontSize: 13, fontWeight: '600', marginBottom: 7, marginTop: 12 },
  inp: { padding: 14, borderRadius: 14, fontSize: 16 },
  cOpt: { marginRight: 10, borderRadius: 13, padding: 3, borderWidth: 2.5, borderColor: 'transparent' },
  cDot: { width: 42, height: 42, borderRadius: 10 },
  chip: { paddingHorizontal: 15, paddingVertical: 9, borderRadius: 12 },
  chipTxt: { fontSize: 13, fontWeight: '600' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#667eea', padding: 15, borderRadius: 14, marginTop: 22, marginBottom: 34, gap: 8 },
  saveTxt: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  // Bank
  // Transfer
  trAccCard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, marginRight: 8, gap: 10 },
  trAccDot: { width: 32, height: 32, borderRadius: 16 },
  trAccName: { fontSize: 13, fontWeight: '600' },
  trAccBal: { fontSize: 11, marginTop: 1 },

  bankSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 8, maxHeight: '70%' },
  bankRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(150,150,150,0.15)', gap: 12 },
  bankTxt: { flex: 1, fontSize: 16 },
});

export default AccountsScreen;
