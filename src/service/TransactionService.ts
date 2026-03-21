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

  // Criar nova transação (com suporte a recorrência usando database.batch())
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
    // Parâmetros de recorrência
    isRecurring?: boolean;
    recurringEndDate?: Date;
  }) => {
    await database.write(async () => {
      // Se não for recorrente, cria apenas uma transação
      if (!data.isRecurring) {
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
          transaction.isRecurring = false;
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
        return;
      }

      // Se for recorrente, cria uma série de transações usando database.batch()
      // Gerar UUID único para recurring_id
      const recurringId = `recurring_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Calcular datas: se não houver endDate, usar 24 meses (2 anos) como padrão
      const startDate = new Date(data.date);
      let endDate: Date;
      
      if (data.recurringEndDate) {
        endDate = new Date(data.recurringEndDate);
      } else {
        // Recorrência infinita: criar para os próximos 24 meses
        endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 24);
      }
      
      // Normalizar horas para evitar problemas de comparação
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      
      // Array para armazenar os registros preparados
      const records = [];
      
      // Função para adicionar meses tratando casos de fim de mês
      // Sempre calcula a partir da data original, não iterativamente
      const addMonthsFromStart = (startDate: Date, months: number): Date => {
        const newDate = new Date(startDate);
        const originalDay = startDate.getDate();
        newDate.setMonth(newDate.getMonth() + months);
        
        // Tratar casos onde o dia não existe no próximo mês (ex: 31 de janeiro -> 28/29 de fevereiro)
        if (newDate.getDate() !== originalDay) {
          // Se o dia não existe, usar o último dia do mês atual (data segura)
          // setDate(0) vai para o último dia do mês anterior
          newDate.setDate(0);
        }
        
        return newDate;
      };
      
      // Criar registros para cada mês
      let monthOffset = 0;
      while (true) {
        const currentDate = addMonthsFromStart(startDate, monthOffset);
        
        // Parar se a data calculada for após a data final
        if (currentDate > endDate) {
          break;
        }
        
        const transactionCollection = database.get<Transaction>('transactions');
        const transactionRecord = transactionCollection.prepareCreate((transaction) => {
          // @ts-ignore - WatermelonDB usa esta sintaxe para relacionamentos
          transaction._raw.account_id = data.accountId;
          // @ts-ignore - WatermelonDB usa esta sintaxe para relacionamentos
          transaction._raw.category_id = data.categoryId;
          transaction.description = data.description;
          transaction.amount = data.amount;
          transaction.type = data.type;
          transaction.date = new Date(currentDate);
          transaction.userId = data.userId;
          transaction.isConsolidated = data.isConsolidated || false;
          transaction.consolidatedAt = data.consolidatedAt;
          transaction.observation = data.observation;
          transaction.isRecurring = true;
          // @ts-ignore - campo não definido no modelo mas existe no schema
          transaction._raw.recurring_id = recurringId;
          
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
        
        records.push(transactionRecord);
        monthOffset++;
      }
      
      // Executar todos os registros em um único batch
      await database.batch(...records);
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
    // Campos de recorrência
    recurringId?: string;
    isRecurring?: boolean;
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
        if (data.isRecurring !== undefined) tx.isRecurring = data.isRecurring;
        // Campos opcionais do schema
        if (data.creditCardId !== undefined) {
          // @ts-ignore - campo não definido no modelo mas existe no schema
          tx._raw.credit_card_id = data.creditCardId;
        }
        if (data.relatedTransactionId !== undefined) {
          // @ts-ignore - campo não definido no modelo mas existe no schema
          tx._raw.related_transaction_id = data.relatedTransactionId;
        }
        if (data.recurringId !== undefined) {
          // @ts-ignore - campo não definido no modelo mas existe no schema
          tx._raw.recurring_id = data.recurringId;
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
  },

  // Atualizar transações recorrentes (apenas esta ou esta e as próximas)
  updateRecurring: async (
    transactionId: string,
    mode: 'only_this' | 'all_future',
    data: {
      accountId?: string;
      categoryId?: string;
      description?: string;
      amount?: number;
      type?: 'income' | 'expense';
      observation?: string;
    }
  ) => {
    await database.write(async () => {
      const transaction = await database.get<Transaction>('transactions').find(transactionId);
      
      if (mode === 'only_this') {
        // Atualiza apenas esta transação e remove do grupo recorrente
        await transaction.update((tx) => {
          if (data.accountId !== undefined) {
            // @ts-ignore
            tx._raw.account_id = data.accountId;
          }
          if (data.categoryId !== undefined) {
            // @ts-ignore
            tx._raw.category_id = data.categoryId;
          }
          if (data.description !== undefined) tx.description = data.description;
          if (data.amount !== undefined) tx.amount = data.amount;
          if (data.type !== undefined) tx.type = data.type;
          if (data.observation !== undefined) tx.observation = data.observation;
          // Remove do grupo recorrente
          tx.isRecurring = false;
          // @ts-ignore
          tx._raw.recurring_id = null;
        });
      } else {
        // Atualiza esta e todas as próximas (all_future)
        // @ts-ignore
        const recurringId = transaction._raw.recurring_id;
        const transactionDate = new Date(transaction.date);
        
        if (!recurringId) {
          // Se não tem recurring_id, atualiza apenas esta
          await transaction.update((tx) => {
            if (data.accountId !== undefined) {
              // @ts-ignore
              tx._raw.account_id = data.accountId;
            }
            if (data.categoryId !== undefined) {
              // @ts-ignore
              tx._raw.category_id = data.categoryId;
            }
            if (data.description !== undefined) tx.description = data.description;
            if (data.amount !== undefined) tx.amount = data.amount;
            if (data.type !== undefined) tx.type = data.type;
            if (data.observation !== undefined) tx.observation = data.observation;
          });
          return;
        }
        
        // Buscar todas as transações com o mesmo recurring_id e data >= data atual
        const futureTransactions = await database.get<Transaction>('transactions')
          .query(
            Q.where('recurring_id', recurringId),
            Q.where('date', Q.gte(transactionDate.getTime()))
          )
          .fetch();
        
        // Preparar atualizações em batch
        const updates = futureTransactions.map(tx => 
          tx.prepareUpdate((record) => {
            if (data.accountId !== undefined) {
              // @ts-ignore
              record._raw.account_id = data.accountId;
            }
            if (data.categoryId !== undefined) {
              // @ts-ignore
              record._raw.category_id = data.categoryId;
            }
            if (data.description !== undefined) record.description = data.description;
            if (data.amount !== undefined) record.amount = data.amount;
            if (data.type !== undefined) record.type = data.type;
            if (data.observation !== undefined) record.observation = data.observation;
          })
        );
        
        await database.batch(...updates);
      }
    });
  },

  // Excluir transações recorrentes (apenas esta ou esta e as próximas)
  deleteRecurring: async (transactionId: string, mode: 'only_this' | 'all_future') => {
    await database.write(async () => {
      const transaction = await database.get<Transaction>('transactions').find(transactionId);
      
      if (mode === 'only_this') {
        // Exclui apenas esta transação
        await transaction.markAsDeleted();
      } else {
        // Exclui esta e todas as próximas (all_future)
        // @ts-ignore
        const recurringId = transaction._raw.recurring_id;
        const transactionDate = new Date(transaction.date);
        
        if (!recurringId) {
          // Se não tem recurring_id, exclui apenas esta
          await transaction.markAsDeleted();
          return;
        }
        
        // Buscar todas as transações com o mesmo recurring_id e data >= data atual
        const futureTransactions = await database.get<Transaction>('transactions')
          .query(
            Q.where('recurring_id', recurringId),
            Q.where('date', Q.gte(transactionDate.getTime()))
          )
          .fetch();
        
        // Preparar exclusões em batch
        const deletions = futureTransactions.map(tx => tx.prepareMarkAsDeleted());
        
        await database.batch(...deletions);
      }
    });
    
    console.log('Transação(ões) recorrente(s) marcada(s) para exclusão.');
  },

  // Alternar status de consolidação
  toggleConsolidated: async (transaction: Transaction) => {
    await database.write(async () => {
      await transaction.update((tx) => {
        tx.isConsolidated = !tx.isConsolidated;
      });
    });
  },

  // Criar transferência entre contas
  createTransfer: async (data: {
    amount: number;
    date: Date;
    description: string;
    sourceAssetId: string;
    destinationAssetId: string;
    userId: string;
  }) => {
    await database.write(async () => {
      const transactionCollection = database.get<Transaction>('transactions');
      
      const sourceTransaction = transactionCollection.prepareCreate((transaction) => {
        // @ts-ignore
        transaction._raw.account_id = data.sourceAssetId;
        // @ts-ignore
        transaction._raw.category_id = null; // Transferência não precisa de categoria específica, ou pode ter uma categoria "Transferência" se existir
        transaction.description = `[Transferência] ${data.description}`;
        transaction.amount = data.amount; // A modelagem de expense já subtrai no saldo
        transaction.type = 'expense';
        transaction.date = data.date;
        transaction.userId = data.userId;
        transaction.isConsolidated = true;
        transaction.isRecurring = false;
      });

      const destinationTransaction = transactionCollection.prepareCreate((transaction) => {
        // @ts-ignore
        transaction._raw.account_id = data.destinationAssetId;
        // @ts-ignore
        transaction._raw.category_id = null;
        transaction.description = `[Transferência] ${data.description}`;
        transaction.amount = data.amount;
        transaction.type = 'income';
        transaction.date = data.date;
        transaction.userId = data.userId;
        transaction.isConsolidated = true;
        transaction.isRecurring = false;
      });

      await database.batch(sourceTransaction, destinationTransaction);
    });
  },

  // Calcular saldo de uma conta antes de uma data específica
  getBalanceBeforeDate: async (accountId: string, date: Date): Promise<number> => {
    // Buscar todas as transações da conta com data anterior à data fornecida
    const transactions = await database.get<Transaction>('transactions')
      .query(
        Q.where('account_id', accountId),
        Q.where('date', Q.lt(date.getTime())), // date é armazenado como timestamp (number)
        Q.sortBy('date', Q.asc)
      )
      .fetch();
    
    // Calcular saldo: entradas - saídas
    let balance = 0;
    transactions.forEach(transaction => {
      if (transaction.type === 'income') {
        balance += transaction.amount;
      } else if (transaction.type === 'expense') {
        balance -= transaction.amount;
      }
    });
    
    return balance;
  }
};
