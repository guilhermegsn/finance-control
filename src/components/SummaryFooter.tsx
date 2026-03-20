import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Surface, Text, Icon } from 'react-native-paper';
import { withObservables } from '@nozbe/watermelondb/react';
import { Q } from '@nozbe/watermelondb';
import { database } from '../database';
import Transaction from '../models/Transactions';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

// Props que o componente puro recebe (incluindo as injetadas pelo WatermelonDB)
interface SummaryFooterProps {
  currentDate: Date;
  isFutureMonth: boolean;
  transactions: Transaction[];
  pastTransactions: Transaction[];
}

const SummaryFooterComponent = ({ isFutureMonth, transactions, pastTransactions }: SummaryFooterProps) => {
  
    const { t } = useTranslation();
  const { isDarkMode } = useTheme(); // Assumindo que o tema tem essa propriedade

  const totals = useMemo(() => {
    // 1. Calcular o Passado (Reativo a qualquer mudança histórica)
    let totalPreviousBalance = 0;
    let totalPreviousConsolidatedBalance = 0;

    pastTransactions.forEach(t => {
      const amount = t.amount;
      if (t.type === 'income') {
        totalPreviousBalance += amount;
        if (t.isConsolidated) totalPreviousConsolidatedBalance += amount;
      } else if (t.type === 'expense') {
        totalPreviousBalance -= amount;
        if (t.isConsolidated) totalPreviousConsolidatedBalance -= amount;
      }
    });

    // 2. Calcular o Mês Atual
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

    return {
      income,
      expense,
      balance: income - expense,
      currentBalance: totalPreviousConsolidatedBalance + consolidatedIncome - consolidatedExpense,
      projectedBalance: totalPreviousBalance + income - expense
    };
  }, [transactions, pastTransactions]);

  // Cores baseadas no tema
  const getCardBackgroundColor = () => {
    return isDarkMode ? '#2A2D3E' : '#FFFFFF';
  };

  const getHeaderGradientColors = () => {
    return isDarkMode
      ? ['#4F46E5', '#7C3AED']
      : ['#818CF8', '#C084FC'];
  };

  const getTextColor = () => {
    return isDarkMode ? '#FFFFFF' : '#1F2937';
  };

  const getSubtitleColor = () => {
    return isDarkMode ? '#E5E7EB' : '#4B5563';
  };

  const getBorderColor = () => {
    return isDarkMode ? 'transparent' : '#E5E7EB';
  };

  const getShadowColor = () => {
    return isDarkMode ? '#000' : '#9CA3AF';
  };

  return (
    <View>
      <View style={{ padding: 12, marginTop: 30 }}>
        <Text variant='headlineSmall'>
          {t("Resumo mensal")}
        </Text>
        <Text style={[
          styles.headerSubtitle,
          { color: getSubtitleColor() }
        ]}>
          {totals.balance >= 0
            ? t("Você está no caminho certo! 🚀")
            : t("Vamos melhorar isso juntos! 💪")}
        </Text>
      </View>

      <View style={styles.gridContainer}>
        {/* Card de Entradas */}
        <Surface
          style={[
            styles.card,
            styles.cardElevated,
            {
              backgroundColor: getCardBackgroundColor(),
              borderColor: getBorderColor(),
              borderWidth: isDarkMode ? 0 : 1,
              shadowColor: getShadowColor(),
            }
          ]}
        >
          <View style={styles.cardHeader}>
            <Icon source="arrow-up-circle" size={24} color="#56D6A3" />
            <Text style={[
              styles.cardLabel,
              { color: getTextColor() }
            ]}>
              {t("Entradas")}
            </Text>
          </View>
          <Text style={[styles.cardValue, styles.incomeValue]}>
            R$ {totals.income.toFixed(2)}
          </Text>
        </Surface>

        {/* Card de Saídas */}
        <Surface
          style={[
            styles.card,
            styles.cardElevated,
            {
              backgroundColor: getCardBackgroundColor(),
              borderColor: getBorderColor(),
              borderWidth: isDarkMode ? 0 : 1,
              shadowColor: getShadowColor(),
            }
          ]}
        >
          <View style={styles.cardHeader}>
            <Icon source="arrow-down-circle" size={24} color="#FF7285" />
            <Text style={[
              styles.cardLabel,
              { color: getTextColor() }
            ]}>
              {t("Saídas")}
            </Text>
          </View>
          <Text style={[styles.cardValue, styles.expenseValue]}>
            R$ {totals.expense.toFixed(2)}
          </Text>
        </Surface>

        {/* Card de Balanço */}
        <Surface
          style={[
            styles.card,
            styles.cardElevated,
            styles.balanceCard,
            {
              backgroundColor: getCardBackgroundColor(),
              borderColor: getBorderColor(),
              borderWidth: isDarkMode ? 0 : 1,
              shadowColor: getShadowColor(),
            }
          ]}
        >
          <View style={styles.cardHeader}>
            <Icon source="chart-line-variant" size={24} color="#7C73E6" />
            <Text style={[
              styles.cardLabel,
              { color: getTextColor() }
            ]}>
              {t("Balanço")}
            </Text>
          </View>
          <Text style={[
            styles.cardValue,
            { color: totals.balance >= 0 ? '#56D6A3' : '#FF7285' }
          ]}>
            R$ {totals.balance.toFixed(2)}
          </Text>
        </Surface>

        {/* Saldo Atual (se não for mês futuro) */}
        {!isFutureMonth && (
          <Surface
            style={[
              styles.card,
              styles.cardElevated,
              styles.currentBalanceCard,
              {
                backgroundColor: getCardBackgroundColor(),
                borderColor: getBorderColor(),
                borderWidth: isDarkMode ? 0 : 1,
                shadowColor: getShadowColor(),
              }
            ]}
          >
            <View style={styles.cardHeader}>
              <Icon source="wallet" size={24} color="#FFB156" />
              <Text style={[
                styles.cardLabel,
                { color: getTextColor() }
              ]}>
                {t("Saldo Atual")}
              </Text>
            </View>
            <Text style={[
              styles.cardValue,
              { color: totals.currentBalance >= 0 ? '#56D6A3' : '#FF7285' }
            ]}>
              R$ {totals.currentBalance.toFixed(2)}
            </Text>
          </Surface>
        )}
      </View>

      {/* Previsão */}
      <Surface
        style={[
          styles.forecastContainer,
          styles.cardElevated,
          {
            backgroundColor: getCardBackgroundColor(),
            borderColor: getBorderColor(),
            borderWidth: isDarkMode ? 0 : 1,
            shadowColor: getShadowColor(),
          }
        ]}
      >
        <View style={styles.forecastHeader}>
          <Icon source="crystal-ball" size={20} color="#7C73E6" />
          <Text style={[
            styles.forecastTitle,
            { color: getTextColor() }
          ]}>
            {t("Previsão para o Fim do Mês")}
          </Text>
        </View>
        <Text style={[
          styles.forecastValue,
          { color: totals.projectedBalance >= 0 ? '#56D6A3' : '#FF7285' }
        ]}>
          R$ {totals.projectedBalance.toFixed(2)}
        </Text>
      </Surface>
    </View>
  );
};

