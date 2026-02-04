import { realm } from "./realm";
import { Transaction } from "../interface/Transaction";
import { RecurringTransaction } from "../interface/RecurringTransaction";
import { Credit } from "../interface/Credit";
import { Override } from "../interface/Override";
import { Balance } from "../interface/Balance";
import { UpdateMode } from "realm";
import { generateRandomId } from "../service/function";

// Tipos auxiliares
type BalanceOperation = 'create' | 'update' | 'delete';

export const TransactionRepository = {

    // ===========================================================================
    // 1. CÁLCULO DE SALDO ACUMULADO (Lógica Original Mantida)
    // ===========================================================================

    // Em TransactionRepository.ts

    getAccumulatedBalance: (targetYear: number, targetMonth: number) => {
        let total = 0;
        const balances = realm.objects('Balance');
        const consolidatedMonths = new Set<string>();

        // 1. Soma os meses fechados
        balances
            .filtered('year < $0 OR (year == $0 AND month < $1)', targetYear, targetMonth)
            .forEach((b: any) => {
                total += b.partialBalance;
                consolidatedMonths.add(`${b.year}-${String(b.month).padStart(2, '0')}`);
            });

        // 2. Projeção de Recorrências (Passado não consolidado)
        const recurring = realm.objects<RecurringTransaction>('RecurringTransaction');
        const targetLimitYM = targetYear * 12 + (targetMonth - 1);
        const allOverrides = realm.objects<Override>('Override');

        recurring.forEach((rt) => {
            const start = rt.startDate;
            const startYM = start.getUTCFullYear() * 12 + start.getUTCMonth();

            if (startYM > targetLimitYM) return;

            const end = rt.endDate ? rt.endDate : null;
            const endYM = end ? end.getUTCFullYear() * 12 + end.getUTCMonth() : Infinity;
            const upper = Math.min(targetLimitYM, endYM);

            for (let ym = startYM; ym <= upper; ym++) {
                const y = Math.floor(ym / 12);
                const m0 = ym % 12;
                const m1 = m0 + 1;

                const monthKey = `${y}-${String(m1).padStart(2, '0')}`;
                if (consolidatedMonths.has(monthKey)) continue;

                const override = allOverrides.filtered('parentId == $0 AND month == $1 AND year == $2', rt._id, m1, y)[0];

                if (override) {
                    if (override.type === 'income') total += override.value;
                    else if (override.type === 'expense') total -= override.value;
                    // MUDANÇA 1: Se for override de 'credit', IGNORA (não subtrai do saldo)
                    continue;
                }

                if (TransactionRepository.occursInMonth(rt, m0, y)) {
                    if (rt.type === 'income') total += rt.value;
                    else if (rt.type === 'expense') total -= rt.value;
                    // MUDANÇA 2: Removemos a subtração do 'credit' aqui.
                    // Crédito não afeta saldo acumulado diretamente, só via fatura.
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
                    };
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
    },
    deleteTransaction: (transaction: any): { success: boolean, error?: string } => {
        try {
            realm.write(() => {
                // --- CASO 1: CRÉDITO ---
                if (transaction.type === 'credit') {
                    // O transaction._id na lista visual já é o ID da compra pai 'Credit'.
                    // Ao deletar o pai, todas as parcelas somem automaticamente da visualização dos meses.
                    const item = realm.objectForPrimaryKey('Credit', transaction._id);
                    if (item) realm.delete(item);
                }

                // --- CASO 2: RECORRÊNCIA ---
                else if (transaction.isRecurrence && transaction.originalObj) {
                    // Adicione sua regra de data aqui se quiser bloquear exclusão antiga
                    const item = realm.objectForPrimaryKey('RecurringTransaction', transaction.originalObj._id);
                    if (item) realm.delete(item);

                    // Limpa overrides orfãos
                    const overrides = realm.objects('Override').filtered('parentId == $0', transaction.originalObj._id);
                    realm.delete(overrides);
                }

                // --- CASO 3: TRANSAÇÃO COMUM / OVERRIDE ---
                else {
                    // Verifica qual tabela buscar baseada no schema ou lógica
                    const schema = transaction._schema === 'Override' ? 'Override' : 'Transaction';
                    const item = realm.objectForPrimaryKey(schema, transaction._id);
                    if (item) realm.delete(item);
                }
            });

            return { success: true };

        } catch (e) {
            console.error(e);
            return { success: false, error: "Erro ao excluir." };
        }
    },

    recalculateBalanceForMonth: (month: number, year: number) => {
        const txs = TransactionRepository.getTransactionsByMonth(month, year);

        let income = 0, expense = 0;
        // let credit = 0; // Não precisamos somar crédito para fins de subtração de saldo

        txs.forEach((t: any) => {
            if (t.isSystem) return; // Ignora a linha visual da fatura pra não duplicar lógica

            if (t.type === 'income') income += t.value;
            if (t.type === 'expense') expense += t.value;
            // if (t.type === 'credit') credit += t.value; // IGNORAR CRÉDITO NA SOMA
        });

        // CALCULA A FATURA DESTE MÊS (Pois ela é a verdadeira saída de dinheiro do crédito)
        const invoiceVal = TransactionRepository.getCreditInvoiceForMonth(year, month);

        const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

        realm.write(() => {
            realm.create('Balance', {
                id: monthKey,
                month: month + 1,
                year: year,
                income,
                expense,
                credit: 0, // Opcional: Se quiser guardar o valor gasto em crédito só para estatística, pode calcular a parte.

                // MUDANÇA CRUCIAL:
                // Saldo = Receitas - Despesas À Vista - Valor da Fatura
                partialBalance: income - expense - invoiceVal
            }, UpdateMode.Modified);
        });
    },

    invalidateFutureBalances: (currentMonth: number, currentYear: number) => {
        // Apaga qualquer Balance que seja DEPOIS do mês atual
        // Isso obriga o sistema a recalcular Março/Abril na hora que você entrar neles,
        // garantindo que peguem as alterações (ex: crédito excluído).
        const futureBalances = realm.objects('Balance').filtered(
            'year > $1 OR (year == $1 AND month > $0)',
            currentMonth + 1, // month no banco é 1-12
            currentYear
        );
        realm.write(() => {
            realm.delete(futureBalances);
        });
    },



    saveTransaction: (params: any, operation: string | null, currentMonth: number, currentYear: number) => {
        realm.write(() => {
            // 1. CRÉDITO
            if (params.type === 'credit') {
                const credit = {
                    _id: params.id || generateRandomId(),
                    description: params.description,
                    value: parseFloat(params.value),
                    installments: params.installments ? parseInt(params.installments) : 1,
                    date: params.date,
                };
                realm.create('Credit', credit, UpdateMode.Modified);
            }

            // 2. RECORRÊNCIA
            else if (params.isRecurrence) {
                // Se for "Editar apenas este mês" -> Cria Override
                if (operation === 'editOnlyMonth') {
                    realm.create('Override', {
                        _id: generateRandomId(),
                        parentId: params.id, // ID da recorrência original
                        year: currentYear,
                        month: currentMonth + 1, // Salva como 1-12
                        description: params.description,
                        value: parseFloat(params.value),
                        type: params.type,
                        date: params.date
                    });
                }
                // Se for "Adicionar" ou "Editar Sequência" -> Cria/Atualiza RecurringTransaction
                else {
                    const rec = {
                        _id: (operation === 'add' || !params.id) ? generateRandomId() : params.id,
                        description: params.description,
                        value: parseFloat(params.value),
                        type: params.type,
                        startDate: params.startDate || params.date,
                        endDate: params.endDate || null,
                        recurrence: 'monthly',
                        date: params.date,
                    };
                    realm.create('RecurringTransaction', rec, UpdateMode.Modified);
                }
            }

            // 3. TRANSAÇÃO NORMAL / EDITAR OVERRIDE EXISTENTE
            else {
                if (operation === 'editOverride') {
                    // Atualiza um Override já existente
                    const overrideUpdate = {
                        _id: params.id,
                        description: params.description,
                        value: parseFloat(params.value),
                        type: params.type,
                        date: params.date
                    };
                    realm.create('Override', overrideUpdate, UpdateMode.Modified);
                } else {
                    // Transação Comum (Income/Expense à vista)
                    const tx = {
                        _id: (operation === 'add' || !params.id) ? generateRandomId() : params.id,
                        description: params.description,
                        value: parseFloat(params.value),
                        type: params.type,
                        date: params.date,
                    };
                    realm.create('Transaction', tx, UpdateMode.Modified);
                }
            }
        });

        // --- PONTO CRUCIAL ---
        // Após salvar, recalculamos o mês atual para garantir que o Balance esteja certo
        TransactionRepository.recalculateBalanceForMonth(currentMonth, currentYear);

        // E limpamos o cache dos meses seguintes para corrigir o Saldo Acumulado futuro
        TransactionRepository.invalidateFutureBalances(currentMonth, currentYear);
    },
};