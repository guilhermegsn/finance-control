import React from 'react';
import { View, Image, TouchableOpacity } from 'react-native';
import { DataTable, Icon, Text } from 'react-native-paper';
import TransactionItem from './TransactionItem';
import BankService from '../service/BankService';
import Transaction from '../models/Transactions';

export type SyntheticTransaction = {
  id: string;
  description: string;
  amount: number;
  type: 'expense';
  date: Date;
  isVirtualInvoice: true;
  creditCardId: string;
  accountId: string;
  transactionIds: string[];
};

export type MixedTransaction = Transaction | SyntheticTransaction;

export interface AccountTransactionGroup {
  accountId: string;
  accountName: string;
  accountColor: string;
  previousBalance: number;
  totalBalance: number;
  income: {
    total: number;
    transactions: Transaction[];
  };
  expense: {
    total: number;
    transactions: MixedTransaction[];
  };
}

interface AccountsTableProps {
  accountTransactionGroups: AccountTransactionGroup[];
  accounts: any[];
  expandedAccounts: Set<string>;
  onToggleAccount: (accountId: string) => void;
  onEditTransaction: (transaction: Transaction) => void;
  onConsolidateInvoice?: (invoice: SyntheticTransaction) => void;
  totalBalance: number;
  currentDate: Date;
}

