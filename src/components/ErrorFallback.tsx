import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface ErrorFallbackProps {
  resetError: () => void;
}

// Tela exibida pelo Sentry.ErrorBoundary quando um erro de render não tratado
// derrubaria o app. Usa estilos fixos de propósito: o ThemeProvider pode ser
// justamente a parte que quebrou.
export default function ErrorFallback({ resetError }: ErrorFallbackProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🦋</Text>
      <Text style={styles.title}>Ops, algo deu errado</Text>
      <Text style={styles.message}>
        Encontramos um problema inesperado. O erro já foi reportado e seus dados
        estão salvos no aparelho.
      </Text>
      <TouchableOpacity style={styles.button} onPress={resetError}>
        <Text style={styles.buttonText}>Tentar novamente</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
