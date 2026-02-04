import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from "dayjs";
import React, { useEffect, useState } from "react";
import { Alert, AlertButton, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Button, Checkbox, DataTable, Divider, Icon, Modal, Portal, TextInput } from "react-native-paper";
import { WinButton } from "../components/WinButton";
import { deleteItem, getItemById, insertItem, updateItem } from "../database/realmHelpers";
import { TransactionRepository } from "../database/TransactionRepository";
import { Credit } from "../interface/Credit";
import { RecurringTransaction, Type } from "../interface/RecurringTransaction";
import { Transaction, TransactionType } from "../interface/Transaction";
import { generateRandomId, getMonthName } from "../service/function";

// Tipos
type DateType = 'startDate' | 'endDate' | 'date' | null
type Operation = 'add' | 'editAll' | 'editOnlyMonth' | 'editUnique' | 'editCredit' | 'editOverride' | null
interface Params {
  id: string, description: string, value: string, date: Date,
  startDate?: Date | null, endDate?: Date | null,
  type: TransactionType | null, isRecurrence: boolean, installments?: string
}

export default function MonthlyControlScreen() {

  const now = new Date();
  const todayMonth = now.getUTCMonth();
  const todayYear = now.getUTCFullYear();
  const [currentDate, setCurrentDate] = useState(new Date());

  const currentMonth = currentDate.getUTCMonth() + 1;
  const currentYear = currentDate.getUTCFullYear();

  const [transactions, setTransactions] = useState<any>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<any>({});
  const [operation, setOperation] = useState<Operation>(null);
  const [emptyParams] = useState<Params>({
    id: '', description: '', value: '', date: new Date(),
    startDate: null, endDate: null, type: null, isRecurrence: false, installments: "1"
  });
  const [params, setParams] = useState(emptyParams);
  const [activePicker, setActivePicker] = useState<DateType>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Lógica original para data segura
  const safeStartDay = selectedTransaction?.startDate ?
    Math.min(selectedTransaction?.startDate.getDate(), new Date(currentYear, currentMonth, 0).getDate()) :
    new Date().getDate();

  const isPast = currentYear < todayYear || (currentYear === todayYear && (currentMonth - 1) < todayMonth);

  // --- CARREGAMENTO (Usando Repository) ---
  const loadTransactions = async (date: Date) => {
    const month = date.getUTCMonth();
    const year = date.getUTCFullYear();
    const data = TransactionRepository.getTransactionsByMonth(month, year);
    setTransactions(data);
  };

  useEffect(() => {
    loadTransactions(currentDate);
  }, [currentDate]);

  const goToPreviousMonth = () => {
    const prev = new Date(currentDate);
    prev.setMonth(prev.getUTCMonth() - 1);
    setCurrentDate(prev);
    // loadTransactions chamado pelo useEffect
  };

  const goToNextMonth = () => {
    const next = new Date(currentDate);
    next.setMonth(next.getUTCMonth() + 1);
    setCurrentDate(next);
  };

  // --- ACTIONS (SAVE / EDIT / DELETE) ---
  const edit = async (transaction: any, operation?: Operation) => {
    if (operation) setOperation(operation);

    let schema = 'Transaction';
    if (transaction.isRecurrence) schema = 'RecurringTransaction';
    else if (transaction.type === 'credit') schema = 'Credit';
    else if (transaction.parentId) schema = 'Override';

    const data = getItemById(schema, transaction._id);

    if (data) {
      setSelectedTransaction(schema == 'Credit' ? { ...data, type: 'credit' } : data);
      setParams({
        id: data._id,
        description: data.description,
        value: data.value.toString(),
        date: operation === 'editOnlyMonth' ?
          new Date(currentYear, currentMonth - 1, safeStartDay) : new Date(),
        // startDate/endDate: Mantém original para preencher o formulário corretamente
        startDate: transaction?.isRecurrence ? data.startDate : null,
        endDate: transaction?.isRecurrence ? data.endDate || null : null,
        type: schema === 'Credit' ? 'credit' : data.type,
        isRecurrence: transaction?.isRecurrence ? true : false,
        installments: data?.installments ? data.installments.toString() : "1"
      });
    }
  };

  const save = () => {
    try {
      // Chama o Repository passando os parâmetros e o mês atual (0-11)
      TransactionRepository.saveTransaction(params, operation, currentMonth - 1, currentYear);

      // Reseta estados da tela
      setOperation(null);
      setParams(emptyParams);
      
      // Recarrega a lista visual
      loadTransactions(currentDate);

    } catch (e) {
      console.error(e);
      Alert.alert("Erro", "Não foi possível salvar a transação.");
    }
  };
  // const del = (transaction: Transaction) => {
  //   console.log(transaction)
  //   if (params.isRecurrence) {
  //     deleteItem('RecurringTransaction', transaction._id);
  //     TransactionRepository.updateBalanceAfterTransaction(transaction, transaction, 'delete');
  //   } else if (transaction.type === 'credit') {
  //     console.log('excluindo credito')
  //     TransactionRepository.updateBalanceAfterTransaction(transaction, transaction, 'delete');
  //     deleteItem('Credit', transaction._id);
  //   } else {
  //     TransactionRepository.updateBalanceAfterTransaction(transaction, transaction, 'delete');
  //     deleteItem('Transaction', transaction._id);
  //   }
  //   loadTransactions(currentDate);
  //   closeModal();
  // };

  const del = (transaction: any) => {
    // 1. Delegamos a exclusão para o Repositório (que sabe lidar com Credit, Recurrence, etc)
    const result = TransactionRepository.deleteTransaction(transaction);

    if (!result.success) {
      // Caso a regra de negócio bloqueie (ex: recorrência antiga)
      Alert.alert("Não é possível excluir", result.error);
      return;
    }

    // 2. FORÇAMOS O RECÁLCULO DO SALDO DO MÊS
    // Isso garante que o saldo "Balance" no banco fique igual à soma das transações que restaram.
    // É muito mais seguro que tentar subtrair manualmente.
    TransactionRepository.recalculateBalanceForMonth(currentMonth - 1, currentYear); // Mês 0-11

    // 3. Atualiza a tela
    loadTransactions(currentDate);
    closeModal();
  };

  // const del = (transaction: any) => {
  //   console.log('excluindoi', transaction)
  //   // 1. Tenta deletar via Repository
  //   const result = TransactionRepository.deleteTransaction(transaction);
  //   console.log('result', result)

  //   if (!result.success) {
  //     // Se falhou (ex: regra de data da recorrência), avisa o usuário
  //     Alert.alert("Atenção", result.error);
  //     // Não fecha o modal para permitir que ele leia
  //     setIsDeleting(false);
  //     return;
  //   }

  //   // 2. Se deu certo, recalcula o saldo deste mês para garantir consistência
  //   // (Isso substitui o updateBalanceAfterTransaction manual e complexo)
  //   TransactionRepository.recalculateBalanceForMonth(currentMonth - 1, currentYear); // Passa mês 0-11

  //   // 3. Atualiza UI
  //   loadTransactions(currentDate);
  //   closeModal();
  // };

  // --- HELPERS UI ---
  const selecTransaction = (transaction: any) => {
    console.log(transaction)
    if (transaction._id === 'accumulatedBalance' || transaction._id === 'invoiceCredit') return;

    if (transaction?.isRecurrence) {
      const buttons: AlertButton[] = [
        { text: 'Cancelar', onPress: () => setParams(emptyParams), style: 'cancel' },
        { text: 'Editar somente este mês', onPress: () => edit(transaction, 'editOnlyMonth') },
      ];
      if (!isPast) {
        buttons.push({ text: 'Editar sequência', onPress: () => edit(transaction, 'editAll') });
      }
      Alert.alert('Editar Transação recorrente', 'Como deseja editar?', buttons);
    } else if (transaction.parentId) {
      edit(transaction, 'editOverride');
    } else {
      console.log('oi')
      if (transaction.type === 'credit')
        edit(transaction, 'editCredit');
      else
        edit(transaction, 'editUnique');
    }
  };

  const add = () => {
    if ((currentYear !== todayYear) || ((currentMonth - 1) !== todayMonth)) {
      setActivePicker('date');
    }
    setOperation('add');
  };

  const handleDateChange = (event: any, selectedDate: Date | undefined) => {
    const currentDate = selectedDate || params[activePicker!];
    if (currentDate) {
      const correctedDate = new Date(currentDate.setHours(0, 0, 0, 0));
      setParams(prevData => ({ ...prevData, [activePicker!]: correctedDate }));
      setActivePicker(null);
    }
  };

  const selectType = (type: Type) => {
    setParams(p => ({
      ...p,
      type: type,
      date: (currentYear !== todayYear) || (currentMonth - 1 !== todayMonth) ?
        new Date(currentYear, (currentMonth - 1), 1) : new Date()
    }));
  };

  const closeModal = () => {
    setOperation(null);
    setTimeout(() => {
      setParams(emptyParams);
      setIsDeleting(false);
    }, 300);
    setActivePicker(null);
  };

  const isInvalisForm = () => {
    return !params.description || !params.value || !params.date || isNaN(parseFloat(params.value));
  };

  // --- CÁLCULOS TOTAIS DA VIEW ---
  const entries = transactions.filter((t: Transaction) => t.type === 'income')
    .sort((a: any, b: any) => a.date.getTime() - b.date.getTime());
  const expenses = transactions.filter((t: Transaction) => t.type === 'expense')
    .sort((a: any, b: any) => a.date.getTime() - b.date.getTime());
  const credits = transactions.filter((t: Transaction) => t.type === 'credit')
    .sort((a: any, b: any) => a.date.getTime() - b.date.getTime());

  const totalEntries = entries.reduce((acc: number, t: Transaction) => acc + t.value, 0);
  const totalExpenses = expenses.reduce((acc: number, t: Transaction) => acc + t.value, 0);
  const saldoParcial = (totalEntries - totalExpenses);

  // Usando Repository para consistência, ou cálculo local mantido do seu código
  const totalCredit = TransactionRepository.getCreditsByMonth(currentMonth - 1, currentYear)
    .reduce((sum, c) => sum + c.value, 0);
  const totalBalance = totalEntries - totalExpenses - totalCredit;

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
          <DataTable.Header>
            <DataTable.Title style={{ maxWidth: 70 }}>Data</DataTable.Title>
            <DataTable.Title>Descrição</DataTable.Title>
            <DataTable.Title numeric>Valor</DataTable.Title>
          </DataTable.Header>
          {entries.map((item: Transaction) => (
            <DataTable.Row key={item._id} onLongPress={() => selecTransaction(item)}>
              <DataTable.Cell style={{ maxWidth: 70 }}>{dayjs(item.date).format('DD/MM')}</DataTable.Cell>
              <DataTable.Cell>{item.description}</DataTable.Cell>
              <DataTable.Cell numeric>R$ {item.value.toFixed(2)}</DataTable.Cell>
            </DataTable.Row>
          ))}
          <DataTable.Row key={`totalEntries`}>
            <DataTable.Cell>TOTAL</DataTable.Cell>
            <DataTable.Cell numeric><Text style={{ fontWeight: 'bold' }}> R${totalEntries.toFixed(2)} </Text></DataTable.Cell>
          </DataTable.Row>
        </DataTable>

        {/* Saídas */}
        <Text style={styles.sectionTitle}>Saídas à vista</Text>
        <DataTable>
          <DataTable.Header>
            <DataTable.Title style={{ maxWidth: 70 }} >Data</DataTable.Title>
            <DataTable.Title>Descrição</DataTable.Title>
            <DataTable.Title numeric>Valor</DataTable.Title>
          </DataTable.Header>
          {expenses.map((item: Transaction) => (
            <DataTable.Row onLongPress={() => selecTransaction(item)} key={item._id.toString()}>
              <DataTable.Cell style={{ maxWidth: 70 }}>{dayjs(item.date).format('DD/MM')}</DataTable.Cell>
              <DataTable.Cell>{item.description}</DataTable.Cell>
              <DataTable.Cell numeric>R$ {item.value.toFixed(2)}</DataTable.Cell>
            </DataTable.Row>
          ))}
          <DataTable.Row key={`totalExpenses`}>
            <DataTable.Cell>TOTAL</DataTable.Cell>
            <DataTable.Cell numeric><Text style={{ fontWeight: 'bold' }}> R${totalExpenses.toFixed(2)} </Text></DataTable.Cell>
          </DataTable.Row>
        </DataTable>

        {/* Cartões */}
        <Text style={styles.sectionTitle}>Cartão de crédito</Text>
        <DataTable>
          <DataTable.Header>
            <DataTable.Title style={{ maxWidth: 70 }} >Data</DataTable.Title>
            <DataTable.Title>Descrição</DataTable.Title>
            <DataTable.Title numeric>Valor</DataTable.Title>
          </DataTable.Header>
          {credits.map((item: Transaction) => (
            <DataTable.Row onLongPress={() => selecTransaction(item)} key={item._id.toString()}>
              <DataTable.Cell style={{ maxWidth: 70 }}>{dayjs(item.date).format('DD/MM')}</DataTable.Cell>
              <DataTable.Cell>{item.description}</DataTable.Cell>
              <DataTable.Cell numeric>R$ {item.value.toFixed(2)}</DataTable.Cell>
            </DataTable.Row>
          ))}
          <DataTable.Row key={`totalCredits`}>
            <DataTable.Cell>TOTAL</DataTable.Cell>
            <DataTable.Cell numeric><Text style={{ fontWeight: 'bold' }}> R${totalCredit.toFixed(2)} </Text></DataTable.Cell>
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
            <Text style={styles.summaryTextBold}> R${saldoParcial.toFixed(2)}</Text>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <Text style={styles.summaryText}>Saldo Total:</Text>
            <Text style={styles.summaryText}> R${totalBalance.toFixed(2)}</Text>
          </View>
        </View>

        <TouchableOpacity onPress={add} style={styles.fab}>
          <Icon source="plus" size={24} color="#fff" />
        </TouchableOpacity>

        <Button mode="contained" onPress={() => console.log(transactions)}>DATA</Button>
      </View>

      <Portal>
        <Modal
          visible={operation !== null}
          onDismiss={closeModal}
          contentContainerStyle={{ backgroundColor: 'white', margin: 20, borderRadius: 12, padding: 16 }}
        >
          {params.type === null ?
            <View style={{ gap: 12 }}>
              <WinButton label="Entrada" color="#2E9E57" selected={params.type === 'income'} onPress={() => selectType('income')} />
              <WinButton label="Saída - À vista" color="#CC4A4A" selected={params.type === 'expense'} onPress={() => selectType('expense')} />
              <WinButton label="Saída - Crédito" color="#2F80ED" selected={params.type === 'credit'} onPress={() => selectType('credit')} />
            </View>
            :
            <View>
              {activePicker && (
                <DateTimePicker
                  value={params[activePicker] || new Date(currentYear, currentMonth, 1)}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                  minimumDate={operation === 'add' || operation === 'editAll' || operation === 'editOnlyMonth' ?
                    new Date(Date.UTC(currentYear, currentMonth - 1, 1, 23, 59, 59)) : undefined}
                  maximumDate={operation === 'add' || operation === 'editAll' &&
                    activePicker === 'startDate' || activePicker === 'date' ?
                    new Date(Date.UTC(currentYear, currentMonth, 0, 23, 59, 59)) : undefined}
                />
              )}

              <View>
                <Text style={{ fontSize: 20 }}>
                  {operation === 'add' ? 'Adicionando nova transação' :
                    (operation === 'editOnlyMonth' ? 'Editando este mês apenas' :
                      operation === 'editAll' ? `Editando sequência\n(${getMonthName(currentMonth)}/${currentYear} em diante)` :
                        'Editando transação')}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                <View style={{ width: '48%' }}>
                  <Text style={{ marginLeft: 5 }}>Transação</Text>
                  <Button
                    disabled={operation !== 'add'}
                    mode="contained-tonal"
                    onPress={() => setParams((prevParams) => ({ ...prevParams, type: null }))}
                    style={{ marginBottom: 16 }}
                  >
                    {params.type === 'income' ? 'Receita' : (params.type === 'expense' ? 'Despesa à vista' : 'Crédito')}
                  </Button>
                </View>
                <View style={{ width: '48%' }}>
                  <Text style={{ marginLeft: 5 }}>Data</Text>
                  <Button
                    disabled={operation !== 'add' && operation !== 'editOnlyMonth'}
                    mode="contained-tonal"
                    onPress={() => setActivePicker('date')}
                    style={{ marginBottom: 16 }}
                  >
                    {params?.date?.toLocaleDateString('pt-BR')}
                  </Button>
                </View>
              </View>
              <TextInput label="Descrição" value={params.description} onChangeText={(text) => setParams(prev => ({ ...prev, description: text }))} keyboardType="default" mode="outlined" style={{ marginBottom: 16 }} disabled={isDeleting} />
              <TextInput label="Valor" value={params.value} onChangeText={(text) => setParams(prev => ({ ...prev, value: text }))} keyboardType="numeric" mode="outlined" style={{ marginBottom: 16 }} disabled={isDeleting} />

              {operation !== "editUnique" && operation !== 'editOnlyMonth' &&
                operation !== 'editCredit' && params.type !== 'credit' && operation !== 'editOverride' &&
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Checkbox
                      disabled={operation !== 'add'}
                      status={params.isRecurrence ? 'checked' : 'unchecked'}
                      onPress={() => {
                        setParams(prevParams => ({
                          ...prevParams,
                          isRecurrence: !params.isRecurrence,
                          startDate: params.isRecurrence ? null : new Date(params.date),
                          endDate: params.isRecurrence ? null : prevParams.endDate,
                        }))
                      }}
                    />
                    <Text>Transação recorrente</Text>
                  </View>

                  {params.isRecurrence &&
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
                      <View style={{ width: '48%' }}>
                        <Text style={{ marginLeft: 5 }}>Início</Text>
                        <Button mode="contained-tonal" onPress={() => setActivePicker('startDate')}>
                          {params?.startDate?.toLocaleDateString('pt-BR')}
                        </Button>
                      </View>
                      <View style={{ width: '48%' }}>
                        <Text style={{ marginLeft: 5 }}>Fim</Text>
                        <Button mode="contained-tonal" onPress={() => setActivePicker('endDate')}>
                          {params?.endDate?.toLocaleDateString('pt-BR') || 'Sem fim'}
                        </Button>
                      </View>
                    </View>
                  }
                  {params.isRecurrence && params.endDate &&
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Checkbox status={params.endDate === null ? 'checked' : 'unchecked'} onPress={() => {
                        setParams(prevParams => ({
                          ...prevParams,
                          endDate: params.endDate ? null : new Date(currentYear, currentMonth, new Date().getDay())
                        }))
                      }} />
                      <Text>Sem data fim</Text>
                    </View>
                  }
                </View>
              }

              {params.type === 'credit' &&
                <View>
                  <TextInput label="N. Parcela" value={params.installments} onChangeText={(text) => setParams(prev => ({ ...prev, installments: text }))} keyboardType="numeric" mode="outlined" style={{ marginBottom: 16 }} disabled={isDeleting} />
                </View>
              }

              {operation !== 'add' && !isDeleting && operation !== 'editOverride' &&
                operation !== 'editOnlyMonth' && ((selectedTransaction?.date?.getUTCMonth() + 1) === currentMonth) &&
                <Button mode="contained" onPress={() => { setIsDeleting(true) }} buttonColor="#A50C36" style={{ marginTop: 20 }}>Excluir</Button>
              }

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
                  <Button onPress={() => del(selectedTransaction)} mode="contained" buttonColor="#A50C36">Excluir</Button> :
                  <Button mode="contained" onPress={save} disabled={isInvalisForm()}>Salvar</Button>
                }
              </View>
            )}
          </View>
          {/* <Button onPress={() => console.log(params)} mode="contained" buttonColor="#A50C36">params</Button>
          <Button onPress={() => console.log(selectedTransaction)} mode="contained" buttonColor="#A50C36">selected</Button> */}
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 16
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16
  },

  confirmDel: {
    backgroundColor: '#FFB86A',
    padding: 14
  },

  monthText: {
    fontSize: 18,
    fontWeight: "bold",
    textTransform: "capitalize"
  },
  scrollArea: { flex: 1 },
  textWarning: {
    fontSize: 16,
    color: "#A50C36"
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 8
  },
  summaryContainer: {
    position: "absolute",
    backgroundColor: '#fff',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderColor: "#ddd",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14
  },
  summaryText: {
    fontSize: 14,
    marginVertical: 2
  },
  summaryTextBold: {
    fontSize: 14,
    marginVertical: 2,
    fontWeight: 'bold'
  },
  fab: {
    backgroundColor: "#007bff",
    borderRadius: 50,
    width: 56,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5
  },
  gradientLayer: {
    position: 'absolute',
    top: -30,
    left: 0,
    right: 0,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    zIndex: 1
  },
})

