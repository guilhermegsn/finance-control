import { ObjectSchema } from "realm";

export const BalanceSchema: ObjectSchema = {
  name: 'Balance',
  primaryKey: 'id',
  properties: {
    id: 'string',
    year: { type: 'int', indexed: true },
    month: { type: 'int', indexed: true },
    income: 'double',
    expense: 'double',
    credit: 'double',
    partialBalance: 'double',
  }
};
