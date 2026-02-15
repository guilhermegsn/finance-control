import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text, relation } from '@nozbe/watermelondb/decorators';
import Account from './Accounts';
import Category from './Caterogy';

export default class Transaction extends Model {
  static table = 'transactions';

  // Relacionamentos
  @relation('accounts', 'account_id') account!: Account;
  @relation('categories', 'category_id') category!: Category;

  @text('user_id') userId!: string;
  @text('description') description!: string;
  @field('amount') amount!: number;
  @text('type') type!: 'income' | 'expense';
  @date('date') date!: Date;
  @field('is_consolidated') isConsolidated!: boolean;
  @date('consolidated_at') consolidatedAt?: Date;
  @text('observation') observation?: string;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}