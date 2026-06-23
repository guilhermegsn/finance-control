import dayjs from "dayjs";
import React, { useState, useMemo, useEffect } from "react";
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Icon, Text } from "react-native-paper";
import { withObservables } from '@nozbe/watermelondb/react';
import { TransactionService } from '../service/TransactionService';
import { AccountService } from '../service/AccountService';
import { CategoryService } from '../service/CategoryService';
import CreditCardService from '../service/CreditCardService';
import Transaction from '../models/Transactions';
import CreditCard from '../models/CreditCard';
import { Q } from '@nozbe/watermelondb';
import { database } from '../database';
import SummaryFooter from '../components/SummaryFooter';
import AccountsTable from '../components/AccountsTable';
import TransactionTypeModal from '../components/TransactionTypeModal';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from "react-i18next";
import CreditCardSectionComponent from "../components/CreditCardSection";
import { isTransactionDueInMonth } from '../utils/creditCardInvoiceHelper';

import { MixedTransaction, SyntheticTransaction, AccountTransactionGroup } from '../components/AccountsTable';
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from '../contexts/ThemeContext';
import GlassHeader from "../components/GlassHeader";

interface MonthlyControlScreenProps {
  transactions: Transaction[]; // Transações sem cartão (filtradas)
  allTransactions: Transaction[]; // Todas as transações (incluindo cartão)
  creditCards: CreditCard[];
  accounts: any[];
  categories: any[];
}

