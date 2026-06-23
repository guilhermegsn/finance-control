import React from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Alert, Text, Image } from 'react-native';
import { Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { withObservables } from '@nozbe/watermelondb/react';
import { Q } from '@nozbe/watermelondb';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import CreditCardService from '../service/CreditCardService';
import CreditCard from '../models/CreditCard';
import { brandLogos } from '../utils/brandLogos';
import { useTranslation } from 'react-i18next';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const CreditCardItem = ({
  card,
  onEdit,
}: {
  card: CreditCard;
  onEdit: (c: CreditCard) => void;
}) => {
  const { isDarkMode } = useTheme();
  const { t } = useTranslation();

  const c = {
    card: isDarkMode ? '#161C27' : '#FFFFFF',
    border: isDarkMode ? '#2D3748' : '#E2E8F0',
    textPrimary: isDarkMode ? '#E2E8F0' : '#1A202C',
    textSecondary: isDarkMode ? '#718096' : '#64748B',
  };

  const accent = card.color || '#6366F1';

  const handleDelete = () => {
    Alert.alert(
      t('Excluir Cartão'),
      t('Tem certeza que deseja excluir este cartão?'),
      [
        { text: t('Cancelar'), style: 'cancel' },
        { text: t('Excluir'), style: 'destructive', onPress: () => CreditCardService.delete(card) },
      ]
    );
  };

  const logoSource = brandLogos[card.brand] ?? null;

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={[styles.logoWrap, { backgroundColor: `${accent}20` }]}>
        {logoSource
          ? <Image source={logoSource} style={styles.logo} resizeMode="contain" />
          : <Icon source="credit-card-outline" size={22} color={accent} />
        }
      </View>

      <View style={styles.info}>
        <Text style={[styles.cardName, { color: c.textPrimary }]}>{card.name}</Text>
        <Text style={[styles.limitText, { color: c.textSecondary }]}>
          {t('Limite')}: {fmt(card.limit)}
        </Text>
        <View style={styles.daysRow}>
          <View style={[styles.dayBadge, { backgroundColor: `${accent}18` }]}>
            <Text style={[styles.dayBadgeText, { color: accent }]}>Fecha {card.closingDay}</Text>
          </View>
          <View style={[styles.dayBadge, { backgroundColor: '#F59E0B18' }]}>
            <Text style={[styles.dayBadgeText, { color: '#F59E0B' }]}>Vence {card.dueDay}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#6366F114' }]}
          onPress={() => onEdit(card)}
          activeOpacity={0.7}
        >
          <Icon source="pencil-outline" size={16} color="#6366F1" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#F43F5E14' }]}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <Icon source="trash-can-outline" size={16} color="#F43F5E" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const ObservableCreditCardItem = withObservables(['card'], ({ card }: { card: CreditCard }) => ({
  card: card.observe(),
}))(CreditCardItem);

const CreditCardListScreen = ({ cards }: { cards: CreditCard[] }) => {
  const { isDarkMode } = useTheme();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const c = {
    bg: isDarkMode ? '#0D1117' : '#EEF2F7',
    textPrimary: isDarkMode ? '#E2E8F0' : '#1A202C',
    textSecondary: isDarkMode ? '#718096' : '#64748B',
  };

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <View style={[styles.header, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Icon source="arrow-left" size={22} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.textPrimary }]}>Cartões de Crédito</Text>
        <View style={styles.headerBtn} />
      </View>

      <FlatList
        data={cards}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <ObservableCreditCardItem
            card={item}
            onEdit={(card: CreditCard) => navigation.navigate('CreditCardForm', { card })}
          />
        )}
        contentContainerStyle={cards.length === 0 ? styles.emptyContainer : styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyInner}>
            <Icon source="credit-card-off-outline" size={52} color={c.textSecondary} />
            <Text style={[styles.emptyText, { color: c.textSecondary }]}>
              Nenhum cartão cadastrado
            </Text>
            <Text style={[styles.emptyHint, { color: c.textSecondary }]}>
              Toque em + para adicionar
            </Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CreditCardForm')} activeOpacity={0.85}>
        <LinearGradient
          colors={['#8B5CF6', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Icon source="plus" size={24} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const enhance = withObservables(['userId'], ({ userId }: { userId: string }) => ({
  cards: CreditCardService.getCollection()
    .query(Q.where('user_id', userId), Q.where('deleted_at', null))
    .observe(),
}));

const EnhancedList = enhance(CreditCardListScreen);

const CreditCardListScreenWrapper = () => {
  const { user } = useAuth();
  return <EnhancedList userId={user?.id || 'default_user'} />;
};

export default CreditCardListScreenWrapper;

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
  },

  list: {
    padding: 16,
    gap: 10,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyInner: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  emptyHint: {
    fontSize: 13,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  logoWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '600',
  },
  limitText: {
    fontSize: 12,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  dayBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
  },
  dayBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
