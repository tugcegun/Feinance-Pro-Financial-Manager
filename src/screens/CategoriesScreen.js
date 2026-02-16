import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  apiGetCategories,
  apiAddCategory,
  apiUpdateCategory,
  apiDeleteCategory,
} from '../services/api';

const defaultColors = {
  primary: '#50D890',
  secondary: '#4F98CA',
  background: '#EFFFFB',
  card: '#FFFFFF',
  text: '#272727',
  textLight: '#666666',
  border: '#D0D0D0',
  danger: '#FF4646',
};

const ICON_LIST = [
  'dollar-sign', 'briefcase', 'shopping-cart', 'coffee', 'home', 'truck',
  'heart', 'book', 'film', 'music', 'gift', 'phone',
  'wifi', 'tool', 'star', 'zap', 'umbrella', 'car',
  'globe', 'award', 'camera', 'scissors', 'tag', 'credit-card',
];

const COLOR_LIST = [
  '#FF5252', '#FF7043', '#FFA726', '#FFCA28', '#66BB6A',
  '#4CAF50', '#4F98CA', '#9B59B6', '#EC407A', '#78909C',
];

const CategoriesScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useLanguage();
  const themeContext = useTheme();
  const colors = themeContext?.colors || defaultColors;
  const isDarkMode = themeContext?.isDarkMode || false;

  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab] = useState('expense');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('expense');
  const [formIcon, setFormIcon] = useState('tag');
  const [formColor, setFormColor] = useState('#FF5252');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    if (!user?.id) return;
    const cats = await apiGetCategories();
    setCategories(cats);
  };

  const filteredCategories = categories.filter(c => c.type === activeTab);

  const openAddModal = () => {
    setEditingCategory(null);
    setFormName('');
    setFormType(activeTab);
    setFormIcon('tag');
    setFormColor('#FF5252');
    setModalVisible(true);
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormType(cat.type);
    setFormIcon(cat.icon || 'tag');
    setFormColor(cat.color || '#FF5252');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      Alert.alert(t('common.error'), t('categories.nameRequired'));
      return;
    }

    try {
      if (editingCategory) {
        await apiUpdateCategory(editingCategory.id, formName.trim(), formIcon, formColor);
      } else {
        await apiAddCategory(formName.trim(), formType, formIcon, formColor);
      }
      setModalVisible(false);
      loadCategories();
    } catch (error) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  const handleDelete = (cat) => {
    Alert.alert(
      t('categories.deleteCategory'),
      t('categories.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await apiDeleteCategory(cat.id);
              loadCategories();
            } catch (error) {
              Alert.alert(t('common.error'), error.message);
            }
          },
        },
      ]
    );
  };

  const getCategoryTranslation = (name) => {
    const key = name.toLowerCase();
    const map = {
      salary: 'salary', freelance: 'freelance', food: 'food',
      transportation: 'transportation', shopping: 'shopping',
      entertainment: 'entertainment', bills: 'bills', healthcare: 'healthcare',
    };
    if (map[key]) {
      return t(`categories.${map[key]}`);
    }
    return name;
  };

  const cardBg = isDarkMode ? '#1A1A1A' : colors.card;
  const inputBg = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('categories.manage')}</Text>
          <TouchableOpacity onPress={openAddModal} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Feather name="plus" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'expense' && { backgroundColor: colors.primary },
            ]}
            onPress={() => setActiveTab('expense')}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === 'expense' ? '#FFFFFF' : colors.textLight },
            ]}>
              {t('categories.expenseCategories')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'income' && { backgroundColor: colors.primary },
            ]}
            onPress={() => setActiveTab('income')}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === 'income' ? '#FFFFFF' : colors.textLight },
            ]}>
              {t('categories.incomeCategories')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Category List */}
      <ScrollView style={styles.listContainer} contentContainerStyle={{ paddingBottom: 40 }}>
        {filteredCategories.map((cat) => (
          <View key={cat.id} style={[styles.categoryRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <View style={[styles.categoryIcon, { backgroundColor: (cat.color || '#FF5252') + '20' }]}>
              <Feather name={cat.icon || 'tag'} size={20} color={cat.color || '#FF5252'} />
            </View>
            <View style={styles.categoryContent}>
              <Text style={[styles.categoryName, { color: colors.text }]}>
                {cat.is_default ? getCategoryTranslation(cat.name) : cat.name}
              </Text>
              {cat.is_default === 1 && (
                <Text style={[styles.defaultBadge, { color: colors.textLight }]}>
                  {t('categories.defaultCategory')}
                </Text>
              )}
            </View>
            <View style={styles.categoryActions}>
              <TouchableOpacity
                onPress={() => openEditModal(cat)}
                style={styles.actionButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="edit-2" size={18} color={colors.textLight} />
              </TouchableOpacity>
              {cat.is_default !== 1 && (
                <TouchableOpacity
                  onPress={() => handleDelete(cat)}
                  style={styles.actionButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="trash-2" size={18} color={colors.danger || '#FF4646'} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        {filteredCategories.length === 0 && (
          <View style={styles.emptyState}>
            <Feather name="folder" size={48} color={colors.textLight} />
            <Text style={[styles.emptyText, { color: colors.textLight }]}>
              {activeTab === 'expense' ? t('categories.expenseCategories') : t('categories.incomeCategories')}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <Pressable style={{ flex: 1 }} onPress={() => { Keyboard.dismiss(); setModalVisible(false); }} />
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ justifyContent: 'flex-end' }}
            >
              <View style={[styles.modalContainer, { backgroundColor: cardBg }]}>
                <View style={styles.handle} />
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    {editingCategory ? t('categories.editCategory') : t('categories.addCategory')}
                  </Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Feather name="x" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {/* Category Name */}
                  <Text style={[styles.label, { color: colors.textLight }]}>{t('categories.categoryName')}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBg, color: colors.text, borderColor: colors.border }]}
                    value={formName}
                    onChangeText={setFormName}
                    placeholder={t('categories.categoryName')}
                    placeholderTextColor={colors.textLight}
                  />

                  {/* Type selector (only when adding) */}
                  {!editingCategory && (
                    <>
                      <Text style={[styles.label, { color: colors.textLight }]}>
                        {activeTab === 'expense' ? t('categories.expenseCategories') : t('categories.incomeCategories')}
                      </Text>
                      <View style={styles.typeRow}>
                        <TouchableOpacity
                          style={[styles.typeChip, { backgroundColor: formType === 'expense' ? '#FF5252' : inputBg }]}
                          onPress={() => setFormType('expense')}
                        >
                          <Text style={[styles.typeChipText, { color: formType === 'expense' ? '#FFF' : colors.textLight }]}>
                            {t('categories.expenseCategories')}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.typeChip, { backgroundColor: formType === 'income' ? '#4CAF50' : inputBg }]}
                          onPress={() => setFormType('income')}
                        >
                          <Text style={[styles.typeChipText, { color: formType === 'income' ? '#FFF' : colors.textLight }]}>
                            {t('categories.incomeCategories')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}

                  {/* Icon Selector */}
                  <Text style={[styles.label, { color: colors.textLight }]}>{t('categories.selectIcon')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll}>
                    {ICON_LIST.map((icon) => (
                      <TouchableOpacity
                        key={icon}
                        style={[
                          styles.iconOption,
                          { backgroundColor: inputBg },
                          formIcon === icon && { backgroundColor: formColor + '30', borderColor: formColor, borderWidth: 2 },
                        ]}
                        onPress={() => setFormIcon(icon)}
                      >
                        <Feather name={icon} size={22} color={formIcon === icon ? formColor : colors.textLight} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Color Selector */}
                  <Text style={[styles.label, { color: colors.textLight }]}>{t('categories.selectColor')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScroll}>
                    {COLOR_LIST.map((color) => (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.colorOption,
                          { backgroundColor: color },
                          formColor === color && styles.colorOptionSelected,
                        ]}
                        onPress={() => setFormColor(color)}
                      >
                        {formColor === color && (
                          <Feather name="check" size={18} color="#FFFFFF" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Preview */}
                  <View style={[styles.previewContainer, { backgroundColor: inputBg }]}>
                    <View style={[styles.previewIcon, { backgroundColor: formColor + '20' }]}>
                      <Feather name={formIcon} size={24} color={formColor} />
                    </View>
                    <Text style={[styles.previewName, { color: colors.text }]}>
                      {formName || t('categories.categoryName')}
                    </Text>
                  </View>

                  {/* Save Button */}
                  <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary }]} onPress={handleSave}>
                    <Feather name="check" size={20} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>{t('common.save')}</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
    paddingTop: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryContent: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
  },
  defaultBadge: {
    fontSize: 12,
    marginTop: 2,
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 8,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(150,150,150,0.3)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 7,
    marginTop: 12,
  },
  input: {
    padding: 14,
    borderRadius: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  iconScroll: {
    marginBottom: 4,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  colorScroll: {
    marginBottom: 4,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginTop: 16,
  },
  previewIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  previewName: {
    fontSize: 17,
    fontWeight: '600',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 14,
    marginTop: 20,
    marginBottom: 34,
    gap: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default CategoriesScreen;
