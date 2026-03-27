import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Button, TextInput, Switch, HelperText, Text, Icon, Portal, Dialog } from 'react-native-paper';
import { Select } from '../components/Select';
import { TransactionService } from '../service/TransactionService';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import Account from '../models/Accounts';
import Category from '../models/Caterogy';
import { getAccountLogoByCode } from '../utils/accountLogos';

interface FormData {
  id: string;
  description: string;
  value: string;
  date: Date;
  type: 'income' | 'expense' | null;
  isRecurring: boolean;
  recurringEndDate?: Date | null;
  isConsolidated: boolean;
  accountId: string;
  categoryId: string;
}

export default function TransactionFormScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [recurringDialogVisible, setRecurringDialogVisible] = useState(false);
  const [pendingUpdateData, setPendingUpdateData] = useState<any>(null);
  const [activePicker, setActivePicker] = useState<'date' | 'recurringEndDate' | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { transaction, initialType, accounts = [], categories = [], onSave } = route.params || {};

  const [formData, setFormData] = useState<FormData>(() => {
    if (transaction) {
      return {
        id: transaction.id,
        description: transaction.description,
        value: transaction.amount.toString(),
        date: new Date(transaction.date),
        type: transaction.type,
        isRecurring: false,
        recurringEndDate: null,
        isConsolidated: transaction.isConsolidated,
        accountId: transaction.accountId || '',
        categoryId: transaction.categoryId || '',
      };
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const newDate = new Date();
      return {
        id: '',
        description: '',
        value: '',
        date: newDate,
        type: initialType || null,
        isRecurring: false,
        recurringEndDate: null,
        isConsolidated: newDate <= today,
        accountId: accounts.length > 0 ? accounts[0].id : '',
        categoryId: categories.length > 0 ? categories[0].id : '',
      };
    }
  });



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

  const isInvalidForm = () => {
    return !formData.description.trim() || !formData.value.trim() || !formData.type || !formData.date;
  };

  const handleSave = async () => {
    if (!user || !formData.type) return;

    const amount = parseFloat(formData.value);
    if (isNaN(amount)) return;

    // Usar categoria selecionada ou primeira categoria do tipo correto
    const filteredCategories = categories.filter((cat: Category) => cat.type === formData.type);
    const categoryId = formData.categoryId ||
      (filteredCategories.length > 0 ? filteredCategories[0].id :
        (categories.length > 0 ? categories[0].id : ''));

    const transactionData = {
      accountId: formData.accountId || (accounts.length > 0 ? accounts[0].id : ''),
      categoryId: categoryId,
      description: formData.description,
      amount: amount,
      type: formData.type,
      date: formData.date,
      userId: user.id,
      isConsolidated: formData.isConsolidated,
      isRecurring: formData.isRecurring || false,
      recurringEndDate: formData.isRecurring ? formData.recurringEndDate || undefined : undefined,
    };

    console.log('handleSave - transactionData:', transactionData);
    console.log('Transação original:', transaction);

    try {
      if (transaction) {
        // Verificar se é uma transação recorrente
        if (transaction.isRecurring) {
          console.log('Transação recorrente detectada, abrindo diálogo');
          // Em vez de navegar, salvamos os dados temporariamente e abrimos o popup
          setPendingUpdateData(transactionData);
          setRecurringDialogVisible(true);
        } else {
          const updateData = {
            accountId: transactionData.accountId,
            categoryId: transactionData.categoryId,
            description: transactionData.description,
            amount: transactionData.amount,
            type: transactionData.type,
            date: transactionData.date,
            isConsolidated: transactionData.isConsolidated,
          };
          console.log('Atualizando transação não recorrente:', updateData);
          await TransactionService.update(transaction.id, updateData);
          onSave?.();
          navigation.goBack();
        }
      } else {
        console.log('Criando nova transação');
        await TransactionService.create(transactionData);
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
      onSave?.(); // Atualiza a tela anterior se necessário
      navigation.goBack();
    } catch (error) {
      console.error('Erro ao atualizar transação recorrente:', error);
    }
  };

  const handleDelete = async () => {
    if (!transaction) return;

    if (transaction.isRecurring) {
      // Extrair apenas dados simples para evitar referências circulares
      Alert.alert(
        t('Esta é uma transação recorrente. O que deseja excluir?'),
        '',
        [
          {
            text: t('Cancelar'),
            style: 'cancel',
          },
          {
            text: t('Esta e todas as futuras'),
            onPress: async () => {
              try {
                // Usar type assertion para acessar recurringId que pode não estar na interface TypeScript
                const recurringId = (transaction as any).recurringId || '';
                await TransactionService.deleteRecurring(transaction.id, recurringId, transaction.date, 'all_future');
                onSave?.();
                navigation.goBack();
              } catch (error) {
                console.error('Erro ao excluir transações recorrentes:', error);
              }
            },
          },
          {
            text: t('Apenas esta ocorrência'),
            onPress: async () => {
              try {
                await TransactionService.delete(transaction.id);
                onSave?.();
                navigation.goBack();
              } catch (error) {
                console.error('Erro ao excluir transação:', error);
              }
            },
          },


        ],
        { cancelable: true }
      );
    } else {
      try {
        await TransactionService.delete(transaction.id);
        onSave?.();
        navigation.goBack();
      } catch (error) {
        console.error('Erro ao excluir transação:', error);
      }
    }
  };


  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, padding: 20 }}>
        {activePicker && (
          <DateTimePicker
            value={activePicker === 'date' ? formData.date : (formData.recurringEndDate || new Date())}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold' }}>
            {transaction ? t('Editar Transação') : t('Nova Transação')}
          </Text>
        </View>

        {/* Tipo e Data */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
          <View style={{ flex: 1, marginHorizontal: 4 }}>

            <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>{t('Tipo')}</Text>
            <Select
              backgroundColor={formData.type === 'income' ? '#2E9E57' : '#CC4A4A'}
              fontColor='#ffff'
              selectedValue={formData.type || ''}
              onSelect={(value) => setFormData((prev: any) => ({ ...prev, type: value }))}
              items={[
                {
                  id: 'income',
                  label: t('Entrada'),
                  value: 'income',
                  icon: 'arrow-down-circle'
                },
                {
                  id: 'expense',
                  label: t('account:Saída'),
                  value: 'expense',
                  icon: 'arrow-up-circle'
                }]}
            />

          </View>

          <View style={{ flex: 1, marginHorizontal: 4 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>{t('Data')}</Text>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#ddd',
                gap: 8,
              }}
              onPress={() => setActivePicker('date')}
            >
              <Icon source="calendar" size={16} />
              <Text style={{ fontSize: 14 }}>
                {formData.date.toLocaleDateString('pt-BR')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Conta e Categoria */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
          <View style={{ flex: 1, marginHorizontal: 4 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>{t('Conta')}</Text>
            <Select
              items={accounts.map((account: Account) => {
                // Resolvendo a imagem da conta
                let imageSource = account.logoUrl;
                if (!imageSource && account.bankCode && account.bankCode.trim() !== '') {
                  // Usar o novo accountLogos para obter a imagem pelo código do banco
                  imageSource = getAccountLogoByCode(account.bankCode);
                }
                // Converter require() para URI se necessário
                let imageUri = imageSource;
                if (imageSource && typeof imageSource !== 'string') {
                  // Se for um objeto require(), tentar extrair a URI
                  try {
                    const Image = require('react-native').Image;
                    const resolvedSource = Image.resolveAssetSource(imageSource);
                    if (resolvedSource && resolvedSource.uri) {
                      imageUri = resolvedSource.uri;
                    }
                  } catch (error) {
                    console.warn('Erro ao resolver imagem:', error);
                  }
                }
                return {
                  id: account.id,
                  label: account.name,
                  value: account.id,
                  imageUri: imageUri
                };
              })}
              selectedValue={formData.accountId}
              onSelect={(value) => setFormData(prev => ({ ...prev, accountId: value }))}
              placeholder={t("Selecionar conta")}
            />
          </View>

          <View style={{ flex: 1, marginHorizontal: 4 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>{t('Categoria')}</Text>
            <Select
              items={categories
                .filter((cat: Category) => !formData.type || cat.type === formData.type)
                .map((category: Category) => ({
                  id: category.id,
                  label: t(`categories:${category.name}`),
                  value: category.id,
                  icon: category.icon
                }))}
              selectedValue={formData.categoryId}
              onSelect={(value) => setFormData(prev => ({ ...prev, categoryId: value }))}
              placeholder={t("Selecione")}
            />
          </View>
        </View>

        {/* Descrição */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>{t('Descrição')}</Text>
          <TextInput
            value={formData.description}
            onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
            placeholder={t("Salário, Aluguel, Supermercado")}
          />
        </View>

        {/* Valor */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>{t('Valor')}</Text>
          <TextInput
            value={formData.value}
            onChangeText={(text) => setFormData(prev => ({ ...prev, value: text }))}
            placeholder={t("0,00")}
            keyboardType="numeric"
            left={<TextInput.Affix text="R$ " />}
          />
        </View>

        {/* Efetivado/Pago? */}
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: '600' }}>{t('Efetivado/Pago?')}</Text>
            <Switch
              value={formData.isConsolidated}
              onValueChange={(value) => setFormData(prev => ({ ...prev, isConsolidated: value }))}
            />
          </View>
          <HelperText type="info">
            {formData.isConsolidated ? t('Transação já efetivada/paga') : t('Transação pendente')}
          </HelperText>
        </View>

        {/* Recorrência */}
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: '600' }}>{t('Recorrência')}</Text>
            <Switch
              value={formData.isRecurring}
              onValueChange={(value) => setFormData(prev => ({ ...prev, isRecurring: value }))}
              disabled={!!transaction}
            />
          </View>

          {formData.isRecurring && (
            <View style={{ backgroundColor: '#f8f9fa', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e9ecef' }}>
              <Text style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>{t('Data Final (opcional)')}</Text>
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#ddd',
                  backgroundColor: '#f8f9fa',
                  gap: 8,
                }}
                onPress={() => setActivePicker('recurringEndDate')}
              >
                <Icon source="calendar" size={16} />
                <Text style={{ fontSize: 14 }}>
                  {formData.recurringEndDate
                    ? formData.recurringEndDate.toLocaleDateString('pt-BR')
                    : t('Selecionar data final')
                  }
                </Text>
              </TouchableOpacity>
              <HelperText type="info" style={{ marginTop: 8 }}>
                {t('Se não definir uma data final, a recorrência será criada para os próximos 2 anos')}
              </HelperText>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Botões de ação fixos no rodapé */}
      <View style={{
        padding: 20,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
          <Button
            mode="outlined"
            onPress={() => {
              // onCancel?.();
              navigation.goBack();
            }}
            style={{ flex: 1 }}
          >
            {t('Cancelar')}
          </Button>


          {transaction &&
            <Button
              mode="contained"
              onPress={() => {
                Alert.alert(
                  t('Confirmação'),
                  t('Confirma a exclusão do registro?'),
                  [
                    {
                      text: t('Não'),
                      style: 'cancel',
                      onPress: () => {
                        null
                      },
                    },
                    {
                      text: t('Sim'),
                      onPress: () => {
                        handleDelete()
                      },
                    },
                  ],
                  { cancelable: true }
                );
              }}
              buttonColor="#FF6B6B"
              style={{ flex: 1 }}
            >
              {t('Excluir')}
            </Button>
          }


          <Button
            mode="contained"
            onPress={handleSave}
            disabled={isInvalidForm()}
            style={{ flex: 1 }}
          >
            {transaction ? t('Atualizar') : t('Salvar')}
          </Button>

        </View>
      </View>

      <Portal>
        <Dialog
          visible={recurringDialogVisible}
          onDismiss={() => setRecurringDialogVisible(false)}
        >
          <Dialog.Title>{t('Editar Transação Recorrente')}</Dialog.Title>
          <Dialog.Content>
            <Text>{t('Deseja alterar apenas esta transação ou também as próximas?')}</Text>
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
