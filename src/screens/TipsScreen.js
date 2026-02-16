import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { getTips, getCategories } from '../data/financialTips';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

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
  background: '#EFFFFB',
  card: '#FFFFFF',
  text: '#272727',
  textLight: '#666666',
  border: '#D0D0D0',
};

const TipsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { t, currentLanguage } = useLanguage();
  const themeContext = useTheme();
  const colors = themeContext?.colors || defaultColors;
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const tips = getTips(currentLanguage);
  const categories = [t('tips.all'), ...getCategories(currentLanguage)];

  const filteredTips = tips.filter(tip => {
    const allLabel = t('tips.all');
    const matchesCategory = selectedCategory === null || selectedCategory === allLabel || tip.category === selectedCategory;
    const matchesSearch = searchQuery === '' ||
      tip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tip.description.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const getCategoryColor = (category) => {
    const colorMap = {
      // English
      'Budgeting': colors.primary,
      'Saving': colors.success,
      'Spending': colors.warning,
      'Debt': colors.danger,
      'Investing': colors.info,
      // Turkish
      'Bütçeleme': colors.primary,
      'Tasarruf': colors.success,
      'Harcama': colors.warning,
      'Borç': colors.danger,
      'Yatırım': colors.info,
    };
    return colorMap[category] || colors.secondary;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('tips.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <Feather name="search" size={20} color={colors.textLight} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={t('tips.searchTips')}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.textLight}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Feather name="x" size={20} color={colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
      >
        {categories.map((category, index) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryChip,
              { backgroundColor: colors.light, borderColor: colors.border },
              (selectedCategory === category || (selectedCategory === null && index === 0)) && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setSelectedCategory(index === 0 ? null : category)}
          >
            <Text
              style={[
                styles.categoryChipText,
                { color: colors.text },
                (selectedCategory === category || (selectedCategory === null && index === 0)) && { color: colors.white },
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.tipsContainer}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={[styles.resultsText, { color: colors.textLight }]}>
          {filteredTips.length} {filteredTips.length === 1 ? t('tips.tipFound') : t('tips.tipsFound')}
        </Text>

        {filteredTips.map((tip) => (
          <View key={tip.id} style={[styles.tipCard, { backgroundColor: colors.card }]}>
            <View style={styles.tipHeader}>
              <View
                style={[
                  styles.tipIcon,
                  { backgroundColor: getCategoryColor(tip.category) + '20' },
                ]}
              >
                <Feather
                  name={tip.icon}
                  size={24}
                  color={getCategoryColor(tip.category)}
                />
              </View>
              <View style={styles.tipHeaderText}>
                <Text style={[styles.tipTitle, { color: colors.text }]}>{tip.title}</Text>
                <View
                  style={[
                    styles.categoryBadge,
                    { backgroundColor: getCategoryColor(tip.category) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryBadgeText,
                      { color: getCategoryColor(tip.category) },
                    ]}
                  >
                    {tip.category}
                  </Text>
                </View>
              </View>
            </View>
            <Text style={[styles.tipDescription, { color: colors.textLight }]}>{tip.description}</Text>
          </View>
        ))}

        {filteredTips.length === 0 && (
          <View style={styles.emptyState}>
            <Feather name="search" size={48} color={colors.textLight} />
            <Text style={[styles.emptyText, { color: colors.text }]}>{t('tips.noTips')}</Text>
            <Text style={[styles.emptySubtext, { color: colors.textLight }]}>{t('tips.adjustSearch')}</Text>
          </View>
        )}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  categoriesContainer: {
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tipsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  resultsText: {
    fontSize: 14,
    marginBottom: 12,
  },
  tipCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tipHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  tipIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tipHeaderText: {
    flex: 1,
    justifyContent: 'center',
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tipDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
});

export default TipsScreen;
