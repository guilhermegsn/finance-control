import * as Crypto from 'expo-crypto';
import { setGenerator } from '@nozbe/watermelondb/utils/common/randomId';
setGenerator(() => Crypto.randomUUID());
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { mySchema } from './schema';
import Account from '../models/Accounts';
import Category from '../models/Caterogy';
import Transaction from '../models/Transactions';
import CreditCard from '../models/CreditCard';

// Migração da versão 1 para 2: adicionar colunas recurring_id e is_recurring na tabela transactions
const adapter = new SQLiteAdapter({
  schema: mySchema,
  // Para desenvolvimento, podemos desinstalar e reinstalar o app para recriar o banco
  // ou usar uma abordagem mais simples
  jsi: true,
  onSetUpError: error => console.error('Database failed to load:', error),
});

export const database = new Database({
  adapter,
  modelClasses: [Account, Category, Transaction, CreditCard],
});
