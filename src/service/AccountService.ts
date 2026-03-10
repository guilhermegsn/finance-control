import { database } from '../database';
import Account from '../models/Accounts';

export const AccountService = {
  // Listar todas as contas ativas (WatermelonDB já filtra as marcadas para deletar)
  observeAccounts: () => {
    return database.get<Account>('accounts').query().observe();
  },

  fetchAll: async () => {
    return await database.get<Account>('accounts').query().fetch();
  },

  // Buscar conta por ID
  findById: async (accountId: string) => {
    return await database.get<Account>('accounts').find(accountId);
  },

  // Criar nova conta
  create: async (data: { name: string; initialBalance: number; type: string; color: string; userId: string; }) => {
    await database.write(async () => {
      await database.get<Account>('accounts').create((account) => {
        account.name = data.name;
        account.initialBalance = data.initialBalance;
        account.type = data.type;
        account.color = data.color;
        account.archived = false;
        account.userId = data.userId;
      });
    });
  },

  // Atualizar conta existente
  update: async (accountId: string, data: { name?: string; initialBalance?: number; type?: string; color?: string; archived?: boolean; }) => {
    await database.write(async () => {
      const account = await database.get<Account>('accounts').find(accountId);
      
      await account.update((acc) => {
        if (data.name !== undefined) acc.name = data.name;
        if (data.initialBalance !== undefined) acc.initialBalance = data.initialBalance;
        if (data.type !== undefined) acc.type = data.type;
        if (data.color !== undefined) acc.color = data.color;
        if (data.archived !== undefined) acc.archived = data.archived;
      });
    });
  },

  // Soft Delete
  delete: async (accountId: string) => {
    await database.write(async () => {
      const account = await database.get<Account>('accounts').find(accountId);
      await account.markAsDeleted();
    });

    console.log('Conta marcada para exclusão. Execute o Sync para atualizar o servidor.');
  }
};
