import React, { useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { PaperProvider, Text, Button, Surface, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { CategoryService } from './src/service/CategoryService';
import useAutoSync from './src/service/useAutoSync';
import './src/i18n';
import { useFonts, Poppins_900Black } from '@expo-google-fonts/poppins';

// 1. Componente de Login (Simples e Direto)
const LoginScreen = () => {
  const { signInWithGoogle } = useAuth();

  const [fontsLoaded] = useFonts({
    Poppins_900Black,
  });

  // 3. Segure a tela até a fonte carregar (evita que o texto pisque com outra fonte)
  if (!fontsLoaded) {
    return null; // Você também pode retornar a SplashScreen nativa do Expo aqui
  }

  return (
    <View style={styles.loginContainer}>
      <Surface style={styles.loginCard} elevation={2}>
        <Text variant="headlineLarge" style={styles.title}>ButterFlow</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>Gerencie suas finanças com fluidez.</Text>
        
        <Button 
          icon="google" 
          mode="contained" 
          onPress={signInWithGoogle}
          style={styles.button}
        >
          Entrar com Google
        </Button>
      </Surface>
    </View>
  );
};

// 2. Componente que decide o que mostrar (O "Guarda de Trânsito")
const RootNavigation = () => {
  const { user, loading } = useAuth();
  
  // Inicializar sincronização automática quando o usuário estiver logado
  // O hook monitora AppState e dispara sync automaticamente
  const { isSyncing } = useAutoSync();

  // Inicializar categorias padrão quando o usuário estiver logado
  useEffect(() => {
    if (user?.id) {
      CategoryService.initializeDefaults(user.id).catch((error) => {
        console.error('Erro ao inicializar categorias padrão:', error);
      });
    }
  }, [user?.id]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  // Se tem usuário, mostra o App Principal. Se não, mostra Login.
  return user ? <AppNavigator /> : <LoginScreen />;
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
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f0f0f0',
  },
  loginCard: {
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  title: {
    fontWeight: 'bold',
    color: '#6200ee',
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 32,
    color: '#666',
    textAlign: 'center',
  },
  button: {
    width: '100%',
    paddingVertical: 4,
  }
});
