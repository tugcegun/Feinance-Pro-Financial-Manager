# FinanceApp - Personal Finance Manager

A comprehensive React Native Expo finance application for tracking income, expenses, budgets, and financial goals with AI-powered insights.

## Features

### 1. Income & Expense Tracking
- Add and manage income and expense transactions
- Categorize transactions with predefined or custom categories
- View transaction history with detailed information
- Delete transactions with confirmation
- Visual category indicators with icons and colors

### 2. SQLite Database
- Local data persistence using expo-sqlite
- Automatic database initialization with default categories
- Efficient data queries and transactions
- No internet connection required

### 3. Budget Management
- Set monthly budgets for different expense categories
- Track spending against budgets in real-time
- Visual progress bars showing budget usage
- Status indicators (Great, On Track, Almost There, Over Budget)
- Monthly budget overview and summaries

### 4. Monthly Reports & Charts
- 6-month income and expense trend line chart
- Pie chart showing expenses by category
- Monthly overview with income, expenses, and balance
- Visual data representation using react-native-chart-kit

### 5. Financial Tips Library
- 15+ curated financial tips covering:
  - Budgeting strategies
  - Saving techniques
  - Spending management
  - Debt reduction
  - Investment basics
- Search and filter tips by category
- Color-coded categories for easy navigation

### 6. AI-Powered Insights
- Automated analysis of spending patterns
- Personalized monthly suggestions based on:
  - Savings rate analysis
  - Budget adherence tracking
  - Spending pattern detection
  - Income vs expense comparison
- Smart alerts for budget overruns
- Motivational tips and advice

## Project Structure

```
FinanceApp/
├── src/
│   ├── components/
│   │   ├── CategoryPicker.js      # Category selection component
│   │   ├── StatCard.js            # Statistics display card
│   │   └── TransactionItem.js     # Transaction list item
│   ├── screens/
│   │   ├── HomeScreen.js          # Dashboard with overview
│   │   ├── TransactionsScreen.js  # Add/view transactions
│   │   ├── BudgetScreen.js        # Budget management
│   │   ├── ReportsScreen.js       # Charts and insights
│   │   └── TipsScreen.js          # Financial tips library
│   ├── database/
│   │   └── database.js            # SQLite database operations
│   ├── utils/
│   │   ├── aiSuggestions.js       # AI suggestion generator
│   │   └── dateUtils.js           # Date formatting utilities
│   ├── constants/
│   │   └── colors.js              # Color theme
│   └── data/
│       └── financialTips.js       # Financial tips data
├── App.js                         # Main app with navigation
└── package.json                   # Dependencies

```

## Technologies Used

- **React Native** - Cross-platform mobile framework
- **Expo** - Development platform and toolchain
- **expo-sqlite** - Local database for data persistence
- **React Navigation** - Navigation library for screen transitions
- **react-native-chart-kit** - Charts and data visualization
- **date-fns** - Date manipulation and formatting
- **Feather Icons** - Beautiful icon set via @expo/vector-icons

## Installation & Setup

1. Make sure you have Node.js installed on your system

2. Install Expo CLI globally (if not already installed):
   ```bash
   npm install -g expo-cli
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Run on your device or emulator:
   - **Android**: Press `a` or run `npm run android`
   - **iOS**: Press `i` or run `npm run ios` (Mac only)
   - **Web**: Press `w` or run `npm run web`
   - **Expo Go**: Scan the QR code with the Expo Go app on your phone

## Usage Guide

### Adding Transactions
1. Navigate to the Transactions tab
2. Tap "Add Income" or "Add Expense"
3. Enter the amount and optional description
4. Select a category
5. Tap "Add Transaction"

### Setting Budgets
1. Navigate to the Budget tab
2. Tap the "+" button
3. Select a category
4. Enter your budget amount
5. Tap "Set Budget"

### Viewing Reports
1. Navigate to the Reports tab
2. View your monthly overview
3. Scroll to see trend charts and category breakdowns
4. Read AI-powered insights and suggestions

### Browsing Financial Tips
1. Navigate to the Tips tab
2. Use the search bar to find specific tips
3. Filter by category (Budgeting, Saving, Spending, Debt, Investing)
4. Read tips and apply them to your financial journey

## Default Categories

### Income Categories
- Salary
- Freelance

### Expense Categories
- Food
- Transportation
- Shopping
- Entertainment
- Bills
- Healthcare

You can add custom categories through the database operations.

## Database Schema

### Categories Table
- id (INTEGER PRIMARY KEY)
- name (TEXT)
- type (TEXT) - 'income' or 'expense'
- icon (TEXT)
- color (TEXT)

### Transactions Table
- id (INTEGER PRIMARY KEY)
- type (TEXT) - 'income' or 'expense'
- amount (REAL)
- category_id (INTEGER)
- description (TEXT)
- date (TEXT)

### Budgets Table
- id (INTEGER PRIMARY KEY)
- category_id (INTEGER)
- amount (REAL)
- month (TEXT)
- year (INTEGER)

## Customization

### Changing Colors
Edit `src/constants/colors.js` to customize the app's color scheme.

### Adding Financial Tips
Edit `src/data/financialTips.js` to add more financial tips or modify existing ones.

### Modifying AI Suggestions
Edit `src/utils/aiSuggestions.js` to adjust the logic for generating insights.

## Future Enhancements

- Export data to CSV/PDF
- Recurring transactions
- Multiple currency support
- Cloud sync and backup
- Biometric authentication
- Bill reminders and notifications
- Custom category creation UI
- Advanced analytics and reports
- Goal setting and tracking

## License

This project is created for educational purposes.

## Support

For issues or questions, please review the code or consult the Expo and React Native documentation.
