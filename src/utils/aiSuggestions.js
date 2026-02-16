// Category translations
const categoryTranslations = {
  tr: { 'Salary': 'Maaş', 'Freelance': 'Serbest Çalışma', 'Food': 'Yemek', 'Transportation': 'Ulaşım', 'Shopping': 'Alışveriş', 'Entertainment': 'Eğlence', 'Bills': 'Faturalar', 'Healthcare': 'Sağlık' }
};

const translateCategory = (name, lang) => (categoryTranslations[lang] || {})[name] || name;

const getTexts = (lang) => lang === 'tr' ? {
  lowSavingsTitle: 'Düşük Tasarruf Oranı',
  greatSavingsTitle: 'Harika Tasarruf!',
  topCategoryTitle: 'En Yüksek Harcama Kategorisi',
  overspendTitle: 'Harcamalar Geliri Aştı',
  highVolumeTitle: 'Yüksek İşlem Sayısı',
  healthyTitle: 'Sağlıklı Finansal Durum',
  healthyMsg: 'Finanslarınız iyi görünüyor! Harcama alışkanlıklarınızı korumaya ve tasarruf etmeye devam edin.',
  tipTitle: 'Finansal İpucu',
  tips: ['Küçük günlük tasarruflar zamanla büyük sonuçlara yol açabilir.', 'Aboneliklerinizi gözden geçirin - kullanmadıklarınızı iptal edin.', 'Dengeli finans için 50/30/20 bütçeleme kuralını deneyin.', 'Acil durum fonu finansal güvencenizdir.', 'Kendinize yatırım yapın - eğitim en iyi getiriyi sağlar.'],
  currency: '₺'
} : {
  lowSavingsTitle: 'Low Savings Rate',
  greatSavingsTitle: 'Great Savings!',
  topCategoryTitle: 'Top Spending Category',
  overspendTitle: 'Spending Exceeds Income',
  highVolumeTitle: 'High Transaction Volume',
  healthyTitle: 'Healthy Financial Status',
  healthyMsg: 'Your finances look good! Keep maintaining your spending habits and continue saving.',
  tipTitle: 'Financial Tip',
  tips: ['Small daily savings can lead to big results over time.', 'Review your subscriptions - cancel unused ones.', 'Consider the 50/30/20 budgeting rule for balanced finances.', 'An emergency fund is your financial safety net.', 'Invest in yourself - education pays the best interest.'],
  currency: '$'
};

export const generateMonthlySuggestions = (transactions, budgets, monthData, language = 'tr') => {
  const suggestions = [];
  const t = getTexts(language);

  const totalIncome = monthData?.find(m => m.type === 'income')?.total || 0;
  const totalExpense = monthData?.find(m => m.type === 'expense')?.total || 0;
  const balance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;

  const expensesByCategory = {};
  transactions.filter(tx => tx.type === 'expense').forEach(tx => {
    expensesByCategory[tx.category_name] = (expensesByCategory[tx.category_name] || 0) + tx.amount;
  });

  if (savingsRate < 10) {
    const msg = language === 'tr'
      ? 'Tasarruf oranınız %' + savingsRate.toFixed(1) + '. Gelirinizin en az %20\'sini biriktirmeye çalışın.'
      : 'Your savings rate is ' + savingsRate.toFixed(1) + '%. Try to save at least 20% of your income.';
    suggestions.push({ type: 'warning', title: t.lowSavingsTitle, message: msg, icon: 'alert-circle' });
  } else if (savingsRate >= 20) {
    const msg = language === 'tr'
      ? 'Mükemmel! Gelirinizin %' + savingsRate.toFixed(1) + '\'ini biriktiriyorsunuz. Böyle devam edin!'
      : 'Excellent! You\'re saving ' + savingsRate.toFixed(1) + '% of your income. Keep it up!';
    suggestions.push({ type: 'success', title: t.greatSavingsTitle, message: msg, icon: 'check-circle' });
  }

  budgets.forEach(budget => {
    const spent = expensesByCategory[budget.category_name] || 0;
    const pct = (spent / budget.amount) * 100;
    const cat = translateCategory(budget.category_name, language);

    if (pct > 90) {
      const title = language === 'tr' ? cat + ' Bütçe Uyarısı' : cat + ' Budget Alert';
      const msg = language === 'tr'
        ? cat + ' bütçenizin %' + pct.toFixed(0) + '\'ini kullandınız. Harcamaları azaltmayı düşünün.'
        : 'You\'ve used ' + pct.toFixed(0) + '% of your ' + cat + ' budget. Consider reducing spending.';
      suggestions.push({ type: 'danger', title, message: msg, icon: 'alert-triangle' });
    } else if (pct < 50) {
      const title = language === 'tr' ? cat + ' Bütçesi' : cat + ' Budget';
      const msg = language === 'tr'
        ? 'Harika! ' + cat + ' bütçenizin sadece %' + pct.toFixed(0) + '\'ini kullandınız.'
        : 'Great job! You\'ve only used ' + pct.toFixed(0) + '% of your ' + cat + ' budget.';
      suggestions.push({ type: 'success', title, message: msg, icon: 'thumbs-up' });
    }
  });

  const sorted = Object.entries(expensesByCategory).sort(([,a],[,b]) => b - a);
  if (sorted.length > 0) {
    const [topCat, topAmt] = sorted[0];
    const catPct = (topAmt / totalExpense) * 100;
    const cat = translateCategory(topCat, language);
    if (catPct > 40) {
      const msg = language === 'tr'
        ? cat + ' giderlerinizin %' + catPct.toFixed(0) + '\'ini oluşturuyor. Önceliklerinizle uyumlu olup olmadığını değerlendirin.'
        : cat + ' accounts for ' + catPct.toFixed(0) + '% of your expenses. Consider if this aligns with your priorities.';
      suggestions.push({ type: 'info', title: t.topCategoryTitle, message: msg, icon: 'pie-chart' });
    }
  }

  if (totalExpense > totalIncome) {
    const deficit = totalExpense - totalIncome;
    const msg = language === 'tr'
      ? 'Bu ay kazandığınızdan ' + t.currency + deficit.toFixed(2) + ' daha fazla harcadınız. Giderlerinizi acilen gözden geçirin.'
      : 'You spent ' + t.currency + deficit.toFixed(2) + ' more than you earned this month. Review your expenses urgently.';
    suggestions.push({ type: 'danger', title: t.overspendTitle, message: msg, icon: 'trending-down' });
  }

  const expCount = transactions.filter(tx => tx.type === 'expense').length;
  if (expCount > 50) {
    const msg = language === 'tr'
      ? expCount + ' gider işlemi yaptınız. Harcamaları daha iyi takip etmek için alışverişleri birleştirmeyi düşünün.'
      : 'You made ' + expCount + ' expense transactions. Consider consolidating purchases to better track spending.';
    suggestions.push({ type: 'info', title: t.highVolumeTitle, message: msg, icon: 'activity' });
  }

  if (suggestions.length === 0) {
    suggestions.push({ type: 'success', title: t.healthyTitle, message: t.healthyMsg, icon: 'smile' });
  }

  suggestions.push({ type: 'info', title: t.tipTitle, message: t.tips[Math.floor(Math.random() * t.tips.length)], icon: 'lightbulb' });

  return suggestions;
};
