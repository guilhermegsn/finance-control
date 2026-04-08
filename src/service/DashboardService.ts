import { database } from '../database';
import { Q } from '@nozbe/watermelondb';
import Account from '../models/Accounts';
import Transaction from '../models/Transactions';
import Category from '../models/Caterogy';
import dayjs from 'dayjs';

export interface BalanceData {
  current: number;
  projected: number;
}

export interface CategorySpending {
  categoryId: string;
  categoryName: string;
  amount: number;
  color: string;
}

export const DashboardService = {
  // Calcular saldo atual de uma conta específica
  calculateAccountBalance: async (accountId: string): Promise<number> => {
    const transactions = await database.get<Transaction>('transactions')
      .query(
        Q.where('account_id', accountId),
        Q.where('is_consolidated', true)
      )
      .fetch();
    
    let balance = 0;
    transactions.forEach(transaction => {
      if (transaction.type === 'income') {
        balance += transaction.amount;
      } else if (transaction.type === 'expense') {
        balance -= transaction.amount;
      }
    });
    
    return balance;
  },

  // Calcular saldo total de todas as contas não arquivadas
  calculateTotalBalance: async (): Promise<number> => {
    const accounts = await database.get<Account>('accounts')
      .query(Q.where('archived', false))
      .fetch();
    
    let totalBalance = 0;
    
    for (const account of accounts) {
      const accountBalance = await DashboardService.calculateAccountBalance(account.id);
      totalBalance += accountBalance;
    }
    
    return totalBalance;
  },

  // Calcular saldo projetado para o fim do mês
  calculateProjectedBalance: async (): Promise<BalanceData> => {
    const currentBalance = await DashboardService.calculateTotalBalance();
    
    const now = dayjs();
    const startOfMonth = now.startOf('month').toDate();
    const endOfMonth = now.endOf('month').toDate();
    
    // Buscar transações pendentes do mês atual
    const pendingTransactions = await database.get<Transaction>('transactions')
      .query(
        Q.where('is_consolidated', false),
        Q.where('date', Q.gte(startOfMonth.getTime())),
        Q.where('date', Q.lte(endOfMonth.getTime()))
      )
      .fetch();
    
    const totalIncome = pendingTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpense = pendingTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const projectedBalance = currentBalance + totalIncome - totalExpense;
    
    return {
      current: currentBalance,
      projected: projectedBalance
    };
  },

  // Calcular gastos por categoria no mês atual
  calculateCategorySpending: async (): Promise<CategorySpending[]> => {
    const now = dayjs();
    const startOfMonth = now.startOf('month').toDate();
    const endOfMonth = now.endOf('month').toDate();
    
    // Buscar todas as categorias
    const categories = await database.get<Category>('categories').query().fetch();
    const categoryMap = new Map(categories.map(cat => [cat.id, cat]));
    
    // Buscar transações de despesa do mês atual (consolidadas e pendentes)
    const expenseTransactions = await database.get<Transaction>('transactions')
      .query(
        Q.where('type', 'expense'),
        Q.where('date', Q.gte(startOfMonth.getTime())),
        Q.where('date', Q.lte(endOfMonth.getTime()))
      )
      .fetch();
    
    const spendingByCategory: Record<string, CategorySpending> = {};
    
    expenseTransactions.forEach(transaction => {
      // Acessar category_id diretamente do _raw pois o relacionamento pode não estar carregado
      // @ts-ignore - WatermelonDB usa esta sintaxe para campos raw
      const categoryId = transaction._raw?.category_id || 'unknown';
      const category = categoryMap.get(categoryId);
      
      if (!spendingByCategory[categoryId]) {
        spendingByCategory[categoryId] = {
          categoryId,
          categoryName: category?.name || 'Sem Categoria',
          amount: 0,
          color: category?.color || '#CCCCCC'
        };
      }
      
      spendingByCategory[categoryId].amount += transaction.amount;
    });
    
    // Converter para array e ordenar por valor (maior para menor)
    return Object.values(spendingByCategory)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5); // Top 5
  },

  // Observar dados do dashboard em tempo real
  observeDashboardData: () => {
    const accountsObservable = database.get<Account>('accounts')
      .query(Q.where('archived', false))
      .observe();
    
    const transactionsObservable = database.get<Transaction>('transactions')
      .query(
        Q.where('date', Q.gte(dayjs().startOf('month').toDate().getTime())),
        Q.where('date', Q.lte(dayjs().endOf('month').toDate().getTime()))
      )
      .observe();
    
    const categoriesObservable = database.get<Category>('categories').query().observe();
    
    return { accountsObservable, transactionsObservable, categoriesObservable };
  }
};