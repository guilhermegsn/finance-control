import { database } from '../database';
import Transaction from '../models/Transactions';
import { Q } from '@nozbe/watermelondb';

export const TransactionService = {
  // Observar todas as transações ativas ordenadas por data (mais recente primeiro)
  observeTransactions: () => {
    return database.get<Transaction>('transactions')
      .query(
        Q.sortBy('date', Q.desc)
      )
      .observe();
  },

  // Buscar todas as transações ativas
  fetchAll: async () => {
    return await database.get<Transaction>('transactions')
      .query(
        Q.sortBy('date', Q.desc)
      )
      .fetch();
  },

  // Buscar transação por ID
  findById: async (transactionId: string) => {
    return await database.get<Transaction>('transactions').find(transactionId);
  },

  // Criar nova transação
  create: async (data: {
    accountId: string;
    categoryId: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    date: Date;
    userId: string;
    isConsolidated?: boolean;
    consolidatedAt?: Date;
    observation?: string;
    creditCardId?: string;
    relatedTransactionId?: string;
  }) => {
    await database.write(async () => {
      await database.get<Transaction>('transactions').create((transaction) => {
        // @ts-ignore - WatermelonDB usa esta sintaxe para relacionamentos
        transaction._raw.account_id = data.accountId;
        // @ts-ignore - WatermelonDB usa esta sintaxe para relacionamentos
        transaction._raw.category_id = data.categoryId;
        transaction.description = data.description;
        transaction.amount = data.amount;
        transaction.type = data.type;
        transaction.date = data.date;
        transaction.userId = data.userId;
        transaction.isConsolidated = data.isConsolidated || false;
        transaction.consolidatedAt = data.consolidatedAt;
        transaction.observation = data.observation;
        // Campos opcionais do schema
        if (data.creditCardId) {
          // @ts-ignore - campo não definido no modelo mas existe no schema
          transaction._raw.credit_card_id = data.creditCardId;
        }
        if (data.relatedTransactionId) {
          // @ts-ignore - campo não definido no modelo mas existe no schema
          transaction._raw.related_transaction_id = data.relatedTransactionId;
        }
      });
    });
  },

  // Atualizar transação existente
  update: async (transactionId: string, data: {
    accountId?: string;
    categoryId?: string;
    description?: string;
    amount?: number;
    type?: 'income' | 'expense';
    date?: Date;
    isConsolidated?: boolean;
    consolidatedAt?: Date;
    observation?: string;
    creditCardId?: string;
    relatedTransactionId?: string;
  }) => {
    await database.write(async () => {
      const transaction = await database.get<Transaction>('transactions').find(transactionId);
      
      await transaction.update((tx) => {
        if (data.accountId !== undefined) {
          // @ts-ignore - WatermelonDB usa esta sintaxe para relacionamentos
          tx._raw.account_id = data.accountId;
        }
        if (data.categoryId !== undefined) {
          // @ts-ignore - WatermelonDB usa esta sintaxe para relacionamentos
          tx._raw.category_id = data.categoryId;
        }
        if (data.description !== undefined) tx.description = data.description;
        if (data.amount !== undefined) tx.amount = data.amount;
        if (data.type !== undefined) tx.type = data.type;
        if (data.date !== undefined) tx.date = data.date;
        if (data.isConsolidated !== undefined) tx.isConsolidated = data.isConsolidated;
        if (data.consolidatedAt !== undefined) tx.consolidatedAt = data.consolidatedAt;
        if (data.observation !== undefined) tx.observation = data.observation;
        // Campos opcionais do schema
        if (data.creditCardId !== undefined) {
          // @ts-ignore - campo não definido no modelo mas existe no schema
          tx._raw.credit_card_id = data.creditCardId;
        }
        if (data.relatedTransactionId !== undefined) {
          // @ts-ignore - campo não definido no modelo mas existe no schema
          tx._raw.related_transaction_id = data.relatedTransactionId;
        }
      });
    });
  },

  // Soft Delete
  delete: async (transactionId: string) => {
    await database.write(async () => {
      const transaction = await database.get<Transaction>('transactions').find(transactionId);
      await transaction.markAsDeleted();
    });

    console.log('Transação marcada para exclusão. Execute o Sync para atualizar o servidor.');
  }
};
