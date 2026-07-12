import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { LineChart } from 'react-native-gifted-charts';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import SentinelaService, {
  PerformanceData,
  PerformancePeriod,
  SentinelaApiError,
  SentinelaAuthError,
} from '../service/SentinelaService';

const GREEN = '#10B981';
const RED = '#F43F5E';

// Mesma paleta do dashboard web do Sentinela — não alterar sem alinhar lá
const SERIES = [
  { key: 'portfolio', label: 'Carteira', color: '#818cf8' },
  { key: 'ibov', label: 'IBOV', color: '#f59e0b' },
  { key: 'selic', label: 'Selic', color: '#34d399' },
  { key: 'poupanca', label: 'Poupança', color: '#94a3b8' },
] as const;

const PERIODS: PerformancePeriod[] = ['2D', '5D', '1S', '1M', '6M', '1A', '5A', 'MAX'];

const CHART_HEIGHT = 200;
const Y_AXIS_WIDTH = 46;

type Palette = {
  card: string;
  border: string;
  rowBorder: string;
  textPrimary: string;
  textSecondary: string;
  sectionLabel: string;
};

type ChartPoint = {
  value: number;
  label?: string;
  labelTextStyle?: object;
  dateLabel: string;
  real: number;
};

// 'empty' = 404 da API (sem ativos ou sem pregão no intervalo)
type CachedEntry = PerformanceData | 'empty';

const fmtPct = (v: number, decimals: number) =>
  `${v > 0 ? '+' : ''}${v.toFixed(decimals)}%`;

// Arredonda o passo do eixo para 1/2/5 × 10^n, pra régua não sair com valores quebrados
const niceStep = (raw: number) => {
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const factor = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return factor * mag;
};

