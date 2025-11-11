type TransactionType = 'income' | 'expense' | 'credit';
type Recurrence = 'unique' | 'monthly' | 'annual';

export interface ITransaction {
    _id: Realm.BSON.ObjectId;
    description: string;
    type: TransactionType;
    cardName: string;
    value: number;
    category: string;
    recurrence: Recurrence;
    date?: Date;
    start?: Date;
    end?: Date | null;
}