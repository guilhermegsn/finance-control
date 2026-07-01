import React from 'react';
import {
  NavigationContainer,
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../contexts/ThemeContext';
import OnboardingWelcomeScreen from '../screens/onboarding/OnboardingWelcomeScreen';
import OnboardingAccountScreen from '../screens/onboarding/OnboardingAccountScreen';
import OnboardingCreditCardScreen from '../screens/onboarding/OnboardingCreditCardScreen';
import OnboardingDoneScreen from '../screens/onboarding/OnboardingDoneScreen';

const Stack = createNativeStackNavigator();

interface OnboardingNavigatorProps {
  onComplete: () => Promise<void>;
}

export default function OnboardingNavigator({ onComplete }: OnboardingNavigatorProps) {
  const { isDarkMode } = useTheme();
  const navigationTheme = isDarkMode ? NavigationDarkTheme : NavigationDefaultTheme;

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, gestureEnabled: false }}>
        <Stack.Screen name="Welcome" component={OnboardingWelcomeScreen} />
        <Stack.Screen name="Account" component={OnboardingAccountScreen} />
        <Stack.Screen name="CreditCard" component={OnboardingCreditCardScreen} />
        <Stack.Screen name="Done">
          {() => <OnboardingDoneScreen onComplete={onComplete} />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
