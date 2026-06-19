import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { withObservables } from '@nozbe/watermelondb/react';
import { Q } from '@nozbe/watermelondb';
import { database } from '../database';
import Transaction from '../models/Transactions';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

interface SummaryFooterProps {
  currentDate: Date;
  isFutureMonth: boolean;
  transactions: Transaction[];
  pastTransactions: Transaction[];
  ccTransactions: Transaction[];
}

const SummaryFooterComponent = ({ isFutureMonth, transactions, pastTransactions, ccTransactions }: SummaryFooterProps) => {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();

  const totals = useMemo(() => {
    let pastConsolidatedBalance = 0;
    let pastAllBalance = 0;
    pastTransactions.forEach(t => {
      const delta = t.type === 'income' ? t.amount : -t.amount;
      pastAllBalance += delta;
      if (t.isConsolidated) pastConsolidatedBalance += delta;
    });

    let income = 0;
    let expense = 0;
    let consolidatedIncome = 0;
    let consolidatedExpense = 0;

    transactions.forEach(t => {
      const amount = t.amount;
      if (t.type === 'income') {
        income += amount;
        if (t.isConsolidated) consolidatedIncome += amount;
      } else if (t.type === 'expense') {
        expense += amount;
        if (t.isConsolidated) consolidatedExpense += amount;
      }
    });

    let ccPendingExpense = 0;
    ccTransactions.forEach(t => {
      if (!t.isConsolidated) ccPendingExpense += t.amount;
    });

    return {
      income,
      expense,
      consolidatedIncome,
      consolidatedExpense,
      currentBalance: pastConsolidatedBalance + consolidatedIncome - consolidatedExpense,
      projectedBalance: pastAllBalance + income - expense - ccPendingExpense,
    };
  }, [transactions, pastTransactions, ccTransactions]);

  const c = {
    card: isDarkMode ? '#161C27' : '#FFFFFF',
    border: isDarkMode ? '#2D3748' : '#E2E8F0',
    textSecondary: isDarkMode ? '#718096' : '#64748B',
    sectionLabel: isDarkMode ? '#4A5568' : '#94A3B8',
  };

  const cards = [
    {
      icon: 'arrow-up-circle',
      iconColor: '#10B981',
      label: t('Entradas'),
      value: totals.consolidatedIncome,
      valueColor: '#10B981',
      pending: totals.income - totals.consolidatedIncome,
    },
    {
      icon: 'arrow-down-circle',
      iconColor: '#F43F5E',
      label: t('Saídas'),
      value: totals.consolidatedExpense,
      valueColor: '#F43F5E',
      pending: totals.expense - totals.consolidatedExpense,
    },
    {
      icon: 'wallet',
      iconColor: '#10B981',
      label: t('Saldo Atual'),
      value: totals.currentBalance,
      valueColor: totals.currentBalance >= 0 ? '#10B981' : '#F43F5E',
      pending: null,
    },
    {
      icon: 'crystal-ball',
      iconColor: '#6366F1',
      label: t('Projetado'),
      value: totals.projectedBalance,
      valueColor: totals.projectedBalance >= 0 ? '#10B981' : '#F43F5E',
      pending: null,
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionLabel, { color: c.sectionLabel }]}>
        {t('RESUMO MENSAL')}
      </Text>
      <Text style={[styles.subtitle, { color: c.textSecondary }]}>
        {totals.projectedBalance >= 0
          ? t('Você está no caminho certo! 🚀')
          : t('Vamos melhorar isso juntos! 💪')}
      </Text>

      <View style={styles.grid}>
        {cards.map((card) => (
          <View key={card.label} style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={styles.cardTop}>
              <View style={[styles.iconPill, { backgroundColor: `${card.iconColor}18` }]}>
                <Icon source={card.icon} size={14} color={card.iconColor} />
              </View>
              <Text style={[styles.cardLabel, { color: c.textSecondary }]}>{card.label}</Text>
            </View>
            <Text style={[styles.cardValue, { color: card.valueColor }]}>
              R$ {card.value.toFixed(2)}
            </Text>
            {card.pending != null && card.pending > 0.001 && (
              <Text style={[styles.pendingText, { color: c.sectionLabel }]}>
                + R$ {card.pending.toFixed(2)} {t('pendente')}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 6,
    marginLeft: 2,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 14,
    marginLeft: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  iconPill: {
    width: 26,
    height: 26,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  pendingText: {
    fontSize: 11,
    marginTop: 4,
  },
});

const enhanceSummaryFooter = withObservables(['currentDate'], ({ currentDate }: { currentDate: Date }) => {
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  return {
    transactions: database.get<Transaction>('transactions')
      .query(
        Q.where('date', Q.between(firstDay.getTime(), lastDay.getTime())),
        Q.where('credit_card_id', null),
      )
      .observeWithColumns(['is_consolidated', 'amount', 'type']),

    pastTransactions: database.get<Transaction>('transactions')
      .query(
        Q.where('date', Q.lt(firstDay.getTime())),
        Q.where('credit_card_id', null),
      )
      .observeWithColumns(['is_consolidated', 'amount', 'type']),

    ccTransactions: database.get<Transaction>('transactions')
      .query(
        Q.where('date', Q.between(firstDay.getTime(), lastDay.getTime())),
        Q.where('credit_card_id', Q.notEq(null)),
      )
      .observeWithColumns(['is_consolidated', 'amount']),
  };
});

export default enhanceSummaryFooter(SummaryFooterComponent);
