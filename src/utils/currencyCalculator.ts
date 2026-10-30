import type { DisplayCurrency } from '../contexts/CurrencyContext';

export type CurrencyOperator = '+' | '−' | '×' | '÷';

type Fraction = { numerator: bigint; denominator: bigint };

const MAX_OPERAND_LENGTH = 18;
const MAX_SAFE_CENTS = BigInt(Number.MAX_SAFE_INTEGER);
const DECIMAL_SEPARATORS: Record<DisplayCurrency, string> = { BRL: ',', USD: '.' };

const abs = (value: bigint) => value < BigInt(0) ? -value : value;

const gcd = (a: bigint, b: bigint): bigint => {
  let left = abs(a);
  let right = abs(b);
  while (right !== BigInt(0)) {
    const remainder = left % right;
    left = right;
    right = remainder;
  }
  return left || BigInt(1);
};

const fraction = (numerator: bigint, denominator: bigint = BigInt(1)): Fraction => {
  if (denominator < BigInt(0)) {
    numerator = -numerator;
    denominator = -denominator;
  }
  const divisor = gcd(numerator, denominator);
  return { numerator: numerator / divisor, denominator: denominator / divisor };
};

const precedence = (operator: CurrencyOperator) =>
  operator === '+' || operator === '−' ? 1 : 2;

const applyOperator = (operator: CurrencyOperator, left: Fraction, right: Fraction): Fraction | null => {
  switch (operator) {
    case '+':
      return fraction(
        left.numerator * right.denominator + right.numerator * left.denominator,
        left.denominator * right.denominator,
      );
    case '−':
      return fraction(
        left.numerator * right.denominator - right.numerator * left.denominator,
        left.denominator * right.denominator,
      );
    case '×':
      return fraction(left.numerator * right.numerator, left.denominator * right.denominator);
    case '÷':
      if (right.numerator === BigInt(0)) return null;
      return fraction(left.numerator * right.denominator, left.denominator * right.numerator);
  }
};

const roundFractionToMoney = ({ numerator, denominator }: Fraction): number | null => {
  const scaledNumerator = numerator * BigInt(100);
  const sign = scaledNumerator < BigInt(0) ? -1 : 1;
  const absoluteNumerator = abs(scaledNumerator);
  let cents = absoluteNumerator / denominator;
  const remainder = absoluteNumerator % denominator;

  // Half away from zero, once at the final result only.
  if (remainder * BigInt(2) >= denominator) cents += BigInt(1);
  if (cents > MAX_SAFE_CENTS) return null;

  return sign * Number(cents) / 100;
};

const parseOperand = (input: string, currency: DisplayCurrency): Fraction | null => {
  const decimal = DECIMAL_SEPARATORS[currency];
  if (!input || input.length > MAX_OPERAND_LENGTH) return null;

  const parts = input.split(decimal);
  if (parts.length > 2) return null;
  const [integerPart, fractionalPart] = parts;
  if (
    !/^\d+$/.test(integerPart) ||
    (fractionalPart !== undefined && (!/^\d*$/.test(fractionalPart) || fractionalPart.length > 2))
  ) {
    return null;
  }

  const decimalPlaces = fractionalPart?.length ?? 0;
  const denominator = BigInt(10) ** BigInt(decimalPlaces);
  const whole = BigInt(integerPart);
  const fractionDigits = BigInt(fractionalPart || '0');
  return fraction(whole * denominator + fractionDigits, denominator);
};

/** Evaluates manually entered decimal currency operands without floating-point intermediates. */
export const evaluateCurrencyExpression = (
  operands: string[],
  operators: CurrencyOperator[],
  currency: DisplayCurrency,
): number | null => {
  if (operands.length !== operators.length + 1 || operators.length > 12) return null;

  const values: Fraction[] = [];
  for (const operand of operands) {
    const parsed = parseOperand(operand, currency);
    if (parsed == null) return null;
    values.push(parsed);
  }
  const valueStack: Fraction[] = [values[0]];
  const operatorStack: CurrencyOperator[] = [];

  for (let index = 0; index < operators.length; index += 1) {
    const current = operators[index];
    while (
      operatorStack.length > 0 &&
      precedence(operatorStack[operatorStack.length - 1]) >= precedence(current)
    ) {
      const previous = operatorStack.pop()!;
      const right = valueStack.pop()!;
      const left = valueStack.pop()!;
      const result = applyOperator(previous, left, right);
      if (!result) return null;
      valueStack.push(result);
    }
    operatorStack.push(current);
    valueStack.push(values[index + 1]);
  }

  while (operatorStack.length > 0) {
    const operator = operatorStack.pop()!;
    const right = valueStack.pop()!;
    const left = valueStack.pop()!;
    const result = applyOperator(operator, left, right);
    if (!result) return null;
    valueStack.push(result);
  }

  return roundFractionToMoney(valueStack[0]);
};
