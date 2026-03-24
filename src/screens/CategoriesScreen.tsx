import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Portal, Modal, TextInput, Button, Surface, FAB, useTheme, Text, Icon } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { CategoryService } from '../service/CategoryService';
import CategoryList from '../components/CategoryList';
import Category from '../models/Caterogy';

export default function CategoriesScreen() {
  const { user } = useAuth();
  const theme = useTheme()
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);

  const [emptyParams] = useState<Partial<Category>>({
    name: "",
    type: "expense",
    color: "#7C73E6", // Cor padrão roxa que combina com o tema
    icon: "tag",
  })
  const [params, setParams] = useState<Partial<Category>>(emptyParams)

  const handleAdd = async () => {
    if (!params.name || !user) {
      Alert.alert('Erro', 'Preencha o nome da categoria');
      return;
    }

    try {
      await CategoryService.create({
        name: params.name,
        type: params.type || 'expense',
        color: params.color || '#7C73E6',
        icon: params.icon || 'tag',
        userId: user.id,
      });

      // Limpar formulário e fechar modal
      setParams(emptyParams);
      setModalVisible(false);

    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Erro ao criar categoria');
    }
  };

  const handleEdit = (category: any) => {
    setEditingCategory(category);
    setParams({
      name: category.name,
      type: category.type,
      color: category.color,
      icon: category.icon,
    });
    setModalVisible(true);
  };

  const handleUpdate = async () => {
    if (!editingCategory || !params.name || !user) {
      Alert.alert('Erro', 'Preencha o nome da categoria');
      return;
    }

    try {
      // Atualizar categoria localmente usando a função update
      await CategoryService.update(editingCategory.id, {
        name: params.name,
        type: params.type || 'expense',
        color: params.color || '#7C73E6',
        icon: params.icon || 'tag',
      });

      // Limpar formulário e fechar modal
      setParams(emptyParams);
      setEditingCategory(null);
      setModalVisible(false);

    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Erro ao atualizar categoria');
    }
  };

  const resetForm = () => {
    setParams(emptyParams);
    setEditingCategory(null);
    setModalVisible(false)
  };

  return (
    <View style={styles.container}>

      {/* Lista de Categorias */}
      <CategoryList onEdit={handleEdit} />

      {/* Floating Action Button para adicionar nova categoria */}
      <FAB
        style={[
          styles.fab,
          { backgroundColor: theme.dark ? '#7C73E6' : '#4F46E5' }
        ]}
        icon="plus"
        color="white"
        onPress={() => setModalVisible(true)}
      />

      {/* Modal para adicionar nova categoria */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={resetForm}
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          contentContainerStyle={styles.modalOverlay}
        >
          <Surface style={[
            styles.modalContainer,
            styles.cardElevated,
            {
              backgroundColor: theme.dark ? '#2A2D3E' : '#FFFFFF',
              borderColor: theme.dark ? 'transparent' : '#E5E7EB',
              borderWidth: theme.dark ? 0 : 1,
            }
          ]}>
            <ScrollView>
              <View style={styles.modalHeader}>
                <Icon 
                  source={editingCategory ? "pencil" : "plus-circle"} 
                  size={24} 
                  color={theme.dark ? '#7C73E6' : '#4F46E5'} 
                />
                <Text variant="titleLarge" style={[
                  styles.modalTitle,
                  { color: theme.dark ? '#FFFFFF' : '#1F2937' }
                ]}>
                  {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                </Text>
              </View>
              
              <TextInput
                label="Nome da Categoria (ex: Alimentação)"
                value={params.name || ''}
                onChangeText={(text) => setParams({ ...params, name: text })}
                style={styles.input}
                mode="outlined"
                autoFocus
                outlineColor={theme.dark ? '#4B5563' : '#D1D5DB'}
                activeOutlineColor={theme.dark ? '#7C73E6' : '#4F46E5'}
              />
              <TextInput
                label="Tipo (income/expense)"
                value={params.type || ''}
                onChangeText={(text) => setParams({ ...params, type: text as 'income' | 'expense' })}
                style={styles.input}
                mode="outlined"
                outlineColor={theme.dark ? '#4B5563' : '#D1D5DB'}
                activeOutlineColor={theme.dark ? '#7C73E6' : '#4F46E5'}
              />
              <TextInput
                label="Ícone (nome do ícone, ex: 'food', 'shopping', 'home')"
                value={params.icon || ''}
                onChangeText={(text) => setParams({ ...params, icon: text })}
                style={styles.input}
                mode="outlined"
                outlineColor={theme.dark ? '#4B5563' : '#D1D5DB'}
                activeOutlineColor={theme.dark ? '#7C73E6' : '#4F46E5'}
              />
              <TextInput
                label="Cor (hexadecimal)"
                value={params.color || ''}
                onChangeText={(text) => setParams({ ...params, color: text })}
                style={styles.input}
                mode="outlined"
                outlineColor={theme.dark ? '#4B5563' : '#D1D5DB'}
                activeOutlineColor={theme.dark ? '#7C73E6' : '#4F46E5'}
              />

              <View style={styles.modalActions}>
                <Button 
                  mode="outlined" 
                  onPress={() => {
                    setModalVisible(false)
                    resetForm();
                  }}
                  style={styles.cancelButton}
                  textColor={theme.dark ? '#9CA3AF' : '#6B7280'}
                >
                  Cancelar
                </Button>
                <Button 
                  mode="contained" 
                  onPress={editingCategory ? handleUpdate : handleAdd}
                  style={styles.saveButton}
                  buttonColor={theme.dark ? '#7C73E6' : '#4F46E5'}
                >
                  Salvar
                </Button>
              </View>
            </ScrollView>
          </Surface>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalContainer: {
    borderRadius: 16,
    padding: 24,
    maxHeight: '80%',
  },
  cardElevated: {
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    marginLeft: 12,
    fontWeight: '600',
  },
  input: {
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
    gap: 12,
  },
  cancelButton: {
    borderColor: '#D1D5DB',
  },
  saveButton: {
    minWidth: 100,
  },
});
