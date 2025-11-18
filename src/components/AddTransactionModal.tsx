import React, { useState } from 'react';
import { View } from 'react-native';
import { Modal, Portal, Text, TextInput, Button, RadioButton, Checkbox } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { insertItem } from '../database/realmHelpers';
import { Recurrence, Transaction } from '../interface/Transaction';
import { realm } from '../database/realm';
import { Balance } from '../interface/Balance';
import { RecurringTransaction } from '../interface/RecurringTransaction';

type Props = {
  visible: boolean;
  onDismiss: () => void;
}

type DateType = 'date' | 'endDate' | null

interface Params {
  type: string;
  description: string;
  value: string;
  date: Date;
  endDate?: Date; // Aqui o endDate é opcional
  recurrency: Recurrence;
  noEndDate: boolean,
}
export const AddTransactionModal = ({ visible, onDismiss }: Props) => {

  const [emptyParams] = useState<Params>({
    type: '',
    description: '',
    value: '',
    date: new Date(),
    endDate: undefined,
    recurrency: 'unique',
    noEndDate: false,
  })
  const [params, setParams] = useState<Params>(emptyParams)
  const [activePicker, setActivePicker] = useState<DateType>(null);



  const handleDateChange = (event: any, selectedDate: Date | undefined) => {
    const currentDate = selectedDate || params[activePicker!];  // Use o valor anterior se não tiver seleção
    setParams(prevData => ({
      ...prevData,
      [activePicker!]: currentDate,  // Atualiza a data correspondente ao activePicker
      noEndDate: prevData.endDate ? true : false
    }));

    // Fecha o picker depois da seleção
    setActivePicker(null);
  };


  const updateBalanceAfterTransaction = (transaction: Transaction) => {
    if (!transaction.date) return
    const monthKey = `${transaction.date.getFullYear()}-${String(transaction.date.getMonth() + 1).padStart(2, '0')}`;

    realm.write(() => {
      let balance = realm.objectForPrimaryKey('Balance', monthKey) as Balance

      if (!balance) {
        if (!transaction.date) return
        balance = realm.create('Balance', {
          id: monthKey,
          month: transaction.date.getMonth() + 1,
          year: transaction.date.getFullYear(),
          income: 0,
          expense: 0,
          credit: 0,
          partialBalance: 0,
        });
      }

      if (transaction.type === 'income') balance.income += transaction.value;
      if (transaction.type === 'expense') balance.expense += transaction.value;
      if (transaction.type === 'credit') balance.credit += transaction.value;

      balance.partialBalance = balance.income - balance.expense - balance.credit;
    });
  }



  const handleSave = () => {
    if (!params.description.trim() || !params.value) return;

    if (params.recurrency === 'unique') {
      const newTransaction = {
        description: params.description,
        value: parseFloat(params.value),
        type: params.type,
        date: params.date,
      } as Transaction

      insertItem('Transaction', newTransaction);
      updateBalanceAfterTransaction(newTransaction);

    } else {
      const newRecurrencyTransaction = {
        type: params.type,
        description: params.description,
        amount: parseFloat(params.value),
        startDate: params.date,
        recurrence: params.recurrency,
        endDate: params.endDate
      } as RecurringTransaction

      insertItem('RecurringTransaction', newRecurrencyTransaction)
      
    }
    setParams(emptyParams)
    onDismiss()
  };


  const isInvalidForm = () => {
    if (!params.value || !params.description)
      return true
    return false
  }

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={{
          backgroundColor: 'white',
          margin: 20,
          borderRadius: 12,
          padding: 16,
        }}
      >
        <Text variant="titleMedium" style={{ marginBottom: 12, fontWeight: 'bold' }}>
          Nova Transação
        </Text>

        <Text style={{ marginBottom: 6 }}>Tipo</Text>
        <RadioButton.Group
          onValueChange={(v) => setParams(prev => ({ ...prev, type: v as any }))}
          value={params.type}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
            <RadioButton.Item label="Entrada" value="income" />
            <RadioButton.Item label="Saída" value="expense" />
            <RadioButton.Item label="Cartão" value="credit" />
          </View>
        </RadioButton.Group>

        <TextInput
          label="Descrição"
          value={params.description}
          onChangeText={(text) => setParams(prev => ({ ...prev, description: text }))}
          mode="outlined"
          style={{ marginBottom: 16 }}
        />


        <TextInput
          label="Valor"
          value={params.value}
          onChangeText={(text) => setParams(prev => ({ ...prev, value: text }))}
          keyboardType="numeric"
          mode="outlined"
          style={{ marginBottom: 16 }}
        />

        <Button
          mode="outlined"
          onPress={() => setActivePicker('date')}
          style={{ marginBottom: 16 }}
        >
          {params.date.toLocaleDateString('pt-BR')}
        </Button>

        {/* DateTimePicker (um único picker) */}
        {activePicker && (
          <DateTimePicker
            value={params[activePicker] || new Date()}  // Mostra a data correspondente (startDate ou endDate)
            mode="date"  // Pode ser 'date', 'time', ou 'datetime'
            display="default"
            onChange={handleDateChange}  // Passa o evento e a data selecionada para a função
          />
        )}

        <Text style={{ marginBottom: 6 }}>Frequência</Text>
        <RadioButton.Group
          onValueChange={(v) => setParams(prev => ({ ...prev, recurrency: v as any }))}
          value={params.recurrency}
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 }}>
            <RadioButton.Item label="Única" value="unique" />
            <RadioButton.Item label="Mensal" value="monthly" />
            <RadioButton.Item label="Anual" value="yearly" />
          </View>
        </RadioButton.Group>


        <Text style={{ marginBottom: 6 }}>Fim</Text>


        {params.recurrency !== 'unique' && params.recurrency !== 'installments' &&
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Checkbox
              status={params.noEndDate ? 'checked' : 'unchecked'}
              onPress={() => setParams(prev => ({ ...prev, noEndDate: !prev.noEndDate, endDate: undefined }))}
            />
            <Text>Sem data fim</Text>
          </View>

        }

        {params.recurrency !== 'unique' &&
          <View>

            <Button
              mode="outlined"
              onPress={() => setActivePicker('endDate')}
              style={{ marginBottom: 16 }}
            >
              {params.endDate ? params.endDate.toLocaleDateString('pt-BR') : 'Selecione a data fim'}
            </Button>
          </View>
        }

        <Button
          disabled={isInvalidForm()}
          mode="contained"
          onPress={handleSave}
          style={{ marginTop: 16 }}
        >
          Salvar
        </Button>

        <Button
          mode="text"
          onPress={onDismiss}
          style={{ marginTop: 8 }}
        >
          Cancelar
        </Button>
      </Modal>
    </Portal>

  );
}  
