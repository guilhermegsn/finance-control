import { DisplayCurrency } from '../contexts/CurrencyContext';

const formatterCache = new Map<string, Intl.NumberFormat>();

export const formatCurrency = (
  amount: number,
  currency: DisplayCurrency,
) => {
  const locale = currency === 'BRL' ? 'pt-BR' : 'en-US';
  const cacheKey = `${locale}:${currency}`;
  let formatter = formatterCache.get(cacheKey);

  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    });
    formatterCache.set(cacheKey, formatter);
  }

  return formatter.format(amount);
};
