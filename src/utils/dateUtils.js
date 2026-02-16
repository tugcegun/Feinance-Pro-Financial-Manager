import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';

export const formatDate = (date, language = 'en') => {
  const locale = language === 'tr' ? tr : enUS;
  return format(new Date(date), 'd MMMM yyyy', { locale });
};

export const formatDateShort = (date, language = 'en') => {
  const locale = language === 'tr' ? tr : enUS;
  return format(new Date(date), 'd MMM', { locale });
};

export const formatDateForDB = (date) => {
  return format(new Date(date), 'yyyy-MM-dd');
};

export const getCurrentMonth = () => {
  return new Date().getMonth() + 1;
};

export const getCurrentYear = () => {
  return new Date().getFullYear();
};

export const getMonthName = (month, language = 'en') => {
  const monthNames = {
    tr: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
         'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
    en: ['January', 'February', 'March', 'April', 'May', 'June',
         'July', 'August', 'September', 'October', 'November', 'December']
  };

  return monthNames[language][month - 1] || monthNames['en'][month - 1];
};

export const getMonthStartEnd = (month, year) => {
  const date = new Date(year, month - 1, 1);
  return {
    start: format(startOfMonth(date), 'yyyy-MM-dd'),
    end: format(endOfMonth(date), 'yyyy-MM-dd'),
  };
};

export const getPreviousMonths = (count, language = 'en') => {
  const months = [];
  const current = new Date();
  const locale = language === 'tr' ? tr : enUS;

  for (let i = 0; i < count; i++) {
    const date = subMonths(current, i);
    months.push({
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      label: format(date, 'MMM yyyy', { locale }),
    });
  }

  return months;
};

export const getDaysInMonth = (month, year) => {
  return new Date(year, month, 0).getDate();
};

export const getFirstDayOfMonth = (month, year) => {
  return new Date(year, month - 1, 1).getDay();
};
