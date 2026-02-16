import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ScrollView,
  Modal,
  Platform,
  Animated,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { StaggeredItem } from '../components/AnimatedScreen';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { apiGetMe } from '../services/api';
import {
  apiUpdateProfile,
  apiChangePassword,
} from '../services/api';
import {
  requestNotificationPermissions,
  scheduleAllBillNotifications,
  checkBudgetOverspend,
  cancelAllNotifications,
} from '../utils/notificationService';

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
  modalBackground: '#FFFFFF',
  inputBackground: '#FFFFFF',
};

// Sun/Moon Toggle Component
const ThemeToggle = ({ isDarkMode, onToggle, colors }) => {
  const animatedValue = React.useRef(new Animated.Value(isDarkMode ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: isDarkMode ? 1 : 0,
      useNativeDriver: false,
      friction: 7,
      tension: 50,
    }).start();
  }, [isDarkMode]);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [3, 33],
  });

  const sunOpacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const moonOpacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // Animated background color: sky blue (day) → deep navy (night)
  const bgColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['#87CEEB', '#0F1B2D'],
  });

  // Animated border color
  const borderColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['#5CB8E4', '#1E3A5F'],
  });

  // Star opacity (visible only in dark mode)
  const starOpacity = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  // Cloud opacity (visible only in light mode)
  const cloudOpacity = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0, 0],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onToggle}
    >
      <Animated.View
        style={[
          styles.themeToggleContainer,
          {
            backgroundColor: bgColor,
            borderColor: borderColor,
            borderWidth: 1.5,
          }
        ]}
      >
        {/* Sun icon on left */}
        <Animated.View style={[styles.themeIconLeft, { opacity: sunOpacity }]}>
          <Feather name="sun" size={14} color="#FFD93D" />
        </Animated.View>

        {/* Small cloud decoration for day */}
        <Animated.View style={[styles.themeCloudDot, { opacity: cloudOpacity }]}>
          <View style={styles.cloudDot} />
          <View style={[styles.cloudDot, { width: 5, height: 5, marginLeft: 2, marginTop: -1 }]} />
        </Animated.View>

        {/* Moon icon on right */}
        <Animated.View style={[styles.themeIconRight, { opacity: moonOpacity }]}>
          <Feather name="moon" size={14} color="#C0C8E0" />
        </Animated.View>

        {/* Stars decoration for night */}
        <Animated.View style={[styles.themeStars, { opacity: starOpacity }]}>
          <View style={[styles.star, { top: 4, right: 12 }]} />
          <View style={[styles.star, { top: 10, right: 20, width: 2, height: 2 }]} />
          <View style={[styles.star, { top: 18, right: 8, width: 2, height: 2 }]} />
        </Animated.View>

        {/* Sliding circle */}
        <Animated.View
          style={[
            styles.themeToggleCircle,
            {
              transform: [{ translateX }],
              backgroundColor: isDarkMode ? '#E8E8F0' : '#FFD93D',
            },
          ]}
        >
          <Feather
            name={isDarkMode ? 'moon' : 'sun'}
            size={14}
            color={isDarkMode ? '#0F1B2D' : '#F59E0B'}
          />
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const ProfileScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, setUser, logout } = useAuth();
  const { t, currentLanguage, changeLanguage } = useLanguage();
  const themeContext = useTheme();
  const colors = themeContext?.colors || defaultColors;
  const isDarkMode = themeContext?.isDarkMode || false;
  const toggleTheme = themeContext?.toggleTheme || (() => {});
  const [profilePhoto, setProfilePhoto] = useState(user?.profile_photo || null);
  const [userName, setUserName] = useState(user?.name || '');
  const [editNameModalVisible, setEditNameModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    loadUserData();
    loadNotificationSetting();
  }, []);

  const loadUserData = async () => {
    if (user?.id) {
      try {
        const userData = await apiGetMe();
        if (userData) {
          setProfilePhoto(userData.profile_photo);
          setUserName(userData.name);
        }
      } catch (error) {
        // Fallback to cached user data
        setProfilePhoto(user.profile_photo);
        setUserName(user.name);
      }
    }
  };

  const loadNotificationSetting = async () => {
    const value = await AsyncStorage.getItem('notifications_enabled');
    setNotificationsEnabled(value !== 'false');
  };

  const handleToggleNotifications = async (value) => {
    setNotificationsEnabled(value);
    await AsyncStorage.setItem('notifications_enabled', value ? 'true' : 'false');

    if (value) {
      const hasPermission = await requestNotificationPermissions();
      if (hasPermission && user?.id) {
        await scheduleAllBillNotifications(user.id, currentLanguage);
        await checkBudgetOverspend(user.id, currentLanguage);
      }
      Alert.alert(t('common.success'), t('profile.notificationsEnabled'));
    } else {
      await cancelAllNotifications();
      Alert.alert(t('common.success'), t('profile.notificationsDisabled'));
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(t('common.error'), t('profile.permissionRequired'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      try {
        const updatedApiUser = await apiUpdateProfile({ profile_photo: base64Image });
        setProfilePhoto(base64Image);
        setUser({ ...user, profile_photo: base64Image });
        Alert.alert(t('common.success'), t('profile.photoUpdated'));
      } catch (error) {
        Alert.alert(t('common.error'), t('profile.photoUpdateFailed'));
      }
    }
  };

  const handleUpdateName = async () => {
    if (!newName.trim()) {
      Alert.alert(t('common.error'), t('profile.nameRequired'));
      return;
    }

    try {
      await apiUpdateProfile({ name: newName.trim() });
      setUserName(newName.trim());
      setUser({ ...user, name: newName.trim() });
      setEditNameModalVisible(false);
      setNewName('');
      Alert.alert(t('common.success'), t('profile.nameUpdated'));
    } catch (error) {
      Alert.alert(t('common.error'), t('profile.nameUpdateFailed'));
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(t('common.error'), t('profile.fillAllFields'));
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t('common.error'), t('profile.passwordMismatch'));
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(t('common.error'), t('profile.passwordTooShort'));
      return;
    }

    try {
      await apiChangePassword(currentPassword, newPassword);
      setPasswordModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert(t('common.success'), t('profile.passwordChanged'));
    } catch (error) {
      Alert.alert(t('common.error'), t('profile.incorrectPassword'));
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t('auth.logout'),
      t('common.logoutConfirm'),
      [
        { text: t('transactions.cancel'), style: 'cancel' },
        { text: t('auth.logout'), style: 'destructive', onPress: () => logout() },
      ]
    );
  };

  const toggleLanguage = () => {
    const newLang = currentLanguage === 'tr' ? 'en' : 'tr';
    changeLanguage(newLang);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Combined Header and Profile Section with extended background */}
      <StaggeredItem index={0}>
      <View style={[styles.profileHeaderContainer, { backgroundColor: colors.card, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('profile.title')}</Text>
          {/* Theme Toggle */}
          <ThemeToggle isDarkMode={isDarkMode} onToggle={toggleTheme} colors={colors} />
        </View>

        {/* Profile Photo Section */}
        <View style={styles.profileSection}>
          <TouchableOpacity style={styles.photoContainer} onPress={pickImage}>
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={[styles.profilePhoto, { backgroundColor: colors.light }]} />
            ) : (
              <View style={[styles.photoPlaceholder, { backgroundColor: colors.light }]}>
                <Feather name="user" size={50} color={colors.textLight} />
              </View>
            )}
            <View style={[styles.editPhotoButton, { backgroundColor: colors.primary, borderColor: colors.card }]}>
              <Feather name="camera" size={16} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <Text style={[styles.userName, { color: colors.text }]}>{userName}</Text>
          <Text style={[styles.userEmail, { color: colors.textLight }]}>{user?.email}</Text>
        </View>
      </View>
      </StaggeredItem>

      {/* Menu Items */}
      <StaggeredItem index={1}>
      <View style={[styles.menuSection, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.border }]}
          onPress={() => {
            setNewName(userName);
            setEditNameModalVisible(true);
          }}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: colors.primary + '15' }]}>
            <Feather name="edit-2" size={20} color={colors.primary} />
          </View>
          <View style={styles.menuContent}>
            <Text style={[styles.menuTitle, { color: colors.text }]}>{t('profile.editName')}</Text>
            <Text style={[styles.menuSubtitle, { color: colors.textLight }]}>{userName}</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.border }]}
          onPress={() => setPasswordModalVisible(true)}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: colors.warning + '15' }]}>
            <Feather name="lock" size={20} color={colors.warning} />
          </View>
          <View style={styles.menuContent}>
            <Text style={[styles.menuTitle, { color: colors.text }]}>{t('profile.changePassword')}</Text>
            <Text style={[styles.menuSubtitle, { color: colors.textLight }]}>{t('profile.secureAccount')}</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={toggleLanguage}>
          <View style={[styles.menuIconContainer, { backgroundColor: colors.info + '15' }]}>
            <Feather name="globe" size={20} color={colors.info} />
          </View>
          <View style={styles.menuContent}>
            <Text style={[styles.menuTitle, { color: colors.text }]}>{t('profile.language')}</Text>
            <Text style={[styles.menuSubtitle, { color: colors.textLight }]}>
              {currentLanguage === 'tr' ? 'Türkçe' : 'English'}
            </Text>
          </View>
          <View style={[styles.languageToggle, { backgroundColor: colors.primary }]}>
            <Text style={styles.languageToggleText}>
              {currentLanguage === 'tr' ? 'TR' : 'EN'}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={[styles.menuItem, { borderBottomColor: colors.border }]}>
          <View style={[styles.menuIconContainer, { backgroundColor: colors.warning + '15' }]}>
            <Feather name="bell" size={20} color={colors.warning} />
          </View>
          <View style={styles.menuContent}>
            <Text style={[styles.menuTitle, { color: colors.text }]}>{t('profile.notifications')}</Text>
            <Text style={[styles.menuSubtitle, { color: colors.textLight }]}>{t('profile.notificationsDesc')}</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleToggleNotifications}
            trackColor={{ false: colors.border, true: '#C8F5DC' }}
            thumbColor={notificationsEnabled ? colors.primary : '#f4f3f4'}
          />
        </View>

        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.border }]}
          onPress={() => navigation.navigate('Categories')}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: '#9B59B6' + '15' }]}>
            <Feather name="grid" size={20} color="#9B59B6" />
          </View>
          <View style={styles.menuContent}>
            <Text style={[styles.menuTitle, { color: colors.text }]}>{t('categories.manage')}</Text>
            <Text style={[styles.menuSubtitle, { color: colors.textLight }]}>{t('categories.addCategory')}</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.border }]}
          onPress={() => navigation.navigate('RecurringTransactions')}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: '#2196F3' + '15' }]}>
            <Feather name="repeat" size={20} color="#2196F3" />
          </View>
          <View style={styles.menuContent}>
            <Text style={[styles.menuTitle, { color: colors.text }]}>{t('recurring.title')}</Text>
            <Text style={[styles.menuSubtitle, { color: colors.textLight }]}>{t('recurring.menuDesc')}</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.border }]}
          onPress={() => navigation.navigate('SavingsGoals')}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: '#F39C12' + '15' }]}>
            <Feather name="target" size={20} color="#F39C12" />
          </View>
          <View style={styles.menuContent}>
            <Text style={[styles.menuTitle, { color: colors.text }]}>{t('savingsGoals.title')}</Text>
            <Text style={[styles.menuSubtitle, { color: colors.textLight }]}>{t('savingsGoals.menuDesc')}</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.border }]}
          onPress={() => navigation.navigate('InstallmentTracking')}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: '#E91E63' + '15' }]}>
            <Feather name="credit-card" size={20} color="#E91E63" />
          </View>
          <View style={styles.menuContent}>
            <Text style={[styles.menuTitle, { color: colors.text }]}>{t('installments.title')}</Text>
            <Text style={[styles.menuSubtitle, { color: colors.textLight }]}>{t('installments.menuDesc')}</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.border }]}
          onPress={() => navigation.navigate('DebtCreditTracking')}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: '#FF6B6B' + '15' }]}>
            <Feather name="users" size={20} color="#FF6B6B" />
          </View>
          <View style={styles.menuContent}>
            <Text style={[styles.menuTitle, { color: colors.text }]}>{t('debtCredit.title')}</Text>
            <Text style={[styles.menuSubtitle, { color: colors.textLight }]}>{t('debtCredit.menuDesc')}</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.border }]}
          onPress={() => navigation.navigate('Archive')}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: colors.secondary + '15' }]}>
            <Feather name="archive" size={20} color={colors.secondary} />
          </View>
          <View style={styles.menuContent}>
            <Text style={[styles.menuTitle, { color: colors.text }]}>{t('storage.archive')}</Text>
            <Text style={[styles.menuSubtitle, { color: colors.textLight }]}>{t('profile.archivedTransactions')}</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.border }]}
          onPress={() => navigation.navigate('Trash')}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: colors.danger + '15' }]}>
            <Feather name="trash-2" size={20} color={colors.danger} />
          </View>
          <View style={styles.menuContent}>
            <Text style={[styles.menuTitle, { color: colors.text }]}>{t('storage.trash')}</Text>
            <Text style={[styles.menuSubtitle, { color: colors.textLight }]}>{t('profile.deletedTransactions')}</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.textLight} />
        </TouchableOpacity>
      </View>
      </StaggeredItem>

      {/* Logout Button */}
      <StaggeredItem index={2}>
      <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.card }]} onPress={handleLogout}>
        <Feather name="log-out" size={20} color={colors.danger} />
        <Text style={[styles.logoutText, { color: colors.danger }]}>{t('auth.logout')}</Text>
      </TouchableOpacity>

      </StaggeredItem>

      <StaggeredItem index={3}>
      <View style={styles.appInfo}>
        <Text style={[styles.appName, { color: colors.primary }]}>Finansapp</Text>
        <Text style={[styles.appVersion, { color: colors.textLight }]}>v1.0.0</Text>
      </View>
      </StaggeredItem>

      {/* Edit Name Modal */}
      <Modal
        visible={editNameModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditNameModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              onPress={() => { Keyboard.dismiss(); setEditNameModalVisible(false); }}
            />
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardAvoidingView}
            >
              <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>{t('profile.editName')}</Text>
                  <TouchableOpacity onPress={() => setEditNameModalVisible(false)}>
                    <Feather name="x" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.inputLabel, { color: colors.text }]}>{t('auth.name')}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                  value={newName}
                  onChangeText={setNewName}
                  placeholder={t('auth.name')}
                  placeholderTextColor={colors.textLight}
                />

                <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary }]} onPress={handleUpdateName}>
                  <Text style={styles.saveButtonText}>{t('common.save')}</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              onPress={() => { Keyboard.dismiss(); setPasswordModalVisible(false); }}
            />
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardAvoidingView}
            >
              <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
                <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
                  <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>{t('profile.changePassword')}</Text>
                    <TouchableOpacity onPress={() => setPasswordModalVisible(false)}>
                      <Feather name="x" size={24} color={colors.text} />
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.inputLabel, { color: colors.text }]}>{t('profile.currentPassword')}</Text>
                  <View style={[styles.passwordContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <TextInput
                      style={[styles.passwordInput, { color: colors.text }]}
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      placeholder={t('profile.currentPassword')}
                      placeholderTextColor={colors.textLight}
                      secureTextEntry={!showCurrentPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                      style={styles.eyeButton}
                    >
                      <Feather
                        name={showCurrentPassword ? 'eye-off' : 'eye'}
                        size={20}
                        color={colors.textLight}
                      />
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.inputLabel, { color: colors.text }]}>{t('profile.newPassword')}</Text>
                  <View style={[styles.passwordContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <TextInput
                      style={[styles.passwordInput, { color: colors.text }]}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder={t('profile.newPassword')}
                      placeholderTextColor={colors.textLight}
                      secureTextEntry={!showNewPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowNewPassword(!showNewPassword)}
                      style={styles.eyeButton}
                    >
                      <Feather
                        name={showNewPassword ? 'eye-off' : 'eye'}
                        size={20}
                        color={colors.textLight}
                      />
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.inputLabel, { color: colors.text }]}>{t('auth.confirmPassword')}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder={t('auth.confirmPassword')}
                    placeholderTextColor={colors.textLight}
                    secureTextEntry
                  />

                  <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary }]} onPress={handleChangePassword}>
                    <Text style={styles.saveButtonText}>{t('profile.changePassword')}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileHeaderContainer: {
    marginBottom: 16,
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  photoContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editPhotoButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
  },
  menuSection: {
    marginHorizontal: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  menuSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  languageToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  languageToggleText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  appInfo: {
    alignItems: 'center',
    paddingBottom: 100,
  },
  appName: {
    fontSize: 18,
    fontWeight: '700',
  },
  appVersion: {
    fontSize: 12,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  keyboardAvoidingView: {
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
  },
  eyeButton: {
    padding: 16,
  },
  saveButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  // Theme Toggle Styles
  themeToggleContainer: {
    width: 66,
    height: 34,
    borderRadius: 17,
    position: 'relative',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  themeIconLeft: {
    position: 'absolute',
    left: 8,
    zIndex: 1,
  },
  themeIconRight: {
    position: 'absolute',
    right: 8,
    zIndex: 1,
  },
  themeCloudDot: {
    position: 'absolute',
    right: 14,
    top: 6,
    flexDirection: 'row',
    zIndex: 1,
  },
  cloudDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  themeStars: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  star: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FFFDE7',
  },
  themeToggleCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default ProfileScreen;
