import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, View } from 'react-native';
import { withObservables } from '@nozbe/watermelondb/react';
import { database } from '../database';
import { Q } from '@nozbe/watermelondb';
import Account from '../models/Accounts';
import Transaction from '../models/Transactions';
import Category from '../models/Caterogy';
import { PieChart, BarChart } from 'react-native-gifted-charts';
import { DashboardService, BalanceData, CategorySpending } from '../service/DashboardService';
import { Text } from 'react-native-paper';
import { useTheme } from '../contexts/ThemeContext';
import greetingsData from '../utils/greetings.json';
import { useAuth } from '../contexts/AuthContext'

interface DashboardSectionProps {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
}

const DashboardSection: React.FC<DashboardSectionProps> = ({
  accounts,
  transactions,
  categories
}) => {
  const { theme } = useTheme()
  const [balanceData, setBalanceData] = useState<BalanceData>({ current: 0, projected: 0 });
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([]);
  const [loading, setLoading] = useState(true);
  const { width: screenWidth } = Dimensions.get('window');
  const chartWidth = screenWidth - 100;
  const { user } = useAuth();
  const nomeUsuario = user?.email || 'Visitante';

  useEffect(() => {
    const calculateDashboardData = async () => {
      if (!accounts || !transactions || !categories) {
        setLoading(false);
        return;
      }

      try {
        const balance = await DashboardService.calculateProjectedBalance();
        setBalanceData(balance);

        const spending = await DashboardService.calculateCategorySpending();
        setCategorySpending(spending);

        setLoading(false);
      } catch (error) {
        console.error('Erro ao calcular dados do dashboard:', error);
        setLoading(false);
      }
    };

    calculateDashboardData();
  }, [accounts, transactions, categories]);


  const welcomeMessage = useMemo(() => {
    // Define se o cenário é positivo ou negativo (você pode ajustar essa regra como preferir)
    const isPositive = balanceData.current >= 0 && balanceData.projected >= 0;

    // Seleciona a lista de frases correta
    const phrases = isPositive ? greetingsData.positive : greetingsData.negative;

    // Sorteia um índice aleatório baseado no tamanho do array
    const randomIndex = Math.floor(Math.random() * phrases.length);

    return phrases[randomIndex];
  }, [balanceData.current, balanceData.projected]);


  const pieData = [
    { value: balanceData.current, color: '#16b50b' },
    { value: Math.max(0, balanceData.projected - balanceData.current), color: '#07773b' }
  ];

  const barData = categorySpending.map(item => ({
    value: item.amount,
    label: item.categoryName.substring(0, 3),
    frontColor: item.color,
  }));

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Carregando...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, alignItems: 'center', padding: 16}}>

      <View style={{ marginBottom: 24}}>
        <Text style={{ 
          fontSize: 20, 
          fontWeight: 'bold', 
          color: theme.text, 
          fontFamily: 'Poppins_700Bold',
           }}>
          Olá, {nomeUsuario}!
        </Text>
        <Text style={{ fontSize: 14, color: theme.textSecondary, marginTop: 4, lineHeight: 20 }}>
          {welcomeMessage}
        </Text>
      </View>



      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 20 }}>
        Dashboard Financeiro
      </Text>

      <View style={{ width: '100%', alignItems: 'center', marginBottom: 30 }}>
        <Text style={{ marginBottom: 10 }}>Saldo Total & Projetado</Text>
        <PieChart
          data={pieData}
          donut
          radius={80}
          innerRadius={60}
          innerCircleColor={theme.background} // Cor do "furo"
          textColor={theme.text}
          centerLabelComponent={() => (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: theme.text, fontWeight: 'bold' }}>R$ {balanceData.current.toFixed(2)}</Text>
              <Text style={{ color: theme.textSecondary, fontSize: 13 }}>Saldo</Text>
            </View>
          )}
        />

        <View style={{ marginTop: 10 }}>
          <Text>Atual: R$ {balanceData.current.toFixed(2)}</Text>
          <Text>Projetado: R$ {balanceData.projected.toFixed(2)}</Text>
        </View>
      </View>

      <View style={{ width: '100%', alignItems: 'center' }}>
        <Text style={{ marginBottom: 10 }}>Gastos por Categoria</Text>

        {categorySpending.length > 0 ? (
          <BarChart
            data={barData}
            width={chartWidth} // O segredo está aqui
            disableScroll // Garante que ele tente ocupar o espaço fixo sem scroll horizontal
            barWidth={22}  // Opcional: ajuste para as barras não ficarem muito finas ou grossas
            spacing={20}   // Opcional: ajuste o espaço entre elas
            xAxisColor={theme.border}
            yAxisColor={theme.border}
            xAxisLabelTextStyle={{ color: theme.textSecondary }}
            yAxisTextStyle={{ color: theme.textSecondary }}
            rulesColor={theme.border}
            maxValue={Math.max(...categorySpending.map(item => item.amount)) * 1.2}
          />
        ) : (
          <Text>Nenhuma despesa registrada</Text>
        )}

        <View style={{ width: '100%', marginTop: 20 }}>
          {categorySpending.map((item) => (
            <View key={item.categoryId} style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 }}>
              <Text>{item.categoryName}</Text>
              <Text style={{ fontWeight: 'bold' }}>R$ {item.amount.toFixed(2)}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const enhance = withObservables([], () => ({
  accounts: database.get<Account>('accounts')
    .query(Q.where('archived', false))
    .observe(),
  transactions: database.get<Transaction>('transactions')
    .query(
      Q.where('is_consolidated', false),
      Q.sortBy('date', Q.desc)
    )
    .observe(),
  categories: database.get<Category>('categories').query().observe(),
}));

export default enhance(DashboardSection);