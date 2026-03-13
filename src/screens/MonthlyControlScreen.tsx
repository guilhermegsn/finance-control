import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from "dayjs";
import React, { useState, useMemo, useEffect } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Image } from "react-native";
import { DataTable, Icon, Portal, Modal, Button, TextInput, Divider, Menu, Switch, HelperText } from "react-native-paper";
import { withObservables } from '@nozbe/watermelondb/react';
import { TransactionService } from '../service/TransactionService';
import { AccountService } from '../service/AccountService';
import { CategoryService } from '../service/CategoryService';
import Transaction from '../models/Transactions';
import { Q } from '@nozbe/watermelondb';
import { database } from '../database';
import { useAuth } from '../contexts/AuthContext';
import BankService from '../service/BankService';

// Tipos
interface Params {
  id: string, description: string, value: string, date: Date,
  startDate?: Date | null, endDate?: Date | null,
  type: 'income' | 'expense' | null, isRecurrence: boolean, installments?: string,
  // Campos de recorrência
  isRecurring?: boolean,
  recurringEndDate?: Date | null
}

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
  const [activePicker, setActivePicker] = useState<'date' | 'startDate' | 'endDate' | 'recurringEndDate' | null>(null);
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
  const [previousBalances, setPreviousBalances] = useState<Record<string, number>>({});

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
        isRecurring: false, // Transações existentes não são editadas como recorrentes
        recurringEndDate: null,
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
        isRecurring: false, // Por padrão não é recorrente
        recurringEndDate: null,
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
      // Campos de recorrência (apenas para criação, não para edição)
      isRecurring: params.isRecurring || false,
      recurringEndDate: params.isRecurring ? params.recurringEndDate || undefined : undefined,
    };

    try {
      if (selectedTransaction) {
        // Para edição, não enviamos campos de recorrência
        const updateData = {
          accountId: transactionData.accountId,
          categoryId: transactionData.categoryId,
          description: transactionData.description,
          amount: transactionData.amount,
          type: transactionData.type,
          date: transactionData.date,
        };
        await TransactionService.update(selectedTransaction.id, updateData);
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
        {/* Lista de Contas (Nova Hierarquia) */}
        <Text style={styles.sectionTitle}>Contas</Text>
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
                      color="#666"
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
                          <Icon source="history" size={16} color="#666" />
                        </DataTable.Cell>
                        <DataTable.Cell style={{ paddingLeft: 10 }}>
                          <Text style={{ color: '#666', fontStyle: 'italic' }}>Saldo Inicial do Mês</Text>
                        </DataTable.Cell>
                        <DataTable.Cell numeric>
                          <Text style={{ color: '#666', fontStyle: 'italic' }}>R$ {group.previousBalance.toFixed(2)}</Text>
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
                          <DataTable.Row key={item.id} onLongPress={() => openModal(item)}>
                            <DataTable.Cell style={{ maxWidth: 70, paddingLeft: 10 }}>
                              {dayjs(item.date).format('DD/MM')}
                            </DataTable.Cell>
                            <DataTable.Cell style={{ paddingLeft: 40 }}>{item.description}</DataTable.Cell>
                            <DataTable.Cell numeric>R$ {item.amount.toFixed(2)}</DataTable.Cell>
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
                          <DataTable.Row key={item.id} onLongPress={() => openModal(item)}>
                            <DataTable.Cell style={{ maxWidth: 70, paddingLeft: 10 }}>
                              {dayjs(item.date).format('DD/MM')}
                            </DataTable.Cell>
                            <DataTable.Cell style={{ paddingLeft: 40 }}>{item.description}</DataTable.Cell>
                            <DataTable.Cell numeric>R$ {item.amount.toFixed(2)}</DataTable.Cell>
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

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB para adicionar nova transação */}
      <TouchableOpacity onPress={() => openModal()} style={styles.fab}>
        <Icon source="plus" size={24} color="#fff" />
      </TouchableOpacity>

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

              {/* Controle de Recorrência */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={{ fontSize: 16 }}>Esta transação é recorrente?</Text>
                <Switch
                  value={params.isRecurring || false}
                  onValueChange={(value) => setParams(prev => ({ ...prev, isRecurring: value }))}
                  disabled={isDeleting || !!selectedTransaction}
                />
              </View>

              {/* Data Final da Recorrência (condicional) */}
              {params.isRecurring && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ marginLeft: 5, marginBottom: 4 }}>Data Final da Recorrência (opcional)</Text>
                  <Button
                    mode="contained-tonal"
                    onPress={() => setActivePicker('recurringEndDate')}
                    style={{ marginBottom: 8 }}
                  >
                    {params.recurringEndDate 
                      ? params.recurringEndDate.toLocaleDateString('pt-BR')
                      : 'Selecionar data final'
                    }
                  </Button>
                  <HelperText type="info" visible={true}>
                    Se não definir uma data final, a recorrência será criada para os próximos 2 anos
                  </HelperText>
                </View>
              )}

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
