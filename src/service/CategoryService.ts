import { Q } from '@nozbe/watermelondb';
import { database } from '../database';
import Category from '../models/Caterogy';

export const CategoryService = {
  observeCategories: (userId: string) => {
    return database.get<Category>('categories')
      .query(Q.where('user_id', userId))
      .observe();
  },

  fetchAll: async (userId: string) => {
    return await database.get<Category>('categories')
      .query(Q.where('user_id', userId))
      .fetch();
  },

  // Buscar categoria por ID
  findById: async (categoryId: string) => {
    return await database.get<Category>('categories').find(categoryId);
  },

  // Criar nova categoria
  create: async (data: {
    name: string;
    icon: string;
    color: string;
    type: 'income' | 'expense';
    userId: string;
    isSystem?: boolean;
  }) => {
    await database.write(async () => {
      await database.get<Category>('categories').create((category) => {
        category.name = data.name;
        category.icon = data.icon;
        category.color = data.color;
        category.type = data.type;
        category.userId = data.userId;
        category.isSystem = data.isSystem || false;
      });
    });
  },

  // Atualizar categoria existente
  update: async (categoryId: string, data: {
    name?: string;
    icon?: string;
    color?: string;
    type?: 'income' | 'expense';
    isSystem?: boolean;
  }) => {
    await database.write(async () => {
      const category = await database.get<Category>('categories').find(categoryId);

      await category.update((cat) => {
        if (data.name !== undefined) cat.name = data.name;
        if (data.icon !== undefined) cat.icon = data.icon;
        if (data.color !== undefined) cat.color = data.color;
        if (data.type !== undefined) cat.type = data.type;
        if (data.isSystem !== undefined) cat.isSystem = data.isSystem;
      });
    });
  },

  // Soft Delete
  delete: async (categoryId: string) => {
    await database.write(async () => {
      const category = await database.get<Category>('categories').find(categoryId);
      await category.markAsDeleted();
    });

    console.log('Categoria marcada para exclusão. Execute o Sync para atualizar o servidor.');
  },

  initializeDefaults: async (userId: string) => {
    const count = await database.get<Category>('categories')
      .query(Q.where('user_id', userId))
      .fetchCount();
    if (count === 0) {
      await database.write(async () => {
        const batch = [
          database.get<Category>('categories').prepareCreate((category) => {
            category.name = 'Alimentação';
            category.icon = 'food';
            category.color = '#FF6347';
            category.type = 'expense';
            category.userId = userId;
            category.isSystem = true;
          }),
          database.get<Category>('categories').prepareCreate((category) => {
            category.name = 'Transporte';
            category.icon = 'car';
            category.color = '#4682B4';
            category.type = 'expense';
            category.userId = userId;
            category.isSystem = true;
          }),
          database.get<Category>('categories').prepareCreate((category) => {
            category.name = 'Moradia';
            category.icon = 'home';
            category.color = '#32CD32';
            category.type = 'expense';
            category.userId = userId;
            category.isSystem = true;
          }),
          database.get<Category>('categories').prepareCreate((category) => {
            category.name = 'Lazer';
            category.icon = 'gamepad';
            category.color = '#FFD700';
            category.type = 'expense';
            category.userId = userId;
            category.isSystem = true;
          }),
          database.get<Category>('categories').prepareCreate((category) => {
            category.name = 'Saúde';
            category.icon = 'medical-bag';
            category.color = '#FF4500';
            category.type = 'expense';
            category.userId = userId;
            category.isSystem = true;
          }),
          database.get<Category>('categories').prepareCreate((category) => {
            category.name = 'Salário';
            category.icon = 'cash';
            category.color = '#228B22';
            category.type = 'income';
            category.userId = userId;
            category.isSystem = true;
          }),
          database.get<Category>('categories').prepareCreate((category) => {
            category.name = 'Investimentos';
            category.icon = 'chart-line';
            category.color = '#1E90FF';
            category.type = 'income';
            category.userId = userId;
            category.isSystem = true;
          }),
        ];
        await database.batch(batch);
      });
    }
  }
};
