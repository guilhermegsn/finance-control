import React from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import AppNavigator from './src/navigation/AppNavigator';
import OnboardingNavigator from './src/navigation/OnboardingNavigator';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import useAutoSync from './src/service/useAutoSync';
import { useNotifications } from './src/hooks/useNotifications';
import { useOnboardingStatus } from './src/hooks/useOnboardingStatus';
import './src/i18n';
import LoginScreen from './src/screens/auth/LoginScreen';
import OtpScreen from './src/screens/auth/OtpScreen';

// Componente que decide o que mostrar
const RootNavigation = () => {
  const { user, loading, pendingEmail } = useAuth();
  const { lastSyncedAt, syncGaveUp } = useAutoSync();
  const syncResolved = lastSyncedAt !== null || syncGaveUp;
  const { needsOnboarding, isLoading: onboardingLoading, markCompleted } = useOnboardingStatus(user?.id, syncResolved);

  useNotifications(user?.id);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  if (user && onboardingLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  if (user && needsOnboarding) return <OnboardingNavigator onComplete={markCompleted} />;
  if (user) return <AppNavigator />;
  if (pendingEmail) return <OtpScreen />;
  return <LoginScreen />;
};

// Componente que fornece o tema combinado
const ThemedApp = () => {
  const { isDarkMode, isThemeLoading } = useTheme();
  const theme = isDarkMode ? MD3DarkTheme : MD3LightTheme;
  
  // Aguarda o tema carregar antes de renderizar para evitar flash branco
  if (isThemeLoading) {
    return null;
  }
  
  return (
    <PaperProvider theme={theme}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <RootNavigation />
      </View>
    </PaperProvider>
  );
};

// 3. App Principal
export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
