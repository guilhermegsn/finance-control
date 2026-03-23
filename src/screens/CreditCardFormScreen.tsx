import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import CreditCardService from '../service/CreditCardService';
import CreditCard from '../models/CreditCard';
import { brandLogos } from '../utils/brandLogos';
import { Select } from '../components/Select';
import { TextInput, Text, Button } from 'react-native-paper';

const CreditCardFormScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();

  const params = route.params as any;
  const editingCard = params?.card as CreditCard | undefined;

  const [name, setName] = useState(editingCard?.name || '');
  const [brand, setBrand] = useState(editingCard?.brand || 'visa');
  const [limit, setLimit] = useState(editingCard?.limit?.toString() || '');
  const [closingDay, setClosingDay] = useState(editingCard?.closingDay?.toString() || '');
  const [dueDay, setDueDay] = useState(editingCard?.dueDay?.toString() || '');
  const [color, setColor] = useState(editingCard?.color || '#000000');
  const [accountId, setAccountId] = useState(editingCard?.accountId || '');
  const [accounts, setAccounts] = useState<any[]>([]);

  React.useEffect(() => {
    import('../service/AccountService').then(({ AccountService }) => {
      AccountService.fetchAll().then(activeAccounts => {
        setAccounts(
          activeAccounts.map(acc => ({
            id: acc.id,
            label: acc.name,
            value: acc.id,
          }))
        );
      });
    });
  }, []);

  const brandOptions = Object.keys(brandLogos).map(key => ({
    id: key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    value: key,
    image: brandLogos[key]
  }));

  const handleSave = async () => {
    if (!name || !limit || !closingDay || !dueDay || !accountId) {
      Alert.alert(t('Error'), t('Preencha todos os campos obrigatórios'));
      return;
    }

    try {
      const data = {
        name,
        brand,
        limit: parseFloat(limit.replace(',', '.')),
        closingDay: parseInt(closingDay, 10),
        dueDay: parseInt(dueDay, 10),
        color,
        userId: user?.id || 'default_user',
        accountId: accountId 
      };

      console.log('data', data)

      if (editingCard) {
        await CreditCardService.update(editingCard, data);
      } else {
        console.log('salvo')
        await CreditCardService.create(data);
      }
      navigation.goBack();
    } catch (error: any) {
      console.error('Error saving credit card:', error);
      Alert.alert(t('Error'), error.message || t('Ocorreu um erro ao salvar o cartão'));
    }
  };

  return (
    <SafeAreaView style={[styles.container]}>

      <ScrollView style={styles.content}>
        <View style={styles.formGroup}>
          <Text>{t('Nome do Cartão')}</Text>
          <TextInput
            style={[styles.input]}
            value={name}
            onChangeText={setName}
            placeholder={t('Ex: Nubank, Itaú...')}
          />
        </View>

        <View style={styles.formGroup}>
          <Text>{t('Bandeira')}</Text>
          <Select
            items={brandOptions}
            selectedValue={brand}
            onSelect={(val: string) => setBrand(val)}
            placeholder={t('Selecione a bandeira')}
          />
        </View>

        <View style={styles.formGroup}>
          <Text>{t('Conta de Pagamento Padrão')}</Text>
          <Select
            items={accounts}
            selectedValue={accountId}
            onSelect={(val: string) => setAccountId(val)}
            placeholder={t('Selecione a conta')}
          />
        </View>

        <View style={styles.formGroup}>
          <Text>{t('Limite')}</Text>
          <TextInput

            value={limit}
            onChangeText={setLimit}
            keyboardType="numeric"
            placeholder="0.00"
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
            <Text>{t('Dia de Fechamento')}</Text>
            <TextInput
              value={closingDay}
              onChangeText={setClosingDay}
              keyboardType="numeric"
              maxLength={2}
            />
          </View>

          <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
            <Text>{t('Dia de Vencimento')}</Text>
            <TextInput
              value={dueDay}
              onChangeText={setDueDay}
              keyboardType="numeric"
              maxLength={2}
            />
          </View>
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <Button mode="contained" onPress={handleSave}>
          Salvar
        </Button>
        {/* <TouchableOpacity 
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>{t('Salvar Cartão')}</Text>
        </TouchableOpacity> */}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footer: {
    padding: 16,
    paddingBottom: 24,
  },
  saveButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CreditCardFormScreen;