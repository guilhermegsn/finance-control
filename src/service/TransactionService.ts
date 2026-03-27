import { database } from '../database';
import Transaction from '../models/Transactions';
import CreditCard from '../models/CreditCard';
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
      date?: Date;
      observation?: string;
    }
  ) => {
    console.log('updateRecurring chamado:', { transactionId, mode, data });
    
    await database.write(async () => {
      const transaction = await database.get<Transaction>('transactions').find(transactionId);
      //console.log('Transação encontrada:', transaction.id, 'data original:', transaction.date, 'recurringId:', transaction._raw?.recurring_id);
      
      if (mode === 'only_this') {
        console.log('Modo: only_this, atualizando apenas esta transação');
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
          if (data.date !== undefined) {
            console.log('Atualizando data para:', data.date);
            tx.date = data.date;
            // @ts-ignore - WatermelonDB usa esta sintaxe para campos date
            tx._raw.date = data.date.getTime();
          }
          if (data.observation !== undefined) tx.observation = data.observation;
          // Remove do grupo recorrente
          tx.isRecurring = false;
          // @ts-ignore
          tx._raw.recurring_id = null;
        });
      } else {
        console.log('Modo: all_future, atualizando esta e todas as próximas');
        // @ts-ignore - WatermelonDB usa esta sintaxe para campos personalizados
        const recurringId = (transaction._raw as any).recurring_id;
        const transactionDate = new Date(transaction.date);
        console.log('recurringId:', recurringId, 'transactionDate:', transactionDate);
        
        if (!recurringId) {
          console.log('Sem recurring_id, atualizando apenas esta transação');
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
            if (data.date !== undefined) {
              console.log('Atualizando data para:', data.date);
              tx.date = data.date;
              // @ts-ignore - WatermelonDB usa esta sintaxe para campos date
              tx._raw.date = data.date.getTime();
            }
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
        
        console.log(`Encontradas ${futureTransactions.length} transações futuras para atualizar`);
        
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
            if (data.date !== undefined) {
              // Calcular o deslocamento de meses entre a data original e a nova data
              const originalDate = new Date(transaction.date);
              const newDate = data.date;
              const monthDiff = (newDate.getFullYear() - originalDate.getFullYear()) * 12 + 
                               (newDate.getMonth() - originalDate.getMonth());
              const newDay = newDate.getDate();
              const newMonth = newDate.getMonth();
              const newYear = newDate.getFullYear();
              
              console.log(`Cálculo: originalDate=${originalDate.toISOString()}, newDate=${newDate.toISOString()}, monthDiff=${monthDiff}, newDay=${newDay}`);
              
              // Ajustar a data da transação futura pelo mesmo deslocamento de meses E pelo novo dia
              const originalRecordDate = new Date(record.date);
              console.log(`Data original da transação futura: ${originalRecordDate.toISOString()}`);
              
              // Calcular o mês e ano ajustados para a transação futura
              const adjustedMonth = originalRecordDate.getMonth() + monthDiff;
              const adjustedYear = originalRecordDate.getFullYear();
              
              // Criar nova data com ano/mês ajustados e novo dia
              let adjustedDate = new Date(adjustedYear, adjustedMonth, newDay);
              
              // Tratar casos onde o dia não existe no mês ajustado (ex: 31 de fevereiro)
              if (adjustedDate.getDate() !== newDay) {
                console.log(`Ajustando data: dia ${newDay} não existe no mês ${adjustedMonth + 1}, usando último dia do mês`);
                adjustedDate = new Date(adjustedYear, adjustedMonth + 1, 0); // Último dia do mês
              }
              
              console.log(`Data ajustada: ${adjustedDate.toISOString()}`);
              
              // Atualizar a data e garantir que _raw.date também seja atualizado
              record.date = adjustedDate;
              // @ts-ignore - WatermelonDB usa esta sintaxe para campos date
              record._raw.date = adjustedDate.getTime();
            }
            if (data.observation !== undefined) record.observation = data.observation;
          })
        );
        
        await database.batch(...updates);
        console.log('Batch de atualizações concluído');
      }
    });
    
    console.log('updateRecurring concluído');
  },

  // Excluir transações recorrentes (apenas esta ou esta e as próximas)
  deleteRecurring: async (transactionId: string, recurringId: string, transactionDate: Date, mode: 'only_this' | 'all_future') => {
    await database.write(async () => {
      const transaction = await database.get<Transaction>('transactions').find(transactionId);
      
      if (mode === 'only_this') {
        // Exclui apenas esta transação
        await transaction.markAsDeleted();
      } else {
        // Exclui esta e todas as próximas (all_future)
        
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
  },

  // Consolidar (pagar) a fatura virtual de um cartão
  payCreditCardInvoice: async (
    accountId: string,
    description: string,
    amount: number,
    date: Date,
    userId: string,
    transactionIds: string[]
  ) => {
    await database.write(async () => {
      const transactionCollection = database.get<Transaction>('transactions');
      
      // 1. Criar a nova transação real na conta
      const invoicePaymentRecord = transactionCollection.prepareCreate((transaction) => {
        // @ts-ignore
        transaction._raw.account_id = accountId;
        // @ts-ignore
        transaction._raw.category_id = null; // Fatura não tem categoria ou poderia ter uma específica
        transaction.description = description;
        transaction.amount = amount;
        transaction.type = 'expense';
        transaction.date = date;
        transaction.userId = userId;
        transaction.isConsolidated = true;
        transaction.isRecurring = false;
        // Importante: credit_card_id = null para que ela entre no fluxo normal
        // @ts-ignore
        transaction._raw.credit_card_id = null; 
      });

      // 2. Buscar todas as transações que compuseram essa fatura e marcá-length como consolidadas
      const recordsToUpdate: any[] = [];
      for (const id of transactionIds) {
        try {
          const tx = await transactionCollection.find(id);
          const updatedRecord = tx.prepareUpdate((record) => {
            record.isConsolidated = true;
          });
          recordsToUpdate.push(updatedRecord);
        } catch (error) {
          console.error(`Erro ao buscar transação ${id} para consolidação:`, error);
        }
      }

      // Executar todas as operações em um único batch
      await database.batch(invoicePaymentRecord, ...recordsToUpdate);
    });
  },

  // Criar compra no cartão de crédito com parcelamento
  createCreditCardPurchase: async (data: {
    amount: number;
    description: string;
    date: Date;
    creditCardId: string;
    categoryId: string;
    installments: number;
    interestRate: number;
    userId: string;
  }) => {
    await database.write(async () => {
      if (data.installments < 1) throw new Error('O número de parcelas deve ser maior que zero');
      if (data.interestRate < 0) throw new Error('A taxa de juros não pode ser negativa');

      const creditCard = await database.get<CreditCard>('credit_cards').find(data.creditCardId);
      
      let installmentAmount = data.amount;
      let totalAmount = data.amount;
      
      if (data.installments > 1) {
        if (data.interestRate > 0) {
          const i = data.interestRate / 100;
          const n = data.installments;
          const pv = data.amount;
          const pmt = pv * i / (1 - Math.pow(1 + i, -n));
          installmentAmount = parseFloat(pmt.toFixed(2));
          totalAmount = parseFloat((installmentAmount * n).toFixed(2));
        } else {
          installmentAmount = parseFloat((data.amount / data.installments).toFixed(2));
          totalAmount = data.amount;
        }
      }

      const purchaseDate = new Date(data.date);

      // 🔥 A MÁGICA MATEMÁTICA BRASILEIRA ESTÁ AQUI 🔥
      const getInstallmentDueDate = (installmentIndex: number) => {
        let month = purchaseDate.getMonth();
        let year = purchaseDate.getFullYear();

        // 1. Passou da data de fechamento? Pula um mês.
        if (purchaseDate.getDate() >= creditCard.closingDay) {
          month++;
        }
        // 2. O vencimento vem numericamente antes do fechamento? (Ex: fecha 20, vence 05)
        // Então o pagamento é no mês seguinte. Pula mais um mês.
        if (creditCard.dueDay < creditCard.closingDay) {
          month++;
        }

        // 3. Adiciona os meses do parcelamento atual
        month += installmentIndex;

        // 4. Trata a virada de ano (ex: Dezembro -> Janeiro)
        while (month > 11) {
          month -= 12;
          year++;
        }

        const dueDate = new Date(year, month, creditCard.dueDay);
        // Trata meses que acabam dia 28/30
        if (dueDate.getDate() !== creditCard.dueDay) {
          dueDate.setDate(0); 
        }
        return dueDate;
      };

      const firstTransaction = await database.get<Transaction>('transactions').create((transaction) => {
        // @ts-ignore
        transaction._raw.account_id = creditCard.accountId || '';
        // @ts-ignore
        transaction._raw.category_id = data.categoryId;
        transaction.description = data.installments > 1 ? `${data.description} (1/${data.installments})` : data.description;
        transaction.amount = installmentAmount;
        transaction.type = 'expense';
        
        // As DUAS datas salvas corretamente
        transaction.date = getInstallmentDueDate(0); // A Competência / Fluxo de caixa
        transaction.purchaseDate = purchaseDate;     // A data que passou o cartão
        
        transaction.userId = data.userId;
        transaction.isConsolidated = false;
        transaction.isRecurring = false;
        // @ts-ignore
        transaction._raw.credit_card_id = data.creditCardId;
      });

      const firstTransactionId = firstTransaction.id;
      
      if (data.installments > 1) {
        const records = [];
        for (let i = 1; i < data.installments; i++) {
          const transactionCollection = database.get<Transaction>('transactions');
          const transactionRecord = transactionCollection.prepareCreate((transaction) => {
            // @ts-ignore
            transaction._raw.account_id = creditCard.accountId || '';
            // @ts-ignore
            transaction._raw.category_id = data.categoryId;
            transaction.description = `${data.description} (${i + 1}/${data.installments})`;
            transaction.amount = installmentAmount;
            transaction.type = 'expense';
            transaction.date = getInstallmentDueDate(i);
            transaction.purchaseDate = purchaseDate;
            transaction.userId = data.userId;
            transaction.isConsolidated = false;
            transaction.isRecurring = false;
            // @ts-ignore
            transaction._raw.credit_card_id = data.creditCardId;
            // @ts-ignore
            transaction._raw.related_transaction_id = firstTransactionId;
          });
          records.push(transactionRecord);
        }
        await database.batch(...records);
      }
      
      return {
        firstTransactionId,
        installmentAmount,
        totalAmount,
        installments: data.installments
      };
    });
  },

  // Atualizar compra no cartão de crédito (TAREFA 4)
  updateCreditCardPurchase: async (
    transactionId: string,
    mode: 'only_this' | 'all_pending',
    data: {
      amount: number;
      description: string;
      date: Date;
      creditCardId: string;
      categoryId: string;
      installments: number;
      interestRate: number;
      userId: string;
    }
  ) => {
    await database.write(async () => {
      if (data.installments < 1) throw new Error('O número de parcelas deve ser maior que zero');
      if (data.interestRate < 0) throw new Error('A taxa de juros não pode ser negativa');

      const transaction = await database.get<Transaction>('transactions').find(transactionId);
      
      // Verificar se a transação está consolidada
      if (transaction.isConsolidated) {
        throw new Error('Transações já pagas não podem ser alteradas');
      }

      // @ts-ignore - WatermelonDB usa esta sintaxe para relacionamentos
      const relatedTransactionId = transaction._raw?.related_transaction_id;
      
      if (mode === 'only_this') {
        // Cenário A: Atualizar apenas esta transação
        const creditCard = await database.get<CreditCard>('credit_cards').find(data.creditCardId);
        
        // Recalcular datas se necessário
        const purchaseDate = new Date(data.date);
        const getInstallmentDueDate = (installmentIndex: number) => {
          let month = purchaseDate.getMonth();
          let year = purchaseDate.getFullYear();

          if (purchaseDate.getDate() >= creditCard.closingDay) {
            month++;
          }
          if (creditCard.dueDay < creditCard.closingDay) {
            month++;
          }

          month += installmentIndex;

          while (month > 11) {
            month -= 12;
            year++;
          }

          const dueDate = new Date(year, month, creditCard.dueDay);
          if (dueDate.getDate() !== creditCard.dueDay) {
            dueDate.setDate(0); 
          }
          return dueDate;
        };

        // Determinar índice da parcela atual
        let installmentIndex = 0;
        if (relatedTransactionId) {
          // Buscar transação original para determinar o índice
          const originalTransaction = await database.get<Transaction>('transactions').find(relatedTransactionId);
          const allRelatedTransactions = await database.get<Transaction>('transactions')
            .query(
              Q.or(
                Q.where('id', relatedTransactionId),
                Q.where('related_transaction_id', relatedTransactionId)
              ),
              Q.sortBy('date', Q.asc)
            )
            .fetch();
          
          installmentIndex = allRelatedTransactions.findIndex(t => t.id === transactionId);
        }

        await transaction.update((tx) => {
          // @ts-ignore
          tx._raw.account_id = creditCard.accountId || '';
          // @ts-ignore
          tx._raw.category_id = data.categoryId;
          tx.description = data.installments > 1 ? `${data.description} (${installmentIndex + 1}/${data.installments})` : data.description;
          tx.amount = data.amount;
          tx.type = 'expense';
          tx.date = getInstallmentDueDate(installmentIndex);
          tx.purchaseDate = purchaseDate;
          // @ts-ignore
          tx._raw.credit_card_id = data.creditCardId;
        });
      } else {
        // Cenário B: Atualizar todas as parcelas pendentes
        let targetTransactionId = transactionId;
        
        // Se esta transação tem related_transaction_id, usar o ID original
        if (relatedTransactionId) {
          targetTransactionId = relatedTransactionId;
        }
        
        // Buscar todas as transações relacionadas que NÃO estão consolidadas
        const allRelatedTransactions = await database.get<Transaction>('transactions')
          .query(
            Q.or(
              Q.where('id', targetTransactionId),
              Q.where('related_transaction_id', targetTransactionId)
            ),
            Q.where('is_consolidated', false)
          )
          .fetch();
        
        if (allRelatedTransactions.length === 0) {
          throw new Error('Nenhuma parcela pendente encontrada para atualização');
        }

        const creditCard = await database.get<CreditCard>('credit_cards').find(data.creditCardId);
        const purchaseDate = new Date(data.date);
        
        // Recalcular valor da parcela
        let installmentAmount = data.amount;
        if (data.installments > 1) {
          if (data.interestRate > 0) {
            const i = data.interestRate / 100;
            const n = data.installments;
            const pv = data.amount;
            const pmt = pv * i / (1 - Math.pow(1 + i, -n));
            installmentAmount = parseFloat(pmt.toFixed(2));
          } else {
            installmentAmount = parseFloat((data.amount / data.installments).toFixed(2));
          }
        }

        const getInstallmentDueDate = (installmentIndex: number) => {
          let month = purchaseDate.getMonth();
          let year = purchaseDate.getFullYear();

          if (purchaseDate.getDate() >= creditCard.closingDay) {
            month++;
          }
          if (creditCard.dueDay < creditCard.closingDay) {
            month++;
          }

          month += installmentIndex;

          while (month > 11) {
            month -= 12;
            year++;
          }

          const dueDate = new Date(year, month, creditCard.dueDay);
          if (dueDate.getDate() !== creditCard.dueDay) {
            dueDate.setDate(0); 
          }
          return dueDate;
        };

        // Preparar atualizações em batch
        const updates = allRelatedTransactions.map((tx, index) => 
          tx.prepareUpdate((record) => {
            // @ts-ignore
            record._raw.account_id = creditCard.accountId || '';
            // @ts-ignore
            record._raw.category_id = data.categoryId;
            record.description = data.installments > 1 ? `${data.description} (${index + 1}/${data.installments})` : data.description;
            record.amount = installmentAmount;
            record.type = 'expense';
            record.date = getInstallmentDueDate(index);
            record.purchaseDate = purchaseDate;
            // @ts-ignore
            record._raw.credit_card_id = data.creditCardId;
          })
        );
        
        await database.batch(...updates);
      }
    });
  },

  // Excluir compra no cartão de crédito (TAREFA 3)
  deleteCreditCardPurchase: async (
    transactionId: string,
    deleteType: 'only_this' | 'all_pending'
  ) => {
    await database.write(async () => {
      const transaction = await database.get<Transaction>('transactions').find(transactionId);
      
      // Verificar se a transação está consolidada
      if (transaction.isConsolidated) {
        throw new Error('Transações já pagas não podem ser excluídas');
      }

      // @ts-ignore - WatermelonDB usa esta sintaxe para relacionamentos
      const relatedTransactionId = transaction._raw?.related_transaction_id;
      
      if (deleteType === 'only_this') {
        // Cenário A: Excluir apenas esta transação
        await transaction.markAsDeleted();
      } else {
        // Cenário B: Excluir todas as parcelas pendentes
        let targetTransactionId = transactionId;
        
        // Se esta transação tem related_transaction_id, usar o ID original
        if (relatedTransactionId) {
          targetTransactionId = relatedTransactionId;
        }
        
        // Buscar todas as transações relacionadas que NÃO estão consolidadas
        const allRelatedTransactions = await database.get<Transaction>('transactions')
          .query(
            Q.or(
              Q.where('id', targetTransactionId),
              Q.where('related_transaction_id', targetTransactionId)
            ),
            Q.where('is_consolidated', false)
          )
          .fetch();
        
        if (allRelatedTransactions.length === 0) {
          throw new Error('Nenhuma parcela pendente encontrada para exclusão');
        }

        // Preparar exclusões em batch
        const deletions = allRelatedTransactions.map(tx => tx.prepareMarkAsDeleted());
        
        await database.batch(...deletions);
      }
    });
  }
}