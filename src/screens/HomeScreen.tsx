import { View, Text, ScrollView, StyleSheet, RefreshControl, Image, Dimensions } from 'react-native';
import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import DashboardSection from '../components/DashboardSection';
import TransactionItem from '../components/TransactionItem';
import { withObservables } from '@nozbe/watermelondb/react';
import { database } from '../database';
import { Q } from '@nozbe/watermelondb';
import Transaction from '../models/Transactions';

interface HomeScreenProps {
  transactions: Transaction[];
}

const HomeScreen: React.FC<HomeScreenProps> = ({ transactions }) => {
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const { width: screenWidth } = Dimensions.get('window');
  const onRefresh = () => {
    setRefreshing(true);
    // Simular refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  // Filtrar transações recentes (últimas 10)
  const recentTransactions = transactions.slice(0, 10);

  return (

    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 10,
          marginTop: 10
        }}
      >
      
        <Image
          source={require('../../assets/logos/butterflow.png')}
          style={{
            width: screenWidth * 0.10,
            height: screenWidth * 0.10,
            resizeMode: 'contain'
          }}
        />

        <Text
          style={{
            fontSize: 20,
            fontWeight: '900', // Peso máximo (Extra Bold/Black)
            color: theme.text, // Branco puro para máximo contraste no Dark Theme
            letterSpacing: 1.2, // Dá um respiro moderno entre as letras
            marginLeft: 5, // Descola o texto da imagem
            fontFamily: 'Poppins_900Black',
          }}
        >
          Butter
          {/* Destaque na palavra Flow com a cor principal do seu tema */}
          <Text style={{ color: theme.success, fontFamily: 'Poppins_900Black', letterSpacing: 1.2 }}>
            Flow
          </Text>
        </Text>
      </View>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.primary]}
          />
        }
      >




        {/* Dashboard Section */}
        <DashboardSection />

        {/* Transações Recentes */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Transações Recentes
          </Text>

          {recentTransactions.length > 0 ? (
            recentTransactions.map((transaction) => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Nenhuma transação recente
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    margin: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

// Observables para conectar com o WatermelonDB
const enhance = withObservables([], () => ({
  transactions: database.get<Transaction>('transactions')
    .query(
      Q.sortBy('date', Q.desc)
    )
    .observe(),
}));

export default enhance(HomeScreen);
