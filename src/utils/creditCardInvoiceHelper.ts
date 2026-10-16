import type Transaction from '../models/Transactions';
import type CreditCard from '../models/CreditCard';

/**
 * Calcula a data de vencimento de uma parcela de compra no cartão.
 *
 * Regras (mantidas em sincronia com a REGRA 1 do accordion):
 * 1. Compra no dia do fechamento ou depois entra na fatura seguinte.
 * 2. Se o vencimento é numericamente menor que o fechamento (ex: fecha 20,
 *    vence 05), o pagamento cai no mês seguinte ao fechamento.
 * 3. Cada parcela adiciona um mês; meses curtos são ajustados para o último dia.
 *
 * USO: TransactionService (createCreditCardPurchase / updateCreditCardPurchase)
 */
export function getInstallmentDueDate(
  purchaseDate: Date,
  card: Pick<CreditCard, 'closingDay' | 'dueDay'>,
  installmentIndex: number
): Date {
  let month = purchaseDate.getMonth();
  let year = purchaseDate.getFullYear();

  // 1. Passou da data de fechamento? Pula um mês.
  if (purchaseDate.getDate() >= card.closingDay) {
    month++;
  }
  // 2. O vencimento vem numericamente antes do fechamento? (Ex: fecha 20, vence 05)
  // Então o pagamento é no mês seguinte. Pula mais um mês.
  if (card.dueDay < card.closingDay) {
    month++;
  }

  // 3. Adiciona os meses do parcelamento atual
  month += installmentIndex;

  // 4. Trata a virada de ano (ex: Dezembro -> Janeiro)
  while (month > 11) {
    month -= 12;
    year++;
  }

  const dueDate = new Date(year, month, card.dueDay);
  // Trata meses que acabam dia 28/30
  if (dueDate.getDate() !== card.dueDay) {
    dueDate.setDate(0);
  }
  return dueDate;
}

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
