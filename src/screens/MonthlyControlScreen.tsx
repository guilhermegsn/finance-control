import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from "react-native";
import { DataTable, Icon } from "react-native-paper";
import { AddTransactionModal } from "../components/AddTransactionModal";
import { Recurrence, Transaction } from "../interface/Transaction";
import dayjs from "dayjs";
import { realm } from "../database/realm";
import { getAllItems, getFilteredItems, getItemById } from "../database/realmHelpers";
import { RecurringTransaction } from "../interface/RecurringTransaction";
import { useNavigation } from "@react-navigation/native";

export default function MonthlyControlScreen() {
  const navigation = useNavigation()

  const [currentDate, setCurrentDate] = useState(new Date())
  const [isOpenModal, setIsOpenModal] = useState(false)
  const [transactions, setTransactions] = useState<any>([])
  const [selectedTransaction, setSelectedTransaction] = useState({})
  const [isEdit, setIsEdit] = useState(false)

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

    // mesma query que você usava: somar partialBalance de meses ANTERIORES ao target
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
        if (occursInMonth(rt, y, m1)) {
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
    const start = rec.startDate;
    const end = rec.endDate;

    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);

    // Não começou ainda
    if (start > monthEnd) return false;

    // Já acabou
    if (end && end < monthStart) return false;

    return true;
  }

  function generateRecurringTransactionInstance(
    rec: RecurringTransaction,
    month: number,
    year: number
  ): Transaction {

    // Use o mesmo dia da startDate (limite no último dia do mês)
    const day = Math.min(
      rec.startDate.getDate(),
      new Date(year, month + 1, 0).getDate()
    );

    const date = new Date(year, month, day);

    return {
      _id: rec._id,
      description: rec.description,
      value: rec.amount,
      type: rec.type,
      date,
      isRecurrence: true
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
    const recurrents = realm.objects<RecurringTransaction>('RecurringTransaction');

    const monthRecurring = recurrents
      .filter((rec) => occursInMonth(rec, month, year))
      .map((rec) => generateRecurringTransactionInstance(rec, month, year));

    const accumulatedBalance = {
      _id: 'accumulatedBalance',
      date: new Date(),
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


  const selecTransaction = (transaction: any) => {
    if (transaction?.isRecurrence) {
      Alert.alert(
        'Deseja editar este evento?',
        'Escolha uma opção:',
        [
          {
            text: 'Somente neste mês',
            onPress: () => console.log('Somente neste mês'),
          },
          {
            text: 'Toda a sequência',
            onPress: () => console.log('Toda a sequência'),
          },
          {
            text: 'Cancelar',
            onPress: () => console.log('Cancelado'),
            style: 'cancel',
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
            <DataTable.Title>Descrição</DataTable.Title>
            <DataTable.Title numeric>Valor</DataTable.Title>
          </DataTable.Header>
          {entries.map((item: Transaction) => (
            <DataTable.Row
              key={item._id.toString()}
              onLongPress={() => selecTransaction(item)}

            >
              <DataTable.Cell>{item.description}</DataTable.Cell>
              <DataTable.Cell numeric>R$ {item.value.toFixed(2)}</DataTable.Cell>
            </DataTable.Row>
          ))}
        </DataTable>

        {/* Saídas */}
        <Text style={styles.sectionTitle}>Saídas à vista</Text>
        <DataTable>
          <DataTable.Header>
            <DataTable.Title>Descrição</DataTable.Title>
            <DataTable.Title numeric>Valor</DataTable.Title>
          </DataTable.Header>
          {expenses.map((item: Transaction) => (
            <DataTable.Row key={item._id.toString()}>
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
        <TouchableOpacity onPress={() => console.log(transactions)} style={styles.fab}>
          <Icon source="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
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
