import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

export default class CreditCard extends Model {
    static table = 'credit_cards';

    @text('user_id') userId!: string;
    @text('account_id') accountId!: string | null;
    @text('name') name!: string;
    @text('brand') brand!: string;
    @field('closing_day') closingDay!: number;
    @field('due_day') dueDay!: number;
    @field('limit') limit!: number;
    @text('color') color!: string;
    @field('auto_debit') autoDebit!: boolean;
    @date('deleted_at') deletedAt!: number | null;
    
    @readonly @date('created_at') createdAt!: Date;
    @readonly @date('updated_at') updatedAt!: Date;
}
