import React from 'react';
import { View, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';

interface TransactionTypeModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectIncome: () => void;
  onSelectExpense: () => void;
  onSelectTransfer: () => void;
}

export default function TransactionTypeModal({
  visible,
  onClose,
  onSelectIncome,
  onSelectExpense,
  onSelectTransfer,
}: TransactionTypeModalProps) {
  const { isDarkMode } = useTheme();
  const { t } = useTranslation();

  const getBackgroundColor = () => {
    return isDarkMode ? '#2A2D3E' : '#FFFFFF';
  }

  const getBorderColor = () => {
    return isDarkMode ? '#3A3D4E' : '#f0f0f0';
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.bottomSheet, { backgroundColor: getBackgroundColor() }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.handle]} />

          <Text style={[styles.title]}>{t("Nova Transação")}</Text>
          <Text style={[styles.subtitle]}>{t("Selecione o tipo")}</Text>

          <TouchableOpacity
            style={[styles.option, { borderBottomColor: getBorderColor() }]}
            onPress={onSelectIncome}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#2E9E57' }]}>
              <Icon source="arrow-up-bold-circle" size={28} color="#fff" />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={[styles.optionTitle]}>{t("Entrada")}</Text>
              <Text style={[styles.optionDescription]}>
                {t("Receitas, salários, investimentos")}
              </Text>
            </View>
            <Icon source="chevron-right" size={24} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.option, { borderBottomColor: getBorderColor() }]}
            onPress={onSelectExpense}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#CC4A4A' }]}>
              <Icon source="arrow-down-bold-circle" size={28} color="#fff" />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={[styles.optionTitle]}>{t("account:Saída")}</Text>
              <Text style={[styles.optionDescription]}>
                {t("Despesas, compras, pagamentos")}
              </Text>
            </View>
            <Icon source="chevron-right" size={24} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.option, { borderBottomColor: getBorderColor() }]}
            onPress={onSelectTransfer}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#007bff' }]}>
              <Icon source="swap-horizontal" size={28} color="#fff" />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={[styles.optionTitle]}>{t("Transferência entre contas")}</Text>
              <Text style={[styles.optionDescription]}>
                {t("Mover saldo entre suas contas")}
              </Text>
            </View>
            <Icon source="chevron-right" size={24} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={[styles.cancelText]}>{t("Cancelar")}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 34,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
    marginBottom: 24,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 12,
    opacity: 0.6,
  },
  cancelButton: {
    marginTop: 20,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: 'gray',
  },
});