const PerformanceSection = ({
  c,
  hasAssets,
  tickers,
  onAuthError,
}: {
  c: Palette;
  hasAssets: boolean;
  tickers: string;
  onAuthError: () => void;
}) => {
  const { t } = useTranslation();

  const [period, setPeriod] = useState<PerformancePeriod>('6M');
  const [cache, setCache] = useState<Partial<Record<PerformancePeriod, CachedEntry>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestSeq = useRef(0);

  const load = useCallback(
    async (p: PerformancePeriod) => {
      const seq = ++requestSeq.current;
      setLoading(true);
      setError(null);
      try {
        const data = await SentinelaService.getPerformance(p);
        if (seq !== requestSeq.current) return;
        setCache((prev) => ({ ...prev, [p]: data }));
      } catch (err: any) {
        if (seq !== requestSeq.current) return;
        if (err instanceof SentinelaAuthError) {
          onAuthError();
          setError(t('Sessão expirada'));
        } else if (err instanceof SentinelaApiError && err.status === 404) {
          setCache((prev) => ({ ...prev, [p]: 'empty' }));
        } else {
          setError(err.message || t('Não foi possível carregar o comparativo'));
        }
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    },
    [onAuthError, t]
  );

  // Composição da carteira mudou → o retorno acumulado muda em todos os períodos
  const prevTickersRef = useRef(tickers);
  useEffect(() => {
    if (prevTickersRef.current !== tickers) {
      prevTickersRef.current = tickers;
      setCache({});
    }
  }, [tickers]);

  const entry = cache[period];

  useEffect(() => {
    if (!hasAssets) return;
    if (entry) return;
    load(period);
  }, [hasAssets, entry, period, load]);

  const chart = useMemo(() => {
    // Com menos de 2 pontos não há linha pra desenhar (carteira recém-cadastrada:
    // o backend limita a série ao oldest_asset_date e o 1º ponto é sempre 0)
    if (!entry || entry === 'empty' || entry.series.length < 2) return null;

    const points = entry.series;
    const allValues = points.flatMap((pt) => SERIES.map((s) => pt[s.key]));
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const step = niceStep(Math.max((max - min) / 4, 0.01));
    const yMin = Math.floor(min / step) * step;
    let yMax = Math.ceil(max / step) * step;
    if (yMax <= yMin) yMax = yMin + step;
    const sections = Math.round((yMax - yMin) / step);
    const axisDecimals = step < 1 ? 1 : 0;

    const yAxisLabelTexts = Array.from({ length: sections + 1 }, (_, i) =>
      fmtPct(yMin + i * step, axisDecimals)
    );

    // ~4 rótulos no eixo X pra não colidir
    const shortPeriod = ['2D', '5D', '1S', '1M'].includes(period);
    const dateFmt = shortPeriod ? 'DD/MM' : 'MM/YY';
    const labelEvery = Math.max(1, Math.ceil(points.length / 4));

    const datasets = SERIES.map((s) =>
      points.map((pt, i): ChartPoint => {
        const showLabel = i % labelEvery === 0 && i <= points.length - labelEvery / 2;
        return {
          value: pt[s.key] - yMin,
          real: pt[s.key],
          dateLabel: dayjs(pt.date).format('DD/MM/YYYY'),
          ...(showLabel && {
            label: dayjs(pt.date).format(dateFmt),
            labelTextStyle: { color: c.sectionLabel, fontSize: 9, width: 40 },
          }),
        };
      })
    );

    return {
      datasets,
      maxValue: yMax - yMin,
      sections,
      yAxisLabelTexts,
      zeroLine: yMin < 0 && yMax > 0 ? -yMin : null,
      finals: points[points.length - 1],
    };
  }, [entry, period, c.sectionLabel]);

  const chartWidth =
    Dimensions.get('window').width - 32 /* padding do scroll */ - 26 /* borda + respiro do card */ - Y_AXIS_WIDTH;

  const renderBody = () => {
    if (!hasAssets) {
      return (
        <View style={styles.stateBox}>
          <Icon source="chart-timeline-variant" size={36} color={c.textSecondary} />
          <Text style={[styles.stateText, { color: c.textSecondary }]}>
            {t('Cadastre um ativo para ver o comparativo')}
          </Text>
        </View>
      );
    }

    if (loading && !entry) {
      return (
        <View style={styles.stateBox}>
          <ActivityIndicator color="#6366F1" />
          <Text style={[styles.stateText, { color: c.textSecondary }]}>
            {t('Carregando histórico...')}
          </Text>
        </View>
      );
    }

    if (error && !entry) {
      return (
        <View style={styles.stateBox}>
          <Icon source="cloud-off-outline" size={32} color="#F59E0B" />
          <Text style={[styles.stateText, { color: c.textSecondary }]}>
            {t('Não foi possível carregar o comparativo')}
          </Text>
          <TouchableOpacity
            style={[styles.retryChip, { borderColor: c.border }]}
            onPress={() => load(period)}
            activeOpacity={0.7}
          >
            <Text style={styles.retryText}>{t('Tentar novamente')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (entry === 'empty' || (entry && entry.series.length === 0)) {
      return (
        <View style={styles.stateBox}>
          <Icon source="chart-line-variant" size={36} color={c.textSecondary} />
          <Text style={[styles.stateText, { color: c.textSecondary }]}>
            {t('Sem dados para este período')}
          </Text>
        </View>
      );
    }

    if (entry && entry.series.length < 2) {
      return (
        <View style={styles.stateBox}>
          <Icon source="clock-outline" size={36} color={c.textSecondary} />
          <Text style={[styles.stateText, { color: c.textSecondary }]}>
            {t('Ainda não há histórico suficiente')}
          </Text>
          <Text style={[styles.stateHint, { color: c.sectionLabel }]}>
            {t('Acompanhamos sua carteira desde')}{' '}
            {dayjs(entry.oldest_asset_date).format('DD/MM/YYYY')}.{' '}
            {t('O comparativo aparece a partir do próximo pregão.')}
          </Text>
        </View>
      );
    }

    if (!chart || !entry) return null;

    return (
      <>
        <View style={styles.chartWrap}>
          <LineChart
            data={chart.datasets[0]}
            data2={chart.datasets[1]}
            data3={chart.datasets[2]}
            data4={chart.datasets[3]}
            color1={SERIES[0].color}
            color2={SERIES[1].color}
            color3={SERIES[2].color}
            color4={SERIES[3].color}
            thickness={2}
            hideDataPoints
            adjustToWidth
            disableScroll
            width={chartWidth}
            height={CHART_HEIGHT}
            maxValue={chart.maxValue}
            noOfSections={chart.sections}
            yAxisLabelTexts={chart.yAxisLabelTexts}
            yAxisLabelWidth={Y_AXIS_WIDTH}
            yAxisTextStyle={{ color: c.sectionLabel, fontSize: 9 }}
            yAxisThickness={0}
            xAxisThickness={1}
            xAxisColor={c.border}
            rulesColor={c.rowBorder}
            rulesType="solid"
            initialSpacing={4}
            endSpacing={4}
            {...(chart.zeroLine !== null && {
              showReferenceLine1: true,
              referenceLine1Position: chart.zeroLine,
              referenceLine1Config: {
                color: c.sectionLabel,
                dashWidth: 4,
                dashGap: 6,
                thickness: 1,
              },
            })}
            pointerConfig={{
              activatePointersOnLongPress: true,
              pointerStripColor: c.sectionLabel,
              pointerStripWidth: 1,
              strokeDashArray: [3, 4],
              pointerColorsForDataSet: SERIES.map((s) => s.color),
              radius: 4,
              pointerLabelWidth: 150,
              autoAdjustPointerLabelPosition: true,
              pointerLabelComponent: (items: ChartPoint[]) => (
                <View style={[styles.tooltip, { backgroundColor: c.card, borderColor: c.border }]}>
                  <Text style={[styles.tooltipDate, { color: c.sectionLabel }]}>
                    {items[0]?.dateLabel}
                  </Text>
                  {SERIES.map((s, i) => (
                    <View key={s.key} style={styles.tooltipRow}>
                      <View style={[styles.dot, { backgroundColor: s.color }]} />
                      <Text style={[styles.tooltipLabel, { color: c.textSecondary }]}>
                        {t(s.label)}
                      </Text>
                      <Text style={[styles.tooltipValue, { color: c.textPrimary }]}>
                        {items[i] != null ? fmtPct(items[i].real, 2) : '—'}
                      </Text>
                    </View>
                  ))}
                </View>
              ),
            }}
          />
        </View>

        {/* Legenda com o retorno acumulado no fim do período */}
        <View style={styles.legendWrap}>
          {SERIES.map((s) => {
            const value = chart.finals[s.key];
            return (
              <View key={s.key} style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: s.color }]} />
                <Text style={[styles.legendLabel, { color: c.textSecondary }]}>{t(s.label)}</Text>
                <Text style={[styles.legendValue, { color: value >= 0 ? GREEN : RED }]}>
                  {fmtPct(value, 2)}
                </Text>
              </View>
            );
          })}
        </View>

        <Text style={[styles.sinceText, { color: c.sectionLabel }]}>
          {t('desde')} {dayjs(entry.start_date).format('DD/MM/YYYY')}
        </Text>
      </>
    );
  };

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={[styles.cardHeader, { borderBottomColor: c.border }]}>
        <Text style={[styles.cardTitle, { color: c.textPrimary }]}>
          {t('Desempenho comparado')}
        </Text>
        {loading && !!entry && <ActivityIndicator size={14} color="#6366F1" />}
      </View>

      <View style={styles.periodRow}>
        {PERIODS.map((p) => {
          const active = period === p;
          return (
            <TouchableOpacity
              key={p}
              style={[
                styles.periodChip,
                { borderColor: active ? '#6366F1' : c.border },
                active && { backgroundColor: '#6366F114' },
              ]}
              onPress={() => setPeriod(p)}
              activeOpacity={0.7}
            >
              <Text style={[styles.periodChipText, { color: active ? '#6366F1' : c.textSecondary }]}>
                {p}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {renderBody()}
    </View>
  );
};

export default PerformanceSection;

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 16,
    paddingBottom: 14,
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

  periodRow: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
  },
  periodChip: {
    flex: 1,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  periodChipText: {
    fontSize: 10,
    fontWeight: '700',
  },

  chartWrap: {
    paddingTop: 16,
    paddingRight: 8,
  },

  stateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    height: CHART_HEIGHT,
    gap: 8,
    paddingHorizontal: 32,
  },
  stateText: {
    fontSize: 12,
    textAlign: 'center',
  },
  stateHint: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 15,
  },
  retryChip: {
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  retryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6366F1',
  },

  legendWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    rowGap: 6,
    paddingHorizontal: 16,
    paddingTop: 12,
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
  legendValue: {
    fontSize: 11,
    fontWeight: '700',
  },
  sinceText: {
    fontSize: 10,
    paddingHorizontal: 16,
    paddingTop: 6,
  },

  tooltip: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    width: 150,
    gap: 3,
  },
  tooltipDate: {
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 2,
  },
  tooltipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tooltipLabel: {
    fontSize: 10,
    flex: 1,
  },
  tooltipValue: {
    fontSize: 10,
    fontWeight: '700',
  },
});
