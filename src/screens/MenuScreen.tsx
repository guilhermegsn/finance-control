import React from 'react';
import { View, ScrollView, StyleSheet, Switch, TouchableOpacity, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Icon } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import GlassHeader from '../components/GlassHeader';
import { useTranslation } from 'react-i18next';
import { useCurrency, DisplayCurrency } from '../contexts/CurrencyContext';

const ICON_COLORS: Record<string, string> = {
  wallet: '#F59E0B',
  tag: '#10B981',
  'credit-card-outline': '#8B5CF6',
  'chart-bar': '#3B82F6',
  flag: '#F43F5E',
  'brightness-6': '#6366F1',
  'bell-outline': '#10B981',
  logout: '#EF4444',
};

export default function MenuScreen() {
  const navigation = useNavigation();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { user, signOut } = useAuth();
  const { t, i18n } = useTranslation();
  const { currency, setCurrency } = useCurrency();
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;

  const c = {
    bg: isDarkMode ? '#0D1117' : '#EEF2F7',
    card: isDarkMode ? '#161C27' : '#FFFFFF',
    border: isDarkMode ? '#2D3748' : '#E2E8F0',
    textPrimary: isDarkMode ? '#E2E8F0' : '#1A202C',
    textSecondary: isDarkMode ? '#718096' : '#64748B',
    sectionLabel: isDarkMode ? '#4A5568' : '#94A3B8',
  };

  const email = user?.email ?? '';
  const rawName: string =
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    email.split('@')[0] ??
    '';
  const initials = rawName
    .trim()
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  const manageItems = [
    { label: t('Contas'), icon: 'wallet', onPress: () => navigation.navigate('Accounts' as never) },
    { label: t('Categorias'), icon: 'tag', onPress: () => navigation.navigate('Categories' as never) },
    { label: t('Cartões de Crédito'), icon: 'credit-card-outline', onPress: () => navigation.navigate('CreditCardList' as never) },
  ];

  const insightItems = [
    { label: t('Relatórios'), icon: 'chart-bar' },
    { label: t('Metas'), icon: 'flag' },
  ];

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <GlassHeader />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Profile Card */}
        <LinearGradient
          colors={isDarkMode
            ? ['#1E2D5A', '#111830', '#0D1117']
            : ['#6366F1', '#7C3AED', '#A855F7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileCard}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || '?'}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{rawName}</Text>
            <Text style={styles.profileEmail}>{email}</Text>
          </View>
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>PRO</Text>
          </View>
        </LinearGradient>

        {/* Gerenciar */}
        <Text style={[styles.sectionLabel, { color: c.sectionLabel }]}>
          {t('GERENCIAR')}
        </Text>
        <View style={[styles.sectionCard, { backgroundColor: c.card, borderColor: c.border }]}>
          {manageItems.map((item, i) => (
            <View key={item.label}>
              <TouchableOpacity style={styles.row} onPress={item.onPress} activeOpacity={0.7}>
                <View style={[styles.iconPill, { backgroundColor: `${ICON_COLORS[item.icon]}1A` }]}>
                  <Icon source={item.icon} size={20} color={ICON_COLORS[item.icon]} />
                </View>
                <Text style={[styles.rowLabel, { color: c.textPrimary }]}>{item.label}</Text>
                <Icon source="chevron-right" size={18} color={c.sectionLabel} />
              </TouchableOpacity>
              {i < manageItems.length - 1 && (
                <View style={[styles.divider, { backgroundColor: c.border }]} />
              )}
            </View>
          ))}
        </View>

        {/* Análise */}
        <Text style={[styles.sectionLabel, { color: c.sectionLabel }]}>
          {t('ANÁLISE')}
        </Text>
        <View style={[styles.sectionCard, { backgroundColor: c.card, borderColor: c.border }]}>
          {insightItems.map((item, i) => (
            <View key={item.label}>
              <View style={[styles.row, { opacity: 0.55 }]}>
                <View style={[styles.iconPill, { backgroundColor: `${ICON_COLORS[item.icon]}1A` }]}>
                  <Icon source={item.icon} size={20} color={ICON_COLORS[item.icon]} />
                </View>
                <Text style={[styles.rowLabel, { color: c.textPrimary }]}>{item.label}</Text>
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonText}>{t('Em breve')}</Text>
                </View>
              </View>
              {i < insightItems.length - 1 && (
                <View style={[styles.divider, { backgroundColor: c.border }]} />
              )}
            </View>
          ))}
        </View>

        {/* Preferências */}
        <Text style={[styles.sectionLabel, { color: c.sectionLabel }]}>
          {t('PREFERÊNCIAS')}
        </Text>
        <View style={[styles.sectionCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.row}>
            <View style={[styles.iconPill, { backgroundColor: '#6366F11A' }]}>
              <Icon source="brightness-6" size={20} color="#6366F1" />
            </View>
            <Text style={[styles.rowLabel, { color: c.textPrimary }]}>{t('Modo Escuro')}</Text>
            <Switch
              value={isDarkMode}
              onValueChange={toggleDarkMode}
              trackColor={{ false: '#CBD5E1', true: '#6366F1' }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#CBD5E1"
            />
          </View>
          <View style={[styles.divider, { backgroundColor: c.border }]} />
          <View style={styles.row}>
            <View style={[styles.iconPill, { backgroundColor: '#0EA5E91A' }]}>
              <Icon source="translate" size={20} color="#0EA5E9" />
            </View>
            <Text style={[styles.rowLabel, { color: c.textPrimary }]}>{t('Idioma')}</Text>
            <View style={[styles.languagePicker, { backgroundColor: c.bg }]}>
              {[
                { code: 'pt', label: 'Português' },
                { code: 'en', label: 'English' },
              ].map((language) => {
                const selected = currentLanguage.startsWith(language.code);
                return (
                  <TouchableOpacity
                    key={language.code}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => i18n.changeLanguage(language.code)}
                    style={[
                      styles.languageOption,
                      selected && { backgroundColor: isDarkMode ? '#6366F1' : '#4F46E5' },
                    ]}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.languageOptionText, { color: selected ? '#FFFFFF' : c.textSecondary }]}>
                      {language.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: c.border }]} />
          <View style={styles.row}>
            <View style={[styles.iconPill, { backgroundColor: '#10B9811A' }]}>
              <Icon source="currency-usd" size={20} color="#10B981" />
            </View>
            <Text style={[styles.rowLabel, { color: c.textPrimary }]}>{t('Moeda')}</Text>
            <View style={[styles.languagePicker, { backgroundColor: c.bg }]}>
              {([
                { code: 'BRL', label: 'R$' },
                { code: 'USD', label: 'USD' },
              ] as { code: DisplayCurrency; label: string }[]).map((option) => {
                const selected = currency === option.code;
                return (
                  <TouchableOpacity
                    key={option.code}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={option.code === 'BRL' ? t('Real brasileiro') : t('Dólar americano')}
                    onPress={() => setCurrency(option.code)}
                    style={[
                      styles.languageOption,
                      selected && { backgroundColor: isDarkMode ? '#6366F1' : '#4F46E5' },
                    ]}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.languageOptionText, { color: selected ? '#FFFFFF' : c.textSecondary }]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: c.border }]} />
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('NotificationSettings' as never)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconPill, { backgroundColor: '#10B9811A' }]}>
              <Icon source="bell-outline" size={20} color="#10B981" />
            </View>
            <Text style={[styles.rowLabel, { color: c.textPrimary }]}>{t('Notificações')}</Text>
            <Icon source="chevron-right" size={18} color={c.sectionLabel} />
          </TouchableOpacity>
        </View>

        {/* Sair */}
        <TouchableOpacity
          style={[styles.signOutBtn, { backgroundColor: c.card, borderColor: c.border }]}
          onPress={signOut}
          activeOpacity={0.7}
        >
          <Icon source="logout" size={20} color="#EF4444" />
          <Text style={styles.signOutText}>{t('auth:Sair')}</Text>
        </TouchableOpacity>

        <Text style={[styles.footer, { color: c.sectionLabel }]}>ButterFlow v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 48,
  },

  // Profile card
  profileCard: {
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 3,
  },
  profileEmail: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
  },
  proBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  proBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // Section
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 24,
  },

  // Row
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
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 68,
  },
  languagePicker: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 10,
  },
  languageOption: {
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 8,
  },
  languageOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Badges
  comingSoonBadge: {
    backgroundColor: '#3B82F614',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  comingSoonText: {
    color: '#3B82F6',
    fontSize: 11,
    fontWeight: '600',
  },

  // Sign out
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 15,
    marginBottom: 28,
  },
  signOutText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '600',
  },

  // Footer
  footer: {
    textAlign: 'center',
    fontSize: 12,
    letterSpacing: 0.3,
  },
});
