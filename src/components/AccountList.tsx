import React from 'react';
import { View, FlatList, StyleSheet, Image } from 'react-native';
import { List, IconButton, Text, Surface, useTheme } from 'react-native-paper';
import { withObservables } from '@nozbe/watermelondb/react';
import Account from '../models/Accounts';
import { AccountService } from '../service/AccountService';
import BankService from '../service/BankService';

// Componente de Item Individual
const AccountItem = ({ account, onEdit }: { account: Account; onEdit?: (account: Account) => void }) => {

  const theme = useTheme()
  const handleDelete = () => {
    AccountService.delete(account.id);
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(account);
    }
  };

  // Determinar qual ícone/logo usar
  const renderLeftIcon = (props: any) => {
    // Se houver logoUrl (que agora é um require local)
    if (account.logoUrl) {
      return (
        <Image
          source={typeof account.logoUrl === 'string' ? { uri: account.logoUrl } : account.logoUrl}
          style={styles.bankLogo}
        />
      );
    }

    // Se houver código do banco, tentar buscar logo
    if (account.bankCode && account.bankCode.trim() !== '') {
      const bank = BankService.getBankByCode(account.bankCode);
      if (bank) {
        return (
          <Image
            source={bank.logoUrl}
            style={styles.bankLogo}
          />
        );
      }
    }

    // Caso contrário, usar ícone padrão
    return <List.Icon {...props} icon="wallet" color={account.color} />;
  };

  return (
    <Surface style={[styles.card,{
      backgroundColor: theme.dark ? '#2A2D3E' : '#FFFFFF',
      borderColor: theme.dark ? 'transparent' : '#E5E7EB',
      borderWidth: theme.dark ? 0 : 1,
    }]} elevation={1}>
      <List.Item
        title={account.name}
        left={renderLeftIcon}
        right={props => (
          <View style={{ flexDirection: 'row' }}>
            {onEdit && (
              <IconButton {...props} icon="pencil" onPress={handleEdit} />
            )}
            <IconButton {...props} icon="delete" onPress={handleDelete} />
          </View>
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
const AccountList = ({ accounts, onEdit }: { accounts: Account[]; onEdit?: (account: Account) => void }) => {
  const theme = useTheme()
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
      renderItem={({ item }) => <EnhancedAccountItem account={item} onEdit={onEdit} />}
      contentContainerStyle={styles.listContainer}
    />
  );
};

// 1. A MAGIA: Conecta a query do banco às props do componente
const enhance = withObservables([], () => ({
  accounts: AccountService.observeAccounts(),
}));


export default enhance(AccountList);

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
  },
  card: {
    marginBottom: 8,
    borderRadius: 8,
  },
  empty: {
    padding: 20,
    alignItems: 'center'
  },
  bankLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: 8,
    marginLeft: 18
  },
});
