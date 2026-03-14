import React from 'react'
import { NavigationContainer, DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationDefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import BottomNavigator from './BottomNavigator';
import AccountsScreen from '../screens/AccountsScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import { useTheme } from '../contexts/ThemeContext';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
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
            title: 'Minhas contas',
          }}
        />

        <Stack.Screen
          name="Categories"
          component={CategoriesScreen}
          options={{
            title: 'Categorias',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
