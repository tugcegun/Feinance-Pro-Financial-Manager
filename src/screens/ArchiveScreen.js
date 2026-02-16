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
  apiGetArchivedTransactions,
  apiToggleArchiveTransaction,
  apiSoftDeleteTransaction,
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

const ArchiveScreen = ({ navigation }) => {
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
      const data = await apiGetArchivedTransactions();
      setTransactions(data);
    } catch (error) {
      console.error('Error loading archived transactions:', error);
    }
  };

  const handleUnarchive = async (id) => {
    try {
      await apiToggleArchiveTransaction(id, false);
      loadTransactions();
    } catch (error) {
      console.error('Error unarchiving transaction:', error);
    }
  };

  const handleDelete = async (id) => {
    Alert.alert(
      t('transactions.deleteTransaction'),
      t('transactions.deleteConfirm'),
      [
        { text: t('transactions.cancel'), style: 'cancel' },
        {
          text: t('transactions.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await apiSoftDeleteTransaction(id);
              loadTransactions();
            } catch (error) {
              console.error('Error deleting transaction:', error);
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
      <Feather name="archive" size={64} color={colors.textLight} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('storage.emptyArchive')}</Text>
      <Text style={[styles.emptyText, { color: colors.textLight }]}>{t('storage.emptyArchiveDesc')}</Text>
    </View>
  );

  return (
    <GestureHandlerRootView style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('storage.archive')}</Text>
        <View style={styles.headerRight}>
          <Text style={[styles.countText, { color: colors.textLight }]}>
            {transactions.length} {t('storage.itemsCount')}
          </Text>
        </View>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <SwipeableTransactionItem
            transaction={{ ...item, is_archived: 1 }}
            onArchive={handleUnarchive}
            onDelete={handleDelete}
            showArchive={true}
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
  headerRight: {
    minWidth: 60,
    alignItems: 'flex-end',
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

export default ArchiveScreen;
