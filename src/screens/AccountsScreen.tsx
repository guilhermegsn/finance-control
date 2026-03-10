import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Appbar, Portal, Modal, TextInput, Button, Card, IconButton, FAB } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { AccountService } from '../service/AccountService';
import AccountList from '../components/AccountList';
import Account from '../models/Accounts';

export default function AccountsScreen() {
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);


  const [emptyParams] = useState<Partial<Account>>({
    name: "",
    initialBalance: 0,
    type: "checking",
    color: "#6200ee",
  })
  const [params, setParams] = useState<Partial<Account>>(emptyParams)

  const handleAdd = async () => {
    if (!params.name || !user) {
      Alert.alert('Erro', 'Preencha o nome da conta');
      return;
    }

    try {
      await AccountService.create({
        name: params.name,
        initialBalance: params.initialBalance || 0,
        type: params.type || 'checking',
        color: params.color || '#6200ee',
        userId: user.id,
      });

      // Limpar formulário e fechar modal
      setParams(emptyParams);
      setModalVisible(false);

    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Erro ao criar conta');
    }
  };

  const handleEdit = (account: any) => {
    setEditingAccount(account);
    setParams({
      name: account.name,
      initialBalance: account.initialBalance,
      type: account.type,
      color: account.color,
    });
    setModalVisible(true);
  };

  const handleUpdate = async () => {
    if (!editingAccount || !params.name || !user) {
      Alert.alert('Erro', 'Preencha o nome da conta');
      return;
    }

    try {
      // Atualizar conta localmente usando a função update
      await AccountService.update(editingAccount.id, {
        name: params.name,
        initialBalance: params.initialBalance || 0,
        type: params.type || 'checking',
        color: params.color || '#6200ee',
      });

      // Limpar formulário e fechar modal
      setParams(emptyParams);
      setEditingAccount(null);
      setModalVisible(false);

    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Erro ao atualizar conta');
    }
  };

  const resetForm = () => {
    setParams(emptyParams);
    setEditingAccount(null);
    setModalVisible(false)
  };

  return (
    <View style={styles.container}>

      {/* Lista de Contas */}
      <AccountList onEdit={handleEdit} />

      {/* Floating Action Button para adicionar nova conta */}
      <FAB
        style={styles.fab}
        icon="plus"
        color="white"
        onPress={() => setModalVisible(true)}
      />

      {/* Modal para adicionar nova conta */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={resetForm}
          contentContainerStyle={styles.modalContainer}
        >
          <Card>
            <Card.Title
              title={editingAccount ? 'Editando conta' : "Nova Conta"}
              right={(props) => (
                <IconButton
                  {...props}
                  icon="close"
                  onPress={() => {
                    setModalVisible(false)
                    resetForm();
                  }}
                />
              )}
            />
            <Card.Content>
              <TextInput
                label="Nome da Conta (ex: Nubank)"
                value={params.name || ''}
                onChangeText={(text) => setParams({ ...params, name: text })}
                style={styles.input}
                mode="outlined"
                autoFocus
              />
              <TextInput
                label="Saldo Inicial"
                value={params.initialBalance?.toString() || ''}
                onChangeText={(text) => setParams({ ...params, initialBalance: parseFloat(text) || 0 })}
                keyboardType="numeric"
                style={styles.input}
                mode="outlined"
              />
              <TextInput
                label="Tipo (checking, savings, investment)"
                value={params.type || ''}
                onChangeText={(text) => setParams({ ...params, type: text })}
                style={styles.input}
                mode="outlined"
              />
              <TextInput
                label="Cor (hexadecimal)"
                value={params.color || ''}
                onChangeText={(text) => setParams({ ...params, color: text })}
                style={styles.input}
                mode="outlined"
              />
            </Card.Content>
            <Card.Actions>
              <Button onPress={() => {
                setModalVisible(false)
                resetForm();
              }}>
                Cancelar
              </Button>
              <Button mode="contained" onPress={editingAccount ? handleUpdate : handleAdd}>
                Salvar
              </Button>
            </Card.Actions>
          </Card>
        </Modal>
      </Portal>


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    marginBottom: 12
  },
  modalContainer: {
    padding: 20,
  },
});