export default function AccountsTable({
  accountTransactionGroups,
  accounts,
  expandedAccounts,
  onToggleAccount,
  onEditTransaction,
  onConsolidateInvoice,
  totalBalance,
  currentDate,
}: AccountsTableProps) {
  
  const renderAccountLogo = (group: AccountTransactionGroup) => {
    const account = accounts.find(acc => acc.id === group.accountId);

    if (account?.logoUrl) {
      return (
        <Image
          source={typeof account.logoUrl === 'string' ? { uri: account.logoUrl } : account.logoUrl}
          style={{ width: 24, height: 24, borderRadius: 12, marginRight: 8 }}
        />
      );
    }

    if (account?.bankCode && account.bankCode.trim() !== '') {
      const bank = BankService.getBankByCode(account.bankCode);
      if (bank) {
        return (
          <Image
            source={bank.logoUrl}
            style={{ width: 24, height: 24, borderRadius: 12, marginRight: 8 }}
          />
        );
      }
    }

    return (
      <View style={{
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: group.accountColor,
        marginRight: 8,
      }} />
    );
  };

  return (
    <DataTable>
      {accountTransactionGroups.map((group) => {
        const isExpanded = expandedAccounts.has(group.accountId);

        return (
          <View key={group.accountId}>
            {/* Cabeçalho da Conta */}
            <DataTable.Row onPress={() => onToggleAccount(group.accountId)}>
              <DataTable.Cell>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {renderAccountLogo(group)}
                  <Text style={{ fontWeight: 'bold' }}>{group.accountName}</Text>
                </View>
              </DataTable.Cell>
              <DataTable.Cell>
                <Icon source={isExpanded ? "chevron-up" : "chevron-down"} size={16} />
              </DataTable.Cell>
              <DataTable.Cell numeric>
                <Text style={{ fontWeight: 'bold', fontSize: 14 }}>R$ {group.totalBalance.toFixed(2)}</Text>
              </DataTable.Cell>
            </DataTable.Row>

            {/* Conteúdo Expandido */}
            {isExpanded && (
              <>
                {/* Saldo Anterior */}
                {group.previousBalance !== 0 && (
                  <DataTable.Row>
                    <DataTable.Cell style={{ maxWidth: 70, paddingLeft: 10 }}>
                      <Icon source="history" size={16} />
                    </DataTable.Cell>
                    <DataTable.Cell style={{ paddingLeft: 10 }}>
                      <Text style={{ opacity: 0.6, fontStyle: 'italic' }}>Saldo Inicial do Mês</Text>
                    </DataTable.Cell>
                    <DataTable.Cell numeric>
                      <Text style={{ opacity: 0.6, fontStyle: 'italic' }}>R$ {group.previousBalance.toFixed(2)}</Text>
                    </DataTable.Cell>
                  </DataTable.Row>
                )}

                {/* Entradas */}
                {group.income.transactions.length > 0 && (
                  <>
                    <DataTable.Row>
                      <DataTable.Cell style={{ maxWidth: 70, paddingLeft: 10 }}>
                        <Icon source="arrow-up-bold-circle" size={16} color="#2E9E57" />
                      </DataTable.Cell>
                      <DataTable.Cell style={{ paddingLeft: 20 }}>
                        <Text style={{ color: '#2E9E57', fontWeight: '600' }}>Entradas</Text>
                      </DataTable.Cell>
                      <DataTable.Cell numeric>
                        <Text style={{ color: '#2E9E57', fontWeight: '600' }}>R$ {group.income.total.toFixed(2)}</Text>
                      </DataTable.Cell>
                    </DataTable.Row>
                    {group.income.transactions.map((item) => (
                      <DataTable.Row key={item.id} onLongPress={() => onEditTransaction(item)}>
                        <DataTable.Cell style={{ paddingLeft: 10 }}>
                          <TransactionItem transaction={item} onLongPress={() => onEditTransaction(item)} />
                        </DataTable.Cell>
                      </DataTable.Row>
                    ))}
                  </>
                )}

                {/* Saídas */}
                {group.expense.transactions.length > 0 && (
                  <>
                    <DataTable.Row>
                      <DataTable.Cell style={{ maxWidth: 70, paddingLeft: 10 }}>
                        <Icon source="arrow-down-bold-circle" size={16} color="#CC4A4A" />
                      </DataTable.Cell>
                      <DataTable.Cell style={{ paddingLeft: 20 }}>
                        <Text style={{ color: '#CC4A4A', fontWeight: '600' }}>Saídas</Text>
                      </DataTable.Cell>
                      <DataTable.Cell numeric>
                        <Text style={{ color: '#CC4A4A', fontWeight: '600' }}>R$ {group.expense.total.toFixed(2)}</Text>
                      </DataTable.Cell>
                    </DataTable.Row>
                    {group.expense.transactions.map((item) => {
                      if ('isVirtualInvoice' in item) {
                        return (
                          <DataTable.Row key={item.id}>
                            <DataTable.Cell style={{ paddingLeft: 10 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                                  <Text style={{ width: 70, paddingLeft: 10 }}>
                                    {item.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                  </Text>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingLeft: 40 }}>
                                    <Icon source="credit-card-outline" size={16} color="#666" />
                                    <Text style={{ marginLeft: 6 }}>{item.description}</Text>
                                  </View>
                                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={{ marginRight: 8 }}>R$ {item.amount.toFixed(2)}</Text>
                                    <TouchableOpacity onPress={() => onConsolidateInvoice && onConsolidateInvoice(item as SyntheticTransaction)}>
                                      <Icon source="check-circle-outline" size={20} color="#999" />
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              </View>
                            </DataTable.Cell>
                          </DataTable.Row>
                        );
                      }
                      return (
                        <DataTable.Row key={item.id} onLongPress={() => onEditTransaction(item as Transaction)}>
                          <DataTable.Cell style={{ paddingLeft: 10 }}>
                            <TransactionItem transaction={item as Transaction} onLongPress={() => onEditTransaction(item as Transaction)} />
                          </DataTable.Cell>
                        </DataTable.Row>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </View>
        );
      })}

      {/* Total Geral */}
      <DataTable.Row>
        <DataTable.Cell>
          <Text style={{ fontWeight: 'bold' }}>TOTAL GERAL</Text>
        </DataTable.Cell>
        <DataTable.Cell numeric>
          <Text style={{ fontWeight: 'bold' }}>R$ {totalBalance.toFixed(2)}</Text>
        </DataTable.Cell>
      </DataTable.Row>
    </DataTable>
  );
}
