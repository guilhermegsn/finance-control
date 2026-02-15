export type TransactionType = 'income' | 'expense';
export type AccountType = 'checking' | 'cash' | 'investment';

export interface Account {
  id: string;
  user_id: string;
  name: string;
  initial_balance: number;
  type: AccountType;
  color: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  description: string;
  amount: number;
  type: TransactionType;
  date: string; // ISO String
  is_consolidated: boolean;
  consolidated_at: string | null;
  observation: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreditCard {
  id: string;
  user_id: string;
  name: string;
  closing_day: number;
  due_day: number;
  account_id: string | null;
  limit: number;
  color: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreditPurchase {
  id: string;
  user_id: string;
  credit_card_id: string;
  category_id: string | null;
  description: string;
  total_amount: number;
  installments_count: number;
  purchase_date: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreditInstallment {
  id: string;
  user_id: string;
  purchase_id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  is_paid: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}