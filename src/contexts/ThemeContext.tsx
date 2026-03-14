import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ThemeContextData {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextData>({} as ThemeContextData);

const THEME_STORAGE_KEY = '@finance-control:dark-mode';

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

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
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
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
