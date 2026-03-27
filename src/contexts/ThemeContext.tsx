import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 1. Definição das Cores
export const colors = {
  light: {
    background: '#F5F7FA',
    card: '#FFFFFF',
    text: '#1C1C1E',
    textSecondary: '#666666',
    success: '#00A389',
    danger: '#D64545',
    warning: '#FFB938',
    border: '#E1E1E1',
    primary: '#4B7BEC',
  },
  dark: {
    background: '#121420',
    card: '#2A2D3E',
    text: '#FFFFFF',
    textSecondary: '#A0A0A0',
    success: '#56D6A3',
    danger: '#FF7285',
    warning: '#FFD074',
    border: '#3D4155',
    primary: '#709CFF',
  }
};

interface ThemeContextData {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  isThemeLoading: boolean;
  theme: typeof colors.light; // Tipagem baseada no objeto light
}

const ThemeContext = createContext<ThemeContextData>({} as ThemeContextData);
const THEME_STORAGE_KEY = '@finance-control:dark-mode';

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isThemeLoading, setIsThemeLoading] = useState(true);

  // useMemo garante que o objeto de cores só mude quando isDarkMode mudar
  const theme = useMemo(() => (isDarkMode ? colors.dark : colors.light), [isDarkMode]);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (storedTheme !== null) {
        setIsDarkMode(storedTheme === 'true');
      }
    } catch (error) {
      console.error('Erro ao carregar tema:', error);
    } finally {
      setIsThemeLoading(false);
    }
  };

  const toggleDarkMode = async () => {
    try {
      const newValue = !isDarkMode;
      setIsDarkMode(newValue);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, String(newValue));
    } catch (error) {
      console.error('Erro ao salvar tema:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, isThemeLoading, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  return context;
};