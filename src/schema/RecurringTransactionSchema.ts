import { ObjectSchema } from 'realm';

export const RecurringTransactionSchema: ObjectSchema = {
  name: 'RecurringTransaction',
  primaryKey: '_id',
  properties: {
    _id: 'string',
    type:  'string',
    description: 'string',
    amount: 'double',
    startDate: 'date',
    recurrence: 'string',
    installments: 'int?',
    category: 'string?',
    endDate: 'date?',
    parentId: 'string?'
  },
};