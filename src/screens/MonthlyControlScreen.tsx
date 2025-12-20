import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, AlertButton } from "react-native";
import { Button, Checkbox, DataTable, Divider, Icon, Modal, Portal, TextInput } from "react-native-paper";
import { Transaction, TransactionType } from "../interface/Transaction";
import dayjs from "dayjs";
import { realm } from "../database/realm";
import { deleteItem, getItemById, insertItem, updateItem } from "../database/realmHelpers";
import { RecurringTransaction, Type } from "../interface/RecurringTransaction";
import { generateRandomId, getMonthName } from "../service/function";
import DateTimePicker from '@react-native-community/datetimepicker';
import { Override } from "../interface/Override";
import { WinButton } from "../components/WinButton";
import { Balance } from "../interface/Balance";



type DateType = 'startDate' | 'endDate' | 'date' | null
type Operation = 'add' | 'editAll' | 'editOnlyMonth' | 'editUnique' | null
type BalanceOperation = 'create' | 'update' | 'delete'
interface Params {
  id: string,
  description: string,
  value: string,
  date: Date,
  startDate?: Date | null,
  endDate?: Date | null,
  type: TransactionType | null,
  isRecurrence: boolean
}
export default function MonthlyControlScreen() {

  const now = new Date();
  const todayMonth = now.getUTCMonth()    // 0–11
  const todayYear = now.getUTCFullYear()
  const [currentDate, setCurrentDate] = useState(new Date())

  const currentMonth = currentDate.getUTCMonth() + 1
  const currentYear = currentDate.getUTCFullYear()


  const [transactions, setTransactions] = useState<any>([])
  const [selectedTransaction, setSelectedTransaction] = useState<any>({})
  const [operation, setOperation] = useState<Operation>(null)
  const [emptyParams] = useState<Params>({
    id: '',
    description: '',
    value: '',
    date: new Date(),
    startDate: null,
    endDate: null,
    type: null,
    isRecurrence: false,
  })
  const [params, setParams] = useState(emptyParams)
  const [activePicker, setActivePicker] = useState<DateType>(null)
  const [isDeleting, setIsDeleting] = useState(false)



  // Função que busca os dados do mês atual
  const loadTransactions = async (date: Date) => {
    const month = date.getUTCMonth()
    const year = date.getUTCFullYear()
    const data = getTransactionsByMonth(month, year)
    setTransactions(data)
  }

  const isPast =
    currentYear < todayYear ||
    (currentYear === todayYear && (currentMonth - 1) < todayMonth)


  // const disableEdit = (transaction: any) => {
  //   if(isPast || transaction?.isRe)
  // }

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
    // 2. Somar transações recorrentes 
    // ----------------------------
    const recurring = realm.objects<RecurringTransaction>('RecurringTransaction')

    // Representação linear do limite (mês ANTES do target)
    // Exemplo: targetYear=2025, targetMonth=5 (maio) => limitYM = 2025*12 + 4 (abril)
    const targetLimitYM = targetYear * 12 + (targetMonth - 1);

    recurring.forEach((rt: RecurringTransaction) => {


      const start = new Date(rt.startDate)
      const startYM = start.getUTCFullYear() * 12 + (start.getUTCMonth())

      // se a recorrência começa depois do limite, pula
      if (startYM > targetLimitYM) return;

      const end = rt.endDate ? new Date(rt.endDate) : null;
      const endYM = end ? end.getUTCFullYear() * 12 + (end.getUTCMonth()) : Infinity;

      // itera de startYM até o mês anterior ao target (inclusive), respeitando endYM
      const upper = Math.min(targetLimitYM, endYM);

      // iterar linearmente em ym reduz comparações complexas
      for (let ym = startYM; ym <= upper; ym++) {

        // const y = Math.floor(ym / 12);
        // const m0 = ym % 12;

        const y = Math.floor((ym - 1) / 12);
        const m1 = ym - y * 12;  // 1 a 12
        const m0 = m1 - 1;       // 0 a 11


        const override = realm.objects<Override>('Override')
          .filtered('parentId == $0 AND month == $1 AND year == $2', rt._id, m1, y)[0]
        if (override) {
          // soma valor substituto
          if (override.type === 'income') total += override.value;
          else total -= override.value;
          continue; // pula recorrente normal
        }

        // ocorreInMonth verifica a regra (dia, frequência, etc)
        if (occursInMonth(rt, m0, y)) {
          if (rt.type === 'income') total += rt.value;
          else if (rt.type === 'expense' || rt.type === 'credit') total -= rt.value;
        }
      }
    });

    return total;
  }

  // function getCreditTransactions(targetYear: number, targetMonth: number) {
  //   // calcula mês anterior
  //   let previousMonth = targetMonth - 1
  //   let previousYear = targetYear

  //   if (previousMonth < 0) {
  //     previousMonth = 11
  //     previousYear--
  //   }

  //   // intervalo de datas
  //   const start = new Date(previousYear, previousMonth, 1)

  //   const end = new Date(previousYear, previousMonth + 1, 0)

  //   return realm.objects<Transaction>('Transaction')
  //     .filtered('type == "credit" AND date >= $0 AND date <= $1', start, end)
  //     .reduce((acc, t: any) => acc + t.value, 0)
  // }


  function getCreditTransactions(targetYear: number, targetMonth: number) {
    // ----------------------------
    // 1. Mês anterior (base 0)
    // ----------------------------
    let m0 = targetMonth - 1
    let y = targetYear

    if (m0 < 0) {
      m0 = 11
      y--
    }

    const start = new Date(Date.UTC(y, m0, 1))
    const end = new Date(Date.UTC(y, m0 + 1, 1))

    let total = 0

    // ----------------------------
    // 2. Créditos normais
    // ----------------------------
    realm.objects<Transaction>('Transaction')
      .filtered('type == "credit" AND date >= $0 AND date < $1', start, end)
      .forEach((t) => {
        total += t.value
      })

    // ----------------------------
    // 3. Overrides do mês
    // ----------------------------
    const overrides = realm.objects<Override>('Override')
      .filtered('type == "credit" AND month == $0 AND year == $1', m0, y)
      .slice()

    overrides.forEach((o) => {
      total += o.value
    })

    // ----------------------------
    // 4. Créditos recorrentes (virtual)
    // ----------------------------
    const recurring = realm.objects<RecurringTransaction>('RecurringTransaction')
      .filtered('type == "credit"')

    recurring.forEach((rt) => {
      // existe override para este mês? então não soma recorrente
      const hasOverride = overrides.some(
        (o) => o.parentId === rt._id
      )

      if (hasOverride) return

      if (occursInMonth(rt, m0, y)) {
        total += rt.value
      }
    })

    return total
  }



  // Carrega ao iniciar e sempre que currentDate mudar
  useEffect(() => {
    loadTransactions(currentDate)
  }, [currentDate])

  const goToPreviousMonth = () => {
    const prev = new Date(currentDate)
    prev.setMonth(prev.getUTCMonth() - 1)
    setCurrentDate(prev)
    loadTransactions(prev)
  };


  const goToNextMonth = () => {
    const next = new Date(currentDate)
    next.setMonth(next.getUTCMonth() + 1)
    setCurrentDate(next)
    loadTransactions(next)
  };


  function occursInMonth(rec: RecurringTransaction, month: number, year: number): boolean { //Base 0 (Jan = 0, Fev = 1)
    const startYM = rec.startDate.getUTCFullYear() * 12 + rec.startDate.getUTCMonth();
    const endYM = rec.endDate
      ? rec.endDate.getUTCFullYear() * 12 + rec.endDate.getUTCMonth()
      : Infinity;

    const currentYM = year * 12 + month;

    return currentYM >= startYM && currentYM <= endYM;
  }

  function generateRecurringTransactionInstance(
    rec: RecurringTransaction,
    month: number,
    year: number
  ): Transaction {

    const baseDate = rec.startDate ?? rec.date

    const day = Math.min(
      baseDate.getDate(),
      new Date(year, month + 1, 0).getDate()
    )

    const date = new Date(year, month, day)

    return {
      _id: rec._id,
      description: rec.description,
      value: rec.value,
      type: rec.type,
      date,
      end: rec.endDate,
      isRecurrence: true,
      parentId: rec.parentId
    } as Transaction;
  }

  function getTransactionsByMonth(month: number, year: number) { // Base 0 (Jan = 0, Fev = 1)
    try {

      // Primeiro dia do mês (00:00 UTC do primeiro dia)
      const start = new Date(Date.UTC(year, month, 1));  // 00:00 UTC

      // Último dia do mês (23:59:59.999 UTC do último dia)
      const end = new Date(Date.UTC(year, month + 1, 0));  // último dia do mês
      end.setUTCHours(23, 59, 59, 999);  // 23:59:59.999 UTC

      // 1. Transações normais
      const normal = realm.objects<Transaction>('Transaction')
        .filtered('date >= $0 && date <= $1', start, end)
        .slice();


      // 2. Recorrentes
      const recurrents = realm.objects<RecurringTransaction>('RecurringTransaction')
        .filtered('startDate <= $0 AND (endDate == null OR endDate >= $1)', end, start);

      // 3. Overrides do mês atual
      const overrides = realm.objects<Override>('Override')
        .filtered('year == $0 AND month == $1', year, (month + 1))
        .slice();

      // Transforma Overrides em transações normais
      const overrideTransactions = overrides.map((o) => ({
        _id: o._id,
        parentId: o.parentId,
        date: new Date(year, month, 1),
        description: o.description,
        value: o.value,
        type: o.type
      }));

      let monthRecurring = recurrents
        .filter((rec) => occursInMonth(rec, month, year))
        .map((rec) => generateRecurringTransactionInstance(rec, month, year));

      const itemsWithParentId = monthRecurring.filter((item: Transaction) => item.parentId);

      // Excluindo as transações que têm um parentId correspondente
      monthRecurring = monthRecurring.filter((transaction: Transaction) => {
        const hasParentId = itemsWithParentId.some((parent: Transaction) => transaction._id === parent.parentId);
        return !hasParentId;
      })

      // Remove recorrentes que possuem override
      const overriddenParentIds = new Set(
        overrides.map((o) => o.parentId)
      )

      monthRecurring = monthRecurring.filter(
        (rec) => !overriddenParentIds.has(rec._id)
      );

      const totalCredit = getCreditTransactions(currentYear, (currentMonth - 1))
      const totalAccumulated = getAccumulatedBalance(currentYear, currentMonth) +
        getCreditTransactions(currentYear, (currentMonth - 1))

      const credit = {
        _id: 'statement',
        date: new Date(year, month, 1),
        description: "Fatura crédito",
        type: "expense",
        value: totalCredit
      }

      const accumulatedBalance = {
        _id: 'accumulatedBalance',
        date: new Date(year, month, 1),
        description: "Saldo acumulado",
        type: "income",
        value: totalAccumulated
      }

      // 3. Combinar ambos
      const all = [
        totalCredit > 0 && credit,
        totalAccumulated > 0 && accumulatedBalance,
        ...normal,
        ...overrideTransactions,
        ...monthRecurring];

      return all;
    } catch (e) {
      console.error('erro', e)
    }
  }

  // const updateBalanceAfterTransaction = (transaction: Transaction, previousTransaction?: Transaction) => {
  //   if (!transaction.date) return
  //   const monthKey = `${transaction.date.getUTCFullYear()}-${String(transaction.date.getUTCMonth() + 1).padStart(2, '0')}`;

  //   realm.write(() => {
  //     let balance = realm.objectForPrimaryKey('Balance', monthKey) as Balance

  //     if (!balance) {
  //       if (!transaction.date) return
  //       balance = realm.create('Balance', {
  //         id: monthKey,
  //         month: transaction.date.getUTCMonth() + 1,
  //         year: transaction.date.getUTCFullYear(),
  //         income: 0,
  //         expense: 0,
  //         credit: 0,
  //         partialBalance: 0,
  //       });
  //     }



  //     if (transaction.type === 'income') {
  //       if (previousTransaction) {
  //         balance.income -= previousTransaction.value;
  //         balance.income += transaction.value
  //       } else {
  //         balance.income += transaction.value;
  //       }
  //     }
  //     if (transaction.type === 'expense') balance.expense += transaction.value;
  //     if (transaction.type === 'credit') balance.credit += transaction.value;

  //     balance.partialBalance = balance.income - balance.expense - balance.credit;
  //   });
  // }



  const updateBalanceAfterTransaction = (
    transaction: Transaction,
    previousTransaction?: Transaction,
    operation: BalanceOperation = 'create'
  ) => {
    if (!transaction.date) return

    const monthKey = `${transaction.date.getUTCFullYear()}-${String(
      transaction.date.getUTCMonth() + 1
    ).padStart(2, '0')}`

    realm.write(() => {
      let balance = realm.objectForPrimaryKey('Balance', monthKey) as Balance

      if (!balance) {
        balance = realm.create('Balance', {
          id: monthKey,
          month: transaction.date.getUTCMonth() + 1,
          year: transaction.date.getUTCFullYear(),
          income: 0,
          expense: 0,
          credit: 0,
          partialBalance: 0,
        })
      }

      // 🔴 DELETE
      if (operation === 'delete') {
        if (transaction.type === 'income') balance.income -= transaction.value
        if (transaction.type === 'expense') balance.expense -= transaction.value
        if (transaction.type === 'credit') balance.credit -= transaction.value
      }

      // 🟡 UPDATE
      if (operation === 'update' && previousTransaction) {
        if (previousTransaction.type === 'income') balance.income -= previousTransaction.value
        if (previousTransaction.type === 'expense') balance.expense -= previousTransaction.value
        if (previousTransaction.type === 'credit') balance.credit -= previousTransaction.value

        if (transaction.type === 'income') balance.income += transaction.value
        if (transaction.type === 'expense') balance.expense += transaction.value
        if (transaction.type === 'credit') balance.credit += transaction.value
      }

      // 🟢 CREATE
      if (operation === 'create') {
        if (transaction.type === 'income') balance.income += transaction.value
        if (transaction.type === 'expense') balance.expense += transaction.value
        if (transaction.type === 'credit') balance.credit += transaction.value
      }

      balance.partialBalance = balance.income - balance.expense - balance.credit
    })
  }





  const edit = async (transaction: any) => {
    let schema = 'Transaction'

    if (transaction.isRecurrence) {
      schema = 'RecurringTransaction'
    }

    const data = getItemById(schema, transaction._id)
    if (data) {
      setSelectedTransaction(data)
      setParams({
        id: data._id,
        description: data.description,
        date: data.date,
        value: data.value.toString(),
        startDate: data.startDate,
        endDate: data.endDate || null,
        type: data.type,
        isRecurrence: transaction?.isRecurrence ? true : false
      })
    }
  }

  const save = () => {
    try {
      if (operation === 'add') {
        if (params.isRecurrence) {
          const newRecurrencyTransaction = {
            type: params.type,
            description: params.description,
            value: parseFloat(params.value),
            date: new Date(params.date),
            startDate: params.startDate,
            recurrence: 'monthly',
            endDate: params.endDate
          } as RecurringTransaction

          insertItem('RecurringTransaction', newRecurrencyTransaction)
        } else {
          const newTransaction = {
            description: params.description,
            value: parseFloat(params.value),
            type: params.type,
            date: new Date(params.date)
          } as Transaction
          updateBalanceAfterTransaction(newTransaction, undefined, 'create')
          insertItem('Transaction', newTransaction)

        }

      } else if (operation === 'editUnique') {
        console.log('pareamss', params)
        const previousData = getItemById('Transaction', params.id) as Transaction

        const { _id, ...newTransactionData } = previousData

        const newTransaction = {
          ...newTransactionData,
          description: params.description,
          value: parseFloat(params.value)
        } as Transaction
        console.log('newwww-->>', newTransaction)
        updateBalanceAfterTransaction(newTransaction, previousData, 'update')
        updateItem('Transaction', params.id, newTransaction)


      } else {
        // Salvando edição - Transações recorrentes
        const rec = getItemById('RecurringTransaction', params.id) as RecurringTransaction
        if (rec) {
          const { _id, ...recWithoutId } = rec
          if (operation === 'editAll') {
            const data = { ...recWithoutId, endDate: currentDate }
            updateItem('RecurringTransaction', params.id, data)
            const newRecurrence = {
              ...recWithoutId,
              description: params.description,
              value: parseFloat(params.value),
              startDate: params.startDate,
              endDate: params.endDate || null,
              parentId: params.id,
            }

            insertItem('RecurringTransaction', newRecurrence)

          } else if (operation === 'editOnlyMonth') {
            const newOverride = {
              _id: generateRandomId(),
              parentId: params.id,
              year: currentYear,
              month: currentMonth,
              description: params.description,
              value: parseFloat(params.value),
              type: rec.type,
              date: rec.date
            }
            insertItem('Override', newOverride)
          }
        }
        setOperation(null)
        loadTransactions(currentDate)

      }
      setOperation(null)
      setParams(emptyParams)
      loadTransactions(currentDate)
    } catch (e) {
      console.error(e)
    }

  }






  const selecTransaction = (transaction: any) => {
    if (transaction._id === 'accumulatedBalance') return
    if (transaction?.isRecurrence) {
      const buttons: AlertButton[] = [
        {
          text: 'Cancelar',
          onPress: () => {
            setParams(emptyParams)
          },
          style: 'cancel',
        },
        {
          text: 'Editar somente este mês',
          onPress: () => {
            edit(transaction)
            setOperation('editOnlyMonth')
          },
        },
      ]
      if (!isPast) {
        buttons.push({
          text: 'Editar sequência',
          onPress: () => {
            edit(transaction)
            setOperation('editAll')
          },
        })
      }

      Alert.alert('Editar Transação recorrente', 'Como deseja editar?', buttons)

    } else {
      Alert.alert('Editar transação', 'Deseja editar essa transação?', [
        {
          text: 'Cancel',
          onPress: () => console.log('Cancel Pressed'),
          style: 'cancel',
        },
        {
          text: 'Editar',
          onPress: () => {
            setOperation('editUnique')
            edit(transaction)
          }
        },
      ]);
    }

  }

  const add = () => {
    if ((currentYear !== todayYear) || ((currentMonth - 1) !== todayMonth)) {
      setActivePicker('date')
    }

    setOperation('add')
  }


  const del = (transaction: any) => {
    console.log('paramms', params)
    console.log(transaction)
    if (params.isRecurrence) {

    } else {

      updateBalanceAfterTransaction(transaction, transaction, 'delete')
      deleteItem('Transaction', transaction._id)

      loadTransactions(currentDate)
      closeModal()
    }
  }

  const handleDateChange = (event: any, selectedDate: Date | undefined) => {
    const currentDate = selectedDate || params[activePicker!]
    if (currentDate) {
      const correctedDate = new Date(currentDate.setHours(0, 0, 0, 0))
      setParams(prevData => ({
        ...prevData,
        [activePicker!]: correctedDate,  // Atualiza a data correspondente ao activePicker
      }));

      // Fecha o picker depois da seleção
      setActivePicker(null);
    }
  };


  const selectType = (type: Type) => {
    setParams(p => ({
      ...p,
      type: type,
      date: (currentYear !== todayYear) || (currentMonth - 1 !== todayMonth) ?
        new Date(currentYear, (currentMonth - 1), 1) : new Date()
    }))
    // if ((currentYear !== todayYear) || ((currentMonth - 1) !== todayMonth)) {
    //   setActivePicker('date')
    // }
  }

  const closeModal = () => {
    setOperation(null)
    setTimeout(() => {
      setParams(emptyParams)
      setIsDeleting(false)
    }, 300);
    setActivePicker(null)
  }

  const isInvalisForm = () => {
    if (!params.description || !params.value || !params.date || isNaN(parseFloat(params.value))) {
      return true
    }
    return false
  }


  //ErdV/?6N%Mibd36

  const entries = transactions.filter((t: Transaction) => t.type === 'income')
    .sort((a: any, b: any) => a.date.getTime() - b.date.getTime())

  const expenses = transactions.filter((t: Transaction) => t.type === 'expense')
    .sort((a: any, b: any) => a.date.getTime() - b.date.getTime())

  const credits = transactions.filter((t: Transaction) => t.type === 'credit')
    .sort((a: any, b: any) => a.date.getTime() - b.date.getTime())


  const totalEntries = entries.reduce((acc: number, t: Transaction) => acc + t.value, 0)
  const totalExpenses = expenses.reduce((acc: number, t: Transaction) => acc + t.value, 0)
  const saldoParcial = (totalEntries - totalExpenses)

  const totalCredit = getCreditTransactions(currentYear, currentMonth)
  const totalBalance = (totalEntries - totalExpenses - totalCredit)

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
            <DataTable.Row
              key={item._id}
              onLongPress={() => selecTransaction(item)}
            >
              <DataTable.Cell style={{ maxWidth: 70 }}>{dayjs(item.date).format('DD/MM')}</DataTable.Cell>
              <DataTable.Cell>{item.description}</DataTable.Cell>
              <DataTable.Cell numeric>R$ {item.value.toFixed(2)}</DataTable.Cell>
            </DataTable.Row>
          ))}
          <DataTable.Row key={`totalEntries`}>
            <DataTable.Cell>TOTAL</DataTable.Cell>
            <DataTable.Cell numeric>
              <Text style={{ fontWeight: 'bold' }}> R${totalEntries.toFixed(2)} </Text>
            </DataTable.Cell>
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
            <DataTable.Row
              onLongPress={() => selecTransaction(item)}
              key={item._id.toString()}>
              <DataTable.Cell style={{ maxWidth: 70 }}>{dayjs(item.date).format('DD/MM')}</DataTable.Cell>
              <DataTable.Cell>{item.description}</DataTable.Cell>
              <DataTable.Cell numeric>R$ {item.value.toFixed(2)}</DataTable.Cell>
            </DataTable.Row>
          ))}
          <DataTable.Row key={`totalExpenses`}>
            <DataTable.Cell>TOTAL</DataTable.Cell>
            <DataTable.Cell numeric>
              <Text style={{ fontWeight: 'bold' }}> R${totalExpenses.toFixed(2)} </Text>
            </DataTable.Cell>
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
            <DataTable.Row
              onLongPress={() => selecTransaction(item)}
              key={item._id.toString()}>
              <DataTable.Cell style={{ maxWidth: 70 }}>{dayjs(item.date).format('DD/MM')}</DataTable.Cell>
              <DataTable.Cell>{item.description}</DataTable.Cell>
              <DataTable.Cell numeric>R$ {item.value.toFixed(2)}</DataTable.Cell>
            </DataTable.Row>
          ))}
          <DataTable.Row key={`totalCredits`}>
            <DataTable.Cell>TOTAL</DataTable.Cell>
            <DataTable.Cell numeric>
              <Text style={{ fontWeight: 'bold' }}> R${totalCredit.toFixed(2)} </Text>
            </DataTable.Cell>
          </DataTable.Row>
        </DataTable>

        {/* Espaço para o resumo fixo */}
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

        {/* Botão flutuante */}
        <TouchableOpacity
          onPress={add}
          style={styles.fab}>
          <Icon source="plus" size={24} color="#fff" />
        </TouchableOpacity>
        {/* <Button onPress={() => console.log(params)}>params</Button> */}
      </View>








      <Portal>
        <Modal
          visible={operation !== null}
          onDismiss={closeModal}
          contentContainerStyle={{
            backgroundColor: 'white',
            margin: 20,
            borderRadius: 12,
            padding: 16,
          }}
        >

          {params.type === null ?
            <View style={{ gap: 12 }}>
              <WinButton
                label="Entrada"
                color="#2E9E57"
                selected={params.type === 'income'}
                onPress={() => selectType('income')}
              />

              <WinButton
                label="Saída - À vista"
                color="#CC4A4A"
                selected={params.type === 'expense'}
                onPress={() => selectType('expense')}
              />

              <WinButton
                label="Saída - Crédito"
                color="#2F80ED"
                selected={params.type === 'credit'}
                onPress={() => selectType('credit')}
              />

            </View>

            :

            <View>
              {activePicker && (
                <DateTimePicker
                  value={params[activePicker] || new Date(currentYear, currentMonth, 1)}
                  mode="date"  // Pode ser 'date', 'time', ou 'datetime'
                  display="default"
                  onChange={handleDateChange}  // Passa o evento e a data selecionada para a função




                  minimumDate={operation === 'add' ? new Date(Date.UTC(currentYear, currentMonth - 1, 1, 23, 59, 59)) : undefined}

                  maximumDate={operation === 'add' &&
                    activePicker === 'startDate' || activePicker === 'date' ?
                    new Date(Date.UTC(currentYear, currentMonth, 0, 23, 59, 59)) : undefined}
                />
              )}
              {/* <View>
                <Text style={{ fontSize: 20 }}>
                  {operation === 'add' ? 'Adicionando' : 'editOnlyMonth' ?
                    'Editando somente este mês' :
                    `Editando sequência\n(${getMonthName(currentMonth)}/${currentYear} em diante)`}
                </Text>
                <Text style={{ marginBottom: 10, fontSize: 20 }}>
                  {params.type === 'income' ? 'Receita' : params.type === 'expense' ?
                    'Saída à vista' : 'Crédito'}
                </Text>
              </View> */}
              <View>
                <Text style={{ fontSize: 20 }}>
                  {operation === 'add'
                    ? 'Adicionando nova transação'
                    : (operation === 'editOnlyMonth'
                      ? 'Editando este mês apenas'
                      : operation === 'editUnique' ? 'Editando transação'
                        : `Editando sequência\n(${getMonthName(currentMonth)}/${currentYear} em diante)`)}
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
                    {params.type === 'income'
                      ? 'Receita'
                      : (params.type === 'expense'
                        ? 'Despesa à vista'
                        : 'Crédito')}
                  </Button>

                </View>
                <View style={{ width: '48%' }}>
                  <Text style={{ marginLeft: 5 }}>Data</Text>
                  <Button
                    disabled={operation !== 'add'}
                    mode="contained-tonal"
                    onPress={() => setActivePicker('date')}
                    style={{ marginBottom: 16 }}
                  >
                    {params?.date?.toLocaleDateString('pt-BR')}
                  </Button>
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


              {operation !== "editUnique" && operation !== 'editOnlyMonth' &&
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
                    {/* <Button onPress={() => console.log(params)}>psrams</Button> */}
                  </View>

                  {params.isRecurrence &&
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
                      <View style={{ width: '48%' }}>
                        <Text style={{ marginLeft: 5 }}>Início</Text>
                        <Button
                          disabled={operation !== 'add'}
                          mode="contained-tonal"
                          onPress={() => setActivePicker('startDate')}
                        >
                          {params?.startDate?.toLocaleDateString('pt-BR')}
                        </Button>

                      </View>

                      <View style={{ width: '48%' }}>
                        <Text style={{ marginLeft: 5 }}>Fim</Text>
                        <Button
                          mode="contained-tonal"
                          onPress={() => setActivePicker('endDate')}
                        >
                          {params?.endDate?.toLocaleDateString('pt-BR') || 'Sem fim'}
                        </Button>
                      </View>
                    </View>
                  }

                  {params.isRecurrence && params.endDate &&
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Checkbox
                        status={params.endDate === null ? 'checked' : 'unchecked'}
                        onPress={() => {
                          setParams(prevParams => ({
                            ...prevParams,
                            endDate: params.endDate ? null : new Date(currentYear, currentMonth, new Date().getDay())
                          }))
                        }}
                      />
                      <Text>Sem data fim</Text>
                    </View>
                  }

                </View>
              }



              {operation !== 'add' && !isDeleting &&
                ((selectedTransaction?.date?.getUTCMonth() + 1) === currentMonth) &&


                <Button
                  mode="contained"
                  onPress={() => {
                    setIsDeleting(true)
                  }}
                  buttonColor="#A50C36"
                  style={{ marginTop: 20 }}
                >
                  Excluir
                </Button>
              }

              {isDeleting &&
                <View style={styles.confirmDel}>
                  <Text style={styles.textWarning}>Confirma a exclusão? </Text>
                  <Text style={styles.textWarning}>Esta operação não poderá ser desfeita.</Text>
                </View>
              }









              {/* <Button onPress={() => console.log(params)}>Params</Button>
              <Button onPress={() => console.log(selectedTransaction)}>selectedTransaction</Button> */}
            </View>
          }

          <Divider style={{ marginTop: 20 }} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
            {/* Botão Cancelar */}
            <View style={{ width: params.type ? '48%' : '100%' }}>
              <Button
                mode="outlined"
                onPress={closeModal}
              >
                Cancelar
              </Button>
            </View>

            {/* Botão Salvar / Excluir */}
            {params.type && (
              <View style={{ width: '48%' }}>
                {isDeleting ?
                  <Button
                    onPress={() => del(selectedTransaction)}
                    mode="contained"
                    buttonColor="#A50C36">Excluir

                  </Button> :
                  <Button
                    mode="contained"
                    onPress={save} disabled={isInvalisForm()}>
                    Salvar
                  </Button>
                }
              </View>
            )}
          </View>

          {/* <Button onPress={() => console.log(params)}>Params</Button> */}

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
  confirmDel: {
    backgroundColor: '#FFB86A',
    padding: 14
  },
  monthText: {
    fontSize: 18,
    fontWeight: "bold",
    textTransform: "capitalize",
  },
  scrollArea: {
    flex: 1,
  },
  textWarning: {
    fontSize: 16,
    color: "#A50C36"
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 8,
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
    paddingVertical: 14,
  },
  summaryText: {
    fontSize: 14,
    marginVertical: 2,
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
    elevation: 5,
  },
  addButton: {
    backgroundColor: "#007bff",
    borderRadius: 50,
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    margin: 5
  },
  gradientLayer: {
    position: 'absolute',
    top: -30,
    left: 0,
    right: 0,
    height: 30, // Ajuste o valor conforme necessário para o efeito
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // Gradiente de branco transparente
    zIndex: 1, // Coloca o efeito na frente do conteúdo
  },
});
