import React, { useMemo, useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { withObservables } from '@nozbe/watermelondb/react';
import { Q } from '@nozbe/watermelondb';
import { database } from '../database';
import Transaction from '../models/Transactions';
import { AccountService } from '../service/AccountService';
import { CategoryService } from '../service/CategoryService';
import CreditCardService from '../service/CreditCardService';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { Icon } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import GlassHeader from '../components/GlassHeader';
import TransactionTypeModal from '../components/TransactionTypeModal';
import OnboardingChecklistCard from '../components/OnboardingChecklistCard';
import greetingsData from '../utils/greetings.json';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BALANCE_VISIBLE_KEY = '@balance_visible';

interface HomeScreenProps {
  allTransactions: Transaction[];
  pastTransactions: Transaction[];
  currentMonthTransactions: Transaction[];
  ccDueUpToMonth: Transaction[];
  accounts: any[];
  categories: any[];
  cards: any[];
}

const HomeScreen: React.FC<HomeScreenProps> = ({
  allTransactions,
  pastTransactions,
  currentMonthTransactions,
  ccDueUpToMonth,
  accounts,
  categories,
  cards,
}) => {
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const { t, i18n } = useTranslation();
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [balancesVisible, setBalancesVisible] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(BALANCE_VISIBLE_KEY).then(val => {
      if (val !== null) setBalancesVisible(val === 'true');
    });
  }, []);

  const toggleBalancesVisible = async () => {
    const next = !balancesVisible;
    setBalancesVisible(next);
    await AsyncStorage.setItem(BALANCE_VISIBLE_KEY, String(next));
  };

  const c = {
    bg: isDarkMode ? '#0D1117' : '#EEF2F7',
    card: isDarkMode ? '#161C27' : '#FFFFFF',
    border: isDarkMode ? '#2D3748' : '#E2E8F0',
    textPrimary: isDarkMode ? '#E2E8F0' : '#1A202C',
    textSecondary: isDarkMode ? '#718096' : '#64748B',
    sectionLabel: isDarkMode ? '#4A5568' : '#94A3B8',
  };

  const { currentBalance, projectedBalance, monthIncome, monthExpense } = useMemo(() => {
    // Saldo Atual: consolidadas não-CC de todo o histórico
    let currentBalance = 0;
    allTransactions.forEach(t => {
      if (t.isConsolidated) {
        currentBalance += t.type === 'income' ? t.amount : -t.amount;
      }
    });

    // Projetado: base histórica (tudo não-CC antes do mês) + mês atual - CC pendente
    let pastAllBalance = 0;
    pastTransactions.forEach(t => {
      pastAllBalance += t.type === 'income' ? t.amount : -t.amount;
    });

    let monthIncome = 0;
    let monthExpense = 0;
    currentMonthTransactions.forEach(t => {
      if (t.type === 'income') monthIncome += t.amount;
      else monthExpense += t.amount;
    });

    let ccPending = 0;
    ccDueUpToMonth.forEach((t: Transaction) => {
      ccPending += t.amount;
    });

    const projectedBalance = pastAllBalance + monthIncome - monthExpense - ccPending;

    return { currentBalance, projectedBalance, monthIncome, monthExpense };
  }, [allTransactions, pastTransactions, currentMonthTransactions, ccDueUpToMonth]);

  const endOfMonthLabel = useMemo(() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const locale = i18n.resolvedLanguage?.startsWith('en') ? 'en-US' : 'pt-BR';
    return lastDay.toLocaleDateString(locale);
  }, [i18n.resolvedLanguage]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return t('Bom dia');
    if (h < 18) return t('Boa tarde');
    return t('Boa noite');
  }, [t]);

  const displayName = useMemo(() => {
    const email = user?.email ?? '';
    const raw: string =
      user?.user_metadata?.full_name ??
      user?.user_metadata?.name ??
      email.split('@')[0] ??
      '';
    return raw.trim().split(' ')[0];
  }, [user]);

  const welcomeMessage = useMemo(() => {
    const positive = currentBalance >= 0 && projectedBalance >= 0;
    const list = positive ? greetingsData.positive : greetingsData.negative;
    return list[Math.floor(Math.random() * list.length)];
  }, [currentBalance >= 0, projectedBalance >= 0]);

  const nav = navigation as any;

  const handleSelectType = (type: 'income' | 'expense' | 'credit') => {
    setTypeModalVisible(false);
    const safeAccounts = accounts.map(a => ({ id: a.id, name: a.name, logoUrl: a.logoUrl, bankCode: a.bankCode }));
    const safeCategories = categories.map(c => ({ id: c.id, name: c.name, icon: c.icon, type: c.type }));
    if (type === 'credit') {
      nav.navigate('CreditCardPurchase', { categories: safeCategories, accounts: safeAccounts });
    } else {
      nav.navigate('TransactionForm', { initialType: type, accounts: safeAccounts, categories: safeCategories });
    }
  };

  const handleTransfer = () => {
    setTypeModalVisible(false);
    nav.navigate('TransferForm', { accounts });
  };

  const hasCreditCard = cards.length > 0;
  const hasTransaction = allTransactions.length > 0;
  const handleAddCreditCard = () => nav.navigate('CreditCardForm');
  const handleAddTransaction = () => handleSelectType('expense');

  const fmt = (v: number) => `R$ ${Math.abs(v).toFixed(2)}`;
  const masked = '• • • • •';
  const maskedSmall = '• • •';

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <GlassHeader />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View style={styles.greetingSection}>
          <Text style={[styles.greetingTitle, { color: c.textPrimary }]}>
            {greeting}, {displayName} 👋
          </Text>
          <Text style={[styles.greetingMsg, { color: c.textSecondary }]}>
            {t(welcomeMessage)}
          </Text>
        </View>

        {(!hasCreditCard || !hasTransaction) && (
          <OnboardingChecklistCard
            hasCreditCard={hasCreditCard}
            hasTransaction={hasTransaction}
            onAddCreditCard={handleAddCreditCard}
            onAddTransaction={handleAddTransaction}
          />
        )}

        {/* Hero balance card */}
        <View style={styles.sectionRow}>
          <Text style={[styles.sectionLabel, { color: c.sectionLabel }]}>
            {t('VISÃO GERAL')}
          </Text>
          <TouchableOpacity onPress={toggleBalancesVisible} style={styles.eyeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon
              source={balancesVisible ? 'eye-outline' : 'eye-off-outline'}
              size={18}
              color={c.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <LinearGradient
          colors={['#4F46E5', '#7C3AED', '#A855F7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroBlock}>
            <View style={styles.heroLabelRow}>
              <View style={styles.heroIconPill}>
                <Icon source="wallet" size={14} color="#FFFFFF" />
              </View>
              <Text style={styles.heroLabelText}>{t('Saldo Atual')}</Text>
            </View>
            {balancesVisible ? (
              <Text style={[styles.heroValue, { color: currentBalance >= 0 ? '#A7F3D0' : '#FECDD3' }]}>
                {currentBalance < 0 ? '- ' : ''}{fmt(currentBalance)}
              </Text>
            ) : (
              <Text style={[styles.heroValue, { color: 'rgba(255,255,255,0.5)' }]}>{masked}</Text>
            )}
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.heroBlock}>
            <View style={styles.heroLabelRow}>
              <View style={styles.heroIconPill}>
                <Icon source="crystal-ball" size={14} color="#FFFFFF" />
              </View>
              <Text style={styles.heroLabelText}>{t('Projetado para')} {endOfMonthLabel}</Text>
            </View>
            {balancesVisible ? (
              <Text style={[styles.heroValueSmall, { color: projectedBalance >= 0 ? '#A7F3D0' : '#FECDD3' }]}>
                {projectedBalance < 0 ? '- ' : ''}{fmt(projectedBalance)}
              </Text>
            ) : (
              <Text style={[styles.heroValueSmall, { color: 'rgba(255,255,255,0.5)' }]}>{masked}</Text>
            )}
          </View>
        </LinearGradient>

        {/* This month summary */}
        <Text style={[styles.sectionLabel, { color: c.sectionLabel }]}>
          {t('ESTE MÊS')}
        </Text>
        <View style={styles.monthRow}>
          <View style={[styles.monthCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={styles.monthCardTop}>
              <View style={[styles.monthIconPill, { backgroundColor: '#10B98118' }]}>
                <Icon source="arrow-up-circle" size={14} color="#10B981" />
              </View>
              <Text style={[styles.monthCardLabel, { color: c.textSecondary }]}>{t('Entradas')}</Text>
            </View>
            <Text style={[styles.monthCardValue, { color: '#10B981' }]}>
              {balancesVisible ? fmt(monthIncome) : maskedSmall}
            </Text>
          </View>

          <View style={[styles.monthCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={styles.monthCardTop}>
              <View style={[styles.monthIconPill, { backgroundColor: '#F43F5E18' }]}>
                <Icon source="arrow-down-circle" size={14} color="#F43F5E" />
              </View>
              <Text style={[styles.monthCardLabel, { color: c.textSecondary }]}>{t('Saídas')}</Text>
            </View>
            <Text style={[styles.monthCardValue, { color: '#F43F5E' }]}>
              {balancesVisible ? fmt(monthExpense) : maskedSmall}
            </Text>
          </View>
        </View>

        {/* CTA */}
        <TouchableOpacity
          onPress={() => setTypeModalVisible(true)}
          activeOpacity={0.85}
          style={styles.ctaBtn}
        >
          <LinearGradient
            colors={['#4F46E5', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <Icon source="plus" size={20} color="#FFFFFF" />
            <Text style={styles.ctaText}>{t('Nova Transação')}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      <TransactionTypeModal
        visible={typeModalVisible}
        onClose={() => setTypeModalVisible(false)}
        onSelectIncome={() => handleSelectType('income')}
        onSelectExpense={() => handleSelectType('expense')}
        onSelectCredit={() => handleSelectType('credit')}
        onSelectTransfer={handleTransfer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },

  greetingSection: {
    marginBottom: 28,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  greetingMsg: {
    fontSize: 14,
    lineHeight: 21,
  },

  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginLeft: 2,
  },
  eyeBtn: {
    padding: 2,
  },

  // Hero card
  heroCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 28,
  },
  heroBlock: {
    gap: 6,
  },
  heroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroIconPill: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroLabelText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    fontWeight: '500',
  },
  heroValue: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 20,
  },
  heroValueSmall: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Month cards
  monthRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  monthCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  monthCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  monthIconPill: {
    width: 26,
    height: 26,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthCardLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  monthCardValue: {
    fontSize: 15,
    fontWeight: '700',
  },

  // CTA
  ctaBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
    gap: 10,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

const enhance = withObservables(['userId'], ({ userId }: { userId: string }) => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  return {
    allTransactions: database.get<Transaction>('transactions')
      .query(Q.where('user_id', userId), Q.where('credit_card_id', null))
      .observeWithColumns(['amount', 'type', 'is_consolidated', 'date']),

    pastTransactions: database.get<Transaction>('transactions')
      .query(
        Q.where('user_id', userId),
        Q.where('credit_card_id', null),
        Q.where('date', Q.lt(firstDay.getTime())),
      )
      .observeWithColumns(['amount', 'type', 'date']),

    currentMonthTransactions: database.get<Transaction>('transactions')
      .query(
        Q.where('user_id', userId),
        Q.where('credit_card_id', null),
        Q.where('date', Q.between(firstDay.getTime(), lastDay.getTime())),
      )
      .observeWithColumns(['amount', 'type', 'is_consolidated', 'date']),

    ccDueUpToMonth: database.get<Transaction>('transactions')
      .query(
        Q.where('user_id', userId),
        Q.where('credit_card_id', Q.notEq(null)),
        Q.where('is_consolidated', false),
        Q.where('date', Q.lte(lastDay.getTime())),
      )
      .observeWithColumns(['amount', 'is_consolidated', 'date']),

    accounts: AccountService.observeAccounts(),
    categories: CategoryService.observeCategories(userId),
    cards: CreditCardService.observeAll(userId),
  };
});

const EnhancedHomeScreen = enhance(HomeScreen);

const HomeScreenWrapper = () => {
  const { user } = useAuth();
  return <EnhancedHomeScreen userId={user?.id || ''} />;
};

export default HomeScreenWrapper;
