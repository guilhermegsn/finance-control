import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Appbar } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { accountService } from '../service/AccountService'
import AccountList from '../components/AccountList';

export default function TestScreen() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');

  const handleAdd = async () => {
    if (!name || !user) return;

    try {
      await accountService.create({
        name,
        initialBalance: parseFloat(balance) || 0,
        type: 'checking',
        color: '#6200ee',
        userId: user.id, // OBRIGATÓRIO: Liga o dado ao usuário logado
      });
      setName('');
      setBalance('');
    } catch (error) {
      console.error(error);
      alert('Erro ao criar conta');
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Minhas Carteiras (Local DB)" />
      </Appbar.Header>

      <View style={styles.form}>
        <TextInput
          label="Nome da Conta (ex: Nubank)"
          value={name}
          onChangeText={setName}
          style={styles.input}
        />
        <TextInput
          label="Saldo Inicial"
          value={balance}
          onChangeText={setBalance}
          keyboardType="numeric"
          style={styles.input}
        />
        <Button mode="contained" onPress={handleAdd}>
          Adicionar Conta
        </Button>
      </View>

      <AccountList />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  form: { padding: 16, backgroundColor: 'white', elevation: 2 },
  input: { marginBottom: 12 },
});