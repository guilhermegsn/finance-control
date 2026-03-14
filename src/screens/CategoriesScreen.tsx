import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Appbar, Portal, Modal, TextInput, Button, Card, IconButton, FAB } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { CategoryService } from '../service/CategoryService';
import CategoryList from '../components/CategoryList';
import Category from '../models/Caterogy';

export default function CategoriesScreen() {
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);


  const [emptyParams] = useState<Partial<Category>>({
    name: "",
    type: "expense",
    color: "#6200ee",
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
        color: params.color || '#6200ee',
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
        color: params.color || '#6200ee',
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
        style={styles.fab}
        icon="plus"
        color="white"
        onPress={() => setModalVisible(true)}
      />

      {/* Modal para adicionar nova categoria */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={resetForm}
          contentContainerStyle={styles.modalContainer}
        >
          <Card>
            <Card.Title
              title={editingCategory ? 'Editando categoria' : "Nova Categoria"}
              right={(props) => (
                <IconButton
                  {...props}
                  icon="close"
                  onPress={() => {
                    setModalVisible(false)
                    resetForm();
                  }}
                />
              )}
            />
            <Card.Content>
              <TextInput
                label="Nome da Categoria (ex: Alimentação)"
                value={params.name || ''}
                onChangeText={(text) => setParams({ ...params, name: text })}
                style={styles.input}
                mode="outlined"
                autoFocus
              />
              <TextInput
                label="Tipo (income/expense)"
                value={params.type || ''}
                onChangeText={(text) => setParams({ ...params, type: text as 'income' | 'expense' })}
                style={styles.input}
                mode="outlined"
              />
              <TextInput
                label="Ícone (nome do ícone, ex: 'food', 'shopping', 'home')"
                value={params.icon || ''}
                onChangeText={(text) => setParams({ ...params, icon: text })}
                style={styles.input}
                mode="outlined"
              />
              <TextInput
                label="Cor (hexadecimal)"
                value={params.color || ''}
                onChangeText={(text) => setParams({ ...params, color: text })}
                style={styles.input}
                mode="outlined"
              />
            </Card.Content>
            <Card.Actions>
              <Button onPress={() => {
                setModalVisible(false)
                resetForm();
              }}>
                Cancelar
              </Button>
              <Button mode="contained" onPress={editingCategory ? handleUpdate : handleAdd}>
                Salvar
              </Button>
            </Card.Actions>
          </Card>
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
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    marginBottom: 12
  },
  modalContainer: {
    padding: 20,
  },
});