import React, { useState } from 'react';
import { View, Image } from 'react-native';
import { DataTable, Icon, Text } from 'react-native-paper';
import TransactionItem from './TransactionItem';
import CreditCard from '../models/CreditCard';
import Transaction from '../models/Transactions';
import { brandLogos } from '../utils/brandLogos';
import { 
  calculateInvoiceTotal, 
  filterTransactionsByInvoiceMonth,
  getInvoiceMonthDescription 
} from '../utils/creditCardInvoiceHelper';

interface CreditCardSectionProps {
  creditCards: CreditCard[];
  allTransactions: Transaction[]; // Todas as transações (incluindo cartão)
  currentDate: Date;
  onEditTransaction?: (transaction: Transaction) => void;
}

interface CreditCardInvoiceGroup {
  cardId: string;
  cardName: string;
  cardBrand: string;
  cardColor: string;
  closingDay: number;
  dueDay: number;
  limit: number;
  invoiceTotal: number;
  invoiceTransactions: Transaction[];
}

function CreditCardSectionComponent({ 
  creditCards, 
  allTransactions, 
  currentDate,
  onEditTransaction 
}: CreditCardSectionProps) {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Filtrar transações que têm credit_card_id (são transações de cartão)
  const creditCardTransactions = allTransactions.filter(t => 
    // @ts-ignore - WatermelonDB usa esta sintaxe para relacionamentos
    t._raw?.credit_card_id && t._raw.credit_card_id !== null
  );

  // Agrupar transações por cartão e calcular totais da fatura
  const creditCardGroups: CreditCardInvoiceGroup[] = creditCards.map(card => {
    const cardTransactions = creditCardTransactions.filter(t => 
      // @ts-ignore - WatermelonDB usa esta sintaxe para relacionamentos
      t._raw?.credit_card_id === card.id
    );
    
    const invoiceTransactions = filterTransactionsByInvoiceMonth(card, cardTransactions, currentDate);
    const invoiceTotal = calculateInvoiceTotal(card, cardTransactions, currentDate);

    return {
      cardId: card.id,
      cardName: card.name,
      cardBrand: card.brand,
      cardColor: card.color,
      closingDay: card.closingDay,
      dueDay: card.dueDay,
      limit: card.limit,
      invoiceTotal,
      invoiceTransactions,
    };
  });

  const toggleCardExpansion = (cardId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(cardId)) {
      newExpanded.delete(cardId);
    } else {
      newExpanded.add(cardId);
    }
    setExpandedCards(newExpanded);
  };

  const renderCardLogo = (brand: string) => {
    if (brandLogos[brand]) {
      return (
        <Image
          source={brandLogos[brand]}
          style={{ width: 24, height: 24, borderRadius: 12, marginRight: 8 }}
        />
      );
    }
    
    return (
      <View style={{
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#6200ee',
        marginRight: 8,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Icon source="credit-card-outline" size={16} color="#fff" />
      </View>
    );
  };

  if (creditCards.length === 0) {
    return (
      <View style={{ padding: 16, alignItems: 'center' }}>
        <Icon source="credit-card-outline" size={48} />
        <Text style={{ marginTop: 8, opacity: 0.6 }}>
          Nenhum cartão de crédito cadastrado
        </Text>
      </View>
    );
  }

  const totalInvoice = creditCardGroups.reduce((sum, group) => sum + group.invoiceTotal, 0);

  return (
    <DataTable>
      <Text style={{ fontSize: 16, fontWeight: "600", marginTop: 20, marginBottom: 8 }}>
        Cartões de Crédito
      </Text>
      
      {creditCardGroups.map((group) => {
        const isExpanded = expandedCards.has(group.cardId);

        return (
          <View key={group.cardId}>
            {/* Cabeçalho do Cartão */}
            <DataTable.Row onPress={() => toggleCardExpansion(group.cardId)}>
              <DataTable.Cell>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {renderCardLogo(group.cardBrand)}
                  <View>
                    <Text style={{ fontWeight: 'bold' }}>{group.cardName}</Text>
                    <Text style={{ fontSize: 12, opacity: 0.6 }}>
                      Fecha dia {group.closingDay} • Vence dia {group.dueDay}
                    </Text>
                  </View>
                </View>
              </DataTable.Cell>
              <DataTable.Cell>
                <Icon source={isExpanded ? "chevron-up" : "chevron-down"} size={16} />
              </DataTable.Cell>
              <DataTable.Cell numeric>
                <Text style={{ fontWeight: 'bold', fontSize: 14, color: '#CC4A4A' }}>
                  R$ {group.invoiceTotal.toFixed(2)}
                </Text>
              </DataTable.Cell>
            </DataTable.Row>

            {/* Conteúdo Expandido */}
            {isExpanded && (
              <>
                {/* Informações do cartão */}
                <DataTable.Row>
                  <DataTable.Cell style={{ maxWidth: 70, paddingLeft: 10 }}>
                    <Icon source="information" size={16} />
                  </DataTable.Cell>
                  <DataTable.Cell style={{ paddingLeft: 10 }}>
                    <Text style={{ opacity: 0.6, fontStyle: 'italic' }}>
                      {getInvoiceMonthDescription(creditCards.find(c => c.id === group.cardId)!, currentDate)}
                    </Text>
                  </DataTable.Cell>
                  <DataTable.Cell numeric>
                    <Text style={{ opacity: 0.6, fontStyle: 'italic' }}>
                      Limite: R$ {group.limit.toFixed(2)}
                    </Text>
                  </DataTable.Cell>
                </DataTable.Row>

                {/* Transações da fatura */}
                {group.invoiceTransactions.length > 0 ? (
                  group.invoiceTransactions.map((transaction) => (
                    <DataTable.Row key={transaction.id} onLongPress={() => onEditTransaction?.(transaction)}>
                      <DataTable.Cell style={{ paddingLeft: 10 }}>
                        <TransactionItem 
                          transaction={transaction} 
                          onLongPress={() => onEditTransaction?.(transaction)} 
                        />
                      </DataTable.Cell>
                    </DataTable.Row>
                  ))
                ) : (
                  <DataTable.Row>
                    <DataTable.Cell style={{ paddingLeft: 10 }}>
                      <Text style={{ opacity: 0.6, fontStyle: 'italic', padding: 8 }}>
                        Nenhuma transação nesta fatura
                      </Text>
                    </DataTable.Cell>
                  </DataTable.Row>
                )}
              </>
            )}
          </View>
        );
      })}

      {/* Total das Faturas */}
      <DataTable.Row>
        <DataTable.Cell>
          <Text style={{ fontWeight: 'bold' }}>TOTAL DAS FATURAS</Text>
        </DataTable.Cell>
        <DataTable.Cell numeric>
          <Text style={{ fontWeight: 'bold', color: '#CC4A4A' }}>
            R$ {totalInvoice.toFixed(2)}
          </Text>
        </DataTable.Cell>
      </DataTable.Row>
    </DataTable>
  );
}

export default CreditCardSectionComponent;