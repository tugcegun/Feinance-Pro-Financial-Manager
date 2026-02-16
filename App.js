import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { apiProcessRecurringTransactions } from './src/services/api';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { LanguageProvider, useLanguage } from './src/contexts/LanguageContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import LiquidGlassTabBar from './src/components/LiquidGlassTabBar';
import AnimatedSplashScreen from './src/components/AnimatedSplashScreen';
import { fadeScaleTransition, smoothSlideTransition } from './src/utils/screenTransitions';

import {
  requestNotificationPermissions,
  scheduleAllBillNotifications,
  checkOverdueBills,
  checkBudgetOverspend,
  addNotificationResponseListener,
  addNotificationReceivedListener,
} from './src/utils/notificationService';

// Onboarding Screen
import OnboardingScreen from './src/screens/OnboardingScreen';

// Auth Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';

// Main App Screens
import HomeScreen from './src/screens/HomeScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import BudgetScreen from './src/screens/BudgetScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AccountsScreen from './src/screens/AccountsScreen';
import ArchiveScreen from './src/screens/ArchiveScreen';
import TrashScreen from './src/screens/TrashScreen';
import BillsScreen from './src/screens/BillsScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import TipsScreen from './src/screens/TipsScreen';
import CategoriesScreen from './src/screens/CategoriesScreen';
import RecurringTransactionsScreen from './src/screens/RecurringTransactionsScreen';
import SavingsGoalsScreen from './src/screens/SavingsGoalsScreen';
import InstallmentTrackingScreen from './src/screens/InstallmentTrackingScreen';
import DebtCreditTrackingScreen from './src/screens/DebtCreditTrackingScreen';

// Keep the native splash screen visible while we load resources
SplashScreen.preventAutoHideAsync();

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const MainStack = createStackNavigator();

// Default colors for initial loading (before ThemeProvider)
const defaultColors = {
  primary: '#50D890',
  secondary: '#4F98CA',
  background: '#EFFFFB',
  card: '#FFFFFF',
  text: '#272727',
  textLight: '#666666',
  border: '#D0D0D0',
  success: '#50D890',
  danger: '#FF4646',
  warning: '#FFA726',
  info: '#4F98CA',
};

function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        ...fadeScaleTransition,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const { t } = useLanguage();

  return (
    <Tab.Navigator
      tabBar={(props) => <LiquidGlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: t('nav.home') }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{ tabBarLabel: t('nav.transactions') }}
      />
      <Tab.Screen
        name="Bills"
        component={BillsScreen}
        options={{ tabBarLabel: t('nav.bills') }}
      />
      <Tab.Screen
        name="Accounts"
        component={AccountsScreen}
        options={{ tabBarLabel: t('nav.accounts') }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: t('nav.profile') }}
      />
    </Tab.Navigator>
  );
}

function MainStackNavigator() {
  return (
    <MainStack.Navigator
      screenOptions={{
        headerShown: false,
        ...smoothSlideTransition,
      }}
    >
      <MainStack.Screen name="MainTabs" component={MainTabs} />
      <MainStack.Screen name="Archive" component={ArchiveScreen} />
      <MainStack.Screen name="Trash" component={TrashScreen} />
      <MainStack.Screen name="Reports" component={ReportsScreen} />
      <MainStack.Screen name="Tips" component={TipsScreen} />
      <MainStack.Screen name="Budget" component={BudgetScreen} />
      <MainStack.Screen name="Categories" component={CategoriesScreen} />
      <MainStack.Screen name="RecurringTransactions" component={RecurringTransactionsScreen} />
      <MainStack.Screen name="SavingsGoals" component={SavingsGoalsScreen} />
      <MainStack.Screen name="InstallmentTracking" component={InstallmentTrackingScreen} />
      <MainStack.Screen name="DebtCreditTracking" component={DebtCreditTrackingScreen} />
    </MainStack.Navigator>
  );
}

function AppNavigator() {
  const { user, loading } = useAuth();
  const { currentLanguage } = useLanguage();
  const themeContext = useTheme();
  const colors = themeContext?.colors || defaultColors;
  const isDarkMode = themeContext?.isDarkMode || false;
  const [onboardingCompleted, setOnboardingCompleted] = useState(null);

  useEffect(() => {
    const checkOnboarding = async () => {
      const done = await AsyncStorage.getItem('onboarding_completed');
      setOnboardingCompleted(done === 'true');
    };
    checkOnboarding();
  }, []);

  useEffect(() => {
    if (!user) return;

    const initializeNotifications = async () => {
      try {
        const enabled = await AsyncStorage.getItem('notifications_enabled');
        if (enabled === 'false') return;

        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) return;

        await scheduleAllBillNotifications(user.id, currentLanguage);
        await checkOverdueBills(user.id, currentLanguage);
        await checkBudgetOverspend(user.id, currentLanguage);
      } catch (error) {
        console.error('Error initializing notifications:', error);
      }
    };

    const processRecurrings = async () => {
      try {
        const count = await apiProcessRecurringTransactions();
        if (count > 0) console.log(`Generated ${count} recurring transactions`);
      } catch (error) {
        console.error('Error processing recurring transactions:', error);
      }
    };

    initializeNotifications();
    processRecurrings();
  }, [user]);

  useEffect(() => {
    const responseSubscription = addNotificationResponseListener((response) => {
      console.log('Notification tapped:', response.notification.request.content.data);
    });

    const receivedSubscription = addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification.request.content.title);
    });

    return () => {
      responseSubscription.remove();
      receivedSubscription.remove();
    };
  }, []);

  if (loading || onboardingCompleted === null) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!onboardingCompleted) {
    return <OnboardingScreen onComplete={() => setOnboardingCompleted(true)} />;
  }

  return (
    <NavigationContainer>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      {user ? <MainStackNavigator /> : <AuthStack />}
    </NavigationContainer>
  );
}

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [splashAnimationFinished, setSplashAnimationFinished] = useState(false);

  useEffect(() => {
    async function prepare() {
      // App initialization (API, resources, etc.)
      setIsReady(true);
      // Hide native splash once app is ready — animated splash takes over
      await SplashScreen.hideAsync();
    }
    prepare();
  }, []);

  if (!isReady) {
    return null; // Native splash is still visible
  }

  if (!splashAnimationFinished) {
    return (
      <SafeAreaProvider>
        <ThemeProvider>
          <LanguageProvider>
            <AnimatedSplashScreen onFinish={() => setSplashAnimationFinished(true)} />
          </LanguageProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <AppNavigator />
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: defaultColors.background,
  },
});
