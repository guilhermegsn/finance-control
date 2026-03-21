import dayjs from 'dayjs';

/**
 * Calcula o mês da fatura para uma compra no cartão de crédito.
 * Regra: Se dia da compra >= closingDay, a transação pertence ao mês seguinte (competência).
 * Caso contrário, pertence ao mês atual.
 * 
 * @param purchaseDate Data real da compra (Date)
 * @param closingDay Dia de fechamento do cartão (1-31)
 * @returns Objeto com ano e mês da fatura (0-indexed month, como Date)
 */
export function getInvoiceMonth(purchaseDate: Date, closingDay: number): { year: number; month: number } {
  const purchaseDay = purchaseDate.getDate();
  const purchaseYear = purchaseDate.getFullYear();
  const purchaseMonth = purchaseDate.getMonth(); // 0-indexed

  if (purchaseDay >= closingDay) {
    // Pertence ao mês seguinte
    const nextMonth = purchaseMonth === 11 ? 0 : purchaseMonth + 1;
    const nextYear = purchaseMonth === 11 ? purchaseYear + 1 : purchaseYear;
    return { year: nextYear, month: nextMonth };
  } else {
    // Pertence ao mês atual
    return { year: purchaseYear, month: purchaseMonth };
  }
}

/**
 * Verifica se uma transação pertence à fatura do mês selecionado.
 * 
 * @param transactionDate Data da transação
 * @param creditCardClosingDay Dia de fechamento do cartão
 * @param selectedMonth Mês selecionado (0-indexed)
 * @param selectedYear Ano selecionado
 * @returns true se a transação pertence à fatura do mês selecionado
 */
export function isTransactionInSelectedInvoice(
  transactionDate: Date,
  creditCardClosingDay: number,
  selectedMonth: number,
  selectedYear: number
): boolean {
  const invoiceMonth = getInvoiceMonth(transactionDate, creditCardClosingDay);
  return invoiceMonth.month === selectedMonth && invoiceMonth.year === selectedYear;
}

/**
 * Filtra transações por cartão de crédito e mês de fatura.
 * 
 * @param transactions Lista de transações
 * @param creditCardId ID do cartão de crédito
 * @param closingDay Dia de fechamento do cartão
 * @param selectedMonth Mês selecionado (0-indexed)
 * @param selectedYear Ano selecionado
 * @returns Transações que pertencem à fatura do mês selecionado
 */
export function filterCreditCardTransactionsByInvoiceMonth(
  transactions: any[],
  creditCardId: string,
  closingDay: number,
  selectedMonth: number,
  selectedYear: number
): any[] {
  return transactions.filter(transaction => {
    // Verifica se a transação pertence a este cartão
    const transactionCardId = transaction.credit_card_id || transaction.creditCardId;
    if (transactionCardId !== creditCardId) return false;

    // Verifica se pertence à fatura do mês selecionado
    return isTransactionInSelectedInvoice(
      new Date(transaction.date),
      closingDay,
      selectedMonth,
      selectedYear
    );
  });
}

/**
 * Calcula o total da fatura para um cartão no mês selecionado.
 * 
 * @param transactions Lista de transações
 * @param creditCardId ID do cartão de crédito
 * @param closingDay Dia de fechamento do cartão
 * @param selectedMonth Mês selecionado (0-indexed)
 * @param selectedYear Ano selecionado
 * @returns Total da fatura (soma dos amounts das transações)
 */
export function calculateInvoiceTotal(
  transactions: any[],
  creditCardId: string,
  closingDay: number,
  selectedMonth: number,
  selectedYear: number
): number {
  const filtered = filterCreditCardTransactionsByInvoiceMonth(
    transactions,
    creditCardId,
    closingDay,
    selectedMonth,
    selectedYear
  );
  return filtered.reduce((sum, transaction) => sum + transaction.amount, 0);
}