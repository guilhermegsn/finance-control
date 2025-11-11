import Realm from 'realm';
import { TransactionSchema } from '../schema/TransactionSchema';


export const realm = new Realm({
  schema: [TransactionSchema],
  schemaVersion: 1,
});
