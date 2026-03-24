import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Button, TextInput, Text, Icon, HelperText, Divider } from 'react-native-paper';
import { Select } from '../components/Select';
import { TransactionService } from '../service/TransactionService';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import Category from '../models/Caterogy';
import CreditCard from '../models/CreditCard';
import Transaction from '../models/Transactions';
import { withObservables } from '@nozbe/watermelondb/react';
import CreditCardService from '../service/CreditCardService';
import { Q } from '@nozbe/watermelondb';

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
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [activePicker, setActivePicker] = useState<boolean>(false);
  const [calculating, setCalculating] = useState<boolean>(false);
  const [previewInfo, setPreviewInfo] = useState<{
    installmentAmount: number;
    totalAmount: number;
    show: boolean;
  }>({
    installmentAmount: 0,
    totalAmount: 0,
    show: false,
  });

  const { transactionId, categories = [], onSave } = route.params || {};
  const [isEditing, setIsEditing] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);

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

  // Carregar dados da transação se estiver em modo edição
  useEffect(() => {
    const loadTransactionData = async () => {
      if (transactionId) {
        try {
          const transaction = await TransactionService.findById(transactionId);
          if (transaction) {
            setCurrentTransaction(transaction);
            setIsEditing(true);

            // @ts-ignore - WatermelonDB usa esta sintaxe para relacionamentos
            const creditCardId = transaction._raw?.credit_card_id;
            // @ts-ignore
            const categoryId = transaction._raw?.category_id;
            const purchaseDate = transaction.purchaseDate || transaction.date;

            setFormData({
              amount: transaction.amount.toString(),
              description: transaction.description.replace(/ \(\d+\/\d+\)$/, ''), // Remove (1/12) do final
              date: new Date(purchaseDate),
              creditCardId: creditCardId || '',
              categoryId: categoryId || '',
              installments: 1, // Será calculado depois
              interestRate: '0',
            });
          }
        } catch (error) {
          console.error('Erro ao carregar transação para edição:', error);
        }
      }
    };

    loadTransactionData();
  }, [transactionId]);

  // Atualizar categoryId quando as categorias chegarem
  useEffect(() => {
    if (categories.length > 0 && !formData.categoryId) {
      const expenseCategories = categories.filter((cat: Category) => cat.type === 'expense');
      if (expenseCategories.length > 0) {
        setFormData(prev => ({
          ...prev,
          categoryId: expenseCategories[0].id
        }));
      }
    }
  }, [categories]);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setFormData(prev => ({ ...prev, date: selectedDate }));
    }
    setActivePicker(false);
  };

  // Calcular preview quando os campos relevantes mudarem
  useEffect(() => {
    const amount = parseFloat(formData.amount.replace(',', '.'));
    const installments = formData.installments;
    const interestRate = parseFloat(formData.interestRate.replace(',', '.')) || 0;

    if (amount > 0 && installments > 0 && interestRate >= 0) {
      if (installments > 1 && interestRate > 0) {
        // Tabela Price: PMT = PV * i / (1 - (1 + i)^-n)
        const i = interestRate / 100; // taxa decimal
        const n = installments;
        const pv = amount;
        const pmt = pv * i / (1 - Math.pow(1 + i, -n));
        const total = pmt * n;
        setPreviewInfo({
          installmentAmount: parseFloat(pmt.toFixed(2)),
          totalAmount: parseFloat(total.toFixed(2)),
          show: true,
        });
      } else if (installments > 1) {
        // Sem juros
        const installmentAmount = amount / installments;
        setPreviewInfo({
          installmentAmount: parseFloat(installmentAmount.toFixed(2)),
          totalAmount: amount,
          show: true,
        });
      } else {
        setPreviewInfo({
          installmentAmount: amount,
          totalAmount: amount,
          show: false,
        });
      }
    } else {
      setPreviewInfo({
        installmentAmount: 0,
        totalAmount: 0,
        show: false,
      });
    }
  }, [formData.amount, formData.installments, formData.interestRate]);

  const isInvalidForm = () => {
    const amount = parseFloat(formData.amount.replace(',', '.'));
    return (
      isNaN(amount) ||
      amount <= 0 ||
      !formData.description.trim() ||
      !formData.creditCardId ||
      !formData.categoryId ||
      formData.installments < 1
    );
  };

  const handleDelete = async () => {
    if (!user || !currentTransaction) return;

    // Verificar se é uma transação parcelada
    // @ts-ignore - WatermelonDB usa esta sintaxe para relacionamentos
    const relatedTransactionId = currentTransaction._raw?.related_transaction_id;
    const isInstallment = !!relatedTransactionId;

    if (isInstallment) {
      // Mostrar alerta para escolher o tipo de exclusão
      Alert.alert(
        t('Excluir Compra Parcelada'),
        t('Esta compra faz parte de um parcelamento. Como deseja excluir?'),
        [
          {
            text: t('Cancelar'),
            style: 'cancel'
          },
          {
            text: t('Excluir apenas esta parcela'),
            onPress: async () => {
              try {
                await TransactionService.deleteCreditCardPurchase(
                  currentTransaction.id,
                  'only_this'
                );
                Alert.alert(t('Sucesso'), t('Parcela excluída com sucesso!'));
                onSave?.();
                navigation.goBack();
              } catch (error: any) {
                console.error('Erro ao excluir parcela:', error);
                Alert.alert(
                  t('Erro'),
                  error.message || t('Ocorreu um erro ao excluir a parcela.')
                );
              }
            }
          },
          {
            text: t('Excluir todas as parcelas pendentes'),
            onPress: async () => {
              try {
                await TransactionService.deleteCreditCardPurchase(
                  currentTransaction.id,
                  'all_pending'
                );
                Alert.alert(t('Sucesso'), t('Todas as parcelas pendentes excluídas com sucesso!'));
                onSave?.();
                navigation.goBack();
              } catch (error: any) {
                console.error('Erro ao excluir parcelas:', error);
                Alert.alert(
                  t('Erro'),
                  error.message || t('Ocorreu um erro ao excluir as parcelas.')
                );
              }
            }
          }
        ]
      );
    } else {
      // Transação não parcelada, pedir confirmação simples
      Alert.alert(
        t('Confirmar Exclusão'),
        t('Tem certeza que deseja excluir esta compra?'),
        [
          {
            text: t('Cancelar'),
            style: 'cancel'
          },
          {
            text: t('Excluir'),
            onPress: async () => {
              try {
                await TransactionService.deleteCreditCardPurchase(
                  currentTransaction.id,
                  'only_this'
                );
                Alert.alert(t('Sucesso'), t('Compra excluída com sucesso!'));
                onSave?.();
                navigation.goBack();
              } catch (error: any) {
                console.error('Erro ao excluir compra:', error);
                Alert.alert(
                  t('Erro'),
                  error.message || t('Ocorreu um erro ao excluir a compra.')
                );
              }
            }
          }
        ]
      );
    }
  };

  const handleSave = async () => {
    if (!user) return;

    const amount = parseFloat(formData.amount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      Alert.alert(t('Erro'), t('Valor inválido'));
      return;
    }

    const interestRate = parseFloat(formData.interestRate.replace(',', '.')) || 0;
    if (interestRate < 0) {
      Alert.alert(t('Erro'), t('Taxa de juros não pode ser negativa'));
      return;
    }

    setCalculating(true);
    try {
      if (isEditing && currentTransaction) {
        // Verificar se é uma transação parcelada
        // @ts-ignore - WatermelonDB usa esta sintaxe para relacionamentos
        const relatedTransactionId = currentTransaction._raw?.related_transaction_id;
        const isInstallment = !!relatedTransactionId;

        if (isInstallment) {
          // Mostrar alerta para escolher o tipo de edição
          Alert.alert(
            t('Editar Compra Parcelada'),
            t('Esta compra faz parte de um parcelamento. Como deseja editar?'),
            [
              {
                text: t('Cancelar'),
                style: 'cancel',
                onPress: () => {
                  setCalculating(false);
                }
              },
              {
                text: t('Editar apenas esta parcela'),
                onPress: async () => {
                  try {
                    await TransactionService.updateCreditCardPurchase(
                      currentTransaction.id,
                      'only_this',
                      {
                        amount,
                        description: formData.description,
                        date: formData.date,
                        creditCardId: formData.creditCardId,
                        categoryId: formData.categoryId,
                        installments: formData.installments,
                        interestRate,
                        userId: user.id,
                      }
                    );
                    Alert.alert(t('Sucesso'), t('Parcela atualizada com sucesso!'));
                    onSave?.();
                    navigation.goBack();
                  } catch (error: any) {
                    console.error('Erro ao atualizar parcela:', error);
                    Alert.alert(
                      t('Erro'),
                      error.message || t('Ocorreu um erro ao atualizar a parcela.')
                    );
                    setCalculating(false);
                  }
                }
              },
              {
                text: t('Editar todas as parcelas pendentes'),
                onPress: async () => {
                  try {
                    await TransactionService.updateCreditCardPurchase(
                      currentTransaction.id,
                      'all_pending',
                      {
                        amount,
                        description: formData.description,
                        date: formData.date,
                        creditCardId: formData.creditCardId,
                        categoryId: formData.categoryId,
                        installments: formData.installments,
                        interestRate,
                        userId: user.id,
                      }
                    );
                    Alert.alert(t('Sucesso'), t('Todas as parcelas pendentes atualizadas com sucesso!'));
                    onSave?.();
                    navigation.goBack();
                  } catch (error: any) {
                    console.error('Erro ao atualizar parcelas:', error);
                    Alert.alert(
                      t('Erro'),
                      error.message || t('Ocorreu um erro ao atualizar as parcelas.')
                    );
                    setCalculating(false);
                  }
                }
              }
            ]
          );
          return;
        } else {
          // Transação não parcelada, atualizar normalmente
          await TransactionService.updateCreditCardPurchase(
            currentTransaction.id,
            'only_this',
            {
              amount,
              description: formData.description,
              date: formData.date,
              creditCardId: formData.creditCardId,
              categoryId: formData.categoryId,
              installments: formData.installments,
              interestRate,
              userId: user.id,
            }
          );
          Alert.alert(t('Sucesso'), t('Compra atualizada com sucesso!'));
          onSave?.();
          navigation.goBack();
        }
      } else {
        // Criar nova compra
        await TransactionService.createCreditCardPurchase({
          amount,
          description: formData.description,
          date: formData.date,
          creditCardId: formData.creditCardId,
          categoryId: formData.categoryId,
          installments: formData.installments,
          interestRate,
          userId: user.id,
        });

        Alert.alert(t('Sucesso'), t('Compra no cartão criada com sucesso!'));
        onSave?.();
        navigation.goBack();
      }
    } catch (error: any) {
      console.error('Erro ao salvar compra no cartão:', error);
      Alert.alert(
        t('Erro'),
        error.message || t('Ocorreu um erro ao salvar a compra no cartão.')
      );
    } finally {
      setCalculating(false);
    }
  };

  // Opções de parcelamento (1 a 12 parcelas)
  const installmentOptions = Array.from({ length: 12 }, (_, i) => ({
    id: (i + 1).toString(),
    label: `${i + 1} ${i === 0 ? t('parcela') : t('parcelas')}`,
    value: (i + 1).toString(),
  }));

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, padding: 20 }}>
        {activePicker && (
          <DateTimePicker
            value={formData.date}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold' }}>
            {isEditing ? t('Editar Compra') : t('Lançar Compra')}
          </Text>
        </View>

        {/* Data da Compra */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>{t('Data da Compra')}</Text>
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
              width: '48%'
            }}
            onPress={() => setActivePicker(true)}
          >
            <Icon source="calendar" size={16} />
            <Text style={{ fontSize: 14 }}>
              {formData.date.toLocaleDateString('pt-BR')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Cartão de Crédito */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>{t('Cartão de Crédito')}</Text>
          <Select
            items={creditCards.map((card: CreditCard) => ({
              id: card.id,
              label: card.name,
              value: card.id,
              imageUri: null, // Pode-se adicionar logo do cartão no futuro
            }))}
            selectedValue={formData.creditCardId}
            onSelect={(value) => setFormData(prev => ({ ...prev, creditCardId: value }))}
            placeholder={t("Selecionar cartão")}
          />
        </View>

        {/* Categoria */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>{t('Categoria')}</Text>
          <Select
            items={categories
              .filter((cat: Category) => cat.type === 'expense')
              .map((category: Category) => {
                const translatedLabel = t(`categories:${category.name}`);
                const label = translatedLabel.includes('categories:') ? category.name : translatedLabel;
                return {
                  id: category.id,
                  label: label,
                  value: category.id,
                  icon: category.icon
                };
              })}
            selectedValue={formData.categoryId}
            onSelect={(value) => setFormData(prev => ({ ...prev, categoryId: value }))}
            placeholder={categories.length === 0 ? t("Carregando...") : t("Selecione")}
          />
          {categories.length === 0 && (
            <HelperText type="info">
              {t('Aguarde enquanto as categorias são carregadas...')}
            </HelperText>
          )}
        </View>

        {/* Descrição */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>{t('Descrição')}</Text>
          <TextInput
            value={formData.description}
            onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
            placeholder={t("Descrição da compra")}
          />
        </View>

        {/* Valor Original */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>{t('Valor Original')}</Text>
          <TextInput
            value={formData.amount}
            onChangeText={(text) => setFormData(prev => ({ ...prev, amount: text }))}
            placeholder={t("0,00")}
            keyboardType="numeric"
            left={<TextInput.Affix text="R$ " />}
          />
        </View>

        {/* Quantidade de Parcelas */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>{t('Quantidade de Parcelas')}</Text>
          <Select
            items={installmentOptions}
            selectedValue={formData.installments.toString()}
            onSelect={(value) => setFormData(prev => ({ ...prev, installments: parseInt(value) }))}
            placeholder={t("Selecione")}
          />
        </View>

        {/* Taxa de Juros % a.m. */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>{t('Taxa de Juros % a.m.')}</Text>
          <TextInput
            value={formData.interestRate}
            onChangeText={(text) => setFormData(prev => ({ ...prev, interestRate: text }))}
            placeholder="0"
            keyboardType="numeric"
            right={<TextInput.Affix text="% a.m." />}
          />
          <HelperText type="info">
            {t('Deixe em 0 para compra sem juros')}
          </HelperText>
        </View>

        {/* Preview do cálculo */}
        {previewInfo.show && (
          <View style={{
            backgroundColor: '#f8f9fa',
            padding: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#e9ecef',
            marginBottom: 24,
          }}>
            <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
              {t('Detalhes do Parcelamento')}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 14 }}>{t('Valor da Parcela')}:</Text>
              <Text style={{ fontSize: 14, fontWeight: '600' }}>
                R$ {previewInfo.installmentAmount.toFixed(2).replace('.', ',')}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 14 }}>{t('Número de Parcelas')}:</Text>
              <Text style={{ fontSize: 14, fontWeight: '600' }}>
                {formData.installments}
              </Text>
            </View>
            <Divider style={{ marginVertical: 8 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 14, fontWeight: '600' }}>{t('Valor Total Final')}:</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#CC4A4A' }}>
                R$ {previewInfo.totalAmount.toFixed(2).replace('.', ',')}
              </Text>
            </View>
            {parseFloat(formData.interestRate.replace(',', '.')) > 0 && (
              <HelperText type="info" style={{ marginTop: 8 }}>
                {t('Cálculo baseado na Tabela Price')}
              </HelperText>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Botões de ação fixos no rodapé */}
      <View style={{ padding: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={{ flex: 1 }}
            disabled={calculating}
          >
            {t('Cancelar')}
          </Button>

          {isEditing && !currentTransaction?.isConsolidated &&
            < Button
              mode="contained"
              onPress={handleDelete}
              style={{ flex: 1 }}
              disabled={calculating}
              buttonColor="#FF6B6B"
            >
              {t('Excluir')}
            </Button>
          }


          <Button
            mode="contained"
            onPress={handleSave}
            disabled={isInvalidForm() || calculating}
            loading={calculating}
            style={{ flex: 1 }}
          >
            {isEditing ? t('Atualizar') : t('Lançar Compra')}
          </Button>
        </View>
      </View>
    </View >
  );
}

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
