import type Transaction from '../../models/Transactions';
import type CreditCard from '../../models/CreditCard';
import {
  getInstallmentDueDate,
  isTransactionDueInMonth,
  isTransactionInInvoiceMonth,
  calculateInvoiceTotal,
  calculateInvoiceTotalByPurchaseDate,
  filterTransactionsByInvoiceMonth,
  getInvoiceMonthDescription,
} from '../creditCardInvoiceHelper';

// Helpers para criar objetos mínimos com a forma que as funções usam
const makeCard = (closingDay: number, dueDay: number): CreditCard =>
  ({ closingDay, dueDay } as CreditCard);

const makeTransaction = (date: Date, amount = 100): Transaction =>
  ({ date, amount } as Transaction);

describe('getInstallmentDueDate', () => {
  describe('cartão que fecha ANTES de vencer no mesmo mês (fecha 05, vence 15)', () => {
    const card = makeCard(5, 15);

    it('compra antes do fechamento vence no mesmo mês', () => {
      const due = getInstallmentDueDate(new Date(2026, 2, 3), card, 0); // 03/mar
      expect(due).toEqual(new Date(2026, 2, 15)); // 15/mar
    });

    it('compra NO dia do fechamento já vai para a fatura seguinte', () => {
      const due = getInstallmentDueDate(new Date(2026, 2, 5), card, 0); // 05/mar
      expect(due).toEqual(new Date(2026, 3, 15)); // 15/abr
    });

    it('compra depois do fechamento vence no mês seguinte', () => {
      const due = getInstallmentDueDate(new Date(2026, 2, 10), card, 0); // 10/mar
      expect(due).toEqual(new Date(2026, 3, 15)); // 15/abr
    });

    it('parcelas avançam um mês por índice', () => {
      const purchase = new Date(2026, 0, 10); // 10/jan (após fechamento dia 5)
      expect(getInstallmentDueDate(purchase, card, 0)).toEqual(new Date(2026, 1, 15)); // 15/fev
      expect(getInstallmentDueDate(purchase, card, 1)).toEqual(new Date(2026, 2, 15)); // 15/mar
      expect(getInstallmentDueDate(purchase, card, 2)).toEqual(new Date(2026, 3, 15)); // 15/abr
    });

    it('vira o ano corretamente (compra em dezembro após fechamento)', () => {
      const due = getInstallmentDueDate(new Date(2026, 11, 10), card, 0); // 10/dez
      expect(due).toEqual(new Date(2027, 0, 15)); // 15/jan/2027
    });
  });

  describe('cartão que vence no mês seguinte ao fechamento (fecha 20, vence 05)', () => {
    const card = makeCard(20, 5);

    it('compra antes do fechamento vence no mês seguinte', () => {
      const due = getInstallmentDueDate(new Date(2026, 2, 10), card, 0); // 10/mar
      expect(due).toEqual(new Date(2026, 3, 5)); // 05/abr
    });

    it('compra no dia do fechamento pula duas faturas', () => {
      const due = getInstallmentDueDate(new Date(2026, 2, 20), card, 0); // 20/mar
      expect(due).toEqual(new Date(2026, 4, 5)); // 05/mai
    });

    it('vira o ano com o pulo duplo (compra em dezembro após fechamento)', () => {
      const due = getInstallmentDueDate(new Date(2026, 11, 25), card, 0); // 25/dez
      expect(due).toEqual(new Date(2027, 1, 5)); // 05/fev/2027
    });

    it('parcelamento longo atravessa a virada de ano', () => {
      const purchase = new Date(2026, 9, 1); // 01/out, antes do fechamento
      // 1ª parcela: 05/nov; 4ª parcela (índice 3): 05/fev/2027
      expect(getInstallmentDueDate(purchase, card, 0)).toEqual(new Date(2026, 10, 5));
      expect(getInstallmentDueDate(purchase, card, 3)).toEqual(new Date(2027, 1, 5));
    });
  });

  describe('vencimento em dia que não existe no mês', () => {
    const card = makeCard(25, 31);

    it('ajusta para o último dia de fevereiro (ano não bissexto)', () => {
      const due = getInstallmentDueDate(new Date(2026, 0, 26), card, 0); // 26/jan, após fechamento
      expect(due).toEqual(new Date(2026, 1, 28)); // 28/fev/2026
    });

    it('ajusta para 29 de fevereiro em ano bissexto', () => {
      const due = getInstallmentDueDate(new Date(2028, 0, 26), card, 0);
      expect(due).toEqual(new Date(2028, 1, 29)); // 29/fev/2028
    });

    it('ajusta para dia 30 em meses de 30 dias sem afetar as demais parcelas', () => {
      const purchase = new Date(2026, 2, 1); // 01/mar, antes do fechamento
      expect(getInstallmentDueDate(purchase, card, 0)).toEqual(new Date(2026, 2, 31)); // 31/mar
      expect(getInstallmentDueDate(purchase, card, 1)).toEqual(new Date(2026, 3, 30)); // 30/abr (ajustado)
      expect(getInstallmentDueDate(purchase, card, 2)).toEqual(new Date(2026, 4, 31)); // 31/mai (volta ao normal)
    });
  });
});

