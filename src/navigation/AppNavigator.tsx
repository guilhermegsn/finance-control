import React from 'react'
import { NavigationContainer, DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationDefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import BottomNavigator from './BottomNavigator';
import AccountsScreen from '../screens/AccountsScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import TransactionFormScreen from '../screens/TransactionFormScreen';
import { useTheme } from '../contexts/ThemeContext';
import TransferFormScreen from '../screens/TransferFormScreen';
import CreditCardListScreen from '../screens/CreditCardListScreen';
import CreditCardFormScreen from '../screens/CreditCardFormScreen';
import { useTranslation } from 'react-i18next';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {

  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const navigationTheme = isDarkMode ? NavigationDarkTheme : NavigationDefaultTheme;

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator>
        <Stack.Screen
          name="BottomNavigator"
          component={BottomNavigator}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="Accounts"
          component={AccountsScreen}
          options={{
            title: t('Minhas contas'),
          }}
        />

        <Stack.Screen
          name="Categories"
          component={CategoriesScreen}
          options={{
            title: t('Categorias'),
          }}
        />

        <Stack.Screen
          name="TransactionForm"
          component={TransactionFormScreen}
          options={{
            title: t('Transação'),
          }}
        />

        <Stack.Screen
          name="TransferForm"
          component={TransferFormScreen}
          options={{
            title: t('Transferência'),
          }}
        />
        
        <Stack.Screen
          name="CreditCardList"
          component={CreditCardListScreen}
           options={{
            title: t('Cartões de crédito'),
          }}
        />
        
        <Stack.Screen
          name="CreditCardForm"
          component={CreditCardFormScreen}
           options={{
            title: t('Cartão de crédito'),
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
