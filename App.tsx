import React, { useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { CategoryService } from './src/service/CategoryService';
import useAutoSync from './src/service/useAutoSync';
import { useNotifications } from './src/hooks/useNotifications';
import './src/i18n';
import LoginScreen from './src/screens/auth/LoginScreen';
import OtpScreen from './src/screens/auth/OtpScreen';

// Componente que decide o que mostrar
const RootNavigation = () => {
  const { user, loading, pendingEmail } = useAuth();

  const { lastSyncedAt } = useAutoSync();
  useNotifications(user?.id);

  // Inicializa categorias padrão apenas após o primeiro sync bem-sucedido,
  // garantindo que o PULL já trouxe os dados do Supabase antes de criar localmente.
  useEffect(() => {
    if (lastSyncedAt && user?.id) {
      CategoryService.initializeDefaults(user.id).catch((error) => {
        console.error('Erro ao inicializar categorias padrão:', error);
      });
    }
  }, [lastSyncedAt, user?.id]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

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
