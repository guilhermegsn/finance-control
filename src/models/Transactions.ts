import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text, relation } from '@nozbe/watermelondb/decorators';
import Account from './Accounts';
import Category from './Caterogy';
import CreditCard from './CreditCard';

export default class Transaction extends Model {
  static table = 'transactions';

  // Relacionamentos
  @relation('accounts', 'account_id') account!: Account;
  @relation('categories', 'category_id') category!: Category;
  @relation('credit_cards', 'credit_card_id') creditCard?: CreditCard;

  @text('user_id') userId!: string;
  @text('description') description!: string;
  @field('amount') amount!: number;
  @text('type') type!: 'income' | 'expense';
  @date('date') date!: Date;
  @field('is_consolidated') isConsolidated!: boolean;
  @date('consolidated_at') consolidatedAt?: Date;
  @text('observation') observation?: string;
  @text('recurring_id') recurringId?: string;
  @field('is_recurring') isRecurring!: boolean;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // Getter para status de consolidação híbrido
  get isEffectivelyConsolidated(): boolean {
    // Se já está consolidada no banco, retorna true
    if (this.isConsolidated) {
      return true;
    }

    // Se tem cartão de crédito vinculado e o cartão tem débito automático
    // e a data atual é maior ou igual à data de vencimento da transação
    if (this.creditCard && this.creditCard.autoDebit) {
      const today = new Date();
      const transactionDate = new Date(this.date);
      
      // Comparar apenas data (ignorar hora)
      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const transactionDateOnly = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), transactionDate.getDate());
      
      if (todayDate >= transactionDateOnly) {
        return true;
      }
    }

    return false;
  }
}
