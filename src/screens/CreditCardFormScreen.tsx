import React, { useEffect, useState } from 'react';
import {
  View, StyleSheet, ScrollView, Alert, TouchableOpacity, Text,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TextInput, Icon } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import CreditCardService from '../service/CreditCardService';
import CreditCard from '../models/CreditCard';
import { brandLogos } from '../utils/brandLogos';
import { getAccountLogoByCode } from '../utils/accountLogos';
import { Select } from '../components/Select';
import { useCurrency } from '../contexts/CurrencyContext';
import { formatAmountInput, getCurrencyInputPrefix, parseAmountInput } from '../utils/currencyInput';

const PRESET_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#F43F5E',
  '#F59E0B', '#10B981', '#3B82F6', '#0F172A',
];

const CreditCardFormScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const { currency } = useCurrency();
  const insets = useSafeAreaInsets();

  const editingCard = route.params?.card as CreditCard | undefined;

  const [name, setName] = useState(editingCard?.name || '');
  const [brand, setBrand] = useState(editingCard?.brand || 'visa');
  const [limit, setLimit] = useState(editingCard ? formatAmountInput(editingCard.limit, currency) : '');
  const [closingDay, setClosingDay] = useState(editingCard?.closingDay?.toString() || '');
  const [dueDay, setDueDay] = useState(editingCard?.dueDay?.toString() || '');
  const [color, setColor] = useState(editingCard?.color || '#6366F1');
  const [accountId, setAccountId] = useState(editingCard?.accountId || '');
  const [accounts, setAccounts] = useState<any[]>([]);

  const c = {
    bg: isDarkMode ? '#0D1117' : '#EEF2F7',
    card: isDarkMode ? '#161C27' : '#FFFFFF',
    border: isDarkMode ? '#2D3748' : '#E2E8F0',
    textPrimary: isDarkMode ? '#E2E8F0' : '#1A202C',
    textSecondary: isDarkMode ? '#718096' : '#64748B',
    sectionLabel: isDarkMode ? '#4A5568' : '#94A3B8',
    inputBg: isDarkMode ? '#2D3748' : '#F8FAFC',
  };

  const inputTheme = {
    colors: {
      background: c.inputBg,
      onSurfaceVariant: c.textSecondary,
      primary: color,
      outline: c.border,
      onSurface: c.textPrimary,
    },
  };

  useEffect(() => {
    import('../service/AccountService').then(({ AccountService }) => {
      AccountService.fetchAll().then(activeAccounts => {
        const mapped = activeAccounts.map(acc => {
          let imageSource = acc.logoUrl;
          if (!imageSource && acc.bankCode?.trim()) {
            imageSource = getAccountLogoByCode(acc.bankCode);
          }
          let imageUri = imageSource;
          if (imageSource && typeof imageSource !== 'string') {
            try {
              const RNImage = require('react-native').Image;
              const resolved = RNImage.resolveAssetSource(imageSource);
              if (resolved?.uri) imageUri = resolved.uri;
            } catch { /* ignore */ }
          }
          return { id: acc.id, label: acc.name, value: acc.id, imageUri };
        });
        setAccounts(mapped);
        if (!editingCard && mapped[0]?.id) setAccountId(mapped[0].id);
      });
    });
  }, []);

  const brandOptions = Object.keys(brandLogos).map(key => {
    const imageSource = brandLogos[key];
    let imageUri = imageSource;
    if (imageSource && typeof imageSource !== 'string') {
      try {
        const RNImage = require('react-native').Image;
        const resolved = RNImage.resolveAssetSource(imageSource);
        if (resolved?.uri) imageUri = resolved.uri;
      } catch { /* ignore */ }
    }
    return { id: key, label: key.charAt(0).toUpperCase() + key.slice(1), value: key, imageUri };
  });

  const parsedLimit = parseAmountInput(limit, currency);
  const isInvalid = !name.trim() || parsedLimit == null || !closingDay || !dueDay || !accountId;

  const handleSave = async () => {
    if (isInvalid) { Alert.alert(t('Erro'), t('Preencha todos os campos obrigatórios')); return; }
    try {
      const data = {
        name,
        brand,
        limit: parsedLimit!,
        closingDay: parseInt(closingDay, 10),
        dueDay: parseInt(dueDay, 10),
        color,
        userId: user?.id || '',
        accountId,
      };
      if (editingCard) {
        await CreditCardService.update(editingCard, data);
      } else {
        await CreditCardService.create(data);
      }
      navigation.goBack();
    } catch (error: any) {
      Alert.alert(t('Erro'), error.message || t('Ocorreu um erro ao salvar o cartão'));
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.bg }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Icon source="arrow-left" size={22} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.textPrimary }]}>
          {editingCard ? t('Editar Cartão') : t('Novo Cartão')}
        </Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Nome */}
        <Text style={[styles.sectionLabel, { color: c.sectionLabel }]}>{t('DADOS')}</Text>
        <TextInput
          mode="outlined"
          label={t('Nome do Cartão')}
          value={name}
          onChangeText={setName}
          placeholder={t('Ex: Nubank, Itaú...')}
          theme={inputTheme}
          style={{ backgroundColor: c.inputBg, marginBottom: 10 }}
        />

        {/* Bandeira */}
        <Text style={[styles.sectionLabel, { color: c.sectionLabel }]}>{t('BANDEIRA')}</Text>
        <Select
          items={brandOptions}
          selectedValue={brand}
          onSelect={val => setBrand(val)}
          placeholder={t('Selecione a bandeira')}
          fontColor={c.textPrimary}
          backgroundColor={c.card}
        />

        {/* Conta padrão */}
        <Text style={[styles.sectionLabel, { color: c.sectionLabel }]}>{t('CONTA DE PAGAMENTO')}</Text>
        <Select
          items={accounts}
          selectedValue={accountId}
          onSelect={val => setAccountId(val)}
          placeholder={t('Selecione a conta')}
          fontColor={c.textPrimary}
          backgroundColor={c.card}
        />

        {/* Limite */}
        <Text style={[styles.sectionLabel, { color: c.sectionLabel }]}>{t('LIMITE')}</Text>
        <TextInput
          mode="outlined"
          label={t('Limite')}
          value={limit}
          onChangeText={setLimit}
          placeholder={currency === 'BRL' ? '0,00' : '0.00'}
          keyboardType="numbers-and-punctuation"
          left={<TextInput.Affix text={getCurrencyInputPrefix(currency)} textStyle={{ color: c.textSecondary }} />}
          theme={inputTheme}
          style={{ backgroundColor: c.inputBg }}
        />

        {/* Datas */}
        <Text style={[styles.sectionLabel, { color: c.sectionLabel }]}>{t('DATAS')}</Text>
        <View style={[styles.datesCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.datesRow}>
            <View style={styles.dateField}>
              <View style={[styles.dateIconWrap, { backgroundColor: `${color}18` }]}>
                <Icon source="calendar-arrow-right" size={16} color={color} />
              </View>
              <View style={styles.dateInputWrap}>
                <Text style={[styles.dateLabel, { color: c.sectionLabel }]}>{t('Fechamento')}</Text>
                <TextInput
                  mode="flat"
                  value={closingDay}
                  onChangeText={setClosingDay}
                  keyboardType="numeric"
                  maxLength={2}
                  placeholder={t('Dia')}
                  underlineColor="transparent"
                  activeUnderlineColor={color}
                  textColor={c.textPrimary}
                  style={[styles.dateInput, { backgroundColor: 'transparent' }]}
                  theme={{ colors: { onSurfaceVariant: c.textSecondary } }}
                />
              </View>
            </View>

            <View style={[styles.dateDivider, { backgroundColor: c.border }]} />

            <View style={styles.dateField}>
              <View style={[styles.dateIconWrap, { backgroundColor: '#F59E0B18' }]}>
                <Icon source="calendar-check" size={16} color="#F59E0B" />
              </View>
              <View style={styles.dateInputWrap}>
                <Text style={[styles.dateLabel, { color: c.sectionLabel }]}>{t('Vencimento')}</Text>
                <TextInput
                  mode="flat"
                  value={dueDay}
                  onChangeText={setDueDay}
                  keyboardType="numeric"
                  maxLength={2}
                  placeholder={t('Dia')}
                  underlineColor="transparent"
                  activeUnderlineColor="#F59E0B"
                  textColor={c.textPrimary}
                  style={[styles.dateInput, { backgroundColor: 'transparent' }]}
                  theme={{ colors: { onSurfaceVariant: c.textSecondary } }}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Cor */}
        <Text style={[styles.sectionLabel, { color: c.sectionLabel }]}>{t('COR DO CARTÃO')}</Text>
        <View style={styles.colorRow}>
          {PRESET_COLORS.map(clr => (
            <TouchableOpacity
              key={clr}
              style={[styles.colorSwatch, { backgroundColor: clr }, color === clr && styles.colorSwatchSelected]}
              onPress={() => setColor(clr)}
              activeOpacity={0.8}
            >
              {color === clr && <Icon source="check" size={14} color="#FFFFFF" />}
            </TouchableOpacity>
          ))}
        </View>

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
          disabled={isInvalid}
          style={[styles.saveBtn, { opacity: isInvalid ? 0.45 : 1 }]}
        >
          <LinearGradient
            colors={['#8B5CF6', '#6366F1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveGradient}
          >
            <Icon source="credit-card-outline" size={18} color="#FFFFFF" />
            <Text style={styles.saveBtnText}>
              {editingCard ? t('Salvar alterações') : t('Criar cartão')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default CreditCardFormScreen;

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

  datesCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },

  // Dates
  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  dateDivider: {
    width: StyleSheet.hairlineWidth,
    height: 40,
  },
  dateIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateInputWrap: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  dateInput: {
    fontSize: 16,
    height: 32,
    paddingHorizontal: 0,
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
