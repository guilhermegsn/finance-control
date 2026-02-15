import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from "dayjs";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { DataTable, Icon} from "react-native-paper";
import { Transaction, TransactionType } from "../interface/Transaction";
// Tipos
interface Params {
  id: string, description: string, value: string, date: Date,
  startDate?: Date | null, endDate?: Date | null,
  type: TransactionType | null, isRecurrence: boolean, installments?: string
}

export default function MonthlyControlScreen() {

  const [currentDate, setCurrentDate] = useState(new Date());


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
          {[].map((item: Transaction) => (
            <DataTable.Row key={item._id} onLongPress={() => null}>
              <DataTable.Cell style={{ maxWidth: 70 }}>{dayjs(item.date).format('DD/MM')}</DataTable.Cell>
              <DataTable.Cell>{item.description}</DataTable.Cell>
              <DataTable.Cell numeric>R$ {item.value.toFixed(2)}</DataTable.Cell>
            </DataTable.Row>
          ))}
          <DataTable.Row key={`totalEntries`}>
            <DataTable.Cell>TOTAL</DataTable.Cell>
            <DataTable.Cell numeric><Text style={{ fontWeight: 'bold' }}> 00 </Text></DataTable.Cell>
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
          {[].map((item: Transaction) => (
            <DataTable.Row onLongPress={() => null} key={item._id.toString()}>
              <DataTable.Cell style={{ maxWidth: 70 }}>{dayjs(item.date).format('DD/MM')}</DataTable.Cell>
              <DataTable.Cell>{item.description}</DataTable.Cell>
              <DataTable.Cell numeric>R$ {item.value.toFixed(2)}</DataTable.Cell>
            </DataTable.Row>
          ))}
          <DataTable.Row key={`totalExpenses`}>
            <DataTable.Cell>TOTAL</DataTable.Cell>
            <DataTable.Cell numeric><Text style={{ fontWeight: 'bold' }}> 00 </Text></DataTable.Cell>
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
          {[].map((item: Transaction) => (
            <DataTable.Row onLongPress={() => null} key={item._id.toString()}>
              <DataTable.Cell style={{ maxWidth: 70 }}>{dayjs(item.date).format('DD/MM')}</DataTable.Cell>
              <DataTable.Cell>{item.description}</DataTable.Cell>
              <DataTable.Cell numeric>R$ {item.value.toFixed(2)}</DataTable.Cell>
            </DataTable.Row>
          ))}
          <DataTable.Row key={`totalCredits`}>
            <DataTable.Cell>TOTAL</DataTable.Cell>
            <DataTable.Cell numeric><Text style={{ fontWeight: 'bold' }}> R$00 </Text></DataTable.Cell>
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
            <Text style={styles.summaryTextBold}> R$</Text>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <Text style={styles.summaryText}>Saldo Total:</Text>
            <Text style={styles.summaryText}> R$</Text>
          </View>
        </View>

        <TouchableOpacity onPress={()=> null} style={styles.fab}>
          <Icon source="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* <Portal>
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
        </Modal>
      </Portal> */}
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