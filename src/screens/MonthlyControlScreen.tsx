import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Button, DataTable, Icon } from "react-native-paper";
import { AddTransactionModal } from "../components/AddTransactionModal";
import { Transaction } from "../interface/Transaction";
import dayjs from "dayjs";
import { realm } from "../database/realm";
import { Balance } from "../interface/Balance";
import { getAllItems, getFilteredItems } from "../database/realmHelpers";
import { RecurringTransaction } from "../interface/RecurringTransaction";

export default function MonthlyControlScreen() {

  const [currentDate, setCurrentDate] = useState(new Date())
  const [isOpenModal, setIsOpenModal] = useState(false)
  const [transactions, setTransactions] = useState<any>([])

  const currentMonth = currentDate.getMonth() + 1
  const currentYear = currentDate.getFullYear()

  // Função que busca os dados do mês atual
  const loadTransactions = async (date: Date) => {
    const month = date.getMonth()
    const year = date.getFullYear()

    const data = getTransactionsByMonth(month, year)// usando seu método baseado no Realm
    console.log('data', data)
    setTransactions(data)
  }

  // const getAccumulatedBalance = (targetYear: number, targetMonth: number) => {
  //   const balances = realm.objects<Balance>('Balance');

  //   let total = 0;

  //   balances
  //     .filtered('year < $0 OR (year == $0 AND month < $1)', targetYear, targetMonth)
  //     .sorted([['year', true], ['month', true]])
  //     .forEach(b => total += b.partialBalance);

  //   return total;
  // }

  const getAccumulatedBalance = (targetYear: number, targetMonth: number) => {
    // ----------------------------
    // 1. Somar Balances já salvos
    // ----------------------------
    const balances = realm.objects<Balance>('Balance');
  
    let total = 0;
  
    balances
      .filtered('year < $0 OR (year == $0 AND month < $1)', targetYear, targetMonth)
      .forEach(b => total += b.partialBalance);
  
  
    // ----------------------------
    // 2. Somar transações recorrentes
    // ----------------------------
    const recurring = realm.objects<RecurringTransaction>('RecurringTransaction');
  
    recurring.forEach(rt => {
      // precisamos testar todo mês desde rt.startDate até o mês anterior ao target
      const start = new Date(rt.startDate);
  
      let year = start.getFullYear();
      let month = start.getMonth() + 1;
  
      while (year < targetYear || (year === targetYear && month < targetMonth)) {
        
        if (occursInMonth(rt, year, month)) {
          if (rt.type === 'income') total += rt.amount;
          if (rt.type === 'expense' || rt.type === 'credit') total -= rt.amount;
        }
  
        // próximo mês
        month++;
        if (month > 12) {
          month = 1;
          year++;
        }
  
        // respeitando endDate
        if (rt.endDate && new Date(year, month - 1, 1) > rt.endDate) break;
      }
    });
  
  
    return total;
  };
  




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

  // const getTransactionsByMonth = (month: number, year: number) => {
  //   const start = new Date(year, month, 1);
  //   const end = new Date(year, month + 1, 0, 23, 59, 59);

  //   const transactions = realm.objects('Transaction')
  //     .filtered('date >= $0 && date <= $1', start, end)
  //     .sorted('date', true);

  //   return transactions;
  // }


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
      description: rec.description,
      value: rec.amount,
      type: rec.type,
      date,
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

    // 3. Combinar ambos
    const all = [...normal, ...monthRecurring];

    return all;
  }


  useEffect(() => {
    if (!isOpenModal)
      loadTransactions(currentDate)
  }, [isOpenModal])




  //ErdV/?6N%Mibd36

  const entries = transactions.filter((t: Transaction) => t.type === 'income');
  const expenses = transactions.filter((t: Transaction) => t.type === 'expense');
  const credits = transactions.filter((t: Transaction) => t.type === 'credit');

  const totalEntries = entries.reduce((acc: number, t: Transaction) => acc + t.value, 0)
  const totalExpenses = expenses.reduce((acc: number, t: Transaction) => acc + t.value, 0)


  const saldoParcial = (totalEntries - totalExpenses) + getAccumulatedBalance(currentYear, currentMonth)


  return (
    <View style={styles.container}>


      <AddTransactionModal visible={isOpenModal} onDismiss={() => setIsOpenModal(false)} />


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

      {/* LISTAS COM SCROLL */}
      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        {/* Entradas */}
        <Text style={styles.sectionTitle}>Entradas</Text>
        <DataTable>
          <DataTable.Header>
            <DataTable.Title>Descrição</DataTable.Title>
            <DataTable.Title numeric>Valor</DataTable.Title>
          </DataTable.Header>
          {entries.map((item: Transaction) => (
            <DataTable.Row key={item.description}>
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
          {expenses.map((item: Transaction, index: number) => (
            <DataTable.Row key={`row${index}`}>
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
        <TouchableOpacity onPress={() => setIsOpenModal(true)} style={styles.fab}>
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
