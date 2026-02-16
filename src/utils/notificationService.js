/**
 * Notification Service for Bill Reminders
 *
 * Handles push notifications for bill due date reminders
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiGetBillsDueSoon, apiGetOverdueBills, apiGetBudgets, apiGetCategorySpending } from '../services/api';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions
 */
export const requestNotificationPermissions = async () => {
  if (!Device.isDevice) {
    console.log('Notifications only work on physical devices');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Notification permission not granted');
    return false;
  }

  // Android specific channel setup
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('bill-reminders', {
      name: 'Bill Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF5722',
    });
  }

  return true;
};

/**
 * Schedule a notification for a specific bill
 */
export const scheduleBillNotification = async (bill, language = 'tr') => {
  if (!bill.due_date) return null;

  const dueDate = new Date(bill.due_date);
  const reminderDays = bill.reminder_days || 3;

  // Calculate notification date (X days before due date)
  const notificationDate = new Date(dueDate);
  notificationDate.setDate(notificationDate.getDate() - reminderDays);
  notificationDate.setHours(9, 0, 0, 0); // Set to 9 AM

  // Don't schedule if notification date is in the past
  if (notificationDate <= new Date()) {
    return null;
  }

  const title = language === 'tr'
    ? `Fatura Hatırlatması: ${bill.name}`
    : `Bill Reminder: ${bill.name}`;

  const body = language === 'tr'
    ? `${bill.name} faturanızın son ödeme tarihi ${reminderDays} gün sonra. ${bill.amount ? `Tutar: ₺${bill.amount}` : ''}`
    : `Your ${bill.name} bill is due in ${reminderDays} days. ${bill.amount ? `Amount: $${bill.amount}` : ''}`;

  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { billId: bill.id, type: 'bill_reminder' },
        sound: 'default',
      },
      trigger: {
        date: notificationDate,
      },
    });

    console.log('Notification scheduled:', notificationId);
    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
};

/**
 * Schedule notification for due date (same day)
 */
export const scheduleDueDateNotification = async (bill, language = 'tr') => {
  if (!bill.due_date) return null;

  const dueDate = new Date(bill.due_date);
  dueDate.setHours(8, 0, 0, 0); // Set to 8 AM on due date

  // Don't schedule if due date is in the past
  if (dueDate <= new Date()) {
    return null;
  }

  const title = language === 'tr'
    ? `Son Ödeme Günü: ${bill.name}`
    : `Due Today: ${bill.name}`;

  const body = language === 'tr'
    ? `Bugün ${bill.name} faturanızın son ödeme günü! ${bill.amount ? `Tutar: ₺${bill.amount}` : ''}`
    : `Your ${bill.name} bill is due today! ${bill.amount ? `Amount: $${bill.amount}` : ''}`;

  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { billId: bill.id, type: 'bill_due_today' },
        sound: 'default',
      },
      trigger: {
        date: dueDate,
      },
    });

    return notificationId;
  } catch (error) {
    console.error('Error scheduling due date notification:', error);
    return null;
  }
};

/**
 * Cancel a scheduled notification
 */
export const cancelNotification = async (notificationId) => {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error('Error canceling notification:', error);
  }
};

/**
 * Cancel all scheduled notifications
 */
export const cancelAllNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error canceling all notifications:', error);
  }
};

/**
 * Get all scheduled notifications
 */
export const getScheduledNotifications = async () => {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
};

/**
 * Schedule notifications for all pending bills
 */
export const scheduleAllBillNotifications = async (userId = null, language = 'tr') => {
  try {
    // Cancel existing notifications first
    await cancelAllNotifications();

    // Get bills due in the next 30 days
    const bills = await apiGetBillsDueSoon(30);

    for (const bill of bills) {
      // Schedule reminder notification
      await scheduleBillNotification(bill, language);

      // Schedule due date notification
      await scheduleDueDateNotification(bill, language);
    }

    console.log(`Scheduled notifications for ${bills.length} bills`);
    return bills.length;
  } catch (error) {
    console.error('Error scheduling all bill notifications:', error);
    return 0;
  }
};

/**
 * Send immediate notification (for testing)
 */
export const sendImmediateNotification = async (title, body, data = {}) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: null, // null means immediate
    });
  } catch (error) {
    console.error('Error sending immediate notification:', error);
  }
};

/**
 * Check and send overdue notifications
 */
export const checkOverdueBills = async (userId = null, language = 'tr') => {
  try {
    const overdueBills = await apiGetOverdueBills();

    if (overdueBills.length > 0) {
      const title = language === 'tr'
        ? `${overdueBills.length} Gecikmiş Fatura`
        : `${overdueBills.length} Overdue Bill${overdueBills.length > 1 ? 's' : ''}`;

      const billNames = overdueBills.slice(0, 3).map(b => b.name).join(', ');
      const body = language === 'tr'
        ? `Gecikmiş faturalarınız var: ${billNames}${overdueBills.length > 3 ? '...' : ''}`
        : `You have overdue bills: ${billNames}${overdueBills.length > 3 ? '...' : ''}`;

      await sendImmediateNotification(title, body, { type: 'overdue_bills' });
    }

    return overdueBills.length;
  } catch (error) {
    console.error('Error checking overdue bills:', error);
    return 0;
  }
};

/**
 * Check budget overspend and send notifications
 */
export const checkBudgetOverspend = async (userId = null, language = 'tr') => {
  try {
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    const budgets = await apiGetBudgets(month, year);

    for (const budget of budgets) {
      const spending = await apiGetCategorySpending(budget.category_id, month, year);
      const percent = Math.round((spending / budget.amount) * 100);

      if (percent >= 90) {
        const categoryName = budget.category_name || budget.name;
        const title = language === 'tr'
          ? `Bütçe Uyarısı: ${categoryName}`
          : `Budget Alert: ${categoryName}`;
        const body = language === 'tr'
          ? `${categoryName} bütçenizin %${percent}'ini kullandınız`
          : `You've used ${percent}% of your ${categoryName} budget`;

        await sendImmediateNotification(title, body, { type: 'budget_overspend', categoryId: budget.category_id });
      }
    }
  } catch (error) {
    console.error('Error checking budget overspend:', error);
  }
};

/**
 * Add notification response listener
 */
export const addNotificationResponseListener = (callback) => {
  return Notifications.addNotificationResponseReceivedListener(callback);
};

/**
 * Add notification received listener
 */
export const addNotificationReceivedListener = (callback) => {
  return Notifications.addNotificationReceivedListener(callback);
};

export default {
  requestNotificationPermissions,
  scheduleBillNotification,
  scheduleDueDateNotification,
  cancelNotification,
  cancelAllNotifications,
  getScheduledNotifications,
  scheduleAllBillNotifications,
  sendImmediateNotification,
  checkOverdueBills,
  checkBudgetOverspend,
  addNotificationResponseListener,
  addNotificationReceivedListener,
};
