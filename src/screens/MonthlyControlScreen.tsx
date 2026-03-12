import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from "dayjs";
import React, { useEffect, useState, useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { DataTable, Icon, Portal, Modal, Button, TextInput, Checkbox, Divider, Menu } from "react-native-paper";
import { withObservables } from '@nozbe/watermelondb/react';
import { TransactionService } from '../service/TransactionService';
import { AccountService } from '../service/AccountService';
import { CategoryService } from '../service/CategoryService';
import Transaction from '../models/Transactions';
import { Q } from '@nozbe/watermelondb';
import { database } from '../database';
import { useAuth } from '../contexts/AuthContext';

// Tipos
interface Params {
  id: string, description: string, value: string, date: Date,
  startDate?: Date | null, endDate?: Date | null,
  type: 'income' | 'expense' | null, isRecurrence: boolean, installments?: string
}

interface GroupedTransaction {
  accountId: string;
  accountName: string;
  accountColor: string;
  total: number;
  transactions: Transaction[];
}

interface MonthlyControlScreenProps {
  transactions: Transaction[];
  accounts: any[];
  categories: any[];
}

function MonthlyControlScreen({ transactions, accounts, categories }: MonthlyControlScreenProps) {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activePicker, setActivePicker] = useState<'date' | 'startDate' | 'endDate' | null>(null);
  const [expandedIncomeAccounts, setExpandedIncomeAccounts] = useState<Set<string>>(new Set());
  const [expandedExpenseAccounts, setExpandedExpenseAccounts] = useState<Set<string>>(new Set());

  const [params, setParams] = useState<Params>({
    id: '',
    description: '',
    value: '',
    date: new Date(),
    type: null,
    isRecurrence: false,
  });
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [accountMenuVisible, setAccountMenuVisible] = useState(false);
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);

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

  const openModal = (transaction?: Transaction) => {
    if (transaction) {
      setSelectedTransaction(transaction);
      setParams({
        id: transaction.id,
        description: transaction.description,
        value: transaction.amount.toString(),
        date: new Date(transaction.date),
        type: transaction.type,
        isRecurrence: false,
      });
      // TODO: Preencher conta e categoria da transação
    } else {
      setSelectedTransaction(null);
      setParams({
        id: '',
        description: '',
        value: '',
        date: new Date(),
        type: null,
        isRecurrence: false,
      });
      // Selecionar primeira conta e categoria por padrão
      if (accounts.length > 0) {
        setSelectedAccountId(accounts[0].id);
      }
      if (categories.length > 0) {
        // Filtrar categorias pelo tipo quando o tipo for selecionado
        setSelectedCategoryId(categories[0].id);
      }
    }
    setIsDeleting(false);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedTransaction(null);
    setIsDeleting(false);
    setActivePicker(null);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate && activePicker) {
      setParams(prev => ({ ...prev, [activePicker]: selectedDate }));
    }
    setActivePicker(null);
  };

  const selectType = (type: 'income' | 'expense') => {
    setParams(prev => ({ ...prev, type }));
  };

  const isInvalidForm = () => {
    return !params.description.trim() || !params.value.trim() || !params.type || !params.date;
  };

  const handleSave = async () => {
    if (!user || !params.type) return;

    const amount = parseFloat(params.value);
    if (isNaN(amount)) return;

    // Usar categoria selecionada ou primeira categoria do tipo correto
    const filteredCategories = categories.filter(cat => cat.type === params.type);
    const categoryId = selectedCategoryId ||
      (filteredCategories.length > 0 ? filteredCategories[0].id :
        (categories.length > 0 ? categories[0].id : ''));

    const transactionData = {
      accountId: selectedAccountId || (accounts.length > 0 ? accounts[0].id : ''),
      categoryId: categoryId,
      description: params.description,
      amount: amount,
      type: params.type,
      date: params.date,
      userId: user.id,
    };

    try {
      if (selectedTransaction) {
        await TransactionService.update(selectedTransaction.id, transactionData);
      } else {
        await TransactionService.create(transactionData);
      }
      closeModal();
    } catch (error) {
      console.error('Erro ao salvar transação:', error);
    }
  };

  const handleDelete = async () => {
    if (selectedTransaction) {
      try {
        await TransactionService.delete(selectedTransaction.id);
        closeModal();
      } catch (error) {
        console.error('Erro ao excluir transação:', error);
      }
    }
  };

  // Funções para alternar expansão de conta por tipo
  const toggleIncomeAccountExpansion = (accountId: string) => {
    const newExpanded = new Set(expandedIncomeAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedIncomeAccounts(newExpanded);
  };

  const toggleExpenseAccountExpansion = (accountId: string) => {
    const newExpanded = new Set(expandedExpenseAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedExpenseAccounts(newExpanded);
  };

  // Filtrar transações pelo mês atual
  const filteredTransactions = filterTransactionsByMonth(transactions, currentDate);

  // Separar transações por tipo
  const incomeTransactions = filteredTransactions.filter(t => t.type === 'income');
  const expenseTransactions = filteredTransactions.filter(t => t.type === 'expense');

  // Agrupar transações por tipo e conta
  const groupedIncomeTransactions = useMemo(() => {
    return groupTransactionsByAccount(incomeTransactions, accounts);
  }, [incomeTransactions, accounts]);

  const groupedExpenseTransactions = useMemo(() => {
    return groupTransactionsByAccount(expenseTransactions, accounts);
  }, [expenseTransactions, accounts]);

  // Calcular totais
  const totals = calculateTotals(filteredTransactions);

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goToPreviousMonth}>
          <Icon source="chevron-left" size={24} />
        </TouchableOpacity>
        <Text style={styles.monthText}>{`${dayjs(currentDate).format('MMMM/YYYY')}`}</Text>
        <TouchableOpacity onPress={goToNextMonth}>
          <Icon source="chevron-right" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        {/* Entradas */}
        <Text style={styles.sectionTitle}>Entradas</Text>
        <DataTable>
          {/* <DataTable.Header>
            <DataTable.Title style={{ maxWidth: 70 }}>Data</DataTable.Title>
            <DataTable.Title>Descrição</DataTable.Title>
            <DataTable.Title numeric>Valor</DataTable.Title>
          </DataTable.Header> */}

          {groupedIncomeTransactions.map((group) => (
            <View key={group.accountId}>
              {/* Cabeçalho da conta */}
              <DataTable.Row onPress={() => toggleIncomeAccountExpansion(group.accountId)}>
                <DataTable.Cell>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: group.accountColor,
                      marginRight: 8
                    }} />
                    <Text style={{ fontWeight: 'bold' }}>{group.accountName}</Text>
                  </View>
                </DataTable.Cell>
                <DataTable.Cell>
                  <Icon
                    source={expandedIncomeAccounts.has(group.accountId) ? "chevron-up" : "chevron-down"}
                    size={16}
                    color="#666"
                  />
                </DataTable.Cell>
                <DataTable.Cell numeric>
                  <Text style={{ fontWeight: 'bold' }}>R$ {group.total.toFixed(2)}</Text>
                </DataTable.Cell>
              </DataTable.Row>

              {/* Transações da conta (se expandida) */}
              {expandedIncomeAccounts.has(group.accountId) && group.transactions.map((item) => (
                <DataTable.Row key={item.id} onLongPress={() => openModal(item)}>
                  <DataTable.Cell style={{ maxWidth: 70, paddingLeft: 20 }}>
                    {dayjs(item.date).format('DD/MM')}
                  </DataTable.Cell>
                  <DataTable.Cell style={{ paddingLeft: 20 }}>{item.description}</DataTable.Cell>
                  <DataTable.Cell numeric>R$ {item.amount.toFixed(2)}</DataTable.Cell>
                </DataTable.Row>
              ))}
            </View>
          ))}

          <DataTable.Row key={`totalEntries`}>
            <DataTable.Cell>TOTAL</DataTable.Cell>
            <DataTable.Cell numeric><Text style={{ fontWeight: 'bold' }}> R$ {totals.totalIncome.toFixed(2)} </Text></DataTable.Cell>
          </DataTable.Row>
        </DataTable>

        {/* Saídas */}
        <Text style={styles.sectionTitle}>Saídas à vista</Text>
        <DataTable>
          {/* <DataTable.Header>
            <DataTable.Title style={{ maxWidth: 70 }} >Data</DataTable.Title>
            <DataTable.Title>Descrição</DataTable.Title>
            <DataTable.Title numeric>Valor</DataTable.Title>
          </DataTable.Header> */}

          {groupedExpenseTransactions.map((group) => (
            <View key={group.accountId}>
              {/* Cabeçalho da conta */}
              <DataTable.Row onPress={() => toggleExpenseAccountExpansion(group.accountId)}>
                <DataTable.Cell>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: group.accountColor,
                      marginRight: 8
                    }} />
                    <Text style={{ fontWeight: 'bold' }}>{group.accountName}</Text>
                  </View>
                </DataTable.Cell>
                <DataTable.Cell>
                  <Icon
                    source={expandedExpenseAccounts.has(group.accountId) ? "chevron-up" : "chevron-down"}
                    size={16}
                    color="#666"
                  />
                </DataTable.Cell>
                <DataTable.Cell numeric>
                  <Text style={{ fontWeight: 'bold' }}>R$ {group.total.toFixed(2)}</Text>
                </DataTable.Cell>
              </DataTable.Row>

              {/* Transações da conta (se expandida) */}
              {expandedExpenseAccounts.has(group.accountId) && group.transactions.map((item) => (
                <DataTable.Row key={item.id} onLongPress={() => openModal(item)}>
                  <DataTable.Cell style={{ maxWidth: 70, paddingLeft: 20 }}>
                    {dayjs(item.date).format('DD/MM')}
                  </DataTable.Cell>
                  <DataTable.Cell style={{ paddingLeft: 20 }}>{item.description}</DataTable.Cell>
                  <DataTable.Cell numeric>R$ {item.amount.toFixed(2)}</DataTable.Cell>
                </DataTable.Row>
              ))}
            </View>
          ))}

          <DataTable.Row key={`totalExpenses`}>
            <DataTable.Cell>TOTAL</DataTable.Cell>
            <DataTable.Cell numeric><Text style={{ fontWeight: 'bold' }}> R$ {totals.totalExpense.toFixed(2)} </Text></DataTable.Cell>
          </DataTable.Row>
        </DataTable>

        {/* Cartões - TODO: Implementar quando tiver lógica de cartão de crédito */}
        <Text style={styles.sectionTitle}>Cartão de crédito</Text>
        <DataTable>
          <DataTable.Header>
            <DataTable.Title style={{ maxWidth: 70 }} >Data</DataTable.Title>
            <DataTable.Title>Descrição</DataTable.Title>
            <DataTable.Title numeric>Valor</DataTable.Title>
          </DataTable.Header>
          <DataTable.Row key={`noCreditCards`}>
            <DataTable.Cell>
              <Text style={{ color: '#666', textAlign: 'center' }}>Funcionalidade em desenvolvimento</Text>
            </DataTable.Cell>
            <DataTable.Cell><Text></Text></DataTable.Cell>
            <DataTable.Cell numeric><Text></Text></DataTable.Cell>
          </DataTable.Row>
          <DataTable.Row key={`totalCredits`}>
            <DataTable.Cell>TOTAL</DataTable.Cell>
            <DataTable.Cell numeric><Text style={{ fontWeight: 'bold' }}> R$ 0,00 </Text></DataTable.Cell>
          </DataTable.Row>
        </DataTable>

        <View style={{ height: 130 }} />
      </ScrollView>

      {/* RESUMO FIXO */}
      <View style={styles.summaryContainer}>
        <View style={styles.gradientLayer} />
        <View>
          <View style={{ flexDirection: 'row' }}>
            <Text style={styles.summaryText}>Saldo parcial: </Text>
            <Text style={styles.summaryTextBold}> R$ {totals.balance.toFixed(2)}</Text>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <Text style={styles.summaryText}>Saldo Total:</Text>
            <Text style={styles.summaryText}> R$ {totals.balance.toFixed(2)}</Text>
          </View>
        </View>

        <TouchableOpacity onPress={() => openModal()} style={styles.fab}>
          <Icon source="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={closeModal}
          contentContainerStyle={{ backgroundColor: 'white', margin: 20, borderRadius: 12, padding: 16 }}
        >
          {params.type === null ?
            <View style={{ gap: 12 }}>
              <Button
                mode="contained"
                buttonColor="#2E9E57"
                onPress={() => selectType('income')}
                style={{ marginBottom: 8 }}
              >
                Entrada
              </Button>
              <Button
                mode="contained"
                buttonColor="#CC4A4A"
                onPress={() => selectType('expense')}
              >
                Saída - À vista
              </Button>
            </View>
            :
            <View>
              {activePicker && (
                <DateTimePicker
                  value={params[activePicker] || new Date()}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                />
              )}

              <View>
                <Text style={{ fontSize: 20, marginBottom: 16 }}>
                  {selectedTransaction ? 'Editando transação' : 'Adicionando nova transação'}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                <View style={{ width: '48%' }}>
                  <Text style={{ marginLeft: 5, marginBottom: 4 }}>Transação</Text>
                  <Button
                    mode="contained-tonal"
                    onPress={() => setParams((prevParams) => ({ ...prevParams, type: null }))}
                    style={{ marginBottom: 16 }}
                  >
                    {params.type === 'income' ? 'Receita' : 'Despesa'}
                  </Button>
                </View>
                <View style={{ width: '48%' }}>
                  <Text style={{ marginLeft: 5, marginBottom: 4 }}>Data</Text>
                  <Button
                    mode="contained-tonal"
                    onPress={() => setActivePicker('date')}
                    style={{ marginBottom: 16 }}
                  >
                    {params?.date?.toLocaleDateString('pt-BR')}
                  </Button>
                </View>
              </View>

              {/* Seletor de Conta */}
              <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                <View style={{ width: '48%' }}>
                  <Text style={{ marginLeft: 5, marginBottom: 4 }}>Conta</Text>
                  <Menu
                    visible={accountMenuVisible}
                    onDismiss={() => setAccountMenuVisible(false)}
                    anchor={
                      <Button
                        mode="contained-tonal"
                        onPress={() => setAccountMenuVisible(true)}
                        style={{ justifyContent: 'space-between' }}
                      >
                        {accounts.find(acc => acc.id === selectedAccountId)?.name || 'Selecionar conta'}
                      </Button>
                    }
                  >
                    {accounts.map((account) => (
                      <Menu.Item
                        key={account.id}
                        onPress={() => {
                          setSelectedAccountId(account.id);
                          setAccountMenuVisible(false);
                        }}
                        title={account.name}
                        style={{ flexDirection: 'row', alignItems: 'center' }}
                      />
                    ))}
                  </Menu>
                </View>

                {/* Seletor de Categoria */}
                <View style={{ marginBottom: 16, width: '48%' }}>
                  <Text style={{ marginLeft: 5, marginBottom: 4 }}>Categoria</Text>
                  <Menu
                    visible={categoryMenuVisible}
                    onDismiss={() => setCategoryMenuVisible(false)}
                    anchor={
                      <Button
                        mode="contained-tonal"
                        onPress={() => setCategoryMenuVisible(true)}
                        style={{ justifyContent: 'space-between' }}
                      >
                        {categories.find(cat => cat.id === selectedCategoryId)?.name || 'Selecionar categoria'}
                      </Button>
                    }
                  >
                    {categories
                      .filter(cat => !params.type || cat.type === params.type)
                      .map((category) => (
                        <Menu.Item
                          key={category.id}
                          onPress={() => {
                            setSelectedCategoryId(category.id);
                            setCategoryMenuVisible(false);
                          }}
                          title={category.name}
                          style={{ flexDirection: 'row', alignItems: 'center' }}
                        />
                      ))}
                  </Menu>
                </View>
              </View>

              <TextInput
                label="Descrição"
                value={params.description}
                onChangeText={(text) => setParams(prev => ({ ...prev, description: text }))}
                keyboardType="default"
                mode="outlined"
                style={{ marginBottom: 16 }}
                disabled={isDeleting}
              />
              <TextInput
                label="Valor"
                value={params.value}
                onChangeText={(text) => setParams(prev => ({ ...prev, value: text }))}
                keyboardType="numeric"
                mode="outlined"
                style={{ marginBottom: 16 }}
                disabled={isDeleting}
              />

              {selectedTransaction && !isDeleting && (
                <Button
                  mode="contained"
                  onPress={() => { setIsDeleting(true) }}
                  buttonColor="#A50C36"
                  style={{ marginTop: 20 }}
                >
                  Excluir
                </Button>
              )}

              {isDeleting &&
                <View style={styles.confirmDel}>
                  <Text style={styles.textWarning}>Confirma a exclusão? </Text>
                  <Text style={styles.textWarning}>Esta operação não poderá ser desfeita.</Text>
                </View>
              }
            </View>
          }

          <Divider style={{ marginTop: 20 }} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
            <View style={{ width: params.type ? '48%' : '100%' }}>
              <Button mode="outlined" onPress={closeModal}>Cancelar</Button>
            </View>
            {params.type && (
              <View style={{ width: '48%' }}>
                {isDeleting ?
                  <Button onPress={handleDelete} mode="contained" buttonColor="#A50C36">Excluir</Button> :
                  <Button mode="contained" onPress={handleSave} disabled={isInvalidForm()}>Salvar</Button>
                }
              </View>
            )}
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 16 },
  confirmDel: { backgroundColor: '#FFB86A', padding: 14 },
  monthText: { fontSize: 18, fontWeight: "bold", textTransform: "capitalize" },
  scrollArea: { flex: 1 },
  textWarning: { fontSize: 16, color: "#A50C36" },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginTop: 20, marginBottom: 8 },
  summaryContainer: { position: "absolute", backgroundColor: '#fff', left: 0, right: 0, bottom: 0, borderTopWidth: 1, borderColor: "#ddd", flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14 },
  summaryText: { fontSize: 14, marginVertical: 2 },
  summaryTextBold: { fontSize: 14, marginVertical: 2, fontWeight: 'bold' },
  fab: { backgroundColor: "#007bff", borderRadius: 50, width: 56, height: 56, justifyContent: "center", alignItems: "center", elevation: 5 },
  gradientLayer: { position: 'absolute', top: -30, left: 0, right: 0, height: 30, backgroundColor: 'rgba(255, 255, 255, 0.7)', zIndex: 1 },
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

// Função para agrupar transações por conta
const groupTransactionsByAccount = (transactions: Transaction[], accounts: any[]): GroupedTransaction[] => {
  const accountMap = new Map<string, GroupedTransaction>();

  // Inicializar mapa com todas as contas
  accounts.forEach(account => {
    accountMap.set(account.id, {
      accountId: account.id,
      accountName: account.name,
      accountColor: account.color,
      total: 0,
      transactions: []
    });
  });

  // Agrupar transações por conta
  transactions.forEach(transaction => {
    // @ts-ignore - WatermelonDB usa esta sintaxe para relacionamentos
    const accountId = transaction._raw?.account_id;
    if (accountId && accountMap.has(accountId)) {
      const group = accountMap.get(accountId)!;
      group.transactions.push(transaction);
      group.total += transaction.amount;
    }
  });

  // Filtrar apenas contas que têm transações e ordenar por total (decrescente)
  return Array.from(accountMap.values())
    .filter(group => group.transactions.length > 0)
    .sort((a, b) => b.total - a.total);
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