function MonthlyControlScreen({ transactions, allTransactions, creditCards, accounts, categories }: MonthlyControlScreenProps) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [previousBalances, setPreviousBalances] = useState<Record<string, number>>({});
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [typeModalVisible, setTypeModalVisible] = useState(false);

  const isFutureMonth = useMemo(() => {
    const now = new Date();
    const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const nowMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return currentMonth > nowMonth;
  }, [currentDate]);

  const goToPreviousMonth = () => {
    const prev = new Date(currentDate);
    prev.setMonth(prev.getUTCMonth() - 1);
    setCurrentDate(prev);
  };

  const goToNextMonth = () => {
    const next = new Date(currentDate);
    next.setMonth(next.getUTCMonth() + 1);
    setCurrentDate(next);
  };

  const openTransactionForm = (transaction?: Transaction, type?: 'income' | 'expense') => {
    // TAREFA 2: Proteção de transações consolidadas
    // if (transaction?.isConsolidated) {
    //   Alert.alert(
    //     t('Bloqueado'),
    //     t('Transações já pagas não podem ser alteradas.')
    //   );
    //   return;
    // }

    const safeAccounts = accounts.map(acc => ({
      id: acc.id,
      name: acc.name,
      logoUrl: acc.logoUrl,
      bankCode: acc.bankCode
    }));

    const safeCategories = categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      type: cat.type
    }));

    // TAREFA 1: Verificar se é transação de cartão de crédito
    if (transaction) {
      // @ts-ignore - WatermelonDB usa esta sintaxe para relacionamentos
      const creditCardId = transaction._raw?.credit_card_id;

      if (creditCardId) {
        // Navegar para tela de edição de compra no cartão
        navigation.navigate('CreditCardPurchase', {
          transactionId: transaction.id,
          categories: safeCategories,
          accounts: safeAccounts,
          onSave: () => { },
        });
        return;
      }
    }

    // Fluxo normal para transações sem cartão
    const safeTransaction = transaction ? {
      id: transaction.id,
      description: transaction.description,
      amount: transaction.amount,
      type: transaction.type,
      date: transaction.date,
      isConsolidated: transaction.isConsolidated,
      isRecurring: transaction.isRecurring,
      accountId: transaction.account?.id || (transaction as any)._raw?.account_id,
      categoryId: transaction.category?.id || (transaction as any)._raw?.category_id,
      recurringId: transaction.recurringId || (transaction as any)._raw?.recurring_id,
    } : undefined;

    navigation.navigate('TransactionForm', {
      transaction: safeTransaction,
      initialType: type,
      accounts: safeAccounts,
      categories: safeCategories,
    });
  };

  const handleSelectTransactionType = (type: 'income' | 'expense' | 'credit') => {
    setTypeModalVisible(false);
    if (type === 'income' || type === 'expense') {
      openTransactionForm(undefined, type);
    } else {
      // Preparar categorias e contas para a tela de compra no cartão
      const safeCategories = categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        type: cat.type
      }));

      const safeAccounts = accounts.map(acc => ({
        id: acc.id,
        name: acc.name,
        logoUrl: acc.logoUrl,
        bankCode: acc.bankCode
      }));

      navigation.navigate('CreditCardPurchase', {
        categories: safeCategories,
        accounts: safeAccounts
      });
    }
  };


  const handleSelectTransfer = () => {
    setTypeModalVisible(false);
    navigation.navigate('TransferForm', { accounts: accounts })
  };

  const filteredTransactions = filterTransactionsByMonth(transactions, currentDate);
  const totals = calculateTotals(filteredTransactions);

  // Calcular saldo atual (apenas transações consolidadas)
  const currentBalance = useMemo(() => {
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    let pastConsolidated = 0;
    allTransactions.forEach(t => {
      // Compras de CC são contadas via transação de pagamento da fatura (credit_card_id = null)
      if ((t as any)._raw?.credit_card_id != null) return;
      if (new Date(t.date).getTime() < firstDayOfMonth.getTime() && t.isConsolidated) {
        pastConsolidated += t.type === 'income' ? t.amount : -t.amount;
      }
    });

    // filteredTransactions já exclui CC (query com credit_card_id = null)
    let currentMonthConsolidated = 0;
    filteredTransactions.forEach(t => {
      if (t.isConsolidated) {
        currentMonthConsolidated += t.type === 'income' ? t.amount : -t.amount;
      }
    });

    return pastConsolidated + currentMonthConsolidated;
  }, [allTransactions, filteredTransactions, currentDate]);

  // Calcular saldo projetado (todo o passado não-CC + mês atual não-CC + fatura CC pendente)
  const projectedBalance = useMemo(() => {
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    // Passado: tudo não-CC (consolidado + agendado) — mesmo não consolidado é esperado
    let pastAllBalance = 0;
    allTransactions.forEach(t => {
      if ((t as any)._raw?.credit_card_id != null) return;
      if (new Date(t.date).getTime() < firstDayOfMonth.getTime()) {
        pastAllBalance += t.type === 'income' ? t.amount : -t.amount;
      }
    });

    // Mês atual: transações não-CC (inclui pagamento da fatura quando pago)
    let currentMonthTotal = 0;
    const allFilteredTransactions = filterAllTransactionsByMonth(allTransactions, currentDate);
    allFilteredTransactions.forEach(t => {
      if ((t as any)._raw?.credit_card_id != null) return;
      currentMonthTotal += t.type === 'income' ? t.amount : -t.amount;
    });

    // Fatura CC pendente: parcelas com vencimento até o fim do mês visualizado
    // Inclui o mês atual + faturas de meses anteriores ainda não pagas (atrasadas)
    // Quando paga: purchases ficam consolidadas → não entra aqui
    //              e o pagamento já está em currentMonthTotal
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);
    let ccPendingExpense = 0;
    allTransactions.forEach(t => {
      if ((t as any)._raw?.credit_card_id == null) return;
      if (t.isConsolidated) return;
      if (new Date(t.date).getTime() <= endOfMonth.getTime()) {
        ccPendingExpense += t.amount;
      }
    });

    return pastAllBalance + currentMonthTotal - ccPendingExpense;
  }, [allTransactions, currentDate]);

  useEffect(() => {
    const calculatePreviousBalances = async () => {
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const newBalances: Record<string, number> = {};

      for (const account of accounts) {
        try {
          const balanceBeforeDate = await TransactionService.getBalanceBeforeDate(account.id, firstDayOfMonth);
          const accountInitialBalance = account.initialBalance || 0;
          newBalances[account.id] = balanceBeforeDate + accountInitialBalance;
        } catch (error) {
          console.error(`Erro ao calcular saldo anterior para conta ${account.id}:`, error);
          newBalances[account.id] = account.initialBalance || 0;
        }
      }

      setPreviousBalances(newBalances);
    };

    calculatePreviousBalances();
  }, [currentDate, accounts, allTransactions]);

  const accountTransactionGroups = useMemo(() => {
    const groups: AccountTransactionGroup[] = [];

    // Transações de cartão não devem ser pré-filtradas por mês aqui,
    // pois a data de compra pode ser do mês passado e a fatura ser deste mês.
    const allCreditCardTransactions = allTransactions.filter(t => {
      // @ts-ignore
      return t._raw?.credit_card_id != null;
    });

    accounts.forEach(account => {
      const previousBalance = previousBalances[account.id] || 0;

      const accountTransactions = filteredTransactions.filter(transaction => {
        // @ts-ignore - WatermelonDB usa esta sintaxe para relacionamentos
        const transactionAccountId = transaction._raw?.account_id;
        return transactionAccountId === account.id;
      });

      const incomeTransactions = accountTransactions.filter(t => t.type === 'income');
      const realExpenseTransactions = accountTransactions.filter(t => t.type === 'expense');

      // Total real de despesas para cálculo do saldo (inclui pagamento da fatura quando pago)
      const realExpenseCalcTotal = realExpenseTransactions.reduce((sum, t) => sum + t.amount, 0);

      // Lista de exibição: começa com despesas reais e é ajustada por cartão
      const displayExpenseTransactions: MixedTransaction[] = [...realExpenseTransactions];

      const accountCreditCards = creditCards.filter(card => card.accountId === account.id);

      accountCreditCards.forEach(card => {
        const cardTransactions = allCreditCardTransactions.filter(t =>
          // @ts-ignore
          t._raw?.credit_card_id === card.id
        );

        // REGRA DE OURO: usar isTransactionDueInMonth (data de vencimento) para o fluxo de caixa
        const invoiceDueTxs = cardTransactions.filter(t => isTransactionDueInMonth(t, currentDate));
        if (invoiceDueTxs.length === 0) return;

        const pendingTxs = invoiceDueTxs.filter(t => !t.isConsolidated);
        const paidTxs = invoiceDueTxs.filter(t => t.isConsolidated);
        const isPaid = pendingTxs.length === 0 && paidTxs.length > 0;

        let dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), card.dueDay);
        if (dueDate.getDate() !== card.dueDay) {
          dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        }

        if (isPaid) {
          const paidTotal = paidTxs.reduce((sum, t) => sum + t.amount, 0);

          // Ocultar da lista de exibição a transação de pagamento (representada pelo invoice pago)
          const paymentIdx = displayExpenseTransactions.findIndex(t =>
            !('isVirtualInvoice' in t) &&
            (t as Transaction).description === `Pagamento Fatura ${card.name}`
          );
          if (paymentIdx >= 0) displayExpenseTransactions.splice(paymentIdx, 1);

          displayExpenseTransactions.push({
            id: `fatura_virtual_${card.id}_${currentDate.getMonth()}`,
            description: `Fatura ${card.name}`,
            amount: paidTotal,
            type: 'expense',
            date: dueDate,
            isVirtualInvoice: true,
            isPaid: true,
            creditCardId: card.id,
            accountId: account.id,
            transactionIds: paidTxs.map(t => t.id),
          } as SyntheticTransaction);
        } else {
          const cardTotal = pendingTxs.reduce((sum, t) => sum + t.amount, 0);
          if (cardTotal > 0) {
            displayExpenseTransactions.push({
              id: `fatura_virtual_${card.id}_${currentDate.getMonth()}`,
              description: `Fatura ${card.name}`,
              amount: cardTotal,
              type: 'expense',
              date: dueDate,
              isVirtualInvoice: true,
              isPaid: false,
              creditCardId: card.id,
              accountId: account.id,
              transactionIds: pendingTxs.map(t => t.id),
            } as SyntheticTransaction);
          }
        }
      });

      const incomeTotal = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
      const incomeConsolidatedTotal = incomeTransactions
        .filter(t => t.isConsolidated)
        .reduce((sum, t) => sum + t.amount, 0);

      const expenseTotal = displayExpenseTransactions.reduce((sum, t) => sum + t.amount, 0);
      const expenseConsolidatedTotal = displayExpenseTransactions.reduce((sum, t) => {
        if ('isVirtualInvoice' in t) return (t as SyntheticTransaction).isPaid ? sum + t.amount : sum;
        return (t as Transaction).isConsolidated ? sum + t.amount : sum;
      }, 0);

      const totalBalance = previousBalance + incomeTotal - realExpenseCalcTotal;

      groups.push({
        accountId: account.id,
        accountName: account.name,
        accountColor: account.color,
        previousBalance,
        totalBalance,
        income: {
          total: incomeTotal,
          consolidatedTotal: incomeConsolidatedTotal,
          transactions: incomeTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        },
        expense: {
          total: expenseTotal,
          consolidatedTotal: expenseConsolidatedTotal,
          transactions: displayExpenseTransactions.sort((a: MixedTransaction, b: MixedTransaction) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return dateA - dateB;
          })
        }
      });
    });

    return groups.sort((a, b) => b.totalBalance - a.totalBalance);
  }, [filteredTransactions, allTransactions, creditCards, accounts, previousBalances, currentDate]);

  const toggleAccountExpansion = (accountId: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedAccounts(newExpanded);
  };

  const handleConsolidateInvoice = async (invoice: SyntheticTransaction) => {
    if (!user?.id) return;

    if (invoice.isPaid) {
      try {
        await TransactionService.unpayCreditCardInvoice(
          invoice.accountId,
          `Pagamento ${invoice.description}`,
          invoice.transactionIds,
          invoice.date,
        );
      } catch (error) {
        console.error('Erro ao desfazer pagamento:', error);
        Alert.alert(t('Erro'), t('Ocorreu um erro ao desfazer o pagamento.'));
      }
    } else {
      try {
        await TransactionService.payCreditCardInvoice(
          invoice.accountId,
          `Pagamento ${invoice.description}`,
          invoice.amount,
          invoice.date,
          user.id,
          invoice.transactionIds
        );
      } catch (error) {
        console.error('Erro ao pagar fatura:', error);
        Alert.alert(t('Erro'), t('Ocorreu um erro ao pagar a fatura.'));
      }
    }
  };

  const c = {
    bg: isDarkMode ? '#0D1117' : '#EEF2F7',
    card: isDarkMode ? '#161C27' : '#FFFFFF',
    border: isDarkMode ? '#2D3748' : '#E2E8F0',
    textPrimary: isDarkMode ? '#E2E8F0' : '#1A202C',
    textSecondary: isDarkMode ? '#718096' : '#64748B',
    sectionLabel: isDarkMode ? '#4A5568' : '#94A3B8',
    navBtn: isDarkMode ? '#1C2333' : '#FFFFFF',
  };

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <GlassHeader />
      <SafeAreaView style={styles.container}>

        {/* Month Navigator */}
        <View style={styles.monthNav}>
          <TouchableOpacity style={[styles.navBtn, { backgroundColor: c.navBtn, borderColor: c.border }]} onPress={goToPreviousMonth}>
            <Icon source="chevron-left" size={20} color={c.textSecondary} />
          </TouchableOpacity>
          <Text style={[styles.monthText, { color: c.textPrimary }]}>
            {dayjs(currentDate).format('MMMM YYYY')}
          </Text>
          <TouchableOpacity style={[styles.navBtn, { backgroundColor: c.navBtn, borderColor: c.border }]} onPress={goToNextMonth}>
            <Icon source="chevron-right" size={20} color={c.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>

          {/* Lista de Contas */}
          <Text style={[styles.sectionTitle, { color: c.sectionLabel }]}>{t('CONTAS')}</Text>
          <AccountsTable
            accountTransactionGroups={accountTransactionGroups}
            accounts={accounts}
            expandedAccounts={expandedAccounts}
            onToggleAccount={toggleAccountExpansion}
            onEditTransaction={openTransactionForm}
            onConsolidateInvoice={handleConsolidateInvoice}
            totalBalance={projectedBalance}
            currentDate={currentDate}
          />


          <CreditCardSectionComponent
            creditCards={creditCards}
            allTransactions={allTransactions}
            currentDate={currentDate}
            onEditTransaction={openTransactionForm}
          />

          <SummaryFooter
            currentDate={currentDate}
            isFutureMonth={isFutureMonth}
            currentBalance={currentBalance}
            projectedBalance={projectedBalance}
          />
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* FAB */}
        <TouchableOpacity onPress={() => setTypeModalVisible(true)} style={styles.fab}>
          <Icon source="plus" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Modal de seleção de tipo */}
        <TransactionTypeModal
          visible={typeModalVisible}
          onClose={() => setTypeModalVisible(false)}
          onSelectIncome={() => handleSelectTransactionType('income')}
          onSelectExpense={() => handleSelectTransactionType('expense')}
          onSelectCredit={() => handleSelectTransactionType('credit')}

          onSelectTransfer={handleSelectTransfer}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 16, marginTop: -80 },
  scrollArea: { flex: 1 },

  // Month navigator
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthText: {
    fontSize: 17,
    fontWeight: '700',
    textTransform: 'capitalize',
    letterSpacing: 0.3,
  },

  // Section
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginTop: 4,
    marginBottom: 8,
    marginLeft: 2,
  },

  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#6366F1',
    borderRadius: 28,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    zIndex: 10,
  },
});

