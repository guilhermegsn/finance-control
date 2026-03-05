import * as Crypto from 'expo-crypto';
import { setGenerator } from '@nozbe/watermelondb/utils/common/randomId';
setGenerator(() => Crypto.randomUUID());
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { mySchema } from './schema';
import Account from '../models/Accounts';
import Category from '../models/Caterogy';
import Transaction from '../models/Transactions';

const adapter = new SQLiteAdapter({
  schema: mySchema,
  jsi: true,
  onSetUpError: error => console.error('Database failed to load:', error),
});

export const database = new Database({
  adapter,
  modelClasses: [Account, Category, Transaction],
});