import { View, ScrollView, StyleSheet, Switch } from 'react-native';
import React from 'react';
import MenuCard, { MenuCardProps } from '../components/MenuCard';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { Text } from 'react-native-paper';


export default function MenuScreen() {

  const navigation = useNavigation()
  const { isDarkMode, toggleDarkMode } = useTheme();
  
  const menuItems: MenuCardProps[] = [
    {
      nome: 'Contas',
      descricao: 'Gerencie suas contas bancárias',
      icone: 'wallet',
      onPress: () => navigation.navigate('Accounts')
    },
    {
      nome: 'Categorias',
      descricao: 'Organize suas categorias de gastos',
      icone: 'tag',
      onPress: () => navigation.navigate('Categories')
    },
    {
      nome: 'Relatórios',
      descricao: 'Visualize gráficos e estatísticas',
      icone: 'chart-bar'
    },
    {
      nome: 'Metas',
      descricao: 'Defina e acompanhe suas metas financeiras',
      icone: 'flag'
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {menuItems.map((item, index) => (
        <MenuCard
          key={index}
          nome={item.nome}
          descricao={item.descricao}
          icone={item.icone}
          onPress={item.onPress}
        />
      ))}

      {/* Seção de Configurações */}
      <View style={styles.configSection}>
        <Text style={styles.configTitle}>Configurações</Text>
        
        <View style={styles.configItem}>
          <View>
            <Text style={styles.configLabel}>Modo Escuro</Text>
            <Text style={styles.configDescription}>
              Ativar tema escuro no app
            </Text>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={toggleDarkMode}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={isDarkMode ? '#f5dd4b' : '#f4f3f4'}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 16,
  },
  configSection: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  configTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  configItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  configLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  configDescription: {
    fontSize: 12,
    marginTop: 2,
  },
});
