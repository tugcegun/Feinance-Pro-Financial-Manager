import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { formatDate } from '../utils/dateUtils';
import { formatCurrency } from '../utils/currency';
import { useLanguage } from '../contexts/LanguageContext';
import colors from '../constants/colors';

// Category name translations
const categoryTranslations = {
  en: {
    'Salary': 'Salary',
    'Freelance': 'Freelance',
    'Food': 'Food',
    'Transportation': 'Transportation',
    'Shopping': 'Shopping',
    'Entertainment': 'Entertainment',
    'Bills': 'Bills',
    'Healthcare': 'Healthcare',
  },
  tr: {
    'Salary': 'Maaş',
    'Freelance': 'Serbest Çalışma',
    'Food': 'Yemek',
    'Transportation': 'Ulaşım',
    'Shopping': 'Alışveriş',
    'Entertainment': 'Eğlence',
    'Bills': 'Faturalar',
    'Healthcare': 'Sağlık',
  }
};

const TransactionItem = ({ transaction, onPress, onDelete }) => {
  const { t, currentLanguage } = useLanguage();
  const isIncome = transaction.type === 'income';

  // Translate category name
  const getCategoryName = (name) => {
    if (!name) return t('transactions.uncategorized');
    const translations = categoryTranslations[currentLanguage] || categoryTranslations.en;
    return translations[name] || name;
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: transaction.color || (isIncome ? colors.income : colors.expense) + '20' }]}>
        <Feather
          name={transaction.icon || (isIncome ? 'arrow-down-left' : 'arrow-up-right')}
          size={24}
          color={transaction.color || (isIncome ? colors.income : colors.expense)}
        />
      </View>

      <View style={styles.details}>
        <Text style={styles.category}>{getCategoryName(transaction.category_name)}</Text>
        <Text style={styles.description} numberOfLines={1}>
          {transaction.description || t('transactions.noDescription')}
        </Text>
        <Text style={styles.date}>{formatDate(transaction.date, currentLanguage)}</Text>
      </View>

      <View style={styles.rightContainer}>
        <Text style={[styles.amount, { color: isIncome ? colors.income : colors.expense }]}>
          {isIncome ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount), currentLanguage)}
        </Text>
        {onDelete && (
          <TouchableOpacity onPress={() => onDelete(transaction.id)} style={styles.deleteButton}>
            <Feather name="trash-2" size={18} color={colors.danger} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  details: {
    flex: 1,
    marginLeft: 12,
  },
  category: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: colors.textLight,
  },
  rightContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  deleteButton: {
    padding: 4,
  },
});

export default TransactionItem;
