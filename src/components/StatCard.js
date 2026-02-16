import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '../constants/colors';

const StatCard = ({ title, amount, icon, color, subtitle }) => {
  return (
    <View style={[styles.container, { borderLeftColor: color, borderLeftWidth: 4 }]}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Feather name={icon} size={20} color={color} />
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={[styles.amount, { color }]}>${amount.toFixed(2)}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    color: colors.textLight,
    fontWeight: '500',
  },
  amount: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textLight,
  },
});

export default StatCard;
