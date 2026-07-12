import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  Text,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { TextInput, Icon } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import Portfolio from '../models/Portfolio';

export interface AssetFormData {
  ticker: string;
  quantity: number;
  averagePrice: number;
}

interface AssetFormModalProps {
  visible: boolean;
  asset?: Portfolio | null;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (data: AssetFormData) => void;
}

const parseNumber = (value: string) => parseFloat(value.replace(',', '.'));

export default function AssetFormModal({
  visible,
  asset,
  submitting = false,
  onClose,
  onSubmit,
}: AssetFormModalProps) {
  const { isDarkMode } = useTheme();
  const { t } = useTranslation();

  const [ticker, setTicker] = useState('');
  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');

  const isEditing = !!asset;

  useEffect(() => {
    if (visible) {
      setTicker(asset?.ticker ?? '');
      setQuantity(asset?.quantity?.toString() ?? '');
      setBuyPrice(asset?.averagePrice?.toString() ?? '');
    }
  }, [visible, asset]);

  const c = {
    card: isDarkMode ? '#161C27' : '#FFFFFF',
    border: isDarkMode ? '#2D3748' : '#E2E8F0',
    textPrimary: isDarkMode ? '#E2E8F0' : '#1A202C',
    textSecondary: isDarkMode ? '#718096' : '#64748B',
    sectionLabel: isDarkMode ? '#4A5568' : '#94A3B8',
    inputBg: isDarkMode ? '#2D3748' : '#F8FAFC',
  };

  const inputTheme = {
    colors: {
      background: c.inputBg,
      onSurfaceVariant: c.textSecondary,
      primary: '#6366F1',
      outline: c.border,
      onSurface: c.textPrimary,
    },
  };

  const quantityNum = parseNumber(quantity);
  const buyPriceNum = parseNumber(buyPrice);
  const isInvalid =
    !ticker.trim() ||
    isNaN(quantityNum) || quantityNum <= 0 ||
    isNaN(buyPriceNum) || buyPriceNum <= 0;

  const handleSubmit = () => {
    if (isInvalid || submitting) return;
    onSubmit({
      ticker: ticker.trim().toUpperCase(),
      quantity: quantityNum,
      averagePrice: buyPriceNum,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable
            style={[styles.bottomSheet, { backgroundColor: c.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.handle} />

            <Text style={[styles.title, { color: c.textPrimary }]}>
              {isEditing ? t('Editar Ativo') : t('Novo Ativo')}
            </Text>

            <Text style={[styles.sectionLabel, { color: c.sectionLabel }]}>TICKER</Text>
            <TextInput
              mode="outlined"
              label={t('Ticker')}
              value={ticker}
              onChangeText={(v) => setTicker(v.toUpperCase())}
              placeholder="Ex: PETR4, VALE3..."
              autoCapitalize="characters"
              autoCorrect={false}
              disabled={isEditing}
              theme={inputTheme}
              style={{ backgroundColor: c.inputBg }}
            />

            <Text style={[styles.sectionLabel, { color: c.sectionLabel }]}>POSIÇÃO</Text>
            <View style={styles.row}>
              <TextInput
                mode="outlined"
                label={t('Quantidade')}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                placeholder="0"
                theme={inputTheme}
                style={[styles.rowInput, { backgroundColor: c.inputBg }]}
              />
              <TextInput
                mode="outlined"
                label={t('Preço Médio')}
                value={buyPrice}
                onChangeText={setBuyPrice}
                keyboardType="numeric"
                placeholder="0,00"
                left={<TextInput.Affix text="R$ " textStyle={{ color: c.textSecondary }} />}
                theme={inputTheme}
                style={[styles.rowInput, { backgroundColor: c.inputBg }]}
              />
            </View>

            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: c.border }]}
                onPress={onClose}
                disabled={submitting}
              >
                <Text style={[styles.cancelBtnText, { color: c.textSecondary }]}>{t('Cancelar')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isInvalid || submitting}
                style={[styles.saveBtn, { opacity: isInvalid || submitting ? 0.45 : 1 }]}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#6366F1']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveGradient}
                >
                  <Icon source="chart-line" size={18} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>
                    {isEditing ? t('Salvar alterações') : t('Adicionar ativo')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 8,
    marginTop: 20,
    marginLeft: 2,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  rowInput: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
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
