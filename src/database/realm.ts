import Realm from 'realm';
import { TransactionSchema } from '../schema/TransactionSchema';
import { RecurringTransactionSchema } from '../schema/RecurringTransactionSchema';
import { BalanceSchema } from '../schema/BalanceSchema';

// ⚠️ Apenas durante o desenvolvimento
Realm.deleteFile({ path: Realm.defaultPath });

export const realm = new Realm({
  schema: [TransactionSchema, RecurringTransactionSchema, BalanceSchema],
  schemaVersion: 1,
});
