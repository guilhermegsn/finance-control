import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { List, Text, Icon, DataTable } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { brandLogos } from '../utils/brandLogos';
import { getInvoiceMonth } from '../utils/creditCardUtils';
import CreditCard from '../models/CreditCard';
import Transaction from '../models/Transactions';

interface CreditCardSectionProps {
  creditCards: CreditCard[];
  transactions: Transaction[];
  currentMonth: number; // 0-indexed
  currentYear: number;
}

const CreditCardSection: React.FC<CreditCardSectionProps> = ({
  creditCards,
  transactions,
  currentMonth,
  currentYear,
}) => {
  const { t } = useTranslation();
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const toggleCardExpansion = (cardId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(cardId)) {
      newExpanded.delete(cardId);
    } else {
      newExpanded.add(cardId);
    }
    setExpandedCards(newExpanded);
  };

  // Filtra apenas transações de cartão de crédito (com credit_card_id preenchido)
  const creditCardTransactions = transactions.filter(t => {
    // Acessa via relação creditCard ou raw _raw
    const raw = (t as any)._raw;
    return t.creditCard || (raw && raw.credit_card_id);
  });

  // Agrupa transações por cartão e calcula totais
  const cardsWithTotals = creditCards.map(card => {
    const filteredTransactions = creditCardTransactions.filter(transaction => {
      // Obtém o ID do cartão da transação
      const raw = (transaction as any)._raw;
      const transactionCardId = transaction.creditCard?.id || (raw && raw.credit_card_id);
      if (transactionCardId !== card.id) return false;

      // Calcula se a transação pertence à fatura do mês atual
      const invoiceMonth = getInvoiceMonth(new Date(transaction.date), card.closingDay);
      return invoiceMonth.month === currentMonth && invoiceMonth.year === currentYear;
    });

    const total = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);

    return {
      card,
      total,
      transactions: filteredTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    };
  });

  // Calcula o total geral de todas as faturas
  const overallTotal = cardsWithTotals.reduce((sum, card) => sum + card.total, 0);

  if (cardsWithTotals.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>{t('Faturas de Cartão')}</Text>
        <View style={styles.emptyContainer}>
          <Icon source="credit-card" size={40} color="#999" />
          <Text style={styles.emptyText}>
            {t('Nenhuma fatura de cartão de crédito para este mês.')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{t('Faturas de Cartão')}</Text>
      
      <List.Section>
        {cardsWithTotals.map(item => {
          const card = item.card;
          const logoSource = brandLogos[card.brand.toLowerCase()] || brandLogos.visa;
          const isExpanded = expandedCards.has(card.id);

          return (
            <List.Accordion
              key={card.id}
              title={
                <View style={styles.cardHeader}>
                  <View style={styles.cardInfo}>
                    {logoSource && (
                      <List.Icon 
                        icon={logoSource} 
                        style={styles.cardLogo}
                      />
                    )}
                    <Text style={styles.cardName}>{card.name}</Text>
                  </View>
                  <Text style={styles.cardTotal}>
                    R$ {item.total.toFixed(2)}
                  </Text>
                </View>
              }
              expanded={isExpanded}
              onPress={() => toggleCardExpansion(card.id)}
              left={props => <List.Icon {...props} icon="credit-card" />}
              style={styles.accordion}
            >
              {item.transactions.length === 0 ? (
                <View style={styles.emptyTransactions}>
                  <Text style={styles.emptyTransactionsText}>
                    {t('Nenhuma compra nesta fatura.')}
                  </Text>
                </View>
              ) : (
                <>
                  <DataTable>
                    <DataTable.Header>
                      <DataTable.Title style={{ width: 70 }}>
                        <Text>{t('Data')}</Text>
                      </DataTable.Title>
                      <DataTable.Title>
                        <Text>{t('Descrição')}</Text>
                      </DataTable.Title>
                      <DataTable.Title numeric>
                        <Text>{t('Valor')}</Text>
                      </DataTable.Title>
                    </DataTable.Header>
                    {item.transactions.map(transaction => (
                      <DataTable.Row key={transaction.id}>
                        <DataTable.Cell style={{ width: 70 }}>
                          <Text>
                            {new Date(transaction.date).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                            })}
                          </Text>
                        </DataTable.Cell>
                        <DataTable.Cell>
                          <Text numberOfLines={1}>{transaction.description}</Text>
                        </DataTable.Cell>
                        <DataTable.Cell numeric>
                          <Text>R$ {transaction.amount.toFixed(2)}</Text>
                        </DataTable.Cell>
                      </DataTable.Row>
                    ))}
                  </DataTable>
                  <View style={styles.cardSummary}>
                    <Text style={styles.totalLabel}>{t('Total da Fatura')}:</Text>
                    <Text style={styles.totalValue}>R$ {item.total.toFixed(2)}</Text>
                  </View>
                </>
              )}
            </List.Accordion>
          );
        })}
      </List.Section>

      {/* Total Geral das Faturas */}
      <View style={styles.overallTotalContainer}>
        <Text style={styles.overallTotalLabel}>{t('Total Geral das Faturas')}:</Text>
        <Text style={styles.overallTotalValue}>R$ {overallTotal.toFixed(2)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 8,
  },
  emptyText: {
    marginTop: 12,
    textAlign: 'center',
    color: '#999',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardLogo: {
    marginRight: 8,
    width: 24,
    height: 24,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '500',
  },
  cardTotal: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  accordion: {
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 8,
    marginBottom: 8,
  },
  emptyTransactions: {
    padding: 16,
    alignItems: 'center',
  },
  emptyTransactionsText: {
    color: '#999',
    fontStyle: 'italic',
  },
  cardSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  overallTotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  overallTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  overallTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default CreditCardSection;