import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, ScrollView, Alert, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { TextInput, Icon } from 'react-native-paper';
import { Select } from '../components/Select';
import { TransactionService } from '../service/TransactionService';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import Category from '../models/Caterogy';
import CreditCard from '../models/CreditCard';
import Transaction from '../models/Transactions';
import { withObservables } from '@nozbe/watermelondb/react';
import CreditCardService from '../service/CreditCardService';
import { Q } from '@nozbe/watermelondb';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface CreditCardPurchaseFormData {
  amount: string;
  description: string;
  date: Date;
  creditCardId: string;
  categoryId: string;
  installments: number;
  interestRate: string;
}

interface CreditCardPurchaseScreenProps {
  creditCards: CreditCard[];
}

function CreditCardPurchaseScreen({ creditCards }: CreditCardPurchaseScreenProps) {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const [activePicker, setActivePicker] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [previewInfo, setPreviewInfo] = useState({ installmentAmount: 0, totalAmount: 0, show: false });

  const { transactionId, categories = [], onSave } = route.params || {};
  const [isEditing, setIsEditing] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);
  const [isInstallmentPurchase, setIsInstallmentPurchase] = useState(false);

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
      primary: '#6366F1',
      outline: c.border,
      onSurface: c.textPrimary,
    },
  };

  const [formData, setFormData] = useState<CreditCardPurchaseFormData>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      amount: '',
      description: '',
      date: today,
      creditCardId: creditCards.length > 0 ? creditCards[0].id : '',
      categoryId: '',
      installments: 1,
      interestRate: '0',
    };
  });

  useEffect(() => {
    const load = async () => {
      if (!transactionId) return;
      try {
        const tx = await TransactionService.findById(transactionId);
        if (tx) {
          setCurrentTransaction(tx);
          setIsEditing(true);
          setIsInstallmentPurchase(await TransactionService.isInstallmentPurchase(tx));
          // @ts-ignore
          const creditCardId = tx._raw?.credit_card_id;
          // @ts-ignore
          const categoryId = tx._raw?.category_id;
          const purchaseDate = tx.purchaseDate || tx.date;
          setFormData({
            amount: tx.amount.toString(),
            description: tx.description.replace(/ \(\d+\/\d+\)$/, ''),
            date: new Date(purchaseDate),
            creditCardId: creditCardId || '',
            categoryId: categoryId || '',
            installments: 1,
            interestRate: '0',
          });
        }
      } catch (error) {
        console.error('Erro ao carregar transação:', error);
      }
    };
    load();
  }, [transactionId]);

  useEffect(() => {
    if (categories.length > 0 && !formData.categoryId) {
      const expenseCats = categories.filter((cat: Category) => cat.type === 'expense');
      if (expenseCats.length > 0) {
        setFormData(prev => ({ ...prev, categoryId: expenseCats[0].id }));
      }
    }
  }, [categories]);

  useEffect(() => {
    const amount = parseFloat(formData.amount.replace(',', '.'));
    const installments = formData.installments;
    const interestRate = parseFloat(formData.interestRate.replace(',', '.')) || 0;

    if (amount > 0 && installments > 1) {
      if (interestRate > 0) {
        const i = interestRate / 100;
        const pmt = amount * i / (1 - Math.pow(1 + i, -installments));
        const total = pmt * installments;
        setPreviewInfo({ installmentAmount: parseFloat(pmt.toFixed(2)), totalAmount: parseFloat(total.toFixed(2)), show: true });
      } else {
        const installmentAmount = amount / installments;
        setPreviewInfo({ installmentAmount: parseFloat(installmentAmount.toFixed(2)), totalAmount: amount, show: true });
      }
    } else {
      setPreviewInfo({ installmentAmount: 0, totalAmount: 0, show: false });
    }
  }, [formData.amount, formData.installments, formData.interestRate]);

  const isInvalidForm = () => {
    const amount = parseFloat(formData.amount.replace(',', '.'));
    return isNaN(amount) || amount <= 0 || !formData.description.trim() || !formData.creditCardId || !formData.categoryId || formData.installments < 1;
  };

  const handleDelete = async () => {
    if (!user || !currentTransaction) return;

    if (isInstallmentPurchase) {
      Alert.alert(
        t('Excluir Compra Parcelada'),
        t('Esta compra faz parte de um parcelamento. Como deseja excluir?'),
        [
          { text: t('Cancelar'), style: 'cancel' },
          {
            text: t('Excluir apenas esta parcela'),
            onPress: async () => {
              try {
                await TransactionService.deleteCreditCardPurchase(currentTransaction.id, 'only_this');
                onSave?.();
                navigation.goBack();
              } catch (error: any) {
                Alert.alert(t('Erro'), error.message || t('Ocorreu um erro ao excluir a parcela.'));
              }
            },
          },
          {
            text: t('Excluir todas as parcelas pendentes'),
            onPress: async () => {
              try {
                await TransactionService.deleteCreditCardPurchase(currentTransaction.id, 'all_pending');
                onSave?.();
                navigation.goBack();
              } catch (error: any) {
                Alert.alert(t('Erro'), error.message || t('Ocorreu um erro ao excluir as parcelas.'));
              }
            },
          },
        ]
      );
    } else {
      Alert.alert(
        t('Confirmar Exclusão'),
        t('Tem certeza que deseja excluir esta compra?'),
        [
          { text: t('Cancelar'), style: 'cancel' },
          {
            text: t('Excluir'),
            onPress: async () => {
              try {
                await TransactionService.deleteCreditCardPurchase(currentTransaction.id, 'only_this');
                onSave?.();
                navigation.goBack();
              } catch (error: any) {
                Alert.alert(t('Erro'), error.message || t('Ocorreu um erro ao excluir a compra.'));
              }
            },
          },
        ]
      );
    }
  };

  const handleSave = async () => {
    if (!user) return;
    const amount = parseFloat(formData.amount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) { Alert.alert(t('Erro'), t('Valor inválido')); return; }
    const interestRate = parseFloat(formData.interestRate.replace(',', '.')) || 0;
    if (interestRate < 0) { Alert.alert(t('Erro'), t('Taxa de juros não pode ser negativa')); return; }

    setCalculating(true);
    try {
      if (isEditing && currentTransaction) {
        if (isInstallmentPurchase) {
          Alert.alert(
            t('Editar Compra Parcelada'),
            t('Esta compra faz parte de um parcelamento. Como deseja editar?'),
            [
              { text: t('Cancelar'), style: 'cancel', onPress: () => setCalculating(false) },
              {
                text: t('Editar apenas esta parcela'),
                onPress: async () => {
                  try {
                    await TransactionService.updateCreditCardPurchase(currentTransaction.id, 'only_this', { amount, description: formData.description, date: formData.date, creditCardId: formData.creditCardId, categoryId: formData.categoryId, installments: formData.installments, interestRate, userId: user.id });
                    onSave?.(); navigation.goBack();
                  } catch (error: any) { Alert.alert(t('Erro'), error.message); setCalculating(false); }
                },
              },
              {
                text: t('Editar todas as parcelas pendentes'),
                onPress: async () => {
                  try {
                    await TransactionService.updateCreditCardPurchase(currentTransaction.id, 'all_pending', { amount, description: formData.description, date: formData.date, creditCardId: formData.creditCardId, categoryId: formData.categoryId, installments: formData.installments, interestRate, userId: user.id });
                    onSave?.(); navigation.goBack();
                  } catch (error: any) { Alert.alert(t('Erro'), error.message); setCalculating(false); }
                },
              },
            ]
          );
          return;
        } else {
          await TransactionService.updateCreditCardPurchase(currentTransaction.id, 'only_this', { amount, description: formData.description, date: formData.date, creditCardId: formData.creditCardId, categoryId: formData.categoryId, installments: formData.installments, interestRate, userId: user.id });
          onSave?.(); navigation.goBack();
        }
      } else {
        await TransactionService.createCreditCardPurchase({ amount, description: formData.description, date: formData.date, creditCardId: formData.creditCardId, categoryId: formData.categoryId, installments: formData.installments, interestRate, userId: user.id });
        onSave?.(); navigation.goBack();
      }
    } catch (error: any) {
      Alert.alert(t('Erro'), error.message || t('Ocorreu um erro ao salvar a compra no cartão.'));
    } finally {
      setCalculating(false);
    }
  };

  const installmentOptions = Array.from({ length: 12 }, (_, i) => ({
    id: (i + 1).toString(),
    label: `${i + 1}x — ${i === 0 ? t('à vista') : t('parcelado')}`,
    value: (i + 1).toString(),
  }));

  const cardItems = creditCards.map((card: CreditCard) => ({
    id: card.id,
    label: card.name,
    value: card.id,
    imageUri: null as null,
  }));

  const categoryItems = categories
    .filter((cat: Category) => cat.type === 'expense')
    .map((cat: Category) => {
      const label = t(`categories:${cat.name}`);
      return { id: cat.id, label: label.includes('categories:') ? cat.name : label, value: cat.id, icon: cat.icon };
    });

  return (
    <View style={[styles.root, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.bg }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Icon source="arrow-left" size={22} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.textPrimary }]}>
          {isEditing ? t('Editar Compra') : t('Lançar Compra')}
        </Text>
        {isEditing && currentTransaction && !currentTransaction.isConsolidated ? (
          <TouchableOpacity style={styles.headerBtn} onPress={handleDelete}>
            <Icon source="trash-can-outline" size={22} color="#F43F5E" />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerBtn} />
        )}
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

        {/* Descrição + Valor */}
        <Text style={[styles.sectionLabel, { color: c.sectionLabel }]}>{t('DETALHES')}</Text>
        <TextInput
          mode="outlined"
          label={t('Descrição')}
          value={formData.description}
          onChangeText={text => setFormData(prev => ({ ...prev, description: text }))}
          placeholder={t('Descrição da compra')}
          theme={inputTheme}
          style={[styles.input, { backgroundColor: c.card }]}
        />
        <TextInput
          mode="outlined"
          label={t('Valor Original')}
          value={formData.amount}
          onChangeText={text => setFormData(prev => ({ ...prev, amount: text }))}
          placeholder={i18n.language.startsWith('en') ? '0.00' : '0,00'}
          keyboardType="numeric"
          left={<TextInput.Affix text={i18n.language.startsWith('en') ? '$ ' : 'R$ '} textStyle={{ color: c.textSecondary }} />}
          theme={inputTheme}
          style={[styles.input, { backgroundColor: c.card }]}
        />

        {/* Data */}
        <Text style={[styles.sectionLabel, { color: c.sectionLabel }]}>{t('DATA DA COMPRA')}</Text>
        <TouchableOpacity
          style={[styles.dateBtn, { backgroundColor: c.card, borderColor: c.border }]}
          onPress={() => setActivePicker(true)}
          activeOpacity={0.7}
        >
          <Icon source="calendar" size={18} color="#6366F1" />
          <Text style={[styles.dateBtnText, { color: c.textPrimary }]}>
            {formData.date.toLocaleDateString(i18n.language.startsWith('en') ? 'en-US' : 'pt-BR')}
          </Text>
          <Icon source="chevron-right" size={16} color={c.sectionLabel} />
        </TouchableOpacity>

        {/* Cartão & Categoria */}
        <Text style={[styles.sectionLabel, { color: c.sectionLabel }]}>{t('CARTÃO & CATEGORIA')}</Text>
        <View style={[styles.sectionCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.selectRow}>
            <Text style={[styles.selectLabel, { color: c.textSecondary }]}>{t('Cartão')}</Text>
            <View style={styles.selectWrap}>
              <Select
                items={cardItems}
                selectedValue={formData.creditCardId}
                onSelect={value => setFormData(prev => ({ ...prev, creditCardId: value }))}
                placeholder={t('Selecionar cartão')}
                fontColor={c.textPrimary}
              />
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: c.border }]} />
          <View style={styles.selectRow}>
            <Text style={[styles.selectLabel, { color: c.textSecondary }]}>{t('Categoria')}</Text>
            <View style={styles.selectWrap}>
              <Select
                items={categoryItems}
                selectedValue={formData.categoryId}
                onSelect={value => setFormData(prev => ({ ...prev, categoryId: value }))}
                placeholder={categories.length === 0 ? t('Carregando...') : t('Selecione')}
                fontColor={c.textPrimary}
              />
            </View>
          </View>
        </View>

        {/* Parcelamento */}
        <Text style={[styles.sectionLabel, { color: c.sectionLabel }]}>{t('PARCELAMENTO')}</Text>
        <View style={[styles.sectionCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.selectRow}>
            <Text style={[styles.selectLabel, { color: c.textSecondary }]}>{t('Parcelas')}</Text>
            <View style={styles.selectWrap}>
              <Select
                items={installmentOptions}
                selectedValue={formData.installments.toString()}
                onSelect={value => setFormData(prev => ({ ...prev, installments: parseInt(value) }))}
                placeholder={t('Selecione')}
                fontColor={c.textPrimary}
              />
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: c.border }]} />
          <View style={styles.selectRow}>
            <Text style={[styles.selectLabel, { color: c.textSecondary }]}>{t('Juros a.m.')}</Text>
            <View style={styles.selectWrap}>
              <TextInput
                mode="flat"
                value={formData.interestRate}
                onChangeText={text => setFormData(prev => ({ ...prev, interestRate: text }))}
                placeholder="0"
                keyboardType="numeric"
                right={<TextInput.Affix text="%" textStyle={{ color: c.textSecondary }} />}
                theme={{ colors: { background: 'transparent', onSurfaceVariant: c.textSecondary, primary: '#6366F1', onSurface: c.textPrimary } }}
                underlineColor="transparent"
                activeUnderlineColor="#6366F1"
                style={{ backgroundColor: 'transparent', height: 44 }}
              />
            </View>
          </View>
        </View>

        {/* Preview de parcelamento */}
        {previewInfo.show && (
          <>
            <Text style={[styles.sectionLabel, { color: c.sectionLabel }]}>{t('RESUMO DO PARCELAMENTO')}</Text>
            <View style={[styles.previewCard, { backgroundColor: c.card, borderColor: c.border }]}>
              <View style={styles.previewRow}>
                <Text style={[styles.previewLabel, { color: c.textSecondary }]}>{t('Valor por parcela')}</Text>
                <Text style={[styles.previewValue, { color: c.textPrimary }]}>
                  {i18n.language.startsWith('en') ? '$' : 'R$'} {previewInfo.installmentAmount.toLocaleString(i18n.language.startsWith('en') ? 'en-US' : 'pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={[styles.divider, { backgroundColor: c.border, marginLeft: 0 }]} />
              <View style={styles.previewRow}>
                <Text style={[styles.previewLabel, { color: c.textSecondary }]}>{t('Número de parcelas')}</Text>
                <Text style={[styles.previewValue, { color: c.textPrimary }]}>{formData.installments}x</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: c.border, marginLeft: 0 }]} />
              <View style={styles.previewRow}>
                <Text style={[styles.previewLabel, { color: c.textSecondary, fontWeight: '700' }]}>{t('Total final')}</Text>
                <Text style={[styles.previewValue, { color: '#F43F5E', fontWeight: '700' }]}>
                  {i18n.language.startsWith('en') ? '$' : 'R$'} {previewInfo.totalAmount.toLocaleString(i18n.language.startsWith('en') ? 'en-US' : 'pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            </View>
          </>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: c.bg, borderTopColor: c.border, paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.cancelBtn, { borderColor: c.border, backgroundColor: c.card }]}
          onPress={() => navigation.goBack()}
          disabled={calculating}
        >
          <Text style={[styles.cancelBtnText, { color: c.textSecondary }]}>{t('Cancelar')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSave}
          disabled={isInvalidForm() || calculating}
          style={[styles.saveBtn, { opacity: isInvalidForm() || calculating ? 0.45 : 1 }]}
        >
          <LinearGradient
            colors={['#8B5CF6', '#6366F1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveGradient}
          >
            <Icon source="credit-card-outline" size={16} color="#FFFFFF" />
            <Text style={styles.saveBtnText}>
              {calculating ? t('Salvando...') : isEditing ? t('Atualizar') : t('Lançar Compra')}
            </Text>
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

  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },

  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  selectLabel: {
    fontSize: 13,
    fontWeight: '500',
    width: 80,
  },
  selectWrap: {
    flex: 1,
  },

  previewCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  previewLabel: {
    fontSize: 14,
  },
  previewValue: {
    fontSize: 14,
    fontWeight: '600',
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

// ---

const CreditCardPurchaseScreenWrapper = () => {
  const { user } = useAuth();

  const ScreenWithData = withObservables(['userId'], ({ userId }: { userId: string }) => ({
    creditCards: userId
      ? CreditCardService.getCollection().query(
        Q.where('user_id', userId),
        Q.where('deleted_at', null)
      ).observe()
      : [],
  }))(CreditCardPurchaseScreen);

  return <ScreenWithData userId={user?.id || ''} />;
};

export default CreditCardPurchaseScreenWrapper;
