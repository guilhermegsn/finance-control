import React, { useState } from 'react';
import { View } from 'react-native';
import { Modal, Portal, Text, TextInput, Button, RadioButton } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { insertItem } from '../database/realmHelpers';
import { Transaction } from '../interface/Transaction';
import { realm } from '../database/realm';
import { Balance } from '../interface/Balance';

type Props = {
  visible: boolean;
  onDismiss: () => void;
};

export const AddTransactionModal = ({ visible, onDismiss }: Props) => {



  const [params, setParams] = useState({
    description: '',
    value: '',
    type: 'expense' as 'income' | 'expense' | 'credit',
    date: new Date(),
  });
  const [showDatePicker, setShowDatePicker] = useState(false)


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

    const newTransaction = {
      description: params.description,
      value: parseFloat(params.value),
      type: params.type,
      date: params.date,
    } as Transaction

    insertItem('Transaction', newTransaction);
    updateBalanceAfterTransaction(newTransaction);

    // limpa e fecha
    setParams({
      description: '',
      value: '',
      type: 'expense',
      date: new Date(),
    });

    onDismiss();
  };


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
        <Text variant="titleMedium" style={{ marginBottom: 10 }}>
          Nova Transação
        </Text>

        <Text style={{ marginBottom: 4 }}>Tipo</Text>
        <RadioButton.Group
          onValueChange={(v) => setParams(prev => ({ ...prev, type: v as any }))}
          value={params.type}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 }}>
            <RadioButton.Item label="Entrada" value="income" />
            <RadioButton.Item label="Saída" value="expense" />
            <RadioButton.Item label="Cartão" value="credit" />
          </View>
        </RadioButton.Group>

        {params.type === 'credit' && (
          <View>
            <Text>Selecione o cartão</Text>
          </View>
        )}

        <TextInput
          label="Descrição"
          value={params.description}
          onChangeText={(text) => setParams(prev => ({ ...prev, description: text }))}
          mode="outlined"
          style={{ marginBottom: 10 }}
        />

        <TextInput
          label="Valor"
          value={params.value}
          onChangeText={(text) => setParams(prev => ({ ...prev, value: text }))}
          keyboardType="numeric"
          mode="outlined"
          style={{ marginBottom: 10 }}
        />

        <Button
          mode="outlined"
          onPress={() => setShowDatePicker(true)}
          style={{ marginBottom: 10 }}
        >
          {params.date.toLocaleDateString('pt-BR')}
        </Button>

        {showDatePicker && (
          <DateTimePicker
            value={params.date}
            mode="date"
            display="default"
            onChange={(_, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate)
                setParams(prev => ({ ...prev, date: selectedDate }));
            }}
          />
        )}

        <Button
          mode="contained"
          onPress={handleSave}
          style={{ marginTop: 10 }}
        >
          Salvar
        </Button>

        <Button
          mode="text"
          onPress={onDismiss}
          style={{ marginTop: 6 }}
        >
          Cancelar
        </Button>
      </Modal>
    </Portal>
  );
}  
