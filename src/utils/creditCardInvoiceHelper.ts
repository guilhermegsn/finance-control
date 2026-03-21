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
  card: CreditCard,
  referenceDate: Date
): boolean {
  // 1. Usamos a data de vencimento da parcela (que já está correta no banco para cada mês)
  const dueDate = new Date(transaction.date);
  
  let invoiceMonth = dueDate.getMonth();
  let invoiceYear = dueDate.getFullYear();

  // 2. A Engenharia Reversa: Se o dia de vencimento do cartão é numericamente menor que o dia de fechamento (Ex: Fecha dia 20, Vence dia 05), a fatura pertence ao mês ANTERIOR ao vencimento.
  if (card.dueDay < card.closingDay) {
    invoiceMonth -= 1;
    // Trata a regressão de ano (Janeiro para Dezembro)
    if (invoiceMonth < 0) {
      invoiceMonth = 11;
      invoiceYear -= 1;
    }
  }

  // 3. Verifica se a parcela pertence ao mês que o usuário selecionou na tela
  return invoiceMonth === referenceDate.getMonth() && invoiceYear === referenceDate.getFullYear();
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