const styles = StyleSheet.create({
  headerGradient: {
    padding: 10,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    opacity: 0.9,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 12,
  },
  card: {
    width: (Dimensions.get('window').width - 76) / 2,
    padding: 16,
    borderRadius: 12,
  },
  cardElevated: {
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  balanceCard: {
    // Estilo específico se necessário
  },
  currentBalanceCard: {
    // Estilo específico se necessário
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  incomeValue: {
    color: '#56D6A3',
  },
  expenseValue: {
    color: '#FF7285',
  },
  forecastContainer: {
    margin: 12,
    padding: 16,
    borderRadius: 12,
  },
  forecastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  forecastTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  forecastValue: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
});

const enhanceSummaryFooter = withObservables(['currentDate'], ({ currentDate }: { currentDate: Date }) => {
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  return {
    transactions: database.get<Transaction>('transactions')
      .query(Q.where('date', Q.between(firstDay.getTime(), lastDay.getTime())))
      .observeWithColumns(['is_consolidated', 'amount', 'type']),

    pastTransactions: database.get<Transaction>('transactions')
      .query(Q.where('date', Q.lt(firstDay.getTime())))
      .observeWithColumns(['is_consolidated', 'amount', 'type']),
  };
});

export default enhanceSummaryFooter(SummaryFooterComponent);