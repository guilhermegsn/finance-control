export type TransactionType = 'income' | 'expense' | 'credit';
export type Recurrence = 'unique' | 'monthly' | 'annual';

export interface Transaction {
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