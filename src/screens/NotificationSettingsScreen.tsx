import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Icon } from 'react-native-paper';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import NotificationService, { NotificationSettings } from '../service/NotificationService';
import CreditCardService from '../service/CreditCardService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HOUR_OPTIONS = [6, 7, 8, 9, 10, 11, 12, 18, 19, 20, 21];
const DAYS_OPTIONS = [3, 5, 7, 10, 14, 30];

export default function NotificationSettingsScreen() {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  const { user } = useAuth();

  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(true);

  const insets = useSafeAreaInsets();

  const c = {
    bg: isDarkMode ? '#0D1117' : '#EEF2F7',
    card: isDarkMode ? '#161C27' : '#FFFFFF',
    border: isDarkMode ? '#2D3748' : '#E2E8F0',
    textPrimary: isDarkMode ? '#E2E8F0' : '#1A202C',
    textSecondary: isDarkMode ? '#718096' : '#64748B',
    sectionLabel: isDarkMode ? '#4A5568' : '#94A3B8',
    accent: '#6366F1',
  };

  useEffect(() => {
    (async () => {
      const [s, granted] = await Promise.all([
        NotificationService.getSettings(),
        NotificationService.requestPermissions(),
      ]);
      setSettings(s);
      setPermissionGranted(granted);
    })();
  }, []);

  const save = useCallback(async (next: NotificationSettings) => {
    setSettings(next);
    setSaving(true);
    try {
      await NotificationService.saveSettings(next);
      if (user?.id) {
        const cards = await CreditCardService.getAll(user.id);
        await NotificationService.scheduleInvoiceNotifications(cards);
      }
    } finally {
      setSaving(false);
    }
  }, [user?.id]);

  const toggleInvoice = () => {
    if (!settings) return;
    save({ ...settings, invoiceDue: { ...settings.invoiceDue, enabled: !settings.invoiceDue.enabled } });
  };

  const toggleEngagement = () => {
    if (!settings) return;
    save({ ...settings, engagement: { ...settings.engagement, enabled: !settings.engagement.enabled } });
  };

  const setHour = (h: number) => {
    if (!settings) return;
    save({ ...settings, invoiceDue: { ...settings.invoiceDue, hourOfDay: h } });
  };

  const setDays = (d: number) => {
    if (!settings) return;
    save({ ...settings, engagement: { ...settings.engagement, inactiveDays: d } });
  };

  if (!settings) {
    return (
      <View style={[styles.root, { backgroundColor: c.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <View style={[styles.header, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon source="arrow-left" size={22} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.textPrimary }]}>Notificações</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {!permissionGranted && (
          <View style={[styles.warningCard, { backgroundColor: '#F59E0B18', borderColor: '#F59E0B' }]}>
            <Icon source="alert-circle-outline" size={20} color="#F59E0B" />
            <Text style={[styles.warningText, { color: '#F59E0B' }]}>
              Permissão de notificações negada. Ative nas configurações do dispositivo.
            </Text>
          </View>
        )}

        {/* Vencimento de fatura */}
        <Text style={[styles.sectionLabel, { color: c.sectionLabel }]}>FATURA DO CARTÃO</Text>
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.row}>
            <View style={[styles.iconPill, { backgroundColor: '#8B5CF61A' }]}>
              <Icon source="credit-card-clock-outline" size={20} color="#8B5CF6" />
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowLabel, { color: c.textPrimary }]}>Lembrete de vencimento</Text>
              <Text style={[styles.rowSub, { color: c.textSecondary }]}>Notifica no dia do vencimento</Text>
            </View>
            <Switch
              value={settings.invoiceDue.enabled}
              onValueChange={toggleInvoice}
              trackColor={{ false: '#CBD5E1', true: c.accent }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#CBD5E1"
            />
          </View>

          {settings.invoiceDue.enabled && (
            <>
              <View style={[styles.divider, { backgroundColor: c.border }]} />
              <View style={styles.optionBlock}>
                <Text style={[styles.optionLabel, { color: c.textSecondary }]}>Horário do aviso</Text>
                <View style={styles.chipRow}>
                  {HOUR_OPTIONS.map((h) => (
                    <TouchableOpacity
                      key={h}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: settings.invoiceDue.hourOfDay === h ? c.accent : `${c.accent}18`,
                          borderColor: settings.invoiceDue.hourOfDay === h ? c.accent : 'transparent',
                        },
                      ]}
                      onPress={() => setHour(h)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.chipText,
                        { color: settings.invoiceDue.hourOfDay === h ? '#FFFFFF' : c.textSecondary },
                      ]}>
                        {String(h).padStart(2, '0')}:00
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          )}
        </View>

        {/* Re-engagement */}
        <Text style={[styles.sectionLabel, { color: c.sectionLabel }]}>LEMBRETE DE USO</Text>
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.row}>
            <View style={[styles.iconPill, { backgroundColor: '#10B9811A' }]}>
              <Icon source="bell-ring-outline" size={20} color="#10B981" />
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowLabel, { color: c.textPrimary }]}>Lembrar de atualizar</Text>
              <Text style={[styles.rowSub, { color: c.textSecondary }]}>Avisa se você ficar dias sem acessar</Text>
            </View>
            <Switch
              value={settings.engagement.enabled}
              onValueChange={toggleEngagement}
              trackColor={{ false: '#CBD5E1', true: c.accent }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#CBD5E1"
            />
          </View>

          {settings.engagement.enabled && (
            <>
              <View style={[styles.divider, { backgroundColor: c.border }]} />
              <View style={styles.optionBlock}>
                <Text style={[styles.optionLabel, { color: c.textSecondary }]}>Avisar após quantos dias sem acesso</Text>
                <View style={styles.chipRow}>
                  {DAYS_OPTIONS.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: settings.engagement.inactiveDays === d ? c.accent : `${c.accent}18`,
                          borderColor: settings.engagement.inactiveDays === d ? c.accent : 'transparent',
                        },
                      ]}
                      onPress={() => setDays(d)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.chipText,
                        { color: settings.engagement.inactiveDays === d ? '#FFFFFF' : c.textSecondary },
                      ]}>
                        {d}d
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          )}
        </View>

        {saving && (
          <View style={styles.savingRow}>
            <ActivityIndicator size="small" color={c.accent} />
            <Text style={[styles.savingText, { color: c.textSecondary }]}>Salvando...</Text>
          </View>
        )}
      </ScrollView>
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
    paddingTop: 20,
    paddingBottom: 48,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconPill: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  rowContent: { flex: 1 },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  rowSub: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 68,
  },
  optionBlock: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  savingText: {
    fontSize: 13,
  },
});
