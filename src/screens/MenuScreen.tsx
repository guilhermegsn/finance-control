import { View, Text, ScrollView, StyleSheet } from 'react-native';
import React from 'react';
import MenuCard, { MenuCardProps } from '../components/MenuCard';
import { useNavigation } from '@react-navigation/native';


export default function MenuScreen() {

  const navigation = useNavigation()
  const menuItems: MenuCardProps[] = [
    {
      nome: 'Contas',
      descricao: 'Gerencie suas contas bancárias',
      icone: 'wallet',
      onPress: ()=> navigation.navigate('Accounts')
    },
    {
      nome: 'Categorias',
      descricao: 'Organize suas categorias de gastos',
      icone: 'tag'
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
    {
      nome: 'Configurações',
      descricao: 'Ajuste preferências do app',
      icone: 'cog'
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 16,
  },
});
