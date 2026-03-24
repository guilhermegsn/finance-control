import React from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { IconButton, Text, Surface, Icon, useTheme } from 'react-native-paper';
import { withObservables } from '@nozbe/watermelondb/react';
import Category from '../models/Caterogy';
import { CategoryService } from '../service/CategoryService';
import { useTranslation } from 'react-i18next';

// Componente de Item Individual
const CategoryItem = ({ category, onEdit }: { category: Category; onEdit?: (category: Category) => void }) => {
  const theme = useTheme();
  const { t } = useTranslation();

  const handleDelete = () => {
    CategoryService.delete(category.id);
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(category);
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'income' ? '#56D6A3' : '#FF7285';
  };

  const getTypeText = (type: string) => {
    return type === 'income' ? t('Entrada') : t('Despesa');
  };

  return (
    <Surface style={[
      styles.card,
      styles.cardElevated,
      {
        backgroundColor: theme.dark ? '#2A2D3E' : '#FFFFFF',
        borderColor: theme.dark ? 'transparent' : '#E5E7EB',
        borderWidth: theme.dark ? 0 : 1,
      }
    ]}>
      <TouchableOpacity onPress={handleEdit} activeOpacity={0.7} disabled={category.isSystem}>
        <View style={styles.cardContent}>
          <View style={[
            styles.iconContainer,
            { backgroundColor: `${category.color}20` } // Cor com 20% de opacidade
          ]}>
            <Icon source={category.icon} size={24} color={category.color} />
          </View>
          <View style={styles.textContainer}>
            <Text style={[
              styles.title,
              { color: theme.dark ? '#FFFFFF' : '#1F2937' }
            ]}>
              {category.isSystem ? t(`categories:${category.name}`) : category.name}
            </Text>
            <View style={styles.detailsContainer}>
              <View style={[
                styles.typeBadge,
                { backgroundColor: `${getTypeColor(category.type)}20` }
              ]}>
                <Icon 
                  source={category.type === 'income' ? 'arrow-up-circle' : 'arrow-down-circle'} 
                  size={12} 
                  color={getTypeColor(category.type)} 
                />
                <Text style={[
                  styles.typeText,
                  { color: getTypeColor(category.type) }
                ]}>
                  {getTypeText(category.type)}
                </Text>
              </View>
              <Text style={[
                styles.iconText,
                { color: theme.dark ? '#E5E7EB' : '#4B5563' }
              ]}>
                {t("Ícone")}: {category.icon}
              </Text>
            </View>
          </View>
          <View style={styles.actionsContainer}>
            {onEdit && !category.isSystem && (
              <IconButton 
                icon="pencil" 
                size={20} 
                onPress={handleEdit}
                iconColor={theme.dark ? '#9CA3AF' : '#6B7280'}
              />
            )}
            {!category.isSystem && (
              <IconButton 
                icon="delete" 
                size={20} 
                onPress={handleDelete}
                iconColor={theme.dark ? '#9CA3AF' : '#6B7280'}
              />
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Surface>
  );
};

// Wrapper para tornar o item reativo (se mudar o nome, atualiza sozinho)
const EnhancedCategoryItem = withObservables(['category'], ({ category }) => ({
  category, // Observa o próprio objeto
}))(CategoryItem);

// Componente da Lista
const CategoryList = ({ categories, onEdit }: { categories: Category[]; onEdit?: (category: Category) => void }) => {
  const theme = useTheme();
  
  if (categories.length === 0) {
    return (
      <View style={styles.empty}>
        <Icon source="tag-outline" size={48} color={theme.dark ? '#9CA3AF' : '#6B7280'} />
        <Text style={[
          styles.emptyText,
          { color: theme.dark ? '#E5E7EB' : '#4B5563' }
        ]}>
          Nenhuma categoria cadastrada.
        </Text>
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
    marginBottom: 12,
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
    marginBottom: 8,
  },
  detailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  iconText: {
    fontSize: 12,
    opacity: 0.8,
  },
  actionsContainer: {
    flexDirection: 'row',
  },
  empty: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    opacity: 0.8,
  },
});
