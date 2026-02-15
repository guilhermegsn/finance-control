import React from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { List, IconButton, Text, Surface } from 'react-native-paper';
import { withObservables } from '@nozbe/watermelondb/react';
import Account from '../models/Accounts';
import { accountService } from '../service/AccountService';

// Componente de Item Individual
const AccountItem = ({ account }: { account: Account }) => {
  const handleDelete = () => {
    accountService.delete(account.id);
  };

  return (
    <Surface style={styles.card} elevation={1}>
      <List.Item
        title={account.name}
        description={`Saldo Inicial: R$ ${account.initialBalance.toFixed(2)}`}
        left={props => <List.Icon {...props} icon="wallet" color={account.color} />}
        right={props => (
          <IconButton {...props} icon="delete" onPress={handleDelete} />
        )}
      />
    </Surface>
  );
};

// Wrapper para tornar o item reativo (se mudar o nome, atualiza sozinho)
const EnhancedAccountItem = withObservables(['account'], ({ account }) => ({
  account, // Observa o próprio objeto
}))(AccountItem);

// Componente da Lista
const AccountList = ({ accounts }: { accounts: Account[] }) => {
  if (accounts.length === 0) {
    return (
        <View style={styles.empty}>
            <Text>Nenhuma conta cadastrada.</Text>
        </View>
    );
  }

  return (
    <FlatList
      data={accounts}
      keyExtractor={item => item.id}
      renderItem={({ item }) => <EnhancedAccountItem account={item} />}
      contentContainerStyle={{ padding: 16 }}
    />
  );
};

// A MAGIA: Conecta a query do banco às props do componente
const enhance = withObservables([], () => ({
  accounts: accountService.observeAccounts(),
}));

export default enhance(AccountList);

const styles = StyleSheet.create({
  card: {
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: 'white',
  },
  empty: {
    padding: 20,
    alignItems: 'center'
  }
});