const filterTransactionsByMonth = (transactions: Transaction[], date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  return transactions.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    return transactionDate.getFullYear() === year && transactionDate.getMonth() === month;
  });
};

const filterAllTransactionsByMonth = (transactions: Transaction[], date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  return transactions.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    return transactionDate.getFullYear() === year && transactionDate.getMonth() === month;
  });
};

const calculateTotals = (transactions: Transaction[]) => {
  let totalIncome = 0;
  let totalExpense = 0;
  transactions.forEach(transaction => {
    if (transaction.type === 'income') totalIncome += transaction.amount;
    else if (transaction.type === 'expense') totalExpense += transaction.amount;
  });
  return { totalIncome, totalExpense, balance: totalIncome - totalExpense };
};

const MonthlyControlScreenWrapper = () => {
  const { user } = useAuth();

  const ScreenWithData = withObservables(['userId'], ({ userId }: { userId: string }) => ({
    transactions: database.get<Transaction>('transactions').query(
      Q.where('credit_card_id', null),
      Q.sortBy('date', Q.desc)
    ).observeWithColumns(['date', 'purchase_date', 'amount', 'description', 'category_id', 'is_consolidated', 'credit_card_id']),
    allTransactions: database.get<Transaction>('transactions').query(
      Q.sortBy('date', Q.desc)
    ).observeWithColumns(['date', 'purchase_date', 'amount', 'description', 'category_id', 'is_consolidated', 'credit_card_id', 'related_transaction_id']),
    creditCards: userId
      ? CreditCardService.getCollection().query(
        Q.where('user_id', userId),
        Q.where('deleted_at', null)
      ).observe()
      : [],
    accounts: AccountService.observeAccounts(),
    categories: CategoryService.observeCategories(),
  }))(MonthlyControlScreen);

  return <ScreenWithData userId={user?.id || ''} />;
};

export default MonthlyControlScreenWrapper;
