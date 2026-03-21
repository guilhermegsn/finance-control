import React from 'react';
import { View, StyleSheet, Image, Alert, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FAB, Icon, Text } from 'react-native-paper';
import { withObservables } from '@nozbe/watermelondb/react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import CreditCardService from '../service/CreditCardService';
import CreditCard from '../models/CreditCard';
import { brandLogos } from '../utils/brandLogos';

import { List, IconButton, Surface } from 'react-native-paper';

const CreditCardItem = ({ card, theme, navigation }: { card: CreditCard, theme: any, navigation: any }) => {
  const { t } = useTranslation();

  const handleEdit = () => {
    navigation.navigate('CreditCardForm', { card });
  };

  const handleDelete = () => {
    Alert.alert(
      t('Excluir Cartão'),
      t('Tem certeza que deseja excluir este cartão?'),
      [
        { text: t('Cancelar'), style: 'cancel' },
        { 
          text: t('Excluir'), 
          style: 'destructive',
          onPress: () => CreditCardService.delete(card)
        }
      ]
    );
  };

  const renderLeftIcon = (props: any) => {
    if (brandLogos[card.brand]) {
      return (
        <Image source={brandLogos[card.brand]} style={styles.brandLogo} />
      );
    }
    return <List.Icon {...props} icon="credit-card-outline" color={card.color || theme.colors.text} />;
  };

  return (
    <Surface style={styles.cardItem} elevation={1}>
      <List.Item
        title={card.name}
        description={`${t('Limite')}: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(card.limit)}\n${t('Fecha dia')} ${card.closingDay} • ${t('Vence dia')} ${card.dueDay}`}
        descriptionNumberOfLines={2}
        left={renderLeftIcon}
        right={props => (
          <View style={{ flexDirection: 'row' }}>
            <IconButton {...props} icon="pencil" onPress={handleEdit} />
            <IconButton {...props} icon="delete" onPress={handleDelete} />
          </View>
        )}
      />
    </Surface>
  );
};

const ObservableCreditCardItem = withObservables(['card'], ({ card }: { card: CreditCard }) => ({
  card: card.observe()
}))(CreditCardItem);


const CreditCardListScreen = ({ cards }: { cards: CreditCard[] }) => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { theme } = useTheme() as any;

  return (
    <View style={{flex: 1}}>

      <FlatList
        data={cards}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ObservableCreditCardItem card={item} theme={theme} navigation={navigation} />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon source="credit-card-outline" size={64} />
            <Text>
              {t('Nenhum cartão cadastrado.')}
            </Text>
          </View>
        }
      />

      <FAB
        style={[styles.fab]}
        icon="plus"
        color="#FFF"
        onPress={() => navigation.navigate('CreditCardForm')}
      />
    </View>
  );
};

import { Q } from '@nozbe/watermelondb';

const CreditCardListScreenWrapper = () => {
  const { user } = useAuth();

  // Create a component that receives the query as a prop
  const ListWithData = withObservables(['userId'], ({ userId }: { userId: string }) => ({
    cards: CreditCardService.getCollection().query(
      Q.where('user_id', userId),
      Q.where('deleted_at', null)
    ).observe()
  }))(CreditCardListScreen);

  return <ListWithData userId={user?.id || 'default_user'} />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
  },
  cardItem: {
    marginBottom: 8,
    borderRadius: 8,
  },
  brandLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: 8,
    marginLeft: 18,
    resizeMode: 'contain',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CreditCardListScreenWrapper;