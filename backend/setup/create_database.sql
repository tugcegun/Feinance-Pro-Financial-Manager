-- Finansapp MySQL Database Schema
-- Run this in phpMyAdmin or MySQL CLI

CREATE DATABASE IF NOT EXISTS finansapp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE finansapp;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    profile_photo LONGTEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Sessions table (token-based auth)
CREATE TABLE IF NOT EXISTS sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(128) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB;

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    type ENUM('income', 'expense') NOT NULL,
    icon VARCHAR(50) NULL,
    color VARCHAR(20) NULL,
    is_default TINYINT(1) DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- Accounts table (bank accounts, credit cards, cash)
CREATE TABLE IF NOT EXISTS accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    bank_name VARCHAR(100) NULL,
    balance DECIMAL(15,2) DEFAULT 0.00,
    color VARCHAR(20) NULL,
    icon VARCHAR(50) NULL,
    card_last_four VARCHAR(4) NULL,
    is_default TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('income', 'expense') NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    category_id INT NULL,
    account_id INT NULL,
    description TEXT NULL,
    date DATE NOT NULL,
    is_pinned TINYINT(1) DEFAULT 0,
    pinned_at TIMESTAMP NULL,
    is_archived TINYINT(1) DEFAULT 0,
    is_deleted TINYINT(1) DEFAULT 0,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
    INDEX idx_user_date (user_id, date),
    INDEX idx_user_deleted (user_id, is_deleted),
    INDEX idx_user_archived (user_id, is_archived),
    INDEX idx_account (account_id)
) ENGINE=InnoDB;

-- Budgets table
CREATE TABLE IF NOT EXISTS budgets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT NULL,
    amount DECIMAL(15,2) NOT NULL,
    month VARCHAR(2) NOT NULL,
    year INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    UNIQUE KEY uk_user_cat_month_year (user_id, category_id, month, year),
    INDEX idx_user_period (user_id, month, year)
) ENGINE=InnoDB;

-- Bills table (fatura takip)
CREATE TABLE IF NOT EXISTS bills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL,
    amount DECIMAL(15,2) NULL,
    due_date DATE NULL,
    is_paid TINYINT(1) DEFAULT 0,
    paid_date DATE NULL,
    photo_uri TEXT NULL,
    notes TEXT NULL,
    is_recurring TINYINT(1) DEFAULT 0,
    recurring_day INT NULL,
    reminder_days INT DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_paid (user_id, is_paid),
    INDEX idx_due_date (due_date)
) ENGINE=InnoDB;

-- Bill history table (odeme gecmisi)
CREATE TABLE IF NOT EXISTS bill_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bill_id INT NOT NULL,
    user_id INT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    paid_date DATE NOT NULL,
    photo_uri TEXT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_date (user_id, paid_date)
) ENGINE=InnoDB;

-- Family members table (aile paylasimi icin)
CREATE TABLE IF NOT EXISTS family_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NULL,
    role VARCHAR(50) DEFAULT 'member',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- Bill assignments table (fatura paylasimi)
CREATE TABLE IF NOT EXISTS bill_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bill_id INT NOT NULL,
    family_member_id INT NOT NULL,
    share_amount DECIMAL(15,2) NULL,
    share_percentage DECIMAL(5,2) NULL,
    is_paid TINYINT(1) DEFAULT 0,
    FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
    FOREIGN KEY (family_member_id) REFERENCES family_members(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Recurring transactions table
CREATE TABLE IF NOT EXISTS recurring_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('income', 'expense') NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    category_id INT NULL,
    description TEXT NULL,
    account_id INT NULL,
    frequency ENUM('daily', 'weekly', 'monthly') NOT NULL,
    day_of_week INT NULL,
    day_of_month INT NULL,
    start_date DATE NOT NULL,
    end_date DATE NULL,
    last_generated_date DATE NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
    INDEX idx_user_active (user_id, is_active)
) ENGINE=InnoDB;

-- Savings goals table
CREATE TABLE IF NOT EXISTS savings_goals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT NULL,
    target_amount DECIMAL(15,2) NOT NULL,
    current_amount DECIMAL(15,2) DEFAULT 0.00,
    icon VARCHAR(50) DEFAULT 'target',
    color VARCHAR(20) DEFAULT '#F39C12',
    target_date DATE NULL,
    is_completed TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- Savings goal history table
CREATE TABLE IF NOT EXISTS savings_goal_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    goal_id INT NOT NULL,
    user_id INT NOT NULL,
    account_id INT NULL,
    amount DECIMAL(15,2) NOT NULL,
    action_type ENUM('deposit', 'withdraw') NOT NULL,
    deducted TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (goal_id) REFERENCES savings_goals(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
    INDEX idx_goal (goal_id)
) ENGINE=InnoDB;

-- Installments table (taksit planlari)
CREATE TABLE IF NOT EXISTS installments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    installment_count INT NOT NULL,
    paid_count INT DEFAULT 0,
    monthly_amount DECIMAL(15,2) NOT NULL,
    first_payment_date DATE NOT NULL,
    account_id INT NULL,
    is_completed TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
    INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- Installment payments table (taksit odemeleri)
CREATE TABLE IF NOT EXISTS installment_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    installment_id INT NOT NULL,
    payment_number INT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE NULL,
    is_paid TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (installment_id) REFERENCES installments(id) ON DELETE CASCADE,
    INDEX idx_installment (installment_id)
) ENGINE=InnoDB;

-- Debts/Credits table (borc/alacak takibi)
CREATE TABLE IF NOT EXISTS debts_credits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(20) NOT NULL,
    person_name VARCHAR(200) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    remaining_amount DECIMAL(15,2) NOT NULL,
    description TEXT NULL,
    date_created DATE NOT NULL,
    due_date DATE NULL,
    is_settled TINYINT(1) DEFAULT 0,
    settled_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_settled (user_id, is_settled)
) ENGINE=InnoDB;

-- Debt/Credit payments table (kismi odeme gecmisi)
CREATE TABLE IF NOT EXISTS debt_credit_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    debt_credit_id INT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    payment_date DATE NOT NULL,
    note TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (debt_credit_id) REFERENCES debts_credits(id) ON DELETE CASCADE,
    INDEX idx_debt_credit (debt_credit_id)
) ENGINE=InnoDB;
