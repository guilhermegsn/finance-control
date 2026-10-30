import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TextInput, Icon } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import CreditCardService from '../../service/CreditCardService';
import { AccountService } from '../../service/AccountService';
import { brandLogos } from '../../utils/brandLogos';
import { getAccountLogoByCode } from '../../utils/accountLogos';
import { Select } from '../../components/Select';
import { useCurrency } from '../../contexts/CurrencyContext';
import CurrencyCalculatorInput from '../../components/CurrencyCalculatorInput';

const PRESET_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#F43F5E',
  '#F59E0B', '#10B981', '#3B82F6', '#0F172A',
];

export default function OnboardingCreditCardScreen({ navigation }: any) {
  const { user } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const { currency } = useCurrency();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('visa');
  const [limit, setLimit] = useState<number | null>(null);
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [color, setColor] = useState('#6366F1');
  const [accountId, setAccountId] = useState('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const inputTheme = {
    colors: {
      background: isDarkMode ? '#2D3748' : '#F8FAFC',
      onSurfaceVariant: theme.textSecondary,
      primary: color,
      outline: theme.border,
      onSurface: theme.text,
    },
  };

  useEffect(() => {
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
      if (mapped[0]?.id) setAccountId(mapped[0].id);
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

  const isInvalid = !name.trim() || limit == null || !closingDay || !dueDay || !accountId;

  const handleCreate = async () => {
    if (isInvalid) { Alert.alert('Erro', 'Preencha todos os campos obrigatórios'); return; }
    setSaving(true);
    try {
      await CreditCardService.create({
        name,
        brand,
        limit: limit!,
        closingDay: parseInt(closingDay, 10),
        dueDay: parseInt(dueDay, 10),
        color,
        userId: user?.id || '',
        accountId,
      });
      navigation.navigate('Done');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Ocorreu um erro ao salvar o cartão');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Icon source="arrow-left" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Cartão de crédito</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={[styles.hint, { color: theme.textSecondary }]}>
          Esse passo é opcional. Cadastre um cartão agora ou pule e faça isso depois pelo Menu.
        </Text>

        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>DADOS</Text>
        <TextInput
          mode="outlined"
          label="Nome do Cartão"
          value={name}
          onChangeText={setName}
          placeholder="Ex: Nubank, Itaú..."
          theme={inputTheme}
          style={{ backgroundColor: inputTheme.colors.background, marginBottom: 10 }}
        />

        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>BANDEIRA</Text>
        <Select
          items={brandOptions}
          selectedValue={brand}
          onSelect={val => setBrand(val)}
          placeholder="Selecione a bandeira"
          fontColor={theme.text}
          backgroundColor={theme.card}
        />

        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>CONTA DE PAGAMENTO</Text>
        <Select
          items={accounts}
          selectedValue={accountId}
          onSelect={val => setAccountId(val)}
          placeholder="Selecione a conta"
          fontColor={theme.text}
          backgroundColor={theme.card}
        />

        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>LIMITE</Text>
        <CurrencyCalculatorInput
          label="Limite"
          value={limit}
          onChangeValue={setLimit}
          currency={currency}
          placeholder={currency === 'BRL' ? '0,00' : '0.00'}
          theme={inputTheme}
          style={{ backgroundColor: inputTheme.colors.background }}
        />

        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>DATAS</Text>
        <View style={[styles.datesCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.datesRow}>
            <View style={styles.dateField}>
              <View style={[styles.dateIconWrap, { backgroundColor: `${color}18` }]}>
                <Icon source="calendar-arrow-right" size={16} color={color} />
              </View>
              <View style={styles.dateInputWrap}>
                <Text style={[styles.dateLabel, { color: theme.textSecondary }]}>Fechamento</Text>
                <TextInput
                  mode="flat"
                  value={closingDay}
                  onChangeText={setClosingDay}
                  keyboardType="numeric"
                  maxLength={2}
                  placeholder="Dia"
                  underlineColor="transparent"
                  activeUnderlineColor={color}
                  textColor={theme.text}
                  style={[styles.dateInput, { backgroundColor: 'transparent' }]}
                  theme={{ colors: { onSurfaceVariant: theme.textSecondary } }}
                />
              </View>
            </View>

            <View style={[styles.dateDivider, { backgroundColor: theme.border }]} />

            <View style={styles.dateField}>
              <View style={[styles.dateIconWrap, { backgroundColor: '#F59E0B18' }]}>
                <Icon source="calendar-check" size={16} color="#F59E0B" />
              </View>
              <View style={styles.dateInputWrap}>
                <Text style={[styles.dateLabel, { color: theme.textSecondary }]}>Vencimento</Text>
                <TextInput
                  mode="flat"
                  value={dueDay}
                  onChangeText={setDueDay}
                  keyboardType="numeric"
                  maxLength={2}
                  placeholder="Dia"
                  underlineColor="transparent"
                  activeUnderlineColor="#F59E0B"
                  textColor={theme.text}
                  style={[styles.dateInput, { backgroundColor: 'transparent' }]}
                  theme={{ colors: { onSurfaceVariant: theme.textSecondary } }}
                />
              </View>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>COR DO CARTÃO</Text>
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

      <View style={[styles.footer, { borderTopColor: theme.border, paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.cancelBtn, { borderColor: theme.border, backgroundColor: theme.card }]}
          onPress={() => navigation.navigate('Done')}
        >
          <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Pular</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleCreate}
          disabled={isInvalid || saving}
          style={[styles.saveBtn, { opacity: isInvalid || saving ? 0.45 : 1 }]}
        >
          <LinearGradient
            colors={['#8B5CF6', '#6366F1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveGradient}
          >
            <Icon source="credit-card-outline" size={18} color="#FFFFFF" />
            <Text style={styles.saveBtnText}>Criar cartão</Text>
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
  hint: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 4,
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
