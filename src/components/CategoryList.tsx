import React from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Alert, Text } from 'react-native';
import { Icon } from 'react-native-paper';
import { withObservables } from '@nozbe/watermelondb/react';
import Category from '../models/Caterogy';
import { CategoryService } from '../service/CategoryService';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

const TYPE_COLOR = { income: '#10B981', expense: '#F43F5E' };
const TYPE_LABEL = { income: 'Entrada', expense: 'Despesa' };

const CategoryItem = ({ category, onEdit }: { category: Category; onEdit?: (c: Category) => void }) => {
  const { isDarkMode } = useTheme();
  const { t } = useTranslation();

  const c = {
    card: isDarkMode ? '#161C27' : '#FFFFFF',
    border: isDarkMode ? '#2D3748' : '#E2E8F0',
    textPrimary: isDarkMode ? '#E2E8F0' : '#1A202C',
    textSecondary: isDarkMode ? '#718096' : '#64748B',
  };

  const accent = category.color || '#6366F1';
  const typeColor = TYPE_COLOR[category.type] ?? '#6366F1';
  const typeLabel = TYPE_LABEL[category.type] ?? category.type;
  const displayName = category.isSystem ? t(`categories:${category.name}`) : category.name;

  const handleDelete = () => {
    Alert.alert(
      'Excluir categoria',
      `Deseja excluir "${displayName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => CategoryService.delete(category.id) },
      ]
    );
  };

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: `${accent}20` }]}>
        <Icon source={category.icon || 'tag'} size={22} color={accent} />
      </View>

      <View style={styles.info}>
        <Text style={[styles.name, { color: c.textPrimary }]}>{displayName}</Text>
        <View style={styles.badgeRow}>
          <View style={[styles.typeBadge, { backgroundColor: `${typeColor}18` }]}>
            <Icon
              source={category.type === 'income' ? 'arrow-up-circle' : 'arrow-down-circle'}
              size={11}
              color={typeColor}
            />
            <Text style={[styles.typeBadgeText, { color: typeColor }]}>{typeLabel}</Text>
          </View>
          {category.isSystem && (
            <View style={[styles.sysBadge, { backgroundColor: isDarkMode ? '#2D3748' : '#F1F5F9' }]}>
              <Text style={[styles.sysBadgeText, { color: c.textSecondary }]}>Sistema</Text>
            </View>
          )}
        </View>
      </View>

      {!category.isSystem && (
        <View style={styles.actions}>
          {onEdit && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#6366F114' }]}
              onPress={() => onEdit(category)}
              activeOpacity={0.7}
            >
              <Icon source="pencil-outline" size={16} color="#6366F1" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#F43F5E14' }]}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Icon source="trash-can-outline" size={16} color="#F43F5E" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const EnhancedCategoryItem = withObservables(['category'], ({ category }) => ({
  category,
}))(CategoryItem);

const CategoryList = ({ categories, onEdit }: { categories: Category[]; onEdit?: (c: Category) => void }) => {
  const { isDarkMode } = useTheme();
  const textSecondary = isDarkMode ? '#718096' : '#64748B';

  if (categories.length === 0) {
    return (
      <View style={styles.empty}>
        <Icon source="tag-outline" size={48} color={textSecondary} />
        <Text style={[styles.emptyText, { color: textSecondary }]}>Nenhuma categoria cadastrada</Text>
        <Text style={[styles.emptyHint, { color: textSecondary }]}>Toque em + para adicionar</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={categories}
      keyExtractor={item => item.id}
      renderItem={({ item }) => <EnhancedCategoryItem category={item} onEdit={onEdit} />}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
    />
  );
};

const enhance = withObservables(['userId'], ({ userId }: { userId: string }) => ({
  categories: CategoryService.observeCategories(userId),
}));

export default enhance(CategoryList);

const styles = StyleSheet.create({
  list: {
    padding: 16,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    gap: 5,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sysBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
  },
  sysBadgeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  emptyHint: {
    fontSize: 13,
  },
});
