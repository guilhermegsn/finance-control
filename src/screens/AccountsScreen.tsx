import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, FlatList, TouchableOpacity, Image } from 'react-native';
import { Portal, Modal, TextInput, Button, Card, IconButton, FAB, List } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { AccountService } from '../service/AccountService';
import BankService, { BankWithLogo } from '../service/BankService';
import AccountList from '../components/AccountList';
import Account from '../models/Accounts';

export default function AccountsScreen() {
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [bankSuggestions, setBankSuggestions] = useState<BankWithLogo[]>([]);
  const [selectedBank, setSelectedBank] = useState<BankWithLogo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [emptyParams] = useState<Partial<Account>>({
    name: "",
    type: "checking",
    color: "#6200ee",
    logoUrl: "",
    bankCode: "",
  })
  const [params, setParams] = useState<Partial<Account>>(emptyParams)

  // Buscar sugestões de bancos quando o termo de busca mudar
  useEffect(() => {
    if (searchQuery.length < 2) {
      setBankSuggestions([]);
      return;
    }

    const suggestions = BankService.searchBanks(searchQuery);
    setBankSuggestions(suggestions.slice(0, 5)); // Limitar a 5 sugestões
  }, [searchQuery]);

  const handleBankSelect = (bank: BankWithLogo) => {
    setSelectedBank(bank);
    setParams({
      ...params,
      name: bank.displayName,
      logoUrl: bank.logoUrl,
      bankCode: bank.code || '',
    });
    setSearchQuery(bank.displayName);
    setBankSuggestions([]);
  };

  const handleAdd = async () => {
    if (!params.name || !user) {
      Alert.alert('Erro', 'Preencha o nome da conta');
      return;
    }

    try {
      await AccountService.create({
        name: params.name,
        type: params.type || 'checking',
        color: params.color || '#6200ee',
        logoUrl: params.logoUrl || '',
        bankCode: params.bankCode || '',
        userId: user.id,
      });

      resetForm();

    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Erro ao criar conta');
    }
  };

  const handleEdit = (account: any) => {
    setEditingAccount(account);
    setParams({
      name: account.name,
      type: account.type,
      color: account.color,
      logoUrl: account.logoUrl || '',
      bankCode: account.bankCode || '',
    });
    
    // Se houver código do banco, tentar buscar informações
    if (account.bankCode) {
      const bank = BankService.getBankByCode(account.bankCode);
      if (bank) {
        setSelectedBank(bank);
        setSearchQuery(bank.name);
      } else {
        setSelectedBank(null);
        setSearchQuery(account.name);
      }
    } else {
      setSelectedBank(null);
      setSearchQuery(account.name);
    }
    
    setModalVisible(true);
  };

  const handleUpdate = async () => {
    if (!editingAccount || !params.name || !user) {
      Alert.alert('Erro', 'Preencha o nome da conta');
      return;
    }

    try {
      await AccountService.update(editingAccount.id, {
        name: params.name,
        type: params.type || 'checking',
        color: params.color || '#6200ee',
        logoUrl: params.logoUrl || '',
        bankCode: params.bankCode || '',
      });

      resetForm();

    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Erro ao atualizar conta');
    }
  };

  const resetForm = () => {
    setParams(emptyParams);
    setEditingAccount(null);
    setSelectedBank(null);
    setSearchQuery('');
    setBankSuggestions([]);
    setModalVisible(false);
  };

  const renderBankSuggestion = ({ item }: { item: BankWithLogo }) => (
    <TouchableOpacity onPress={() => handleBankSelect(item)}>
      <List.Item
        title={item.displayName}
        description={item.name}
        left={() => (
          <Image
            source={item.logoUrl}
            style={styles.bankLogo}
          />
        )}
        right={props => item.code && <List.Icon {...props} icon="chevron-right" />}
      />
    </TouchableOpacity>
  );

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
                  onPress={resetForm}
                />
              )}
            />
            <Card.Content>
              {/* Campo de busca inteligente de bancos */}
              <View style={styles.bankSearchContainer}>
                <TextInput
                  label="Nome do Banco (ex: Nubank, Itaú)"
                  value={searchQuery}
                  onChangeText={(text) => {
                    setSearchQuery(text);
                    setParams({ ...params, name: text });
                    if (!text) {
                      setSelectedBank(null);
                      setParams({ ...params, logoUrl: '', bankCode: '' });
                    }
                  }}
                  style={styles.input}
                  mode="outlined"
                  autoFocus
                  right={
                    selectedBank ? (
                      <TextInput.Icon 
                        icon="close" 
                        onPress={() => {
                          setSelectedBank(null);
                          setSearchQuery('');
                          setParams({ ...params, logoUrl: '', bankCode: '' });
                        }}
                      />
                    ) : null
                  }
                />

                {/* Logo do banco selecionado */}
                {/* {selectedBank && (
                  <View style={styles.selectedBankContainer}>
                    <Image
                      source={selectedBank.logoUrl}
                      style={styles.selectedBankLogo}
                    />
                    <View style={styles.selectedBankInfo}>
                      <TextInput
                        label="Nome do Banco"
                        value={selectedBank.name}
                        style={styles.input}
                        mode="outlined"
                        editable={false}
                      />
                      {selectedBank.code && (
                        <TextInput
                          label="Código do Banco"
                          value={selectedBank.code}
                          style={styles.input}
                          mode="outlined"
                          editable={false}
                        />
                      )}
                    </View>
                  </View>
                )} */}

                {/* Lista de sugestões */}
                {bankSuggestions.length > 0 && (
                  <Card style={styles.suggestionsCard}>
                    <Card.Content style={{ padding: 0 }}>
                      <FlatList
                        data={bankSuggestions}
                        renderItem={renderBankSuggestion}
                        keyExtractor={(item) => item.id}
                        keyboardShouldPersistTaps="handled"
                      />
                    </Card.Content>
                  </Card>
                )}
              </View>

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
              <Button onPress={resetForm}>
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
    maxHeight: '80%',
  },
  bankSearchContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  suggestionsCard: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    zIndex: 1000,
    maxHeight: 200,
    elevation: 5,
  },
  bankLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
  },
  selectedBankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectedBankLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  selectedBankInfo: {
    flex: 1,
  },
});
