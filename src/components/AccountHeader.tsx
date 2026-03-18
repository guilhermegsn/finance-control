import React from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import { DataTable, Icon, Text } from 'react-native-paper';
import BankService from '../service/BankService';

interface AccountHeaderProps {
  account: {
    id: string;
    name: string;
    color: string;
    logoUrl?: any;
    bankCode?: string;
  };
  totalBalance: number;
  isExpanded: boolean;
  onToggle: () => void;
}

export default function AccountHeader({ account, totalBalance, isExpanded, onToggle }: AccountHeaderProps) {
  return (
    <DataTable.Row onPress={onToggle}>
      <DataTable.Cell>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {(() => {
            // Logo do banco ou círculo colorido
            if (account?.logoUrl) {
              // Logo local (require) - usar diretamente
              return (
                <Image
                  source={typeof account.logoUrl === 'string' ? { uri: account.logoUrl } : account.logoUrl}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    marginRight: 8,
                  }}
                />
              );
            }

            if (account?.bankCode && account.bankCode.trim() !== '') {
              const bank = BankService.getBankByCode(account.bankCode);
              if (bank) {
                return (
                  <Image
                    source={bank.logoUrl}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      marginRight: 8,
                    }}
                  />
                );
              }
            }

            // Fallback para círculo colorido
            return (
              <View style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: account.color,
                marginRight: 8,
              }} />
            );
          })()}
          <Text style={{ fontWeight: 'bold' }}>{account.name}</Text>
        </View>
      </DataTable.Cell>
      <DataTable.Cell>
        <Icon
          source={isExpanded ? "chevron-up" : "chevron-down"}
          size={16}
        />
      </DataTable.Cell>
      <DataTable.Cell numeric>
        <Text style={{ fontWeight: 'bold', fontSize: 14 }}>R$ {totalBalance.toFixed(2)}</Text>
      </DataTable.Cell>
    </DataTable.Row>
  );
}