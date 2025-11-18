export type Type = 'income' | 'expense' | 'credit'
export type Recurrence = 'monthly' | 'weekly' | 'yearly' | 'installments'

export interface RecurringTransaction {
    _id: Realm.BSON.ObjectId;
    type: Type;
    description: string;
    amount: number;
    startDate: Date;
    recurrence: Recurrence;
    installments: number | null; // só se recurrence = 'installments'
    category: string;
    endDate: Date | null; // null -> recorrência infinita
}
