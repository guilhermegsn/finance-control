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

interface CreditCardPurchaseFormData {
  amount: string;
  description: string;
  date: Date;
  creditCardId: string;
  categoryId: string;
  installments: number;
  interestRate: string;
}

export default function CreditCardPurchaseScreen() {
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

  const { categories = [], creditCards = [], onSave } = route.params || {};

  const [formData, setFormData] = useState<CreditCardPurchaseFormData>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      amount: '',
      description: '',
      date: today,
      creditCardId: creditCards.length > 0 ? creditCards[0].id : '',
      categoryId: categories.length > 0 ? categories[0].id : '',
      installments: 1,
      interestRate: '0',
    };
  });

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
    } catch (error: any) {
      console.error('Erro ao criar compra no cartão:', error);
      Alert.alert(
        t('Erro'),
        error.message || t('Ocorreu um erro ao criar a compra no cartão.')
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
            {t('Lançar Compra')}
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
              image: null, // Pode-se adicionar logo do cartão no futuro
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

          <Button
            mode="contained"
            onPress={handleSave}
            disabled={isInvalidForm() || calculating}
            loading={calculating}
            style={{ flex: 1 }}
          >
            {t('Lançar Compra')}
          </Button>
        </View>
      </View>
    </View>
  );
}