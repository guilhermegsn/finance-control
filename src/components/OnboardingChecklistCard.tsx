import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Surface, Text, Icon } from 'react-native-paper';
import { useTheme } from '../contexts/ThemeContext';

interface OnboardingChecklistCardProps {
  hasCreditCard: boolean;
  hasTransaction: boolean;
  onAddCreditCard: () => void;
  onAddTransaction: () => void;
}

const OnboardingChecklistCard: React.FC<OnboardingChecklistCardProps> = ({
  hasCreditCard,
  hasTransaction,
  onAddCreditCard,
  onAddTransaction,
}) => {
  const { theme, isDarkMode } = useTheme();

  const items = [
    !hasCreditCard && {
      key: 'card',
      icon: 'credit-card-outline',
      label: 'Cadastre um cartão de crédito',
      description: 'Opcional, mas ajuda a acompanhar suas faturas',
      onPress: onAddCreditCard,
    },
    !hasTransaction && {
      key: 'transaction',
      icon: 'swap-vertical',
      label: 'Lance sua primeira transação',
      description: 'Dica: experimente criar uma recorrente, como um salário',
      onPress: onAddTransaction,
    },
  ].filter(Boolean) as { key: string; icon: string; label: string; description: string; onPress: () => void }[];

  if (items.length === 0) return null;

  return (
    <Surface
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: isDarkMode ? 'transparent' : theme.border,
          borderWidth: isDarkMode ? 0 : 1,
        },
      ]}
    >
      <Text style={[styles.title, { color: theme.textSecondary }]}>PRIMEIROS PASSOS</Text>
      {items.map((item, index) => (
        <TouchableOpacity
          key={item.key}
          style={[
            styles.row,
            index < items.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth },
          ]}
          onPress={item.onPress}
          activeOpacity={0.7}
        >
          <View style={[styles.iconPill, { backgroundColor: `${theme.primary}20` }]}>
            <Icon source={item.icon} size={20} color={theme.primary} />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.label, { color: theme.text }]}>{item.label}</Text>
            <Text style={[styles.description, { color: theme.textSecondary }]}>{item.description}</Text>
          </View>
          <Icon source="chevron-right" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      ))}
    </Surface>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 28,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  iconPill: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  description: {
    fontSize: 12,
    marginTop: 2,
  },
});

export default OnboardingChecklistCard;
