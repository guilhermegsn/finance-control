import Transaction from '../models/Transactions';
import CreditCard from '../models/CreditCard';

/**
 * Determina se uma transação pertence à fatura de um determinado mês,
 * baseada APENAS na data de vencimento (date).
 * USO: Fluxo de Caixa (AccountsTable) - REGRA 2
 */
export function isTransactionDueInMonth(
  transaction: Transaction,
  referenceDate: Date
): boolean {
  const dueDate = new Date(transaction.date);
  return (
    dueDate.getMonth() === referenceDate.getMonth() &&
    dueDate.getFullYear() === referenceDate.getFullYear()
  );
}

/**
 * Determina se uma transação de cartão pertence ao ciclo da fatura de um determinado mês,
 * baseada na data de compra (purchaseDate) e no dia de fechamento do cartão.
 * USO: Accordion de Cartões (CreditCardSection) - REGRA 1
 */
export function isTransactionInInvoiceMonth(
  transaction: Transaction,
  creditCard: CreditCard,
  referenceDate: Date
): boolean {
  // Se não tem purchaseDate, fallback para date (compatibilidade)
  const purchaseDate = transaction.purchaseDate ? new Date(transaction.purchaseDate) : new Date(transaction.date);
  const closingDay = creditCard.closingDay;
  
  // O mês de referência é o mês da fatura que o usuário está visualizando
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth();
  
  // Calcular a data de fechamento do mês de referência
  let closingDate = new Date(refYear, refMonth, closingDay);
  // Ajustar se o dia não existe no mês (ex: 31 em fevereiro)
  if (closingDate.getDate() !== closingDay) {
    closingDate = new Date(refYear, refMonth + 1, 0); // último dia do mês
  }
  
  // Calcular a data de fechamento do mês anterior
  let prevClosingDate = new Date(refYear, refMonth - 1, closingDay);
  if (prevClosingDate.getDate() !== closingDay) {
    prevClosingDate = new Date(refYear, refMonth, 0); // último dia do mês anterior
  }
  
  // A compra pertence ao ciclo da fatura se:
  // purchaseDate > prevClosingDate AND purchaseDate <= closingDate
  return purchaseDate > prevClosingDate && purchaseDate <= closingDate;
}

/**
 * Calcula o total da fatura para um cartão em um determinado mês
 * usando a regra de data de compra (REGRA 1)
 */
export function calculateInvoiceTotalByPurchaseDate(
  cardTransactions: Transaction[],
  creditCard: CreditCard,
  referenceDate: Date
): number {
  return cardTransactions
    .filter(transaction => isTransactionInInvoiceMonth(transaction, creditCard, referenceDate))
    .reduce((total, transaction) => total + transaction.amount, 0);
}

/**
 * Calcula o total da fatura para um cartão em um determinado mês
 * usando a regra de data de vencimento (REGRA 2)
 */
export function calculateInvoiceTotal(
  cardTransactions: Transaction[],
  referenceDate: Date
): number {
  return cardTransactions
    .filter(transaction => isTransactionDueInMonth(transaction, referenceDate))
    .reduce((total, transaction) => total + transaction.amount, 0);
}

/**
 * Filtra transações por mês da fatura para exibir no Accordion
 * usando a regra de data de compra (REGRA 1)
 */
export function filterTransactionsByInvoiceMonth(
  cardTransactions: Transaction[],
  creditCard: CreditCard,
  referenceDate: Date
): Transaction[] {
  return cardTransactions.filter(transaction =>
    isTransactionInInvoiceMonth(transaction, creditCard, referenceDate)
  );
}

/**
 * Obtém a descrição do mês da fatura
 */
export function getInvoiceMonthDescription(
  referenceDate: Date
): string {
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return `Fatura ${monthNames[referenceDate.getMonth()]}/${referenceDate.getFullYear()}`;
}
