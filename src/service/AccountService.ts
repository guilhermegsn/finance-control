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

  // Soft Delete
  delete: async (accountId: string) => {
    await database.write(async () => {
      const account = await database.get<Account>('accounts').find(accountId);

      // markAsDeleted() não apaga do banco local agora. 
      // Ele apenas esconde o registro das queries e o coloca na "fila de sincronização".
      await account.markAsDeleted();
    });

    console.log('Conta marcada para exclusão. Execute o Sync para atualizar o servidor.');
  }
};