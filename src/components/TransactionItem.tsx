import React, { useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { withObservables } from '@nozbe/watermelondb/react';
import Transaction from '../models/Transactions';
import { TransactionService } from '../service/TransactionService';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../contexts/CurrencyContext';
import { formatCurrency } from '../utils/formatCurrency';


interface TransactionItemProps {
  transaction: Transaction;
  onLongPress?: () => void;
}

function TransactionItemComponent({ transaction, onLongPress }: TransactionItemProps) {

  const { theme } = useTheme()
  const { i18n } = useTranslation();
  const { currency } = useCurrency();
  const dateLocale = i18n.resolvedLanguage?.startsWith('en') ? 'en-US' : 'pt-BR';

  // @ts-ignore - WatermelonDB usa esta sintaxe para relacionamentos
  const isCreditCardTransaction = !!transaction._raw?.credit_card_id;
  // Transações de cartão não têm conceito de consolidação na exibição
  const textColor = isCreditCardTransaction || transaction.isConsolidated ? theme.text : 'gray';

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
        {!isCreditCardTransaction && (
          <TouchableOpacity onPress={handleToggleConsolidated}>
            <Icon
              source={transaction.isConsolidated ? "check-circle" : "check-circle-outline"}
              size={15}

              color={transaction.isConsolidated && transaction.type === 'income' ? theme.success :
                transaction.isConsolidated && transaction.type === 'expense' ? theme.danger
                  : "#999"}
            />
          </TouchableOpacity>
        )}

        <Text variant='labelMedium'
          style={{
            width: 50, marginLeft: isCreditCardTransaction ? 32 : 15,
            color: textColor
          }}>
          {transaction.purchaseDate
            ? new Date(transaction.purchaseDate).toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit' })
            : new Date(transaction.date).toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit' })}
        </Text>

        <Text variant='labelMedium'
          style={{ flex: 1, color: textColor }}>
          {transaction.description}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text variant='labelMedium'
            style={{ color: textColor }}>
            {formatCurrency(transaction.amount, currency)}
          </Text>
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
