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
    if (transaction?.isConsolidated) {
      Alert.alert(
        t('Bloqueado'),
        t('Transações já pagas não podem ser alteradas.')
      );
      return;
    }

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
    // Saldo de transações passadas consolidadas
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    let pastConsolidated = 0;
    allTransactions.forEach(t => {
      if (new Date(t.date).getTime() < firstDayOfMonth.getTime() && t.isConsolidated) {
        pastConsolidated += t.type === 'income' ? t.amount : -t.amount;
      }
    });

    // Saldo do mês atual consolidado
    let currentMonthConsolidated = 0;
    filteredTransactions.forEach(t => {
      if (t.isConsolidated) {
        currentMonthConsolidated += t.type === 'income' ? t.amount : -t.amount;
      }
    });

    return pastConsolidated + currentMonthConsolidated;
  }, [allTransactions, filteredTransactions, currentDate]);

  // Calcular saldo projetado (todas as transações, incluindo não consolidadas)
  const projectedBalance = useMemo(() => {
    // Saldo total de transações passadas (consolidadas e não consolidadas)
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    let pastTotal = 0;
    allTransactions.forEach(t => {
      if (new Date(t.date).getTime() < firstDayOfMonth.getTime()) {
        pastTotal += t.type === 'income' ? t.amount : -t.amount;
      }
    });

    // Saldo total do mês atual (todas as transações, incluindo cartão de crédito)
    let currentMonthTotal = 0;
    const allFilteredTransactions = filterAllTransactionsByMonth(allTransactions, currentDate);
    allFilteredTransactions.forEach(t => {
      currentMonthTotal += t.type === 'income' ? t.amount : -t.amount;
    });

    return pastTotal + currentMonthTotal;
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
  }, [currentDate, accounts, transactions.length]);

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
      const expenseTransactions: MixedTransaction[] = accountTransactions.filter(t => t.type === 'expense');

      // Calcular Faturas de Cartão de Crédito vinculadas a essa conta
      const accountCreditCards = creditCards.filter(card => card.accountId === account.id);

      accountCreditCards.forEach(card => {
        const cardTransactions = allCreditCardTransactions.filter(t => {
          // @ts-ignore
          return t._raw?.credit_card_id === card.id;
        });

        // REGRA DE OURO: Para o Fluxo de Caixa, usar isTransactionDueInMonth que considera
        // APENAS a data de vencimento (date) para determinar se a transação aparece na fatura virtual
        const pendingInvoiceTransactions = cardTransactions.filter(t => {
          return isTransactionDueInMonth(t, currentDate) && !t.isConsolidated;
        });

        const cardTotal = pendingInvoiceTransactions.reduce((sum, t) => sum + t.amount, 0);

        if (cardTotal > 0) {
          let dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), card.dueDay);
          // Se o dueDay não for válido (ex: 31 em fevereiro), o JS ajusta sozinho, mas para garantir
          if (dueDate.getDate() !== card.dueDay) {
            dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
          }

          const syntheticInvoice: SyntheticTransaction = {
            id: 'fatura_virtual_' + card.id + '_' + currentDate.getMonth(),
            description: `Fatura ${card.name}`,
            amount: cardTotal,
            type: 'expense',
            date: dueDate,
            isVirtualInvoice: true,
            creditCardId: card.id,
            accountId: account.id,
            transactionIds: pendingInvoiceTransactions.map(t => t.id)
          };
          expenseTransactions.push(syntheticInvoice);
        }
      });

      const incomeTotal = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
      const expenseTotal = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
      const totalBalance = previousBalance + incomeTotal - expenseTotal;

      groups.push({
        accountId: account.id,
        accountName: account.name,
        accountColor: account.color,
        previousBalance,
        totalBalance,
        income: {
          total: incomeTotal,
          transactions: incomeTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        },
        expense: {
          total: expenseTotal,
          transactions: expenseTransactions.sort((a, b) => {
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

    Alert.alert(
      t('Pagar Fatura'),
      t(`Deseja confirmar o pagamento de ${invoice.description} no valor de R$ ${invoice.amount.toFixed(2)}?`),
      [
        { text: t('Cancelar'), style: 'cancel' },
        {
          text: t('Confirmar'),
          onPress: async () => {
            try {
              await TransactionService.payCreditCardInvoice(
                invoice.accountId,
                `Pagamento ${invoice.description}`,
                invoice.amount,
                invoice.date,
                user.id,
                invoice.transactionIds
              );
              // Como estamos usando observables, a tela será atualizada automaticamente
              // e a fatura virtual desaparecerá (pois isConsolidated será true para as compras)
            } catch (error) {
              console.error('Erro ao pagar fatura:', error);
              Alert.alert(t('Erro'), t('Ocorreu um erro ao pagar a fatura.'));
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goToPreviousMonth}>
          <Icon source="chevron-left" size={24} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.monthText}>{`${dayjs(currentDate).format('MMMM/YYYY')}`}</Text>
          <View style={styles.headerSummary}>
          
            {/* Card de Balanço */}
            <View style={[
              styles.summaryCard,
              {
                backgroundColor: isDarkMode ? '#2A2D3E' : '#FFFFFF',
                borderColor: isDarkMode ? 'transparent' : '#E5E7EB',
                shadowColor: isDarkMode ? '#000' : '#9CA3AF',
                marginLeft: 8,
              }
            ]}>
              <View style={styles.cardHeader}>
                <Icon
                  source="wallet"
                  size={16}
                  color={currentBalance >= 0 ? '#56D6A3' : '#FF7285'}
                />
              </View>
              <Text style={[
                styles.cardValue,
                { color: currentBalance >= 0 ? '#56D6A3' : '#FF7285' }
              ]}>
                R$ {currentBalance.toFixed(2)}
              </Text>
            </View>


            <View style={[
              styles.summaryCard,
              {

                backgroundColor: isDarkMode ? '#2A2D3E' : '#FFFFFF',
                borderColor: isDarkMode ? 'transparent' : '#E5E7EB',
                shadowColor: isDarkMode ? '#000' : '#9CA3AF',
              }
            ]}>
              <View style={styles.cardHeader}>
                <Icon
                  source="crystal-ball"
                  size={16}
                  color={projectedBalance >= 0 ? '#56D6A3' : '#FF7285'}
                />

              </View>
              <Text style={[
                styles.cardValue,
                { color: projectedBalance >= 0 ? '#56D6A3' : '#FF7285' }
              ]}>
                R$ {projectedBalance.toFixed(2)}
              </Text>
            </View>



          </View>
        </View>
        <TouchableOpacity onPress={goToNextMonth}>
          <Icon source="chevron-right" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>

        {/* Lista de Contas */}
        <Text style={styles.sectionTitle}>{t('Contas')}</Text>
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

        <SummaryFooter currentDate={currentDate} isFutureMonth={isFutureMonth} />
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 10 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 16 },
  headerCenter: { alignItems: "center" },
  headerSummary: { flexDirection: "row", marginTop: 8 },
  monthText: { fontSize: 18, fontWeight: "bold", textTransform: "capitalize" },
  scrollArea: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginTop: 20, marginBottom: 8 },
  summaryCard: {
    flexDirection: 'row',
    paddingHorizontal: 30,
    paddingVertical: 4,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    minWidth: 100,
    marginRight: 5
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  cardValue: {
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 5
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: "#007bff",
    borderRadius: 50,
    width: 56,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    zIndex: 10
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
