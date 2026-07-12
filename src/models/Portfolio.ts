import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

export default class Portfolio extends Model {
    static table = 'portfolios';

    @text('user_id') userId!: string;
    @text('ticker') ticker!: string;
    @field('quantity') quantity!: number;
    @field('average_price') averagePrice!: number;
    @field('purchased_at') purchasedAt!: number | null;
    @date('deleted_at') deletedAt!: number | null;

    @readonly @date('created_at') createdAt!: Date;
    @readonly @date('updated_at') updatedAt!: Date;
}
