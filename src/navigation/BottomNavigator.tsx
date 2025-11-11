import { View, Text } from 'react-native'
import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { MaterialIcons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import MonthlyControlScreen from '../screens/MonthlyControlScreen';

const Tab = createBottomTabNavigator()
export default function BottomNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name='HomeScreen'
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          title: 'Finance-Control',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home-filled" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name='MonthlyControlScreen'
        component={MonthlyControlScreen}
        options={{
          tabBarLabel: 'Controle',
          title: 'Controle',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="today" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name='Config'
        component={MonthlyControlScreen}
        options={{
          tabBarLabel: 'Configurações',
          title: 'Configurações',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  )
}