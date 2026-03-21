import dayjs from "dayjs";
import React, { useState, useMemo, useEffect } from "react";
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { DataTable, Icon, Text } from "react-native-paper";
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

import { MixedTransaction, SyntheticTransaction, AccountTransactionGroup } from '../components/AccountsTable';
import { isTransactionInInvoiceMonth } from '../utils/creditCardInvoiceHelper';

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
    const safeTransaction = transaction ? {
      id: transaction.id,
      description: transaction.description,
      amount: transaction.amount,
      type: transaction.type,
      date: transaction.date,
      isConsolidated: transaction.isConsolidated,
      isRecurring: transaction.isRecurring,
    } : undefined;

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
        
        const invoiceTransactions = cardTransactions.filter(t => isTransactionInInvoiceMonth(t, card, currentDate));
        const cardTotal = invoiceTransactions.reduce((sum, t) => sum + t.amount, 0);
        
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
            creditCardId: card.id
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

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goToPreviousMonth}>
          <Icon source="chevron-left" size={24} />
        </TouchableOpacity>
        <Text style={styles.monthText}>{`${dayjs(currentDate).format('MMMM/YYYY')}`}</Text>
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
          totalBalance={totals.balance}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 16 },
  monthText: { fontSize: 18, fontWeight: "bold", textTransform: "capitalize" },
  scrollArea: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginTop: 20, marginBottom: 8 },
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
    ).observe(),
    allTransactions: database.get<Transaction>('transactions').query(
      Q.sortBy('date', Q.desc)
    ).observe(),
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
