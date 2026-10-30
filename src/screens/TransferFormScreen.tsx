import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, ScrollView, Alert, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { TextInput, Icon } from 'react-native-paper';
import { Select } from '../components/Select';
import { TransactionService } from '../service/TransactionService';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import Account from '../models/Accounts';
import { getAccountLogoByCode } from '../utils/accountLogos';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCurrency } from '../contexts/CurrencyContext';
import { getCurrencyInputPrefix, parseAmountInput } from '../utils/currencyInput';

interface TransferFormData {
  value: string;
  description: string;
  date: Date;
  sourceAssetId: string;
  destinationAssetId: string;
}

export default function TransferFormScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const { currency } = useCurrency();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const [activePicker, setActivePicker] = useState(false);

  const { accounts = [], onSave } = route.params || {};

  const c = {
    bg: isDarkMode ? '#0D1117' : '#EEF2F7',
    card: isDarkMode ? '#161C27' : '#FFFFFF',
    border: isDarkMode ? '#2D3748' : '#E2E8F0',
    textPrimary: isDarkMode ? '#E2E8F0' : '#1A202C',
    textSecondary: isDarkMode ? '#718096' : '#64748B',
    sectionLabel: isDarkMode ? '#4A5568' : '#94A3B8',
  };

  const inputTheme = {
    colors: {
      background: c.card,
      onSurfaceVariant: c.textSecondary,
      primary: '#F59E0B',
      outline: c.border,
      onSurface: c.textPrimary,
    },
  };

  const [formData, setFormData] = useState<TransferFormData>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      value: '',
      description: '',
      date: today,
      sourceAssetId: accounts.length > 0 ? accounts[0].id : '',
      destinationAssetId: accounts.length > 1 ? accounts[1].id : '',
    };
  });

  const sameAccount =
    formData.sourceAssetId !== '' &&
    formData.sourceAssetId === formData.destinationAssetId;

  const isInvalidForm = () => {
    const amount = parseAmountInput(formData.value, currency);
    return (
      amount == null ||
      amount <= 0 ||
      !formData.description.trim() ||
      !formData.sourceAssetId ||
      !formData.destinationAssetId ||
      sameAccount
    );
  };

  const handleSwap = () => {
    setFormData(prev => ({
      ...prev,
      sourceAssetId: prev.destinationAssetId,
      destinationAssetId: prev.sourceAssetId,
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    if (sameAccount) {
      Alert.alert(t('Atenção'), t('A conta de destino deve ser diferente da origem'));
      return;
    }
    const amount = parseAmountInput(formData.value, currency);
    if (amount == null || amount <= 0) return;

    try {
      await TransactionService.createTransfer({
        amount,
        date: formData.date,
        description: formData.description,
        sourceAssetId: formData.sourceAssetId,
        destinationAssetId: formData.destinationAssetId,
        userId: user.id,
      });
      onSave?.();
      navigation.goBack();
    } catch (error) {
      console.error('Erro ao salvar transferência:', error);
      Alert.alert(t('Erro'), t('Ocorreu um erro ao realizar a transferência.'));
    }
  };

  const buildAccountItems = (accounts: Account[]) =>
    accounts.map((account: Account) => {
      let imageSource = account.logoUrl;
      if (!imageSource && account.bankCode?.trim()) {
        imageSource = getAccountLogoByCode(account.bankCode);
      }
      let imageUri = imageSource;
      if (imageSource && typeof imageSource !== 'string') {
        try {
          const RNImage = require('react-native').Image;
          const resolved = RNImage.resolveAssetSource(imageSource);
          if (resolved?.uri) imageUri = resolved.uri;
        } catch { /* ignore */ }
      }
      return { id: account.id, label: account.name, value: account.id, imageUri };
    });

  const accountItems = buildAccountItems(accounts);

  return (
    <View style={[styles.root, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.bg }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Icon source="arrow-left" size={22} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.textPrimary }]}>
          {t('Nova Transferência')}
        </Text>
        <View style={styles.headerBtn} />
      </View>

      {activePicker && (
        <DateTimePicker
          value={formData.date}
          mode="date"
          display="default"
          onChange={(_, date) => { if (date) setFormData(prev => ({ ...prev, date })); setActivePicker(false); }}
        />
      )}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Valor + Data */}
        <Text style={[styles.sectionLabel, { color: c.sectionLabel }]}>{t('DETALHES')}</Text>
        <TextInput
          mode="outlined"
          label={t('Valor')}
          value={formData.value}
          onChangeText={text => setFormData(prev => ({ ...prev, value: text }))}
          placeholder={currency === 'BRL' ? '0,00' : '0.00'}
          keyboardType="numbers-and-punctuation"
          left={<TextInput.Affix text={getCurrencyInputPrefix(currency)} textStyle={{ color: c.textSecondary }} />}
          theme={inputTheme}
          style={[styles.input, { backgroundColor: c.card }]}
        />
        <TextInput
          mode="outlined"
          label={t('Descrição')}
          value={formData.description}
          onChangeText={text => setFormData(prev => ({ ...prev, description: text }))}
          placeholder={t('Motivo da transferência')}
          theme={inputTheme}
          style={[styles.input, { backgroundColor: c.card }]}
        />

        {/* Data */}
        <Text style={[styles.sectionLabel, { color: c.sectionLabel }]}>{t('DATA')}</Text>
        <TouchableOpacity
          style={[styles.dateBtn, { backgroundColor: c.card, borderColor: c.border }]}
          onPress={() => setActivePicker(true)}
          activeOpacity={0.7}
        >
          <Icon source="calendar" size={18} color="#F59E0B" />
          <Text style={[styles.dateBtnText, { color: c.textPrimary }]}>
            {formData.date.toLocaleDateString('pt-BR')}
          </Text>
          <Icon source="chevron-right" size={16} color={c.sectionLabel} />
        </TouchableOpacity>

        {/* Contas — Origem → Destino com swap */}
        <Text style={[styles.sectionLabel, { color: c.sectionLabel }]}>{t('CONTAS')}</Text>
        <View style={[styles.sectionCard, { backgroundColor: c.card, borderColor: c.border }]}>

          {/* Origem */}
          <View style={styles.accountRow}>
            <View style={[styles.accountIconPill, { backgroundColor: '#10B98118' }]}>
              <Icon source="arrow-up-circle" size={16} color="#10B981" />
            </View>
            <Text style={[styles.accountRowLabel, { color: c.textSecondary }]}>{t('Origem')}</Text>
            <View style={styles.selectWrap}>
              <Select
                items={accountItems}
                selectedValue={formData.sourceAssetId}
                onSelect={value => setFormData(prev => ({ ...prev, sourceAssetId: value }))}
                placeholder={t('Selecionar conta')}
                fontColor={c.textPrimary}
              />
            </View>
          </View>

          {/* Swap button */}
          <View style={[styles.swapRow, { borderColor: c.border }]}>
            <View style={[styles.swapDivider, { backgroundColor: c.border }]} />
            <TouchableOpacity
              style={[styles.swapBtn, { backgroundColor: c.bg, borderColor: c.border }]}
              onPress={handleSwap}
              activeOpacity={0.7}
            >
              <Icon source="swap-vertical" size={16} color="#F59E0B" />
            </TouchableOpacity>
            <View style={[styles.swapDivider, { backgroundColor: c.border }]} />
          </View>

          {/* Destino */}
          <View style={styles.accountRow}>
            <View style={[styles.accountIconPill, { backgroundColor: '#F43F5E18' }]}>
              <Icon source="arrow-down-circle" size={16} color="#F43F5E" />
            </View>
            <Text style={[styles.accountRowLabel, { color: c.textSecondary }]}>{t('Destino')}</Text>
            <View style={styles.selectWrap}>
              <Select
                items={accountItems}
                selectedValue={formData.destinationAssetId}
                onSelect={value => setFormData(prev => ({ ...prev, destinationAssetId: value }))}
                placeholder={t('Selecionar conta')}
                fontColor={c.textPrimary}
              />
            </View>
          </View>
        </View>

        {/* Erro de conta igual */}
        {sameAccount && (
          <Text style={styles.errorText}>
            {t('A conta de destino deve ser diferente da origem')}
          </Text>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: c.bg, borderTopColor: c.border, paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.cancelBtn, { borderColor: c.border, backgroundColor: c.card }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.cancelBtnText, { color: c.textSecondary }]}>{t('Cancelar')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSave}
          disabled={isInvalidForm()}
          style={[styles.saveBtn, { opacity: isInvalidForm() ? 0.45 : 1 }]}
        >
          <LinearGradient
            colors={['#F59E0B', '#D97706']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveGradient}
          >
            <Icon source="swap-horizontal" size={18} color="#FFFFFF" />
            <Text style={styles.saveBtnText}>{t('Transferir')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
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

  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 8,
    marginTop: 20,
    marginLeft: 2,
  },

  input: {
    marginBottom: 10,
  },

  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  dateBtnText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },

  // Section card com swap
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 10,
  },
  accountIconPill: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountRowLabel: {
    fontSize: 12,
    fontWeight: '600',
    width: 52,
  },
  selectWrap: {
    flex: 1,
  },

  // Swap
  swapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  swapDivider: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  swapBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },

  errorText: {
    color: '#F43F5E',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
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
    flexDirection: 'row',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
