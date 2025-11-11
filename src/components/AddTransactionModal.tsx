import React, { useState } from 'react';
import { View } from 'react-native';
import { Modal, Portal, Text, TextInput, Button, RadioButton } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { insertItem } from '../database/realmHelpers';

type Props = {
  visible: boolean;
  onDismiss: () => void;
};

export const AddTransactionModal = ({ visible, onDismiss }: Props) => {
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [type, setType] = useState<'income' | 'expense' | 'credit'>('expense');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSave = () => {
    if (!description.trim() || !value) return;

    insertItem('Transaction', {
      description,
      value: parseFloat(value),
      type,
      date,
    });

    // limpa e fecha
    setDescription('');
    setValue('');
    setType('expense');
    setDate(new Date());
    onDismiss();
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={{
        backgroundColor: 'white',
        margin: 20,
        borderRadius: 12,
        padding: 16
      }}>
        <Text variant="titleMedium" style={{ marginBottom: 10 }}>
          Nova Transação
        </Text>

        <TextInput
          label="Descrição"
          value={description}
          onChangeText={setDescription}
          mode="outlined"
          style={{ marginBottom: 10 }}
        />

        <TextInput
          label="Valor"
          value={value}
          onChangeText={setValue}
          keyboardType="numeric"
          mode="outlined"
          style={{ marginBottom: 10 }}
        />

        <Text style={{ marginBottom: 4 }}>Tipo</Text>
        <RadioButton.Group onValueChange={(v) => setType(v as any)} value={type}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 }}>
            <RadioButton.Item label="Entrada" value="income" />
            <RadioButton.Item label="Saída" value="expense" />
            <RadioButton.Item label="Cartão" value="credit" />
          </View>
        </RadioButton.Group>

        <Button
          mode="outlined"
          onPress={() => setShowDatePicker(true)}
          style={{ marginBottom: 10 }}
        >
          {date.toLocaleDateString('pt-BR')}
        </Button>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={(_, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setDate(selectedDate);
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
};
