import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Text,
  Image,
  RefreshControl,
  AppState,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { withObservables } from '@nozbe/watermelondb/react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import Portfolio from '../models/Portfolio';
import PortfolioService from '../service/PortfolioService';
import SentinelaService, { Quote, SentinelaAuthError } from '../service/SentinelaService';
import AssetFormModal, { AssetFormData } from '../components/AssetFormModal';
import PerformanceSection from '../components/PerformanceSection';
import PortfolioSummary from '../components/PortfolioSummary';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const GREEN = '#10B981';
const RED = '#F43F5E';

// O backend renova as cotações a cada 5min (cron → yfinance → base);
// 60s garante pegar o dado novo em até ~1min sem poluir a API
const QUOTES_POLL_INTERVAL = 60_000;

const AVATAR_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B',
  '#10B981', '#3B82F6', '#F43F5E', '#14B8A6',
];

const avatarColor = (ticker: string) => {
  const hash = ticker.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

// O logo vem pronto da API do Sentinela (logo_url); se faltar ou falhar,
// caímos nas iniciais do ticker num círculo colorido
const TickerLogo = ({
  ticker,
  logoUrl,
  size = 34,
}: {
  ticker: string;
  logoUrl?: string | null;
  size?: number;
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [logoUrl]);

  if (logoUrl && !failed) {
    return (
      <Image
        source={{ uri: logoUrl }}
        onError={() => setFailed(true)}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    );
  }

  const color = avatarColor(ticker);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: `${color}22`,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text style={{ color, fontWeight: '700', fontSize: size * 0.34 }}>
        {ticker.slice(0, 2)}
      </Text>
    </View>
  );
};

type Palette = {
  bg: string;
  card: string;
  border: string;
  rowBorder: string;
  textPrimary: string;
  textSecondary: string;
  sectionLabel: string;
};

