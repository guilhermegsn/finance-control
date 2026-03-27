import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Surface, Text, Icon } from 'react-native-paper';
import { useTheme } from '../contexts/ThemeContext';

export interface MenuCardProps {
  nome: string;
  descricao: string;
  icone: string;
  onPress?: () => void;
}

const MenuCard: React.FC<MenuCardProps> = ({ nome, descricao, icone, onPress }) => {

  const { theme, isDarkMode } = useTheme()
  // Mapeamento de cores para diferentes tipos de ícones
  const getIconColor = (iconName: string) => {
    const iconColors: Record<string, string> = {
      'wallet': '#FFB156',      // Laranja/Amarelo para carteira
      'tag': '#56D6A3',         // Verde para categorias
      'credit-card-outline': '#7C73E6', // Roxo para cartões
      'chart-bar': '#4F46E5',   // Índigo para gráficos
      'flag': '#FF7285',        // Rosa para metas
      'cog': '#818CF8',         // Azul para configurações
    };

    return iconColors[iconName] || theme.primary;
  };

  const iconColor = getIconColor(icone);

  const cardContent = (
    <Surface style={[
      styles.card,
      styles.cardElevated,
      {
        backgroundColor: theme.card,
        borderColor: isDarkMode ? 'transparent' : '#E5E7EB',
        borderWidth: isDarkMode ? 0 : 1,
      }
    ]}>
      <View style={styles.cardContent}>
        <View style={[
          styles.iconContainer,
          { backgroundColor: `${iconColor}20` } // Cor com 20% de opacidade
        ]}>
          <Icon source={icone} size={24} color={iconColor} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            {nome}
          </Text>
          <Text style={styles.description}>
            {descricao}
          </Text>
        </View>
        {onPress && (
          <Icon source="chevron-right" size={20} />
        )}
      </View>
    </Surface>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
  },
  cardElevated: {
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    opacity: 0.8,
  },
});

export default MenuCard;
