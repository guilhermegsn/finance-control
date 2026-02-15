import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { mySchema } from './schema';
import Account from '../models/Accounts';
import Category from '../models/Caterogy';
import Transaction from '../models/Transactions';
// import CreditCard from './models/CreditCard'; // Quando criar

const adapter = new SQLiteAdapter({
  schema: mySchema,
  // (Opcional) dbName: 'myappdb',
  // (Opcional) migrations, // Vamos ver depois
  jsi: true, /* Ativa o modo mais rápido no Android/iOS (JSI) */
  onSetUpError: error => {
    console.error('Database failed to load:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [
    Account,
    Category,
    Transaction,
    // CreditCard,
  ],
});