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
        <Text style={{ width: 70, paddingLeft: 10 }}>
          {transaction.purchaseDate 
            ? new Date(transaction.purchaseDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
            : new Date(transaction.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
        </Text>
        <Text style={{ paddingLeft: 40, flex: 1 }}>{transaction.description}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ marginRight: 8 }}>R$ {transaction.amount.toFixed(2)}</Text>
          <TouchableOpacity onPress={handleToggleConsolidated}>
            <Icon
              source={transaction.isConsolidated ? "check-circle" : "check-circle-outline"}
              size={20}
              color={transaction.isConsolidated ? "#2E9E57" : "#999"}
            />
          </TouchableOpacity>
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