// src/constants/colors.js

// Ana Tema Renkleri
export const PRIMARY = '#50D890';      // Yeşil - Ana renk
export const SECONDARY = '#4F98CA';    // Mavi - İkincil renk
export const BACKGROUND = '#EFFFFB';   // Açık mint yeşili - Arka plan
export const DARK_TEXT = '#272727';    // Koyu gri - Ana metin
export const DANGER = '#FF4646';       // Kırmızı - Uyarı/Hata

// Metin Renkleri
export const TEXT_PRIMARY = '#272727';
export const TEXT_SECONDARY = '#666666';
export const TEXT_MUTED = '#999999';
export const TEXT_LIGHT = '#CCCCCC';

// Arka Plan Renkleri
export const BG_PRIMARY = '#EFFFFB';
export const BG_CARD = '#FFFFFF';
export const BG_LIGHT = '#F5F5F5';

// Durum Renkleri
export const SUCCESS = '#50D890';
export const ERROR = '#FF4646';
export const WARNING = '#FFA726';
export const INFO = '#4F98CA';

// İşlem Renkleri
export const INCOME = '#50D890';
export const EXPENSE = '#FF4646';

// Kenarlık Renkleri
export const BORDER = '#D0D0D0';
export const BORDER_LIGHT = '#E8E8E8';

// Kategori Renkleri (Giderler için)
export const CATEGORY_COLORS = {
  food: '#FF6B6B',           // Kırmızı
  transportation: '#4F98CA', // Mavi
  shopping: '#FF4646',       // Koyu kırmızı
  entertainment: '#9B59B6',  // Mor
  bills: '#E67E22',          // Turuncu
  healthcare: '#1ABC9C',     // Turkuaz
  education: '#3498DB',      // Açık mavi
  savings: '#50D890',        // Yeşil
  other: '#95A5A6',          // Gri
};

// Kategori İkonları
export const CATEGORY_ICONS = {
  // Gelir kategorileri
  salary: 'briefcase',
  freelance: 'code',
  business: 'trending-up',
  investment: 'pie-chart',
  gift: 'gift',
  
  // Gider kategorileri
  food: 'coffee',
  transportation: 'truck',
  shopping: 'shopping-bag',
  entertainment: 'film',
  bills: 'file-text',
  healthcare: 'heart',
  education: 'book',
  savings: 'piggy-bank',
  other: 'more-horizontal',
};

// Bütçe Durum Renkleri
export const BUDGET_STATUS = {
  great: '#50D890',      // %0-50 kullanım
  onTrack: '#4F98CA',    // %50-75 kullanım
  warning: '#FFA726',    // %75-100 kullanım
  over: '#FF4646',       // %100+ kullanım
};

// Grafik Renkleri
export const CHART_COLORS = [
  '#50D890',  // Yeşil
  '#4F98CA',  // Mavi
  '#FF4646',  // Kırmızı
  '#FFA726',  // Turuncu
  '#9B59B6',  // Mor
  '#1ABC9C',  // Turkuaz
  '#E67E22',  // Koyu turuncu
  '#3498DB',  // Açık mavi
];

// Gölge ve Overlay
export const SHADOW = '#000000';
export const OVERLAY = 'rgba(0, 0, 0, 0.5)';

// Aydınlık Tema
export const LIGHT_THEME = {
  primary: PRIMARY,
  secondary: SECONDARY,
  background: BACKGROUND,
  card: BG_CARD,
  text: TEXT_PRIMARY,
  textLight: TEXT_SECONDARY,
  textMuted: TEXT_MUTED,
  border: BORDER,
  borderLight: BORDER_LIGHT,
  success: SUCCESS,
  danger: DANGER,
  warning: WARNING,
  info: INFO,
  income: INCOME,
  expense: EXPENSE,
  shadow: SHADOW,
  overlay: OVERLAY,
};

// Karanlık Tema
export const DARK_THEME = {
  primary: PRIMARY,
  secondary: SECONDARY,
  background: '#1A1A1A',
  card: '#272727',
  text: '#EFFFFB',
  textLight: '#B0B0B0',
  textMuted: '#808080',
  border: '#404040',
  borderLight: '#333333',
  success: SUCCESS,
  danger: DANGER,
  warning: WARNING,
  info: INFO,
  income: INCOME,
  expense: EXPENSE,
  shadow: SHADOW,
  overlay: 'rgba(0, 0, 0, 0.7)',
};

export default {
  PRIMARY,
  SECONDARY,
  BACKGROUND,
  DARK_TEXT,
  DANGER,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_MUTED,
  BG_PRIMARY,
  BG_CARD,
  SUCCESS,
  ERROR,
  WARNING,
  INFO,
  INCOME,
  EXPENSE,
  BORDER,
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  BUDGET_STATUS,
  CHART_COLORS,
  LIGHT_THEME,
  DARK_THEME,
};
