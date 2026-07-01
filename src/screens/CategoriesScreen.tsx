import React, { useState } from 'react';
import {
  View, StyleSheet, Alert, TouchableOpacity, Text,
  Modal, ScrollView, KeyboardAvoidingView, Platform, TouchableWithoutFeedback,
} from 'react-native';
import { TextInput, Icon } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { CategoryService } from '../service/CategoryService';
import CategoryList from '../components/CategoryList';
import Category from '../models/Caterogy';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const PRESET_COLORS = [
  '#6366F1', '#10B981', '#F59E0B', '#F43F5E',
  '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6',
];

const ICON_OPTIONS = [
  'food-fork-drink', 'cart-outline', 'home-outline', 'car-outline', 'airplane',
  'heart-pulse', 'school-outline', 'gamepad-variant-outline', 'dumbbell', 'briefcase-outline',
  'gift-outline', 'phone-outline', 'cash', 'credit-card-outline', 'tag-outline',
  'coffee-outline', 'lightning-bolt', 'wrench-outline', 'paw-outline', 'book-open-outline',
];

const DEFAULT_PARAMS = { name: '', type: 'expense' as 'income' | 'expense', color: '#6366F1', icon: 'tag-outline' };

export default function CategoriesScreen() {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [params, setParams] = useState(DEFAULT_PARAMS);

  const c = {
    bg: isDarkMode ? '#0D1117' : '#EEF2F7',
    card: isDarkMode ? '#161C27' : '#FFFFFF',
    sheetBg: isDarkMode ? '#1C2333' : '#FFFFFF',
    border: isDarkMode ? '#2D3748' : '#E2E8F0',
    textPrimary: isDarkMode ? '#E2E8F0' : '#1A202C',
    textSecondary: isDarkMode ? '#718096' : '#64748B',
    sectionLabel: isDarkMode ? '#4A5568' : '#94A3B8',
    overlay: isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)',
  };

  const inputTheme = {
    colors: {
      background: isDarkMode ? '#2D3748' : '#F8FAFC',
      onSurfaceVariant: c.textSecondary,
      primary: params.color,
      outline: c.border,
      onSurface: c.textPrimary,
    },
  };

  const handleAdd = async () => {
    if (!params.name.trim() || !user) { Alert.alert('Erro', 'Preencha o nome da categoria'); return; }
    try {
      await CategoryService.create({ name: params.name, type: params.type, color: params.color, icon: params.icon, userId: user.id });
      resetForm();
    } catch { Alert.alert('Erro', 'Erro ao criar categoria'); }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setParams({ name: category.name, type: category.type, color: category.color || '#6366F1', icon: category.icon || 'tag-outline' });
    setModalVisible(true);
  };

  const handleUpdate = async () => {
    if (!editingCategory || !params.name.trim() || !user) { Alert.alert('Erro', 'Preencha o nome da categoria'); return; }
    try {
      await CategoryService.update(editingCategory.id, { name: params.name, type: params.type, color: params.color, icon: params.icon });
      resetForm();
    } catch { Alert.alert('Erro', 'Erro ao atualizar categoria'); }
  };

  const resetForm = () => {
    setParams(DEFAULT_PARAMS);
    setEditingCategory(null);
    setModalVisible(false);
  };

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Icon source="arrow-left" size={22} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.textPrimary }]}>Categorias</Text>
        <View style={styles.headerBtn} />
      </View>

      <CategoryList onEdit={handleEdit} userId={user?.id || ''} />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)} activeOpacity={0.85}>
        <LinearGradient colors={['#6366F1', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fabGradient}>
          <Icon source="plus" size={24} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Bottom Sheet */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={resetForm}>
        <KeyboardAvoidingView style={styles.modalWrapper} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableWithoutFeedback onPress={resetForm}>
            <View style={[styles.overlay, { backgroundColor: c.overlay }]} />
          </TouchableWithoutFeedback>

          <View style={[styles.sheet, { backgroundColor: c.sheetBg, paddingBottom: insets.bottom + 16 }]}>
            <View style={[styles.handle, { backgroundColor: c.border }]} />

            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: c.textPrimary }]}>
                {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
              </Text>
              <TouchableOpacity style={styles.closeBtn} onPress={resetForm}>
                <Icon source="close" size={20} color={c.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* Preview pill */}
              <View style={[styles.previewPill, { backgroundColor: `${params.color}18`, borderColor: `${params.color}30` }]}>
                <View style={[styles.previewIcon, { backgroundColor: `${params.color}30` }]}>
                  <Icon source={params.icon} size={20} color={params.color} />
                </View>
                <Text style={[styles.previewName, { color: params.color }]}>
                  {params.name || 'Pré-visualização'}
                </Text>
                <View style={[styles.previewBadge, { backgroundColor: params.type === 'income' ? '#10B98120' : '#F43F5E20' }]}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: params.type === 'income' ? '#10B981' : '#F43F5E' }}>
                    {params.type === 'income' ? 'Entrada' : 'Despesa'}
                  </Text>
                </View>
              </View>

              {/* Name */}
              <Text style={[styles.fieldLabel, { color: c.sectionLabel }]}>NOME</Text>
              <TextInput
                mode="outlined"
                label="Nome da categoria"
                value={params.name}
                onChangeText={text => setParams(prev => ({ ...prev, name: text }))}
                theme={inputTheme}
                style={{ backgroundColor: inputTheme.colors.background }}
                autoCorrect={false}
              />

              {/* Type */}
              <Text style={[styles.fieldLabel, { color: c.sectionLabel }]}>TIPO</Text>
              <View style={styles.typeRow}>
                {(['income', 'expense'] as const).map(type => {
                  const active = params.type === type;
                  const color = type === 'income' ? '#10B981' : '#F43F5E';
                  const label = type === 'income' ? 'Entrada' : 'Despesa';
                  const icon = type === 'income' ? 'arrow-up-circle' : 'arrow-down-circle';
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[styles.typeBtn, { borderColor: active ? color : c.border, backgroundColor: active ? `${color}18` : c.card }]}
                      onPress={() => setParams(prev => ({ ...prev, type }))}
                      activeOpacity={0.7}
                    >
                      <Icon source={icon} size={18} color={active ? color : c.textSecondary} />
                      <Text style={[styles.typeBtnText, { color: active ? color : c.textSecondary }]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Icon picker */}
              <Text style={[styles.fieldLabel, { color: c.sectionLabel }]}>ÍCONE</Text>
              <View style={[styles.iconGrid, { backgroundColor: c.card, borderColor: c.border }]}>
                {ICON_OPTIONS.map(icon => {
                  const active = params.icon === icon;
                  return (
                    <TouchableOpacity
                      key={icon}
                      style={[
                        styles.iconCell,
                        active && { backgroundColor: `${params.color}20`, borderRadius: 10 },
                      ]}
                      onPress={() => setParams(prev => ({ ...prev, icon }))}
                      activeOpacity={0.7}
                    >
                      <Icon source={icon} size={22} color={active ? params.color : c.textSecondary} />
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Color swatches */}
              <Text style={[styles.fieldLabel, { color: c.sectionLabel }]}>COR</Text>
              <View style={styles.colorRow}>
                {PRESET_COLORS.map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[styles.colorSwatch, { backgroundColor: color }, params.color === color && styles.colorSwatchSelected]}
                    onPress={() => setParams(prev => ({ ...prev, color }))}
                    activeOpacity={0.8}
                  >
                    {params.color === color && <Icon source="check" size={14} color="#FFFFFF" />}
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ height: 8 }} />

              {/* Footer */}
              <View style={styles.sheetFooter}>
                <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: c.card, borderColor: c.border }]} onPress={resetForm}>
                  <Text style={[styles.cancelBtnText, { color: c.textSecondary }]}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={editingCategory ? handleUpdate : handleAdd}
                  disabled={!params.name.trim()}
                  style={[styles.saveBtn, { opacity: !params.name.trim() ? 0.45 : 1 }]}
                >
                  <LinearGradient colors={['#6366F1', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveGradient}>
                    <Text style={styles.saveBtnText}>{editingCategory ? 'Salvar alterações' : 'Criar categoria'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
  },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalWrapper: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '92%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },

  previewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 10,
    marginBottom: 4,
  },
  previewIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  previewBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },

  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 10,
    marginTop: 16,
    marginLeft: 2,
  },

  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  typeBtnText: { fontSize: 14, fontWeight: '600' },

  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 14,
    borderWidth: 1,
    padding: 8,
    gap: 4,
  },
  iconCell: {
    width: '18%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },

  colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },

  sheetFooter: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600' },
  saveBtn: { flex: 2, borderRadius: 12, overflow: 'hidden' },
  saveGradient: { paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
