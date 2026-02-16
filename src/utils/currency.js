export const formatCurrency = (amount, language = 'tr') => {
  const formattedAmount = Math.abs(amount).toFixed(2);

  if (language === 'tr') {
    // Turkish format: 1.234,56 TL
    return formattedAmount.replace(/\B(?=(\d{3})+(?!\d))/g, '.').replace('.', ',') + ' TL';
  } else {
    // English format: $1,234.56
    return '$' + formattedAmount.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
};

export const getCurrencySymbol = (language = 'tr') => {
  return language === 'tr' ? 'TL' : '$';
};
