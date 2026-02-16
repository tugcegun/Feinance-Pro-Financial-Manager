import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

export const exportDatabase = async () => {
  try {
    const dbPath = `${FileSystem.documentDirectory}SQLite/finance.db`;
    const exportPath = `${FileSystem.cacheDirectory}finance_backup_${Date.now()}.db`;

    // Check if database exists
    const dbInfo = await FileSystem.getInfoAsync(dbPath);

    if (!dbInfo.exists) {
      Alert.alert('Error', 'Database file not found');
      return { success: false };
    }

    // Copy database to cache directory
    await FileSystem.copyAsync({
      from: dbPath,
      to: exportPath,
    });

    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();

    if (!isAvailable) {
      Alert.alert('Error', 'Sharing is not available on this device');
      return { success: false };
    }

    // Share the file
    await Sharing.shareAsync(exportPath, {
      mimeType: 'application/x-sqlite3',
      dialogTitle: 'Export Finance Database',
      UTI: 'public.database',
    });

    return { success: true };
  } catch (error) {
    console.error('Export error:', error);
    Alert.alert('Export Failed', error.message);
    return { success: false, error: error.message };
  }
};

export const getDatabaseInfo = async () => {
  try {
    const dbPath = `${FileSystem.documentDirectory}SQLite/finance.db`;
    const info = await FileSystem.getInfoAsync(dbPath);

    return {
      exists: info.exists,
      size: info.size ? (info.size / 1024).toFixed(2) + ' KB' : 'Unknown',
      uri: info.uri,
    };
  } catch (error) {
    console.error('Get DB info error:', error);
    return null;
  }
};
