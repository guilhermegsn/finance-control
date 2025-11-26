import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from "react-native";
import { Button, Checkbox, DataTable, Icon, Modal, Portal, TextInput } from "react-native-paper";
import { AddTransactionModal } from "../components/AddTransactionModal";
import { Transaction } from "../interface/Transaction";
import dayjs from "dayjs";
import { realm } from "../database/realm";
import { getAllItems, getItemById, insertItem, updateItem } from "../database/realmHelpers";
import { RecurringTransaction } from "../interface/RecurringTransaction";
import { useNavigation } from "@react-navigation/native";
import { generateRandomId } from "../service/function";
import DateTimePicker from '@react-native-community/datetimepicker';

type DateType = 'startDate' | 'endDate' | null
interface ParamsRec {
  id: string,
  description: string,
  amount: string,
  startDate?: Date | null,
  endDate?: Date | null
}
export default function MonthlyControlScreen() {

  const [currentDate, setCurrentDate] = useState(new Date())
  const [isOpenModal, setIsOpenModal] = useState(false)
  const [transactions, setTransactions] = useState<any>([])
  const [selectedTransaction, setSelectedTransaction] = useState({})
  const [isEdit, setIsEdit] = useState(false)
  const [isEditRecurrence, setIsEditRecurrence] = useState(false)
  const [emptyParamsRec] = useState<ParamsRec>({
    id: '',
    description: '',
    amount: '',
    startDate: new Date(),
    endDate: new Date()
  })
  const [paramsRec, setParamsRec] = useState(emptyParamsRec)
  const [activePicker, setActivePicker] = useState<DateType>(null)

  const currentMonth = currentDate.getMonth() + 1
  const currentYear = currentDate.getFullYear()

  // Função que busca os dados do mês atual
  const loadTransactions = async (date: Date) => {
    const month = date.getMonth()
    const year = date.getFullYear()

    const data = getTransactionsByMonth(month, year)// usando seu método baseado no Realm
    setTransactions(data)
  }



  function getAccumulatedBalance(
    targetYear: number,
    targetMonth: number, // 1-based (jan=1)
  ) {
    // ----------------------------
    // 1. Somar Balances já salvos
    // ----------------------------
    const balances = realm.objects('Balance');

    let total = 0;

    balances
      .filtered('year < $0 OR (year == $0 AND month < $1)', targetYear, targetMonth)
      .forEach((b: any) => (total += b.partialBalance));

    // ----------------------------
    // 2. Somar transações recorrentes (virtual)
    // ----------------------------
    const recurring = realm.objects<RecurringTransaction>('RecurringTransaction')

    // Representação linear do limite (mês ANTES do target)
    // Exemplo: targetYear=2025, targetMonth=5 (maio) => limitYM = 2025*12 + 4 (abril)
    const targetLimitYM = targetYear * 12 + (targetMonth - 1);

    recurring.forEach((rt: RecurringTransaction) => {
      const start = new Date(rt.startDate);
      const startYM = start.getFullYear() * 12 + (start.getMonth() + 1); // 1-based month

      // se a recorrência começa depois do limite, pula
      if (startYM > targetLimitYM) return;

      const end = rt.endDate ? new Date(rt.endDate) : null;
      const endYM = end ? end.getFullYear() * 12 + (end.getMonth() + 1) : Infinity;

      // itera de startYM até o mês anterior ao target (inclusive), respeitando endYM
      // isso preserva exatamente a semântica da sua função original
      const upper = Math.min(targetLimitYM, endYM);

      // iterar linearmente em ym reduz comparações complexas
      for (let ym = startYM; ym <= upper; ym++) {
        const y = Math.floor(ym / 12); // ano
        const m1 = ym - y * 12; // mês 1-based

        // ocorreInMonth verifica a regra (dia, frequência, etc)
        if (occursInMonth(rt, m1, y)) {
          if (rt.type === 'income') total += rt.amount;
          else if (rt.type === 'expense' || rt.type === 'credit') total -= rt.amount;
        }
      }
    });

    return total;
  }


  // Carrega ao iniciar e sempre que currentDate mudar
  useEffect(() => {
    loadTransactions(currentDate)
  }, [currentDate])

  const goToPreviousMonth = () => {
    const prev = new Date(currentDate)
    prev.setMonth(prev.getMonth() - 1)
    setCurrentDate(prev)
    loadTransactions(prev)
  };


  const goToNextMonth = () => {
    const next = new Date(currentDate)
    next.setMonth(next.getMonth() + 1)
    setCurrentDate(next)
    loadTransactions(next)
  };


  function occursInMonth(rec: RecurringTransaction, month: number, year: number): boolean {
    const startYM = rec.startDate.getFullYear() * 12 + rec.startDate.getMonth();
    const endYM = rec.endDate
      ? rec.endDate.getFullYear() * 12 + rec.endDate.getMonth()
      : Infinity;

    const currentYM = year * 12 + month;

    return currentYM >= startYM && currentYM <= endYM;
  }

  function generateRecurringTransactionInstance(
    rec: RecurringTransaction,
    month: number,
    year: number
  ): Transaction {

    const day = Math.min(
      rec.date.getDate(),
      new Date(year, month + 1, 0).getDate()
    );

    const date = new Date(year, month, day);

    return {
      _id: rec._id,
      description: rec.description,
      value: rec.amount,
      type: rec.type,
      date,
      end: rec.endDate,
      isRecurrence: true,
      parentId: rec.parentId
    } as Transaction;
  }

  function getTransactionsByMonth(month: number, year: number) {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59);

    // 1. Transações normais
    const normal = realm.objects<Transaction>('Transaction')
      .filtered('date >= $0 && date <= $1', start, end)
      .slice(); // copia para array JS

    // 2. Recorrentes
    const recurrents = realm.objects<RecurringTransaction>('RecurringTransaction')
      .filtered('startDate <= $0 AND (endDate == null OR endDate >= $1)', end, start);


    let monthRecurring = recurrents
      .filter((rec) => occursInMonth(rec, month, year))
      .map((rec) => generateRecurringTransactionInstance(rec, month, year));

    const itemsWithParentId = monthRecurring.filter((item: Transaction) => item.parentId);

    // Excluindo as transações que têm um parentId correspondente
    monthRecurring = monthRecurring.filter((transaction: Transaction) => {
      const hasParentId = itemsWithParentId.some((parent: Transaction) => transaction._id === parent.parentId);
      return !hasParentId;
    });

    const accumulatedBalance = {
      _id: 'accumulatedBalance',
      date: new Date(year, month, 1),
      description: "Saldo acumulado",
      type: "income",
      value: getAccumulatedBalance(currentYear, currentMonth)
    }

    // 3. Combinar ambos
    const all = [accumulatedBalance, ...normal, ...monthRecurring];

    return all;
  }


  useEffect(() => {
    if (!isOpenModal)
      loadTransactions(currentDate)
  }, [isOpenModal])

  const editRecurrence = (transaction: any) => {
    setIsEditRecurrence(true)
    setParamsRec({
      id: transaction._id,
      description: transaction.description,
      amount: transaction.value.toString(),
      endDate: transaction.end
    })
  }

  const save = () => {
    if (isEditRecurrence) {
      //obtendo dados completos da sequencia
      const rec = getItemById('RecurringTransaction', paramsRec.id)
      if (rec) {
        const { _id, ...recWithoutId } = rec
        const data = { ...recWithoutId, endDate: currentDate }
        //fecho recorrencia atual com a data do mes.
        console.log('data', data)
        updateItem('RecurringTransaction', paramsRec.id, data)

        //criar nova recorrencia 
        const newRecurrence = {
          ...recWithoutId,
          description: paramsRec.description,
          amount: parseFloat(paramsRec.amount),
          startDate: new Date(currentYear, (currentMonth - 1), 1),
          endDate: paramsRec.endDate || null,
          parentId: paramsRec.id
        }

        console.log(newRecurrence)

        insertItem('RecurringTransaction', newRecurrence)
      }
      setIsEditRecurrence(false)
      loadTransactions(currentDate)
    }
  }


  const selecTransaction = (transaction: any) => {
    if (transaction?.isRecurrence) {
      Alert.alert(
        'Editar Transação recorrente',
        'Como deseja editar essa transação?',
        [
          {
            text: 'Cancelar',
            onPress: () => console.log('Cancelado'),
            style: 'cancel',
          },
          {
            text: 'Editar sequência',
            onPress: () => editRecurrence(transaction),
          },
          {
            text: 'Editar somente este mês',
            onPress: () => console.log('Somente neste mês'),
          },

        ],
        { cancelable: false }
      )
    } else {
      edit(transaction)
    }

  }

  const edit = (transaction: any) => {
    setIsEdit(true)
    const data = getItemById('Transaction', transaction._id)
    if (data) {
      setSelectedTransaction(data)
    }
  }

  const add = () => {
    // navigation.navigate('AddTransaction')
    setIsOpenModal(true)
  }

  const handleDateChange = (event: any, selectedDate: Date | undefined) => {
    const currentDate = selectedDate || paramsRec[activePicker!];  // Use o valor anterior se não tiver seleção
    setParamsRec(prevData => ({
      ...prevData,
      [activePicker!]: currentDate,  // Atualiza a data correspondente ao activePicker
      noEndDate: prevData.endDate ? true : false
    }));

    // Fecha o picker depois da seleção
    setActivePicker(null);
  };

  //ErdV/?6N%Mibd36

  const entries = transactions.filter((t: Transaction) => t.type === 'income');
  const expenses = transactions.filter((t: Transaction) => t.type === 'expense');
  const credits = transactions.filter((t: Transaction) => t.type === 'credit');
  const totalEntries = entries.reduce((acc: number, t: Transaction) => acc + t.value, 0)
  const totalExpenses = expenses.reduce((acc: number, t: Transaction) => acc + t.value, 0)
  const saldoParcial = (totalEntries - totalExpenses)

  return (
    <View style={styles.container}>


      <AddTransactionModal
        visible={isOpenModal || isEdit}
        data={selectedTransaction!}
        onDismiss={() => {
          setIsOpenModal(false)
          setIsEdit(false)
        }}
        isEdit={isEdit}
      />


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
            <DataTable.Row
              key={item._id.toString()}
              onLongPress={() => selecTransaction(item)}

            >
              <DataTable.Cell style={{ maxWidth: 70 }}>{dayjs(item.date).format('DD/MM')}</DataTable.Cell>
              <DataTable.Cell>{item.description}</DataTable.Cell>
              <DataTable.Cell numeric>R$ {item.value.toFixed(2)}</DataTable.Cell>
            </DataTable.Row>
          ))}
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
            <DataTable.Row key={item._id.toString()}>
              <DataTable.Cell style={{ maxWidth: 70 }}>{dayjs(item.date).format('DD/MM')}</DataTable.Cell>
              <DataTable.Cell>{item.description}</DataTable.Cell>
              <DataTable.Cell numeric>R$ {item.value.toFixed(2)}</DataTable.Cell>
            </DataTable.Row>
          ))}
        </DataTable>

        {/* Cartões */}
        {/* {creditCards.map((card) => (
          <View key={card.id}>
            <Text style={styles.sectionTitle}>Cartão: {card.name}</Text>
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>Descrição</DataTable.Title>
                <DataTable.Title numeric>Valor</DataTable.Title>
              </DataTable.Header>
              {card.items.map((item) => (
                <DataTable.Row key={item.id}>
                  <DataTable.Cell>{item.desc}</DataTable.Cell>
                  <DataTable.Cell numeric>R$ {item.value.toFixed(2)}</DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>
          </View>
        ))} */}

        {/* Espaço para o resumo fixo */}
        <View style={{ height: 130 }} />
      </ScrollView>

      {/* RESUMO FIXO */}
      <View style={styles.summaryContainer}>
        <View>
          <Text style={styles.summaryText}>Total entradas: R$ {totalEntries}</Text>
          <Text style={styles.summaryText}>Saldo parcial: R$ {saldoParcial}</Text>
        </View>

        {/* Botão flutuante */}
        <TouchableOpacity
          onPress={add}
          style={styles.fab}>
          <Icon source="plus" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => console.log(getAllItems('RecurringTransaction'))} style={styles.fab}>
          <Icon source="plus" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => console.log(getAllItems('Balance'))} style={styles.fab}>
          <Icon source="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </View>








      <Portal>
        <Modal
          visible={isEditRecurrence}
          onDismiss={() => setIsEditRecurrence(false)}
          contentContainerStyle={{
            backgroundColor: 'white',
            margin: 20,
            borderRadius: 12,
            padding: 16,
          }}
        >
          {activePicker && (
            <DateTimePicker
              value={paramsRec[activePicker] || new Date()}  // Mostra a data correspondente (startDate ou endDate)
              mode="date"  // Pode ser 'date', 'time', ou 'datetime'
              display="default"
              onChange={handleDateChange}  // Passa o evento e a data selecionada para a função
            />
          )}
          <Text style={{ marginBottom: 10, fontSize: 20 }}>Editando toda a sequência</Text>
          <TextInput
            label="Descrição"
            value={paramsRec.description}
            onChangeText={(text) => setParamsRec(prev => ({ ...prev, description: text }))}
            keyboardType="numeric"
            mode="outlined"
            style={{ marginBottom: 16 }}
          />
          <TextInput
            label="Valor"
            value={paramsRec.amount}
            onChangeText={(text) => setParamsRec(prev => ({ ...prev, amount: text }))}
            keyboardType="numeric"
            mode="outlined"
            style={{ marginBottom: 16 }}
          />


          {/* <Button
            mode="outlined"
            onPress={() => setActivePicker('startDate')}
            style={{ marginBottom: 16 }}
          >
            Início: {paramsRec?.startDate?.toLocaleDateString('pt-BR')}
          </Button>
 */}



          {paramsRec.endDate &&
            <Button
              mode="outlined"
              onPress={() => setActivePicker('endDate')}
              style={{ marginBottom: 16 }}
            >
              Fim: {paramsRec?.endDate?.toLocaleDateString('pt-BR')}
            </Button>
          }
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Checkbox
              status={!paramsRec.endDate ? 'checked' : 'unchecked'}
              onPress={() => {
                !paramsRec.endDate ?
                  setParamsRec(prev => ({ ...prev, endDate: new Date() })) :
                  setParamsRec(prev => ({ ...prev, endDate: null }))
              }}
            />
            <Text>Sem data fim</Text>
          </View>



          <Button
            mode="contained"
            onPress={() => setActivePicker('endDate')}
            buttonColor="#A50C36"
            style={{ marginBottom: 16 }}
          >
            Excluir
          </Button>


          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Button
              mode="outlined"

              onPress={() => setIsEditRecurrence(false)}
              style={{ marginBottom: 16, width: '48%' }}
            >
              Cancelar
            </Button>
            <Button
              mode="contained"

              onPress={save}
              style={{ marginBottom: 16, width: '48%' }}
            >
              Salvar
            </Button>

          </View>

        </Modal>
      </Portal>









    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  monthText: {
    fontSize: 18,
    fontWeight: "bold",
    textTransform: "capitalize",
  },
  scrollArea: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 8,
  },
  summaryContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderColor: "#ddd",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  summaryText: {
    fontSize: 14,
    marginVertical: 2,
  },
  fab: {
    backgroundColor: "#007bff",
    borderRadius: 50,
    width: 56,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
});
