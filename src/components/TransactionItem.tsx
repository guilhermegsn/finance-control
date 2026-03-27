import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { withObservables } from '@nozbe/watermelondb/react';
import Transaction from '../models/Transactions';
import { TransactionService } from '../service/TransactionService';

interface TransactionItemProps {
  transaction: Transaction;
  onLongPress?: () => void;
}

function TransactionItemComponent({ transaction, onLongPress }: TransactionItemProps) {
  const handleToggleConsolidated = async () => {
    try {
      await TransactionService.toggleConsolidated(transaction);
    } catch (error) {
      console.error('Erro ao alternar consolidação:', error);
    }
  };

  return (
    <TouchableOpacity onLongPress={onLongPress} style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
        {/* @ts-ignore - WatermelonDB usa esta sintaxe para relacionamentos */}
        {!transaction._raw?.credit_card_id && (
          <TouchableOpacity onPress={handleToggleConsolidated}>
            <Icon
              source={transaction.isConsolidated ? "check-circle" : "check-circle-outline"}
              size={15}
              
              color={transaction.isConsolidated && transaction.type === 'income' ?  "#2E9E57" :
                transaction.isConsolidated && transaction.type === 'expense' ? "#CC4A4A"
                : "#999"}
            />
          </TouchableOpacity>
        )}
        {/* @ts-ignore - WatermelonDB usa esta sintaxe para relacionamentos */}
        <Text variant='labelMedium' style={{ width: 50, marginLeft: transaction._raw?.credit_card_id ? 32 : 15 }}>
          {transaction.purchaseDate
            ? new Date(transaction.purchaseDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
            : new Date(transaction.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
        </Text>
        <Text variant='labelMedium' style={{ flex: 1 }}>{transaction.description}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text variant='labelMedium'>R$ {transaction.amount.toFixed(2)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Envolver com withObservables para reatividade
const enhance = withObservables(['transaction'], ({ transaction }) => ({
  transaction,
}));

export default enhance(TransactionItemComponent);