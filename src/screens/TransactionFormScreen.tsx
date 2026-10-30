import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, TouchableOpacity, ScrollView, StyleSheet, Text } from 'react-native';
import { TextInput, Switch, Portal, Dialog, Button, Icon, RadioButton } from 'react-native-paper';
import { Select } from '../components/Select';
import { TransactionService } from '../service/TransactionService';
import NotificationService from '../service/NotificationService';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import Account from '../models/Accounts';
import Category from '../models/Caterogy';
import { getAccountLogoByCode } from '../utils/accountLogos';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCurrency } from '../contexts/CurrencyContext';
import { formatAmountInput, getCurrencyInputPrefix, maskAmountInput, parseAmountInput } from '../utils/currencyInput';

interface FormData {
  id: string;
  description: string;
  value: string;
  date: Date;
  type: 'income' | 'expense' | null;
  isRecurring: boolean;
  recurringEndDate?: Date | null;
  isConsolidated: boolean;
  notify: boolean;
  accountId: string;
  categoryId: string;
}

export default function TransactionFormScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const { currency } = useCurrency();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const [recurringDialogVisible, setRecurringDialogVisible] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [recurringDeleteDialogVisible, setRecurringDeleteDialogVisible] = useState(false);
  const [recurringDeleteMode, setRecurringDeleteMode] = useState<'only_this' | 'all_future'>('only_this');
  const [pendingUpdateData, setPendingUpdateData] = useState<any>(null);
  const [activePicker, setActivePicker] = useState<'date' | 'recurringEndDate' | null>(null);
  const { transaction, initialType, accounts = [], categories = [], onSave } = route.params || {};

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

  const [formData, setFormData] = useState<FormData>(() => {
    if (transaction) {
      return {
        id: transaction.id,
        description: transaction.description,
        value: formatAmountInput(transaction.amount, currency),
        date: new Date(transaction.date),
        type: transaction.type,
        isRecurring: false,
        recurringEndDate: null,
        isConsolidated: transaction.isConsolidated,
        notify: false,
        accountId: transaction.accountId || '',
        categoryId: transaction.categoryId || '',
      };
    }
    const now = new Date();
    return {
      id: '',
      description: '',
      value: '',
      date: now,
      type: initialType || null,
      isRecurring: false,
      recurringEndDate: null,
      isConsolidated: true,
      notify: false,
      accountId: accounts.length > 0 ? accounts[0].id : '',
      categoryId: categories.length > 0 ? categories[0].id : '',
    };
  });

  // Para edição: verifica se já existe notificação agendada para esta transação
  useEffect(() => {
    if (!transaction?.id) return;
    NotificationService.isTransactionNotificationScheduled(transaction.id).then((scheduled) => {
      if (scheduled) setFormData(prev => ({ ...prev, notify: true }));
    });
  }, [transaction?.id]);


  useEffect(() => {
    if (formData.date && formData.date.getTime() > Date.now()) {
      setFormData(prevData => ({
        ...prevData,
        isConsolidated: false
      }))
    }
  },[formData?.date])

    useEffect(() => {
    if (formData.isRecurring) {
      setFormData(prevData => ({
        ...prevData,
        isConsolidated: false
      }))
    }
  },[formData?.isRecurring, formData.isConsolidated])



  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate && activePicker) {
      if (activePicker === 'date') {
        setFormData(prev => ({ ...prev, date: selectedDate }));
      } else {
        setFormData(prev => ({ ...prev, recurringEndDate: selectedDate }));
      }
    }
    setActivePicker(null);
  };

  const isInvalidForm = () =>
    !formData.description.trim() || parseAmountInput(formData.value, currency) == null || !formData.type || !formData.date;

  const handleSave = async () => {
    if (!user || !formData.type) return;
    const amount = parseAmountInput(formData.value, currency);
    if (amount == null) return;

    const filteredCategories = categories.filter((cat: Category) => cat.type === formData.type);
    const categoryId = formData.categoryId ||
      (filteredCategories.length > 0 ? filteredCategories[0].id :
        (categories.length > 0 ? categories[0].id : ''));

    const transactionData = {
      accountId: formData.accountId || (accounts.length > 0 ? accounts[0].id : ''),
      categoryId,
      description: formData.description,
      amount,
      type: formData.type,
      date: formData.date,
      userId: user.id,
      isConsolidated: formData.isConsolidated,
      isRecurring: formData.isRecurring || false,
      recurringEndDate: formData.isRecurring ? formData.recurringEndDate || undefined : undefined,
    };

    try {
      if (transaction) {
        if (transaction.isRecurring) {
          setPendingUpdateData(transactionData);
          setRecurringDialogVisible(true);
        } else {
          await TransactionService.update(transaction.id, {
            accountId: transactionData.accountId,
            categoryId: transactionData.categoryId,
            description: transactionData.description,
            amount: transactionData.amount,
            type: transactionData.type,
            date: transactionData.date,
            isConsolidated: transactionData.isConsolidated,
          });
          if (formData.notify && !formData.isConsolidated) {
            await NotificationService.scheduleTransactionNotification(
              transaction.id, formData.description, formData.date, formData.type!
            );
          } else {
            await NotificationService.cancelTransactionNotification(transaction.id);
          }
          onSave?.();
          navigation.goBack();
        }
      } else {
        const created = await TransactionService.create(transactionData);
        if (created && formData.notify && !formData.isConsolidated) {
          await NotificationService.scheduleTransactionNotification(
            created.id, formData.description, formData.date, formData.type!
          );
        }
        onSave?.();
        navigation.goBack();
      }
    } catch (error) {
      console.error('Erro ao salvar transação:', error);
    }
  };

  const handleRecurringAction = async (mode: 'only_this' | 'all_future') => {
    if (!transaction || !pendingUpdateData) return;
    try {
      await TransactionService.updateRecurring(transaction.id, mode, pendingUpdateData);
      setRecurringDialogVisible(false);
      onSave?.();
      navigation.goBack();
    } catch (error) {
      console.error('Erro ao atualizar transação recorrente:', error);
    }
  };

  const handleDelete = async () => {
    if (!transaction) return;
    if (transaction.isRecurring) {
      setDeleteDialogVisible(false);
      setRecurringDeleteMode('only_this');
      setRecurringDeleteDialogVisible(true);
    } else {
      try {
        await TransactionService.delete(transaction.id);
        setDeleteDialogVisible(false);
        onSave?.();
        navigation.goBack();
      } catch (error) {
        console.error(error);
      }
    }
  };

  const confirmDelete = () => {
    setDeleteDialogVisible(true);
  };

  const deleteRecurring = async (mode: 'only_this' | 'all_future') => {
    if (!transaction) return;
    try {
      if (mode === 'all_future') {
        const recurringId = (transaction as any).recurringId || '';
        await TransactionService.deleteRecurring(transaction.id, recurringId, transaction.date, mode);
      } else {
        await TransactionService.delete(transaction.id);
      }
      setRecurringDeleteDialogVisible(false);
      onSave?.();
      navigation.goBack();
    } catch (error) {
      console.error(error);
    }
  };

  const accountItems = accounts.map((account: Account) => {
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

  const categoryItems = categories
    .filter((cat: Category) => !formData.type || cat.type === formData.type)
    .map((cat: Category) => ({
      id: cat.id,
      label: t(`categories:${cat.name}`),
      value: cat.id,
      icon: cat.icon,
    }));

  return (
    <View style={[styles.root, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.bg }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Icon source="arrow-left" size={22} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.textPrimary }]}>
          {transaction ? t('Editar Transação') : t('Nova Transação')}
        </Text>
        {transaction ? (
          <TouchableOpacity style={styles.headerBtn} onPress={confirmDelete}>
            <Icon source="trash-can-outline" size={22} color="#F43F5E" />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerBtn} />
        )}
      </View>

      {activePicker && (
        <DateTimePicker
          value={activePicker === 'date' ? formData.date : (formData.recurringEndDate || new Date())}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Type toggle */}
        <Text style={[styles.sectionLabel, { color: c.sectionLabel }]}>{t('TIPO')}</Text>
        <View style={[styles.typeRow, { backgroundColor: c.card, borderColor: c.border }]}>
          <TouchableOpacity
            style={[
              styles.typeBtn,
              formData.type === 'income' && styles.typeBtnActiveIncome,
            ]}
            onPress={() => setFormData(prev => ({ ...prev, type: 'income' }))}
            activeOpacity={0.8}
          >
            <Icon
              source="arrow-down-circle"
              size={16}
              color={formData.type === 'income' ? '#FFF' : c.textSecondary}
            />
            <Text style={[
              styles.typeBtnText,
              { color: formData.type === 'income' ? '#FFF' : c.textSecondary },
            ]}>
              {t('Entrada')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeBtn,
              formData.type === 'expense' && styles.typeBtnActiveExpense,
            ]}
            onPress={() => setFormData(prev => ({ ...prev, type: 'expense' }))}
            activeOpacity={0.8}
          >
            <Icon
              source="arrow-up-circle"
              size={16}
              color={formData.type === 'expense' ? '#FFF' : c.textSecondary}
            />
            <Text style={[
              styles.typeBtnText,
              { color: formData.type === 'expense' ? '#FFF' : c.textSecondary },
            ]}>
              {t('Saída')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Descrição + Valor */}
        <Text style={[styles.sectionLabel, { color: c.sectionLabel }]}>{t('DETALHES')}</Text>
        <TextInput
          mode="outlined"
          label={t('Descrição')}
          value={formData.description}
          onChangeText={text => setFormData(prev => ({ ...prev, description: text }))}
          placeholder={t('Salário, Aluguel, Supermercado')}
          theme={inputTheme}
          style={[styles.input, { backgroundColor: c.card }]}
        />
        <TextInput
          mode="outlined"
          label={t('Valor')}
          value={formData.value}
          onChangeText={text => setFormData(prev => ({ ...prev, value: maskAmountInput(text, currency) }))}
          placeholder={currency === 'BRL' ? '0,00' : '0.00'}
          keyboardType="numeric"
          left={<TextInput.Affix text={getCurrencyInputPrefix(currency)} textStyle={{ color: c.textSecondary }} />}
          theme={inputTheme}
          style={[styles.input, { backgroundColor: c.card }]}
        />

        {/* Data */}
        <Text style={[styles.sectionLabel, { color: c.sectionLabel }]}>{t('DATA')}</Text>
        <TouchableOpacity
          style={[styles.dateBtn, { backgroundColor: c.card, borderColor: c.border }]}
          onPress={() => setActivePicker('date')}
          activeOpacity={0.7}
        >
          <Icon source="calendar" size={18} color="#6366F1" />
          <Text style={[styles.dateBtnText, { color: c.textPrimary }]}>
            {formData.date.toLocaleDateString('pt-BR')}
          </Text>
          <Icon source="chevron-right" size={16} color={c.sectionLabel} />
        </TouchableOpacity>

        {/* Conta & Categoria */}
        <Text style={[styles.sectionLabel, { color: c.sectionLabel }]}>{t('CONTA & CATEGORIA')}</Text>
        <View style={[styles.sectionCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.selectRow}>
            <Text style={[styles.selectLabel, { color: c.textSecondary }]}>{t('Conta')}</Text>
            <View style={styles.selectWrap}>
              <Select
                items={accountItems}
                selectedValue={formData.accountId}
                onSelect={value => setFormData(prev => ({ ...prev, accountId: value }))}
                placeholder={t('Selecionar conta')}
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
                placeholder={t('Selecione')}
                fontColor={c.textPrimary}
              />
            </View>
          </View>
        </View>

        {/* Opções */}
        <Text style={[styles.sectionLabel, { color: c.sectionLabel }]}>{t('OPÇÕES')}</Text>
        <View style={[styles.sectionCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.toggleRow}>
            <View style={[styles.toggleIconPill, { backgroundColor: '#10B98118' }]}>
              <Icon source="check-circle-outline" size={16} color="#10B981" />
            </View>
            <View style={styles.toggleTextWrap}>
              <Text style={[styles.toggleLabel, { color: c.textPrimary }]}>{t('Efetivado / Pago')}</Text>
              <Text style={[styles.toggleHint, { color: c.textSecondary }]}>
                {formData.isConsolidated ? t('Transação já efetivada') : t('Transação pendente')}
              </Text>
            </View>
            <Switch
              value={formData.isConsolidated}
              onValueChange={value => setFormData(prev => ({ ...prev, isConsolidated: value }))}
              trackColor={{ false: '#CBD5E1', true: '#10B981' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {!formData.isConsolidated && !formData.isRecurring && (
            <>
              <View style={[styles.divider, { backgroundColor: c.border }]} />
              <View style={styles.toggleRow}>
                <View style={[styles.toggleIconPill, { backgroundColor: '#F59E0B18' }]}>
                  <Icon source="bell-outline" size={16} color="#F59E0B" />
                </View>
                <View style={styles.toggleTextWrap}>
                  <Text style={[styles.toggleLabel, { color: c.textPrimary }]}>{t('Notificar')}</Text>
                  <Text style={[styles.toggleHint, { color: c.textSecondary }]}>
                    {formData.notify ? t('Aviso no dia da transação') : t('Sem notificação')}
                  </Text>
                </View>
                <Switch
                  value={formData.notify}
                  onValueChange={value => setFormData(prev => ({ ...prev, notify: value }))}
                  trackColor={{ false: '#CBD5E1', true: '#F59E0B' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </>
          )}

          <View style={[styles.divider, { backgroundColor: c.border }]} />

          <View style={styles.toggleRow}>
            <View style={[styles.toggleIconPill, { backgroundColor: '#6366F118' }]}>
              <Icon source="repeat" size={16} color="#6366F1" />
            </View>
            <View style={styles.toggleTextWrap}>
              <Text style={[styles.toggleLabel, { color: c.textPrimary }]}>{t('Recorrência')}</Text>
              <Text style={[styles.toggleHint, { color: c.textSecondary }]}>
                {formData.isRecurring ? t('Ativa') : t('Desativada')}
              </Text>
            </View>
            <Switch
              value={formData.isRecurring}
              onValueChange={value => setFormData(prev => ({ ...prev, isRecurring: value }))}
              disabled={!!transaction}
              trackColor={{ false: '#CBD5E1', true: '#6366F1' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Data final da recorrência */}
        {formData.isRecurring && (
          <>
            <Text style={[styles.sectionLabel, { color: c.sectionLabel }]}>
              {t('DATA FINAL DA RECORRÊNCIA')}
            </Text>
            <TouchableOpacity
              style={[styles.dateBtn, { backgroundColor: c.card, borderColor: c.border }]}
              onPress={() => setActivePicker('recurringEndDate')}
              activeOpacity={0.7}
            >
              <Icon source="calendar-end" size={18} color="#6366F1" />
              <Text style={[styles.dateBtnText, { color: c.textPrimary }]}>
                {formData.recurringEndDate
                  ? formData.recurringEndDate.toLocaleDateString('pt-BR')
                  : t('Sem data final (2 anos)')}
              </Text>
              <Icon source="chevron-right" size={16} color={c.sectionLabel} />
            </TouchableOpacity>
          </>
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
            colors={['#4F46E5', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveGradient}
          >
            <Text style={styles.saveBtnText}>
              {transaction ? t('Atualizar') : t('Salvar')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>{t('Confirmação')}</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: c.textPrimary }}>{t('Confirma a exclusão do registro?')}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>{t('Não')}</Button>
            <Button onPress={handleDelete} mode="contained" buttonColor="#F43F5E">{t('Sim')}</Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={recurringDeleteDialogVisible} onDismiss={() => setRecurringDeleteDialogVisible(false)}>
          <Dialog.Title>{t('Esta é uma transação recorrente. O que deseja excluir?')}</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group
              onValueChange={(value) => setRecurringDeleteMode(value as 'only_this' | 'all_future')}
              value={recurringDeleteMode}
            >
              <RadioButton.Item label={t('Apenas esta ocorrência')} value="only_this" />
              <RadioButton.Item label={t('Esta e todas as futuras')} value="all_future" />
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRecurringDeleteDialogVisible(false)}>{t('Cancelar')}</Button>
            <Button onPress={() => deleteRecurring(recurringDeleteMode)} mode="contained" buttonColor="#F43F5E">{t('Confirmar Exclusão')}</Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={recurringDialogVisible} onDismiss={() => setRecurringDialogVisible(false)}>
          <Dialog.Title>{t('Editar Transação Recorrente')}</Dialog.Title>
          <Dialog.Content>
            <Button>{t('Deseja alterar apenas esta transação ou também as próximas?')}</Button>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRecurringDialogVisible(false)}>{t('Cancelar')}</Button>
            <Button onPress={() => handleRecurringAction('only_this')} mode="contained" style={{ marginRight: 8 }}>
              {t('Apenas esta')}
            </Button>
            <Button onPress={() => handleRecurringAction('all_future')} mode="contained">
              {t('Esta e as próximas')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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

  // Type toggle
  typeRow: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    gap: 7,
  },
  typeBtnActiveIncome: {
    backgroundColor: '#10B981',
  },
  typeBtnActiveExpense: {
    backgroundColor: '#F43F5E',
  },
  typeBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // TextInput
  input: {
    marginBottom: 10,
  },

  // Date button
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

  // Section card
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },

  // Select row inside card
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

  // Toggle row
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  toggleIconPill: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  toggleTextWrap: { flex: 1 },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  toggleHint: {
    fontSize: 12,
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
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
