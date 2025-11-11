import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { DataTable, Icon } from "react-native-paper";
import { AddTransactionModal } from "../components/AddTransactionModal";

export default function MonthlyControlScreen() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isOpenModal, setIsOpenModal] = useState(false)

  const formatMonth = (date: Date) =>
    date.toLocaleString("pt-br", { month: "long", year: "numeric" });

  const goToPreviousMonth = () => {
    const prev = new Date(currentDate);
    prev.setMonth(prev.getMonth() - 1);
    setCurrentDate(prev);
  };

  const goToNextMonth = () => {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + 1);
    setCurrentDate(next);
  };

  // MOCK
  const entries = [{ id: "1", desc: "Salário", value: 3500 }];
  const expenses = [{ id: "2", desc: "Conta de luz", value: 120 }];
  const creditCards = [
    {
      id: "card1",
      name: "Nubank",
      items: [
        { id: "3", desc: "Supermercado", value: 250 },
        { id: "4", desc: "Gasolina", value: 150 },
      ],
    },
  ];

  const totalEntries = entries.reduce((acc, t) => acc + t.value, 0);
  const totalExpenses = expenses.reduce((acc, t) => acc + t.value, 0);
  const totalCredit = creditCards
    .flatMap((c) => c.items)
    .reduce((acc, t) => acc + t.value, 0);

  const saldoParcial = totalEntries - totalExpenses;
  const saldoTotal = saldoParcial - totalCredit;
  const totalGastoMes = totalExpenses + totalCredit;

  return (
    <View style={styles.container}>
    
     
     <AddTransactionModal visible={isOpenModal} onDismiss={()=> setIsOpenModal(false)}/>
      
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goToPreviousMonth}>
        <Icon source="chevron-left" size={24} />
        {/* <MaterialIcons name="home-filled" size={size} color={color} /> */}
        </TouchableOpacity>

        <Text style={styles.monthText}>{formatMonth(currentDate)}</Text>

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
          {entries.map((item) => (
            <DataTable.Row key={item.id}>
              <DataTable.Cell>{item.desc}</DataTable.Cell>
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
          {expenses.map((item) => (
            <DataTable.Row key={item.id}>
              <DataTable.Cell>{item.desc}</DataTable.Cell>
              <DataTable.Cell numeric>R$ {item.value.toFixed(2)}</DataTable.Cell>
            </DataTable.Row>
          ))}
        </DataTable>

        {/* Cartões */}
        {creditCards.map((card) => (
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
        ))}

        {/* Espaço para o resumo fixo */}
        <View style={{ height: 130 }} />
      </ScrollView>

      {/* RESUMO FIXO */}
      <View style={styles.summaryContainer}>
        <View>
          <Text style={styles.summaryText}>Saldo parcial: R$ {saldoParcial}</Text>
          <Text style={styles.summaryText}>Saldo total: R$ {saldoTotal}</Text>
          <Text style={styles.summaryText}>Total gasto no mês: R$ {totalGastoMes}</Text>
        </View>

        {/* Botão flutuante */}
        <TouchableOpacity style={styles.fab}>
          <Text onPress={()=> setIsOpenModal(true)}>+</Text>
          {/* <Ionicons name="add" size={30} color="#fff" onPress={()=> } /> */}
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
