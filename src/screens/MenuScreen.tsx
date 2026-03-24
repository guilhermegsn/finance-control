import { View, ScrollView, StyleSheet, Switch } from 'react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import MenuCard, { MenuCardProps } from '../components/MenuCard';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { Surface, Text, Icon, useTheme as usePaperTheme } from 'react-native-paper';


export default function MenuScreen() {

  const navigation = useNavigation()
  const { isDarkMode, toggleDarkMode } = useTheme();
  const paperTheme = usePaperTheme();
  const { t } = useTranslation();

  const menuItems: MenuCardProps[] = [
    {
      nome: t('Contas'),
      descricao: t('Gerencie suas contas bancárias'),
      icone: 'wallet',
      onPress: () => navigation.navigate('Accounts')
    },
    {
      nome: t('Categorias'),
      descricao: t('Organize suas categorias de gastos'),
      icone: 'tag',
      onPress: () => navigation.navigate('Categories')
    },
    {
      nome: t('Cartões de Crédito'),
      descricao: t('Gerenciar seus cartões'),
      icone: 'credit-card-outline',
      onPress: () => navigation.navigate('CreditCardList')
    },
    {
      nome: t('Relatórios'),
      descricao: t('Visualize gráficos e estatísticas'),
      icone: 'chart-bar'
    },
    {
      nome: t('Metas'),
      descricao: t('Defina e acompanhe suas metas financeiras'),
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
      <Surface style={[
        styles.configSection,
        styles.cardElevated,
        {
          backgroundColor: paperTheme.dark ? '#2A2D3E' : '#FFFFFF',
          borderColor: paperTheme.dark ? 'transparent' : '#E5E7EB',
          borderWidth: paperTheme.dark ? 0 : 1,
        }
      ]}>
        <View style={styles.configHeader}>
          <Icon source="cog" size={24} color="#818CF8" />
          <Text style={[
            styles.configTitle,
            { color: paperTheme.dark ? '#FFFFFF' : '#1F2937' }
          ]}>
            {t('Configurações')}
          </Text>
        </View>

        <View style={styles.configItem}>
          <View style={styles.configItemContent}>
            <View style={[
              styles.configIconContainer,
              { backgroundColor: '#818CF820' }
            ]}>
              <Icon source="brightness-6" size={20} color="#818CF8" />
            </View>
            <View style={styles.configTextContainer}>
              <Text style={[
                styles.configLabel,
                { color: paperTheme.dark ? '#FFFFFF' : '#1F2937' }
              ]}>
                {t('Modo Escuro')}
              </Text>
              <Text style={[
                styles.configDescription,
                { color: paperTheme.dark ? '#E5E7EB' : '#4B5563' }
              ]}>
                {t('Ativar tema escuro no app')}
              </Text>
            </View>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={toggleDarkMode}
            trackColor={{ false: '#D1D5DB', true: '#818CF8' }}
            thumbColor={isDarkMode ? '#FFFFFF' : '#FFFFFF'}
            ios_backgroundColor="#D1D5DB"
          />
        </View>
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  configSection: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  cardElevated: {
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  configHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  configTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  configItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  configItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  configIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  configTextContainer: {
    flex: 1,
  },
  configLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  configDescription: {
    fontSize: 12,
    marginTop: 2,
    opacity: 0.8,
  },
});