describe('isTransactionDueInMonth (REGRA 2 - fluxo de caixa)', () => {
  it('pertence ao mês quando mês e ano do vencimento batem', () => {
    const tx = makeTransaction(new Date(2026, 3, 5));
    expect(isTransactionDueInMonth(tx, new Date(2026, 3, 1))).toBe(true);
  });

  it('não pertence quando o mês é outro', () => {
    const tx = makeTransaction(new Date(2026, 3, 5));
    expect(isTransactionDueInMonth(tx, new Date(2026, 2, 1))).toBe(false);
  });

  it('não pertence quando o mês bate mas o ano é outro', () => {
    const tx = makeTransaction(new Date(2025, 3, 5));
    expect(isTransactionDueInMonth(tx, new Date(2026, 3, 1))).toBe(false);
  });
});

describe('isTransactionInInvoiceMonth (REGRA 1 - accordion de cartões)', () => {
  it('cartão com vencimento após fechamento: fatura é o próprio mês do vencimento', () => {
    const card = makeCard(5, 15);
    const tx = makeTransaction(new Date(2026, 2, 15)); // vence 15/mar
    expect(isTransactionInInvoiceMonth(tx, card, new Date(2026, 2, 1))).toBe(true); // fatura março
    expect(isTransactionInInvoiceMonth(tx, card, new Date(2026, 1, 1))).toBe(false);
  });

  it('cartão que vence antes de fechar: fatura é o mês ANTERIOR ao vencimento', () => {
    const card = makeCard(20, 5);
    const tx = makeTransaction(new Date(2026, 3, 5)); // vence 05/abr
    expect(isTransactionInInvoiceMonth(tx, card, new Date(2026, 2, 1))).toBe(true); // fatura março
    expect(isTransactionInInvoiceMonth(tx, card, new Date(2026, 3, 1))).toBe(false);
  });

  it('regride o ano quando o vencimento é em janeiro', () => {
    const card = makeCard(20, 5);
    const tx = makeTransaction(new Date(2027, 0, 5)); // vence 05/jan/2027
    expect(isTransactionInInvoiceMonth(tx, card, new Date(2026, 11, 1))).toBe(true); // fatura dez/2026
  });

  it('é consistente com getInstallmentDueDate: compra antes do fechamento cai na fatura do mês da compra', () => {
    const card = makeCard(20, 5);
    const purchase = new Date(2026, 2, 10); // 10/mar
    const tx = makeTransaction(getInstallmentDueDate(purchase, card, 0));
    expect(isTransactionInInvoiceMonth(tx, card, new Date(2026, 2, 1))).toBe(true); // fatura março
  });
});

describe('cálculo de totais e filtro da fatura', () => {
  const card = makeCard(20, 5);
  const transactions = [
    makeTransaction(new Date(2026, 3, 5), 100), // fatura março (REGRA 1) / abril (REGRA 2)
    makeTransaction(new Date(2026, 3, 5), 50.5),
    makeTransaction(new Date(2026, 4, 5), 200), // fatura abril (REGRA 1) / maio (REGRA 2)
  ];

  it('calculateInvoiceTotalByPurchaseDate soma apenas a fatura do mês (REGRA 1)', () => {
    expect(calculateInvoiceTotalByPurchaseDate(transactions, card, new Date(2026, 2, 1))).toBeCloseTo(150.5);
    expect(calculateInvoiceTotalByPurchaseDate(transactions, card, new Date(2026, 3, 1))).toBeCloseTo(200);
  });

  it('calculateInvoiceTotal soma pelo mês do vencimento (REGRA 2)', () => {
    expect(calculateInvoiceTotal(transactions, new Date(2026, 3, 1))).toBeCloseTo(150.5);
    expect(calculateInvoiceTotal(transactions, new Date(2026, 4, 1))).toBeCloseTo(200);
  });

  it('filterTransactionsByInvoiceMonth retorna somente as parcelas da fatura', () => {
    const filtered = filterTransactionsByInvoiceMonth(transactions, card, new Date(2026, 2, 1));
    expect(filtered).toHaveLength(2);
    expect(filtered).toEqual([transactions[0], transactions[1]]);
  });

  it('retorna zero/vazio quando não há transações no mês', () => {
    expect(calculateInvoiceTotal(transactions, new Date(2026, 7, 1))).toBe(0);
    expect(filterTransactionsByInvoiceMonth(transactions, card, new Date(2026, 7, 1))).toEqual([]);
  });
});

describe('getInvoiceMonthDescription', () => {
  it('formata mês e ano em português', () => {
    expect(getInvoiceMonthDescription(new Date(2026, 2, 1))).toBe('Fatura Março/2026');
    expect(getInvoiceMonthDescription(new Date(2027, 0, 15))).toBe('Fatura Janeiro/2027');
  });
});
