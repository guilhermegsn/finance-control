import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Surface, List } from 'react-native-paper';

export interface MenuCardProps {
  nome: string;
  descricao: string;
  icone: string;
  onPress?: () => void;
}

const MenuCard: React.FC<MenuCardProps> = ({ nome, descricao, icone, onPress }) => {
  const cardContent = (
    <Surface style={styles.card} elevation={2}>
      <List.Item
        title={nome}
        description={descricao}
        left={props => <List.Icon {...props} icon={icone} />}
      />
    </Surface>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress}>
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
    borderRadius: 8,
  },
});

export default MenuCard;