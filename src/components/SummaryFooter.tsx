import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Surface, Text, Icon } from 'react-native-paper';
import { withObservables } from '@nozbe/watermelondb/react';
import { Q } from '@nozbe/watermelondb';
import { database } from '../database';
import Transaction from '../models/Transactions';

// Props que o componente puro recebe (incluindo as injetadas pelo WatermelonDB)
interface SummaryFooterProps {
  currentDate: Date;
  isFutureMonth: boolean;
  transactions: Transaction[];
  pastTransactions: Transaction[];
}

const SummaryFooterComponent = ({ currentDate, isFutureMonth, transactions, pastTransactions }: SummaryFooterProps) => {
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

  return (
    <Surface style={{ marginTop: 20, marginBottom: 20, padding: 16, borderRadius: 12, elevation: 2 }}>
      <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' }}>
        Resumo do Mês
      </Text>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ fontSize: 14, color: '#666' }}>Total de Entradas:</Text>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#2E9E57' }}>
          R$ {totals.income.toFixed(2)}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ fontSize: 14, color: '#666' }}>Total de Saídas:</Text>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#CC4A4A' }}>
          R$ {totals.expense.toFixed(2)}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#eee' }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold' }}>Balanço Mensal:</Text>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: totals.balance >= 0 ? '#2E9E57' : '#CC4A4A' }}>
          R$ {totals.balance.toFixed(2)}
        </Text>
      </View>

      {!isFutureMonth && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#eee', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon source="wallet" size={20} color="#007bff" />
            <Text style={{ fontSize: 16, fontWeight: 'bold', marginLeft: 8 }}>Saldo Atual no Banco</Text>
          </View>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: totals.currentBalance >= 0 ? '#2E9E57' : '#CC4A4A' }}>
            R$ {totals.currentBalance.toFixed(2)}
          </Text>
        </View>
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
        <Text style={{ fontSize: 14, color: '#666', fontStyle: 'italic' }}>Saldo Previsto (Fim do mês):</Text>
        <Text style={{ fontSize: 14, color: '#666', fontStyle: 'italic' }}>
          R$ {totals.projectedBalance.toFixed(2)}
        </Text>
      </View>
    </Surface>
  );
};

// O Segredo da Reatividade: Observar as duas janelas de tempo E as colunas específicas
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