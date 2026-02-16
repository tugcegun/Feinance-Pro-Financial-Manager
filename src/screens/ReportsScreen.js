import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { apiGetTransactions, apiGetMonthlySummary } from '../services/api';
import { getCurrentMonth, getCurrentYear, getMonthName, getPreviousMonths } from '../utils/dateUtils';
import { generateMonthlySuggestions } from '../utils/aiSuggestions';
import { formatCurrency } from '../utils/currency';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

const screenWidth = Dimensions.get('window').width;

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
  background: '#EFFFFB',
  card: '#FFFFFF',
  text: '#272727',
  textLight: '#666666',
  border: '#D0D0D0',
  income: '#50D890',
  expense: '#FF4646',
};

const ReportsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t, currentLanguage } = useLanguage();
  const themeContext = useTheme();
  const colors = themeContext?.colors || defaultColors;
  const [currentMonth] = useState(getCurrentMonth());
  const [currentYear] = useState(getCurrentYear());
  const [transactions, setTransactions] = useState([]);
  const [monthData, setMonthData] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [categoryData, setCategoryData] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });

    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    if (!user?.id) return;

    try {
      const txs = await apiGetTransactions(currentMonth, currentYear);
      setTransactions(txs);

      const summary = await apiGetMonthlySummary(currentMonth, currentYear);
      setMonthData(summary);

      const aiSuggestions = generateMonthlySuggestions(txs, [], summary, currentLanguage);
      setSuggestions(aiSuggestions);

      await loadChartData();
      await loadCategoryData(txs);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadChartData = async () => {
    if (!user?.id) return;

    try {
      const months = getPreviousMonths(6, currentLanguage).reverse();
      const incomeData = [];
      const expenseData = [];

      for (const month of months) {
        const summary = await apiGetMonthlySummary(month.month, month.year);
        const income = summary.find(s => s.type === 'income')?.total || 0;
        const expense = summary.find(s => s.type === 'expense')?.total || 0;

        incomeData.push(income);
        expenseData.push(expense);
      }

      setChartData({
        labels: months.map(m => m.label.substring(0, 3)),
        datasets: [
          {
            data: incomeData,
            color: () => colors.income || '#4A7C59',
            strokeWidth: 2,
          },
          {
            data: expenseData,
            color: () => colors.expense || '#A63D40',
            strokeWidth: 2,
          },
        ],
      });
    } catch (error) {
      console.error('Error loading chart data:', error);
    }
  };

  const loadCategoryData = async (txs) => {
    const expensesByCategory = {};

    txs
      .filter(t => t.type === 'expense')
      .forEach(t => {
        if (!expensesByCategory[t.category_name]) {
          expensesByCategory[t.category_name] = {
            amount: 0,
            color: t.color || colors.primary,
          };
        }
        expensesByCategory[t.category_name].amount += t.amount;
      });

    const pieData = Object.entries(expensesByCategory)
      .sort(([, a], [, b]) => b.amount - a.amount)
      .slice(0, 5)
      .map(([name, data]) => ({
        name,
        amount: data.amount,
        color: data.color,
        legendFontColor: colors.text,
        legendFontSize: 12,
      }));

    setCategoryData(pieData);
  };

  const totalIncome = monthData.find(m => m.type === 'income')?.total || 0;
  const totalExpense = monthData.find(m => m.type === 'expense')?.total || 0;

  const chartConfig = {
    backgroundColor: colors.white || '#FFFFFF',
    backgroundGradientFrom: colors.white || '#FFFFFF',
    backgroundGradientTo: colors.white || '#FFFFFF',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    labelColor: () => colors.text,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
    },
  };

  const getSuggestionIcon = (type) => {
    switch (type) {
      case 'success': return 'check-circle';
      case 'warning': return 'alert-circle';
      case 'danger': return 'alert-triangle';
      default: return 'info';
    }
  };

  const getSuggestionColor = (type) => {
    switch (type) {
      case 'success': return colors.success;
      case 'warning': return colors.warning;
      case 'danger': return colors.danger;
      default: return colors.info;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('reports.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('reports.monthlyOverview')}</Text>
        <View style={[styles.overviewCard, { backgroundColor: colors.card }]}>
          <View style={styles.overviewItem}>
            <Text style={[styles.overviewLabel, { color: colors.textLight }]}>{t('home.income')}</Text>
            <Text style={[styles.overviewAmount, { color: colors.income }]}>
              {formatCurrency(totalIncome, currentLanguage)}
            </Text>
          </View>
          <View style={styles.overviewItem}>
            <Text style={[styles.overviewLabel, { color: colors.textLight }]}>{t('home.expenses')}</Text>
            <Text style={[styles.overviewAmount, { color: colors.expense }]}>
              {formatCurrency(totalExpense, currentLanguage)}
            </Text>
          </View>
          <View style={styles.overviewItem}>
            <Text style={[styles.overviewLabel, { color: colors.textLight }]}>{t('reports.balance')}</Text>
            <Text
              style={[
                styles.overviewAmount,
                { color: totalIncome - totalExpense >= 0 ? colors.success : colors.danger },
              ]}
            >
              {formatCurrency(totalIncome - totalExpense, currentLanguage)}
            </Text>
          </View>
        </View>

        {chartData && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('reports.monthTrend')}</Text>
            <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
              <LineChart
                data={chartData}
                width={screenWidth - 40}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                withInnerLines={false}
                withOuterLines={true}
                withVerticalLabels={true}
                withHorizontalLabels={true}
              />
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.income }]} />
                  <Text style={[styles.legendText, { color: colors.text }]}>{t('home.income')}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.expense }]} />
                  <Text style={[styles.legendText, { color: colors.text }]}>{t('home.expenses')}</Text>
                </View>
              </View>
            </View>
          </>
        )}

        {categoryData.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('reports.expensesByCategory')}</Text>
            <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
              <PieChart
                data={categoryData}
                width={screenWidth - 40}
                height={200}
                chartConfig={chartConfig}
                accessor="amount"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
              />
            </View>
          </>
        )}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('reports.aiInsights')}</Text>
        {suggestions.map((suggestion, index) => (
          <View
            key={index}
            style={[
              styles.suggestionCard,
              { backgroundColor: colors.card, borderLeftColor: getSuggestionColor(suggestion.type) },
            ]}
          >
            <View style={styles.suggestionHeader}>
              <Feather
                name={getSuggestionIcon(suggestion.type)}
                size={20}
                color={getSuggestionColor(suggestion.type)}
              />
              <Text style={[styles.suggestionTitle, { color: colors.text }]}>{suggestion.title}</Text>
            </View>
            <Text style={[styles.suggestionMessage, { color: colors.textLight }]}>{suggestion.message}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
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
  content: {
    flex: 1,
    padding: 20,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 8,
  },
  overviewCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  overviewItem: {
    flex: 1,
    alignItems: 'center',
  },
  overviewLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  overviewAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  chartCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
  },
  suggestionCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  suggestionMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default ReportsScreen;
