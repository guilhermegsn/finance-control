import dayjs from "dayjs";
import React, { useState, useMemo, useEffect } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View, Image } from "react-native";
import { DataTable, Icon, Text } from "react-native-paper";
import TransactionItem from '../components/TransactionItem';
import { withObservables } from '@nozbe/watermelondb/react';
import { TransactionService } from '../service/TransactionService';
import { AccountService } from '../service/AccountService';
import { CategoryService } from '../service/CategoryService';
import Transaction from '../models/Transactions';
import { Q } from '@nozbe/watermelondb';
import { database } from '../database';
import { useAuth } from '../contexts/AuthContext';
import BankService from '../service/BankService';
import SummaryFooter from '../components/SummaryFooter';
import { useNavigation } from '@react-navigation/native';

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
  const { user } = useAuth();
  const navigation = useNavigation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [previousBalances, setPreviousBalances] = useState<Record<string, number>>({});

  const isFutureMonth = useMemo(() => {
    const now = new Date();
    const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const nowMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return currentMonth > nowMonth;
  }, [currentDate]);

  const isPastMonth = useMemo(() => {
    const now = new Date();
    const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const nowMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return currentMonth < nowMonth;
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

  const openTransactionForm = (transaction?: Transaction) => {
    // Extrair apenas dados simples para evitar referências circulares
    const safeTransaction = transaction ? {
      id: transaction.id,
      description: transaction.description,
      amount: transaction.amount,
      type: transaction.type,
      date: transaction.date,
      isConsolidated: transaction.isConsolidated,
      isRecurring: transaction.isRecurring,
    } : undefined;
    
    navigation.navigate('TransactionForm', {
      transaction: safeTransaction,
      accounts,
      categories,
      onSave: () => {
        // Recarregar dados após salvar
        // A reatividade do WatermelonDB já cuida disso
      },
      onCancel: () => {
        navigation.goBack();
      }
    });
  };

  // Verificar se a transação é de um mês anterior ao atual
  const isPreviousMonthTransaction = (transactionDate: Date): boolean => {
    const now = new Date();
    const transactionMonth = new Date(transactionDate);

    // Comparar ano e mês
    return transactionMonth.getFullYear() < now.getFullYear() ||
      (transactionMonth.getFullYear() === now.getFullYear() &&
        transactionMonth.getMonth() < now.getMonth());
  };

  // Filtrar transações pelo mês atual
  const filteredTransactions = filterTransactionsByMonth(transactions, currentDate);

  // Calcular totais gerais
  const totals = calculateTotals(filteredTransactions);

  // Calcular saldo anterior para cada conta (primeiro dia do mês atual)
  useEffect(() => {
    const calculatePreviousBalances = async () => {
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const newBalances: Record<string, number> = {};

      // Para cada conta, calcular saldo anterior
      for (const account of accounts) {
        try {
          const balanceBeforeDate = await TransactionService.getBalanceBeforeDate(account.id, firstDayOfMonth);
          // Adicionar saldo inicial da conta
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
  }, [currentDate, accounts, transactions.length]); // Recalcular quando mês ou contas mudarem

  // Agrupar transações por conta e tipo (nova hierarquia)
  const accountTransactionGroups = useMemo(() => {
    const groups: AccountTransactionGroup[] = [];

    // Inicializar grupos para todas as contas
    accounts.forEach(account => {
      const previousBalance = previousBalances[account.id] || 0;

      // Filtrar transações da conta no mês atual
      const accountTransactions = filteredTransactions.filter(transaction => {
        // @ts-ignore - WatermelonDB usa esta sintaxe para relacionamentos
        const transactionAccountId = transaction._raw?.account_id;
        return transactionAccountId === account.id;
      });

      // Separar transações por tipo
      const incomeTransactions = accountTransactions.filter(t => t.type === 'income');
      const expenseTransactions = accountTransactions.filter(t => t.type === 'expense');

      // Calcular totais por tipo
      const incomeTotal = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
      const expenseTotal = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);

      // Calcular saldo total (saldo anterior + entradas - saídas)
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

    // Ordenar por saldo total (decrescente)
    return groups.sort((a, b) => b.totalBalance - a.totalBalance);
  }, [filteredTransactions, accounts, previousBalances]);

  // Estado para controlar quais contas estão expandidas
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());

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
    <View style={[styles.container]}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goToPreviousMonth}>
          <Icon source="chevron-left" size={24} />
        </TouchableOpacity>
        <Text style={[styles.monthText]}>{`${dayjs(currentDate).format('MMMM/YYYY')}`}</Text>
        <TouchableOpacity onPress={goToNextMonth}>
          <Icon source="chevron-right" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView style={[styles.scrollArea]} showsVerticalScrollIndicator={false}>
        {/* Lista de Contas (Nova Hierarquia) */}
        <Text style={[styles.sectionTitle]}>Contas</Text>
        <DataTable>
          {accountTransactionGroups.map((group) => {
            const isExpanded = expandedAccounts.has(group.accountId);

            return (
              <View key={group.accountId}>
                {/* Nível 1: Cabeçalho da Conta */}
                <DataTable.Row onPress={() => toggleAccountExpansion(group.accountId)}>
                  <DataTable.Cell>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {/* Logo do banco ou círculo colorido */}
                      {(() => {
                        // Encontrar a conta para obter logoUrl e bankCode
                        const account = accounts.find(acc => acc.id === group.accountId);
                        let logoUrl = '';

                        if (account?.logoUrl) {
                          // Logo local (require) - usar diretamente
                          return (
                            <Image
                              source={typeof account.logoUrl === 'string' ? { uri: account.logoUrl } : account.logoUrl}
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: 12,
                                marginRight: 8,
                              }}
                            />
                          );
                        }

                        if (account?.bankCode && account.bankCode.trim() !== '') {
                          const bank = BankService.getBankByCode(account.bankCode);
                          if (bank) {
                            return (
                              <Image
                                source={bank.logoUrl}
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: 12,
                                  marginRight: 8,
                                }}
                              />
                            );
                          }
                        }

                        if (logoUrl && logoUrl.trim() !== '') {
                          return (
                            <Image
                              source={{ uri: logoUrl }}
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: 12,
                                marginRight: 8,
                              }}
                              onError={() => {
                                // Fallback para círculo colorido se o logo não carregar
                                return (
                                  <View style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: 12,
                                    backgroundColor: group.accountColor,
                                    marginRight: 8,
                                  }} />
                                );
                              }}
                            />
                          );
                        }

                        // Fallback para círculo colorido
                        return (
                          <View style={{
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            backgroundColor: group.accountColor,
                            marginRight: 8,
                          }} />
                        );
                      })()}
                      <Text style={{ fontWeight: 'bold' }}>{group.accountName}</Text>
                    </View>
                  </DataTable.Cell>
                  <DataTable.Cell>
                    <Icon
                      source={isExpanded ? "chevron-up" : "chevron-down"}
                      size={16}
                    />
                  </DataTable.Cell>
                  <DataTable.Cell numeric>
                    <Text style={{ fontWeight: 'bold', fontSize: 14 }}>R$ {group.totalBalance.toFixed(2)}</Text>
                  </DataTable.Cell>
                </DataTable.Row>

                {/* Nível 2: Conteúdo Expandido da Conta */}
                {isExpanded && (
                  <>
                    {/* Nível 2: Saldo Anterior */}
                    {group.previousBalance !== 0 && (
                      <DataTable.Row key={`initial-balance-${group.accountId}`}>
                        <DataTable.Cell style={{ maxWidth: 70, paddingLeft: 10 }}>
                          <Icon source="history" size={16} />
                        </DataTable.Cell>
                        <DataTable.Cell style={{ paddingLeft: 10 }}>
                          <Text style={{ opacity: 0.6, fontStyle: 'italic' }}>Saldo Inicial do Mês</Text>
                        </DataTable.Cell>
                        <DataTable.Cell numeric>
                          <Text style={{ opacity: 0.6, fontStyle: 'italic' }}>R$ {group.previousBalance.toFixed(2)}</Text>
                        </DataTable.Cell>
                      </DataTable.Row>
                    )}

                    {/* Nível 3: Bloco de Entradas */}
                    {group.income.transactions.length > 0 && (
                      <>
                        <DataTable.Row key={`income-header-${group.accountId}`}>
                          <DataTable.Cell style={{ maxWidth: 70, paddingLeft: 10 }}>
                            <Icon source="arrow-up-bold-circle" size={16} color="#2E9E57" />
                          </DataTable.Cell>
                          <DataTable.Cell style={{ paddingLeft: 20 }}>
                            <Text style={{ color: '#2E9E57', fontWeight: '600' }}>Entradas</Text>
                          </DataTable.Cell>
                          <DataTable.Cell numeric>
                            <Text style={{ color: '#2E9E57', fontWeight: '600' }}>R$ {group.income.total.toFixed(2)}</Text>
                          </DataTable.Cell>
                        </DataTable.Row>

                        {/* Nível 4: Transações de Entrada */}
                        {group.income.transactions.map((item) => (
                          <DataTable.Row key={item.id} onLongPress={() => openTransactionForm(item)}>
                            <DataTable.Cell style={{ paddingLeft: 10 }}>
                              <TransactionItem transaction={item} onLongPress={() => openTransactionForm(item)} />
                            </DataTable.Cell>
                          </DataTable.Row>
                        ))}
                      </>
                    )}

                    {/* Nível 3: Bloco de Saídas */}
                    {group.expense.transactions.length > 0 && (
                      <>
                        <DataTable.Row key={`expense-header-${group.accountId}`}>
                          <DataTable.Cell style={{ maxWidth: 70, paddingLeft: 10 }}>
                            <Icon source="arrow-down-bold-circle" size={16} color="#CC4A4A" />
                          </DataTable.Cell>
                          <DataTable.Cell style={{ paddingLeft: 20 }}>
                            <Text style={{ color: '#CC4A4A', fontWeight: '600' }}>Saídas</Text>
                          </DataTable.Cell>
                          <DataTable.Cell numeric>
                            <Text style={{ color: '#CC4A4A', fontWeight: '600' }}>R$ {group.expense.total.toFixed(2)}</Text>
                          </DataTable.Cell>
                        </DataTable.Row>

                        {/* Nível 4: Transações de Saída */}
                        {group.expense.transactions.map((item) => (
                          <DataTable.Row key={item.id} onLongPress={() => openTransactionForm(item)}>
                            <DataTable.Cell style={{ paddingLeft: 10 }}>
                              <TransactionItem transaction={item} onLongPress={() => openTransactionForm(item)} />
                            </DataTable.Cell>
                          </DataTable.Row>
                        ))}
                      </>
                    )}
                  </>
                )}
              </View>
            );
          })}

          {/* Totais Gerais */}
          <DataTable.Row key={`total-summary`}>
            <DataTable.Cell>
              <Text style={{ fontWeight: 'bold' }}>TOTAL GERAL</Text>
            </DataTable.Cell>
            <DataTable.Cell numeric>
              <Text style={{ fontWeight: 'bold' }}>R$ {totals.balance.toFixed(2)}</Text>
            </DataTable.Cell>
          </DataTable.Row>
        </DataTable>

        {/* Cartões - TODO: Implementar quando tiver lógica de cartão de crédito */}
        <Text style={[styles.sectionTitle]}>Cartão de crédito</Text>
        <DataTable>
          <DataTable.Header>
            <DataTable.Title style={{ maxWidth: 70 }}><Text>Data</Text></DataTable.Title>
            <DataTable.Title><Text>Descrição</Text></DataTable.Title>
            <DataTable.Title numeric><Text>Valor</Text></DataTable.Title>
          </DataTable.Header>
          <DataTable.Row key={`noCreditCards`}>
            <DataTable.Cell>
              <Text style={{ opacity: 0.7, textAlign: 'center' }}>Funcionalidade em desenvolvimento</Text>
            </DataTable.Cell>
            <DataTable.Cell><Text>{""}</Text></DataTable.Cell>
            <DataTable.Cell numeric><Text>{""}</Text></DataTable.Cell>
          </DataTable.Row>
          <DataTable.Row key={`totalCredits`}>
            <DataTable.Cell>
              <Text>TOTAL</Text>
            </DataTable.Cell>
            <DataTable.Cell numeric><Text style={{ fontWeight: 'bold' }}> R$ 0,00 </Text></DataTable.Cell>
          </DataTable.Row>
        </DataTable>

        <SummaryFooter
          currentDate={currentDate}
          isFutureMonth={isFutureMonth}
        />

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB para adicionar nova transação */}
      <TouchableOpacity onPress={() => openTransactionForm()} style={styles.fab}>
        <Icon source="plus" size={24} color="#fff" />
      </TouchableOpacity>
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

// Função para filtrar transações por mês/ano
const filterTransactionsByMonth = (transactions: Transaction[], date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();

  return transactions.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    return transactionDate.getFullYear() === year && transactionDate.getMonth() === month;
  });
};

// Função para calcular totais
const calculateTotals = (transactions: Transaction[]) => {
  let totalIncome = 0;
  let totalExpense = 0;

  transactions.forEach(transaction => {
    if (transaction.type === 'income') {
      totalIncome += transaction.amount;
    } else if (transaction.type === 'expense') {
      totalExpense += transaction.amount;
    }
  });

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense
  };
};

// Configuração do withObservables
const enhance = withObservables([], () => ({
  transactions: database.get<Transaction>('transactions')
    .query(
      Q.sortBy('date', Q.desc)
    )
    .observe(),
  accounts: AccountService.observeAccounts(),
  categories: CategoryService.observeCategories(),
}));
export default enhance(MonthlyControlScreen);