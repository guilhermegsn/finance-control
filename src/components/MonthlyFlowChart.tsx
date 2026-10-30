import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import Transaction from '../models/Transactions';
import { isTransactionDueInMonth } from '../utils/creditCardInvoiceHelper';
import { useCurrency } from '../contexts/CurrencyContext';
import { formatCurrency } from '../utils/formatCurrency';

const GREEN = '#10B981';
const RED = '#F43F5E';

const MONTHS_SHOWN = 6;
const BAR_WIDTH = 13;
const INTRA_PAIR_GAP = 3;
const Y_AXIS_WIDTH = 40;

// Eixo compacto: 12500 → "12,5k"
const fmtAxis = (v: number) => {
  if (v >= 1000) {
    const k = v / 1000;
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1).replace('.', ',')}k`;
  }
  return `${Math.round(v)}`;
};

// Arredonda o teto do eixo para 1/2/5 × 10^n
const niceStep = (raw: number) => {
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const factor = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return factor * mag;
};

const MonthlyFlowChart = ({
  allTransactions,
  currentDate,
}: {
  allTransactions: Transaction[];
  currentDate: Date;
}) => {
  const { t, i18n } = useTranslation();
  const { currency } = useCurrency();
  const dateLocale = i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'pt-br';
  const { isDarkMode } = useTheme();

  const c = {
    card: isDarkMode ? '#161C27' : '#FFFFFF',
    border: isDarkMode ? '#2D3748' : '#E2E8F0',
    rowBorder: isDarkMode ? '#2D374880' : '#E2E8F080',
    textPrimary: isDarkMode ? '#E2E8F0' : '#1A202C',
    textSecondary: isDarkMode ? '#718096' : '#64748B',
    sectionLabel: isDarkMode ? '#4A5568' : '#94A3B8',
  };

  const monthsData = useMemo(() => {
    return Array.from({ length: MONTHS_SHOWN }, (_, idx) => {
      const monthDate = dayjs(currentDate).locale(dateLocale).subtract(MONTHS_SHOWN - 1 - idx, 'month');
      const year = monthDate.year();
      const month = monthDate.month();
      const monthRef = new Date(year, month, 1);

      let income = 0;
      let expense = 0;

      allTransactions.forEach((tx) => {
        // Transferência entre contas próprias não é entrada nem saída real
        if (tx.description?.startsWith('[Transferência]')) return;

        // @ts-ignore - WatermelonDB usa esta sintaxe para relacionamentos
        const isCreditCard = tx._raw?.credit_card_id != null;

        if (isCreditCard) {
          // REGRA 2: compra de cartão pesa no mês de vencimento da fatura.
          // Só as pendentes: quando a fatura é paga, a transação "Pagamento
          // Fatura" (não-CC) passa a representar o gasto — sem contar duas vezes
          if (!tx.isConsolidated && isTransactionDueInMonth(tx, monthRef)) {
            expense += tx.amount;
          }
          return;
        }

        const txDate = new Date(tx.date);
        if (txDate.getFullYear() !== year || txDate.getMonth() !== month) return;

        if (tx.type === 'income') income += tx.amount;
        else if (tx.type === 'expense') expense += tx.amount;
      });

      return { label: monthDate.format('MMM'), income, expense };
    });
  }, [allTransactions, currentDate, dateLocale]);

  const maxValue = Math.max(...monthsData.flatMap((m) => [m.income, m.expense]));
  const hasData = maxValue > 0;

  const axis = useMemo(() => {
    if (!hasData) return null;
    const step = niceStep(Math.max(maxValue / 4, 1));
    const yMax = Math.ceil(maxValue / step) * step;
    const sections = Math.round(yMax / step);
    return {
      yMax,
      sections,
      labels: Array.from({ length: sections + 1 }, (_, i) => fmtAxis(i * step)),
    };
  }, [hasData, maxValue]);

  const barData = useMemo(
    () =>
      monthsData.flatMap((m, idx) => {
        const isViewedMonth = idx === MONTHS_SHOWN - 1;
        return [
          {
            value: m.income,
            frontColor: GREEN,
            spacing: INTRA_PAIR_GAP,
            label: m.label,
            labelWidth: BAR_WIDTH * 2 + INTRA_PAIR_GAP + 14,
            labelTextStyle: {
              color: isViewedMonth ? c.textSecondary : c.sectionLabel,
              fontSize: 9,
              fontWeight: isViewedMonth ? ('700' as const) : ('400' as const),
              textTransform: 'capitalize' as const,
            },
            month: m.label,
          },
          { value: m.expense, frontColor: RED, month: m.label },
        ];
      }),
    [monthsData, c.textSecondary, c.sectionLabel]
  );

  if (!hasData || !axis) return null;

  const chartWidth =
    Dimensions.get('window').width - 32 /* padding da tela */ - 28 /* padding do card */ - Y_AXIS_WIDTH;
  const groupWidth = BAR_WIDTH * 2 + INTRA_PAIR_GAP;
  const groupSpacing = Math.max(
    10,
    Math.floor((chartWidth - MONTHS_SHOWN * groupWidth - groupWidth / 2) / MONTHS_SHOWN)
  );

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionLabel, { color: c.sectionLabel }]}>
        {t('Entradas × Saídas').toUpperCase()}
      </Text>
      <Text style={[styles.subtitle, { color: c.textSecondary }]}>
        {t('Últimos 6 meses até o mês selecionado')}
      </Text>

      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <BarChart
          data={barData}
          width={chartWidth}
          height={170}
          disableScroll
          barWidth={BAR_WIDTH}
          spacing={groupSpacing}
          initialSpacing={groupSpacing / 2}
          barBorderTopLeftRadius={4}
          barBorderTopRightRadius={4}
          maxValue={axis.yMax}
          noOfSections={axis.sections}
          yAxisLabelTexts={axis.labels}
          yAxisLabelWidth={Y_AXIS_WIDTH}
          yAxisTextStyle={{ color: c.sectionLabel, fontSize: 9 }}
          yAxisThickness={0}
          xAxisThickness={1}
          xAxisColor={c.border}
          rulesColor={c.rowBorder}
          rulesType="solid"
          renderTooltip={(item: { value: number; month: string }) => (
            <View style={[styles.tooltip, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={[styles.tooltipText, { color: c.textPrimary }]}>{formatCurrency(item.value, currency)}</Text>
            </View>
          )}
        />

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: GREEN }]} />
            <Text style={[styles.legendLabel, { color: c.textSecondary }]}>{t('Entradas')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: RED }]} />
            <Text style={[styles.legendLabel, { color: c.textSecondary }]}>{t('Saídas')}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default MonthlyFlowChart;

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 6,
    marginLeft: 2,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 14,
    marginLeft: 2,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
  },
  tooltip: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 4,
  },
  tooltipText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
