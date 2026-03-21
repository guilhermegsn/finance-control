import Transaction from '../models/Transactions';
import CreditCard from '../models/CreditCard';

/**
 * Determina se uma transação pertence à fatura de um determinado mês,
 * considerando o dia de fechamento (closing_day) do cartão.
 * 
 * @param transaction - Transação a ser avaliada
 * @param card - Cartão de crédito (deve ter closing_day)
 * @param referenceDate - Data de referência (mês/ano sendo visualizado)
 * @returns true se a transação pertence à fatura do mês de referência
 */
export function isTransactionInInvoiceMonth(
  transaction: Transaction,
  card: CreditCard,
  referenceDate: Date
): boolean {
  const transactionDate = new Date(transaction.date);
  const closingDay = card.closingDay;

  // Mês da transação
  const transMonth = transactionDate.getMonth();
  const transYear = transactionDate.getFullYear();
  const transDay = transactionDate.getDate();

  // Mês de referência (o mês sendo visualizado)
  const refMonth = referenceDate.getMonth();
  const refYear = referenceDate.getFullYear();

  // Se dia da transação >= closing_day: fatura do próximo mês
  // Se dia da transação < closing_day: fatura do mês atual
  let invoiceMonth = transMonth;
  let invoiceYear = transYear;

  if (transDay >= closingDay) {
    // Vai para o próximo mês
    invoiceMonth = transMonth + 1;
    if (invoiceMonth > 11) {
      invoiceMonth = 0;
      invoiceYear = transYear + 1;
    }
  }

  // Comparar com o mês de referência
  return invoiceMonth === refMonth && invoiceYear === refYear;
}

/**
 * Calcula o total da fatura para um cartão em um determinado mês
 * 
 * @param card - Cartão de crédito
 * @param cardTransactions - Todas as transações do cartão (já filtradas por credit_card_id)
 * @param referenceDate - Data de referência (mês/ano sendo visualizado)
 * @returns Total da fatura para o mês
 */
export function calculateInvoiceTotal(
  card: CreditCard,
  cardTransactions: Transaction[],
  referenceDate: Date
): number {
  return cardTransactions
    .filter(transaction => isTransactionInInvoiceMonth(transaction, card, referenceDate))
    .reduce((total, transaction) => total + transaction.amount, 0);
}

/**
 * Filtra transações por cartão e mês da fatura
 * 
 * @param card - Cartão de crédito
 * @param cardTransactions - Todas as transações do cartão
 * @param referenceDate - Data de referência (mês/ano sendo visualizado)
 * @returns Transações que pertencem à fatura do mês
 */
export function filterTransactionsByInvoiceMonth(
  card: CreditCard,
  cardTransactions: Transaction[],
  referenceDate: Date
): Transaction[] {
  return cardTransactions.filter(transaction =>
    isTransactionInInvoiceMonth(transaction, card, referenceDate)
  );
}

/**
 * Obtém a descrição do mês da fatura com base no closing_day
 * 
 * @param card - Cartão de crédito
 * @param referenceDate - Data de referência (mês/ano sendo visualizado)
 * @returns Descrição no formato "Fatura Abril/2025" (considerando que a visualização é do mês da fatura)
 */
export function getInvoiceMonthDescription(
  card: CreditCard,
  referenceDate: Date
): string {
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  
  const refMonth = referenceDate.getMonth();
  const refYear = referenceDate.getFullYear();
  
  return `Fatura ${monthNames[refMonth]}/${refYear}`;
}