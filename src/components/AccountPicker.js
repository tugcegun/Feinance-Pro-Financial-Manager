import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

const AccountPicker = ({ accounts, selectedAccountId, onSelect }) => {
  const { t } = useLanguage();
  const { colors } = useTheme();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
      {/* No Account option */}
      <TouchableOpacity
        style={[
          styles.accountItem,
          { backgroundColor: colors.light, borderColor: colors.border },
          selectedAccountId === null && { backgroundColor: colors.primary, borderColor: colors.primary },
        ]}
        onPress={() => onSelect(null)}
      >
        <Feather
          name="x-circle"
          size={18}
          color={selectedAccountId === null ? '#FFFFFF' : colors.textLight}
        />
        <Text
          style={[
            styles.accountText,
            { color: colors.textLight },
            selectedAccountId === null && { color: '#FFFFFF' },
          ]}
        >
          {t('transactions.noAccount')}
        </Text>
      </TouchableOpacity>

      {accounts.map((account) => {
        const isSelected = selectedAccountId === account.id;
        return (
          <TouchableOpacity
            key={account.id}
            style={[
              styles.accountItem,
              { backgroundColor: colors.light, borderColor: colors.border },
              isSelected && { backgroundColor: colors.secondary, borderColor: colors.secondary, transform: [{ scale: 1.02 }] },
            ]}
            onPress={() => onSelect(account.id)}
          >
            <Feather
              name={account.type === 'cash' ? 'dollar-sign' : 'credit-card'}
              size={18}
              color={isSelected ? '#FFFFFF' : colors.secondary}
            />
            <Text
              style={[
                styles.accountText,
                { color: colors.text },
                isSelected && { color: '#FFFFFF' },
              ]}
              numberOfLines={1}
            >
              {account.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    maxWidth: 160,
  },
  accountText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
  },
});

export default AccountPicker;
