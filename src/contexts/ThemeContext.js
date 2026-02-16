import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

// Default colors for fallback
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
  income: '#50D890',
  expense: '#FF4646',
  background: '#EFFFFB',
  card: '#FFFFFF',
  text: '#272727',
  textLight: '#666666',
  border: '#D0D0D0',
  surface: '#FFFFFF',
  modalBackground: '#FFFFFF',
  inputBackground: '#FFFFFF',
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    // Return default values instead of throwing
    return {
      isDarkMode: false,
      colors: defaultColors,
      toggleTheme: () => {},
    };
  }
  return context;
};

// Gündüz modu renkleri (Aydınlık Tema)
const lightColors = {
  primary: '#50D890',        // Yeşil - Ana renk
  secondary: '#4F98CA',      // Mavi - İkincil renk
  success: '#50D890',        // Yeşil - Başarı
  danger: '#FF4646',         // Kırmızı - Tehlike
  warning: '#FFA726',        // Turuncu - Uyarı
  info: '#4F98CA',           // Mavi - Bilgi
  light: '#EFFFFB',          // Açık mint yeşili
  dark: '#272727',           // Koyu gri
  white: '#FFFFFF',          // Beyaz
  black: '#000000',          // Siyah
  income: '#50D890',         // Gelir rengi (Yeşil)
  expense: '#FF4646',        // Gider rengi (Kırmızı)
  background: '#EFFFFB',     // Arka plan
  card: '#FFFFFF',           // Kart arka planı
  text: '#272727',           // Ana metin
  textLight: '#666666',      // İkincil metin
  textMuted: '#999999',      // Soluk metin
  border: '#D0D0D0',         // Kenarlık
  borderLight: '#E8E8E8',    // Açık kenarlık
  surface: '#FFFFFF',        // Yüzey rengi
  modalBackground: '#FFFFFF', // Modal arka planı
  inputBackground: '#FFFFFF', // Input arka planı
};

// Gece modu renkleri (Karanlık Tema)
const darkColors = {
  primary: '#50D890',        // Yeşil - Ana renk
  secondary: '#4F98CA',      // Mavi - İkincil renk
  success: '#50D890',        // Yeşil - Başarı
  danger: '#FF4646',         // Kırmızı - Tehlike
  warning: '#FFA726',        // Turuncu - Uyarı
  info: '#4F98CA',           // Mavi - Bilgi
  light: '#333333',          // Açık gri (karanlık modda)
  dark: '#EFFFFB',           // Açık (karanlık modda ters)
  white: '#FFFFFF',          // Beyaz
  black: '#000000',          // Siyah
  income: '#50D890',         // Gelir rengi
  expense: '#FF4646',        // Gider rengi
  background: '#1A1A1A',     // Koyu arka plan
  card: '#272727',           // Koyu kart
  text: '#EFFFFB',           // Açık metin
  textLight: '#B0B0B0',      // Orta gri metin
  textMuted: '#808080',      // Soluk metin
  border: '#404040',         // Koyu kenarlık
  borderLight: '#333333',    // Daha koyu kenarlık
  surface: '#272727',        // Koyu yüzey
  modalBackground: '#272727', // Koyu modal
  inputBackground: '#333333', // Koyu input
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [colors, setColors] = useState(lightColors);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme === 'dark') {
        setIsDarkMode(true);
        setColors(darkColors);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const toggleTheme = async () => {
    try {
      const newMode = !isDarkMode;
      setIsDarkMode(newMode);
      setColors(newMode ? darkColors : lightColors);
      await AsyncStorage.setItem('theme', newMode ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};