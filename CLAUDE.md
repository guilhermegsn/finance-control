# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run the app (Expo dev server)
npm start              # or: expo start
npm run android        # run on Android emulator/device
npm run ios            # run on iOS simulator/device

# Type checking
npm run type-check     # tsc --noEmit
```

There are no automated tests in this project. Verification is done by running the app.

## Architecture Overview

**ButterFlow** is an offline-first personal finance app built with React Native + Expo.

### Data Layer: Offline-first with WatermelonDB + Supabase

- **WatermelonDB** (SQLite) is the local database — all reads/writes go here first.
- **Supabase** is the remote backend — used only for auth and sync (not for direct queries).
- Sync runs automatically when the app returns to foreground (`AppState → active`) via `useAutoSync`.
- Manual sync available via `forceSync()` from `useAutoSync`.
- All entities use **soft deletes** (`deleted_at` Unix timestamp). Never use hard deletes.
- All timestamps in WatermelonDB are stored as **Unix milliseconds** (numbers), not ISO strings.

### Sync flow (`src/service/sync.ts`)

Tables are synced in dependency order: `accounts → categories → credit_cards → transactions`. The pull phase uses `updated_at > lastPulledAt` (numeric) filtered by `user_id`. The push phase sends created/updated/deleted records, always setting `updated_at = Date.now()`.

### WatermelonDB patterns

- All mutations must be inside `database.write(async () => { ... })`.
- For multiple records, use `prepareCreate`/`prepareUpdate`/`prepareMarkAsDeleted` + `database.batch(...)`.
- Relationship fields and optional schema fields not defined on the Model class must be set via `transaction._raw.field_name` with a `// @ts-ignore` comment — this is intentional and consistent throughout the codebase.
- The schema version is in `src/database/schema.ts` (`version: 21`). Increment it when adding/removing columns; without migrations configured, schema changes require reinstalling the app in dev.

### Authentication (`src/contexts/AuthContext.tsx`)

Google Sign-In → Supabase `signInWithIdToken`. The `useAuth()` hook exposes `user`, `session`, `loading`, `signInWithGoogle`, `signOut`. Session is persisted via AsyncStorage. On login, `CategoryService.initializeDefaults(userId)` seeds system categories.

### Navigation (`src/navigation/`)

- `AppNavigator` (Stack) wraps `BottomNavigator` (Bottom Tabs) and all modal/form screens.
- Bottom tabs: Home, MonthlyControl, TransactionForm (fab), Accounts, Menu.
- Stack screens: Accounts, Categories, TransactionForm, TransferForm, CreditCardList, CreditCardForm, CreditCardPurchase.

### Credit Card Invoice Logic (`src/utils/creditCardInvoiceHelper.ts`)

Brazilian credit cards have two date rules that must be kept distinct:

- **RULE 1 (CreditCardSection accordion)**: Group by invoice month using `purchaseDate` + `closingDay`. If `dueDay < closingDay`, the invoice belongs to the month prior to the due date.
- **RULE 2 (AccountsTable cash flow)**: Group by the transaction's `date` field (the due date of the installment).

When creating a credit card purchase (`TransactionService.createCreditCardPurchase`), the `date` field of each installment is calculated using `closingDay` and `dueDay` of the card — see the `getInstallmentDueDate` helper inside that method.

### Service Layer (`src/service/`)

All database operations go through service objects:

| Service | Responsibility |
|---|---|
| `TransactionService` | CRUD + recurring + credit card purchases + transfers + invoice payment |
| `AccountService` | Account CRUD |
| `CategoryService` | Category CRUD + system defaults initialization |
| `CreditCardService` | Credit card CRUD |
| `DashboardService` | Aggregated balance and spending calculations |
| `BankService` | Bank metadata lookup |

### Theme (`src/contexts/ThemeContext.tsx`)

Use `useTheme()` to access `theme` (color object), `isDarkMode`, and `toggleDarkMode`. Color palette is defined in `ThemeContext` and follows light/dark variants. Persisted in AsyncStorage. Always use `theme.*` colors instead of hardcoded hex values.

### Environment Variables

Required in `.env` (Expo public):
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
