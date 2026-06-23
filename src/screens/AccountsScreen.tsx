import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, Alert, TouchableOpacity, Image,
  Modal, ScrollView, Text, KeyboardAvoidingView, Platform, TouchableWithoutFeedback,
} from 'react-native';
import { TextInput, Icon } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { AccountService } from '../service/AccountService';
import BankService, { BankWithLogo } from '../service/BankService';
import AccountList from '../components/AccountList';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Corrente', icon: 'bank-outline' },
  { value: 'savings', label: 'Poupança', icon: 'piggy-bank-outline' },
  { value: 'investment', label: 'Investimento', icon: 'trending-up' },
];

const PRESET_COLORS = [
  '#6366F1', '#10B981', '#F59E0B', '#F43F5E',
  '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6',
];

export default function AccountsScreen() {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [bankSuggestions, setBankSuggestions] = useState<BankWithLogo[]>([]);
  const [selectedBank, setSelectedBank] = useState<BankWithLogo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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
      primary: '#6366F1',
      outline: c.border,
      onSurface: c.textPrimary,
    },
  };

  const emptyParams = { name: '', type: 'checking', color: '#6366F1', logoUrl: '', bankCode: '' };
  const [params, setParams] = useState(emptyParams);

  useEffect(() => {
    if (searchQuery.length < 2) { setBankSuggestions([]); return; }
    const suggestions = BankService.searchBanks(searchQuery);
    setBankSuggestions(suggestions.slice(0, 5));
  }, [searchQuery]);

  const handleBankSelect = (bank: BankWithLogo) => {
    setSelectedBank(bank);
    setParams(prev => ({ ...prev, name: bank.displayName, logoUrl: bank.logoUrl, bankCode: bank.code || '' }));
    setSearchQuery(bank.displayName);
    setBankSuggestions([]);
  };

  const handleAdd = async () => {
    if (!params.name || !user) { Alert.alert('Erro', 'Preencha o nome da conta'); return; }
    try {
      await AccountService.create({
        name: params.name, type: params.type, color: params.color,
        logoUrl: params.logoUrl || '', bankCode: params.bankCode || '', userId: user.id,
      });
      resetForm();
    } catch (error) {
      Alert.alert('Erro', 'Erro ao criar conta');
    }
  };

  const handleEdit = (account: any) => {
    setEditingAccount(account);
    setParams({ name: account.name, type: account.type, color: account.color || '#6366F1', logoUrl: account.logoUrl || '', bankCode: account.bankCode || '' });
    if (account.bankCode) {
      const bank = BankService.getBankByCode(account.bankCode);
      if (bank) { setSelectedBank(bank); setSearchQuery(bank.name); }
      else { setSelectedBank(null); setSearchQuery(account.name); }
    } else {
      setSelectedBank(null); setSearchQuery(account.name);
    }
    setModalVisible(true);
  };

  const handleUpdate = async () => {
    if (!editingAccount || !params.name || !user) { Alert.alert('Erro', 'Preencha o nome da conta'); return; }
    try {
      await AccountService.update(editingAccount.id, {
        name: params.name, type: params.type, color: params.color,
        logoUrl: params.logoUrl || '', bankCode: params.bankCode || '',
      });
      resetForm();
    } catch (error) {
      Alert.alert('Erro', 'Erro ao atualizar conta');
    }
  };

  const resetForm = () => {
    setParams(emptyParams);
    setEditingAccount(null);
    setSelectedBank(null);
    setSearchQuery('');
    setBankSuggestions([]);
    setModalVisible(false);
  };

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Icon source="arrow-left" size={22} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.textPrimary }]}>Minhas Contas</Text>
        <View style={styles.headerBtn} />
      </View>

      <AccountList onEdit={handleEdit} />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={['#6366F1', '#7C3AED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Icon source="plus" size={24} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Bottom Sheet Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={resetForm}
      >
        <KeyboardAvoidingView
          style={styles.modalWrapper}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableWithoutFeedback onPress={resetForm}>
            <View style={[styles.overlay, { backgroundColor: c.overlay }]} />
          </TouchableWithoutFeedback>

          <View style={[styles.sheet, { backgroundColor: c.sheetBg, paddingBottom: insets.bottom + 16 }]}>
            {/* Handle */}
            <View style={[styles.handle, { backgroundColor: c.border }]} />

            {/* Sheet header */}
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: c.textPrimary }]}>
                {editingAccount ? 'Editar Conta' : 'Nova Conta'}
              </Text>
              <TouchableOpacity style={styles.closeBtn} onPress={resetForm}>
                <Icon source="close" size={20} color={c.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* Bank search */}
              <Text style={[styles.fieldLabel, { color: c.sectionLabel }]}>BANCO</Text>
              <View style={styles.searchWrap}>
                <TextInput
                  mode="outlined"
                  label="Buscar banco (ex: Nubank, Itaú)"
                  value={searchQuery}
                  onChangeText={text => {
                    setSearchQuery(text);
                    setParams(prev => ({ ...prev, name: text }));
                    if (!text) { setSelectedBank(null); setParams(prev => ({ ...prev, logoUrl: '', bankCode: '' })); }
                  }}
                  theme={inputTheme}
                  style={{ backgroundColor: inputTheme.colors.background }}
                  autoCorrect={false}
                  right={selectedBank
                    ? <TextInput.Icon icon="close" onPress={() => { setSelectedBank(null); setSearchQuery(''); setParams(prev => ({ ...prev, logoUrl: '', bankCode: '' })); }} />
                    : undefined
                  }
                />

                {/* Suggestions */}
                {bankSuggestions.length > 0 && (
                  <View style={[styles.suggestions, { backgroundColor: c.card, borderColor: c.border }]}>
                    {bankSuggestions.map(bank => (
                      <TouchableOpacity
                        key={bank.id}
                        style={[styles.suggestionItem, { borderBottomColor: c.border }]}
                        onPress={() => handleBankSelect(bank)}
                        activeOpacity={0.7}
                      >
                        <Image source={bank.logoUrl} style={styles.suggestionLogo} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.suggestionName, { color: c.textPrimary }]}>{bank.displayName}</Text>
                          {bank.code && (
                            <Text style={[styles.suggestionCode, { color: c.textSecondary }]}>Código {bank.code}</Text>
                          )}
                        </View>
                        <Icon source="chevron-right" size={16} color={c.sectionLabel} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Selected bank preview */}
                {selectedBank && (
                  <View style={[styles.selectedBank, { backgroundColor: `${params.color}12`, borderColor: `${params.color}30` }]}>
                    <Image source={selectedBank.logoUrl} style={styles.selectedLogo} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.selectedName, { color: c.textPrimary }]}>{selectedBank.displayName}</Text>
                      <Text style={[styles.selectedCode, { color: c.textSecondary }]}>{selectedBank.name}</Text>
                    </View>
                    <Icon source="check-circle" size={20} color="#10B981" />
                  </View>
                )}
              </View>

              {/* Account type */}
              <Text style={[styles.fieldLabel, { color: c.sectionLabel }]}>TIPO DE CONTA</Text>
              <View style={styles.typeRow}>
                {ACCOUNT_TYPES.map(type => {
                  const active = params.type === type.value;
                  return (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.typeBtn,
                        { borderColor: active ? params.color : c.border, backgroundColor: active ? `${params.color}18` : c.card },
                      ]}
                      onPress={() => setParams(prev => ({ ...prev, type: type.value }))}
                      activeOpacity={0.7}
                    >
                      <Icon source={type.icon} size={18} color={active ? params.color : c.textSecondary} />
                      <Text style={[styles.typeBtnText, { color: active ? params.color : c.textSecondary }]}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Color swatches */}
              <Text style={[styles.fieldLabel, { color: c.sectionLabel }]}>COR DE ACENTO</Text>
              <View style={styles.colorRow}>
                {PRESET_COLORS.map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: color },
                      params.color === color && styles.colorSwatchSelected,
                    ]}
                    onPress={() => setParams(prev => ({ ...prev, color }))}
                    activeOpacity={0.8}
                  >
                    {params.color === color && (
                      <Icon source="check" size={14} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ height: 8 }} />

              {/* Footer buttons */}
              <View style={styles.sheetFooter}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { backgroundColor: c.card, borderColor: c.border }]}
                  onPress={resetForm}
                >
                  <Text style={[styles.cancelBtnText, { color: c.textSecondary }]}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={editingAccount ? handleUpdate : handleAdd}
                  disabled={!params.name.trim()}
                  style={[styles.saveBtn, { opacity: !params.name.trim() ? 0.45 : 1 }]}
                >
                  <LinearGradient
                    colors={['#6366F1', '#7C3AED']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.saveGradient}
                  >
                    <Text style={styles.saveBtnText}>
                      {editingAccount ? 'Salvar alterações' : 'Criar conta'}
                    </Text>
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

  // Modal / Bottom sheet
  modalWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '90%',
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
    marginBottom: 20,
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

  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 10,
    marginTop: 16,
    marginLeft: 2,
  },

  // Bank search
  searchWrap: {
    position: 'relative',
  },
  suggestions: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  suggestionLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '500',
  },
  suggestionCode: {
    fontSize: 12,
    marginTop: 1,
  },
  selectedBank: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 8,
    gap: 12,
  },
  selectedLogo: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  selectedName: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectedCode: {
    fontSize: 12,
    marginTop: 2,
  },

  // Account type
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  typeBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Colors
  colorRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
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

  // Footer
  sheetFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
