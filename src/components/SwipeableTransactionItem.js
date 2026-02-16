import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import { formatDate } from '../utils/dateUtils';
import { formatCurrency } from '../utils/currency';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import colors from '../constants/colors';

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

const SwipeableTransactionItem = ({
  transaction,
  onPress,
  onDelete,
  onPin,
  onArchive,
  onRestore,
  showRestore = false,
  showArchive = true,
}) => {
  const { t, currentLanguage } = useLanguage();
  const { colors: themeColors } = useTheme();
  const swipeableRef = useRef(null);
  const isIncome = transaction.type === 'income';
  const isPinned = transaction.is_pinned === 1;

  const getCategoryName = (name) => {
    if (!name) return t('transactions.uncategorized');
    const translations = categoryTranslations[currentLanguage] || categoryTranslations.en;
    return translations[name] || name;
  };

  const closeSwipeable = () => {
    swipeableRef.current?.close();
  };

  const renderRightActions = (progress, dragX) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.rightActionsContainer}>
        {showRestore ? (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.restoreButton]}
              onPress={() => {
                closeSwipeable();
                onRestore?.(transaction.id);
              }}
            >
              <Animated.View style={{ transform: [{ scale }] }}>
                <Feather name="rotate-ccw" size={20} color={colors.white} />
                <Text style={styles.actionText}>{t('transactions.restore')}</Text>
              </Animated.View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => {
                closeSwipeable();
                onDelete?.(transaction.id);
              }}
            >
              <Animated.View style={{ transform: [{ scale }] }}>
                <Feather name="trash-2" size={20} color={colors.white} />
                <Text style={styles.actionText}>{t('transactions.deletePermanently')}</Text>
              </Animated.View>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {showArchive && (
              <TouchableOpacity
                style={[styles.actionButton, styles.archiveButton]}
                onPress={() => {
                  closeSwipeable();
                  onArchive?.(transaction.id, !transaction.is_archived);
                }}
              >
                <Animated.View style={{ transform: [{ scale }] }}>
                  <Feather name="archive" size={20} color={colors.white} />
                  <Text style={styles.actionText}>
                    {transaction.is_archived ? t('transactions.unarchive') : t('transactions.archive')}
                  </Text>
                </Animated.View>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => {
                closeSwipeable();
                onDelete?.(transaction.id);
              }}
            >
              <Animated.View style={{ transform: [{ scale }] }}>
                <Feather name="trash-2" size={20} color={colors.white} />
                <Text style={styles.actionText}>{t('transactions.delete')}</Text>
              </Animated.View>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  const renderLeftActions = (progress, dragX) => {
    if (showRestore) return null;

    const scale = dragX.interpolate({
      inputRange: [0, 100],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.leftActionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.pinButton]}
          onPress={() => {
            closeSwipeable();
            onPin?.(transaction.id, !isPinned);
          }}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <Feather name={isPinned ? "x" : "bookmark"} size={20} color={colors.white} />
            <Text style={styles.actionText}>
              {isPinned ? t('transactions.unpin') : t('transactions.pin')}
            </Text>
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      rightThreshold={40}
      leftThreshold={40}
      overshootRight={false}
      overshootLeft={false}
    >
      <TouchableOpacity
        style={[styles.container, { backgroundColor: themeColors.card }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {isPinned && (
          <View style={styles.pinnedBadge}>
            <Feather name="bookmark" size={12} color={themeColors.primary} />
          </View>
        )}
        <View style={[styles.iconContainer, { backgroundColor: (transaction.color || (isIncome ? themeColors.income : themeColors.expense)) + '20' }]}>
          <Feather
            name={transaction.icon || (isIncome ? 'arrow-down-left' : 'arrow-up-right')}
            size={24}
            color={transaction.color || (isIncome ? themeColors.income : themeColors.expense)}
          />
        </View>

        <View style={styles.details}>
          <Text style={[styles.category, { color: themeColors.text }]}>{getCategoryName(transaction.category_name)}</Text>
          <Text style={[styles.description, { color: themeColors.textLight }]} numberOfLines={1}>
            {transaction.description || t('transactions.noDescription')}
          </Text>
          <Text style={[styles.date, { color: themeColors.textLight }]}>{formatDate(transaction.date, currentLanguage)}</Text>
        </View>

        <View style={styles.rightContainer}>
          <Text style={[styles.amount, { color: isIncome ? themeColors.income : themeColors.expense }]}>
            {isIncome ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount), currentLanguage)}
          </Text>
        </View>
      </TouchableOpacity>
    </Swipeable>
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
  pinnedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
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
  },
  rightActionsContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  leftActionsContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 75,
    borderRadius: 12,
    marginLeft: 4,
  },
  pinButton: {
    backgroundColor: colors.primary,
    marginRight: 4,
    marginLeft: 0,
  },
  archiveButton: {
    backgroundColor: colors.info,
  },
  deleteButton: {
    backgroundColor: colors.danger,
  },
  restoreButton: {
    backgroundColor: colors.success,
  },
  actionText: {
    color: colors.white,
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
});

export default SwipeableTransactionItem;
