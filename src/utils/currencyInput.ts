import type { DisplayCurrency } from '../contexts/CurrencyContext';

export const getCurrencyDecimalSeparator = (currency: DisplayCurrency) =>
  currency === 'BRL' ? ',' : '.';

export const getCurrencyInputPrefix = (currency: DisplayCurrency) =>
  currency === 'BRL' ? 'R$ ' : 'USD ';

const getGroupingSeparator = (currency: DisplayCurrency) =>
  currency === 'BRL' ? '.' : ',';

const groupIntegerDigits = (digits: string, currency: DisplayCurrency) =>
  digits.replace(/\B(?=(\d{3})+(?!\d))/g, getGroupingSeparator(currency));

export const formatAmountInput = (amount: number, currency: DisplayCurrency) => {
  const sign = amount < 0 ? '-' : '';
  const [integerPart, fractionalPart] = Math.abs(amount).toFixed(2).split('.');
  return `${sign}${groupIntegerDigits(integerPart, currency)}${getCurrencyDecimalSeparator(currency)}${fractionalPart}`;
};

export const maskAmountInput = (input: string, currency: DisplayCurrency) => {
  const rawDigits = input.replace(/\D/g, '');
  if (!rawDigits) return '';

  const digits = rawDigits.replace(/^0+(?=\d)/, '').padStart(3, '0');
  const integerPart = digits.slice(0, -2);
  const fractionalPart = digits.slice(-2);

  return `${groupIntegerDigits(integerPart, currency)}${getCurrencyDecimalSeparator(currency)}${fractionalPart}`;
};

export const parseAmountInput = (input: string, currency: DisplayCurrency): number | null => {
  const decimalSeparator = getCurrencyDecimalSeparator(currency);
  const groupingSeparator = currency === 'BRL' ? '.' : ',';
  let value = input.trim();
  const isNegative = value.startsWith('-');
  if (isNegative) value = value.slice(1);
  if (!value) return null;

  const parts = value.split(decimalSeparator);
  if (parts.length > 2) return null;

  const [integerPart, fractionalPart] = parts;
  const escapedGroupingSeparator = groupingSeparator === '.' ? '\\.' : ',';
  const validGroupedInteger = new RegExp(`^\\d{1,3}(?:${escapedGroupingSeparator}\\d{3})+$`);
  const validInteger = /^\d+$/.test(integerPart) || validGroupedInteger.test(integerPart);
  const validFraction = fractionalPart === undefined || /^\d*$/.test(fractionalPart);
  if (!validInteger || !validFraction) return null;

  const normalized = `${isNegative ? '-' : ''}${integerPart.split(groupingSeparator).join('')}${fractionalPart === undefined ? '' : `.${fractionalPart}`}`;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
};
