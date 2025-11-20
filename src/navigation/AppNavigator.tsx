import React from 'react'
import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useColorScheme } from "react-native";
import BottomNavigator from './BottomNavigator';
import AddTransactionScreen from '../screens/AddTransactionScreen';

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
          name="AddTransaction"
          options={{title: 'Ola'}}
          component={AddTransactionScreen}
          //options={{ headerShown: false }}navigation.navinavi
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
