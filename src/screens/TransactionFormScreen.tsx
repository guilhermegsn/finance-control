import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { Button, TextInput, Divider, Switch, HelperText, Text, Icon, Portal, Dialog } from 'react-native-paper';
import { Select } from '../components/Select';
import { TransactionService } from '../service/TransactionService';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import Account from '../models/Accounts';
import Category from '../models/Caterogy';

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
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [recurringDialogVisible, setRecurringDialogVisible] = useState(false);
  const [pendingUpdateData, setPendingUpdateData] = useState<any>(null);
  const [activePicker, setActivePicker] = useState<'date' | 'recurringEndDate' | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { transaction, accounts = [], categories = [], onSave, onCancel } = route.params || {};

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
        accountId: '', // Será preenchido separadamente
        categoryId: '', // Será preenchido separadamente
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
        type: null,
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

  const selectType = (type: 'income' | 'expense') => {
    setFormData(prev => ({ ...prev, type }));
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

    try {
      if (transaction) {
        // Verificar se é uma transação recorrente
        if (transaction.isRecurring) {
          // Navegar para dialog de recorrência ou tratar de outra forma
          // Extrair apenas dados simples para evitar referências circulares
          const safeTransaction = {
            id: transaction.id,
            description: transaction.description,
            amount: transaction.amount,
            type: transaction.type,
            date: transaction.date,
            isConsolidated: transaction.isConsolidated,
            isRecurring: transaction.isRecurring,
          };
          // Verificar se é uma transação recorrente
          if (transaction.isRecurring) {
            // Em vez de navegar, salvamos os dados temporariamente e abrimos o popup
            setPendingUpdateData(transactionData);
            setRecurringDialogVisible(true);
          }
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
          await TransactionService.update(transaction.id, updateData);
          onSave?.();
          navigation.goBack();
        }
      } else {
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
      const safeTransaction = {
        id: transaction.id,
        description: transaction.description,
        amount: transaction.amount,
        type: transaction.type,
        date: transaction.date,
        isConsolidated: transaction.isConsolidated,
        isRecurring: transaction.isRecurring,
      };
      navigation.navigate('RecurringDialog', {
        transaction: safeTransaction,
        action: 'delete',
      });
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

  if (formData.type === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>
          Nova Transação
        </Text>
        <Text style={{ fontSize: 16, opacity: 0.7, marginBottom: 32 }}>
          Selecione o tipo de transação
        </Text>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 32 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              alignItems: 'center',
              padding: 24,
              borderRadius: 16,
              marginHorizontal: 8,
              elevation: 4,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              backgroundColor: '#2E9E57',
            }}
            onPress={() => selectType('income')}
            activeOpacity={0.7}
          >
            <View style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
            }}>
              <Icon source="arrow-up-bold-circle" size={40} color="#fff" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 8 }}>
              Entrada
            </Text>
            <Text style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.8)', textAlign: 'center' }}>
              Receitas, salários, investimentos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flex: 1,
              alignItems: 'center',
              padding: 24,
              borderRadius: 16,
              marginHorizontal: 8,
              elevation: 4,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              backgroundColor: '#CC4A4A',
            }}
            onPress={() => selectType('expense')}
            activeOpacity={0.7}
          >
            <View style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
            }}>
              <Icon source="arrow-down-bold-circle" size={40} color="#fff" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 8 }}>
              Saída
            </Text>
            <Text style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.8)', textAlign: 'center' }}>
              Despesas, compras, pagamentos
            </Text>
          </TouchableOpacity>
        </View>

        <Button
          mode="outlined"
          onPress={() => {
            onCancel?.();
            navigation.goBack();
          }}
          style={{ width: '100%' }}
        >
          Cancelar
        </Button>
      </View>
    );
  }

  return (
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
          {transaction ? 'Editar Transação' : 'Nova Transação'}
        </Text>
        <TouchableOpacity onPress={() => setFormData(prev => ({ ...prev, type: null }))}>
          <Icon source="refresh" size={20} />
        </TouchableOpacity>
      </View>

      {/* Tipo e Data */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
        <View style={{ flex: 1, marginHorizontal: 4 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Tipo</Text>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 12,
              gap: 8,
              backgroundColor: formData.type === 'income' ? '#2E9E57' : '#CC4A4A',
            }}
            onPress={() => setFormData(prev => ({ ...prev, type: null }))}
          >
            <Icon
              source={formData.type === 'income' ? "arrow-up-bold-circle" : "arrow-down-bold-circle"}
              size={16}
              color="#fff"
            />
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
              {formData.type === 'income' ? 'Entrada' : 'Saída'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1, marginHorizontal: 4 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Data</Text>
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
          <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Conta</Text>
          <Select
            items={accounts.map((account: Account) => ({
              id: account.id,
              label: account.name,
              value: account.id,
            }))}
            selectedValue={formData.accountId}
            onSelect={(value) => setFormData(prev => ({ ...prev, accountId: value }))}
            placeholder="Selecionar conta"
          />
        </View>

        <View style={{ flex: 1, marginHorizontal: 4 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Categoria</Text>
          <Select
            items={categories
              .filter((cat: Category) => !formData.type || cat.type === formData.type)
              .map((category: Category) => ({
                id: category.id,
                label: category.name,
                value: category.id,
              }))}
            selectedValue={formData.categoryId}
            onSelect={(value) => setFormData(prev => ({ ...prev, categoryId: value }))}
            placeholder="Selecione"
          />
        </View>
      </View>

      {/* Descrição */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Descrição</Text>
        <TextInput
          value={formData.description}
          onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
          placeholder="Ex: Salário, Aluguel, Supermercado"
          mode="outlined"
        />
      </View>

      {/* Valor */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Valor</Text>
        <TextInput
          value={formData.value}
          onChangeText={(text) => setFormData(prev => ({ ...prev, value: text }))}
          placeholder="0,00"
          keyboardType="numeric"
          mode="outlined"
          left={<TextInput.Affix text="R$ " />}
        />
      </View>

      {/* Efetivado/Pago? */}
      <View style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: '600' }}>Efetivado/Pago?</Text>
          <Switch
            value={formData.isConsolidated}
            onValueChange={(value) => setFormData(prev => ({ ...prev, isConsolidated: value }))}
          />
        </View>
        <HelperText type="info">
          {formData.isConsolidated ? 'Transação já efetivada/paga' : 'Transação pendente'}
        </HelperText>
      </View>

      {/* Recorrência */}
      <View style={{ marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: '600' }}>Recorrência</Text>
          <Switch
            value={formData.isRecurring}
            onValueChange={(value) => setFormData(prev => ({ ...prev, isRecurring: value }))}
            disabled={!!transaction}
          />
        </View>

        {formData.isRecurring && (
          <View style={{ backgroundColor: '#f8f9fa', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e9ecef' }}>
            <Text style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>Data Final (opcional)</Text>
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
                  : 'Selecionar data final'
                }
              </Text>
            </TouchableOpacity>
            <HelperText type="info" style={{ marginTop: 8 }}>
              Se não definir uma data final, a recorrência será criada para os próximos 2 anos
            </HelperText>
          </View>
        )}
      </View>

      {/* Botões de ação */}
      <Divider style={{ marginVertical: 24 }} />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
        <Button
          mode="outlined"
          onPress={() => {
            onCancel?.();
            navigation.goBack();
          }}
          style={{ flex: 1 }}
        >
          Cancelar
        </Button>

        {transaction && !isDeleting && (
          <Button
            mode="contained"
            onPress={() => setIsDeleting(true)}
            buttonColor="#FF6B6B"
            style={{ flex: 1 }}
          >
            Excluir
          </Button>
        )}

        {isDeleting ? (
          <View style={{ backgroundColor: '#FFF5F5', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#FED7D7', marginTop: 16, width: '100%' }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#C53030', marginBottom: 4 }}>Confirmar exclusão?</Text>
            <Text style={{ fontSize: 14, opacity: 0.7, marginBottom: 16 }}>Esta ação não pode ser desfeita.</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Button
                mode="outlined"
                onPress={() => setIsDeleting(false)}
                style={{ flex: 1 }}
              >
                Cancelar
              </Button>
              <Button
                mode="contained"
                onPress={handleDelete}
                buttonColor="#FF6B6B"
                style={{ flex: 1 }}
              >
                Excluir
              </Button>
            </View>
          </View>
        ) : (
          <Button
            mode="contained"
            onPress={handleSave}
            disabled={isInvalidForm()}
            style={{ flex: 1 }}
          >
            {transaction ? 'Atualizar' : 'Salvar'}
          </Button>
        )}
      </View>

      <View style={{ height: 100 }} />

      <Portal>
        <Dialog
          visible={recurringDialogVisible}
          onDismiss={() => setRecurringDialogVisible(false)}
        >
          <Dialog.Title>Editar Transação Recorrente</Dialog.Title>
          <Dialog.Content>
            <Text>Deseja alterar apenas esta transação ou também as próximas?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRecurringDialogVisible(false)}>Cancelar</Button>
            <Button onPress={() => handleRecurringAction('only_this')} mode="contained" style={{ marginRight: 8 }}>
              Apenas esta
            </Button>
            <Button onPress={() => handleRecurringAction('all_future')} mode="contained">
              Esta e as próximas
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

    </ScrollView>

  );
}