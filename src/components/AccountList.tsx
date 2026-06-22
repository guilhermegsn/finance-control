import React from 'react';
import { View, FlatList, StyleSheet, Image, TouchableOpacity, Alert, Text } from 'react-native';
import { Icon } from 'react-native-paper';
import { withObservables } from '@nozbe/watermelondb/react';
import Account from '../models/Accounts';
import { AccountService } from '../service/AccountService';
import BankService from '../service/BankService';
import { useTheme } from '../contexts/ThemeContext';

const TYPE_LABEL: Record<string, string> = {
  checking: 'Corrente',
  savings: 'Poupança',
  investment: 'Investimento',
};

const AccountItem = ({ account, onEdit }: { account: Account; onEdit?: (account: Account) => void }) => {
  const { isDarkMode } = useTheme();

  const c = {
    card: isDarkMode ? '#161C27' : '#FFFFFF',
    border: isDarkMode ? '#2D3748' : '#E2E8F0',
    textPrimary: isDarkMode ? '#E2E8F0' : '#1A202C',
    textSecondary: isDarkMode ? '#718096' : '#64748B',
    sectionLabel: isDarkMode ? '#4A5568' : '#94A3B8',
  };

  const handleDelete = () => {
    Alert.alert(
      'Excluir conta',
      `Deseja excluir a conta "${account.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => AccountService.delete(account.id) },
      ]
    );
  };

  const logoSource = (() => {
    if (account.logoUrl) {
      return typeof account.logoUrl === 'string' ? { uri: account.logoUrl } : account.logoUrl;
    }
    if (account.bankCode?.trim()) {
      const bank = BankService.getBankByCode(account.bankCode);
      if (bank) return bank.logoUrl;
    }
    return null;
  })();

  const accentColor = account.color || '#6366F1';
  const typeLabel = TYPE_LABEL[account.type] ?? account.type;

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      {/* Logo / fallback */}
      <View style={[styles.logoWrap, { backgroundColor: `${accentColor}20` }]}>
        {logoSource ? (
          <Image source={logoSource} style={styles.logo} />
        ) : (
          <Icon source="wallet" size={22} color={accentColor} />
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={[styles.accountName, { color: c.textPrimary }]}>{account.name}</Text>
        <View style={[styles.typeBadge, { backgroundColor: `${accentColor}18` }]}>
          <Text style={[styles.typeBadgeText, { color: accentColor }]}>{typeLabel}</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {onEdit && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#6366F114' }]}
            onPress={() => onEdit(account)}
            activeOpacity={0.7}
          >
            <Icon source="pencil-outline" size={16} color="#6366F1" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#F43F5E14' }]}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <Icon source="trash-can-outline" size={16} color="#F43F5E" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const EnhancedAccountItem = withObservables(['account'], ({ account }) => ({
  account,
}))(AccountItem);

const AccountList = ({ accounts, onEdit }: { accounts: Account[]; onEdit?: (account: Account) => void }) => {
  const { isDarkMode } = useTheme();
  const textSecondary = isDarkMode ? '#718096' : '#64748B';

  if (accounts.length === 0) {
    return (
      <View style={styles.empty}>
        <Icon source="wallet-outline" size={48} color={textSecondary} />
        <Text style={[styles.emptyText, { color: textSecondary }]}>Nenhuma conta cadastrada</Text>
        <Text style={[styles.emptyHint, { color: textSecondary }]}>Toque em + para adicionar</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={accounts}
      keyExtractor={item => item.id}
      renderItem={({ item }) => <EnhancedAccountItem account={item} onEdit={onEdit} />}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
    />
  );
};

const enhance = withObservables([], () => ({
  accounts: AccountService.observeAccounts(),
}));

export default enhance(AccountList);

const styles = StyleSheet.create({
  list: {
    padding: 16,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  logoWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  info: {
    flex: 1,
    gap: 5,
  },
  accountName: {
    fontSize: 15,
    fontWeight: '600',
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  emptyHint: {
    fontSize: 13,
  },
});
