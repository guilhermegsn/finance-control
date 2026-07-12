import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import Portfolio from '../models/Portfolio';
import { Quote } from '../service/SentinelaService';

const GREEN = '#10B981';
const RED = '#F43F5E';
const INDIGO = '#6366F1';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const fmtPct = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(2)}%`;

type Palette = {
  card: string;
  border: string;
  rowBorder: string;
  textPrimary: string;
  textSecondary: string;
  sectionLabel: string;
};

const PortfolioSummary = ({
  c,
  portfolios,
  quotes,
}: {
  c: Palette;
  portfolios: Portfolio[];
  quotes: Record<string, Quote>;
}) => {
  const { t } = useTranslation();

  const summary = useMemo(() => {
    let invested = 0;
    let current = 0;
    // Somatórios só dos ativos com cotação: a variação do dia é ponderada pelo
    // valor da posição, comparando o total atual com o total do fechamento anterior
    let quotedCurrent = 0;
    let quotedPrevClose = 0;
    let quotedCount = 0;

    portfolios.forEach((p) => {
      const positionCost = p.averagePrice * p.quantity;
      invested += positionCost;

      const quote = quotes[p.ticker];
      if (quote && quote.daily_var > -100) {
        const positionValue = quote.price * p.quantity;
        current += positionValue;
        quotedCurrent += positionValue;
        quotedPrevClose += (quote.price / (1 + quote.daily_var / 100)) * p.quantity;
        quotedCount += 1;
      } else {
        // Sem cotação a posição contribui neutro (custo) pra não distorcer o total
        current += positionCost;
      }
    });

    return {
      invested,
      current,
      todayVar:
        quotedPrevClose > 0 ? ((quotedCurrent - quotedPrevClose) / quotedPrevClose) * 100 : null,
      totalVar: quotedCount > 0 && invested > 0 ? ((current - invested) / invested) * 100 : null,
      partial: quotedCount < portfolios.length,
    };
  }, [portfolios, quotes]);

  if (portfolios.length === 0) return null;

  const hasQuotes = summary.totalVar !== null;
  const gain = summary.current - summary.invested;
  const gainColor = gain >= 0 ? GREEN : RED;

  const cards: {
    icon: string;
    iconColor: string;
    label: string;
    value: string;
    valueColor: string;
    sub?: { text: string; color: string };
  }[] = [
    {
      icon: 'wallet',
      iconColor: INDIGO,
      label: t('Valor investido'),
      value: fmt(summary.invested),
      valueColor: c.textPrimary,
    },
    {
      icon: 'finance',
      iconColor: hasQuotes ? gainColor : INDIGO,
      label: t('Valor atual'),
      value: fmt(summary.current),
      valueColor: hasQuotes ? gainColor : c.textPrimary,
      ...(hasQuotes && {
        sub: { text: `${gain >= 0 ? '+' : ''}${fmt(gain)}`, color: gainColor },
      }),
    },
    {
      icon: 'clock-outline',
      iconColor: summary.todayVar !== null && summary.todayVar < 0 ? RED : GREEN,
      label: t('Hoje'),
      value: summary.todayVar !== null ? fmtPct(summary.todayVar) : '—',
      valueColor:
        summary.todayVar !== null
          ? summary.todayVar >= 0
            ? GREEN
            : RED
          : c.textSecondary,
    },
    {
      icon: 'chart-timeline-variant',
      iconColor: summary.totalVar !== null && summary.totalVar < 0 ? RED : GREEN,
      label: t('Variação total'),
      value: summary.totalVar !== null ? fmtPct(summary.totalVar) : '—',
      valueColor:
        summary.totalVar !== null
          ? summary.totalVar >= 0
            ? GREEN
            : RED
          : c.textSecondary,
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionLabel, { color: c.sectionLabel }]}>
        {t('Resumo da carteira').toUpperCase()}
      </Text>

      <View style={styles.grid}>
        {cards.map((card) => (
          <View
            key={card.label}
            style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}
          >
            <View style={styles.cardTop}>
              <View style={[styles.iconPill, { backgroundColor: `${card.iconColor}18` }]}>
                <Icon source={card.icon} size={14} color={card.iconColor} />
              </View>
              <Text style={[styles.cardLabel, { color: c.textSecondary }]}>{card.label}</Text>
            </View>
            <Text style={[styles.cardValue, { color: card.valueColor }]}>{card.value}</Text>
            {card.sub && (
              <Text style={[styles.subText, { color: card.sub.color }]}>{card.sub.text}</Text>
            )}
          </View>
        ))}
      </View>

      {summary.partial && (
        <Text style={[styles.partialNote, { color: c.sectionLabel }]}>
          {t('Alguns ativos estão sem cotação e ficaram fora das variações.')}
        </Text>
      )}
    </View>
  );
};

export default PortfolioSummary;

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 10,
    marginLeft: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  iconPill: {
    width: 26,
    height: 26,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  subText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  partialNote: {
    fontSize: 9,
    marginTop: 8,
    marginLeft: 2,
  },
});
