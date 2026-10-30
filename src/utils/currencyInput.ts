import type { DisplayCurrency } from '../contexts/CurrencyContext';

export const getCurrencyDecimalSeparator = (currency: DisplayCurrency) =>
  currency === 'BRL' ? ',' : '.';

export const getCurrencyInputPrefix = (currency: DisplayCurrency) =>
  currency === 'BRL' ? 'R$ ' : 'USD ';

const getGroupingSeparator = (currency: DisplayCurrency) =>
  currency === 'BRL' ? '.' : ',';

const groupIntegerDigits = (digits: string, currency: DisplayCurrency) =>
  digits.replace(/\B(?=(\d{3})+(?!\d))/g, getGroupingSeparator(currency));

export const formatCalculatorOperand = (
  input: string,
  currency: DisplayCurrency,
) => {
  if (!input) return '';

  const decimalSeparator = getCurrencyDecimalSeparator(currency);
  const hasDecimal = input.includes(decimalSeparator);
  const [integerPart, fractionalPart = ''] = input.split(decimalSeparator);
  const formattedInteger = groupIntegerDigits(integerPart || '0', currency);

  return hasDecimal
    ? `${formattedInteger}${decimalSeparator}${fractionalPart}`
    : formattedInteger;
};

export const formatAmountInput = (amount: number, currency: DisplayCurrency) => {
  const sign = amount < 0 ? '-' : '';
  const [integerPart, fractionalPart] = Math.abs(amount).toFixed(2).split('.');
  return `${sign}${groupIntegerDigits(integerPart, currency)}${getCurrencyDecimalSeparator(currency)}${fractionalPart}`;
};
