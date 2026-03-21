import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Button, TextInput, Text, Icon } from 'react-native-paper';
import { Select } from '../components/Select';
import { TransactionService } from '../service/TransactionService';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import Account from '../models/Accounts';

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
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [activePicker, setActivePicker] = useState<boolean>(false);

  const { accounts = [], onSave } = route.params || {};

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

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setFormData(prev => ({ ...prev, date: selectedDate }));
    }
    setActivePicker(false);
  };

  const isInvalidForm = () => {
    const amount = parseFloat(formData.value.replace(',', '.'));
    return (
      isNaN(amount) ||
      amount <= 0 ||
      !formData.description.trim() ||
      !formData.sourceAssetId ||
      !formData.destinationAssetId ||
      formData.sourceAssetId === formData.destinationAssetId
    );
  };

  const handleSave = async () => {
    if (!user) return;

    if (formData.sourceAssetId === formData.destinationAssetId) {
      Alert.alert(t('Atenção'), t('A conta de destino deve ser diferente da origem'));
      return;
    }

    const amount = parseFloat(formData.value.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) return;

    try {
      await TransactionService.createTransfer({
        amount: amount,
        date: formData.date,
        description: formData.description,
        sourceAssetId: formData.sourceAssetId,
        destinationAssetId: formData.destinationAssetId,
        userId: user.id,
      });

      Alert.alert(t('Sucesso'), t('Transferência realizada com sucesso!'));
      onSave?.();
      navigation.goBack();
    } catch (error) {
      console.error('Erro ao salvar transferência:', error);
      Alert.alert(t('Erro'), t('Ocorreu um erro ao realizar a transferência.'));
    }
  };

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
            {t('Nova Transferência')}
          </Text>
        </View>

        {/* Data */}
        <View style={{ marginBottom: 20 }}>
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

        {/* Conta Origem */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>{t('Conta de Origem')}</Text>
          <Select
            items={accounts.map((account: Account) => {
              let imageSource = account.logoUrl;
              if (!imageSource && account.bankCode && account.bankCode.trim() !== '') {
                const bank = require('../service/BankService').default.getBankByCode(account.bankCode);
                if (bank) {
                  imageSource = bank.logoUrl;
                }
              }
              return {
                id: account.id,
                label: account.name,
                value: account.id,
                image: imageSource
              };
            })}
            selectedValue={formData.sourceAssetId}
            onSelect={(value) => setFormData(prev => ({ ...prev, sourceAssetId: value }))}
            placeholder={t("Selecionar conta")}
          />
        </View>

        {/* Conta Destino */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>{t('Conta de Destino')}</Text>
          <Select
            items={accounts.map((account: Account) => {
              let imageSource = account.logoUrl;
              if (!imageSource && account.bankCode && account.bankCode.trim() !== '') {
                const bank = require('../service/BankService').default.getBankByCode(account.bankCode);
                if (bank) {
                  imageSource = bank.logoUrl;
                }
              }
              return {
                id: account.id,
                label: account.name,
                value: account.id,
                image: imageSource
              };
            })}
            selectedValue={formData.destinationAssetId}
            onSelect={(value) => setFormData(prev => ({ ...prev, destinationAssetId: value }))}
            placeholder={t("Selecionar conta")}
          />
          {formData.sourceAssetId === formData.destinationAssetId && formData.sourceAssetId !== '' && (
            <Text style={{ color: 'red', fontSize: 12, marginTop: 4 }}>
              {t('A conta de destino deve ser diferente da origem')}
            </Text>
          )}
        </View>

        {/* Descrição */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>{t('Descrição')}</Text>
          <TextInput
            value={formData.description}
            onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
            placeholder={t("Motivo da transferência")}
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

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Botões de ação fixos no rodapé */}
      <View style={{ padding: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={{ flex: 1 }}
          >
            {t('Cancelar')}
          </Button>

          <Button
            mode="contained"
            onPress={handleSave}
            disabled={isInvalidForm()}
            style={{ flex: 1 }}
          >
            {t('Transferir')}
          </Button>
        </View>
      </View>
    </View>
  );
}
