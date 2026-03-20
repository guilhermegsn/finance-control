import dayjs from "dayjs";
import React, { useState, useMemo, useEffect } from "react";
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { DataTable, Icon, Text } from "react-native-paper";
import { withObservables } from '@nozbe/watermelondb/react';
import { TransactionService } from '../service/TransactionService';
import { AccountService } from '../service/AccountService';
import { CategoryService } from '../service/CategoryService';
import Transaction from '../models/Transactions';
import { Q } from '@nozbe/watermelondb';
import { database } from '../database';
import SummaryFooter from '../components/SummaryFooter';
import AccountsTable from '../components/AccountsTable';
import TransactionTypeModal from '../components/TransactionTypeModal';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from "react-i18next";

interface AccountTransactionGroup {
  accountId: string;
  accountName: string;
  accountColor: string;
  previousBalance: number;
  totalBalance: number;
  income: {
    total: number;
    transactions: Transaction[];
  };
  expense: {
    total: number;
    transactions: Transaction[];
  };
}

interface MonthlyControlScreenProps {
  transactions: Transaction[];
  accounts: any[];
  categories: any[];
}

function MonthlyControlScreen({ transactions, accounts, categories }: MonthlyControlScreenProps) {
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

  const handleSelectTransactionType = (type: 'income' | 'expense') => {
    setTypeModalVisible(false);
    openTransactionForm(undefined, type);
  };

  const handleSelectTransfer = () => {
    setTypeModalVisible(false);
    Alert.alert('Em breve', 'Funcionalidade de transferência entre contas será implementada em breve.');
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

    accounts.forEach(account => {
      const previousBalance = previousBalances[account.id] || 0;

      const accountTransactions = filteredTransactions.filter(transaction => {
        // @ts-ignore - WatermelonDB usa esta sintaxe para relacionamentos
        const transactionAccountId = transaction._raw?.account_id;
        return transactionAccountId === account.id;
      });

      const incomeTransactions = accountTransactions.filter(t => t.type === 'income');
      const expenseTransactions = accountTransactions.filter(t => t.type === 'expense');

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
          transactions: expenseTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        }
      });
    });

    return groups.sort((a, b) => b.totalBalance - a.totalBalance);
  }, [filteredTransactions, accounts, previousBalances]);

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
        />


        {/* Cartões - TODO */}
        <Text style={styles.sectionTitle}>{t("Cartão de crédito")}</Text>
        <DataTable>
          <DataTable.Header>
            <DataTable.Title style={{ maxWidth: 70 }}><Text>{t("Data")}</Text></DataTable.Title>
            <DataTable.Title><Text>{t("Descrição")}</Text></DataTable.Title>
            <DataTable.Title numeric><Text>{t("Valor")}</Text></DataTable.Title>
          </DataTable.Header>
          <DataTable.Row>
            <DataTable.Cell>
              <Text style={{ opacity: 0.7 }}>---</Text>
            </DataTable.Cell>
            <DataTable.Cell><Text>{""}</Text></DataTable.Cell>
            <DataTable.Cell numeric><Text>{""}</Text></DataTable.Cell>
          </DataTable.Row>
          <DataTable.Row>
            <DataTable.Cell><Text>TOTAL</Text></DataTable.Cell>
            <DataTable.Cell numeric><Text style={{ fontWeight: 'bold' }}> R$ 0,00 </Text></DataTable.Cell>
          </DataTable.Row>
        </DataTable>

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

const enhance = withObservables([], () => ({
  transactions: database.get<Transaction>('transactions').query(Q.sortBy('date', Q.desc)).observe(),
  accounts: AccountService.observeAccounts(),
  categories: CategoryService.observeCategories(),
}));

export default enhance(MonthlyControlScreen);