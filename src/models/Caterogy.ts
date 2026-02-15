import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators';

export default class Category extends Model {
  static table = 'categories';

  @text('user_id') userId!: string;
  @text('name') name!: string;
  @text('icon') icon!: string;
  @text('color') color!: string;
  @text('type') type!: 'income' | 'expense';
  @field('is_system') isSystem!: boolean;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}