import { ObjectSchema } from 'realm';

export type TransactionType = 'income' | 'expense' | 'credit';
export type Recurrence = 'unique' | 'monthly' | 'annual';

export const TransactionSchema: ObjectSchema = {
    name: 'Transaction',
    primaryKey: '_id',
    properties: {
      _id: 'string',
      description: 'string',
      type: 'string',
      cardName: 'string?',
      value: 'double',
      recurrence: 'string?',
      date: 'date?',
      start: 'date?',
      end: 'date?',
    },
}
