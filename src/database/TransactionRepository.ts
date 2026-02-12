import { realm } from "./realm";
import { Transaction } from "../interface/Transaction";
import { RecurringTransaction } from "../interface/RecurringTransaction";
import { Credit } from "../interface/Credit";
import { Override } from "../interface/Override";
import { Balance } from "../interface/Balance";

// Tipos auxiliares
type BalanceOperation = 'create' | 'update' | 'delete';

export const TransactionRepository = {

  // ===========================================================================
  // 1. CÁLCULO DE SALDO ACUMULADO (Lógica Original Mantida)
  // ===========================================================================
  getAccumulatedBalance: (targetYear: number, targetMonth: number) => { // targetMonth: 1-based (Jan=1)
    
    // 1. Somar Balances já salvos (snapshots)
    const balances = realm.objects('Balance')
    let total = 0;

    balances
      .filtered('year < $0 OR (year == $0 AND month < $1)', targetYear, targetMonth)
      .forEach((b: any) => (total += b.partialBalance));

    // 2. Somar transações recorrentes passadas (projeção)
    const recurring = realm.objects<RecurringTransaction>('RecurringTransaction');
    
    // Representação linear do limite (mês ANTES do target)
    const targetLimitYM = targetYear * 12 + (targetMonth - 1);

    // Cache de Overrides para performance (evita query dentro do loop for)
    const allOverrides = realm.objects<Override>('Override');

    recurring.forEach((rt) => {
      const start = rt.startDate;
      const startYM = start.getUTCFullYear() * 12 + start.getUTCMonth();

      // se a recorrência começa depois do limite, pula
      if (startYM > targetLimitYM) return;

      const end = rt.endDate ? rt.endDate : null;
      const endYM = end ? end.getUTCFullYear() * 12 + end.getUTCMonth() : Infinity;

      // itera de startYM até o mês anterior ao target (inclusive)
      const upper = Math.min(targetLimitYM, endYM);

      for (let ym = startYM; ym <= upper; ym++) {
        const y = Math.floor((ym - 1) / 12);
        const m1 = ym - y * 12; // 1 a 12
        const m0 = m1 - 1;      // 0 a 11

        // Otimização: Filtro em memória é mais rápido que query no Realm dentro de loop
        const override = allOverrides.filtered('parentId == $0 AND month == $1 AND year == $2', rt._id, m1, y)[0];

        if (override) {
          if (override.type === 'income') total += override.value;
          else total -= override.value;
          continue; 
        }

        if (TransactionRepository.occursInMonth(rt, m0, y)) {
          if (rt.type === 'income') total += rt.value;
          else if (rt.type === 'expense' || rt.type === 'credit') total -= rt.value;
        }
      }
    });

    return total;
  },

  // ===========================================================================
  // 2. AUXILIARES DE RECORRÊNCIA E CRÉDITO
  // ===========================================================================
  
  occursInMonth: (rec: RecurringTransaction, month: number, year: number): boolean => {
    const startYM = rec.startDate.getUTCFullYear() * 12 + rec.startDate.getUTCMonth();
    const endYM = rec.endDate
      ? rec.endDate.getUTCFullYear() * 12 + rec.endDate.getUTCMonth()
      : Infinity;

    const currentYM = year * 12 + month;
    return currentYM >= startYM && currentYM <= endYM;
  },

  isParentInvalidForMonth: (
    rec: RecurringTransaction,
    month: number,
    year: number,
    allRecurrents: Map<string, RecurringTransaction> // Otimização: Passar Map
  ): boolean => {
    // Verifica se algum item na lista completa tem este rec._id como parentId
    let hasChild = false;
    for (let r of allRecurrents.values()) {
        if (r.parentId === rec._id) {
            hasChild = true;
            break;
        }
    }

    if (!hasChild) return false;
    if (!rec.endDate) return false;

    const currentYM = year * 12 + month;
    const endYM = rec.endDate.getUTCFullYear() * 12 + rec.endDate.getUTCMonth();

    return currentYM > endYM;
  },

  getCreditInvoiceForMonth: (year: number, month: number) => {
    let m0 = month - 1;
    let y = year;

    if (m0 < 0) {
      m0 = 11;
      y--;
    }

    const start = new Date(Date.UTC(y, m0, 1));
    const end = new Date(Date.UTC(y, m0 + 1, 1));
    let total = 0;

    realm.objects<Credit>('Credit').forEach((c) => {
      const installmentValue = c.value / c.installments;
      // Pequena otimização matemática para evitar loop de datas se não for necessário
      // Mas mantendo a lógica original para segurança:
      for (let i = 0; i < c.installments; i++) {
        const due = new Date(Date.UTC(c.date.getUTCFullYear(), c.date.getUTCMonth() + i, 1));
        if (due >= start && due < end) {
          total += installmentValue;
        }
      }
    });

    return total;
  },

  getCreditsByMonth: (month: number, year: number) => {
    const credits = realm.objects<Credit>('Credit');
    
    // Filtragem e map
    const results: any[] = [];
    credits.forEach((c) => {
        const start = c.date;
        const startMonth = start.getUTCMonth();
        const startYear = start.getUTCFullYear();
        const diff = (year - startYear) * 12 + (month - startMonth);

        if (diff >= 0 && diff < c.installments) {
            const parcelNumber = diff + 1;
            const parcelValue = c.value / c.installments;
            
            results.push({
                _id: c._id,
                date: new Date(Date.UTC(year, month, c.date.getUTCDate())),
                description: `${c.description} ${c.installments > 1 ? `(${parcelNumber}/${c.installments})` : ''}`,
                type: 'credit',
                value: parcelValue,
                installment: parcelNumber,
                installments: c.installments
            });
        }
    });
    return results;
  },

  // ===========================================================================
  // 3. BUSCA PRINCIPAL (View Model)
  // ===========================================================================
  getTransactionsByMonth: (month: number, year: number) => {
    try {
      const start = new Date(Date.UTC(year, month, 1));
      const end = new Date(Date.UTC(year, month + 1, 1));

      // 1. Normal
      const normal = realm.objects<Transaction>('Transaction')
        .filtered('date >= $0 AND date < $1', start, end)
        .slice(); // slice converte para array JS puro

      // 2. Recorrentes
      const recurrents = realm.objects<RecurringTransaction>('RecurringTransaction')
        .filtered('startDate < $0 AND (endDate == null OR endDate >= $1)', end, start);

      const recurrentsById = new Map<string, RecurringTransaction>(
        recurrents.map((r) => [r._id, r])
      );

      // 3. Overrides
      const overrides = realm.objects<Override>('Override')
        .filtered('year == $0 AND month == $1', year, month + 1)
        .slice();

      const overrideTransactions = overrides.map((o) => ({
        _id: o._id,
        parentId: o.parentId,
        date: o.date,
        description: o.description,
        value: o.value,
        type: o.type,
      }));

      const overriddenParentIds = new Set(overrides.map((o) => o.parentId));

      // 4. Processar recorrências válidas
      const recurringTx = recurrents
        .filter((rec) => TransactionRepository.occursInMonth(rec, month, year))
        .filter((rec) => !TransactionRepository.isParentInvalidForMonth(rec, month, year, recurrentsById))
        .filter((rec) => !overriddenParentIds.has(rec._id))
        .map((rec) => {
             // Generate Instance Logic
             const baseDate = rec.startDate ?? rec.date;
             const day = Math.min(baseDate.getDate(), new Date(year, month + 1, 0).getDate());
             const date = new Date(year, month, day);

             return {
                _id: rec._id,
                description: rec.description,
                value: rec.value,
                type: rec.type,
                date,
                end: rec.endDate,
                isRecurrence: true,
                parentId: rec.parentId,
                // Passamos o objeto original para facilitar edição depois
                originalObj: rec 
             }
        });

      // 5. Créditos
      const credits = TransactionRepository.getCreditsByMonth(month, year);

      // 6. Saldo Acumulado
      const totalAccumulated = TransactionRepository.getAccumulatedBalance(year, month + 1);

      // 7. Fatura
      const invoiceValue = TransactionRepository.getCreditInvoiceForMonth(year, month);
      const invoiceLine = invoiceValue > 0
          ? {
            _id: `invoiceCredit`,
            date: new Date(Date.UTC(year, month, 1)),
            description: 'Fatura - C. Crédito',
            type: 'expense',
            value: invoiceValue,
          } : null;

      const accumulatedBalance = {
        _id: 'accumulatedBalance',
        date: new Date(year, month, 1),
        description: "Saldo acumulado",
        type: "income",
        value: totalAccumulated
      };

      return [
        invoiceLine,
        totalAccumulated > 0 && accumulatedBalance,
        ...credits,
        ...normal,
        ...overrideTransactions,
        ...recurringTx,
      ].filter(Boolean);

    } catch (e) {
      console.error(e);
      return [];
    }
  },

  // ===========================================================================
  // 4. ATUALIZAÇÃO DE SALDO (Persistência)
  // ===========================================================================
  updateBalanceAfterTransaction: (
    transaction: Transaction,
    previousTransaction?: Transaction,
    operation: BalanceOperation = 'create'
  ) => {
    if (!transaction.date) return;

    // Garante que pegamos o mês UTC correto
    const tDate = transaction.date;
    const monthVal = tDate.getUTCMonth() + 1;
    const yearVal = tDate.getUTCFullYear();
    const monthKey = `${yearVal}-${String(monthVal).padStart(2, '0')}`;

    realm.write(() => {
      let balance = realm.objectForPrimaryKey<Balance>('Balance', monthKey);

      if (!balance) {
        balance = realm.create<Balance>('Balance', {
          id: monthKey,
          month: monthVal,
          year: yearVal,
          income: 0,
          expense: 0,
          credit: 0,
          partialBalance: 0,
        });
      }

      // Função helper interna para aplicar valores
      const apply = (tx: Transaction, multiplier: number) => {
          if (tx.type === 'income') balance!.income += tx.value * multiplier;
          if (tx.type === 'expense') balance!.expense += tx.value * multiplier;
          if (tx.type === 'credit') balance!.credit += tx.value * multiplier;
      };

      if (operation === 'delete') {
          apply(transaction, -1);
      }
      else if (operation === 'update' && previousTransaction) {
          apply(previousTransaction, -1); // Remove anterior
          apply(transaction, 1);          // Adiciona novo
      }
      else if (operation === 'create') {
          apply(transaction, 1);
      }

      balance.partialBalance = balance.income - balance.expense - balance.credit;
    });
  }
};