import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators';

export default class Account extends Model {
  static table = 'accounts';

  @text('user_id') userId!: string;
  @text('name') name!: string;
  @field('initial_balance') initialBalance!: number;
  @text('type') type!: string;
  @text('color') color!: string;
  @field('archived') archived!: boolean;
  
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}