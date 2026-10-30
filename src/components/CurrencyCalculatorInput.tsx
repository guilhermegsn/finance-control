import React, { ReactNode, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Icon, TextInput } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import type { DisplayCurrency } from '../contexts/CurrencyContext';
import { formatAmountInput, formatCalculatorOperand, getCurrencyDecimalSeparator, getCurrencyInputPrefix } from '../utils/currencyInput';
import { CurrencyOperator, evaluateCurrencyExpression } from '../utils/currencyCalculator';
import { formatCurrency } from '../utils/formatCurrency';

interface CurrencyCalculatorInputProps {
  value: number | null;
  onChangeValue: (value: number | null) => void;
  currency: DisplayCurrency;
  label: string;
  placeholder?: string;
  theme?: any;
  style?: StyleProp<ViewStyle>;
  left?: ReactNode;
  disabled?: boolean;
}

const MAX_INPUT_LENGTH = 18;
const MAX_DECIMAL_PLACES = 2;
const MAX_OPERATIONS = 12;
const OPERATORS: CurrencyOperator[] = ['+', '−', '×', '÷'];

export default function CurrencyCalculatorInput({
  value,
  onChangeValue,
  currency,
  label,
  placeholder,
  theme,
  style,
  left,
  disabled,
}: CurrencyCalculatorInputProps) {
  const { isDarkMode } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [operands, setOperands] = useState<string[]>(['']);
  const [operators, setOperators] = useState<CurrencyOperator[]>([]);

  const colors = {
    panel: isDarkMode ? '#161C27' : '#FFFFFF',
    border: isDarkMode ? '#2D3748' : '#E2E8F0',
    text: isDarkMode ? '#E2E8F0' : '#1A202C',
    secondary: isDarkMode ? '#94A3B8' : '#64748B',
    key: isDarkMode ? '#242C3B' : '#F1F5F9',
    accent: '#4F46E5',
  };

  const currentIndex = operands.length - 1;
  const decimalSeparator = getCurrencyDecimalSeparator(currency);
  const hasOperations = operators.length > 0;
  const currentOperand = operands[currentIndex];
  const completeExpression = hasOperations && currentOperand.length > 0 && !currentOperand.endsWith(decimalSeparator);
  const calculation = useMemo(
    () => completeExpression ? evaluateCurrencyExpression(operands, operators, currency) : null,
    [completeExpression, operands, operators, currency],
  );
  const canConfirm = hasOperations
    ? completeExpression && calculation != null
    : !operands[0] || !operands[0].endsWith(decimalSeparator);

  const openCalculator = () => {
    if (disabled) return;
    const initialOperand = value == null
      ? ''
      : Math.abs(value).toString().replace('.', decimalSeparator);
    setOperands([initialOperand]);
    setOperators([]);
    setVisible(true);
  };

  const appendDigit = (digit: string) => {
    setOperands(previous => {
      const next = [...previous];
      const active = next[next.length - 1];
      if (active.length >= MAX_INPUT_LENGTH) return previous;
      if (active.includes(decimalSeparator) && active.split(decimalSeparator)[1].length >= MAX_DECIMAL_PLACES) {
        return previous;
      }
      next[next.length - 1] = active === '0' && digit !== '0'
        ? digit
        : `${active}${digit}`;
      return next;
    });
  };

  const appendDecimalSeparator = () => {
    setOperands(previous => {
      const next = [...previous];
      const active = next[next.length - 1];
      if (active.includes(decimalSeparator) || active.length >= MAX_INPUT_LENGTH) return previous;
      next[next.length - 1] = active ? `${active}${decimalSeparator}` : `0${decimalSeparator}`;
      return next;
    });
  };

  const deleteLastDigit = () => {
    const active = operands[currentIndex];
    if (active.length > 0) {
      setOperands(previous => {
        const next = [...previous];
        next[next.length - 1] = next[next.length - 1].slice(0, -1);
        return next;
      });
    } else if (operands.length > 1) {
      setOperands(previous => previous.slice(0, -1));
      setOperators(previous => previous.slice(0, -1));
    }
  };

  const clearExpression = () => {
    setOperands(['']);
    setOperators([]);
  };

  const appendOperator = (operator: CurrencyOperator) => {
    const active = operands[currentIndex];
    if (!active) {
      if (operands.length > 1) {
        setOperators(previous => [...previous.slice(0, -1), operator]);
      }
      return;
    }
    if (operators.length >= MAX_OPERATIONS) return;
    const normalizedActive = active.endsWith(decimalSeparator) ? active.slice(0, -1) : active;
    setOperators(previous => [...previous, operator]);
    setOperands(previous => [...previous.slice(0, -1), normalizedActive || '0', '']);
  };

  const formattedExpression = operands
    .map((digits, index) => {
      const operand = formatCalculatorOperand(digits, currency);
      return index < operators.length ? `${operand} ${operators[index]}` : operand;
    })
    .join(' ');

  const confirm = () => {
    if (!canConfirm) return;
    if (hasOperations) {
      onChangeValue(calculation);
    } else if (!operands[0]) {
      onChangeValue(null);
    } else {
      const normalized = operands[0].endsWith(decimalSeparator)
        ? operands[0].slice(0, -1)
        : operands[0];
      const parsed = evaluateCurrencyExpression([normalized || '0'], [], currency);
      onChangeValue(parsed);
    }
    setVisible(false);
  };

  const renderKey = (
    label: string,
    onPress: () => void,
    kind: 'digit' | 'operator' | 'utility' = 'digit',
    buttonStyle?: StyleProp<ViewStyle>,
  ) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityLabel={label === '⌫' ? t('Apagar último dígito') : label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.key,
        buttonStyle,
        { backgroundColor: kind === 'operator' ? `${colors.accent}18` : colors.key },
        pressed && styles.pressedKey,
      ]}
    >
      {label === '⌫' ? (
        <Icon source="backspace-outline" size={23} color={colors.text} />
      ) : (
        <Text style={[styles.keyLabel, { color: kind === 'operator' ? colors.accent : colors.text }]}>{label}</Text>
      )}
    </Pressable>
  );

  return (
    <>
      <TextInput
        mode="outlined"
        label={label}
        value={value == null ? '' : formatAmountInput(value, currency)}
        onFocus={openCalculator}
        onPressIn={openCalculator}
        showSoftInputOnFocus={false}
        caretHidden
        editable={!disabled}
        placeholder={placeholder}
        left={left ?? <TextInput.Affix text={getCurrencyInputPrefix(currency)} />}
        theme={theme}
        style={style}
        accessibilityRole="button"
        accessibilityHint={t('Abre o teclado numérico com calculadora')}
      />

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setVisible(false)} />
          <View style={[styles.sheet, { backgroundColor: colors.panel, paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>{t('Calculadora')}</Text>
              <Pressable onPress={() => setVisible(false)} hitSlop={10} accessibilityLabel={t('Cancelar')}>
                <Icon source="close" size={22} color={colors.secondary} />
              </Pressable>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.expressionContainer}>
              <Text style={[styles.expression, { color: colors.text }]} numberOfLines={1}>{formattedExpression}</Text>
            </ScrollView>
            {hasOperations && completeExpression && (
              <View style={styles.resultContainer}>
                <Text style={[styles.resultLabel, { color: colors.secondary }]}>
                  {calculation == null ? t('Expressão inválida ou divisão por zero') : t('Resultado')}
                </Text>
                {calculation != null && (
                  <Text style={[styles.result, { color: colors.accent }]}>
                    {formatCurrency(calculation, currency)}
                  </Text>
                )}
              </View>
            )}

            <View style={styles.keypad}>
              <View style={styles.numberGrid}>
                {[
                  ['1', '2', '3'],
                  ['4', '5', '6'],
                  ['7', '8', '9'],
                  ['⌫', '0', getCurrencyDecimalSeparator(currency)],
                ].map((row, rowIndex) => (
                  <View key={rowIndex} style={styles.numberRow}>
                    {row.map((key, keyIndex) => {
                      if (rowIndex === 3 && keyIndex === 0) {
                        return renderKey(key, deleteLastDigit, 'utility', styles.numberKey);
                      }
                      if (rowIndex === 3 && keyIndex === 2) {
                        return renderKey(key, appendDecimalSeparator, 'utility', styles.numberKey);
                      }
                      return renderKey(key, () => appendDigit(key), 'digit', styles.numberKey);
                    })}
                  </View>
                ))}
              </View>
              <View style={styles.operatorColumn}>
                {OPERATORS.map(operator => renderKey(operator, () => appendOperator(operator), 'operator', styles.operatorKey))}
              </View>
            </View>

            <View style={styles.footer}>
              {renderKey('C', clearExpression, 'utility', styles.clearKey)}
              <Pressable
                accessibilityRole="button"
                onPress={confirm}
                disabled={!canConfirm}
                style={({ pressed }) => [
                  styles.confirmButton,
                  { backgroundColor: canConfirm ? colors.accent : colors.border },
                  pressed && canConfirm && styles.pressedKey,
                ]}
              >
                <Text style={styles.confirmLabel}>{t('Concluir')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.42)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10 },
  handle: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  title: { fontSize: 17, fontWeight: '700' },
  expressionContainer: { flexGrow: 1, justifyContent: 'flex-end', paddingVertical: 12 },
  expression: { fontSize: 27, fontWeight: '600', textAlign: 'right' },
  resultContainer: { minHeight: 55, alignItems: 'flex-end', justifyContent: 'center', marginBottom: 8 },
  resultLabel: { fontSize: 12 },
  result: { fontSize: 23, fontWeight: '700', marginTop: 2 },
  keypad: { flexDirection: 'row', gap: 10 },
  numberGrid: { flex: 1, gap: 8 },
  numberRow: { flexDirection: 'row', gap: 8 },
  numberKey: { flex: 1 },
  operatorColumn: { width: 62, gap: 8 },
  operatorKey: { width: 62 },
  key: { height: 54, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  keyLabel: { fontSize: 22, fontWeight: '600' },
  pressedKey: { opacity: 0.68, transform: [{ scale: 0.97 }] },
  footer: { flexDirection: 'row', gap: 10, marginTop: 10 },
  clearKey: { flex: 1 },
  confirmButton: { flex: 2, minHeight: 54, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  confirmLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
