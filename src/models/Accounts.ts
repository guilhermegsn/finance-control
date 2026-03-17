import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators';

export default class Account extends Model {
  static table = 'accounts';

  @text('user_id') userId!: string;
  @text('name') name!: string;
  @text('type') type!: string;
  @text('color') color!: string;
  @field('archived') archived!: boolean;
  @text('logo_url') logoUrl!: string;
  @text('bank_code') bankCode!: string;
  
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
