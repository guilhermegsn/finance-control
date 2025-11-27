import Realm from 'realm';
import { TransactionSchema } from '../schema/TransactionSchema';
import { RecurringTransactionSchema } from '../schema/RecurringTransactionSchema';
import { BalanceSchema } from '../schema/BalanceSchema';
import { OverrideSchema } from '../schema/OverrideSchema';

// ⚠️ Apenas durante o desenvolvimento
Realm.deleteFile({ path: Realm.defaultPath });

export const realm = new Realm({
  schema: [TransactionSchema, RecurringTransactionSchema, BalanceSchema, OverrideSchema],
  schemaVersion: 1,
});
