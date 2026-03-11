import React from 'react'
import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useColorScheme } from "react-native";
import BottomNavigator from './BottomNavigator';
import AccountsScreen from '../screens/AccountsScreen';
import CategoriesScreen from '../screens/CategoriesScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {

  const isDarkMode = useColorScheme() === 'dark'
  return (
    <NavigationContainer theme={isDarkMode ? DarkTheme : DefaultTheme}>
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
