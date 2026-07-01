import React, { useEffect, useState } from 'react';
import {
  View, StyleSheet, Alert, TouchableOpacity, Image,
  ScrollView, Text, KeyboardAvoidingView, Platform,
} from 'react-native';
import { TextInput, Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { AccountService } from '../../service/AccountService';
import BankService, { BankWithLogo } from '../../service/BankService';
import { LinearGradient } from 'expo-linear-gradient';

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Corrente', icon: 'bank-outline' },
  { value: 'savings', label: 'Poupança', icon: 'piggy-bank-outline' },
  { value: 'investment', label: 'Investimento', icon: 'trending-up' },
];

const PRESET_COLORS = [
  '#6366F1', '#10B981', '#F59E0B', '#F43F5E',
  '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6',
];

export default function OnboardingAccountScreen({ navigation }: any) {
  const { user } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);
  const [bankSuggestions, setBankSuggestions] = useState<BankWithLogo[]>([]);
  const [selectedBank, setSelectedBank] = useState<BankWithLogo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [params, setParams] = useState({ name: '', type: 'checking', color: '#6366F1', logoUrl: '', bankCode: '' });

  const inputTheme = {
    colors: {
      background: isDarkMode ? '#2D3748' : '#F8FAFC',
      onSurfaceVariant: theme.textSecondary,
      primary: '#6366F1',
      outline: theme.border,
      onSurface: theme.text,
    },
  };

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

  const handleBankDeselect = () => {
    setSelectedBank(null);
    setSearchQuery('');
    setBankSuggestions([]);
    setParams(prev => ({ ...prev, logoUrl: '', bankCode: '' }));
  };

  const handleCreate = async () => {
    if (!params.name.trim() || !user) { Alert.alert('Erro', 'Preencha o nome da conta'); return; }
    setSaving(true);
    try {
      await AccountService.create({
        name: params.name, type: params.type, color: params.color,
        logoUrl: params.logoUrl || '', bankCode: params.bankCode || '', userId: user.id,
      });
      navigation.navigate('CreditCard');
    } catch (error) {
      Alert.alert('Erro', 'Erro ao criar conta');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Icon source="arrow-left" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Sua primeira conta</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={[styles.hint, { color: theme.textSecondary }]}>
          Toda transação precisa estar ligada a uma conta. Busque seu banco ou dê um nome para a conta.
        </Text>

        <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>BANCO</Text>
        <View style={styles.searchWrap}>
          {selectedBank ? (
            <TouchableOpacity
              style={[styles.selectedBank, { backgroundColor: `${params.color}12`, borderColor: `${params.color}30` }]}
              onPress={handleBankDeselect}
              activeOpacity={0.7}
            >
              <Image source={selectedBank.logoUrl} style={styles.selectedLogo} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.selectedName, { color: theme.text }]}>{selectedBank.displayName}</Text>
                <Text style={[styles.selectedCode, { color: theme.textSecondary }]}>{selectedBank.name}</Text>
              </View>
              <Icon source="check-circle" size={20} color={theme.success} />
            </TouchableOpacity>
          ) : (
            <>
              <TextInput
                mode="outlined"
                label="Buscar banco (ex: Nubank, Itaú)"
                value={searchQuery}
                onChangeText={text => {
                  setSearchQuery(text);
                  setParams(prev => ({ ...prev, name: text }));
                }}
                theme={inputTheme}
                style={{ backgroundColor: inputTheme.colors.background }}
                autoCorrect={false}
              />

              {bankSuggestions.length > 0 && (
                <View style={[styles.suggestions, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  {bankSuggestions.map(bank => (
                    <TouchableOpacity
                      key={bank.id}
                      style={[styles.suggestionItem, { borderBottomColor: theme.border }]}
                      onPress={() => handleBankSelect(bank)}
                      activeOpacity={0.7}
                    >
                      <Image source={bank.logoUrl} style={styles.suggestionLogo} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.suggestionName, { color: theme.text }]}>{bank.displayName}</Text>
                        {bank.code && (
                          <Text style={[styles.suggestionCode, { color: theme.textSecondary }]}>Código {bank.code}</Text>
                        )}
                      </View>
                      <Icon source="chevron-right" size={16} color={theme.textSecondary} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>TIPO DE CONTA</Text>
        <View style={styles.typeRow}>
          {ACCOUNT_TYPES.map(type => {
            const active = params.type === type.value;
            return (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.typeBtn,
                  { borderColor: active ? params.color : theme.border, backgroundColor: active ? `${params.color}18` : theme.card },
                ]}
                onPress={() => setParams(prev => ({ ...prev, type: type.value }))}
                activeOpacity={0.7}
              >
                <Icon source={type.icon} size={18} color={active ? params.color : theme.textSecondary} />
                <Text style={[styles.typeBtnText, { color: active ? params.color : theme.textSecondary }]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>COR DE ACENTO</Text>
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
              {params.color === color && <Icon source="check" size={14} color="#FFFFFF" />}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          onPress={handleCreate}
          disabled={!params.name.trim() || saving}
          style={[styles.saveBtn, { opacity: !params.name.trim() || saving ? 0.45 : 1 }]}
        >
          <LinearGradient
            colors={['#6366F1', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveGradient}
          >
            <Text style={styles.saveBtnText}>Criar conta e continuar</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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

  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  hint: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },

  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 10,
    marginTop: 16,
    marginLeft: 2,
  },

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

  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  saveBtn: {
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
