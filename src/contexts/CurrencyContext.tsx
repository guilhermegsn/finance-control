import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type DisplayCurrency = 'BRL' | 'USD';

interface CurrencyContextData {
  currency: DisplayCurrency;
  setCurrency: (currency: DisplayCurrency) => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextData | undefined>(undefined);
const CURRENCY_STORAGE_KEY = '@finance-control:display-currency';

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrencyState] = useState<DisplayCurrency>('BRL');

  useEffect(() => {
    AsyncStorage.getItem(CURRENCY_STORAGE_KEY)
      .then((storedCurrency) => {
        if (storedCurrency === 'BRL' || storedCurrency === 'USD') {
          setCurrencyState(storedCurrency);
        }
      })
      .catch((error) => console.error('Erro ao carregar moeda de exibição:', error));
  }, []);

  const setCurrency = async (newCurrency: DisplayCurrency) => {
    setCurrencyState(newCurrency);
    try {
      await AsyncStorage.setItem(CURRENCY_STORAGE_KEY, newCurrency);
    } catch (error) {
      console.error('Erro ao salvar moeda de exibição:', error);
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency deve ser usado dentro de um CurrencyProvider');
  }
  return context;
};
