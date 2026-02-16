import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SwipeableTransactionItem from '../components/SwipeableTransactionItem';
import {
  apiGetDeletedTransactions,
  apiRestoreTransaction,
  apiDeleteTransaction,
  apiEmptyTrash,
} from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

// Default colors matching ThemeContext light theme
const defaultColors = {
  primary: '#50D890',
  secondary: '#4F98CA',
  success: '#50D890',
  danger: '#FF4646',
  light: '#EFFFFB',
  white: '#FFFFFF',
  background: '#EFFFFB',
  card: '#FFFFFF',
  text: '#272727',
  textLight: '#666666',
  border: '#D0D0D0',
  inputBackground: '#FFFFFF',
};

const TrashScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useLanguage();
  const themeContext = useTheme();
  const colors = themeContext?.colors || defaultColors;
  const [transactions, setTransactions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadTransactions();
    });
    return unsubscribe;
  }, [navigation]);

  const loadTransactions = async () => {
    if (!user?.id) return;
    try {
      const data = await apiGetDeletedTransactions();
      setTransactions(data);
    } catch (error) {
      console.error('Error loading deleted transactions:', error);
    }
  };

  const handleRestore = async (id) => {
    try {
      await apiRestoreTransaction(id);
      loadTransactions();
    } catch (error) {
      console.error('Error restoring transaction:', error);
    }
  };

  const handlePermanentDelete = async (id) => {
    Alert.alert(
      t('transactions.deleteTransaction'),
      t('transactions.deleteConfirm'),
      [
        { text: t('transactions.cancel'), style: 'cancel' },
        {
          text: t('transactions.deletePermanently'),
          style: 'destructive',
          onPress: async () => {
            try {
              await apiDeleteTransaction(id);
              loadTransactions();
            } catch (error) {
              console.error('Error permanently deleting transaction:', error);
            }
          },
        },
      ]
    );
  };

  const handleEmptyTrash = () => {
    if (transactions.length === 0) return;

    Alert.alert(
      t('storage.emptyTrashButton'),
      t('storage.emptyTrashConfirm'),
      [
        { text: t('transactions.cancel'), style: 'cancel' },
        {
          text: t('storage.deleteAll'),
          style: 'destructive',
          onPress: async () => {
            try {
              await apiEmptyTrash();
              loadTransactions();
            } catch (error) {
              console.error('Error emptying trash:', error);
            }
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Feather name="trash-2" size={64} color={colors.textLight} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('storage.emptyTrash')}</Text>
      <Text style={[styles.emptyText, { color: colors.textLight }]}>{t('storage.emptyTrashDesc')}</Text>
    </View>
  );

  return (
    <GestureHandlerRootView style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('storage.trash')}</Text>
        <TouchableOpacity onPress={handleEmptyTrash} disabled={transactions.length === 0}>
          <Text style={[styles.emptyButton, { color: colors.danger }, transactions.length === 0 && styles.disabledButton]}>
            {t('storage.emptyTrashButton')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.countContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.countText, { color: colors.textLight }]}>
          {transactions.length} {t('storage.itemsCount')}
        </Text>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <SwipeableTransactionItem
            transaction={item}
            onRestore={handleRestore}
            onDelete={handlePermanentDelete}
            showRestore={true}
            showArchive={false}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          transactions.length === 0 && styles.emptyList,
        ]}
        ListEmptyComponent={renderEmptyState}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
    </GestureHandlerRootView>
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
  emptyButton: {
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.4,
  },
  countContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  countText: {
    fontSize: 14,
  },
  listContent: {
    padding: 16,
  },
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default TrashScreen;
