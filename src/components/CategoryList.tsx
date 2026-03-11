import React from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { List, IconButton, Text, Surface } from 'react-native-paper';
import { withObservables } from '@nozbe/watermelondb/react';
import Category from '../models/Caterogy';
import { CategoryService } from '../service/CategoryService';

// Componente de Item Individual
const CategoryItem = ({ category, onEdit }: { category: Category; onEdit?: (category: Category) => void }) => {
  const handleDelete = () => {
    CategoryService.delete(category.id);
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(category);
    }
  };

  return (
    <Surface style={styles.card} elevation={1}>
      <List.Item
        title={category.name}
        description={`Tipo: ${category.type === 'income' ? 'Receita' : 'Despesa'} | Ícone: ${category.icon}`}
        left={props => <List.Icon {...props} icon={category.icon} color={category.color} />}
        right={props => (
          <View style={{ flexDirection: 'row' }}>
            {onEdit && (
              <IconButton {...props} icon="pencil" onPress={handleEdit} />
            )}
            <IconButton {...props} icon="delete" onPress={handleDelete} />
          </View>
        )}
      />
    </Surface>
  );
};

// Wrapper para tornar o item reativo (se mudar o nome, atualiza sozinho)
const EnhancedCategoryItem = withObservables(['category'], ({ category }) => ({
  category, // Observa o próprio objeto
}))(CategoryItem);

// Componente da Lista
const CategoryList = ({ categories, onEdit }: { categories: Category[]; onEdit?: (category: Category) => void }) => {
  if (categories.length === 0) {
    return (
      <View style={styles.empty}>
        <Text>Nenhuma categoria cadastrada.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={categories}
      keyExtractor={item => item.id}
      renderItem={({ item }) => <EnhancedCategoryItem category={item} onEdit={onEdit} />}
      contentContainerStyle={styles.listContainer}
    />
  );
};

// 1. A MAGIA: Conecta a query do banco às props do componente
const enhance = withObservables([], () => ({
  categories: CategoryService.observeCategories(),
}));


export default enhance(CategoryList);

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
  },
  card: {
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: 'white',
  },
  empty: {
    padding: 20,
    alignItems: 'center'
  }
});