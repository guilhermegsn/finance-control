import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const mySchema = appSchema({
  version: 7,
  tables: [
    // 1. ACCOUNTS
    tableSchema({
      name: 'accounts',
      columns: [
        { name: 'user_id', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'type', type: 'string' },
        { name: 'color', type: 'string' },
        { name: 'archived', type: 'boolean' },
        { name: 'logo_url', type: 'string', isOptional: true },
        { name: 'bank_code', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' }, // Timestamps no SQLite são números (Unix)
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number' },
      ],
    }),
    // 2. CATEGORIES
    tableSchema({
      name: 'categories',
      columns: [
        { name: 'user_id', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'icon', type: 'string' },
        { name: 'color', type: 'string' },
        { name: 'type', type: 'string' }, // income, expense
        { name: 'is_system', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number' },
      ],
    }),
    // 3. TRANSACTIONS
    tableSchema({
      name: 'transactions',
      columns: [
        { name: 'user_id', type: 'string' },
        { name: 'account_id', type: 'string', isIndexed: true },
        { name: 'category_id', type: 'string', isIndexed: true },
        { name: 'credit_card_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'related_transaction_id', type: 'string', isOptional: true },
        { name: 'description', type: 'string' },
        { name: 'amount', type: 'number' },
        { name: 'type', type: 'string' },
        { name: 'date', type: 'number' }, // Data da competência
        { name: 'is_consolidated', type: 'boolean' },
        { name: 'consolidated_at', type: 'number', isOptional: true },
        { name: 'observation', type: 'string', isOptional: true },
        { name: 'recurring_id', type: 'string', isOptional: true },
        { name: 'is_recurring', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number' },
      ],
    }),
    // 4. CREDIT CARDS
    tableSchema({
      name: 'credit_cards',
      columns: [
        { name: 'user_id', type: 'string' },
        { name: 'account_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'name', type: 'string' },
        { name: 'closing_day', type: 'number' },
        { name: 'due_day', type: 'number' },
        { name: 'limit', type: 'number' },
        { name: 'color', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number' },
      ],
    }),
    // As tabelas de Credit Purchases e Installments fazemos depois para não complicar agora
  ],
});