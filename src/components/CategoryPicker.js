import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import colors from '../constants/colors';

const CategoryPicker = ({ categories, selectedCategory, onSelect }) => {
  const { t } = useLanguage();
  const { colors: themeColors } = useTheme();

  const translateCategoryName = (name) => {
    const categoryKey = name.toLowerCase();
    const translationKey = `categories.${categoryKey}`;
    return t(translationKey) || name;
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
      {categories.map((category) => {
        const isSelected = selectedCategory?.id === category.id;
        return (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryItem,
              { backgroundColor: themeColors.light, borderColor: themeColors.border },
              isSelected && { backgroundColor: category.color || themeColors.primary },
            ]}
            onPress={() => onSelect(category)}
          >
            <Feather
              name={category.icon || 'tag'}
              size={20}
              color={isSelected ? '#FFFFFF' : category.color || themeColors.primary}
            />
            <Text
              style={[
                styles.categoryText,
                { color: themeColors.text },
                isSelected && { color: '#FFFFFF' },
              ]}
            >
              {translateCategoryName(category.name)}
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
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: colors.light,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
});

export default CategoryPicker;
