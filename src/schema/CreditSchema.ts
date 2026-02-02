import { ObjectSchema } from "realm";

export const CreditSchema: ObjectSchema = {
    name: 'Credit',
    primaryKey: '_id',
    properties: {
        _id: 'string',
        description: 'string',
        value: 'double',
        installments: 'int',
        date: 'date'
    },
}