const Pill = ({ value, kind }: { value: number; kind: 'percent' | 'currency' }) => {
  const color = value >= 0 ? GREEN : RED;
  const label =
    kind === 'percent'
      ? `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
      : `${value >= 0 ? '+' : ''}${fmt(value)}`;
  return (
    <View style={[styles.pill, { backgroundColor: `${color}18` }]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
};

const Cell = ({
  label,
  c,
  align,
  children,
}: {
  label: string;
  c: Palette;
  align: 'flex-start' | 'center' | 'flex-end';
  children: React.ReactNode;
}) => (
  <View style={[styles.cell, { alignItems: align }]}>
    <Text style={[styles.kvLabel, { color: c.sectionLabel }]}>{label}</Text>
    {children}
  </View>
);

const AssetBlock = ({
  asset,
  quote,
  c,
  onLongPress,
}: {
  asset: Portfolio;
  quote?: Quote;
  c: Palette;
  onLongPress: (a: Portfolio) => void;
}) => {
  const { t } = useTranslation();

  const totalReturn = quote ? ((quote.price - asset.averagePrice) / asset.averagePrice) * 100 : null;
  const pl = quote ? (quote.price - asset.averagePrice) * asset.quantity : null;

  const dash = <Text style={[styles.kvText, { color: c.textSecondary }]}>—</Text>;

  return (
    <TouchableOpacity
      style={[styles.assetBlock, { borderBottomColor: c.border }]}
      onLongPress={() => onLongPress(asset)}
      delayLongPress={350}
      activeOpacity={0.7}
    >
      {/* Cabeçalho: sigla + variação do dia à esquerda, variação total + P&L à direita */}
      <View style={styles.assetHeader}>
        <TickerLogo ticker={asset.ticker} logoUrl={quote?.logo_url} size={30} />
        <View style={styles.assetTitleWrap}>
          <View style={styles.tickerRow}>
            <Text style={[styles.ticker, { color: c.textPrimary }]}>{asset.ticker}</Text>
            {quote && <Pill value={quote.daily_var} kind="percent" />}
          </View>
          {!!quote?.name && (
            <Text style={[styles.nameText, { color: c.textSecondary }]} numberOfLines={1}>
              {quote.name}
            </Text>
          )}
        </View>
        <View style={styles.pillsRow}>
          {totalReturn !== null && <Pill value={totalReturn} kind="percent" />}
          {pl !== null ? <Pill value={pl} kind="currency" /> : dash}
        </View>
      </View>

      {/* PM, preço atual e quantidade na mesma linha */}
      <View style={styles.kvGrid}>
        <Cell label="PM" c={c} align="flex-start">
          <Text style={[styles.kvText, { color: c.textSecondary }]}>{fmt(asset.averagePrice)}</Text>
        </Cell>
        <Cell label={t('Cotação')} c={c} align="center">
          {quote
            ? <Text style={[styles.kvText, styles.kvStrong, { color: c.textPrimary }]}>{fmt(quote.price)}</Text>
            : dash}
        </Cell>
        <Cell label={t('Qtd')} c={c} align="flex-end">
          <Text style={[styles.kvText, { color: c.textSecondary }]}>{asset.quantity}</Text>
        </Cell>
      </View>
    </TouchableOpacity>
  );
};

const ObservableAssetBlock = withObservables(['asset'], ({ asset }: { asset: Portfolio }) => ({
  asset: asset.observe(),
}))(AssetBlock);

const SentinelaScreen = ({ portfolios }: { portfolios: Portfolio[] }) => {
  const { isDarkMode } = useTheme();
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [sortBy, setSortBy] = useState<'pl' | 'daily'>('pl');
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [quotesError, setQuotesError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Portfolio | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const c: Palette = {
    bg: isDarkMode ? '#0D1117' : '#EEF2F7',
    card: isDarkMode ? '#161C27' : '#FFFFFF',
    border: isDarkMode ? '#2D3748' : '#E2E8F0',
    rowBorder: isDarkMode ? '#2D374880' : '#E2E8F080',
    textPrimary: isDarkMode ? '#E2E8F0' : '#1A202C',
    textSecondary: isDarkMode ? '#718096' : '#64748B',
    sectionLabel: isDarkMode ? '#4A5568' : '#94A3B8',
  };

  const tickers = useMemo(
    () => portfolios.map((p) => p.ticker).sort().join(','),
    [portfolios]
  );

  // Maior valor primeiro, maior perda por último; sem cotação vai para o fim
  const sortedPortfolios = useMemo(() => {
    const metricOf = (p: Portfolio) => {
      const quote = quotes[p.ticker];
      if (!quote) return Number.NEGATIVE_INFINITY;
      return sortBy === 'pl'
        ? (quote.price - p.averagePrice) * p.quantity
        : quote.daily_var;
    };
    return [...portfolios].sort((a, b) => metricOf(b) - metricOf(a));
  }, [portfolios, quotes, sortBy]);

  const handleAuthError = useCallback(() => {
    Alert.alert(
      t('Sessão expirada'),
      t('Faça login novamente para acessar o Sentinela.'),
      [
        { text: t('Cancelar'), style: 'cancel' },
        { text: t('auth:Sair'), style: 'destructive', onPress: () => signOut() },
      ]
    );
  }, [t, signOut]);

  const inFlightRef = useRef(false);

  const loadQuotes = useCallback(async () => {
    if (!tickers) {
      setQuotes({});
      setQuotesError(null);
      return;
    }
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const data = await SentinelaService.getQuotes(tickers.split(','));
      const byTicker: Record<string, Quote> = {};
      data.forEach((q) => { byTicker[q.ticker] = q; });
      setQuotes(byTicker);
      setQuotesError(null);

      // Data/hora de atualização vem da API (updated_at mais recente entre os ativos)
      const newest = data
        .map((q) => (q.updated_at ? new Date(q.updated_at).getTime() : 0))
        .reduce((max, ts) => Math.max(max, ts), 0);
      setLastUpdated(newest > 0 ? new Date(newest) : null);
    } catch (err: any) {
      if (err instanceof SentinelaAuthError) {
        handleAuthError();
      }
      setQuotesError(err.message || t('Cotações indisponíveis no momento'));
    } finally {
      inFlightRef.current = false;
    }
  }, [tickers, handleAuthError, t]);

  // Busca ao focar a aba (ou quando os tickers mudam) + polling enquanto visível.
  // O cleanup encerra o polling ao sair da aba; em background o AppState bloqueia.
  useFocusEffect(
    useCallback(() => {
      loadQuotes();

      const id = setInterval(() => {
        if (AppState.currentState === 'active') {
          loadQuotes();
        }
      }, QUOTES_POLL_INTERVAL);

      return () => clearInterval(id);
    }, [loadQuotes])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadQuotes();
    setRefreshing(false);
  }, [loadQuotes]);

  const handleAdd = () => {
    setEditingAsset(null);
    setModalVisible(true);
  };

  const handleEdit = (asset: Portfolio) => {
    setEditingAsset(asset);
    setModalVisible(true);
  };

  const handleLongPress = (asset: Portfolio) => {
    Alert.alert(asset.ticker, undefined, [
      { text: t('Editar'), onPress: () => handleEdit(asset) },
      { text: t('Excluir'), style: 'destructive', onPress: () => handleDelete(asset) },
      { text: t('Cancelar'), style: 'cancel' },
    ]);
  };

  const handleDelete = (asset: Portfolio) => {
    Alert.alert(
      t('Confirmar exclusão?'),
      t('Esta ação não pode ser desfeita.'),
      [
        { text: t('Cancelar'), style: 'cancel' },
        {
          text: t('Excluir'),
          style: 'destructive',
          onPress: async () => {
            try {
              await PortfolioService.delete(asset);
            } catch (err: any) {
              Alert.alert(t('Erro'), err.message);
            }
          },
        },
      ]
    );
  };

  const handleSubmit = async (data: AssetFormData) => {
    setSubmitting(true);
    try {
      if (editingAsset) {
        await PortfolioService.update(editingAsset, {
          quantity: data.quantity,
          averagePrice: data.averagePrice,
        });
      } else {
        await PortfolioService.create({
          ticker: data.ticker,
          quantity: data.quantity,
          averagePrice: data.averagePrice,
          userId: user?.id || '',
        });
      }
      setModalVisible(false);
      setEditingAsset(null);
    } catch (err: any) {
      Alert.alert(t('Erro'), err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <View style={[styles.header, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        <View style={styles.headerBtn} />
        <Text style={[styles.headerTitle, { color: c.textPrimary }]}>Sentinela</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#6366F1" />
        }
      >
        <View style={[styles.cardBox, { backgroundColor: c.card, borderColor: c.border }]}>
          {/* Card header */}
          <View style={[styles.cardHeader, { borderBottomColor: c.border }]}>
            <Text style={[styles.cardTitle, { color: c.textPrimary }]}>{t('Carteira')}</Text>
            {lastUpdated && (
              <Text style={[styles.updatedAt, { color: c.sectionLabel }]}>
                {t('Atualizado em')} {lastUpdated.toLocaleString('pt-BR')}
              </Text>
            )}
          </View>

          {portfolios.length > 0 && (
            <View style={[styles.sortRow, { borderBottomColor: c.rowBorder }]}>
              <Text style={[styles.sortLabel, { color: c.sectionLabel }]}>
                {t('Ordenar por').toUpperCase()}
              </Text>
              {([['pl', 'P&L'], ['daily', t('Hoje')]] as const).map(([key, label]) => {
                const active = sortBy === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.sortChip,
                      { borderColor: active ? '#6366F1' : c.border },
                      active && { backgroundColor: '#6366F114' },
                    ]}
                    onPress={() => setSortBy(key)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.sortChipText, { color: active ? '#6366F1' : c.textSecondary }]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {quotesError && portfolios.length > 0 && (
            <View style={styles.quotesErrorRow}>
              <Icon source="cloud-off-outline" size={13} color="#F59E0B" />
              <Text style={styles.quotesErrorText}>
                {t('Cotações indisponíveis no momento')}
              </Text>
            </View>
          )}

          {portfolios.length === 0 ? (
            <View style={styles.emptyInner}>
              <Icon source="chart-line" size={44} color={c.textSecondary} />
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>
                {t('Nenhum ativo cadastrado')}
              </Text>
              <Text style={[styles.emptyHint, { color: c.textSecondary }]}>
                {t('Toque em + para adicionar seu primeiro ativo')}
              </Text>
            </View>
          ) : (
            sortedPortfolios.map((asset) => (
              <ObservableAssetBlock
                key={asset.id}
                asset={asset}
                quote={quotes[asset.ticker]}
                c={c}
                onLongPress={handleLongPress}
              />
            ))
          )}
        </View>

        <PortfolioSummary c={c} portfolios={portfolios} quotes={quotes} />

        <PerformanceSection
          c={c}
          hasAssets={portfolios.length > 0}
          tickers={tickers}
          onAuthError={handleAuthError}
        />

        <View style={{ height: 90 }} />
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={handleAdd} activeOpacity={0.85}>
        <LinearGradient
          colors={['#8B5CF6', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Icon source="plus" size={24} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>

      <AssetFormModal
        visible={modalVisible}
        asset={editingAsset}
        submitting={submitting}
        onClose={() => {
          setModalVisible(false);
          setEditingAsset(null);
        }}
        onSubmit={handleSubmit}
      />
    </View>
  );
};

const enhance = withObservables(['userId'], ({ userId }: { userId: string }) => ({
  portfolios: PortfolioService.observeAll(userId),
}));

const EnhancedSentinelaScreen = enhance(SentinelaScreen);

const SentinelaScreenWrapper = () => {
  const { user } = useAuth();
  return <EnhancedSentinelaScreen userId={user?.id || 'default_user'} />;
};

export default SentinelaScreenWrapper;

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

  scroll: {
    padding: 16,
  },

  cardBox: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  updatedAt: {
    fontSize: 10,
  },

  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sortLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginRight: 2,
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  sortChipText: {
    fontSize: 11,
    fontWeight: '700',
  },

  quotesErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  quotesErrorText: {
    fontSize: 11,
    color: '#F59E0B',
  },

  // Bloco por ativo
  assetBlock: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  assetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  assetTitleWrap: {
    flex: 1,
  },
  tickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ticker: {
    fontSize: 15,
    fontWeight: '700',
  },
  nameText: {
    fontSize: 11,
    marginTop: 1,
  },

  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  // Grade compacta: PM, cotação e variação do dia lado a lado
  kvGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 4,
  },
  cell: {
    flex: 1,
    gap: 3,
  },
  kvLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  kvText: {
    fontSize: 13,
  },
  kvStrong: {
    fontWeight: '700',
  },

  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },

  emptyInner: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 12,
    textAlign: 'center',
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
