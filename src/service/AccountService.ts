import { database } from '../database';
import Account from '../models/Accounts';
import { Q } from '@nozbe/watermelondb';

export const accountService = {
  // Criar uma nova conta
  create: async ({ name, initialBalance, type, color, userId }: { 
    name: string; 
    initialBalance: number; 
    type: 'checking' | 'cash' | 'investment';
    color: string;
    userId: string;
  }) => {
    await database.write(async () => {
      await database.get<Account>('accounts').create(account => {
        account.name = name;
        account.initialBalance = initialBalance;
        account.type = type;
        account.color = color;
        account.userId = userId;
        account.archived = false;
      });
    });
  },

  // Observar todas as contas (Reativo!)
  observeAccounts: () => {
    return database.get<Account>('accounts').query().observe();
  },
  
  // Apagar (Soft delete no futuro, hard delete por agora para testar)
  delete: async (accountId: string) => {
    await database.write(async () => {
      const account = await database.get<Account>('accounts').find(accountId);
      await account.destroyPermanently();
    });
  }
};